"""
recommender.py — Sistem Rekomendasi Paket Wisata
==================================================
Mengimplementasikan Budget-First Workflow (alur utama) sesuai
Sub-bab 3.3.5 skripsi:
1. Terima input budget, jumlah orang, durasi
2. Jalankan FCM terpisah untuk hotel, wisata, kuliner
3. Buat kombinasi paket
4. Hitung total biaya (akomodasi + tiket + kuliner + transportasi)
5. Filter & ranking → tampilkan top 3 paket
"""

import math
from typing import cast, Any
# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-source-for-stubs]
import pandas as pd

from config import (
    GOOGLE_MAPS_API_KEY, CLUSTER_LABELS,
    MAX_PACKAGES_DISPLAY, MEALS_PER_DAY, MAX_PERSONS_PER_ROOM,
    DEFAULT_RATIO_SCHEME, RATIO_SCHEMES,
)
from fcm_clustering import run_budget_anchored_fcm, run_percentile_fcm
from transport_api import calculate_route_cost, haversine_distance


LAST_CLUSTERED = None


def haversine_road_distance(lat1, lon1, lat2, lon2):
    """
    Menghitung jarak spasial dengan faktor koreksi rute jalan darat 1.45x.
    Menyelaraskan estimasi jarak offline dengan uji_gabungan.py secara akademis.
    """
    return haversine_distance(lat1, lon1, lat2, lon2) * 1.45


def recalculate_pkg_legs(pkg_formatted, itinerary, num_persons):
    """
    Recalculates precise spatial legs, total distance, and transport cost based
    on the actual itinerary's coordinates.
    """
    duration = len(itinerary)
    
    if num_persons <= 1:
        rate_per_km = 2250
        transport_desc = "Motor GoRide (1 orang)"
    elif num_persons <= 4:
        rate_per_km = 5150
        transport_desc = "Mobil GoCar Standard (2-4 orang)"
    else:
        rate_per_km = 6000
        transport_desc = "Mobil GoCar XL (5-6 orang)"
        
    legs_detail = []
    total_dist = 0.0
    
    if duration == 1:
        day_data = itinerary[0]
        dist1 = haversine_road_distance(
            day_data.get("kuliner_pagi_lat", 0.0), day_data.get("kuliner_pagi_lon", 0.0),
            day_data.get("wisata_lat", 0.0), day_data.get("wisata_lon", 0.0)
        )
        dist2 = haversine_road_distance(
            day_data.get("wisata_lat", 0.0), day_data.get("wisata_lon", 0.0),
            day_data.get("kuliner_lat", 0.0), day_data.get("kuliner_lon", 0.0)
        )
        legs_detail = [
            {
                "from": "Makan Pagi",
                "to": "Wisata",
                "distance_km": round(dist1, 2),
                "cost": 0.0,
                "vehicle": transport_desc
            },
            {
                "from": "Wisata",
                "to": "Makan Siang",
                "distance_km": round(dist2, 2),
                "cost": 0.0,
                "vehicle": transport_desc
            }
        ]
        total_dist = dist1 + dist2
    else:
        for d_num in range(1, duration + 1):
            day_label = f" (Hari {d_num})"
            day_data = itinerary[d_num - 1]
            if d_num == 1:
                # Stay Day 1 (5 Segmen): Makan Pagi -> Wisata -> Makan Siang -> Hotel -> Makan Malam -> Hotel
                d1_1 = haversine_road_distance(day_data.get("kuliner_pagi_lat", 0.0), day_data.get("kuliner_pagi_lon", 0.0), day_data.get("wisata_lat", 0.0), day_data.get("wisata_lon", 0.0))
                d1_2 = haversine_road_distance(day_data.get("wisata_lat", 0.0), day_data.get("wisata_lon", 0.0), day_data.get("kuliner_lat", 0.0), day_data.get("kuliner_lon", 0.0))
                d1_3 = haversine_road_distance(day_data.get("kuliner_lat", 0.0), day_data.get("kuliner_lon", 0.0), day_data.get("hotel_lat", 0.0), day_data.get("hotel_lon", 0.0))
                d1_4 = haversine_road_distance(day_data.get("hotel_lat", 0.0), day_data.get("hotel_lon", 0.0), day_data.get("kuliner_malam_lat", 0.0), day_data.get("kuliner_malam_lon", 0.0))
                d1_5 = haversine_road_distance(day_data.get("kuliner_malam_lat", 0.0), day_data.get("kuliner_malam_lon", 0.0), day_data.get("hotel_lat", 0.0), day_data.get("hotel_lon", 0.0))
                legs_detail.extend([
                    {
                        "from": f"Makan Pagi{day_label}",
                        "to": f"Wisata{day_label}",
                        "distance_km": round(d1_1, 2),
                        "cost": 0.0,
                        "vehicle": transport_desc
                    },
                    {
                        "from": f"Wisata{day_label}",
                        "to": f"Makan Siang{day_label}",
                        "distance_km": round(d1_2, 2),
                        "cost": 0.0,
                        "vehicle": transport_desc
                    },
                    {
                        "from": f"Makan Siang{day_label}",
                        "to": f"Hotel{day_label}",
                        "distance_km": round(d1_3, 2),
                        "cost": 0.0,
                        "vehicle": transport_desc
                    },
                    {
                        "from": f"Hotel{day_label}",
                        "to": f"Makan Malam{day_label}",
                        "distance_km": round(d1_4, 2),
                        "cost": 0.0,
                        "vehicle": transport_desc
                    },
                    {
                        "from": f"Makan Malam{day_label}",
                        "to": f"Hotel{day_label}",
                        "distance_km": round(d1_5, 2),
                        "cost": 0.0,
                        "vehicle": transport_desc
                    }
                ])
                total_dist += (d1_1 + d1_2 + d1_3 + d1_4 + d1_5)
            elif d_num == duration:
                # Checkout day (3 Segmen): Hotel -> Makan Pagi -> Wisata -> Makan Siang
                prev_day_data = itinerary[d_num - 2]
                dc1 = haversine_road_distance(prev_day_data.get("hotel_lat", 0.0), prev_day_data.get("hotel_lon", 0.0), day_data.get("kuliner_pagi_lat", 0.0), day_data.get("kuliner_pagi_lon", 0.0))
                dc2 = haversine_road_distance(day_data.get("kuliner_pagi_lat", 0.0), day_data.get("kuliner_pagi_lon", 0.0), day_data.get("wisata_lat", 0.0), day_data.get("wisata_lon", 0.0))
                dc3 = haversine_road_distance(day_data.get("wisata_lat", 0.0), day_data.get("wisata_lon", 0.0), day_data.get("kuliner_lat", 0.0), day_data.get("kuliner_lon", 0.0))
                legs_detail.extend([
                    {
                        "from": f"Hotel{day_label}",
                        "to": f"Makan Pagi{day_label}",
                        "distance_km": round(dc1, 2),
                        "cost": 0.0,
                        "vehicle": transport_desc
                    },
                    {
                        "from": f"Makan Pagi{day_label}",
                        "to": f"Wisata{day_label}",
                        "distance_km": round(dc2, 2),
                        "cost": 0.0,
                        "vehicle": transport_desc
                    },
                    {
                        "from": f"Wisata{day_label}",
                        "to": f"Makan Siang{day_label}",
                        "distance_km": round(dc3, 2),
                        "cost": 0.0,
                        "vehicle": transport_desc
                    }
                ])
                total_dist += (dc1 + dc2 + dc3)
            else:
                # Middle Stay Days (6 Segmen): Hotel -> Makan Pagi -> Wisata -> Makan Siang -> Hotel -> Makan Malam -> Hotel
                prev_day_data = itinerary[d_num - 2]
                dm1 = haversine_road_distance(prev_day_data.get("hotel_lat", 0.0), prev_day_data.get("hotel_lon", 0.0), day_data.get("kuliner_pagi_lat", 0.0), day_data.get("kuliner_pagi_lon", 0.0))
                dm2 = haversine_road_distance(day_data.get("kuliner_pagi_lat", 0.0), day_data.get("kuliner_pagi_lon", 0.0), day_data.get("wisata_lat", 0.0), day_data.get("wisata_lon", 0.0))
                dm3 = haversine_road_distance(day_data.get("wisata_lat", 0.0), day_data.get("wisata_lon", 0.0), day_data.get("kuliner_lat", 0.0), day_data.get("kuliner_lon", 0.0))
                dm4 = haversine_road_distance(day_data.get("kuliner_lat", 0.0), day_data.get("kuliner_lon", 0.0), day_data.get("hotel_lat", 0.0), day_data.get("hotel_lon", 0.0))
                dm5 = haversine_road_distance(day_data.get("hotel_lat", 0.0), day_data.get("hotel_lon", 0.0), day_data.get("kuliner_malam_lat", 0.0), day_data.get("kuliner_malam_lon", 0.0))
                dm6 = haversine_road_distance(day_data.get("kuliner_malam_lat", 0.0), day_data.get("kuliner_malam_lon", 0.0), day_data.get("hotel_lat", 0.0), day_data.get("hotel_lon", 0.0))
                legs_detail.extend([
                    {
                        "from": f"Hotel{day_label}",
                        "to": f"Makan Pagi{day_label}",
                        "distance_km": round(dm1, 2),
                        "cost": 0.0,
                        "vehicle": transport_desc
                    },
                    {
                        "from": f"Makan Pagi{day_label}",
                        "to": f"Wisata{day_label}",
                        "distance_km": round(dm2, 2),
                        "cost": 0.0,
                        "vehicle": transport_desc
                    },
                    {
                        "from": f"Wisata{day_label}",
                        "to": f"Makan Siang{day_label}",
                        "distance_km": round(dm3, 2),
                        "cost": 0.0,
                        "vehicle": transport_desc
                    },
                    {
                        "from": f"Makan Siang{day_label}",
                        "to": f"Hotel{day_label}",
                        "distance_km": round(dm4, 2),
                        "cost": 0.0,
                        "vehicle": transport_desc
                    },
                    {
                        "from": f"Hotel{day_label}",
                        "to": f"Makan Malam{day_label}",
                        "distance_km": round(dm5, 2),
                        "cost": 0.0,
                        "vehicle": transport_desc
                    },
                    {
                        "from": f"Makan Malam{day_label}",
                        "to": f"Hotel{day_label}",
                        "distance_km": round(dm6, 2),
                        "cost": 0.0,
                        "vehicle": transport_desc
                    }
                ])
                total_dist += (dm1 + dm2 + dm3 + dm4 + dm5 + dm6)

    cost_transport = round(total_dist * rate_per_km)
    scale_factor = (cost_transport / total_dist) if total_dist > 0 else 0
    for leg in legs_detail:
        leg["cost"] = round(float(leg["distance_km"]) * scale_factor)
        
    if legs_detail and cost_transport > 0:
        total_leg_cost = sum(float(leg["cost"]) for leg in legs_detail)
        diff = cost_transport - total_leg_cost
        if diff != 0:
            legs_detail[-1]["cost"] = float(legs_detail[-1]["cost"]) + diff
            
    pkg_formatted["cost_transport"] = float(cost_transport)
    pkg_formatted["transport_detail"] = {
        "total_cost": cost_transport,
        "total_distance_km": total_dist,
        "legs": legs_detail,
        "source": "Haversine (Spatial Optimized)"
    }


def find_k_pagi(k_siang, kuliner_list, anchor_lat, anchor_lon):
    """
    Mencari tempat makan pertama (Sarapan / Makan Pagi) dari kuliner_list yang berbeda dari k_siang,
    dan lokasinya paling dekat dengan anchor (hotel / wisata).
    """
    best_k_pagi = None
    min_dist = float('inf')
    k_siang_name = k_siang.get("Nama_Tempat", "") if k_siang else ""
    for candidate in kuliner_list:
        if not candidate:
            continue
        cand_name = candidate.get("Nama_Tempat", "")
        if cand_name == k_siang_name:
            continue
        c_lat = candidate.get("Latitude", 0)
        c_lon = candidate.get("Longitude", 0)
        dist = haversine_road_distance(anchor_lat, anchor_lon, c_lat, c_lon)
        if dist < min_dist:
            min_dist = dist
            best_k_pagi = candidate
            
    # Fallback jika tidak ada kandidat lain yang berbeda
    if best_k_pagi is None:
        best_k_pagi = k_siang if k_siang else (kuliner_list[0] if kuliner_list else None)
    return best_k_pagi


def find_k_malam(k_siang, k_pagi, kuliner_list, anchor_lat, anchor_lon):
    """
    Mencari tempat makan ketiga (Makan Malam) dari kuliner_list yang berbeda dari k_siang dan k_pagi,
    dan lokasinya paling dekat dengan anchor (hotel / wisata).
    """
    best_k_malam = None
    min_dist = float('inf')
    k_siang_name = k_siang.get("Nama_Tempat", "") if k_siang else ""
    k_pagi_name = k_pagi.get("Nama_Tempat", "") if k_pagi else ""
    for candidate in kuliner_list:
        if not candidate:
            continue
        cand_name = candidate.get("Nama_Tempat", "")
        if cand_name in (k_siang_name, k_pagi_name):
            continue
        c_lat = candidate.get("Latitude", 0)
        c_lon = candidate.get("Longitude", 0)
        dist = haversine_road_distance(anchor_lat, anchor_lon, c_lat, c_lon)
        if dist < min_dist:
            min_dist = dist
            best_k_malam = candidate
            
    # Fallback jika tidak ada kandidat lain yang berbeda (misalnya list hanya berisi 1 atau 2 item)
    if best_k_malam is None:
        for candidate in kuliner_list:
            if not candidate:
                continue
            cand_name = candidate.get("Nama_Tempat", "")
            if cand_name != k_siang_name:
                best_k_malam = candidate
                break
    if best_k_malam is None:
        best_k_malam = k_siang if k_siang else (kuliner_list[0] if kuliner_list else None)
    return best_k_malam
# ============================================================
# 1. ALOKASI BUDGET PER KOMPONEN
# ============================================================
def allocate_budget(total_budget, num_persons, duration):
    """
    Mendistribusikan total budget ke 4 komponen utama sesuai skripsi versi revisi:
    - Akomodasi: 40% (0% jika One Day Trip)
    - Wisata (tiket): 15% (25% jika One Day Trip)
    - Kuliner: 20% (33.33% jika One Day Trip)
    - Transportasi: 25% (41.67% jika One Day Trip)

    Args:
        total_budget: total anggaran (Rp)
        num_persons: jumlah peserta
        duration: durasi liburan (hari)

    Returns:
        dict: budget per komponen
    """
    if duration == 1:
        # One Day Trip: Tanpa Akomodasi, redistribusikan 40% secara proporsional ke yang lain (total sisa 60%)
        return {
            "akomodasi": 0.0,
            "wisata": total_budget * (15.0 / 60.0),
            "kuliner": total_budget * (20.0 / 60.0),
            "transportasi": total_budget * (25.0 / 60.0),
        }
    else:
        return {
            "akomodasi": total_budget * 0.40,
            "wisata": total_budget * 0.15,
            "kuliner": total_budget * 0.20,
            "transportasi": total_budget * 0.25,
        }


# ============================================================
# 2. HITUNG BIAYA PAKET
# ============================================================
def calculate_package_cost(hotel, wisata, kuliner, num_persons, duration,
                           transport_cost=0):
    """
    Menghitung total biaya paket wisata.

    Rumus sesuai skripsi Sub-bab 3.3.5:
    - Akomodasi = tarif hotel × malam × jumlah_kamar (malam = durasi - 1)
    - Wisata    = harga tiket × jumlah_peserta
    - Kuliner   = harga menu × jumlah_peserta × 3 (makan/hari) × durasi
    - Transport = biaya dari transport_api

    Args:
        hotel: dict data hotel (Estimasi_Harga, dll)
        wisata: dict data wisata
        kuliner: dict data kuliner
        num_persons: jumlah peserta
        duration: durasi (hari)
        transport_cost: biaya transportasi (Rp)

    Returns:
        dict: rincian biaya
    """
    # Jumlah kamar: pembulatan ke atas dari jumlah peserta / 2
    num_rooms = math.ceil(num_persons / MAX_PERSONS_PER_ROOM)
    nights = duration - 1

    if nights > 0:
        cost_akomodasi = hotel["Estimasi_Harga"] * nights * num_rooms
        hotel_nama = hotel["Nama_Tempat"]
        hotel_harga = hotel["Estimasi_Harga"]
        rooms_count = num_rooms
    else:
        cost_akomodasi = 0
        hotel_nama = "Tanpa Akomodasi (One Day Trip)"
        hotel_harga = 0
        rooms_count = 0

    cost_wisata = wisata["Estimasi_Harga"] * num_persons
    cost_kuliner = kuliner["Estimasi_Harga"] * num_persons * MEALS_PER_DAY * duration
    cost_transport = transport_cost

    total = cost_akomodasi + cost_wisata + cost_kuliner + cost_transport

    return {
        "hotel_nama": hotel_nama,
        "hotel_harga": hotel_harga,
        "hotel_nama_real": hotel.get("Nama_Tempat", ""),
        "hotel_lat": hotel.get("Latitude", 0),
        "hotel_lon": hotel.get("Longitude", 0),
        "wisata_nama": wisata["Nama_Tempat"],
        "wisata_harga": wisata["Estimasi_Harga"],
        "wisata_lat": wisata.get("Latitude", 0),
        "wisata_lon": wisata.get("Longitude", 0),
        "kuliner_nama": kuliner["Nama_Tempat"],
        "kuliner_harga": kuliner["Estimasi_Harga"],
        "kuliner_lat": kuliner.get("Latitude", 0),
        "kuliner_lon": kuliner.get("Longitude", 0),
        "cost_akomodasi": cost_akomodasi,
        "cost_wisata": cost_wisata,
        "cost_kuliner": cost_kuliner,
        "cost_transport": cost_transport,
        "total_cost": total,
        "num_rooms": rooms_count,
        "nights": nights,
        "duration": duration,
        "num_persons": num_persons,
    }


