"""
transport_api.py — Modul Koneksi Google Maps Distance Matrix API
================================================================
Menghitung jarak tempuh riil (driving distance) antar lokasi
dan mengkonversi ke biaya transportasi berdasarkan tarif Gojek.

Jika API key belum tersedia, menggunakan rumus Haversine sebagai fallback.
"""

import math
# pyrefly: ignore [missing-source-for-stubs]
import requests

from config import GOOGLE_MAPS_API_KEY, TRANSPORT_RATES


# ============================================================
# 1. HAVERSINE DISTANCE (FALLBACK)
# ============================================================
def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Menghitung jarak garis lurus antara dua titik koordinat
    menggunakan formula Haversine.

    Args:
        lat1, lon1: koordinat titik asal
        lat2, lon2: koordinat titik tujuan

    Returns:
        float: jarak dalam kilometer
    """
    R = 6371  # Radius bumi dalam km

    lat1_r = math.radians(lat1)
    lat2_r = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (math.sin(dlat / 2) ** 2 +
         math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


# ============================================================
# 2. GOOGLE MAPS DISTANCE MATRIX API
# ============================================================
def get_distance_matrix(origins, destinations, api_key=None):
    """
    Memanggil Google Maps Distance Matrix API untuk mendapatkan
    jarak tempuh riil (driving distance) dan durasi.

    Args:
        origins: list of tuples [(lat, lng), ...]
        destinations: list of tuples [(lat, lng), ...]
        api_key: Google Maps API key

    Returns:
        dict: {
            'distances_km': [[jarak dalam km]],
            'durations_min': [[durasi dalam menit]],
            'status': 'OK' atau error message
        }
    """
    if api_key is None or api_key == "YOUR_API_KEY_HERE":
        return _fallback_distance(origins, destinations)

    # Format koordinat untuk API
    origins_str = "|".join([f"{lat},{lng}" for lat, lng in origins])
    destinations_str = "|".join([f"{lat},{lng}" for lat, lng in destinations])

    url = "https://maps.googleapis.com/maps/api/distancematrix/json"
    params = {
        "origins": origins_str,
        "destinations": destinations_str,
        "mode": "driving",
        "units": "metric",
        "key": api_key,
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        data = response.json()

        if data["status"] != "OK":
            print(f"  ⚠ Google Maps API Error: {data['status']}")
            return _fallback_distance(origins, destinations)

        distances_km = []
        durations_min = []

        for row in data["rows"]:
            dist_row = []
            dur_row = []
            for element in row["elements"]:
                if element["status"] == "OK":
                    dist_row.append(element["distance"]["value"] / 1000)  # meter → km
                    dur_row.append(element["duration"]["value"] / 60)     # detik → menit
                else:
                    dist_row.append(0)
                    dur_row.append(0)
            distances_km.append(dist_row)
            durations_min.append(dur_row)

        return {
            "distances_km": distances_km,
            "durations_min": durations_min,
            "status": "OK",
            "source": "Google Maps API",
        }

    except Exception as e:
        print(f"  ⚠ API Error: {e}. Menggunakan fallback Haversine.")
        return _fallback_distance(origins, destinations)


def _fallback_distance(origins, destinations):
    """
    Fallback menggunakan Haversine saat API tidak tersedia.
    Haversine dikalikan faktor 1.45 untuk estimasi jarak jalan raya.
    """
    ROAD_FACTOR = 1.58 # Estimasi jarak jalan ≈ 1.45x jarak lurus

    distances_km = []
    durations_min = []

    for o_lat, o_lng in origins:
        dist_row = []
        dur_row = []
        for d_lat, d_lng in destinations:
            straight_dist = haversine_distance(o_lat, o_lng, d_lat, d_lng)
            road_dist = straight_dist * ROAD_FACTOR
            # Estimasi durasi: 30 km/jam rata-rata untuk kota
            duration = (road_dist / 30) * 60  # menit
            dist_row.append(round(road_dist, 2))
            dur_row.append(round(duration, 1))
        distances_km.append(dist_row)
        durations_min.append(dur_row)

    return {
        "distances_km": distances_km,
        "durations_min": durations_min,
        "status": "OK",
        "source": "Haversine (fallback, ×1.45)",
    }


# ============================================================
# 3. PILIH TARIF TRANSPORTASI BERDASARKAN JUMLAH ORANG
# ============================================================
def get_transport_rate(num_persons, transport_mode=None):
    """
    Memilih tarif transportasi berdasarkan jumlah peserta atau pilihan kustom.

    Args:
        num_persons: jumlah orang
        transport_mode: jenis kendaraan kustom (GoRide, GoCar_Standard, GoCar_XL)

    Returns:
        dict: info tarif yang sesuai
    """
    if transport_mode:
        mode_lower = str(transport_mode).strip().lower()
        if mode_lower in ["goride", "motor", "ride"]:
            return TRANSPORT_RATES["GoRide"]
        elif mode_lower in ["gocar_standard", "mobil", "standard", "car"]:
            return TRANSPORT_RATES["GoCar_Standard"]
        elif mode_lower in ["gocar_xl", "mobil_xl", "xl"]:
            return TRANSPORT_RATES["GoCar_XL"]

    # Default (otomatis)
    if num_persons <= 1:
        return TRANSPORT_RATES["GoRide"]
    elif num_persons <= 4:
        return TRANSPORT_RATES["GoCar_Standard"]
    else:
        return TRANSPORT_RATES["GoCar_XL"]


# ============================================================
# 4. HITUNG BIAYA TRANSPORTASI
# ============================================================
def calculate_transport_cost(distance_km, num_persons, transport_mode=None):
    """
    Menghitung biaya transportasi berdasarkan jarak, jumlah orang, dan pilihan kendaraan.

    Args:
        distance_km: jarak dalam kilometer
        num_persons: jumlah peserta
        transport_mode: jenis kendaraan kustom

    Returns:
        dict: {
            'cost': biaya transportasi (Rp),
            'distance_km': jarak,
            'rate_per_km': tarif/km,
            'vehicle': jenis kendaraan
        }
    """
    rate_info = get_transport_rate(num_persons, transport_mode)
    cost = distance_km * rate_info["rate_per_km"]

    return {
        "cost": round(cost),
        "distance_km": round(distance_km, 2),
        "rate_per_km": rate_info["rate_per_km"],
        "vehicle": rate_info["description"],
    }


# ============================================================
# 5. HITUNG TOTAL BIAYA TRANSPORTASI RUTE
# ============================================================
def calculate_route_cost(hotel, wisata, kuliner, num_persons,
                         api_key=None, transport_mode=None, duration=None):
    """
    Menghitung total biaya transportasi untuk rute:
    Hotel → Wisata → Kuliner → Hotel

    Args:
        hotel: dict dengan keys 'Latitude', 'Longitude'
        wisata: dict dengan keys 'Latitude', 'Longitude'
        kuliner: dict dengan keys 'Latitude', 'Longitude'
        num_persons: jumlah peserta
        api_key: Google Maps API key
        transport_mode: jenis kendaraan kustom
        duration: durasi liburan (hari)

    Returns:
        dict: {
            'total_cost': total biaya transportasi,
            'total_distance_km': total jarak,
            'legs': detail tiap segmen rute,
            'source': sumber data jarak
        }
    """
    if api_key is None:
        api_key = GOOGLE_MAPS_API_KEY

    # Definisikan segmen rute (jika One Day Trip, gunakan Kuliner sebagai Basecamp)
    if duration == 1:
        legs = [
            {"from": "Kuliner (Basecamp)", "to": "Wisata",
             "origin": (kuliner["Latitude"], kuliner["Longitude"]),
             "dest": (wisata["Latitude"], wisata["Longitude"])},
            {"from": "Wisata", "to": "Kuliner (Basecamp)",
             "origin": (wisata["Latitude"], wisata["Longitude"]),
             "dest": (kuliner["Latitude"], kuliner["Longitude"])},
        ]
    else:
        legs = [
            {"from": "Hotel", "to": "Wisata",
             "origin": (hotel["Latitude"], hotel["Longitude"]),
             "dest": (wisata["Latitude"], wisata["Longitude"])},
            {"from": "Wisata", "to": "Kuliner",
             "origin": (wisata["Latitude"], wisata["Longitude"]),
             "dest": (kuliner["Latitude"], kuliner["Longitude"])},
            {"from": "Kuliner", "to": "Hotel",
             "origin": (kuliner["Latitude"], kuliner["Longitude"]),
             "dest": (hotel["Latitude"], hotel["Longitude"])},
        ]

    total_distance = 0
    total_cost = 0
    legs_detail = []
    source = ""

    for leg in legs:
        result = get_distance_matrix(
            origins=[leg["origin"]],
            destinations=[leg["dest"]],
            api_key=api_key,
        )
        source = result["source"]
        dist = result["distances_km"][0][0]
        transport = calculate_transport_cost(dist, num_persons, transport_mode)

        leg_info = {
            "from": leg["from"],
            "to": leg["to"],
            "distance_km": dist,
            "cost": transport["cost"],
            "vehicle": transport["vehicle"],
        }
        legs_detail.append(leg_info)
        total_distance += dist  # type: ignore
        total_cost += transport["cost"]  # type: ignore

    return {
        "total_cost": round(total_cost),
        "total_distance_km": round(total_distance, 2),
        "legs": legs_detail,
        "source": source,
    }