# ============================================================
# 3. GENERATE PAKET REKOMENDASI (BUDGET-FIRST WORKFLOW)
# ============================================================
def generate_packages(total_budget, num_persons, duration, datasets,
                       api_key=None, ratio_scheme=DEFAULT_RATIO_SCHEME,
                       max_packages=MAX_PACKAGES_DISPLAY, verbose=True,
                       transport_mode=None, hotel_mode='same'):
    """
    Alur utama Budget-First Workflow (Diselaraskan Eksak dengan Uji_Gabungan.py):
    1. Alokasikan budget ke komponen secara proporsional.
    2. Jalankan FCM Terpandu Budget-Anchored untuk hotel, wisata, kuliner.
    3. Ambil 15 data terdekat dari masing-masing kategori.
    4. Cari kombinasi spasial (Haversine rute melingkar) & tarif Gojek flat.
    5. Sensor anggaran ketat (Hanya paket <= budget) + Fallback cheapest.
    6. Perangkingan Spasial & Rating sesuai kelas:
       - Hemat: Terpendek spasial rute.
       - Balanced: Hybrid (Rating + Jarak).
       - Premium: Rating tertinggi + hotel termewah (harga termahal).
    7. Kemas menjadi 5 opsi alternatif dengan proyeksi Day-by-Day Itinerary variasi.
    """
    # Cast parameters to prevent type/comparison errors
    duration = int(float(duration))
    num_persons = int(float(num_persons))
    if total_budget is None:
        raise ValueError("total_budget cannot be None for Budget-First recommendation workflow.")
    total_budget = float(total_budget)

    if api_key is None:
        api_key = GOOGLE_MAPS_API_KEY

    # --- Langkah 1: Alokasi Budget ---
    budget_alloc = allocate_budget(total_budget, num_persons, duration)

    if verbose:
        print(f"\n{'='*60}")
        print(f"  BUDGET-FIRST RECOMMENDATION (COMBINATORIAL OPTIMIZED)")
        print(f"{'='*60}")
        print(f"  Total Budget  : Rp {total_budget:,.0f}")
        print(f"  Peserta       : {num_persons} orang")
        print(f"  Durasi        : {duration} hari")
        print(f"  Skema Ratio   : {ratio_scheme}")
        print(f"\n  Alokasi Budget:")
        for key, val in budget_alloc.items():
            print(f"    • {key.capitalize():15}: Rp {val:>12,.0f}")
        print()

    # --- Langkah 2: FCM per Kategori ---
    num_rooms = math.ceil(num_persons / MAX_PERSONS_PER_ROOM)
    nights = duration - 1

    if duration == 1:
        total_meals = 2
        budget_per_category = {
            "hotel": (total_budget * 0.40) / (1 * num_rooms),
            "wisata": budget_alloc["wisata"] / num_persons,
            "kuliner": budget_alloc["kuliner"] / (num_persons * total_meals),
        }
    else:
        total_meals = 3 * (duration - 1) + 2
        budget_per_category = {
            "hotel": budget_alloc["akomodasi"] / (nights * num_rooms),
            "wisata": budget_alloc["wisata"] / num_persons,
            "kuliner": budget_alloc["kuliner"] / (num_persons * total_meals),
        }

    clustered = {}
    ratios = RATIO_SCHEMES[ratio_scheme]

    for cat_name in ["hotel", "wisata", "kuliner"]:
        df = datasets[cat_name]
        prices = df["Estimasi_Harga"].values
        budget_anchor = budget_per_category[cat_name]

        if verbose:
            print(f"  Clustering {cat_name.capitalize()} (anchor: Rp {budget_anchor:,.0f})...")

        try:
            result = run_budget_anchored_fcm(
                prices, budget_anchor, ratio_scheme=ratio_scheme
            )
            df_clustered = df.copy()
            df_clustered["Cluster"] = result["labels"]
            # Calculate and attach exact fuzzy membership degree to the assigned cluster
            u_matrix = result["u"]
            df_clustered["Membership_Degree"] = [float(u_matrix[result["labels"][j], j]) for j in range(len(prices))]
            df_clustered["Kategori"] = df_clustered["Cluster"].map(CLUSTER_LABELS)
            clustered[cat_name] = {
                "df": df_clustered,
                "cntr": result["cntr"],
                "xb": result["xb"],
            }
        except Exception as e:
            print(f"    ⚠ Error clustering {cat_name}: {e}")
            return []

    # --- Langkah 3: Ambil 15 Kandidat Terdekat dari FCM ---
    candidates = {
        "hotel": {i: [] for i in range(3)},
        "wisata": {i: [] for i in range(3)},
        "kuliner": {i: [] for i in range(3)}
    }

    for key in ["hotel", "wisata", "kuliner"]:
        df = clustered[key]["df"]
        cat_anchor = budget_per_category[key]
        for i in range(3):
            items_in_c = df[df["Cluster"] == i].copy()
            target_price = cat_anchor * ratios[i]
            
            if items_in_c.empty:
                df["distance_to_target"] = (df["Estimasi_Harga"] - target_price).abs()
                best_items = df.nsmallest(15, "distance_to_target")
            else:
                items_in_c["distance_to_target"] = (items_in_c["Estimasi_Harga"] - target_price).abs()
                best_items = items_in_c.nsmallest(15, "distance_to_target")
                
            candidates[key][i] = best_items.to_dict("records")

    # --- Langkah 4 & 5: Combinatorial Search & Sensor Anggaran Ketat ---
    package_options = {0: [], 1: [], 2: []}
    max_options_to_show = {0: 15, 1: 15, 2: 15}

    for i in range(3):
        hotel_list = candidates["hotel"][i]
        wisata_list = candidates["wisata"][i]
        kuliner_list = candidates["kuliner"][i]
        
        valid_combinations = []
        
        for h in hotel_list:
            for w in wisata_list:
                for k in kuliner_list:
                    # A. Hitung Biaya Akomodasi
                    if duration > 1:
                        if hotel_mode == 'split' and len(hotel_list) > 1:
                            hotel_seq = [hotel_list[(hotel_list.index(h) + n) % len(hotel_list)] for n in range(nights)]
                            cost_hotel = sum(ht["Estimasi_Harga"] for ht in hotel_seq) * num_rooms
                        else:
                            cost_hotel = h["Estimasi_Harga"] * nights * num_rooms
                    else:
                        cost_hotel = 0
                        
                    # B. Hitung Biaya Wisata
                    cost_wisata = w["Estimasi_Harga"] * num_persons
                    
                    # C. Cari kuliner pagi, siang, malam dan hitung biaya kuliner
                    if duration == 1:
                        k_pagi = find_k_pagi(k, kuliner_list, w["Latitude"], w["Longitude"])
                        k_malam = None
                        k_pagi_est = k_pagi["Estimasi_Harga"] if (k_pagi and "Estimasi_Harga" in k_pagi) else 0
                        k_est = k["Estimasi_Harga"] if (k and "Estimasi_Harga" in k) else 0
                        cost_kuliner = (k_pagi_est + k_est) * num_persons
                    else:
                        k_pagi = find_k_pagi(k, kuliner_list, h["Latitude"], h["Longitude"])
                        k_malam = find_k_malam(k, k_pagi, kuliner_list, h["Latitude"], h["Longitude"])
                        k_pagi_est = k_pagi["Estimasi_Harga"] if (k_pagi and "Estimasi_Harga" in k_pagi) else 0
                        k_est = k["Estimasi_Harga"] if (k and "Estimasi_Harga" in k) else 0
                        k_malam_est = k_malam["Estimasi_Harga"] if (k_malam and "Estimasi_Harga" in k_malam) else 0
                        cost_kuliner = ((duration - 1) * (k_pagi_est + k_est + k_malam_est) + (k_pagi_est + k_est)) * num_persons
                    
                    # D. Jarak Spasial Rute Custom (Haversine)
                    if duration == 1:
                        k_pagi_lat = k_pagi["Latitude"] if (k_pagi and "Latitude" in k_pagi) else w["Latitude"]
                        k_pagi_lon = k_pagi["Longitude"] if (k_pagi and "Longitude" in k_pagi) else w["Longitude"]
                        k_lat = k["Latitude"] if (k and "Latitude" in k) else w["Latitude"]
                        k_lon = k["Longitude"] if (k and "Longitude" in k) else w["Longitude"]
                        # Rute ODT (2 Segmen): Makan Pagi -> Wisata -> Makan Siang
                        d1 = haversine_road_distance(k_pagi_lat, k_pagi_lon, w["Latitude"], w["Longitude"])
                        d2 = haversine_road_distance(w["Latitude"], w["Longitude"], k_lat, k_lon)
                        total_dist = d1 + d2
                    else:
                        # Hari 1 (5 Segmen): Makan Pagi -> Wisata -> Makan Siang -> Hotel -> Makan Malam -> Hotel
                        k_malam_lat = k_malam["Latitude"] if (k_malam and "Latitude" in k_malam) else h["Latitude"]
                        k_malam_lon = k_malam["Longitude"] if (k_malam and "Longitude" in k_malam) else h["Longitude"]
                        k_pagi_lat = k_pagi["Latitude"] if (k_pagi and "Latitude" in k_pagi) else h["Latitude"]
                        k_pagi_lon = k_pagi["Longitude"] if (k_pagi and "Longitude" in k_pagi) else h["Longitude"]
                        k_lat = k["Latitude"] if (k and "Latitude" in k) else h["Latitude"]
                        k_lon = k["Longitude"] if (k and "Longitude" in k) else h["Longitude"]

                        d1_1 = haversine_road_distance(k_pagi_lat, k_pagi_lon, w["Latitude"], w["Longitude"])
                        d1_2 = haversine_road_distance(w["Latitude"], w["Longitude"], k_lat, k_lon)
                        d1_3 = haversine_road_distance(k_lat, k_lon, h["Latitude"], h["Longitude"])
                        d1_4 = haversine_road_distance(h["Latitude"], h["Longitude"], k_malam_lat, k_malam_lon)
                        d1_5 = haversine_road_distance(k_malam_lat, k_malam_lon, h["Latitude"], h["Longitude"])
                        dist_day1 = d1_1 + d1_2 + d1_3 + d1_4 + d1_5
                        
                        # Hari Terakhir (3 Segmen): Hotel -> Makan Pagi -> Wisata -> Makan Siang
                        dc1 = haversine_road_distance(h["Latitude"], h["Longitude"], k_pagi_lat, k_pagi_lon)
                        dc2 = haversine_road_distance(k_pagi_lat, k_pagi_lon, w["Latitude"], w["Longitude"])
                        dc3 = haversine_road_distance(w["Latitude"], w["Longitude"], k_lat, k_lon)
                        dist_checkout = dc1 + dc2 + dc3
                        
                        if duration == 2:
                            total_dist = dist_day1 + dist_checkout
                        else:
                            # Hari Tengah (6 Segmen): Hotel -> Makan Pagi -> Wisata -> Makan Siang -> Hotel -> Makan Malam -> Hotel
                            dm1 = haversine_road_distance(h["Latitude"], h["Longitude"], k_pagi_lat, k_pagi_lon)
                            dm2 = haversine_road_distance(k_pagi_lat, k_pagi_lon, w["Latitude"], w["Longitude"])
                            dm3 = haversine_road_distance(w["Latitude"], w["Longitude"], k_lat, k_lon)
                            dm4 = haversine_road_distance(k_lat, k_lon, h["Latitude"], h["Longitude"])
                            dm5 = haversine_road_distance(h["Latitude"], h["Longitude"], k_malam_lat, k_malam_lon)
                            dm6 = haversine_road_distance(k_malam_lat, k_malam_lon, h["Latitude"], h["Longitude"])
                            dist_middle = dm1 + dm2 + dm3 + dm4 + dm5 + dm6
                            total_dist = dist_day1 + (duration - 2) * dist_middle + dist_checkout
                        
                    # E. Tarif Transportasi Flat Gojek Skripsi
                    if num_persons <= 1:
                        rate_per_km = 2250
                        veh_desc = "Motor GoRide (1 orang)"
                    elif num_persons <= 4:
                        rate_per_km = 5150
                        veh_desc = "Mobil GoCar Standard (2-4 orang)"
                    else:
                        rate_per_km = 6000
                        veh_desc = "Mobil GoCar XL (5-6 orang)"
                        
                    cost_transport = round(total_dist * rate_per_km)
                    
                    # F. Total Biaya Akumulatif
                    total_pkg_cost = cost_hotel + cost_wisata + cost_kuliner + cost_transport
                    
                    # Sensor Budget
                    if total_pkg_cost <= total_budget:
                        valid_combinations.append({
                            "hotel": h,
                            "wisata": w,
                            "kuliner": k,
                            "kuliner_pagi": k_pagi,
                            "kuliner_malam": k_malam,
                            "cost_hotel": cost_hotel,
                            "cost_wisata": cost_wisata,
                            "cost_kuliner": cost_kuliner,
                            "cost_transport": cost_transport,
                            "transport_desc": veh_desc,
                            "total_dist": total_dist,
                            "total_cost": total_pkg_cost,
                            "selisih": total_budget - total_pkg_cost
                        })

        # --- Langkah 6: Perangkingan Dinamis Sesuai Profil Kelas ---
        def get_val(item, key, default=0.0):
            val = item.get(key, default)
            return default if (pd.isna(val) or val is None) else float(val)

        if i == 0:
            # Hemat: Jarak spasial terkecil
            valid_combinations = sorted(valid_combinations, key=lambda x: (x.get("selisih", 0) < 0, x["total_dist"]))
        elif i == 1:
            # Balanced: Hybrid rating + jarak
            valid_combinations = sorted(
                valid_combinations,
                key=lambda x: (x.get("selisih", 0) < 0, -get_val(x["wisata"], "Rating") * 10 - get_val(x["kuliner"], "Rating") * 2 + x["total_dist"] / 10.0)
            )
        else:
            # Premium: Rating + kemewahan hotel (harga tinggi)
            valid_combinations = sorted(
                valid_combinations,
                key=lambda x: (x.get("selisih", 0) < 0, -get_val(x["wisata"], "Rating"), -get_val(x["hotel"], "Estimasi_Harga"), x["total_dist"])
            )

        # Fallback jika kosong (diselaraskan eksak dengan uji_gabungan.py)
        if not valid_combinations:
            min_cost_comb = None
            min_cost = float('inf')
            for h in hotel_list[:5]:
                for w in wisata_list[:5]:
                    for k in kuliner_list[:5]:
                        if duration > 1:
                            if hotel_mode == 'split' and len(hotel_list) > 1:
                                hotel_seq = [hotel_list[(hotel_list.index(h) + n) % len(hotel_list)] for n in range(nights)]
                                cost_hotel = sum(ht["Estimasi_Harga"] for ht in hotel_seq) * num_rooms
                            else:
                                cost_hotel = h["Estimasi_Harga"] * nights * num_rooms
                        else:
                            cost_hotel = 0
                        cost_wisata = w["Estimasi_Harga"] * num_persons
                        
                        if duration == 1:
                            k_pagi = find_k_pagi(k, kuliner_list, w["Latitude"], w["Longitude"])
                            k_malam = None
                            k_pagi_est = k_pagi["Estimasi_Harga"] if (k_pagi and "Estimasi_Harga" in k_pagi) else 0
                            k_est = k["Estimasi_Harga"] if (k and "Estimasi_Harga" in k) else 0
                            cost_kuliner = (k_pagi_est + k_est) * num_persons
                        else:
                            k_pagi = find_k_pagi(k, kuliner_list, h["Latitude"], h["Longitude"])
                            k_malam = find_k_malam(k, k_pagi, kuliner_list, h["Latitude"], h["Longitude"])
                            k_pagi_est = k_pagi["Estimasi_Harga"] if (k_pagi and "Estimasi_Harga" in k_pagi) else 0
                            k_est = k["Estimasi_Harga"] if (k and "Estimasi_Harga" in k) else 0
                            k_malam_est = k_malam["Estimasi_Harga"] if (k_malam and "Estimasi_Harga" in k_malam) else 0
                            cost_kuliner = ((duration - 1) * (k_pagi_est + k_est + k_malam_est) + (k_pagi_est + k_est)) * num_persons
                        
                        if duration == 1:
                            k_pagi_lat = k_pagi["Latitude"] if (k_pagi and "Latitude" in k_pagi) else w["Latitude"]
                            k_pagi_lon = k_pagi["Longitude"] if (k_pagi and "Longitude" in k_pagi) else w["Longitude"]
                            k_lat = k["Latitude"] if (k and "Latitude" in k) else w["Latitude"]
                            k_lon = k["Longitude"] if (k and "Longitude" in k) else w["Longitude"]
                            # Rute ODT (2 Segmen): Makan Pagi -> Wisata -> Makan Siang
                            d1 = haversine_road_distance(k_pagi_lat, k_pagi_lon, w["Latitude"], w["Longitude"])
                            d2 = haversine_road_distance(w["Latitude"], w["Longitude"], k_lat, k_lon)
                            total_dist = d1 + d2
                        else:
                            # Hari 1 (5 Segmen): Makan Pagi -> Wisata -> Makan Siang -> Hotel -> Makan Malam -> Hotel
                            k_malam_lat = k_malam["Latitude"] if (k_malam and "Latitude" in k_malam) else h["Latitude"]
                            k_malam_lon = k_malam["Longitude"] if (k_malam and "Longitude" in k_malam) else h["Longitude"]
                            k_pagi_lat = k_pagi["Latitude"] if (k_pagi and "Latitude" in k_pagi) else h["Latitude"]
                            k_pagi_lon = k_pagi["Longitude"] if (k_pagi and "Longitude" in k_pagi) else h["Longitude"]
                            k_lat = k["Latitude"] if (k and "Latitude" in k) else h["Latitude"]
                            k_lon = k["Longitude"] if (k and "Longitude" in k) else h["Longitude"]

                            d1_1 = haversine_road_distance(k_pagi_lat, k_pagi_lon, w["Latitude"], w["Longitude"])
                            d1_2 = haversine_road_distance(w["Latitude"], w["Longitude"], k_lat, k_lon)
                            d1_3 = haversine_road_distance(k_lat, k_lon, h["Latitude"], h["Longitude"])
                            d1_4 = haversine_road_distance(h["Latitude"], h["Longitude"], k_malam_lat, k_malam_lon)
                            d1_5 = haversine_road_distance(k_malam_lat, k_malam_lon, h["Latitude"], h["Longitude"])
                            dist_day1 = d1_1 + d1_2 + d1_3 + d1_4 + d1_5
                            
                            # Hari Terakhir (3 Segmen): Hotel -> Makan Pagi -> Wisata -> Makan Siang
                            dc1 = haversine_road_distance(h["Latitude"], h["Longitude"], k_pagi_lat, k_pagi_lon)
                            dc2 = haversine_road_distance(k_pagi_lat, k_pagi_lon, w["Latitude"], w["Longitude"])
                            dc3 = haversine_road_distance(w["Latitude"], w["Longitude"], k_lat, k_lon)
                            dist_checkout = dc1 + dc2 + dc3
                            
                            if duration == 2:
                                total_dist = dist_day1 + dist_checkout
                            else:
                                # Hari Tengah (6 Segmen): Hotel -> Makan Pagi -> Wisata -> Makan Siang -> Hotel -> Makan Malam -> Hotel
                                dm1 = haversine_road_distance(h["Latitude"], h["Longitude"], k_pagi_lat, k_pagi_lon)
                                dm2 = haversine_road_distance(k_pagi_lat, k_pagi_lon, w["Latitude"], w["Longitude"])
                                dm3 = haversine_road_distance(w["Latitude"], w["Longitude"], k_lat, k_lon)
                                dm4 = haversine_road_distance(k_lat, k_lon, h["Latitude"], h["Longitude"])
                                dm5 = haversine_road_distance(h["Latitude"], h["Longitude"], k_malam_lat, k_malam_lon)
                                dm6 = haversine_road_distance(k_malam_lat, k_malam_lon, h["Latitude"], h["Longitude"])
                                dist_middle = dm1 + dm2 + dm3 + dm4 + dm5 + dm6
                                total_dist = dist_day1 + (duration - 2) * dist_middle + dist_checkout
                            
                        if num_persons <= 1:
                            rate_per_km = 2250
                            veh_desc = "Motor GoRide (1 orang)"
                        elif num_persons <= 4:
                            rate_per_km = 5150
                            veh_desc = "Mobil GoCar Standard (2-4 orang)"
                        else:
                            rate_per_km = 6000
                            veh_desc = "Mobil GoCar XL (5-6 orang)"
                            
                        cost_transport = round(total_dist * rate_per_km)
                        total_pkg_cost = cost_hotel + cost_wisata + cost_kuliner + cost_transport
                        
                        if total_pkg_cost < min_cost:
                            min_cost = total_pkg_cost
                            min_cost_comb = {
                                "hotel": h,
                                "wisata": w,
                                "kuliner": k,
                                "kuliner_pagi": k_pagi,
                                "kuliner_malam": k_malam,
                                "cost_hotel": cost_hotel,
                                "cost_wisata": cost_wisata,
                                "cost_kuliner": cost_kuliner,
                                "cost_transport": cost_transport,
                                "transport_desc": veh_desc,
                                "total_dist": total_dist,
                                "total_cost": total_pkg_cost,
                                "selisih": total_budget - total_pkg_cost
                            }
            if min_cost_comb:
                valid_combinations.append(min_cost_comb)

        package_options[i] = valid_combinations[:max_options_to_show[i]]

    # --- Langkah 7: Pemetaan Ke Tab Opsi Alternatif (Hingga 15 Opsi Unik) ---
    max_opts_avail = max(len(package_options[0]), len(package_options[1]), len(package_options[2]))
    num_options = min(max_opts_avail, 15)
    if num_options < 1:
        num_options = 1

    options_list = []
    seen_signatures = set()
    
    for opt_idx in range(num_options):
        packages_for_option = []
        
        for i, label in CLUSTER_LABELS.items():
            opts = package_options[i]
            if not opts:
                continue
            
            if opt_idx >= len(opts):
                continue
            selected = opts[opt_idx]
            
            h_item = selected["hotel"]
            w_item = selected["wisata"]
            k_item = selected["kuliner"]
            
            k_pagi_item = selected["kuliner_pagi"]
            k_malam_item = selected["kuliner_malam"]
            scale_factor = (selected["cost_transport"] / selected["total_dist"]) if selected["total_dist"] > 0 else 0
            
            if duration == 1:
                # ODT (2 Segmen): Makan Pagi -> Wisata -> Makan Siang
                dist1 = haversine_road_distance(k_pagi_item["Latitude"], k_pagi_item["Longitude"], w_item["Latitude"], w_item["Longitude"])
                dist2 = haversine_road_distance(w_item["Latitude"], w_item["Longitude"], k_item["Latitude"], k_item["Longitude"])
                legs_detail = [
                    {
                        "from": "Makan Pagi",
                        "to": "Wisata",
                        "distance_km": round(dist1, 2),
                        "cost": round(dist1 * scale_factor),
                        "vehicle": selected["transport_desc"]
                    },
                    {
                        "from": "Wisata",
                        "to": "Makan Siang",
                        "distance_km": round(dist2, 2),
                        "cost": round(dist2 * scale_factor),
                        "vehicle": selected["transport_desc"]
                    }
                ]
            else:
                legs_detail = []
                for d_num in range(1, duration + 1):
                    day_label = f" (Hari {d_num})"
                    if d_num == duration:
                        # Checkout day (3 Segmen): Hotel -> Makan Pagi -> Wisata -> Makan Siang
                        dc1 = haversine_road_distance(h_item["Latitude"], h_item["Longitude"], k_pagi_item["Latitude"], k_pagi_item["Longitude"])
                        dc2 = haversine_road_distance(k_pagi_item["Latitude"], k_pagi_item["Longitude"], w_item["Latitude"], w_item["Longitude"])
                        dc3 = haversine_road_distance(w_item["Latitude"], w_item["Longitude"], k_item["Latitude"], k_item["Longitude"])
                        legs_detail.extend([
                            {
                                "from": f"Hotel{day_label}",
                                "to": f"Makan Pagi{day_label}",
                                "distance_km": round(dc1, 2),
                                "cost": round(dc1 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Makan Pagi{day_label}",
                                "to": f"Wisata{day_label}",
                                "distance_km": round(dc2, 2),
                                "cost": round(dc2 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Wisata{day_label}",
                                "to": f"Makan Siang{day_label}",
                                "distance_km": round(dc3, 2),
                                "cost": round(dc3 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            }
                        ])
                    elif d_num == 1:
                        # Stay Day 1 (5 Segmen): Makan Pagi -> Wisata -> Makan Siang -> Hotel -> Makan Malam -> Hotel
                        d1_1 = haversine_road_distance(k_pagi_item["Latitude"], k_pagi_item["Longitude"], w_item["Latitude"], w_item["Longitude"])
                        d1_2 = haversine_road_distance(w_item["Latitude"], w_item["Longitude"], k_item["Latitude"], k_item["Longitude"])
                        d1_3 = haversine_road_distance(k_item["Latitude"], k_item["Longitude"], h_item["Latitude"], h_item["Longitude"])
                        d1_4 = haversine_road_distance(h_item["Latitude"], h_item["Longitude"], k_malam_item["Latitude"], k_malam_item["Longitude"])
                        d1_5 = haversine_road_distance(k_malam_item["Latitude"], k_malam_item["Longitude"], h_item["Latitude"], h_item["Longitude"])
                        legs_detail.extend([
                            {
                                "from": f"Makan Pagi{day_label}",
                                "to": f"Wisata{day_label}",
                                "distance_km": round(d1_1, 2),
                                "cost": round(d1_1 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Wisata{day_label}",
                                "to": f"Makan Siang{day_label}",
                                "distance_km": round(d1_2, 2),
                                "cost": round(d1_2 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Makan Siang{day_label}",
                                "to": f"Hotel{day_label}",
                                "distance_km": round(d1_3, 2),
                                "cost": round(d1_3 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Hotel{day_label}",
                                "to": f"Makan Malam{day_label}",
                                "distance_km": round(d1_4, 2),
                                "cost": round(d1_4 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Makan Malam{day_label}",
                                "to": f"Hotel{day_label}",
                                "distance_km": round(d1_5, 2),
                                "cost": round(d1_5 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            }
                        ])
                    else:
                        # Middle Stay Days (6 Segmen): Hotel -> Makan Pagi -> Wisata -> Makan Siang -> Hotel -> Makan Malam -> Hotel
                        dm1 = haversine_road_distance(h_item["Latitude"], h_item["Longitude"], k_pagi_item["Latitude"], k_pagi_item["Longitude"])
                        dm2 = haversine_road_distance(k_pagi_item["Latitude"], k_pagi_item["Longitude"], w_item["Latitude"], w_item["Longitude"])
                        dm3 = haversine_road_distance(w_item["Latitude"], w_item["Longitude"], k_item["Latitude"], k_item["Longitude"])
                        dm4 = haversine_road_distance(k_item["Latitude"], k_item["Longitude"], h_item["Latitude"], h_item["Longitude"])
                        dm5 = haversine_road_distance(h_item["Latitude"], h_item["Longitude"], k_malam_item["Latitude"], k_malam_item["Longitude"])
                        dm6 = haversine_road_distance(k_malam_item["Latitude"], k_malam_item["Longitude"], h_item["Latitude"], h_item["Longitude"])
                        legs_detail.extend([
                            {
                                "from": f"Hotel{day_label}",
                                "to": f"Makan Pagi{day_label}",
                                "distance_km": round(dm1, 2),
                                "cost": round(dm1 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Makan Pagi{day_label}",
                                "to": f"Wisata{day_label}",
                                "distance_km": round(dm2, 2),
                                "cost": round(dm2 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Wisata{day_label}",
                                "to": f"Makan Siang{day_label}",
                                "distance_km": round(dm3, 2),
                                "cost": round(dm3 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Makan Siang{day_label}",
                                "to": f"Hotel{day_label}",
                                "distance_km": round(dm4, 2),
                                "cost": round(dm4 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Hotel{day_label}",
                                "to": f"Makan Malam{day_label}",
                                "distance_km": round(dm5, 2),
                                "cost": round(dm5 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Makan Malam{day_label}",
                                "to": f"Hotel{day_label}",
                                "distance_km": round(dm6, 2),
                                "cost": round(dm6 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            }
                        ])
                


            pkg_formatted: dict[str, Any] = {
                "hotel_nama": h_item["Nama_Tempat"] if duration > 1 else "Tanpa Akomodasi (One Day Trip)",
                "hotel_harga": h_item["Estimasi_Harga"] if duration > 1 else 0,
                "hotel_nama_real": h_item["Nama_Tempat"],
                "hotel_lat": h_item.get("Latitude", 0),
                "hotel_lon": h_item.get("Longitude", 0),
                "wisata_nama": w_item["Nama_Tempat"],
                "wisata_harga": w_item["Estimasi_Harga"],
                "wisata_lat": w_item.get("Latitude", 0),
                "wisata_lon": w_item.get("Longitude", 0),
                "kuliner_pagi_nama": k_pagi_item["Nama_Tempat"] if k_pagi_item else "N/A",
                "kuliner_pagi_harga": k_pagi_item["Estimasi_Harga"] if k_pagi_item else 0,
                "kuliner_pagi_lat": k_pagi_item.get("Latitude", 0) if k_pagi_item else 0,
                "kuliner_pagi_lon": k_pagi_item.get("Longitude", 0) if k_pagi_item else 0,
                "kuliner_nama": k_item["Nama_Tempat"],
                "kuliner_harga": k_item["Estimasi_Harga"],
                "kuliner_lat": k_item.get("Latitude", 0),
                "kuliner_lon": k_item.get("Longitude", 0),
                "kuliner_malam_nama": k_malam_item["Nama_Tempat"] if k_malam_item else "N/A",
                "kuliner_malam_harga": k_malam_item["Estimasi_Harga"] if k_malam_item else 0,
                "kuliner_malam_lat": k_malam_item.get("Latitude", 0) if k_malam_item else 0,
                "kuliner_malam_lon": k_malam_item.get("Longitude", 0) if k_malam_item else 0,
                "cost_akomodasi": float(selected["cost_hotel"]),
                "cost_hotel": float(selected["cost_hotel"]),
                "cost_wisata": float(selected["cost_wisata"]),
                "cost_kuliner": float(selected["cost_kuliner"]),
                "cost_transport": float(selected["cost_transport"]),
                "total_cost": float(selected["total_cost"]),
                "num_rooms": num_rooms if duration > 1 else 0,
                "nights": nights,
                "duration": duration,
                "num_persons": num_persons,
                "kategori": label,
                "cluster_id": i,
                "transport_detail": {
                    "total_cost": selected["cost_transport"],
                    "total_distance_km": selected["total_dist"],
                    "legs": legs_detail,
                    "source": "Haversine (Spatial Optimized)"
                }
            }
            
            # --- RENCANA PERJALANAN HARIAN DINAMIS (DAY-BY-DAY ITINERARY VARIATION) ---
            if duration > 1:
                itinerary = []
                wisata_in_c = candidates["wisata"][i]
                kuliner_in_c = candidates["kuliner"][i]
                
                # If hotel mode is split, we also track different hotels
                if hotel_mode == 'split' and len(hotel_list) > 1:
                    h_idx = 0
                    for idx, ht in enumerate(hotel_list):
                        if ht["Nama_Tempat"] == h_item.get("Nama_Tempat", ""):
                            h_idx = idx
                            break
                    hotel_seq = [hotel_list[(h_idx + n) % len(hotel_list)] for n in range(nights)]
                else:
                    hotel_seq = [h_item] * nights

                for d in range(1, duration + 1):
                    if d == 1:
                        w_var = w_item
                        k_var = k_item
                    else:
                        w_alts = [x for x in wisata_in_c if x.get("Nama_Tempat") != w_item.get("Nama_Tempat")]
                        if not w_alts:
                            w_alts = wisata_in_c
                        # Sort spatially based on current day's hotel
                        ref_hotel = hotel_seq[d-1] if d <= len(hotel_seq) else hotel_seq[-1]
                        h_lat = ref_hotel.get("Latitude", 0)
                        h_lon = ref_hotel.get("Longitude", 0)
                        w_alts = sorted(w_alts, key=lambda x: haversine_road_distance(h_lat, h_lon, x.get("Latitude", 0), x.get("Longitude", 0)))
                        w_var = w_alts[(d - 2) % len(w_alts)]
                        
                        k_alts = [x for x in kuliner_in_c if x.get("Nama_Tempat") != k_item.get("Nama_Tempat")]
                        if not k_alts:
                            k_alts = kuliner_in_c
                        # Sort spatially based on w_var
                        w_lat = w_var.get("Latitude", 0)
                        w_lon = w_var.get("Longitude", 0)
                        k_alts = sorted(k_alts, key=lambda x: haversine_road_distance(w_lat, w_lon, x.get("Latitude", 0), x.get("Longitude", 0)))
                        k_var = k_alts[(d - 2) % len(k_alts)]
                    
                    day_anchor_lat = hotel_seq[d-1].get("Latitude", 0) if d <= nights else w_var.get("Latitude", 0)
                    day_anchor_lon = hotel_seq[d-1].get("Longitude", 0) if d <= nights else w_var.get("Longitude", 0)
                    
                    k_pagi_var = find_k_pagi(k_var, kuliner_in_c, day_anchor_lat, day_anchor_lon)
                    if d <= nights:
                        k_malam_var = find_k_malam(k_var, k_pagi_var, kuliner_in_c, day_anchor_lat, day_anchor_lon)
                    else:
                        k_malam_var = None
                    
                    if d <= nights:
                        day_hotel_name = hotel_seq[d-1].get("Nama_Tempat", "")
                        day_hotel_harga = hotel_seq[d-1].get("Estimasi_Harga", 0)
                        day_hotel_lat = hotel_seq[d-1].get("Latitude", 0.0)
                        day_hotel_lon = hotel_seq[d-1].get("Longitude", 0.0)
                    else:
                        day_hotel_name = "Checkout"
                        day_hotel_harga = 0
                        day_hotel_lat = 0.0
                        day_hotel_lon = 0.0
                        
                    itinerary.append({
                        "day": d,
                        "wisata": w_var.get("Nama_Tempat", "N/A") if w_var else "N/A",
                        "wisata_harga": w_var.get("Estimasi_Harga", 0) if w_var else 0,
                        "wisata_lat": w_var.get("Latitude", 0.0) if w_var else 0.0,
                        "wisata_lon": w_var.get("Longitude", 0.0) if w_var else 0.0,
                        "kuliner_pagi": k_pagi_var.get("Nama_Tempat", "N/A") if k_pagi_var else "N/A",
                        "kuliner_pagi_harga": k_pagi_var.get("Estimasi_Harga", 0) if k_pagi_var else 0,
                        "kuliner_pagi_lat": k_pagi_var.get("Latitude", 0.0) if k_pagi_var else 0.0,
                        "kuliner_pagi_lon": k_pagi_var.get("Longitude", 0.0) if k_pagi_var else 0.0,
                        "kuliner": k_var.get("Nama_Tempat", "N/A") if k_var else "N/A",
                        "kuliner_harga": k_var.get("Estimasi_Harga", 0) if k_var else 0,
                        "kuliner_lat": k_var.get("Latitude", 0.0) if k_var else 0.0,
                        "kuliner_lon": k_var.get("Longitude", 0.0) if k_var else 0.0,
                        "kuliner_malam": k_malam_var.get("Nama_Tempat", "N/A") if k_malam_var else "N/A",
                        "kuliner_malam_harga": k_malam_var.get("Estimasi_Harga", 0) if k_malam_var else 0,
                        "kuliner_malam_lat": k_malam_var.get("Latitude", 0.0) if k_malam_var else 0.0,
                        "kuliner_malam_lon": k_malam_var.get("Longitude", 0.0) if k_malam_var else 0.0,
                        "hotel": day_hotel_name,
                        "hotel_harga": day_hotel_harga,
                        "hotel_lat": day_hotel_lat,
                        "hotel_lon": day_hotel_lon
                    })
                pkg_formatted["itinerary"] = itinerary
            else:
                k_pagi_var = find_k_pagi(k_item, candidates["kuliner"][i], w_item.get("Latitude", 0), w_item.get("Longitude", 0))
                pkg_formatted["itinerary"] = [{
                    "day": 1,
                    "wisata": w_item.get("Nama_Tempat", "N/A") if w_item else "N/A",
                    "wisata_harga": w_item.get("Estimasi_Harga", 0) if w_item else 0,
                    "wisata_lat": w_item.get("Latitude", 0.0) if w_item else 0.0,
                    "wisata_lon": w_item.get("Longitude", 0.0) if w_item else 0.0,
                    "kuliner_pagi": k_pagi_var.get("Nama_Tempat", "N/A") if k_pagi_var else "N/A",
                    "kuliner_pagi_harga": k_pagi_var.get("Estimasi_Harga", 0) if k_pagi_var else 0,
                    "kuliner_pagi_lat": k_pagi_var.get("Latitude", 0.0) if k_pagi_var else 0.0,
                    "kuliner_pagi_lon": k_pagi_var.get("Longitude", 0.0) if k_pagi_var else 0.0,
                    "kuliner": k_item.get("Nama_Tempat", "N/A") if k_item else "N/A",
                    "kuliner_harga": k_item.get("Estimasi_Harga", 0) if k_item else 0,
                    "kuliner_lat": k_item.get("Latitude", 0.0) if k_item else 0.0,
                    "kuliner_lon": k_item.get("Longitude", 0.0) if k_item else 0.0,
                    "kuliner_malam": "N/A",
                    "kuliner_malam_harga": 0,
                    "kuliner_malam_lat": 0,
                    "kuliner_malam_lon": 0,
                    "hotel": "Checkout",
                    "hotel_harga": 0,
                    "hotel_lat": 0.0,
                    "hotel_lon": 0.0
                }]

            # Recalculate legs, distance, and transport cost based on actual coordinates
            recalculate_pkg_legs(pkg_formatted, pkg_formatted["itinerary"], num_persons)

            # Recalculate package totals to ensure 100% mathematical consistency with daily itinerary subtotals
            total_kuliner = 0.0
            itinerary_list = cast(list, pkg_formatted["itinerary"])
            for day in itinerary_list:
                day_dict = cast(dict, day)
                d_num = int(day_dict["day"])
                pagi = float(day_dict.get("kuliner_pagi_harga") or 0.0)
                siang = float(day_dict.get("kuliner_harga") or 0.0)
                malam = float(day_dict.get("kuliner_malam_harga") or 0.0) if d_num <= nights else 0.0
                total_kuliner += (pagi + siang + malam) * float(num_persons)
            pkg_formatted["cost_kuliner"] = total_kuliner

            total_hotel = 0.0
            for day in itinerary_list:
                day_dict = cast(dict, day)
                h_name = day_dict.get("hotel")
                if h_name and h_name != "Checkout":
                    total_hotel += float(day_dict.get("hotel_harga") or 0.0) * float(num_rooms)
            cost_h = total_hotel
            cost_w = float(selected["cost_wisata"])
            cost_k = total_kuliner
            cost_t = float(pkg_formatted["cost_transport"])

            pkg_formatted["cost_akomodasi"] = cost_h
            pkg_formatted["cost_hotel"] = cost_h
            pkg_formatted["cost_kuliner"] = cost_k
            pkg_formatted["total_cost"] = cost_h + cost_w + cost_k + cost_t

            packages_for_option.append(pkg_formatted)

        # Enforce uniqueness of option combinations
        sorted_pkgs = sorted(packages_for_option, key=lambda x: x.get("cluster_id", 0))
        sig = tuple((p.get("hotel_nama_real", ""), p.get("wisata_nama", ""), p.get("kuliner_nama", "")) for p in sorted_pkgs)
        
        if sig not in seen_signatures:
            seen_signatures.add(sig)
            options_list.append({
                "option_index": len(options_list) + 1,
                "packages": sorted_pkgs,
                "clustered_items": {
                    "hotel": {i: candidates["hotel"][i] for i in range(3)},
                    "wisata": {i: candidates["wisata"][i] for i in range(3)},
                    "kuliner": {i: candidates["kuliner"][i] for i in range(3)}
                }
            })

    # --- Tampilkan Hasil Opsi 1 Di Log Console ---
    if verbose and options_list:
        rep_packages = cast(list, options_list[0]["packages"])
        print(f"\n{'='*60}")
        print(f"  HASIL REKOMENDASI SPASIAL OPSI 1 ({len(rep_packages)} paket)")
        print(f"{'='*60}")

        for idx, pkg in enumerate(rep_packages, 1):
            print(f"\n  📦 Paket {idx}: {pkg['kategori'].upper()}")
            print(f"  {'─'*50}")
            if pkg["duration"] > 1:
                print(f"  🏨 Hotel   : {pkg['hotel_nama']}")
                print(f"               Rp {pkg['hotel_harga']:,.0f}/malam × "
                      f"{pkg['nights']} malam × {pkg['num_rooms']} kamar"
                      f" = Rp {pkg['cost_akomodasi']:,.0f}")
            else:
                print(f"  🏨 Akomodasi: Tanpa Akomodasi (One Day Trip)")
            print(f"  🎯 Wisata  : {pkg['wisata_nama']}")
            print(f"               Rp {pkg['wisata_harga']:,.0f}/orang × {pkg['num_persons']} orang = Rp {pkg['cost_wisata']:,.0f}")
            print(f"  🍜 Kuliner : {pkg['kuliner_nama']} & {pkg['kuliner_malam_nama']}")
            print(f"               (Rp {pkg['kuliner_harga']:,.0f} + Rp {pkg['kuliner_malam_harga']:,.0f})/orang × {pkg['num_persons']} orang × {pkg['duration']} hari = Rp {pkg['cost_kuliner']:,.0f}")
            print(f"  🚗 Transport: Rp {pkg['cost_transport']:,.0f} ({pkg['transport_detail']['total_distance_km']:.2f} km via {pkg['transport_detail']['legs'][0]['vehicle']})")
            
            # Print transparent daily subtotals if multi-day
            if pkg["duration"] > 1 and pkg.get("itinerary"):
                print(f"  🗂️  Rincian Harian Transparan:")
                for day in pkg["itinerary"]:
                    d = day["day"]
                    prev_day_hotel = pkg["itinerary"][d - 2].get("hotel") if d > 1 else (pkg.get("hotel_nama_real") or pkg.get("hotel_nama"))
                    is_pindah = day.get("hotel") and day.get("hotel") != 'Checkout' and day.get("hotel") != prev_day_hotel
                    pindah_str = " (Pindah)" if is_pindah else " (Sama)"
                    
                    nights = pkg.get("nights", pkg["duration"] - 1)
                    has_hotel = day.get("hotel") and day.get("hotel") != 'Checkout'
                    hotel_cost = float(day.get("hotel_harga", 0)) * pkg["num_rooms"] if has_hotel else 0.0
                    wisata_cost = float(day.get("wisata_harga", 0)) * pkg["num_persons"] if d == 1 else 0.0
                    
                    pagi_h = float(day.get("kuliner_pagi_harga", 0))
                    siang_h = float(day.get("kuliner_harga", 0))
                    malam_h = float(day.get("kuliner_malam_harga", 0)) if d <= nights else 0.0
                    kuliner_cost = (pagi_h + siang_h + malam_h) * pkg["num_persons"]
                    
                    day_legs = [leg for leg in pkg["transport_detail"]["legs"] if f"(Hari {d})" in leg["from"] or f"(Hari {d})" in leg["to"]]
                    transport_cost = sum(leg["cost"] for leg in day_legs) if day_legs else round(pkg["cost_transport"] / pkg["duration"])
                    
                    day_subtotal = hotel_cost + wisata_cost + kuliner_cost + transport_cost
                    
                    hotel_str = f"Hotel: {day.get('hotel')}{pindah_str} (Rp {float(day.get('hotel_harga', 0)):,.0f})" if has_hotel else "Checkout"
                    wisata_label_cost = float(day.get('wisata_harga', 0)) if d == 1 else 0.0
                    print(f"    • Hari {d}: {hotel_str} | Wisata: {day.get('wisata')} (Rp {wisata_label_cost:,.0f}) | Kuliner: {day.get('kuliner')} & {day.get('kuliner_malam')}")
                    print(f"              Kalkulasi: Akomodasi Rp {hotel_cost:,.0f} + Wisata Rp {wisata_cost:,.0f} + Kuliner Rp {kuliner_cost:,.0f} + Transport Rp {transport_cost:,.0f} = Subtotal Rp {day_subtotal:,.0f}")
            
            print(f"  {'─'*50}")
            is_under = pkg["total_cost"] <= total_budget
            status_txt = "✅ UNDER BUDGET" if is_under else "⚠️ OVER BUDGET"
            print(f"  💰 TOTAL   : Rp {pkg['total_cost']:,.0f}  {status_txt}")
            selisih = total_budget - pkg["total_cost"]
            selisih_label = "Sisa" if is_under else "Kekurangan"
            print(f"  💵 {selisih_label:7}: Rp {abs(selisih):,.0f}")

    global LAST_CLUSTERED
    LAST_CLUSTERED = {
        "hotel": clustered.get("hotel", {}).get("df") if "hotel" in clustered else None,
        "wisata": clustered.get("wisata", {}).get("df") if "wisata" in clustered else None,
        "kuliner": clustered.get("kuliner", {}).get("df") if "kuliner" in clustered else None,
    }

    return options_list


# ============================================================
# 4. GENERATE PAKET FLEKSIBEL (FLEXIBLE EXPLORATION WORKFLOW)
# ============================================================
def generate_flexible_exploration_packages(num_persons, duration, datasets,
                                           api_key=None, verbose=True,
                                           transport_mode=None):
    """
    Alur Skenario Alternatif 1: Flexible Exploration.
    Digunakan ketika pengguna belum menentukan budget.
    Menjalankan offline clustering dengan percentile (Q1, Median, Q3).
    """
    # Cast parameters to prevent type/comparison errors
    duration = int(float(duration))
    num_persons = int(float(num_persons))

    if api_key is None:
        api_key = GOOGLE_MAPS_API_KEY

    if verbose:
        print(f"\n{'='*60}")
        print(f"  FLEXIBLE EXPLORATION WORKFLOW")
        print(f"{'='*60}")
        print(f"  Peserta       : {num_persons} orang")
        print(f"  Durasi        : {duration} hari")
        print(f"  Skema         : Centroid Persentil (Offline)\n")

    clustered = {}
    for cat_name in ["hotel", "wisata", "kuliner"]:
        df = datasets[cat_name]
        prices = df["Estimasi_Harga"].values

        if verbose:
            print(f"  Clustering {cat_name.capitalize()} (Persentil)...")

        try:
            result = run_percentile_fcm(prices)
            df_clustered = df.copy()
            df_clustered["Cluster"] = result["labels"]
            u_matrix = result["u"]
            df_clustered["Membership_Degree"] = [float(u_matrix[result["labels"][j], j]) for j in range(len(prices))]
            df_clustered["Kategori"] = df_clustered["Cluster"].map(CLUSTER_LABELS)
            clustered[cat_name] = {
                "df": df_clustered,
                "cntr": result["cntr"],
            }
        except Exception as e:
            print(f"    ⚠ Error clustering {cat_name}: {e}")
            return []

    # --- Langkah 3: Ambil 15 Kandidat Terdekat dari FCM ---
    candidates = {
        "hotel": {i: [] for i in range(3)},
        "wisata": {i: [] for i in range(3)},
        "kuliner": {i: [] for i in range(3)}
    }

    for key in ["hotel", "wisata", "kuliner"]:
        df = clustered[key]["df"]
        cntrs = clustered[key]["cntr"]
        for i in range(3):
            items_in_c = df[df["Cluster"] == i].copy()
            
            if items_in_c.empty:
                df["distance_to_target"] = (df["Estimasi_Harga"] - cntrs[i]).abs()
                best_items = df.nsmallest(15, "distance_to_target")
            else:
                best_items = items_in_c.sort_values(by="Membership_Degree", ascending=False).head(15)
                
            candidates[key][i] = best_items.to_dict("records")

    package_options = {0: [], 1: [], 2: []}
    max_options_to_show = {0: 15, 1: 15, 2: 15}
    num_rooms = math.ceil(num_persons / MAX_PERSONS_PER_ROOM)
    nights = duration - 1

    for i in range(3):
        hotel_list = candidates["hotel"][i]
        wisata_list = candidates["wisata"][i]
        kuliner_list = candidates["kuliner"][i]
        
        valid_combinations = []
        
        for h in hotel_list:
            for w in wisata_list:
                for k in kuliner_list:
                    # A. Hitung Biaya Akomodasi
                    if duration > 1:
                        cost_hotel = h["Estimasi_Harga"] * nights * num_rooms
                    else:
                        cost_hotel = 0
                        
                    # B. Hitung Biaya Wisata
                    cost_wisata = w["Estimasi_Harga"] * num_persons
                    
                    # C. Cari kuliner pagi, siang, malam dan hitung biaya kuliner
                    if duration == 1:
                        k_pagi = find_k_pagi(k, kuliner_list, w["Latitude"], w["Longitude"])
                        k_malam = None
                        k_pagi_est = k_pagi["Estimasi_Harga"] if (k_pagi and "Estimasi_Harga" in k_pagi) else 0
                        k_est = k["Estimasi_Harga"] if (k and "Estimasi_Harga" in k) else 0
                        cost_kuliner = (k_pagi_est + k_est) * num_persons
                    else:
                        k_pagi = find_k_pagi(k, kuliner_list, h["Latitude"], h["Longitude"])
                        k_malam = find_k_malam(k, k_pagi, kuliner_list, h["Latitude"], h["Longitude"])
                        k_pagi_est = k_pagi["Estimasi_Harga"] if (k_pagi and "Estimasi_Harga" in k_pagi) else 0
                        k_est = k["Estimasi_Harga"] if (k and "Estimasi_Harga" in k) else 0
                        k_malam_est = k_malam["Estimasi_Harga"] if (k_malam and "Estimasi_Harga" in k_malam) else 0
                        cost_kuliner = ((duration - 1) * (k_pagi_est + k_est + k_malam_est) + (k_pagi_est + k_est)) * num_persons
                    
                    # D. Jarak Spasial Rute Custom (Haversine)
                    if duration == 1:
                        k_pagi_lat = k_pagi["Latitude"] if (k_pagi and "Latitude" in k_pagi) else w["Latitude"]
                        k_pagi_lon = k_pagi["Longitude"] if (k_pagi and "Longitude" in k_pagi) else w["Longitude"]
                        k_lat = k["Latitude"] if (k and "Latitude" in k) else w["Latitude"]
                        k_lon = k["Longitude"] if (k and "Longitude" in k) else w["Longitude"]
                        # Rute ODT (2 Segmen): Makan Pagi -> Wisata -> Makan Siang
                        d1 = haversine_road_distance(k_pagi_lat, k_pagi_lon, w["Latitude"], w["Longitude"])
                        d2 = haversine_road_distance(w["Latitude"], w["Longitude"], k_lat, k_lon)
                        total_dist = d1 + d2
                    else:
                        # Hari 1 (5 Segmen): Makan Pagi -> Wisata -> Makan Siang -> Hotel -> Makan Malam -> Hotel
                        k_malam_lat = k_malam["Latitude"] if (k_malam and "Latitude" in k_malam) else h["Latitude"]
                        k_malam_lon = k_malam["Longitude"] if (k_malam and "Longitude" in k_malam) else h["Longitude"]
                        k_pagi_lat = k_pagi["Latitude"] if (k_pagi and "Latitude" in k_pagi) else h["Latitude"]
                        k_pagi_lon = k_pagi["Longitude"] if (k_pagi and "Longitude" in k_pagi) else h["Longitude"]
                        k_lat = k["Latitude"] if (k and "Latitude" in k) else h["Latitude"]
                        k_lon = k["Longitude"] if (k and "Longitude" in k) else h["Longitude"]

                        d1_1 = haversine_road_distance(k_pagi_lat, k_pagi_lon, w["Latitude"], w["Longitude"])
                        d1_2 = haversine_road_distance(w["Latitude"], w["Longitude"], k_lat, k_lon)
                        d1_3 = haversine_road_distance(k_lat, k_lon, h["Latitude"], h["Longitude"])
                        d1_4 = haversine_road_distance(h["Latitude"], h["Longitude"], k_malam_lat, k_malam_lon)
                        d1_5 = haversine_road_distance(k_malam_lat, k_malam_lon, h["Latitude"], h["Longitude"])
                        dist_day1 = d1_1 + d1_2 + d1_3 + d1_4 + d1_5
                        
                        # Hari Terakhir (3 Segmen): Hotel -> Makan Pagi -> Wisata -> Makan Siang
                        dc1 = haversine_road_distance(h["Latitude"], h["Longitude"], k_pagi_lat, k_pagi_lon)
                        dc2 = haversine_road_distance(k_pagi_lat, k_pagi_lon, w["Latitude"], w["Longitude"])
                        dc3 = haversine_road_distance(w["Latitude"], w["Longitude"], k_lat, k_lon)
                        dist_checkout = dc1 + dc2 + dc3
                        
                        if duration == 2:
                            total_dist = dist_day1 + dist_checkout
                        else:
                            # Hari Tengah (6 Segmen): Hotel -> Makan Pagi -> Wisata -> Makan Siang -> Hotel -> Makan Malam -> Hotel
                            dm1 = haversine_road_distance(h["Latitude"], h["Longitude"], k_pagi_lat, k_pagi_lon)
                            dm2 = haversine_road_distance(k_pagi_lat, k_pagi_lon, w["Latitude"], w["Longitude"])
                            dm3 = haversine_road_distance(w["Latitude"], w["Longitude"], k_lat, k_lon)
                            dm4 = haversine_road_distance(k_lat, k_lon, h["Latitude"], h["Longitude"])
                            dm5 = haversine_road_distance(h["Latitude"], h["Longitude"], k_malam_lat, k_malam_lon)
                            dm6 = haversine_road_distance(k_malam_lat, k_malam_lon, h["Latitude"], h["Longitude"])
                            dist_middle = dm1 + dm2 + dm3 + dm4 + dm5 + dm6
                            total_dist = dist_day1 + (duration - 2) * dist_middle + dist_checkout
                        
                    # E. Tarif Transportasi Flat Gojek Skripsi
                    if num_persons <= 1:
                        rate_per_km = 2250
                        veh_desc = "Motor GoRide (1 orang)"
                    elif num_persons <= 4:
                        rate_per_km = 5150
                        veh_desc = "Mobil GoCar Standard (2-4 orang)"
                    else:
                        rate_per_km = 6000
                        veh_desc = "Mobil GoCar XL (5-6 orang)"
                        
                    cost_transport = round(total_dist * rate_per_km)
                    
                    # F. Total Biaya Akumulatif
                    total_pkg_cost = cost_hotel + cost_wisata + cost_kuliner + cost_transport
                    
                    valid_combinations.append({
                        "hotel": h,
                        "wisata": w,
                        "kuliner": k,
                        "kuliner_pagi": k_pagi,
                        "kuliner_malam": k_malam,
                        "cost_hotel": cost_hotel,
                        "cost_wisata": cost_wisata,
                        "cost_kuliner": cost_kuliner,
                        "cost_transport": cost_transport,
                        "transport_desc": veh_desc,
                        "total_dist": total_dist,
                        "total_cost": total_pkg_cost
                    })

        # --- Perangkingan Dinamis Sesuai Profil Kelas ---
        def get_val(item, key, default=0.0):
            val = item.get(key, default)
            return default if (pd.isna(val) or val is None) else float(val)

        if i == 0:
            # Hemat: Jarak spasial terkecil
            valid_combinations = sorted(valid_combinations, key=lambda x: (x.get("selisih", 0) < 0, x["total_dist"]))
        elif i == 1:
            # Balanced: Hybrid rating + jarak
            valid_combinations = sorted(
                valid_combinations,
                key=lambda x: (x.get("selisih", 0) < 0, -get_val(x["wisata"], "Rating") * 10 - get_val(x["kuliner"], "Rating") * 2 + x["total_dist"] / 10.0)
            )
        else:
            # Premium: Rating + kemewahan hotel (harga tinggi)
            valid_combinations = sorted(
                valid_combinations,
                key=lambda x: (x.get("selisih", 0) < 0, -get_val(x["wisata"], "Rating"), -get_val(x["hotel"], "Estimasi_Harga"), x["total_dist"])
            )

        package_options[i] = valid_combinations[:max_options_to_show[i]]

    # --- Pemetaan Ke Tab Opsi Alternatif (Hingga 15 Opsi Unik) ---
    max_opts_avail = max(len(package_options[0]), len(package_options[1]), len(package_options[2]))
    num_options = min(max_opts_avail, 15)
    if num_options < 1:
        num_options = 1

    options_list = []
    seen_signatures = set()
    
    for opt_idx in range(num_options):
        packages_for_option = []
        
        for i, label in CLUSTER_LABELS.items():
            opts = package_options[i]
            if not opts:
                continue
            
            if opt_idx >= len(opts):
                continue
            selected = opts[opt_idx]
            
            h_item = selected["hotel"]
            w_item = selected["wisata"]
            k_item = selected["kuliner"]
            k_pagi_item = selected["kuliner_pagi"]
            k_malam_item = selected["kuliner_malam"]
            scale_factor = (selected["cost_transport"] / selected["total_dist"]) if selected["total_dist"] > 0 else 0
            
            if duration == 1:
                # ODT (2 Segmen): Makan Pagi -> Wisata -> Makan Siang
                dist1 = haversine_road_distance(k_pagi_item["Latitude"], k_pagi_item["Longitude"], w_item["Latitude"], w_item["Longitude"])
                dist2 = haversine_road_distance(w_item["Latitude"], w_item["Longitude"], k_item["Latitude"], k_item["Longitude"])
                legs_detail = [
                    {
                        "from": "Makan Pagi",
                        "to": "Wisata",
                        "distance_km": round(dist1, 2),
                        "cost": round(dist1 * scale_factor),
                        "vehicle": selected["transport_desc"]
                    },
                    {
                        "from": "Wisata",
                        "to": "Makan Siang",
                        "distance_km": round(dist2, 2),
                        "cost": round(dist2 * scale_factor),
                        "vehicle": selected["transport_desc"]
                    }
                ]
            else:
                legs_detail = []
                for d_num in range(1, duration + 1):
                    day_label = f" (Hari {d_num})"
                    if d_num == duration:
                        # Checkout day (3 Segmen): Hotel -> Makan Pagi -> Wisata -> Makan Siang
                        dc1 = haversine_road_distance(h_item["Latitude"], h_item["Longitude"], k_pagi_item["Latitude"], k_pagi_item["Longitude"])
                        dc2 = haversine_road_distance(k_pagi_item["Latitude"], k_pagi_item["Longitude"], w_item["Latitude"], w_item["Longitude"])
                        dc3 = haversine_road_distance(w_item["Latitude"], w_item["Longitude"], k_item["Latitude"], k_item["Longitude"])
                        legs_detail.extend([
                            {
                                "from": f"Hotel{day_label}",
                                "to": f"Makan Pagi{day_label}",
                                "distance_km": round(dc1, 2),
                                "cost": round(dc1 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Makan Pagi{day_label}",
                                "to": f"Wisata{day_label}",
                                "distance_km": round(dc2, 2),
                                "cost": round(dc2 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Wisata{day_label}",
                                "to": f"Makan Siang{day_label}",
                                "distance_km": round(dc3, 2),
                                "cost": round(dc3 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            }
                        ])
                    elif d_num == 1:
                        # Stay Day 1 (5 Segmen): Makan Pagi -> Wisata -> Makan Siang -> Hotel -> Makan Malam -> Hotel
                        d1_1 = haversine_road_distance(k_pagi_item["Latitude"], k_pagi_item["Longitude"], w_item["Latitude"], w_item["Longitude"])
                        d1_2 = haversine_road_distance(w_item["Latitude"], w_item["Longitude"], k_item["Latitude"], k_item["Longitude"])
                        d1_3 = haversine_road_distance(k_item["Latitude"], k_item["Longitude"], h_item["Latitude"], h_item["Longitude"])
                        d1_4 = haversine_road_distance(h_item["Latitude"], h_item["Longitude"], k_malam_item["Latitude"], k_malam_item["Longitude"])
                        d1_5 = haversine_road_distance(k_malam_item["Latitude"], k_malam_item["Longitude"], h_item["Latitude"], h_item["Longitude"])
                        legs_detail.extend([
                            {
                                "from": f"Makan Pagi{day_label}",
                                "to": f"Wisata{day_label}",
                                "distance_km": round(d1_1, 2),
                                "cost": round(d1_1 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Wisata{day_label}",
                                "to": f"Makan Siang{day_label}",
                                "distance_km": round(d1_2, 2),
                                "cost": round(d1_2 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Makan Siang{day_label}",
                                "to": f"Hotel{day_label}",
                                "distance_km": round(d1_3, 2),
                                "cost": round(d1_3 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Hotel{day_label}",
                                "to": f"Makan Malam{day_label}",
                                "distance_km": round(d1_4, 2),
                                "cost": round(d1_4 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Makan Malam{day_label}",
                                "to": f"Hotel{day_label}",
                                "distance_km": round(d1_5, 2),
                                "cost": round(d1_5 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            }
                        ])
                    else:
                        # Middle Stay Days (6 Segmen): Hotel -> Makan Pagi -> Wisata -> Makan Siang -> Hotel -> Makan Malam -> Hotel
                        dm1 = haversine_road_distance(h_item["Latitude"], h_item["Longitude"], k_pagi_item["Latitude"], k_pagi_item["Longitude"])
                        dm2 = haversine_road_distance(k_pagi_item["Latitude"], k_pagi_item["Longitude"], w_item["Latitude"], w_item["Longitude"])
                        dm3 = haversine_road_distance(w_item["Latitude"], w_item["Longitude"], k_item["Latitude"], k_item["Longitude"])
                        dm4 = haversine_road_distance(k_item["Latitude"], k_item["Longitude"], h_item["Latitude"], h_item["Longitude"])
                        dm5 = haversine_road_distance(h_item["Latitude"], h_item["Longitude"], k_malam_item["Latitude"], k_malam_item["Longitude"])
                        dm6 = haversine_road_distance(k_malam_item["Latitude"], k_malam_item["Longitude"], h_item["Latitude"], h_item["Longitude"])
                        legs_detail.extend([
                            {
                                "from": f"Hotel{day_label}",
                                "to": f"Makan Pagi{day_label}",
                                "distance_km": round(dm1, 2),
                                "cost": round(dm1 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Makan Pagi{day_label}",
                                "to": f"Wisata{day_label}",
                                "distance_km": round(dm2, 2),
                                "cost": round(dm2 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Wisata{day_label}",
                                "to": f"Makan Siang{day_label}",
                                "distance_km": round(dm3, 2),
                                "cost": round(dm3 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Makan Siang{day_label}",
                                "to": f"Hotel{day_label}",
                                "distance_km": round(dm4, 2),
                                "cost": round(dm4 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Hotel{day_label}",
                                "to": f"Makan Malam{day_label}",
                                "distance_km": round(dm5, 2),
                                "cost": round(dm5 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Makan Malam{day_label}",
                                "to": f"Hotel{day_label}",
                                "distance_km": round(dm6, 2),
                                "cost": round(dm6 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            }
                        ])
            


            transport_detail = {
                "total_cost": selected["cost_transport"],
                "total_distance_km": round(selected["total_dist"], 2),
                "vehicle": selected["transport_desc"] if "transport_desc" in selected else ("Mobil GoCar" if num_persons > 1 else "Motor GoRide"),
                "legs": legs_detail,
                "source": "Gojek API Flat Rate (Skripsi)"
            }
            
            pkg_formatted: dict[str, Any] = {
                "hotel_nama": h_item.get("Nama_Tempat", "N/A") if duration > 1 else "Tanpa Akomodasi (1 Hari)",
                "hotel_nama_real": h_item.get("Nama_Tempat", "") if duration > 1 else "",
                "hotel_harga": h_item.get("Estimasi_Harga", 0) if duration > 1 else 0,
                "hotel_rating": h_item.get("Rating", 0.0) if duration > 1 else 0.0,
                "hotel_lat": h_item.get("Latitude", 0.0) if duration > 1 else 0.0,
                "hotel_lon": h_item.get("Longitude", 0.0) if duration > 1 else 0.0,
                
                "wisata_nama": w_item.get("Nama_Tempat", "N/A"),
                "wisata_harga": w_item.get("Estimasi_Harga", 0),
                "wisata_rating": w_item.get("Rating", 0.0),
                "wisata_lat": w_item.get("Latitude", 0.0),
                "wisata_lon": w_item.get("Longitude", 0.0),
                
                "kuliner_pagi_nama": k_pagi_item.get("Nama_Tempat", "N/A") if k_pagi_item else "N/A",
                "kuliner_pagi_harga": k_pagi_item.get("Estimasi_Harga", 0) if k_pagi_item else 0,
                "kuliner_pagi_rating": k_pagi_item.get("Rating", 0.0) if k_pagi_item else 0.0,
                "kuliner_pagi_lat": k_pagi_item.get("Latitude", 0.0) if k_pagi_item else 0.0,
                "kuliner_pagi_lon": k_pagi_item.get("Longitude", 0.0) if k_pagi_item else 0.0,
                
                "kuliner_nama": k_item.get("Nama_Tempat", "N/A"),
                "kuliner_harga": k_item.get("Estimasi_Harga", 0),
                "kuliner_rating": k_item.get("Rating", 0.0),
                "kuliner_lat": k_item.get("Latitude", 0.0),
                "kuliner_lon": k_item.get("Longitude", 0.0),
                
                "kuliner_malam_nama": k_malam_item.get("Nama_Tempat", "N/A") if k_malam_item else "N/A",
                "kuliner_malam_harga": k_malam_item.get("Estimasi_Harga", 0) if k_malam_item else 0,
                "kuliner_malam_rating": k_malam_item.get("Rating", 0.0) if k_malam_item else 0.0,
                "kuliner_malam_lat": k_malam_item.get("Latitude", 0.0) if k_malam_item else 0.0,
                "kuliner_malam_lon": k_malam_item.get("Longitude", 0.0) if k_malam_item else 0.0,
                
                "total_cost": float(selected["total_cost"]),
                "cost_hotel": float(selected["cost_hotel"]),
                "cost_akomodasi": float(selected["cost_hotel"]),
                "cost_wisata": float(selected["cost_wisata"]),
                "cost_kuliner": float(selected["cost_kuliner"]),
                "cost_transport": float(selected["cost_transport"]),
                "num_rooms": num_rooms if duration > 1 else 0,
                "num_persons": num_persons,
                "nights": nights if duration > 1 else 0,
                "duration": duration,
                
                "cluster_id": i,
                "kategori": label,
                "transport_detail": transport_detail
            }
            
            # --- RENCANA PERJALANAN HARIAN DINAMIS (DAY-BY-DAY ITINERARY VARIATION) ---
            if duration > 1:
                itinerary = []
                w_list = candidates["wisata"][i]
                k_list = candidates["kuliner"][i]
                hotel_list = candidates["hotel"][i]
                h_item = selected["hotel"]
                if len(hotel_list) > 1:
                    hotel_seq = [hotel_list[(hotel_list.index(h_item) + n) % len(hotel_list)] for n in range(nights)]
                else:
                    hotel_seq = [h_item] * nights

                for d in range(1, duration + 1):
                    if d == 1:
                        w_var = w_item
                        k_var = k_item
                    else:
                        w_alts = [x for x in w_list if x.get("Nama_Tempat") != w_item.get("Nama_Tempat")]
                        if not w_alts:
                            w_alts = w_list
                        # Sort spatially based on current day's hotel
                        ref_hotel = hotel_seq[d-1] if d <= len(hotel_seq) else hotel_seq[-1]
                        h_lat = ref_hotel.get("Latitude", 0)
                        h_lon = ref_hotel.get("Longitude", 0)
                        w_alts = sorted(w_alts, key=lambda x: haversine_road_distance(h_lat, h_lon, x.get("Latitude", 0), x.get("Longitude", 0)))
                        w_var = w_alts[(d - 2 + opt_idx) % len(w_alts)]
                        
                        k_alts = [x for x in k_list if x.get("Nama_Tempat") != k_item.get("Nama_Tempat")]
                        if not k_alts:
                            k_alts = k_list
                        # Sort spatially based on w_var
                        w_lat = w_var.get("Latitude", 0)
                        w_lon = w_var.get("Longitude", 0)
                        k_alts = sorted(k_alts, key=lambda x: haversine_road_distance(w_lat, w_lon, x.get("Latitude", 0), x.get("Longitude", 0)))
                        k_var = k_alts[(d - 2 + opt_idx) % len(k_alts)]
                    
                    day_anchor_lat = hotel_seq[d-1].get("Latitude", 0) if d <= nights else w_var.get("Latitude", 0)
                    day_anchor_lon = hotel_seq[d-1].get("Longitude", 0) if d <= nights else w_var.get("Longitude", 0)
                    k_pagi_var = find_k_pagi(k_var, k_list, day_anchor_lat, day_anchor_lon)
                    if d <= nights:
                        k_malam_var = find_k_malam(k_var, k_pagi_var, k_list, day_anchor_lat, day_anchor_lon)
                    else:
                        k_malam_var = None
                    
                    if d <= nights:
                        day_hotel_name = hotel_seq[d-1].get("Nama_Tempat", "")
                        day_hotel_harga = hotel_seq[d-1].get("Estimasi_Harga", 0)
                        day_hotel_lat = hotel_seq[d-1].get("Latitude", 0.0)
                        day_hotel_lon = hotel_seq[d-1].get("Longitude", 0.0)
                    else:
                        day_hotel_name = "Checkout"
                        day_hotel_harga = 0
                        day_hotel_lat = 0.0
                        day_hotel_lon = 0.0
                    itinerary.append({
                        "day": d,
                        "wisata": w_var.get("Nama_Tempat", "N/A") if w_var else "N/A",
                        "wisata_harga": w_var.get("Estimasi_Harga", 0) if w_var else 0,
                        "wisata_lat": w_var.get("Latitude", 0.0) if w_var else 0.0,
                        "wisata_lon": w_var.get("Longitude", 0.0) if w_var else 0.0,
                        "kuliner_pagi": k_pagi_var.get("Nama_Tempat", "N/A") if k_pagi_var else "N/A",
                        "kuliner_pagi_harga": k_pagi_var.get("Estimasi_Harga", 0) if k_pagi_var else 0,
                        "kuliner_pagi_lat": k_pagi_var.get("Latitude", 0.0) if k_pagi_var else 0.0,
                        "kuliner_pagi_lon": k_pagi_var.get("Longitude", 0.0) if k_pagi_var else 0.0,
                        "kuliner": k_var.get("Nama_Tempat", "N/A") if k_var else "N/A",
                        "kuliner_harga": k_var.get("Estimasi_Harga", 0) if k_var else 0,
                        "kuliner_lat": k_var.get("Latitude", 0.0) if k_var else 0.0,
                        "kuliner_lon": k_var.get("Longitude", 0.0) if k_var else 0.0,
                        "kuliner_malam": k_malam_var.get("Nama_Tempat", "N/A") if k_malam_var else "N/A",
                        "kuliner_malam_harga": k_malam_var.get("Estimasi_Harga", 0) if k_malam_var else 0,
                        "kuliner_malam_lat": k_malam_var.get("Latitude", 0.0) if k_malam_var else 0.0,
                        "kuliner_malam_lon": k_malam_var.get("Longitude", 0.0) if k_malam_var else 0.0,
                        "hotel": day_hotel_name,
                        "hotel_harga": day_hotel_harga,
                        "hotel_lat": day_hotel_lat,
                        "hotel_lon": day_hotel_lon
                    })
                pkg_formatted["itinerary"] = itinerary
            else:
                k_pagi_var = find_k_pagi(k_item, candidates["kuliner"][i], w_item.get("Latitude", 0), w_item.get("Longitude", 0))
                pkg_formatted["itinerary"] = [{
                    "day": 1,
                    "wisata": w_item.get("Nama_Tempat", "N/A") if w_item else "N/A",
                    "wisata_harga": w_item.get("Estimasi_Harga", 0) if w_item else 0,
                    "wisata_lat": w_item.get("Latitude", 0.0) if w_item else 0.0,
                    "wisata_lon": w_item.get("Longitude", 0.0) if w_item else 0.0,
                    "kuliner_pagi": k_pagi_var.get("Nama_Tempat", "N/A") if k_pagi_var else "N/A",
                    "kuliner_pagi_harga": k_pagi_var.get("Estimasi_Harga", 0) if k_pagi_var else 0,
                    "kuliner_pagi_lat": k_pagi_var.get("Latitude", 0.0) if k_pagi_var else 0.0,
                    "kuliner_pagi_lon": k_pagi_var.get("Longitude", 0.0) if k_pagi_var else 0.0,
                    "kuliner": k_item.get("Nama_Tempat", "N/A") if k_item else "N/A",
                    "kuliner_harga": k_item.get("Estimasi_Harga", 0) if k_item else 0,
                    "kuliner_lat": k_item.get("Latitude", 0.0) if k_item else 0.0,
                    "kuliner_lon": k_item.get("Longitude", 0.0) if k_item else 0.0,
                    "kuliner_malam": "N/A",
                    "kuliner_malam_harga": 0,
                    "kuliner_malam_lat": 0,
                    "kuliner_malam_lon": 0,
                    "hotel": "Checkout",
                    "hotel_harga": 0,
                    "hotel_lat": 0.0,
                    "hotel_lon": 0.0
                }]

            # Recalculate legs, distance, and transport cost based on actual coordinates
            recalculate_pkg_legs(pkg_formatted, pkg_formatted["itinerary"], num_persons)

            # Recalculate package totals to ensure 100% mathematical consistency with daily itinerary subtotals
            total_kuliner = 0.0
            itinerary_list = cast(list, pkg_formatted["itinerary"])
            for day in itinerary_list:
                day_dict = cast(dict, day)
                d_num = int(day_dict["day"])
                pagi = float(day_dict.get("kuliner_pagi_harga") or 0.0)
                siang = float(day_dict.get("kuliner_harga") or 0.0)
                malam = float(day_dict.get("kuliner_malam_harga") or 0.0) if d_num <= nights else 0.0
                total_kuliner += (pagi + siang + malam) * float(num_persons)
            pkg_formatted["cost_kuliner"] = total_kuliner

            total_hotel = 0.0
            for day in itinerary_list:
                day_dict = cast(dict, day)
                h_name = day_dict.get("hotel")
                if h_name and h_name != "Checkout":
                    total_hotel += float(day_dict.get("hotel_harga") or 0.0) * float(num_rooms)
            cost_h = total_hotel
            cost_w = float(selected["cost_wisata"])
            cost_k = total_kuliner
            cost_t = float(pkg_formatted["cost_transport"])

            pkg_formatted["cost_akomodasi"] = cost_h
            pkg_formatted["cost_hotel"] = cost_h
            pkg_formatted["cost_kuliner"] = cost_k
            pkg_formatted["total_cost"] = cost_h + cost_w + cost_k + cost_t

            packages_for_option.append(pkg_formatted)

        # Enforce uniqueness of option combinations
        sorted_pkgs = sorted(packages_for_option, key=lambda x: x.get("cluster_id", 0))
        sig = tuple((p.get("hotel_nama_real", ""), p.get("wisata_nama", ""), p.get("kuliner_nama", "")) for p in sorted_pkgs)
        
        if sig not in seen_signatures:
            seen_signatures.add(sig)
            options_list.append({
                "option_index": len(options_list) + 1,
                "packages": sorted_pkgs,
                "clustered_items": {
                    "hotel": {i: candidates["hotel"][i] for i in range(3)},
                    "wisata": {i: candidates["wisata"][i] for i in range(3)},
                    "kuliner": {i: candidates["kuliner"][i] for i in range(3)}
                }
            })

    if verbose and options_list:
        rep_packages = cast(list, options_list[0]["packages"])
        print(f"\n  HASIL FLEXIBLE EXPLORATION OPSI 1:")
        for pkg in rep_packages:
            print(f"    • {pkg['kategori'].upper():10}: Rp {pkg['total_cost']:,.0f}")
            print(f"      H: {pkg['hotel_nama']} | W: {pkg['wisata_nama']} | K: {pkg['kuliner_nama']}")
            
    global LAST_CLUSTERED
    LAST_CLUSTERED = {
        "hotel": clustered.get("hotel", {}).get("df") if "hotel" in clustered else None,
        "wisata": clustered.get("wisata", {}).get("df") if "wisata" in clustered else None,
        "kuliner": clustered.get("kuliner", {}).get("df") if "kuliner" in clustered else None,
    }

    return options_list

# ============================================================
# 5. GENERATE PAKET DESTINASI (DESTINATION-FIRST WORKFLOW)
# ============================================================
def generate_destination_first_packages(locked_wisata_id, num_persons, duration, datasets,
                                        total_budget=None, api_key=None, verbose=True,
                                        transport_mode=None, hotel_mode='same'):
    """
    Alur Skenario Alternatif 2: Destination-First.
    Digunakan ketika pengguna sudah mengunci 1 destinasi wisata pasti.
    Kondisi A: Tanpa input budget (menggunakan persentil offline).
    Kondisi B: Dengan input budget (mengurangi budget tiket dulu).
    """
    # Cast parameters to prevent type/comparison errors
    duration = int(float(duration))
    num_persons = int(float(num_persons))
    if total_budget is not None:
        total_budget = float(total_budget)

    anchor_hotel = None
    anchor_kul = None
    ratios = RATIO_SCHEMES[DEFAULT_RATIO_SCHEME]

    if api_key is None:
        api_key = GOOGLE_MAPS_API_KEY

    # Cari destinasi wisata yg dikunci (Copy dan klaster untuk menghindari KeyError pada Cluster)
    df_wisata = datasets["wisata"].copy()
    prices_wis = df_wisata["Estimasi_Harga"].values
    try:
        res_wis = run_percentile_fcm(prices_wis)
        df_wisata["Cluster"] = res_wis["labels"]
        u_matrix = res_wis["u"]
        df_wisata["Membership_Degree"] = [float(u_matrix[res_wis["labels"][j], j]) for j in range(len(prices_wis))]
        df_wisata["Kategori"] = df_wisata["Cluster"].map(CLUSTER_LABELS)
    except Exception as e:
        df_wisata["Cluster"] = 0
        df_wisata["Membership_Degree"] = 1.0
        df_wisata["Kategori"] = "Hemat"

    # Konversi locked_wisata_id ke tipe data yang sesuai dengan kolom Id_Tempat
    try:
        if np.issubdtype(df_wisata["Id_Tempat"].dtype, np.integer):
            locked_wisata_id = int(float(locked_wisata_id))
        elif np.issubdtype(df_wisata["Id_Tempat"].dtype, np.floating):
            locked_wisata_id = float(locked_wisata_id)
    except Exception:
        pass

    locked_wisata_arr = df_wisata[df_wisata["Id_Tempat"] == locked_wisata_id]
    
    if locked_wisata_arr.empty:
        if verbose:
            print(f"  ⚠ Destinasi Wisata dengan ID '{locked_wisata_id}' tidak ditemukan!")
        return []
    
    best_wisata = locked_wisata_arr.iloc[0].to_dict()
    harga_tiket = best_wisata["Estimasi_Harga"]
    tiket_total = harga_tiket * num_persons

    if verbose:
        print(f"\n{'='*60}")
        print(f"  DESTINATION-FIRST WORKFLOW")
        print(f"{'='*60}")
        print(f"  Destinasi Kunci: {best_wisata['Nama_Tempat']}")
        print(f"  Harga Tiket    : Rp {harga_tiket:,.0f} × {num_persons} orang = Rp {tiket_total:,.0f}")
        print(f"  Peserta       : {num_persons} orang")
        print(f"  Durasi        : {duration} hari")
        
        if total_budget:
            print(f"  Total Budget  : Rp {total_budget:,.0f}")
        else:
            print(f"  Total Budget  : Tanpa Batasan (Kondisi A)")
        print()

    clustered = {}

    if total_budget is None:
        # Kondisi A: Offline FCM
        for cat_name in ["hotel", "kuliner"]:
            df = datasets[cat_name]
            prices = df["Estimasi_Harga"].values
            res = run_percentile_fcm(prices)
            df_c = df.copy()
            df_c["Cluster"] = res["labels"]
            u_matrix = res["u"]
            df_c["Membership_Degree"] = [float(u_matrix[res["labels"][j], j]) for j in range(len(prices))]
            df_c["Kategori"] = df_c["Cluster"].map(CLUSTER_LABELS)
            clustered[cat_name] = {"df": df_c, "cntr": res["cntr"]}
    else:
        # Kondisi B: Real-Time FCM
        sisa_budget = total_budget - tiket_total
        if sisa_budget <= 0:
            if verbose:
                print(f"  ⚠ Budget Rp {total_budget:,.0f} tidak cukup bahkan hanya untuk tiket wisata!")
            return []
            
        # Asumsi sisa budget dibagi proporsional (Hotel vs Kuliner)
        num_rooms = math.ceil(num_persons / MAX_PERSONS_PER_ROOM)
        nights = duration - 1
        
        if duration == 1:
            budget_hotel_total = sisa_budget * (40/85)
            budget_kul_total = sisa_budget * (20/45)
            
            anchor_hotel = budget_hotel_total / (1 * num_rooms)
            anchor_kul = budget_kul_total / (num_persons * MEALS_PER_DAY * duration)
        else:
            budget_hotel_total = sisa_budget * (40/85)
            budget_kul_total = sisa_budget * (20/85)
            
            anchor_hotel = budget_hotel_total / np.fmax(nights * num_rooms, 1.0)
            anchor_kul = budget_kul_total / (num_persons * MEALS_PER_DAY * duration)
        
        for cat_name, anchor in [("hotel", anchor_hotel), ("kuliner", anchor_kul)]:
            df = datasets[cat_name]
            prices = df["Estimasi_Harga"].values
            res = run_budget_anchored_fcm(prices, anchor)
            df_c = df.copy()
            df_c["Cluster"] = res["labels"]
            u_matrix = res["u"]
            df_c["Membership_Degree"] = [float(u_matrix[res["labels"][j], j]) for j in range(len(prices))]
            df_c["Kategori"] = df_c["Cluster"].map(CLUSTER_LABELS)
            clustered[cat_name] = {"df": df_c, "cntr": res["cntr"]}

    candidates = {
        "hotel": {i: [] for i in range(3)},
        "kuliner": {i: [] for i in range(3)},
        "wisata": {i: [] for i in range(3)}
    }

    # Saring kandidat per kategori dan per klaster kelas (0=Hemat, 1=Balanced, 2=Premium)
    for key in ["hotel", "kuliner"]:
        df = clustered[key]["df"]
        cntrs = clustered[key]["cntr"]
        
        # Calculate target prices subjective to budget if budget exists
        if total_budget is not None:
            anchor = anchor_hotel if key == "hotel" else anchor_kul
            ratios = RATIO_SCHEMES["B"]
        else:
            anchor = None
            
        for i in range(3):
            items_in_c = df[df["Cluster"] == i].copy()
            target_price = anchor * ratios[i] if anchor is not None else cntrs[i]
            
            if items_in_c.empty:
                df["distance_to_target"] = (df["Estimasi_Harga"] - target_price).abs()
                best_items = df.nsmallest(15, "distance_to_target")
            else:
                items_in_c["distance_to_target"] = (items_in_c["Estimasi_Harga"] - target_price).abs()
                best_items = items_in_c.nsmallest(15, "distance_to_target")
                
            candidates[key][i] = best_items.to_dict("records")

    for i in range(3):
        wisatas_in_c = df_wisata[df_wisata["Cluster"] == i].copy()
        if wisatas_in_c.empty:
            best_items = df_wisata.head(15)
        else:
            best_items = wisatas_in_c.head(15)
        candidates["wisata"][i] = best_items.to_dict("records")

    package_options = {0: [], 1: [], 2: []}
    max_options_to_show = {0: 15, 1: 15, 2: 15}
    num_rooms = math.ceil(num_persons / MAX_PERSONS_PER_ROOM)
    nights = duration - 1

    for i in range(3):
        hotel_list = candidates["hotel"][i]
        kuliner_list = candidates["kuliner"][i]
        
        valid_combinations = []
        
        for h in hotel_list:
            for k in kuliner_list:
                # A. Hitung Biaya Akomodasi
                if duration > 1:
                    if hotel_mode == 'split' and len(hotel_list) > 1:
                        hotel_seq = [hotel_list[(hotel_list.index(h) + n) % len(hotel_list)] for n in range(nights)]
                        cost_hotel = sum(ht["Estimasi_Harga"] for ht in hotel_seq) * num_rooms
                    else:
                        cost_hotel = h["Estimasi_Harga"] * nights * num_rooms
                else:
                    cost_hotel = 0
                    
                # B. Hitung Biaya Wisata
                cost_wisata = best_wisata["Estimasi_Harga"] * num_persons
                
                # C. Cari kuliner pagi, siang, malam dan hitung biaya kuliner
                if duration == 1:
                    k_pagi = find_k_pagi(k, kuliner_list, best_wisata["Latitude"], best_wisata["Longitude"])
                    k_malam = None
                    k_pagi_est = k_pagi["Estimasi_Harga"] if (k_pagi and "Estimasi_Harga" in k_pagi) else 0
                    k_est = k["Estimasi_Harga"] if (k and "Estimasi_Harga" in k) else 0
                    cost_kuliner = (k_pagi_est + k_est) * num_persons
                else:
                    k_pagi = find_k_pagi(k, kuliner_list, h["Latitude"], h["Longitude"])
                    k_malam = find_k_malam(k, k_pagi, kuliner_list, h["Latitude"], h["Longitude"])
                    k_pagi_est = k_pagi["Estimasi_Harga"] if (k_pagi and "Estimasi_Harga" in k_pagi) else 0
                    k_est = k["Estimasi_Harga"] if (k and "Estimasi_Harga" in k) else 0
                    k_malam_est = k_malam["Estimasi_Harga"] if (k_malam and "Estimasi_Harga" in k_malam) else 0
                    cost_kuliner = ((duration - 1) * (k_pagi_est + k_est + k_malam_est) + (k_pagi_est + k_est)) * num_persons
                
                # D. Jarak Spasial Rute Custom (Haversine)
                if duration == 1:
                    k_pagi_lat = k_pagi["Latitude"] if (k_pagi and "Latitude" in k_pagi) else best_wisata["Latitude"]
                    k_pagi_lon = k_pagi["Longitude"] if (k_pagi and "Longitude" in k_pagi) else best_wisata["Longitude"]
                    k_lat = k["Latitude"] if (k and "Latitude" in k) else best_wisata["Latitude"]
                    k_lon = k["Longitude"] if (k and "Longitude" in k) else best_wisata["Longitude"]
                    # Rute ODT (2 Segmen): Makan Pagi -> Wisata -> Makan Siang
                    d1 = haversine_road_distance(k_pagi_lat, k_pagi_lon, best_wisata["Latitude"], best_wisata["Longitude"])
                    d2 = haversine_road_distance(best_wisata["Latitude"], best_wisata["Longitude"], k_lat, k_lon)
                    total_dist = d1 + d2
                else:
                    # Hari 1 (5 Segmen): Makan Pagi -> Wisata -> Makan Siang -> Hotel -> Makan Malam -> Hotel
                    k_malam_lat = k_malam["Latitude"] if (k_malam and "Latitude" in k_malam) else h["Latitude"]
                    k_malam_lon = k_malam["Longitude"] if (k_malam and "Longitude" in k_malam) else h["Longitude"]
                    k_pagi_lat = k_pagi["Latitude"] if (k_pagi and "Latitude" in k_pagi) else h["Latitude"]
                    k_pagi_lon = k_pagi["Longitude"] if (k_pagi and "Longitude" in k_pagi) else h["Longitude"]
                    k_lat = k["Latitude"] if (k and "Latitude" in k) else h["Latitude"]
                    k_lon = k["Longitude"] if (k and "Longitude" in k) else h["Longitude"]

                    d1_1 = haversine_road_distance(k_pagi_lat, k_pagi_lon, best_wisata["Latitude"], best_wisata["Longitude"])
                    d1_2 = haversine_road_distance(best_wisata["Latitude"], best_wisata["Longitude"], k_lat, k_lon)
                    d1_3 = haversine_road_distance(k_lat, k_lon, h["Latitude"], h["Longitude"])
                    d1_4 = haversine_road_distance(h["Latitude"], h["Longitude"], k_malam_lat, k_malam_lon)
                    d1_5 = haversine_road_distance(k_malam_lat, k_malam_lon, h["Latitude"], h["Longitude"])
                    dist_day1 = d1_1 + d1_2 + d1_3 + d1_4 + d1_5
                    
                    # Hari Terakhir (3 Segmen): Hotel -> Makan Pagi -> Wisata -> Makan Siang
                    dc1 = haversine_road_distance(h["Latitude"], h["Longitude"], k_pagi_lat, k_pagi_lon)
                    dc2 = haversine_road_distance(k_pagi_lat, k_pagi_lon, best_wisata["Latitude"], best_wisata["Longitude"])
                    dc3 = haversine_road_distance(best_wisata["Latitude"], best_wisata["Longitude"], k_lat, k_lon)
                    dist_checkout = dc1 + dc2 + dc3
                    
                    if duration == 2:
                        total_dist = dist_day1 + dist_checkout
                    else:
                        # Hari Tengah (6 Segmen): Hotel -> Makan Pagi -> Wisata -> Makan Siang -> Hotel -> Makan Malam -> Hotel
                        dm1 = haversine_road_distance(h["Latitude"], h["Longitude"], k_pagi_lat, k_pagi_lon)
                        dm2 = haversine_road_distance(k_pagi_lat, k_pagi_lon, best_wisata["Latitude"], best_wisata["Longitude"])
                        dm3 = haversine_road_distance(best_wisata["Latitude"], best_wisata["Longitude"], k_lat, k_lon)
                        dm4 = haversine_road_distance(k_lat, k_lon, h["Latitude"], h["Longitude"])
                        dm5 = haversine_road_distance(h["Latitude"], h["Longitude"], k_malam_lat, k_malam_lon)
                        dm6 = haversine_road_distance(k_malam_lat, k_malam_lon, h["Latitude"], h["Longitude"])
                        dist_middle = dm1 + dm2 + dm3 + dm4 + dm5 + dm6
                        total_dist = dist_day1 + (duration - 2) * dist_middle + dist_checkout
                    
                # E. Tarif Transportasi Flat Gojek
                if num_persons <= 1:
                    rate_per_km = 2250
                    veh_desc = "Motor GoRide (1 orang)"
                elif num_persons <= 4:
                    rate_per_km = 5150
                    veh_desc = "Mobil GoCar Standard (2-4 orang)"
                else:
                    rate_per_km = 6000
                    veh_desc = "Mobil GoCar XL (5-6 orang)"
                    
                cost_transport = round(total_dist * rate_per_km)
                
                # F. Total Biaya Akumulatif
                total_pkg_cost = cost_hotel + cost_wisata + cost_kuliner + cost_transport
                
                # G. Sensor Budget
                if total_budget is None or total_pkg_cost <= total_budget:
                    valid_combinations.append({
                        "hotel": h,
                        "wisata": best_wisata,
                        "kuliner": k,
                        "kuliner_pagi": k_pagi,
                        "kuliner_malam": k_malam,
                        "cost_hotel": cost_hotel,
                        "cost_wisata": cost_wisata,
                        "cost_kuliner": cost_kuliner,
                        "cost_transport": cost_transport,
                        "transport_desc": veh_desc,
                        "total_dist": total_dist,
                        "total_cost": total_pkg_cost
                    })

        # --- Perangkingan Dinamis Sesuai Profil Kelas ---
        def get_val(item, key, default=0.0):
            val = item.get(key, default)
            return default if (pd.isna(val) or val is None) else float(val)

        if i == 0:
            # Hemat: Jarak spasial terkecil
            valid_combinations = sorted(valid_combinations, key=lambda x: (x.get("selisih", 0) < 0, x["total_dist"]))
        elif i == 1:
            # Balanced: Hybrid rating + jarak
            valid_combinations = sorted(
                valid_combinations,
                key=lambda x: (x.get("selisih", 0) < 0, -get_val(x["wisata"], "Rating") * 10 - get_val(x["kuliner"], "Rating") * 2 + x["total_dist"] / 10.0)
            )
        else:
            # Premium: Rating + kemewahan hotel (harga tinggi)
            valid_combinations = sorted(
                valid_combinations,
                key=lambda x: (x.get("selisih", 0) < 0, -get_val(x["wisata"], "Rating"), -get_val(x["hotel"], "Estimasi_Harga"), x["total_dist"])
            )

        # Fallback jika kosong (diselaraskan eksak dengan uji_gabungan.py)
        if total_budget is not None and not valid_combinations:
            min_cost_comb = None
            min_cost = float('inf')
            for h in hotel_list[:5]:
                for k in kuliner_list[:5]:
                    if duration > 1:
                        if hotel_mode == 'split' and len(hotel_list) > 1:
                            hotel_seq = [hotel_list[(hotel_list.index(h) + n) % len(hotel_list)] for n in range(nights)]
                            cost_hotel = sum(ht["Estimasi_Harga"] for ht in hotel_seq) * num_rooms
                        else:
                            cost_hotel = h["Estimasi_Harga"] * nights * num_rooms
                    else:
                        cost_hotel = 0
                    cost_wisata = best_wisata["Estimasi_Harga"] * num_persons
                    
                    # C. Cari kuliner pagi, siang, malam dan hitung biaya kuliner
                    if duration == 1:
                        k_pagi = find_k_pagi(k, kuliner_list, best_wisata["Latitude"], best_wisata["Longitude"])
                        k_malam = None
                        k_pagi_est = k_pagi["Estimasi_Harga"] if (k_pagi and "Estimasi_Harga" in k_pagi) else 0
                        k_est = k["Estimasi_Harga"] if (k and "Estimasi_Harga" in k) else 0
                        cost_kuliner = (k_pagi_est + k_est) * num_persons
                    else:
                        k_pagi = find_k_pagi(k, kuliner_list, h["Latitude"], h["Longitude"])
                        k_malam = find_k_malam(k, k_pagi, kuliner_list, h["Latitude"], h["Longitude"])
                        k_pagi_est = k_pagi["Estimasi_Harga"] if (k_pagi and "Estimasi_Harga" in k_pagi) else 0
                        k_est = k["Estimasi_Harga"] if (k and "Estimasi_Harga" in k) else 0
                        k_malam_est = k_malam["Estimasi_Harga"] if (k_malam and "Estimasi_Harga" in k_malam) else 0
                        cost_kuliner = ((duration - 1) * (k_pagi_est + k_est + k_malam_est) + (k_pagi_est + k_est)) * num_persons
                    
                    if duration == 1:
                        k_pagi_lat = k_pagi["Latitude"] if (k_pagi and "Latitude" in k_pagi) else best_wisata["Latitude"]
                        k_pagi_lon = k_pagi["Longitude"] if (k_pagi and "Longitude" in k_pagi) else best_wisata["Longitude"]
                        k_lat = k["Latitude"] if (k and "Latitude" in k) else best_wisata["Latitude"]
                        k_lon = k["Longitude"] if (k and "Longitude" in k) else best_wisata["Longitude"]
                        # Rute ODT (2 Segmen): Makan Pagi -> Wisata -> Makan Siang
                        d1 = haversine_road_distance(k_pagi_lat, k_pagi_lon, best_wisata["Latitude"], best_wisata["Longitude"])
                        d2 = haversine_road_distance(best_wisata["Latitude"], best_wisata["Longitude"], k_lat, k_lon)
                        total_dist = d1 + d2
                    else:
                        # Hari 1 (5 Segmen): Makan Pagi -> Wisata -> Makan Siang -> Hotel -> Makan Malam -> Hotel
                        k_malam_lat = k_malam["Latitude"] if (k_malam and "Latitude" in k_malam) else h["Latitude"]
                        k_malam_lon = k_malam["Longitude"] if (k_malam and "Longitude" in k_malam) else h["Longitude"]
                        k_pagi_lat = k_pagi["Latitude"] if (k_pagi and "Latitude" in k_pagi) else h["Latitude"]
                        k_pagi_lon = k_pagi["Longitude"] if (k_pagi and "Longitude" in k_pagi) else h["Longitude"]
                        k_lat = k["Latitude"] if (k and "Latitude" in k) else h["Latitude"]
                        k_lon = k["Longitude"] if (k and "Longitude" in k) else h["Longitude"]

                        d1_1 = haversine_road_distance(k_pagi_lat, k_pagi_lon, best_wisata["Latitude"], best_wisata["Longitude"])
                        d1_2 = haversine_road_distance(best_wisata["Latitude"], best_wisata["Longitude"], k_lat, k_lon)
                        d1_3 = haversine_road_distance(k_lat, k_lon, h["Latitude"], h["Longitude"])
                        d1_4 = haversine_road_distance(h["Latitude"], h["Longitude"], k_malam_lat, k_malam_lon)
                        d1_5 = haversine_road_distance(k_malam_lat, k_malam_lon, h["Latitude"], h["Longitude"])
                        dist_day1 = d1_1 + d1_2 + d1_3 + d1_4 + d1_5
                        
                        # Hari Terakhir (3 Segmen): Hotel -> Makan Pagi -> Wisata -> Makan Siang
                        dc1 = haversine_road_distance(h["Latitude"], h["Longitude"], k_pagi_lat, k_pagi_lon)
                        dc2 = haversine_road_distance(k_pagi_lat, k_pagi_lon, best_wisata["Latitude"], best_wisata["Longitude"])
                        dc3 = haversine_road_distance(best_wisata["Latitude"], best_wisata["Longitude"], k_lat, k_lon)
                        dist_checkout = dc1 + dc2 + dc3
                        
                        if duration == 2:
                            total_dist = dist_day1 + dist_checkout
                        else:
                            # Hari Tengah (6 Segmen): Hotel -> Makan Pagi -> Wisata -> Makan Siang -> Hotel -> Makan Malam -> Hotel
                            dm1 = haversine_road_distance(h["Latitude"], h["Longitude"], k_pagi_lat, k_pagi_lon)
                            dm2 = haversine_road_distance(k_pagi_lat, k_pagi_lon, best_wisata["Latitude"], best_wisata["Longitude"])
                            dm3 = haversine_road_distance(best_wisata["Latitude"], best_wisata["Longitude"], k_lat, k_lon)
                            dm4 = haversine_road_distance(k_lat, k_lon, h["Latitude"], h["Longitude"])
                            dm5 = haversine_road_distance(h["Latitude"], h["Longitude"], k_malam_lat, k_malam_lon)
                            dm6 = haversine_road_distance(k_malam_lat, k_malam_lon, h["Latitude"], h["Longitude"])
                            dist_middle = dm1 + dm2 + dm3 + dm4 + dm5 + dm6
                            total_dist = dist_day1 + (duration - 2) * dist_middle + dist_checkout
                        
                    if num_persons <= 1:
                        rate_per_km = 2250
                        veh_desc = "Motor GoRide (1 orang)"
                    elif num_persons <= 4:
                        rate_per_km = 5150
                        veh_desc = "Mobil GoCar Standard (2-4 orang)"
                    else:
                        rate_per_km = 6000
                        veh_desc = "Mobil GoCar XL (5-6 orang)"
                        
                    cost_transport = round(total_dist * rate_per_km)
                    total_pkg_cost = cost_hotel + cost_wisata + cost_kuliner + cost_transport
                    
                    if total_pkg_cost < min_cost:
                        min_cost = total_pkg_cost
                        min_cost_comb = {
                            "hotel": h,
                            "wisata": best_wisata,
                            "kuliner": k,
                            "kuliner_pagi": k_pagi,
                            "kuliner_malam": k_malam,
                            "cost_hotel": cost_hotel,
                            "cost_wisata": cost_wisata,
                            "cost_kuliner": cost_kuliner,
                            "cost_transport": cost_transport,
                            "transport_desc": veh_desc,
                            "total_dist": total_dist,
                            "total_cost": total_pkg_cost
                        }
            if min_cost_comb:
                valid_combinations.append(min_cost_comb)

        package_options[i] = valid_combinations[:max_options_to_show[i]]

    # --- Pemetaan Ke Tab Opsi Alternatif (Hingga 15 Opsi Unik) ---
    max_opts_avail = max(len(package_options[0]), len(package_options[1]), len(package_options[2]))
    num_options = min(max_opts_avail, 15)
    if num_options < 1:
        num_options = 1

    options_list = []
    seen_signatures = set()
    
    for opt_idx in range(num_options):
        packages_for_option = []
        
        for i, label in CLUSTER_LABELS.items():
            opts = package_options[i]
            if not opts:
                continue
            if opt_idx >= len(opts):
                continue
            selected = opts[opt_idx]
            
            h_item = selected["hotel"]
            w_item = selected["wisata"]
            k_item = selected["kuliner"]
            k_pagi_item = selected["kuliner_pagi"]
            k_malam_item = selected["kuliner_malam"]
            scale_factor = (selected["cost_transport"] / selected["total_dist"]) if selected["total_dist"] > 0 else 0
            
            if duration == 1:
                # ODT (2 Segmen): Makan Pagi -> Wisata -> Makan Siang
                dist1 = haversine_road_distance(k_pagi_item["Latitude"], k_pagi_item["Longitude"], w_item["Latitude"], w_item["Longitude"])
                dist2 = haversine_road_distance(w_item["Latitude"], w_item["Longitude"], k_item["Latitude"], k_item["Longitude"])
                legs_detail = [
                    {
                        "from": "Makan Pagi",
                        "to": "Wisata",
                        "distance_km": round(dist1, 2),
                        "cost": round(dist1 * scale_factor),
                        "vehicle": selected["transport_desc"]
                    },
                    {
                        "from": "Wisata",
                        "to": "Makan Siang",
                        "distance_km": round(dist2, 2),
                        "cost": round(dist2 * scale_factor),
                        "vehicle": selected["transport_desc"]
                    }
                ]
            else:
                legs_detail = []
                for d_num in range(1, duration + 1):
                    day_label = f" (Hari {d_num})"
                    if d_num == duration:
                        # Checkout day (3 Segmen): Hotel -> Makan Pagi -> Wisata -> Makan Siang
                        dc1 = haversine_road_distance(h_item["Latitude"], h_item["Longitude"], k_pagi_item["Latitude"], k_pagi_item["Longitude"])
                        dc2 = haversine_road_distance(k_pagi_item["Latitude"], k_pagi_item["Longitude"], w_item["Latitude"], w_item["Longitude"])
                        dc3 = haversine_road_distance(w_item["Latitude"], w_item["Longitude"], k_item["Latitude"], k_item["Longitude"])
                        legs_detail.extend([
                            {
                                "from": f"Hotel{day_label}",
                                "to": f"Makan Pagi{day_label}",
                                "distance_km": round(dc1, 2),
                                "cost": round(dc1 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Makan Pagi{day_label}",
                                "to": f"Wisata{day_label}",
                                "distance_km": round(dc2, 2),
                                "cost": round(dc2 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Wisata{day_label}",
                                "to": f"Makan Siang{day_label}",
                                "distance_km": round(dc3, 2),
                                "cost": round(dc3 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            }
                        ])
                    elif d_num == 1:
                        # Stay Day 1 (5 Segmen): Makan Pagi -> Wisata -> Makan Siang -> Hotel -> Makan Malam -> Hotel
                        d1_1 = haversine_road_distance(k_pagi_item["Latitude"], k_pagi_item["Longitude"], w_item["Latitude"], w_item["Longitude"])
                        d1_2 = haversine_road_distance(w_item["Latitude"], w_item["Longitude"], k_item["Latitude"], k_item["Longitude"])
                        d1_3 = haversine_road_distance(k_item["Latitude"], k_item["Longitude"], h_item["Latitude"], h_item["Longitude"])
                        d1_4 = haversine_road_distance(h_item["Latitude"], h_item["Longitude"], k_malam_item["Latitude"], k_malam_item["Longitude"])
                        d1_5 = haversine_road_distance(k_malam_item["Latitude"], k_malam_item["Longitude"], h_item["Latitude"], h_item["Longitude"])
                        legs_detail.extend([
                            {
                                "from": f"Makan Pagi{day_label}",
                                "to": f"Wisata{day_label}",
                                "distance_km": round(d1_1, 2),
                                "cost": round(d1_1 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Wisata{day_label}",
                                "to": f"Makan Siang{day_label}",
                                "distance_km": round(d1_2, 2),
                                "cost": round(d1_2 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Makan Siang{day_label}",
                                "to": f"Hotel{day_label}",
                                "distance_km": round(d1_3, 2),
                                "cost": round(d1_3 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Hotel{day_label}",
                                "to": f"Makan Malam{day_label}",
                                "distance_km": round(d1_4, 2),
                                "cost": round(d1_4 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Makan Malam{day_label}",
                                "to": f"Hotel{day_label}",
                                "distance_km": round(d1_5, 2),
                                "cost": round(d1_5 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            }
                        ])
                    else:
                        # Middle Stay Days (6 Segmen): Hotel -> Makan Pagi -> Wisata -> Makan Siang -> Hotel -> Makan Malam -> Hotel
                        dm1 = haversine_road_distance(h_item["Latitude"], h_item["Longitude"], k_pagi_item["Latitude"], k_pagi_item["Longitude"])
                        dm2 = haversine_road_distance(k_pagi_item["Latitude"], k_pagi_item["Longitude"], w_item["Latitude"], w_item["Longitude"])
                        dm3 = haversine_road_distance(w_item["Latitude"], w_item["Longitude"], k_item["Latitude"], k_item["Longitude"])
                        dm4 = haversine_road_distance(k_item["Latitude"], k_item["Longitude"], h_item["Latitude"], h_item["Longitude"])
                        dm5 = haversine_road_distance(h_item["Latitude"], h_item["Longitude"], k_malam_item["Latitude"], k_malam_item["Longitude"])
                        dm6 = haversine_road_distance(k_malam_item["Latitude"], k_malam_item["Longitude"], h_item["Latitude"], h_item["Longitude"])
                        legs_detail.extend([
                            {
                                "from": f"Hotel{day_label}",
                                "to": f"Makan Pagi{day_label}",
                                "distance_km": round(dm1, 2),
                                "cost": round(dm1 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Makan Pagi{day_label}",
                                "to": f"Wisata{day_label}",
                                "distance_km": round(dm2, 2),
                                "cost": round(dm2 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Wisata{day_label}",
                                "to": f"Makan Siang{day_label}",
                                "distance_km": round(dm3, 2),
                                "cost": round(dm3 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Makan Siang{day_label}",
                                "to": f"Hotel{day_label}",
                                "distance_km": round(dm4, 2),
                                "cost": round(dm4 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Hotel{day_label}",
                                "to": f"Makan Malam{day_label}",
                                "distance_km": round(dm5, 2),
                                "cost": round(dm5 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            },
                            {
                                "from": f"Makan Malam{day_label}",
                                "to": f"Hotel{day_label}",
                                "distance_km": round(dm6, 2),
                                "cost": round(dm6 * scale_factor),
                                "vehicle": selected["transport_desc"]
                            }
                        ])
            


            transport_detail = {
                "total_cost": selected["cost_transport"],
                "total_distance_km": round(selected["total_dist"], 2),
                "vehicle": selected["transport_desc"] if "transport_desc" in selected else ("Mobil GoCar" if num_persons > 1 else "Motor GoRide"),
                "legs": legs_detail,
                "source": "Gojek API Flat Rate (Skripsi)"
            }
            
            pkg_formatted: dict[str, Any] = {
                "hotel_nama": h_item.get("Nama_Tempat", "N/A") if duration > 1 else "Tanpa Akomodasi (1 Hari)",
                "hotel_nama_real": h_item.get("Nama_Tempat", "") if duration > 1 else "",
                "hotel_harga": h_item.get("Estimasi_Harga", 0) if duration > 1 else 0,
                "hotel_rating": h_item.get("Rating", 0.0) if duration > 1 else 0.0,
                "hotel_lat": h_item.get("Latitude", 0.0) if duration > 1 else 0.0,
                "hotel_lon": h_item.get("Longitude", 0.0) if duration > 1 else 0.0,
                
                "wisata_nama": w_item.get("Nama_Tempat", "N/A"),
                "wisata_harga": w_item.get("Estimasi_Harga", 0),
                "wisata_rating": w_item.get("Rating", 0.0),
                "wisata_lat": w_item.get("Latitude", 0.0),
                "wisata_lon": w_item.get("Longitude", 0.0),
                
                "kuliner_pagi_nama": k_pagi_item.get("Nama_Tempat", "N/A") if k_pagi_item else "N/A",
                "kuliner_pagi_harga": k_pagi_item.get("Estimasi_Harga", 0) if k_pagi_item else 0,
                "kuliner_pagi_rating": k_pagi_item.get("Rating", 0.0) if k_pagi_item else 0.0,
                "kuliner_pagi_lat": k_pagi_item.get("Latitude", 0.0) if k_pagi_item else 0.0,
                "kuliner_pagi_lon": k_pagi_item.get("Longitude", 0.0) if k_pagi_item else 0.0,
                
                "kuliner_nama": k_item.get("Nama_Tempat", "N/A"),
                "kuliner_harga": k_item.get("Estimasi_Harga", 0),
                "kuliner_rating": k_item.get("Rating", 0.0),
                "kuliner_lat": k_item.get("Latitude", 0.0),
                "kuliner_lon": k_item.get("Longitude", 0.0),
                
                "kuliner_malam_nama": k_malam_item.get("Nama_Tempat", "N/A") if k_malam_item else "N/A",
                "kuliner_malam_harga": k_malam_item.get("Estimasi_Harga", 0) if k_malam_item else 0,
                "kuliner_malam_rating": k_malam_item.get("Rating", 0.0) if k_malam_item else 0.0,
                "kuliner_malam_lat": k_malam_item.get("Latitude", 0.0) if k_malam_item else 0.0,
                "kuliner_malam_lon": k_malam_item.get("Longitude", 0.0) if k_malam_item else 0.0,
                
                "total_cost": float(selected["total_cost"]),
                "cost_hotel": float(selected["cost_hotel"]),
                "cost_akomodasi": float(selected["cost_hotel"]),
                "cost_wisata": float(selected["cost_wisata"]),
                "cost_kuliner": float(selected["cost_kuliner"]),
                "cost_transport": float(selected["cost_transport"]),
                "num_rooms": num_rooms if duration > 1 else 0,
                "num_persons": num_persons,
                "nights": nights if duration > 1 else 0,
                "duration": duration,
                
                "cluster_id": i,
                "kategori": label,
                "transport_detail": transport_detail
            }
            
            # --- RENCANA PERJALANAN HARIAN DINAMIS (DAY-BY-DAY ITINERARY VARIATION) ---
            if duration > 1:
                itinerary = []
                df_wis = df_wisata
                wisatas_in_c = df_wis[df_wis["Cluster"] == i]
                w_list = wisatas_in_c.to_dict("records") if not wisatas_in_c.empty else [best_wisata]
                k_list = candidates["kuliner"][i]
                
                # If hotel mode is split, we also track different hotels
                if hotel_mode == 'split' and len(hotel_list) > 1:
                    h_list = candidates["hotel"][i]
                    h_idx = 0
                    for idx, ht in enumerate(h_list):
                        if ht["Nama_Tempat"] == h_item.get("Nama_Tempat", ""):
                            h_idx = idx
                            break
                    hotel_seq = [h_list[(h_idx + n) % len(h_list)] for n in range(nights)]
                else:
                    hotel_seq = [h_item] * nights

                for d in range(1, duration + 1):
                    if d == 1:
                        w_var = best_wisata
                        k_var = k_item
                    else:
                        w_alts = [x for x in w_list if x.get("Nama_Tempat") != best_wisata.get("Nama_Tempat")]
                        if not w_alts:
                            w_alts = w_list
                        # Sort spatially based on current day's hotel
                        ref_hotel = hotel_seq[d-1] if d <= len(hotel_seq) else hotel_seq[-1]
                        h_lat = ref_hotel.get("Latitude", 0)
                        h_lon = ref_hotel.get("Longitude", 0)
                        w_alts = sorted(w_alts, key=lambda x: haversine_road_distance(h_lat, h_lon, x.get("Latitude", 0), x.get("Longitude", 0)))
                        w_var = w_alts[(d - 2) % len(w_alts)]
                        
                        k_alts = [x for x in k_list if x.get("Nama_Tempat") != k_item.get("Nama_Tempat")]
                        if not k_alts:
                            k_alts = k_list
                        # Sort spatially based on w_var
                        w_lat = w_var.get("Latitude", 0)
                        w_lon = w_var.get("Longitude", 0)
                        k_alts = sorted(k_alts, key=lambda x: haversine_road_distance(w_lat, w_lon, x.get("Latitude", 0), x.get("Longitude", 0)))
                        k_var = k_alts[(d - 2) % len(k_alts)]
                    
                    day_anchor_lat = hotel_seq[d-1].get("Latitude", 0) if d <= nights else w_var.get("Latitude", 0)
                    day_anchor_lon = hotel_seq[d-1].get("Longitude", 0) if d <= nights else w_var.get("Longitude", 0)
                    k_pagi_var = find_k_pagi(k_var, k_list, day_anchor_lat, day_anchor_lon)
                    if d <= nights:
                        k_malam_var = find_k_malam(k_var, k_pagi_var, k_list, day_anchor_lat, day_anchor_lon)
                    else:
                        k_malam_var = None
                    
                    # Hotel for night (d) is hotel_seq[d-1] if d <= nights else "Checkout"
                    if d <= nights:
                        day_hotel_name = hotel_seq[d-1].get("Nama_Tempat", "")
                        day_hotel_harga = hotel_seq[d-1].get("Estimasi_Harga", 0)
                        day_hotel_lat = hotel_seq[d-1].get("Latitude", 0.0)
                        day_hotel_lon = hotel_seq[d-1].get("Longitude", 0.0)
                    else:
                        day_hotel_name = "Checkout"
                        day_hotel_harga = 0
                        day_hotel_lat = 0.0
                        day_hotel_lon = 0.0
                        
                    itinerary.append({
                        "day": d,
                        "wisata": w_var.get("Nama_Tempat", "N/A") if w_var else "N/A",
                        "wisata_harga": w_var.get("Estimasi_Harga", 0) if w_var else 0,
                        "wisata_lat": w_var.get("Latitude", 0.0) if w_var else 0.0,
                        "wisata_lon": w_var.get("Longitude", 0.0) if w_var else 0.0,
                        "kuliner_pagi": k_pagi_var.get("Nama_Tempat", "N/A") if k_pagi_var else "N/A",
                        "kuliner_pagi_harga": k_pagi_var.get("Estimasi_Harga", 0) if k_pagi_var else 0,
                        "kuliner_pagi_lat": k_pagi_var.get("Latitude", 0.0) if k_pagi_var else 0.0,
                        "kuliner_pagi_lon": k_pagi_var.get("Longitude", 0.0) if k_pagi_var else 0.0,
                        "kuliner": k_var.get("Nama_Tempat", "N/A") if k_var else "N/A",
                        "kuliner_harga": k_var.get("Estimasi_Harga", 0) if k_var else 0,
                        "kuliner_lat": k_var.get("Latitude", 0.0) if k_var else 0.0,
                        "kuliner_lon": k_var.get("Longitude", 0.0) if k_var else 0.0,
                        "kuliner_malam": k_malam_var.get("Nama_Tempat", "N/A") if k_malam_var else "N/A",
                        "kuliner_malam_harga": k_malam_var.get("Estimasi_Harga", 0) if k_malam_var else 0,
                        "kuliner_malam_lat": k_malam_var.get("Latitude", 0.0) if k_malam_var else 0.0,
                        "kuliner_malam_lon": k_malam_var.get("Longitude", 0.0) if k_malam_var else 0.0,
                        "hotel": day_hotel_name,
                        "hotel_harga": day_hotel_harga,
                        "hotel_lat": day_hotel_lat,
                        "hotel_lon": day_hotel_lon
                    })
                pkg_formatted["itinerary"] = itinerary
            else:
                k_pagi_var = find_k_pagi(k_item, candidates["kuliner"][i], w_item.get("Latitude", 0), w_item.get("Longitude", 0))
                pkg_formatted["itinerary"] = [{
                    "day": 1,
                    "wisata": w_item.get("Nama_Tempat", "N/A") if w_item else "N/A",
                    "wisata_harga": w_item.get("Estimasi_Harga", 0) if w_item else 0,
                    "wisata_lat": w_item.get("Latitude", 0.0) if w_item else 0.0,
                    "wisata_lon": w_item.get("Longitude", 0.0) if w_item else 0.0,
                    "kuliner_pagi": k_pagi_var.get("Nama_Tempat", "N/A") if k_pagi_var else "N/A",
                    "kuliner_pagi_harga": k_pagi_var.get("Estimasi_Harga", 0) if k_pagi_var else 0,
                    "kuliner_pagi_lat": k_pagi_var.get("Latitude", 0.0) if k_pagi_var else 0.0,
                    "kuliner_pagi_lon": k_pagi_var.get("Longitude", 0.0) if k_pagi_var else 0.0,
                    "kuliner": k_item.get("Nama_Tempat", "N/A") if k_item else "N/A",
                    "kuliner_harga": k_item.get("Estimasi_Harga", 0) if k_item else 0,
                    "kuliner_lat": k_item.get("Latitude", 0.0) if k_item else 0.0,
                    "kuliner_lon": k_item.get("Longitude", 0.0) if k_item else 0.0,
                    "kuliner_malam": "N/A",
                    "kuliner_malam_harga": 0,
                    "kuliner_malam_lat": 0,
                    "kuliner_malam_lon": 0,
                    "hotel": "Checkout",
                    "hotel_harga": 0,
                    "hotel_lat": 0.0,
                    "hotel_lon": 0.0
                }]

            # Recalculate legs, distance, and transport cost based on actual coordinates
            recalculate_pkg_legs(pkg_formatted, pkg_formatted["itinerary"], num_persons)

            # Recalculate package totals to ensure 100% mathematical consistency with daily itinerary subtotals
            total_kuliner = 0.0
            itinerary_list = cast(list, pkg_formatted["itinerary"])
            for day in itinerary_list:
                day_dict = cast(dict, day)
                d_num = int(day_dict["day"])
                pagi = float(day_dict.get("kuliner_pagi_harga") or 0.0)
                siang = float(day_dict.get("kuliner_harga") or 0.0)
                malam = float(day_dict.get("kuliner_malam_harga") or 0.0) if d_num <= nights else 0.0
                total_kuliner += (pagi + siang + malam) * float(num_persons)
            pkg_formatted["cost_kuliner"] = total_kuliner

            total_hotel = 0.0
            for day in itinerary_list:
                day_dict = cast(dict, day)
                h_name = day_dict.get("hotel")
                if h_name and h_name != "Checkout":
                    total_hotel += float(day_dict.get("hotel_harga") or 0.0) * float(num_rooms)
            cost_h = total_hotel
            cost_w = float(selected["cost_wisata"])
            cost_k = total_kuliner
            cost_t = float(pkg_formatted["cost_transport"])

            pkg_formatted["cost_akomodasi"] = cost_h
            pkg_formatted["cost_hotel"] = cost_h
            pkg_formatted["cost_kuliner"] = cost_k
            pkg_formatted["total_cost"] = cost_h + cost_w + cost_k + cost_t

            packages_for_option.append(pkg_formatted)

        # Enforce uniqueness of option combinations
        sorted_pkgs = sorted(packages_for_option, key=lambda x: x.get("cluster_id", 0))
        sig = tuple((p.get("hotel_nama_real", ""), p.get("wisata_nama", ""), p.get("kuliner_nama", "")) for p in sorted_pkgs)
        
        if sig not in seen_signatures:
            seen_signatures.add(sig)
            options_list.append({
                "option_index": len(options_list) + 1,
                "packages": sorted_pkgs,
                "clustered_items": {
                    "hotel": {i: candidates["hotel"][i] for i in range(3)},
                    "wisata": {i: candidates["wisata"][i] for i in range(3)},
                    "kuliner": {i: candidates["kuliner"][i] for i in range(3)}
                }
            })

    if verbose and options_list:
        rep_packages = cast(list, options_list[0]["packages"])
        print(f"\n  HASIL DESTINATION-FIRST OPSI 1:")
        for pkg in rep_packages:
            status = ""
            if total_budget:
                status = "✅" if pkg["total_cost"] <= total_budget else "⚠️ OVER"
            print(f"    • {pkg['kategori'].upper():10}: Rp {pkg['total_cost']:,.0f} {status}")
            print(f"      H: {pkg['hotel_nama']} | K: {pkg['kuliner_nama']}")
            
    global LAST_CLUSTERED
    LAST_CLUSTERED = {
        "hotel": clustered.get("hotel", {}).get("df") if "hotel" in clustered else None,
        "wisata": df_wisata,
        "kuliner": clustered.get("kuliner", {}).get("df") if "kuliner" in clustered else None,
    }

    return options_list


# ============================================================
# 6. EXPORT HASIL REKOMENDASI KE EXCEL
# ============================================================
def export_to_excel_recom(options_list, workflow, budget, persons, duration):
    """
    Mengekspor hasil kombinasi rute rekomendasi (Hemat, Balanced, Premium)
    yang dihasilkan ke dalam berkas Excel (.xlsx) di folder output/hasil-rekomendasi.
    """
    import datetime
    import os
    from config import OUTPUT_DIR
    
    # 1. Definisikan folder output di dalam storage
    out_folder = os.path.join(OUTPUT_DIR, "hasil-rekomendasi")
    os.makedirs(out_folder, exist_ok=True)
    
    # 2. Bangun nama file unik dengan timestamp
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    budget_str = f"{int(budget)}" if budget else "tanpa_budget"
    filename = f"rekomendasi_{workflow}_{timestamp}_b{budget_str}_p{persons}_d{duration}.xlsx"
    filepath = os.path.join(out_folder, filename)
    
    # 3. Flat data hasil kombinasi ke list rows untuk pandas
    rows = []
    for opt in options_list:
        opt_idx = opt["option_index"]
        for pkg in opt["packages"]:
            row_dict = {
                "Workflow": workflow.upper(),
                "Opsi Alternatif": f"Opsi {opt_idx}",
                "Kelas Paket": pkg.get("kategori", "N/A").upper(),
                "Nama Hotel": pkg.get("hotel_nama", "N/A"),
                "Tarif Hotel/Malam": pkg.get("hotel_harga", 0),
                "Nama Wisata": pkg.get("wisata_nama", "N/A"),
                "Harga Tiket Wisata": pkg.get("wisata_harga", 0),
                "Nama Kuliner": pkg.get("kuliner_nama", "N/A"),
                "Harga Porsi Kuliner": pkg.get("kuliner_harga", 0),
                "Jumlah Peserta (Orang)": pkg.get("num_persons", persons),
                "Durasi Perjalanan (Hari)": pkg.get("duration", duration),
                "Jumlah Kamar Hotel": pkg.get("num_rooms", 0),
                "Jumlah Malam Hotel": pkg.get("nights", 0),
                "Biaya Akomodasi": pkg.get("cost_akomodasi", 0),
                "Biaya Wisata": pkg.get("cost_wisata", 0),
                "Biaya Kuliner": pkg.get("cost_kuliner", 0),
                "Biaya Transportasi": pkg.get("cost_transport", 0),
                "Jarak Rute Spasial (Km)": pkg.get("transport_detail", {}).get("total_distance_km", 0),
                "Moda Transportasi": pkg.get("transport_detail", {}).get("legs", [{}])[0].get("vehicle", "N/A"),
                "ESTIMASI TOTAL BIAYA": pkg.get("total_cost", 0),
                "Sisa/Kelebihan Anggaran": (budget - pkg.get("total_cost", 0)) if budget else "N/A"
            }
            
            # Tambahkan harga per hari secara dinamis jika itinerary bervariasi
            itin = pkg.get("itinerary", [])
            if not itin:
                day_total = pkg.get("cost_akomodasi", 0) + pkg.get("cost_wisata", 0) + pkg.get("cost_kuliner", 0) + pkg.get("cost_transport", 0)
                row_dict["Harga Harian (Hari 1)"] = day_total
            else:
                for day in itin:
                    d = day["day"]
                    has_hotel = day.get("hotel") and day.get("hotel") != 'Checkout'
                    hotel_cost = float(day.get("hotel_harga", 0)) * pkg.get("num_rooms", 1) if has_hotel else 0.0
                    wisata_cost = float(day.get("wisata_harga", 0)) * pkg.get("num_persons", persons)
                    kuliner_cost = (float(day.get("kuliner_harga", 0)) + float(day.get("kuliner_malam_harga", 0))) * pkg.get("num_persons", persons)
                    transport_cost = round(pkg.get("cost_transport", 0) / pkg.get("duration", 1))
                    day_subtotal = hotel_cost + wisata_cost + kuliner_cost + transport_cost
                    row_dict[f"Harga Harian (Hari {d})"] = day_subtotal
                    
            rows.append(row_dict)
            
    # 4. Simpan ke Excel menggunakan pandas
    if rows:
        df = pd.DataFrame(rows)
        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name="Rekomendasi Paket", index=False)
            
            global LAST_CLUSTERED
            if LAST_CLUSTERED is not None:
                df_hotel = LAST_CLUSTERED.get("hotel")
                if df_hotel is not None and not df_hotel.empty:
                    df_hotel.to_excel(writer, sheet_name="Klaster Hotel (Kustom)", index=False)
                
                df_wisata = LAST_CLUSTERED.get("wisata")
                if df_wisata is not None and not df_wisata.empty:
                    df_wisata.to_excel(writer, sheet_name="Klaster Wisata (Kustom)", index=False)
                
                df_kuliner = LAST_CLUSTERED.get("kuliner")
                if df_kuliner is not None and not df_kuliner.empty:
                    df_kuliner.to_excel(writer, sheet_name="Klaster Kuliner (Kustom)", index=False)
                    
        print(f"   [Excel Exported with Cluster Sheets] -> {filepath}")

