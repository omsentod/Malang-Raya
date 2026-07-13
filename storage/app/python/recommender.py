

import math
from typing import cast, Any
# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-source-for-stubs]
import pandas as pd
import hashlib

from config import (
    GOOGLE_MAPS_API_KEY, CLUSTER_LABELS,
    MAX_PACKAGES_DISPLAY, MEALS_PER_DAY, MAX_PERSONS_PER_ROOM,
    DEFAULT_RATIO_SCHEME, RATIO_SCHEMES,
    get_cluster_labels, get_ratio_scheme,
)
from fcm_clustering import run_budget_anchored_fcm, run_percentile_fcm, find_best_c_for_budget, find_best_c_offline, run_fcm
from transport_api import calculate_route_cost, haversine_distance, get_osrm_route_distance

import matplotlib
import matplotlib.pyplot as plt

def show_recommendation_scatter(clustered, options_list, workflow_name="Workflow"):
    """
    Displays a matplotlib scatter plot showing the spatial distribution (Longitude vs Latitude).
    Plots all items from the dataset that belong to the clusters actively used in the recommendations.
    Routes are removed, and 6 base colors (Hemat, Premium) are used.
    """
    if not options_list or not clustered:
        return
        
    try:
        import sys
        import numpy as np
        import matplotlib.pyplot as plt
        
        # Determine active clusters and selected places per category based on recommendation results
        active_clusters = {'hotel': set(), 'wisata': set(), 'kuliner': set()}
        selected_places = {'hotel': set(), 'wisata': set(), 'kuliner': set()}
        
        # 6 Base Colors (Hotel/Wisata/Kuliner) x (Hemat/Premium) + Balanced fallback
        base_colors = {
            'hotel': {'hemat': '#6baed6', 'balanced': '#3182bd', 'premium': '#08519c', 'mewah': '#08306b', 'default': '#3182bd'},
            'wisata': {'hemat': '#74c476', 'balanced': '#31a354', 'premium': '#006d2c', 'mewah': '#00441b', 'default': '#31a354'},
            'kuliner': {'hemat': '#fb6a4a', 'balanced': '#de2d26', 'premium': '#a50f15', 'mewah': '#67000d', 'default': '#de2d26'}
        }
        
        def get_cluster_label(cat, name):
            if cat in clustered and 'df' in clustered[cat]:
                df = clustered[cat]['df']
                match = df[df['Nama_Tempat'] == name]
                if not match.empty:
                    if 'Kategori' in df.columns:
                        return match.iloc[0]['Kategori']
                    elif 'Cluster' in df.columns:
                        c_id = int(match.iloc[0]['Cluster'])
                        # Try to get labels from options_list[0] if available
                        if options_list and 'cluster_labels' in options_list[0]:
                            labels = options_list[0]['cluster_labels']
                            if c_id < len(labels):
                                return labels[c_id]
                        return f"Cluster {c_id}"
            return None

        # Scan all options to see which clusters are "masuk" (included) and collect selected names
        for opt in options_list:
            for pkg in opt.get('packages', []):
                # We check the names of the places and add their clusters to active_clusters
                places = [
                    ('wisata', pkg.get('wisata_nama')),
                    ('kuliner', pkg.get('kuliner_pagi_nama')),
                    ('kuliner', pkg.get('kuliner_nama')),
                    ('kuliner', pkg.get('kuliner_malam_nama')),
                    ('hotel', pkg.get('hotel_nama_real') or pkg.get('hotel_nama'))
                ]
                for itin in pkg.get('itinerary', []):
                    places.extend([
                        ('wisata', itin.get('wisata_nama')),
                        ('kuliner', itin.get('kuliner_pagi_nama')),
                        ('kuliner', itin.get('kuliner_nama')),
                        ('kuliner', itin.get('kuliner_malam_nama')),
                        ('hotel', itin.get('hotel_nama_real') or itin.get('hotel_nama'))
                    ])
                
                for cat, name in places:
                    if not name or name == 'N/A': continue
                    if ' & ' in name:
                        for sub_name in name.split(' & '):
                            sub_name_clean = sub_name.strip()
                            selected_places[cat].add(sub_name_clean)
                            lbl = get_cluster_label(cat, sub_name_clean)
                            if lbl: active_clusters[cat].add(lbl)
                    else:
                        selected_places[cat].add(name)
                        lbl = get_cluster_label(cat, name)
                        if lbl: active_clusters[cat].add(lbl)
        
        is_api = '--format' in sys.argv and 'json' in sys.argv

        # ==========================================
        # 1. WINDOW 1: HIGHLIGHT & BLUR VERSION
        # ==========================================
        fig1, ax1 = plt.subplots(figsize=(14, 8))
        fig1.subplots_adjust(right=0.75) 
        ax1.set_title(f"Peta Sebaran Spasial (Highlight & Faded Candidates) - {workflow_name}", fontsize=14, fontweight='bold')
        ax1.set_xlabel("Longitude", fontsize=12)
        ax1.set_ylabel("Latitude", fontsize=12)
        
        # Pass 1: Unselected background items (low opacity)
        for cat, cat_data in clustered.items():
            if 'df' not in cat_data: continue
            df = cat_data['df']
            marker = 's' if cat == 'hotel' else ('^' if cat == 'wisata' else 'D')
            
            for _, row in df.iterrows():
                name = row.get('Nama_Tempat')
                lat = row.get('Latitude', 0)
                lon = row.get('Longitude', 0)
                if not name or pd.isna(lat) or pd.isna(lon) or (lat==0 and lon==0): continue
                
                lbl = get_cluster_label(cat, name)
                if not lbl or lbl not in active_clusters[cat]: 
                    continue
                
                # Check if it is selected
                if name in selected_places[cat]:
                    continue  # Skip for Pass 1, we will plot it in Pass 2
                
                lbl_lower = str(lbl).lower()
                shade = 'default'
                if 'hemat' in lbl_lower: shade = 'hemat'
                elif 'balanced' in lbl_lower or 'menengah' in lbl_lower: shade = 'balanced'
                elif 'premium' in lbl_lower: shade = 'premium'
                elif 'mewah' in lbl_lower: shade = 'mewah'
                
                c = base_colors.get(cat, {}).get(shade, 'gray')
                if c == 'gray': c = base_colors.get(cat, {}).get('default', 'gray')
                
                ax1.scatter(lon, lat, s=50, c=c, edgecolors='white', linewidths=0.3, marker=marker, 
                            alpha=0.15, zorder=3)
        
        # Pass 2: Selected items (solid opacity, on top, with black border)
        plotted_labels1 = set()
        for cat, cat_data in clustered.items():
            if 'df' not in cat_data: continue
            df = cat_data['df']
            marker = 's' if cat == 'hotel' else ('^' if cat == 'wisata' else 'D')
            
            for _, row in df.iterrows():
                name = row.get('Nama_Tempat')
                lat = row.get('Latitude', 0)
                lon = row.get('Longitude', 0)
                if not name or pd.isna(lat) or pd.isna(lon) or (lat==0 and lon==0): continue
                
                # Must be a selected place
                if name not in selected_places[cat]:
                    continue
                
                lbl = get_cluster_label(cat, name)
                if not lbl: continue
                
                lbl_lower = str(lbl).lower()
                shade = 'default'
                if 'hemat' in lbl_lower: shade = 'hemat'
                elif 'balanced' in lbl_lower or 'menengah' in lbl_lower: shade = 'balanced'
                elif 'premium' in lbl_lower: shade = 'premium'
                elif 'mewah' in lbl_lower: shade = 'mewah'
                
                c = base_colors.get(cat, {}).get(shade, 'gray')
                if c == 'gray': c = base_colors.get(cat, {}).get('default', 'gray')
                
                legend_lbl = f"{cat.capitalize()} ({lbl})"
                
                if legend_lbl not in plotted_labels1:
                    plotted_labels1.add(legend_lbl)
                    ax1.scatter(lon, lat, s=160, c=c, edgecolors='black', linewidths=1.5, marker=marker, 
                                alpha=1.0, label=legend_lbl, zorder=10)
                else:
                    ax1.scatter(lon, lat, s=160, c=c, edgecolors='black', linewidths=1.5, marker=marker, 
                                alpha=1.0, zorder=10)
                               
        ax1.legend(loc='upper left', bbox_to_anchor=(1.02, 1.0), title="Keterangan")
        ax1.grid(True, linestyle=':', alpha=0.4)
        
        info_text1 = (
            "Sebaran Spasial Item Rekomendasi\n"
            "• Titik Tebal (Black Border) = Terpilih\n"
            "• Titik Pudar (Alpha 15%) = Kandidat\n\n"
            "Bentuk:\n"
            "■ Kotak = Hotel\n"
            "▲ Segitiga = Wisata\n"
            "◆ Belah Ketupat = Kuliner"
        )
        props = dict(boxstyle='round', facecolor='wheat', alpha=0.8)
        ax1.text(1.02, 0.02, info_text1, transform=ax1.transAxes, fontsize=10, verticalalignment='bottom', bbox=props, zorder=10)
        
        # Show Fig 1 (Blocks until Window 1 is closed)
        if is_api:
            plt.close(fig1)
        else:
            plt.show()
            
        # ==========================================
        # 2. WINDOW 2: ALL DESTINATIONS (NO BLUR, HIGHLIGHTED)
        # ==========================================
        fig2, ax2 = plt.subplots(figsize=(14, 8))
        fig2.subplots_adjust(right=0.75) 
        ax2.set_title(f"Peta Sebaran Spasial (Semua Destinasi Tanpa Blur) - {workflow_name}", fontsize=14, fontweight='bold')
        ax2.set_xlabel("Longitude", fontsize=12)
        ax2.set_ylabel("Latitude", fontsize=12)
        
        # Pass 1: Unselected items (normal opacity, e.g., alpha=0.75, s=90, no black border)
        for cat, cat_data in clustered.items():
            if 'df' not in cat_data: continue
            df = cat_data['df']
            marker = 's' if cat == 'hotel' else ('^' if cat == 'wisata' else 'D')
            
            for _, row in df.iterrows():
                name = row.get('Nama_Tempat')
                lat = row.get('Latitude', 0)
                lon = row.get('Longitude', 0)
                if not name or pd.isna(lat) or pd.isna(lon) or (lat==0 and lon==0): continue
                
                lbl = get_cluster_label(cat, name)
                if not lbl or lbl not in active_clusters[cat]: 
                    continue
                
                # Check if it is selected
                if name in selected_places[cat]:
                    continue  # Selected plotted on top in Pass 2
                
                lbl_lower = str(lbl).lower()
                shade = 'default'
                if 'hemat' in lbl_lower: shade = 'hemat'
                elif 'balanced' in lbl_lower or 'menengah' in lbl_lower: shade = 'balanced'
                elif 'premium' in lbl_lower: shade = 'premium'
                elif 'mewah' in lbl_lower: shade = 'mewah'
                
                c = base_colors.get(cat, {}).get(shade, 'gray')
                if c == 'gray': c = base_colors.get(cat, {}).get('default', 'gray')
                
                ax2.scatter(lon, lat, s=90, c=c, edgecolors='white', linewidths=0.5, marker=marker, 
                            alpha=0.75, zorder=3)
                            
        # Pass 2: Selected items (solid opacity, black border, zorder=10)
        plotted_labels2 = set()
        for cat, cat_data in clustered.items():
            if 'df' not in cat_data: continue
            df = cat_data['df']
            marker = 's' if cat == 'hotel' else ('^' if cat == 'wisata' else 'D')
            
            for _, row in df.iterrows():
                name = row.get('Nama_Tempat')
                lat = row.get('Latitude', 0)
                lon = row.get('Longitude', 0)
                if not name or pd.isna(lat) or pd.isna(lon) or (lat==0 and lon==0): continue
                
                # Must be a selected place
                if name not in selected_places[cat]:
                    continue
                
                lbl = get_cluster_label(cat, name)
                if not lbl: continue
                
                lbl_lower = str(lbl).lower()
                shade = 'default'
                if 'hemat' in lbl_lower: shade = 'hemat'
                elif 'balanced' in lbl_lower or 'menengah' in lbl_lower: shade = 'balanced'
                elif 'premium' in lbl_lower: shade = 'premium'
                elif 'mewah' in lbl_lower: shade = 'mewah'
                
                c = base_colors.get(cat, {}).get(shade, 'gray')
                if c == 'gray': c = base_colors.get(cat, {}).get('default', 'gray')
                
                legend_lbl = f"{cat.capitalize()} ({lbl})"
                
                if legend_lbl not in plotted_labels2:
                    plotted_labels2.add(legend_lbl)
                    ax2.scatter(lon, lat, s=160, c=c, edgecolors='black', linewidths=1.5, marker=marker, 
                                alpha=1.0, label=legend_lbl, zorder=10)
                else:
                    ax2.scatter(lon, lat, s=160, c=c, edgecolors='black', linewidths=1.5, marker=marker, 
                                alpha=1.0, zorder=10)
                                
        ax2.legend(loc='upper left', bbox_to_anchor=(1.02, 1.0), title="Keterangan")
        ax2.grid(True, linestyle=':', alpha=0.4)
        
        info_text2 = (
            "Sebaran Spasial Seluruh Item\n"
            "• Titik Tebal (Black Border) = Terpilih\n"
            "• Titik Solid Biasa = Kandidat Lain\n\n"
            "Bentuk:\n"
            "■ Kotak = Hotel\n"
            "▲ Segitiga = Wisata\n"
            "◆ Belah Ketupat = Kuliner"
        )
        ax2.text(1.02, 0.02, info_text2, transform=ax2.transAxes, fontsize=10, verticalalignment='bottom', bbox=props, zorder=10)
        
        # Show Fig 2 (Blocks until Window 2 is closed)
        if is_api:
            plt.close(fig2)
        else:
            plt.show()
            
    except Exception as e:
        print(f"Plotting error: {e}")



LAST_CLUSTERED = None


def get_pref_weights(c, pref_hemat, pref_balanced, pref_premium):
    """
    Menyelaraskan bobot preferensi pengguna untuk C klaster secara proporsional.
    """
    if c == 2:
        w = [pref_hemat + (pref_balanced / 2.0), pref_premium + (pref_balanced / 2.0)]
    elif c == 3:
        w = [pref_hemat, pref_balanced, pref_premium]
    elif c == 4:
        w = [pref_hemat, pref_balanced, pref_premium * 0.6, pref_premium * 0.4]
    elif c == 5:
        w = [pref_hemat * 0.8, pref_hemat * 0.2, pref_balanced, pref_premium * 0.6, pref_premium * 0.4]
    else:
        w = [1.0 / c] * c
    
    s = sum(w)
    if s > 0:
        w = [x / s for x in w]
    else:
        w = [1.0 / c] * c
    return w


def run_multi_attribute_fcm(df, budget_anchor=None, n_clusters=3, workflow='budget'):
    """
    Menjalankan Fuzzy C-Means (FCM) pada data multidimensi: Harga, Rating, dan Nilai Kategori Numerik.
    Menyelaraskan centroid terurut dengan kompatibilitas sisa kode.
    """
    # Ambil data fitur
    prices = df["Estimasi_Harga"].values.astype(float)
    ratings = df["Rating"].values.astype(float) if "Rating" in df.columns else np.full(len(prices), 4.0)
    categories = df["Nilai_Numerik"].values.astype(float) if "Nilai_Numerik" in df.columns else np.zeros(len(prices))
    
    # Skala MinMax ke [0, 1] agar kontribusi seimbang
    p_min, p_max = prices.min(), prices.max()
    r_min, r_max = ratings.min(), ratings.max()
    c_min, c_max = categories.min(), categories.max()
    
    W_p, W_r, W_c = 0.8, 0.1, 0.1
    p_scaled = ((prices - p_min) / (p_max - p_min + 1e-10)) * W_p
    r_scaled = ((ratings - r_min) / (r_max - r_min + 1e-10)) * W_r
    c_scaled = ((categories - c_min) / (c_max - c_min + 1e-10)) * W_c
    
    X = np.column_stack([p_scaled, r_scaled, c_scaled])
    
    # Tentukan centroid awal (init_centroids)
    init_centroids = None
    if workflow in ['budget', 'destination'] and budget_anchor is not None:
        ratios = get_ratio_scheme(n_clusters)
        
        price_anchors = np.array([budget_anchor * r for r in ratios])
        rating_anchors = np.percentile(ratings, np.linspace(25, 75, n_clusters))
        category_anchors = np.linspace(c_min, c_max, n_clusters)
        
        p_anchors_scaled = ((price_anchors - p_min) / (p_max - p_min + 1e-10)) * W_p
        r_anchors_scaled = ((rating_anchors - r_min) / (r_max - r_min + 1e-10)) * W_r
        c_anchors_scaled = ((category_anchors - c_min) / (c_max - c_min + 1e-10)) * W_c
        
        init_centroids = np.column_stack([p_anchors_scaled, r_anchors_scaled, c_anchors_scaled])
    else:
        p_anchors = np.percentile(prices, np.linspace(100/(n_clusters+1), 100*n_clusters/(n_clusters+1), n_clusters))
        r_anchors = np.percentile(ratings, np.linspace(100/(n_clusters+1), 100*n_clusters/(n_clusters+1), n_clusters))
        c_anchors = np.percentile(categories, np.linspace(100/(n_clusters+1), 100*n_clusters/(n_clusters+1), n_clusters))
        
        p_anchors_scaled = ((p_anchors - p_min) / (p_max - p_min + 1e-10)) * W_p
        r_anchors_scaled = ((r_anchors - r_min) / (r_max - r_min + 1e-10)) * W_r
        c_anchors_scaled = ((c_anchors - c_min) / (c_max - c_min + 1e-10)) * W_c
        
        init_centroids = np.column_stack([p_anchors_scaled, r_anchors_scaled, c_anchors_scaled])

    # Jalankan FCM
    fcm_res = run_fcm(X, n_clusters=n_clusters, init_centroids=init_centroids)
    
    # Dapatkan centroid asli untuk mengurutkan
    cntr_scaled = fcm_res["cntr"].reshape(n_clusters, 3)
    cntr_orig_price = (cntr_scaled[:, 0] / W_p) * (p_max - p_min + 1e-10) + p_min
    
    # Urutkan berdasarkan harga agar (0=Hemat, 1=Balanced, 2=Premium)
    sorted_idx = np.argsort(cntr_orig_price)
    
    sorted_cntr = cntr_scaled[sorted_idx]
    sorted_u = fcm_res["u"][sorted_idx]
    sorted_labels = np.argmax(sorted_u, axis=0)
    
    cntr_orig_sorted = np.zeros_like(sorted_cntr)
    cntr_orig_sorted[:, 0] = (sorted_cntr[:, 0] / W_p) * (p_max - p_min + 1e-10) + p_min
    cntr_orig_sorted[:, 1] = (sorted_cntr[:, 1] / W_r) * (r_max - r_min + 1e-10) + r_min
    cntr_orig_sorted[:, 2] = (sorted_cntr[:, 2] / W_c) * (c_max - c_min + 1e-10) + c_min
    # Hitung Xie-Beni Index Multidimensi
    n_samples = len(X)
    sigma = 0.0
    for k in range(n_clusters):
        diff = X - cntr_scaled[k]
        dist_sq = np.sum(diff**2, axis=1)
        sigma += np.sum((fcm_res["u"][k, :] ** 2) * dist_sq)
        
    sep = float("inf")
    for k in range(n_clusters):
        for j in range(k + 1, n_clusters):
            d_sq = np.sum((cntr_scaled[k] - cntr_scaled[j])**2)
            if d_sq < sep:
                sep = d_sq
                
    if sep == 0 or n_samples == 0:
        xb_val = float("inf")
    else:
        xb_val = float(sigma / (n_samples * sep))

    return {
        "cntr": cntr_orig_sorted[:, 0], # Kembalikan harga centroid untuk kompatibilitas sisa kode
        "cntr_full": cntr_orig_sorted,
        "u": sorted_u,
        "labels": sorted_labels,
        "xb": xb_val,
        "fpc": fcm_res["fpc"],
        "n_iter": fcm_res["n_iter"]
    }


def haversine_road_distance(lat1, lon1, lat2, lon2):
    """
    Menghitung jarak spasial dengan faktor koreksi rute jalan darat 1.45x.
    Menyelaraskan estimasi jarak offline dengan uji_gabungan.py secara akademis.
    """
    return haversine_distance(lat1, lon1, lat2, lon2) * 1.45


def classify_region(lat, lon):
    """
    Mengelompokkan koordinat secara spasial ke dalam 3 wilayah utama Malang Raya:
    - Kota Batu: Latitude [-7.91, -7.73], Longitude [112.43, 112.58]
    - Kota Malang: Latitude [-8.05, -7.90], Longitude [112.56, 112.69]
    - Kabupaten Malang: Wilayah di luar jangkauan kota Batu dan Kota Malang.
    """
    try:
        lat_f = float(lat)
        lon_f = float(lon)
    except (TypeError, ValueError):
        return "Kabupaten Malang"

    if -7.91 <= lat_f <= -7.73 and 112.43 <= lon_f <= 112.58:
        return "Kota Batu"
    elif -8.05 <= lat_f <= -7.90 and 112.56 <= lon_f <= 112.69:
        return "Kota Malang"
    else:
        return "Kabupaten Malang"


def build_hotel_sequence_by_proximity(start_hotel, hotel_list, nights):
    if nights <= 0:
        return []
    if len(hotel_list) <= 1:
        return [start_hotel] * nights

    sequence = [start_hotel]
    current_hotel = start_hotel
    remaining = [hotel for hotel in hotel_list if hotel is not current_hotel]

    while len(sequence) < nights:
        if not remaining:
            remaining = [hotel for hotel in hotel_list if hotel is not current_hotel]

        next_hotel = min(
            remaining,
            key=lambda hotel: haversine_road_distance(
                current_hotel.get("Latitude", 0), current_hotel.get("Longitude", 0),
                hotel.get("Latitude", 0), hotel.get("Longitude", 0)
            )
        )
        sequence.append(next_hotel)
        remaining = [hotel for hotel in remaining if hotel is not next_hotel]
        current_hotel = next_hotel

    return sequence


def recalculate_pkg_legs(pkg_formatted, itinerary, num_persons, transport_mode=None):
    """
    Recalculates precise spatial legs, total distance, and transport cost based
    on the actual itinerary's coordinates.
    """
    duration = len(itinerary)
    
    rate_per_km = 2250
    transport_desc = "Motor GoRide (1 orang)"

    if transport_mode:
        mode_lower = str(transport_mode).strip().lower()
        if mode_lower in ["goride", "motor", "ride"]:
            rate_per_km = 2250
            transport_desc = "Motor GoRide (1 orang)"
        elif mode_lower in ["gocar_standard", "mobil", "standard", "car"]:
            rate_per_km = 5150
            transport_desc = "Mobil GoCar Standard (2-4 orang)"
        elif mode_lower in ["gocar_xl", "mobil_xl", "xl"]:
            rate_per_km = 6000
            transport_desc = "Mobil GoCar XL (5-6 orang)"
        else:
            if num_persons <= 1:
                rate_per_km = 2250
                transport_desc = "Motor GoRide (1 orang)"
            elif num_persons <= 4:
                rate_per_km = 5150
                transport_desc = "Mobil GoCar Standard (2-4 orang)"
            else:
                rate_per_km = 6000
                transport_desc = "Mobil GoCar XL (5-6 orang)"
    else:
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
    haversine_total_dist = 0.0
    route_coords = []
    
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
        route_coords.extend([
            (day_data.get("kuliner_pagi_lat", 0.0), day_data.get("kuliner_pagi_lon", 0.0)),
            (day_data.get("wisata_lat", 0.0), day_data.get("wisata_lon", 0.0)),
            (day_data.get("kuliner_lat", 0.0), day_data.get("kuliner_lon", 0.0))
        ])
        haversine_total_dist = dist1 + dist2
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
                route_coords.extend([
                    (day_data.get("kuliner_pagi_lat", 0.0), day_data.get("kuliner_pagi_lon", 0.0)),
                    (day_data.get("wisata_lat", 0.0), day_data.get("wisata_lon", 0.0)),
                    (day_data.get("kuliner_lat", 0.0), day_data.get("kuliner_lon", 0.0)),
                    (day_data.get("hotel_lat", 0.0), day_data.get("hotel_lon", 0.0)),
                    (day_data.get("kuliner_malam_lat", 0.0), day_data.get("kuliner_malam_lon", 0.0)),
                    (day_data.get("hotel_lat", 0.0), day_data.get("hotel_lon", 0.0))
                ])
                haversine_total_dist += (d1_1 + d1_2 + d1_3 + d1_4 + d1_5)
            elif d_num == duration:
                # Checkout day (3 Segmen): Hotel -> Makan Pagi -> Wisata -> Makan Siang
                prev_day_data = itinerary[d_num - 2]
                dc1 = haversine_road_distance(prev_day_data.get("hotel_lat", 0.0), prev_day_data.get("hotel_lon", 0.0), day_data.get("kuliner_pagi_lat", 0.0), day_data.get("kuliner_pagi_lon", 0.0))
                dc2 = haversine_road_distance(day_data.get("kuliner_pagi_lat", 0.0), day_data.get("kuliner_pagi_lon", 0.0), day_data.get("wisata_lat", 0.0), day_data.get("wisata_lon", 0.0))
                dc3 = haversine_road_distance(day_data.get("wisata_lat", 0.0), day_data.get("wisata_lon", 0.0), day_data.get("kuliner_lat", 0.0), day_data.get("kuliner_lon", 0.0))
                legs_detail.extend([
                    {
                        "from": f"Hotel (Hari {d_num-1})",
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
                route_coords.extend([
                    (prev_day_data.get("hotel_lat", 0.0), prev_day_data.get("hotel_lon", 0.0)),
                    (day_data.get("kuliner_pagi_lat", 0.0), day_data.get("kuliner_pagi_lon", 0.0)),
                    (day_data.get("wisata_lat", 0.0), day_data.get("wisata_lon", 0.0)),
                    (day_data.get("kuliner_lat", 0.0), day_data.get("kuliner_lon", 0.0))
                ])
                haversine_total_dist += (dc1 + dc2 + dc3)
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
                        "from": f"Hotel (Hari {d_num-1})",
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
                route_coords.extend([
                    (prev_day_data.get("hotel_lat", 0.0), prev_day_data.get("hotel_lon", 0.0)),
                    (day_data.get("kuliner_pagi_lat", 0.0), day_data.get("kuliner_pagi_lon", 0.0)),
                    (day_data.get("wisata_lat", 0.0), day_data.get("wisata_lon", 0.0)),
                    (day_data.get("kuliner_lat", 0.0), day_data.get("kuliner_lon", 0.0)),
                    (day_data.get("hotel_lat", 0.0), day_data.get("hotel_lon", 0.0)),
                    (day_data.get("kuliner_malam_lat", 0.0), day_data.get("kuliner_malam_lon", 0.0)),
                    (day_data.get("hotel_lat", 0.0), day_data.get("hotel_lon", 0.0))
                ])
                haversine_total_dist += (dm1 + dm2 + dm3 + dm4 + dm5 + dm6)

    # 1. Bersihkan koordinat (hindari duplikat berurutan & data kosong)
    clean_coords = []
    for lat, lon in route_coords:
        if lat == 0.0 and lon == 0.0:
            continue
        if not clean_coords or clean_coords[-1] != (lat, lon):
            clean_coords.append((lat, lon))

    # 2. Panggil OSRM
    osrm_dist = get_osrm_route_distance(clean_coords)
    if osrm_dist is not None:
        final_total_dist = osrm_dist
        source = "OSRM Route API (Akurat)"
    else:
        final_total_dist = haversine_total_dist
        source = "Haversine (Spatial Optimized)"

    cost_transport = round(final_total_dist * rate_per_km)
    
    # 3. Hitung proporsi untuk segmen rincian (legs) di UI
    dist_scale_factor = (final_total_dist / haversine_total_dist) if haversine_total_dist > 0 else 0
    cost_scale_factor = (cost_transport / haversine_total_dist) if haversine_total_dist > 0 else 0

    for leg in legs_detail:
        original_dist = float(leg["distance_km"])
        leg["distance_km"] = round(original_dist * dist_scale_factor, 2)
        leg["cost"] = round(original_dist * cost_scale_factor)
        
    if legs_detail and cost_transport > 0:
        total_leg_cost = sum(float(leg["cost"]) for leg in legs_detail)
        diff = cost_transport - total_leg_cost
        if diff != 0:
            legs_detail[-1]["cost"] = float(legs_detail[-1]["cost"]) + diff
            
    pkg_formatted["cost_transport"] = float(cost_transport)
    pkg_formatted["transport_detail"] = {
        "total_cost": cost_transport,
        "total_distance_km": round(final_total_dist, 2),
        "legs": legs_detail,
        "source": source
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
def _extract_wahana_info(_wisata_item: dict) -> dict:
    """
    Mengembalikan dict wahana kosong secara aman karena kolom-kolom usang
    telah dihapus dari dataset Excel.
    """
    return {
        "has_additional_cost": 0,
        "additional_cost_min": 0,
        "additional_cost_max": 0,
        "additional_cost_label": "",
    }


def _get_all_additional_facilities_for_itinerary(itinerary: list, df_wisata: pd.DataFrame) -> list:
    """
    Dapatkan fasilitas/wahana opsional untuk SEMUA wisata yang dikunjungi dalam itinerary multi-hari.
    """
    facs = []
    seen_tids = set()
    
    # Kumpulkan wisata unik berserta hari pertamanya dikunjungi
    wisata_map = {}
    for day in itinerary:
        w_name = day.get("wisata")
        hari = day.get("day")
        if w_name and w_name != "N/A" and w_name not in wisata_map:
            wisata_map[w_name] = hari

    for w_name, hari in wisata_map.items():
        w_rows = df_wisata[df_wisata["Nama_Tempat"] == w_name]
        if not w_rows.empty:
            w_item = w_rows.iloc[0].to_dict()
            tid_child = int(float(w_item.get("Id_Tempat", 0))) if pd.notna(w_item.get("Id_Tempat")) else None
            family_id = w_item.get("destination_family_id")
            parent_id = int(float(family_id)) if pd.notna(family_id) and str(family_id).strip() else None

            for f in _get_additional_facilities_for_wisata(w_item, df_wisata):
                tid = f.get("Id_Tempat")
                if tid not in seen_tids:
                    f_copy = f.copy()
                    f_copy["parent_wisata_nama"] = w_name
                    f_copy["hari_ke"] = hari
                    # Jika fasilitas ini adalah parent dari wisata saat ini, tandai wajib!
                    if parent_id is not None and parent_id != tid_child and tid == parent_id:
                        f_copy["is_mandatory"] = True
                    else:
                        f_copy["is_mandatory"] = False
                    facs.append(f_copy)
                    seen_tids.add(tid)
    return facs


def _get_pure_wisata_price(wisata_identifier, df_wisata: pd.DataFrame) -> float:
    """
    Dapatkan harga tiket asli/murni milik wisata anak (tanpa tiket masuk parent).
    Bisa menerima dict (wisata_item) dengan Id_Tempat atau Nama_Tempat.
    """
    if not wisata_identifier:
        return 0.0
    
    # Cari baris di df_wisata
    import numpy as np
    w_row = pd.Series()
    if isinstance(wisata_identifier, dict):
        tid = wisata_identifier.get("wisata_id") or wisata_identifier.get("Id_Tempat")
        w_name = wisata_identifier.get("wisata") or wisata_identifier.get("Nama_Tempat")
        if tid is not None:
            rows = df_wisata[df_wisata["Id_Tempat"] == int(float(tid))]
            if not rows.empty:
                w_row = rows.iloc[0]
        if (w_row.empty or len(w_row) == 0) and w_name:
            rows = df_wisata[df_wisata["Nama_Tempat"] == w_name]
            if not rows.empty:
                w_row = rows.iloc[0]
    else:
        try:
            tid = int(float(wisata_identifier))
            rows = df_wisata[df_wisata["Id_Tempat"] == tid]
            if not rows.empty:
                w_row = rows.iloc[0]
        except Exception:
            rows = df_wisata[df_wisata["Nama_Tempat"] == str(wisata_identifier)]
            if not rows.empty:
                w_row = rows.iloc[0]

    if w_row.empty or len(w_row) == 0:
        if isinstance(wisata_identifier, dict):
            val = wisata_identifier.get("Estimasi_Harga")
            if val is None:
                val = wisata_identifier.get("wisata_harga")
            if val is None:
                val = 0.0
            return float(val)
        return 0.0

    price = float(w_row.get("Estimasi_Harga", 0))
    family_id = w_row.get("destination_family_id")
    if pd.notna(family_id) and str(family_id).strip():
        try:
            parent_id = int(float(family_id))
            if parent_id != int(float(w_row.get("Id_Tempat", 0))):
                parent_row = df_wisata[df_wisata["Id_Tempat"] == parent_id]
                if not parent_row.empty:
                    parent_price = float(parent_row.iloc[0].get("Estimasi_Harga", 0))
                    return max(0.0, price - parent_price)
        except Exception:
            pass
    return price


def _get_additional_facilities_for_wisata(wisata_item: dict, df_wisata: pd.DataFrame) -> list:
    """
    Dapatkan daftar fasilitas/wahana opsional untuk destinasi wisata.
    Jika destinasi ini memiliki relasi Induk-Anak (destination_family_id),
    maka semua anak/induk lainnya dalam kompleks yang sama akan ditawarkan sebagai pilihan individual.
    """
    facilities = []
    
    tid = wisata_item.get("Id_Tempat")
    if tid is None:
        return facilities
    
    try:
        tid = int(float(tid))
    except Exception:
        return facilities

    # Cari di dataframe untuk mendapatkan data baris yang ter-update
    target_rows = df_wisata[df_wisata["Id_Tempat"] == tid]
    if target_rows.empty:
        raw_w = wisata_item
    else:
        raw_w = target_rows.iloc[0].to_dict()

    family_id = raw_w.get("destination_family_id")
    
    # Periksa jika family_id ada dan tidak null (NaN)
    parent_id = int(float(family_id)) if (family_id is not None and not pd.isna(family_id)) else tid
    
    complex_members = []
    
    # Cari semua anak
    children_df = df_wisata[df_wisata["destination_family_id"] == parent_id]
    for _, row in children_df.iterrows():
        mid = int(row["Id_Tempat"])
        if mid != tid:
            complex_members.append(row.to_dict())
            
    # Tambahkan parent jika parent_id != tid
    if parent_id != tid:
        parent_df = df_wisata[df_wisata["Id_Tempat"] == parent_id]
        if not parent_df.empty:
            complex_members.append(parent_df.iloc[0].to_dict())
            
    # Buat entri fasilitas opsional untuk setiap anggota kompleks
    for idx, m in enumerate(complex_members):
        price = int(_get_pure_wisata_price(m, df_wisata))
        m_id = int(float(m.get("Id_Tempat", 0)))
        facilities.append({
            "id": f"wahana_{m_id}",
            "label": m.get("Nama_Tempat", "Fasilitas Tambahan"),
            "cost_per_person": price,
            "cost_min": price,
            "cost_max": price,
            "Id_Tempat": m_id
        })
        
    return facilities



def calculate_package_cost(hotel, wisata, kuliner, num_persons, duration,
                           transport_cost=0):
    """
    Menghitung total biaya paket wisata.

    Rumus sesuai skripsi Sub-bab 3.3.5:
    - Akomodasi = tarif hotel × malam × jumlah_kamar (malam = durasi - 1)
    - Wisata    = harga tiket × jumlah_peserta
    - Kuliner   = harga menu × jumlah_peserta × 3 (makan/hari) × durasi
    - Transport = biaya dari transport_api

    Catatan: has_additional_cost, additional_cost_min/max, additional_cost_label
    adalah biaya OPSIONAL wahana yang TIDAK dimasukkan ke total_cost.
    Mereka hanya diteruskan ke frontend sebagai peringatan.

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

    # Info wahana opsional (TIDAK dimasukkan ke total_cost)
    wahana_info = _extract_wahana_info(wisata)

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
        # Info biaya wahana opsional
        "has_additional_cost": wahana_info["has_additional_cost"],
        "additional_cost_min": wahana_info["additional_cost_min"],
        "additional_cost_max": wahana_info["additional_cost_max"],
        "additional_cost_label": wahana_info["additional_cost_label"],
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
                       transport_mode=None, hotel_mode='same', best_c=None,
                       pref_hemat=0.33, pref_balanced=0.33, pref_premium=0.34, user_id='guest',
                       pref_wisata='', pref_hotel='', pref_kuliner=''):
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

    # --- Auto-c: Tentukan jumlah klaster optimal via Xie-Beni ---
    if best_c is None:
        datasets_prices = {cat: datasets[cat]["Estimasi_Harga"].values for cat in ["hotel", "wisata", "kuliner"]}
        best_c = find_best_c_for_budget(datasets_prices, total_budget, verbose=verbose)

    # Deterministic Seed untuk Top-N Random Sampling
    seed_str = f"{user_id}_{total_budget}_{duration}_{num_persons}"
    base_seed = int(hashlib.md5(seed_str.encode()).hexdigest(), 16) % (2**32 - 1)

    cluster_labels = get_cluster_labels(best_c)
    ratios_for_c = get_ratio_scheme(best_c)

    if verbose:
        print(f"  Auto-c: best_c = {best_c} | Label: {list(cluster_labels.values())}")

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
            "wisata": budget_alloc["wisata"] / (num_persons * duration),
            "kuliner": budget_alloc["kuliner"] / (num_persons * total_meals),
        }
    else:
        total_meals = 3 * (duration - 1) + 2
        budget_per_category = {
            "hotel": budget_alloc["akomodasi"] / (nights * num_rooms),
            "wisata": budget_alloc["wisata"] / (num_persons * duration),
            "kuliner": budget_alloc["kuliner"] / (num_persons * total_meals),
        }

    clustered = {}

    for cat_name in ["hotel", "wisata", "kuliner"]:
        df = datasets[cat_name]
        prices = df["Estimasi_Harga"].values
        budget_anchor = budget_per_category[cat_name]

        if verbose:
            print(f"  Clustering {cat_name.capitalize()} (anchor: Rp {budget_anchor:,.0f}, c={best_c})...")

        try:
            result = run_multi_attribute_fcm(
                df, budget_anchor, n_clusters=best_c, workflow='budget'
            )
            df_clustered = df.copy()
            df_clustered["Cluster"] = result["labels"]
            u_matrix = result["u"]
            df_clustered["Membership_Degree"] = [float(u_matrix[result["labels"][j], j]) for j in range(len(prices))]
            df_clustered["Kategori"] = df_clustered["Cluster"].map(cluster_labels)
            df_clustered["Region"] = df_clustered.apply(lambda row: classify_region(row.get("Latitude", 0), row.get("Longitude", 0)), axis=1)
            
            # Fuzzy preference score calculation for personalization
            w_list = get_pref_weights(best_c, pref_hemat, pref_balanced, pref_premium)
            df_clustered["Fuzzy_Score"] = [sum(w_list[k] * u_matrix[k, j] for k in range(best_c)) for j in range(len(df_clustered))]

            clustered[cat_name] = {
                "df": df_clustered,
                "cntr": result["cntr"],
                "xb": result["xb"],
            }
        except Exception as e:
            print(f"    ⚠ Error clustering {cat_name}: {e}")
            return []

    # --- Langkah 3: Ambil Kandidat Wilayah Terdistribusi Spasial dari FCM ---
    candidates = {
        "hotel": {i: [] for i in range(best_c)},
        "wisata": {i: [] for i in range(best_c)},
        "kuliner": {i: [] for i in range(best_c)}
    }

    # Hitung Preference Bias (-1.0 to 1.0). Negatif = Bias Hemat, Positif = Bias Premium
    pref_bias = pref_premium - pref_hemat

    for key in ["hotel", "wisata", "kuliner"]:
        df = clustered[key]["df"]
        cat_anchor = budget_per_category[key]
        for i in range(best_c):
            items_in_c = df[df["Cluster"] == i].copy()
            # Geser target price berdasarkan pref_bias (max 20% shift ke atas atau bawah)
            base_target = cat_anchor * ratios_for_c[i]
            target_price = base_target * (1.0 + (pref_bias * 0.20))

            
            best_items_list = []
            regions = ["Kota Batu", "Kota Malang", "Kabupaten Malang"]
            for region in regions:
                items_in_region = items_in_c[items_in_c["Region"] == region] if not items_in_c.empty else df[df["Region"] == region]
                if not items_in_region.empty:
                    items_in_region_cp = items_in_region.copy()
                    items_in_region_cp["distance_to_target"] = (items_in_region_cp["Estimasi_Harga"] - target_price).abs()
                    # PERBAIKAN: Top-N Stochastic Pool Sampling
                    sorted_items = items_in_region_cp.sort_values(
                        by=["distance_to_target", "Membership_Degree"],
                        ascending=[True, False]
                    )
                    pool = sorted_items.head(25) # Ambil top 25 sebagai pool
                    if not pool.empty:
                        sample_size = min(8, len(pool))
                        local_seed = (base_seed + hash(key) + i + hash(region)) % (2**32 - 1)
                        best_items_list.append(pool.sample(n=sample_size, random_state=local_seed))
            
            if best_items_list:
                best_items = pd.concat(best_items_list)
            else:
                if items_in_c.empty:
                    df["distance_to_target"] = (df["Estimasi_Harga"] - target_price).abs()
                    sorted_items = df.sort_values(by=["distance_to_target", "Membership_Degree"], ascending=[True, False])
                    pool = sorted_items.head(30)
                    local_seed = (base_seed + hash(key) + i) % (2**32 - 1)
                    best_items = pool.sample(n=min(15, len(pool)), random_state=local_seed) if not pool.empty else pool
                else:
                    items_in_c["distance_to_target"] = (items_in_c["Estimasi_Harga"] - target_price).abs()
                    sorted_items = items_in_c.sort_values(by=["distance_to_target", "Membership_Degree"], ascending=[True, False])
                    pool = sorted_items.head(30)
                    local_seed = (base_seed + hash(key) + i) % (2**32 - 1)
                    best_items = pool.sample(n=min(15, len(pool)), random_state=local_seed) if not pool.empty else pool
                
            # Wrap in pd.DataFrame to resolve Pylance/Pyright type inference warnings
            # since pd.concat and pool.sample can technically return a Series.
            best_items_df = pd.DataFrame(best_items)
            candidates[key][i] = best_items_df.to_dict("records")

    # --- Langkah 4 & 5: Combinatorial Search & Sensor Anggaran Ketat ---
    package_options = {i: [] for i in range(best_c)}
    max_options_to_show = {i: 15 for i in range(best_c)}

    for i in range(best_c):
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
                            hotel_seq = build_hotel_sequence_by_proximity(h, hotel_list, nights)
                            cost_hotel = sum(ht["Estimasi_Harga"] for ht in hotel_seq) * num_rooms
                        else:
                            cost_hotel = h["Estimasi_Harga"] * nights * num_rooms
                    else:
                        cost_hotel = 0
                        
                    # B. Hitung Biaya Wisata
                    # Filter awal pakai 1 hari (estimasi kasar); total akurat dihitung post-itinerary
                    cost_wisata = w["Estimasi_Harga"] * duration * num_persons
                    
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

        def get_comb_pref_score(x):
            score = 1.0
            
            w_cat = x["wisata"].get("Kategori_Asli", "")
            h_cat = x["hotel"].get("Kategori_Asli", "")
            k_cat = x["kuliner"].get("Kategori_Asli", "")
            
            if pref_wisata and isinstance(w_cat, str) and w_cat.lower() == pref_wisata.lower():
                score *= 1.30
            if pref_hotel and isinstance(h_cat, str) and h_cat.lower() == pref_hotel.lower():
                score *= 1.30
            if pref_kuliner and isinstance(k_cat, str) and k_cat.lower() == pref_kuliner.lower():
                score *= 1.30
                
            return score


        if i == 0:
            # Hemat: paket termurah yang MENGIKUTI skala budget bila budget diisi.
            # Jika budget None (mode destinasi tanpa budget), tetap pilih termurah.
            hemat_target = total_budget * ratios_for_c[0] if total_budget is not None else None
            hemat_key = (lambda x: x["total_cost"]) if hemat_target is None else (lambda x: abs(x["total_cost"] - hemat_target))
            valid_combinations = sorted(valid_combinations, key=lambda x: (x.get("selisih", 0) < 0, -get_comb_pref_score(x), hemat_key(x), x["total_dist"]))
        elif i == best_c - 1:
            # Premium/kelas tertinggi: Personalisasi dengan target budget
            premium_target = total_budget * ratios_for_c[-1] if total_budget is not None else None
            premium_key = (lambda x: get_val(x["hotel"], "Estimasi_Harga") if pref_bias < -0.1 else -get_val(x["hotel"], "Estimasi_Harga")) if premium_target is None else (lambda x: abs(x["total_cost"] - premium_target))
            valid_combinations = sorted(
                valid_combinations,
                key=lambda x: (
                    x.get("selisih", 0) < 0, 
                    -get_comb_pref_score(x),
                    premium_key(x),
                    -get_val(x["wisata"], "Rating"), 
                    x["total_dist"]
                )
            )
        else:
            # Balanced: Hybrid rating + jarak dan target budget
            balanced_target = total_budget * ratios_for_c[i] if total_budget is not None else None
            balanced_key = (lambda x: -get_val(x["wisata"], "Rating") * 10 - get_val(x["kuliner"], "Rating") * 2 + x["total_dist"] / 10.0) if balanced_target is None else (lambda x: abs(x["total_cost"] - balanced_target))
            valid_combinations = sorted(
                valid_combinations,
                key=lambda x: (
                    x.get("selisih", 0) < 0, 
                    -get_comb_pref_score(x), 
                    balanced_key(x),
                    -get_val(x["wisata"], "Rating"),
                    x["total_dist"]
                )
            )


        # Fallback jika kosong (diselaraskan eksak dengan uji_gabungan.py)
        if not valid_combinations:
            min_cost_comb = None
            min_cost = float('inf')
            for h in hotel_list[:15]:
                for w in wisata_list[:15]:
                    for k in kuliner_list[:15]:
                        if duration > 1:
                            if hotel_mode == 'split' and len(hotel_list) > 1:
                                hotel_seq = build_hotel_sequence_by_proximity(h, hotel_list, nights)
                                cost_hotel = sum(ht["Estimasi_Harga"] for ht in hotel_seq) * num_rooms
                            else:
                                cost_hotel = h["Estimasi_Harga"] * nights * num_rooms
                        else:
                            cost_hotel = 0
                        # Filter awal pakai 1 hari (estimasi kasar)
                        cost_wisata = w["Estimasi_Harga"] * duration * num_persons
                        
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

        # --- Seleksi Beragam (Diversity Filter) untuk Keberagaman Paket ---
        diverse_combinations = []
        selected_wisata = set()
        selected_hotels = set()
        
        # Phase 1: Unik berdasarkan tempat Wisata Utama
        for combo in valid_combinations:
            w_name = combo["wisata"]["Nama_Tempat"]
            if w_name not in selected_wisata:
                diverse_combinations.append(combo)
                selected_wisata.add(w_name)
                selected_hotels.add(combo["hotel"]["Nama_Tempat"])
                if len(diverse_combinations) >= max_options_to_show[i]:
                    break
                    
        # Phase 2: Jika kurang, boleh wisata sama tapi hotel berbeda
        if len(diverse_combinations) < max_options_to_show[i]:
            for combo in valid_combinations:
                if combo not in diverse_combinations:
                    h_name = combo["hotel"]["Nama_Tempat"]
                    if h_name not in selected_hotels:
                        diverse_combinations.append(combo)
                        selected_hotels.add(h_name)
                        if len(diverse_combinations) >= max_options_to_show[i]:
                            break
                            
        # Phase 3: Jika masih kurang, ambil sisa kombinasi terbaik yang ada
        if len(diverse_combinations) < max_options_to_show[i]:
            for combo in valid_combinations:
                if combo not in diverse_combinations:
                    diverse_combinations.append(combo)
                    if len(diverse_combinations) >= max_options_to_show[i]:
                        break
                        
        package_options[i] = diverse_combinations

    # --- Langkah 7: Pemetaan Ke Tab Opsi Alternatif (Hingga 15 Opsi Unik) ---
    max_opts_avail = max((len(package_options[i]) for i in range(best_c)), default=0)
    num_options = min(max_opts_avail, 15)
    if num_options < 1:
        num_options = 1

    options_list = []
    seen_signatures = set()

    for opt_idx in range(num_options):
        packages_for_option = []

        for i, label in cluster_labels.items():
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
                


            # Ekstrak info wahana utama (wisata hari pertama / wisata terpilih)
            _w_wahana = _extract_wahana_info(w_item)
            w_id_val = w_item.get("Id_Tempat")

            pkg_formatted: dict[str, Any] = {
                "hotel_nama": h_item["Nama_Tempat"] if duration > 1 else "Tanpa Akomodasi (One Day Trip)",
                "hotel_md": h_item.get("Membership_Degree", 1.0) if duration > 1 else 1.0,
                "hotel_harga": h_item["Estimasi_Harga"] if duration > 1 else 0,
                "hotel_nama_real": h_item["Nama_Tempat"],
                "hotel_lat": h_item.get("Latitude", 0),
                "hotel_lon": h_item.get("Longitude", 0),
                "wisata_id": int(float(w_id_val)) if w_id_val is not None and pd.notna(w_id_val) else None,
                "wisata_nama": w_item["Nama_Tempat"],
                "wisata_md": w_item.get("Membership_Degree", 1.0),
                "wisata_harga": w_item["Estimasi_Harga"],
                "wisata_lat": w_item.get("Latitude", 0),
                "wisata_lon": w_item.get("Longitude", 0),
                # Info biaya wahana opsional untuk frontend
                "has_additional_cost": _w_wahana["has_additional_cost"],
                "additional_cost_min": _w_wahana["additional_cost_min"],
                "additional_cost_max": _w_wahana["additional_cost_max"],
                "additional_cost_label": _w_wahana["additional_cost_label"],
                "kuliner_pagi_nama": k_pagi_item["Nama_Tempat"] if k_pagi_item else "N/A",
                "kuliner_pagi_md": k_pagi_item.get("Membership_Degree", 1.0) if k_pagi_item else 1.0,
                "kuliner_pagi_harga": k_pagi_item["Estimasi_Harga"] if k_pagi_item else 0,
                "kuliner_pagi_lat": k_pagi_item.get("Latitude", 0) if k_pagi_item else 0,
                "kuliner_pagi_lon": k_pagi_item.get("Longitude", 0) if k_pagi_item else 0,
                "kuliner_nama": k_item["Nama_Tempat"],
                "kuliner_md": k_item.get("Membership_Degree", 1.0),
                "kuliner_harga": k_item["Estimasi_Harga"],
                "kuliner_lat": k_item.get("Latitude", 0),
                "kuliner_lon": k_item.get("Longitude", 0),
                "kuliner_malam_nama": k_malam_item["Nama_Tempat"] if k_malam_item else "N/A",
                "kuliner_malam_md": k_malam_item.get("Membership_Degree", 1.0) if k_malam_item else 1.0,
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
                hotel_list = candidates["hotel"][i]
                
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
                        
                    w_var_id = w_var.get("Id_Tempat") if w_var else None
                    itinerary.append({
                        "day": d,
                        "wisata_id": int(float(w_var_id)) if w_var_id is not None and pd.notna(w_var_id) else None,
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
            recalculate_pkg_legs(pkg_formatted, pkg_formatted["itinerary"], num_persons, transport_mode)

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

            # Recalculate total wisata cost dynamically based on actual daily itinerary
            total_wisata = 0.0
            wisata_names = []
            for day in itinerary_list:
                day_dict = cast(dict, day)
                w_name = day_dict.get("wisata")
                w_price = float(day_dict.get("wisata_harga") or 0.0)
                total_wisata += w_price * float(num_persons)
                if w_name and w_name != "N/A":
                    if w_name not in wisata_names:
                        wisata_names.append(w_name)
            cost_w = total_wisata
            pkg_formatted["cost_wisata"] = cost_w
            pkg_formatted["wisata_nama"] = " & ".join(wisata_names) if wisata_names else "N/A"

            cost_k = total_kuliner
            cost_t = float(pkg_formatted["cost_transport"])

            pkg_formatted["cost_akomodasi"] = cost_h
            pkg_formatted["cost_hotel"] = cost_h
            pkg_formatted["cost_kuliner"] = cost_k
            pkg_formatted["total_cost"] = cost_h + cost_w + cost_k + cost_t

            # Post-process to adjust wisata_harga to pure price in itinerary and package
            pkg_formatted["wisata_harga"] = _get_pure_wisata_price(w_item, datasets["wisata"])
            for day in itinerary_list:
                day_dict = cast(dict, day)
                day_dict["wisata_harga"] = _get_pure_wisata_price(day_dict, datasets["wisata"])

            # ── Fasilitas Wahana Opsional (array, untuk toggling individual di UI) ──
            pkg_formatted["additional_facilities"] = _get_all_additional_facilities_for_itinerary(pkg_formatted.get("itinerary", []), datasets["wisata"])

            # ── Sisa Budget (hanya untuk workflow dengan input budget) ──
            # Digunakan frontend untuk menampilkan tombol "Tambah Destinasi"
            if total_budget is not None and total_budget > 0:
                pkg_formatted["budget_input"] = total_budget
                pkg_formatted["budget_remaining"] = round(total_budget - pkg_formatted["total_cost"], 2)
            else:
                pkg_formatted["budget_input"] = None
                pkg_formatted["budget_remaining"] = None

            packages_for_option.append(pkg_formatted)


        # Enforce uniqueness of option combinations
        sorted_pkgs = sorted(packages_for_option, key=lambda x: x.get("cluster_id", 0))
        sig = tuple((p.get("hotel_nama_real", ""), p.get("wisata_nama", ""), p.get("kuliner_nama", "")) for p in sorted_pkgs)

        if sig not in seen_signatures:
            seen_signatures.add(sig)
            options_list.append({
                "option_index": len(options_list) + 1,
                "packages": sorted_pkgs,
                "best_c": best_c,
                "cluster_labels": cluster_labels,
                "clustered_items": {
                    "hotel": {i: candidates["hotel"][i] for i in range(best_c)},
                    "wisata": {i: candidates["wisata"][i] for i in range(best_c)},
                    "kuliner": {i: candidates["kuliner"][i] for i in range(best_c)}
                }
            })

    # --- Re-sort Opsi berdasarkan jumlah paket over budget ---
    options_list = sorted(options_list, key=lambda opt: sum(1 for p in opt["packages"] if p.get("budget_remaining") is not None and p["budget_remaining"] < 0))
    for idx, opt in enumerate(options_list):
        opt["option_index"] = idx + 1

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
                    # Wisata cost per hari (bukan hanya hari 1)
                    wisata_cost = float(day.get("wisata_harga", 0)) * pkg["num_persons"]
                    
                    pagi_h = float(day.get("kuliner_pagi_harga", 0))
                    siang_h = float(day.get("kuliner_harga", 0))
                    malam_h = float(day.get("kuliner_malam_harga", 0)) if d <= nights else 0.0
                    kuliner_cost = (pagi_h + siang_h + malam_h) * pkg["num_persons"]
                    
                    day_legs = [leg for leg in pkg["transport_detail"]["legs"] if f"(Hari {d})" in leg["from"] or f"(Hari {d})" in leg["to"]]
                    transport_cost = sum(leg["cost"] for leg in day_legs) if day_legs else round(pkg["cost_transport"] / pkg["duration"])
                    
                    day_subtotal = hotel_cost + wisata_cost + kuliner_cost + transport_cost
                    
                    hotel_str = f"Hotel: {day.get('hotel')}{pindah_str} (Rp {float(day.get('hotel_harga', 0)):,.0f})" if has_hotel else "Checkout"
                    print(f"    • Hari {d}: {hotel_str} | Wisata: {day.get('wisata')} (Rp {float(day.get('wisata_harga', 0)):,.0f}) | Kuliner: {day.get('kuliner')} & {day.get('kuliner_malam')}")
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
        "hotel_cntr": clustered.get("hotel", {}).get("cntr") if "hotel" in clustered else None,
        "wisata_cntr": clustered.get("wisata", {}).get("cntr") if "wisata" in clustered else None,
        "kuliner_cntr": clustered.get("kuliner", {}).get("cntr") if "kuliner" in clustered else None,
    }

    show_recommendation_scatter(clustered, options_list, 'Budget-First Workflow')
    return options_list


# ============================================================
# 4. GENERATE PAKET FLEKSIBEL (FLEXIBLE EXPLORATION WORKFLOW)
# ============================================================
def generate_flexible_exploration_packages(num_persons, duration, datasets,
                                           api_key=None, verbose=True,
                                           transport_mode=None,
                                           pref_hemat=0.33, pref_balanced=0.33, pref_premium=0.34, user_id='guest',
                                           pref_wisata='', pref_hotel='', pref_kuliner=''):
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

    # Deterministic Seed untuk Top-N Random Sampling
    seed_str = f"FLEX_{user_id}_{duration}_{num_persons}"
    base_seed = int(hashlib.md5(seed_str.encode()).hexdigest(), 16) % (2**32 - 1)

    # --- Auto-c: Tentukan jumlah klaster optimal via Xie-Beni (offline) ---
    datasets_prices_flex = {cat: datasets[cat]["Estimasi_Harga"].values for cat in ["hotel", "wisata", "kuliner"]}
    best_c = find_best_c_offline(datasets_prices_flex, verbose=verbose)
    cluster_labels = get_cluster_labels(best_c)

    if verbose:
        print(f"\n{'='*60}")
        print(f"  FLEXIBLE EXPLORATION WORKFLOW")
        print(f"{'='*60}")
        print(f"  Peserta       : {num_persons} orang")
        print(f"  Durasi        : {duration} hari")
        print(f"  Auto-c        : best_c = {best_c} | Label: {list(cluster_labels.values())}")
        print(f"  Skema         : Centroid Persentil (Offline)\n")

    clustered = {}
    for cat_name in ["hotel", "wisata", "kuliner"]:
        df = datasets[cat_name]
        prices = df["Estimasi_Harga"].values

        if verbose:
            print(f"  Clustering {cat_name.capitalize()} (Persentil, c={best_c})...")

        try:
            result = run_multi_attribute_fcm(
                df, n_clusters=best_c, workflow='flexible'
            )
            df_clustered = df.copy()
            df_clustered["Cluster"] = result["labels"]
            u_matrix = result["u"]
            df_clustered["Membership_Degree"] = [float(u_matrix[result["labels"][j], j]) for j in range(len(prices))]
            df_clustered["Kategori"] = df_clustered["Cluster"].map(cluster_labels)
            df_clustered["Region"] = df_clustered.apply(lambda row: classify_region(row.get("Latitude", 0), row.get("Longitude", 0)), axis=1)
            
            # Fuzzy preference score calculation for personalization
            w_list = get_pref_weights(best_c, pref_hemat, pref_balanced, pref_premium)
            df_clustered["Fuzzy_Score"] = [sum(w_list[k] * u_matrix[k, j] for k in range(best_c)) for j in range(len(df_clustered))]

            clustered[cat_name] = {
                "df": df_clustered,
                "cntr": result["cntr"],
            }
        except Exception as e:
            print(f"    ⚠ Error clustering {cat_name}: {e}")
            return []

    # --- Langkah 3: Ambil Kandidat Wilayah Terdistribusi Spasial (Offline FCM) ---
    candidates = {
        "hotel": {i: [] for i in range(best_c)},
        "wisata": {i: [] for i in range(best_c)},
        "kuliner": {i: [] for i in range(best_c)}
    }

    # Hitung Preference Bias (-1.0 to 1.0). Negatif = Bias Hemat, Positif = Bias Premium
    pref_bias = pref_premium - pref_hemat

    for key in ["hotel", "wisata", "kuliner"]:
        df = clustered[key]["df"]
        cntrs = clustered[key]["cntr"]
        for i in range(best_c):
            items_in_c = df[df["Cluster"] == i].copy()
            # Geser target price berdasarkan pref_bias (max 20% shift)
            target_price = cntrs[i] * (1.0 + (pref_bias * 0.20))
            
            best_items_list = []
            regions = ["Kota Batu", "Kota Malang", "Kabupaten Malang"]
            for region in regions:
                items_in_region = items_in_c[items_in_c["Region"] == region] if not items_in_c.empty else df[df["Region"] == region]
                if not items_in_region.empty:
                    items_in_region_cp = items_in_region.copy()
                    items_in_region_cp["distance_to_target"] = (items_in_region_cp["Estimasi_Harga"] - target_price).abs()
                    # PERBAIKAN: Top-N Stochastic Pool Sampling
                    sorted_items = items_in_region_cp.sort_values(
                        by=["distance_to_target", "Membership_Degree"],
                        ascending=[True, False]
                    )
                    pool = sorted_items.head(25)
                    if not pool.empty:
                        sample_size = min(8, len(pool))
                        local_seed = (base_seed + hash(key) + i + hash(region)) % (2**32 - 1)
                        best_items_list.append(pool.sample(n=sample_size, random_state=local_seed))
            
            if best_items_list:
                best_items = pd.concat(best_items_list)
            else:
                if items_in_c.empty:
                    df["distance_to_target"] = (df["Estimasi_Harga"] - target_price).abs()
                    sorted_items = df.sort_values(by=["distance_to_target", "Membership_Degree"], ascending=[True, False])
                    pool = sorted_items.head(30)
                    local_seed = (base_seed + hash(key) + i) % (2**32 - 1)
                    best_items = pool.sample(n=min(15, len(pool)), random_state=local_seed) if not pool.empty else pool
                else:
                    items_in_c["distance_to_target"] = (items_in_c["Estimasi_Harga"] - target_price).abs()
                    sorted_items = items_in_c.sort_values(by=["distance_to_target", "Membership_Degree"], ascending=[True, False])
                    pool = sorted_items.head(30)
                    local_seed = (base_seed + hash(key) + i) % (2**32 - 1)
                    best_items = pool.sample(n=min(15, len(pool)), random_state=local_seed) if not pool.empty else pool
                
            # Wrap in pd.DataFrame to resolve type checker warnings
            best_items_df = pd.DataFrame(best_items)
            candidates[key][i] = best_items_df.to_dict("records")

    package_options = {i: [] for i in range(best_c)}
    max_options_to_show = {i: 15 for i in range(best_c)}
    num_rooms = math.ceil(num_persons / MAX_PERSONS_PER_ROOM)
    nights = duration - 1

    for i in range(best_c):
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
                    # Filter awal pakai 1 hari (estimasi kasar); total akurat dihitung post-itinerary
                    cost_wisata = w["Estimasi_Harga"] * duration * num_persons
                    
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

        def get_comb_pref_score(x):
            score = 1.0
            
            w_cat = x["wisata"].get("Kategori_Asli", "")
            h_cat = x["hotel"].get("Kategori_Asli", "")
            k_cat = x["kuliner"].get("Kategori_Asli", "")
            
            if pref_wisata and isinstance(w_cat, str) and w_cat.lower() == pref_wisata.lower():
                score *= 1.30
            if pref_hotel and isinstance(h_cat, str) and h_cat.lower() == pref_hotel.lower():
                score *= 1.30
            if pref_kuliner and isinstance(k_cat, str) and k_cat.lower() == pref_kuliner.lower():
                score *= 1.30
                
            return score

        if i == 0:
            # Hemat: paket termurah yang MENGIKUTI skala budget bila budget diisi.
            # Pada mode flexible, budget selalu None (tanpa budget).
            total_budget = None 
            hemat_target = None
            hemat_key = (lambda x: x["total_cost"]) if hemat_target is None else (lambda x: abs(x["total_cost"] - hemat_target))
            valid_combinations = sorted(valid_combinations, key=lambda x: (x.get("selisih", 0) < 0, -get_comb_pref_score(x), hemat_key(x), x["total_dist"]))
        elif i == best_c - 1:
            # Premium/kelas tertinggi: Personalisasi dengan target budget
            premium_target = None
            premium_key = (lambda x: get_val(x["hotel"], "Estimasi_Harga") if pref_bias < -0.1 else -get_val(x["hotel"], "Estimasi_Harga")) if premium_target is None else (lambda x: abs(x["total_cost"] - premium_target))
            valid_combinations = sorted(
                valid_combinations,
                key=lambda x: (
                    x.get("selisih", 0) < 0, 
                    -get_comb_pref_score(x),
                    premium_key(x),
                    -get_val(x["wisata"], "Rating"), 
                    x["total_dist"]
                )
            )
        else:
            # Balanced: Hybrid rating + jarak dan target budget
            balanced_target = None
            balanced_key = (lambda x: -get_val(x["wisata"], "Rating") * 10 - get_val(x["kuliner"], "Rating") * 2 + x["total_dist"] / 10.0) if balanced_target is None else (lambda x: abs(x["total_cost"] - balanced_target))
            valid_combinations = sorted(
                valid_combinations,
                key=lambda x: (
                    x.get("selisih", 0) < 0, 
                    -get_comb_pref_score(x), 
                    balanced_key(x),
                    -get_val(x["wisata"], "Rating"),
                    x["total_dist"]
                )
            )


        # --- Seleksi Beragam (Diversity Filter) untuk Keberagaman Paket ---
        diverse_combinations = []
        selected_wisata = set()
        selected_hotels = set()
        
        # Phase 1: Unik berdasarkan tempat Wisata Utama
        for combo in valid_combinations:
            w_name = combo["wisata"]["Nama_Tempat"]
            if w_name not in selected_wisata:
                diverse_combinations.append(combo)
                selected_wisata.add(w_name)
                selected_hotels.add(combo["hotel"]["Nama_Tempat"])
                if len(diverse_combinations) >= max_options_to_show[i]:
                    break
                    
        # Phase 2: Jika kurang, boleh wisata sama tapi hotel berbeda
        if len(diverse_combinations) < max_options_to_show[i]:
            for combo in valid_combinations:
                if combo not in diverse_combinations:
                    h_name = combo["hotel"]["Nama_Tempat"]
                    if h_name not in selected_hotels:
                        diverse_combinations.append(combo)
                        selected_hotels.add(h_name)
                        if len(diverse_combinations) >= max_options_to_show[i]:
                            break
                            
        # Phase 3: Jika masih kurang, ambil sisa kombinasi terbaik yang ada
        if len(diverse_combinations) < max_options_to_show[i]:
            for combo in valid_combinations:
                if combo not in diverse_combinations:
                    diverse_combinations.append(combo)
                    if len(diverse_combinations) >= max_options_to_show[i]:
                        break
                        
        package_options[i] = diverse_combinations

    # --- Pemetaan Ke Tab Opsi Alternatif (Hingga 15 Opsi Unik) ---
    max_opts_avail = max((len(package_options[i]) for i in range(best_c)), default=0)
    num_options = min(max_opts_avail, 15)
    if num_options < 1:
        num_options = 1

    options_list = []
    seen_signatures = set()

    for opt_idx in range(num_options):
        packages_for_option = []

        for i, label in cluster_labels.items():
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
            
            w_id_val = w_item.get("Id_Tempat")
            pkg_formatted: dict[str, Any] = {
                "hotel_nama": h_item.get("Nama_Tempat", "N/A") if duration > 1 else "Tanpa Akomodasi (1 Hari)",
                "hotel_md": h_item.get("Membership_Degree", 1.0) if duration > 1 else 1.0,
                "hotel_nama_real": h_item.get("Nama_Tempat", "") if duration > 1 else "",
                "hotel_harga": h_item.get("Estimasi_Harga", 0) if duration > 1 else 0,
                "hotel_rating": h_item.get("Rating", 0.0) if duration > 1 else 0.0,
                "hotel_lat": h_item.get("Latitude", 0.0) if duration > 1 else 0.0,
                "hotel_lon": h_item.get("Longitude", 0.0) if duration > 1 else 0.0,
                "wisata_id": int(float(w_id_val)) if w_id_val is not None and pd.notna(w_id_val) else None,
                "wisata_nama": w_item.get("Nama_Tempat", "N/A"),
                "wisata_md": w_item.get("Membership_Degree", 1.0),
                "wisata_harga": w_item.get("Estimasi_Harga", 0),
                "wisata_rating": w_item.get("Rating", 0.0),
                "wisata_lat": w_item.get("Latitude", 0.0),
                "wisata_lon": w_item.get("Longitude", 0.0),
                
                "kuliner_pagi_nama": k_pagi_item.get("Nama_Tempat", "N/A") if k_pagi_item else "N/A",
                "kuliner_pagi_md": k_pagi_item.get("Membership_Degree", 1.0) if k_pagi_item else 1.0,
                "kuliner_pagi_harga": k_pagi_item.get("Estimasi_Harga", 0) if k_pagi_item else 0,
                "kuliner_pagi_rating": k_pagi_item.get("Rating", 0.0) if k_pagi_item else 0.0,
                "kuliner_pagi_lat": k_pagi_item.get("Latitude", 0.0) if k_pagi_item else 0.0,
                "kuliner_pagi_lon": k_pagi_item.get("Longitude", 0.0) if k_pagi_item else 0.0,
                
                "kuliner_nama": k_item.get("Nama_Tempat", "N/A"),
                "kuliner_md": k_item.get("Membership_Degree", 1.0),
                "kuliner_harga": k_item.get("Estimasi_Harga", 0),
                "kuliner_rating": k_item.get("Rating", 0.0),
                "kuliner_lat": k_item.get("Latitude", 0.0),
                "kuliner_lon": k_item.get("Longitude", 0.0),
                
                "kuliner_malam_nama": k_malam_item.get("Nama_Tempat", "N/A") if k_malam_item else "N/A",
                "kuliner_malam_md": k_malam_item.get("Membership_Degree", 1.0) if k_malam_item else 1.0,
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
            
            # pkg_formatted["additional_facilities"] akan di-set di bawah setelah itinerary terbentuk
            
            # --- RENCANA PERJALANAN HARIAN DINAMIS (DAY-BY-DAY ITINERARY VARIATION) ---
            if duration > 1:
                itinerary = []
                w_list = candidates["wisata"][i]
                k_list = candidates["kuliner"][i]
                hotel_list = candidates["hotel"][i]
                h_item = selected["hotel"]
                if len(hotel_list) > 1:
                    hotel_seq = build_hotel_sequence_by_proximity(h_item, hotel_list, nights)
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
                    w_var_id = w_var.get("Id_Tempat") if w_var else None
                    itinerary.append({
                        "day": d,
                        "wisata_id": int(float(w_var_id)) if w_var_id is not None and pd.notna(w_var_id) else None,
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
            recalculate_pkg_legs(pkg_formatted, pkg_formatted["itinerary"], num_persons, transport_mode)

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

            # Recalculate total wisata cost dynamically based on actual daily itinerary
            total_wisata = 0.0
            wisata_names = []
            for day in itinerary_list:
                day_dict = cast(dict, day)
                w_name = day_dict.get("wisata")
                w_price = float(day_dict.get("wisata_harga") or 0.0)
                total_wisata += w_price * float(num_persons)
                if w_name and w_name != "N/A":
                    if w_name not in wisata_names:
                        wisata_names.append(w_name)
            cost_w = total_wisata
            pkg_formatted["cost_wisata"] = cost_w
            pkg_formatted["wisata_nama"] = " & ".join(wisata_names) if wisata_names else "N/A"

            cost_k = total_kuliner
            cost_t = float(pkg_formatted["cost_transport"])

            pkg_formatted["cost_akomodasi"] = cost_h
            pkg_formatted["cost_hotel"] = cost_h
            pkg_formatted["cost_kuliner"] = cost_k
            pkg_formatted["total_cost"] = cost_h + cost_w + cost_k + cost_t

            # Post-process to adjust wisata_harga to pure price in itinerary and package
            pkg_formatted["wisata_harga"] = _get_pure_wisata_price(w_item, datasets["wisata"])
            for day in itinerary_list:
                day_dict = cast(dict, day)
                day_dict["wisata_harga"] = _get_pure_wisata_price(day_dict, datasets["wisata"])

            pkg_formatted["additional_facilities"] = _get_all_additional_facilities_for_itinerary(pkg_formatted.get("itinerary", []), datasets["wisata"])
            packages_for_option.append(pkg_formatted)

        # Enforce uniqueness of option combinations
        sorted_pkgs = sorted(packages_for_option, key=lambda x: x.get("cluster_id", 0))
        sig = tuple((p.get("hotel_nama_real", ""), p.get("wisata_nama", ""), p.get("kuliner_nama", "")) for p in sorted_pkgs)

        if sig not in seen_signatures:
            seen_signatures.add(sig)
            options_list.append({
                "option_index": len(options_list) + 1,
                "packages": sorted_pkgs,
                "best_c": best_c,
                "cluster_labels": cluster_labels,
                "clustered_items": {
                    "hotel": {i: candidates["hotel"][i] for i in range(best_c)},
                    "wisata": {i: candidates["wisata"][i] for i in range(best_c)},
                    "kuliner": {i: candidates["kuliner"][i] for i in range(best_c)}
                }
            })

    # --- Re-sort Opsi berdasarkan jumlah paket over budget ---
    options_list = sorted(options_list, key=lambda opt: sum(1 for p in opt["packages"] if p.get("budget_remaining") is not None and p["budget_remaining"] < 0))
    for idx, opt in enumerate(options_list):
        opt["option_index"] = idx + 1

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
        "hotel_cntr": clustered.get("hotel", {}).get("cntr") if "hotel" in clustered else None,
        "wisata_cntr": clustered.get("wisata", {}).get("cntr") if "wisata" in clustered else None,
        "kuliner_cntr": clustered.get("kuliner", {}).get("cntr") if "kuliner" in clustered else None,
    }

    show_recommendation_scatter(clustered, options_list, 'Flexible Workflow')
    return options_list

# ============================================================
# 5. GENERATE PAKET DESTINASI (DESTINATION-FIRST WORKFLOW)
# ============================================================
def generate_destination_first_packages(locked_wisata_id, num_persons, duration, datasets,
                                        total_budget=None, api_key=None, verbose=True,
                                        transport_mode=None, hotel_mode='same',
                                        pref_hemat=0.33, pref_balanced=0.33, pref_premium=0.34, user_id='guest',
                                        pref_wisata='', pref_hotel='', pref_kuliner=''):
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

    if api_key is None:
        api_key = GOOGLE_MAPS_API_KEY

    # Deterministic Seed untuk Top-N Random Sampling
    seed_str = f"DEST_{user_id}_{total_budget}_{duration}_{num_persons}_{locked_wisata_id}"
    base_seed = int(hashlib.md5(seed_str.encode()).hexdigest(), 16) % (2**32 - 1)

    # Cari destinasi wisata yg dikunci (Copy dan klaster untuk menghindari KeyError pada Cluster)
    df_wisata = datasets["wisata"].copy()
    prices_wis = df_wisata["Estimasi_Harga"].values
    try:
        res_wis = run_multi_attribute_fcm(df_wisata, n_clusters=3, workflow='flexible')
        df_wisata["Cluster"] = res_wis["labels"]
        u_matrix = res_wis["u"]
        df_wisata["Membership_Degree"] = [float(u_matrix[res_wis["labels"][j], j]) for j in range(len(prices_wis))]
        
        # Fuzzy preference score calculation for personalization
        w_list = get_pref_weights(3, pref_hemat, pref_balanced, pref_premium)
        df_wisata["Fuzzy_Score"] = [sum(w_list[k] * u_matrix[k, j] for k in range(3)) for j in range(len(df_wisata))]
        
        df_wisata["Kategori"] = df_wisata["Cluster"].map(CLUSTER_LABELS)
    except Exception as e:
        df_wisata["Cluster"] = 0
        df_wisata["Membership_Degree"] = 1.0
        df_wisata["Fuzzy_Score"] = 1.0
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

    # --- Auto-c: Tentukan jumlah klaster optimal ---
    dest_datasets_prices = {cat: datasets[cat]["Estimasi_Harga"].values for cat in ["hotel", "kuliner"]}
    if total_budget is not None:
        best_c = find_best_c_for_budget(dest_datasets_prices, total_budget, verbose=False)
    else:
        best_c = find_best_c_offline(dest_datasets_prices, verbose=False)
    cluster_labels = get_cluster_labels(best_c)
    ratios_dest = get_ratio_scheme(best_c)

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
            res = run_multi_attribute_fcm(df, n_clusters=best_c, workflow='flexible')
            df_c = df.copy()
            df_c["Cluster"] = res["labels"]
            u_matrix = res["u"]
            df_c["Membership_Degree"] = [float(u_matrix[res["labels"][j], j]) for j in range(len(prices))]
            df_c["Kategori"] = df_c["Cluster"].map(cluster_labels)
            df_c["Region"] = df_c.apply(lambda row: classify_region(row.get("Latitude", 0), row.get("Longitude", 0)), axis=1)
            
            # Fuzzy preference score calculation for personalization
            w_list = get_pref_weights(best_c, pref_hemat, pref_balanced, pref_premium)
            df_c["Fuzzy_Score"] = [sum(w_list[k] * u_matrix[k, j] for k in range(best_c)) for j in range(len(df_c))]

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
            res = run_multi_attribute_fcm(df, anchor, n_clusters=best_c, workflow='destination')
            df_c = df.copy()
            df_c["Cluster"] = res["labels"]
            u_matrix = res["u"]
            df_c["Membership_Degree"] = [float(u_matrix[res["labels"][j], j]) for j in range(len(prices))]
            df_c["Kategori"] = df_c["Cluster"].map(cluster_labels)
            df_c["Region"] = df_c.apply(lambda row: classify_region(row.get("Latitude", 0), row.get("Longitude", 0)), axis=1)
            
            # Fuzzy preference score calculation for personalization
            w_list = get_pref_weights(best_c, pref_hemat, pref_balanced, pref_premium)
            df_c["Fuzzy_Score"] = [sum(w_list[k] * u_matrix[k, j] for k in range(best_c)) for j in range(len(df_c))]

            clustered[cat_name] = {"df": df_c, "cntr": res["cntr"]}

    candidates = {
        "hotel": {i: [] for i in range(best_c)},
        "kuliner": {i: [] for i in range(best_c)},
        "wisata": {i: [] for i in range(best_c)}
    }

    # Saring kandidat per kategori dan per klaster kelas (0=Hemat, 1=Balanced, 2=Premium)
    # Hitung Preference Bias (-1.0 to 1.0)
    pref_bias = pref_premium - pref_hemat

    for key in ["hotel", "kuliner"]:
        df = clustered[key]["df"]
        cntrs = clustered[key]["cntr"]
        
        # Calculate target prices subjective to budget if budget exists.
        # ratios_dest sudah didefinisikan tanpa syarat di awal fungsi (selalu tuple),
        # jadi di sini cukup tentukan anchor per-kategori.
        if total_budget is not None:
            anchor = anchor_hotel if key == "hotel" else anchor_kul
        else:
            anchor = None

        for i in range(best_c):
            items_in_c = df[df["Cluster"] == i].copy()
            base_target = anchor * ratios_dest[i] if anchor is not None and ratios_dest is not None else cntrs[i]
            # Geser target price berdasarkan pref_bias (max 20% shift)
            target_price = base_target * (1.0 + (pref_bias * 0.20))
            
            best_items_list = []
            regions = ["Kota Batu", "Kota Malang", "Kabupaten Malang"]
            for region in regions:
                items_in_region = items_in_c[items_in_c["Region"] == region] if not items_in_c.empty else df[df["Region"] == region]
                if not items_in_region.empty:
                    items_in_region_cp = items_in_region.copy()
                    items_in_region_cp["distance_to_target"] = (items_in_region_cp["Estimasi_Harga"] - target_price).abs()
                    # PERBAIKAN: Top-N Stochastic Pool Sampling
                    sorted_items = items_in_region_cp.sort_values(
                        by=["distance_to_target", "Membership_Degree"], 
                        ascending=[True, False]
                    )
                    pool = sorted_items.head(25)
                    if not pool.empty:
                        sample_size = min(8, len(pool))
                        local_seed = (base_seed + hash(key) + i + hash(region)) % (2**32 - 1)
                        best_items_list.append(pool.sample(n=sample_size, random_state=local_seed))
            
            if best_items_list:
                best_items = pd.concat(best_items_list)
            else:
                if items_in_c.empty:
                    df["distance_to_target"] = (df["Estimasi_Harga"] - target_price).abs()
                    sorted_items = df.sort_values(by=["distance_to_target", "Membership_Degree"], ascending=[True, False])
                    pool = sorted_items.head(30)
                    local_seed = (base_seed + hash(key) + i) % (2**32 - 1)
                    best_items = pool.sample(n=min(15, len(pool)), random_state=local_seed) if not pool.empty else pool
                else:
                    items_in_c["distance_to_target"] = (items_in_c["Estimasi_Harga"] - target_price).abs()
                    sorted_items = items_in_c.sort_values(by=["distance_to_target", "Membership_Degree"], ascending=[True, False])
                    pool = sorted_items.head(30)
                    local_seed = (base_seed + hash(key) + i) % (2**32 - 1)
                    best_items = pool.sample(n=min(15, len(pool)), random_state=local_seed) if not pool.empty else pool
                
            # Wrap in pd.DataFrame to resolve type checker warnings
            best_items_df = pd.DataFrame(best_items)
            candidates[key][i] = best_items_df.to_dict("records")

    for i in range(best_c):
        wisatas_in_c = df_wisata[df_wisata["Cluster"] == i].copy()
        if wisatas_in_c.empty:
            sorted_items = df_wisata.sort_values(by=["Membership_Degree", "Estimasi_Harga"], ascending=[False, True])
            best_items = sorted_items.head(15)
        else:
            sorted_items = wisatas_in_c.sort_values(by=["Membership_Degree", "Estimasi_Harga"], ascending=[False, True])
            best_items = sorted_items.head(15)
        # Wrap in pd.DataFrame to resolve type checker warnings
        best_items_df = pd.DataFrame(best_items)
        candidates["wisata"][i] = best_items_df.to_dict("records")

    package_options = {i: [] for i in range(best_c)}
    max_options_to_show = {i: 15 for i in range(best_c)}
    num_rooms = math.ceil(num_persons / MAX_PERSONS_PER_ROOM)
    nights = duration - 1

    for i in range(best_c):
        hotel_list = candidates["hotel"][i]
        kuliner_list = candidates["kuliner"][i]
        
        valid_combinations = []
        
        for h in hotel_list:
            for k in kuliner_list:
                # A. Hitung Biaya Akomodasi
                if duration > 1:
                    if hotel_mode == 'split' and len(hotel_list) > 1:
                        hotel_seq = build_hotel_sequence_by_proximity(h, hotel_list, nights)
                        cost_hotel = sum(ht["Estimasi_Harga"] for ht in hotel_seq) * num_rooms
                    else:
                        cost_hotel = h["Estimasi_Harga"] * nights * num_rooms
                else:
                    cost_hotel = 0
                    
                # B. Hitung Biaya Wisata
                # Filter awal pakai 1 hari (estimasi kasar); total akurat dihitung post-itinerary
                cost_wisata = best_wisata["Estimasi_Harga"] * duration * num_persons
                
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

        def get_comb_pref_score(x):
            score = 1.0
            
            w_cat = x["wisata"].get("Kategori_Asli", "")
            h_cat = x["hotel"].get("Kategori_Asli", "")
            k_cat = x["kuliner"].get("Kategori_Asli", "")
            
            if pref_wisata and isinstance(w_cat, str) and w_cat.lower() == pref_wisata.lower():
                score *= 1.30
            if pref_hotel and isinstance(h_cat, str) and h_cat.lower() == pref_hotel.lower():
                score *= 1.30
            if pref_kuliner and isinstance(k_cat, str) and k_cat.lower() == pref_kuliner.lower():
                score *= 1.30
                
            return score

        if i == 0:
            # Hemat: paket termurah yang MENGIKUTI skala budget bila budget diisi.
            # Jika budget None (mode destinasi tanpa budget), tetap pilih termurah.
            hemat_target = total_budget * ratios_dest[0] if total_budget is not None else None
            hemat_key = (lambda x: x["total_cost"]) if hemat_target is None else (lambda x: abs(x["total_cost"] - hemat_target))
            valid_combinations = sorted(valid_combinations, key=lambda x: (x.get("selisih", 0) < 0, -get_comb_pref_score(x), hemat_key(x), x["total_dist"]))
        elif i == best_c - 1:
            # Premium/kelas tertinggi: Personalisasi dengan target budget
            premium_target = total_budget * ratios_dest[-1] if total_budget is not None else None
            premium_key = (lambda x: get_val(x["hotel"], "Estimasi_Harga") if pref_bias < -0.1 else -get_val(x["hotel"], "Estimasi_Harga")) if premium_target is None else (lambda x: abs(x["total_cost"] - premium_target))
            valid_combinations = sorted(
                valid_combinations,
                key=lambda x: (
                    x.get("selisih", 0) < 0,
                    -get_comb_pref_score(x),
                    premium_key(x),
                    -get_val(x["wisata"], "Rating"),
                    x["total_dist"]
                )
            )
        else:
            # Balanced: Hybrid rating + jarak dan target budget
            balanced_target = total_budget * ratios_dest[i] if total_budget is not None else None
            balanced_key = (lambda x: -get_val(x["wisata"], "Rating") * 10 - get_val(x["kuliner"], "Rating") * 2 + x["total_dist"] / 10.0) if balanced_target is None else (lambda x: abs(x["total_cost"] - balanced_target))
            valid_combinations = sorted(
                valid_combinations,
                key=lambda x: (
                    x.get("selisih", 0) < 0, 
                    -get_comb_pref_score(x), 
                    balanced_key(x),
                    -get_val(x["wisata"], "Rating"),
                    x["total_dist"]
                )
            )


        # Fallback jika kosong (diselaraskan eksak dengan uji_gabungan.py)
        if total_budget is not None and not valid_combinations:
            min_cost_comb = None
            min_cost = float('inf')
            for h in hotel_list[:15]:
                for k in kuliner_list[:15]:
                    if duration > 1:
                        if hotel_mode == 'split' and len(hotel_list) > 1:
                            hotel_seq = build_hotel_sequence_by_proximity(h, hotel_list, nights)
                            cost_hotel = sum(ht["Estimasi_Harga"] for ht in hotel_seq) * num_rooms
                        else:
                            cost_hotel = h["Estimasi_Harga"] * nights * num_rooms
                    else:
                        cost_hotel = 0
                    # Filter awal pakai 1 hari (estimasi kasar)
                    cost_wisata = best_wisata["Estimasi_Harga"] * duration * num_persons
                    
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

        # --- Seleksi Beragam (Diversity Filter) untuk Keberagaman Paket ---
        diverse_combinations = []
        selected_hotels = set()
        selected_kuliner = set()
        
        # Phase 1: Unik berdasarkan Hotel
        for combo in valid_combinations:
            h_name = combo["hotel"]["Nama_Tempat"]
            if h_name not in selected_hotels:
                diverse_combinations.append(combo)
                selected_hotels.add(h_name)
                selected_kuliner.add(combo["kuliner"]["Nama_Tempat"])
                if len(diverse_combinations) >= max_options_to_show[i]:
                    break
                    
        # Phase 2: Jika kurang, boleh hotel sama tapi kuliner berbeda
        if len(diverse_combinations) < max_options_to_show[i]:
            for combo in valid_combinations:
                if combo not in diverse_combinations:
                    k_name = combo["kuliner"]["Nama_Tempat"]
                    if k_name not in selected_kuliner:
                        diverse_combinations.append(combo)
                        selected_kuliner.add(k_name)
                        if len(diverse_combinations) >= max_options_to_show[i]:
                            break
                            
        # Phase 3: Jika masih kurang, ambil sisa kombinasi terbaik yang ada
        if len(diverse_combinations) < max_options_to_show[i]:
            for combo in valid_combinations:
                if combo not in diverse_combinations:
                    diverse_combinations.append(combo)
                    if len(diverse_combinations) >= max_options_to_show[i]:
                        break
                        
        package_options[i] = diverse_combinations

    # --- Pemetaan Ke Tab Opsi Alternatif (Hingga 15 Opsi Unik) ---
    max_opts_avail = max((len(package_options[i]) for i in range(best_c)), default=0)
    num_options = min(max_opts_avail, 15)
    if num_options < 1:
        num_options = 1

    options_list = []
    seen_signatures = set()

    for opt_idx in range(num_options):
        packages_for_option = []

        for i, label in cluster_labels.items():
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
            
            w_id_val = w_item.get("Id_Tempat")
            pkg_formatted: dict[str, Any] = {
                "hotel_nama": h_item.get("Nama_Tempat", "N/A") if duration > 1 else "Tanpa Akomodasi (1 Hari)",
                "hotel_md": h_item.get("Membership_Degree", 1.0) if duration > 1 else 1.0,
                "hotel_nama_real": h_item.get("Nama_Tempat", "") if duration > 1 else "",
                "hotel_harga": h_item.get("Estimasi_Harga", 0) if duration > 1 else 0,
                "hotel_rating": h_item.get("Rating", 0.0) if duration > 1 else 0.0,
                "hotel_lat": h_item.get("Latitude", 0.0) if duration > 1 else 0.0,
                "hotel_lon": h_item.get("Longitude", 0.0) if duration > 1 else 0.0,
                "wisata_id": int(float(w_id_val)) if w_id_val is not None and pd.notna(w_id_val) else None,
                "wisata_nama": w_item.get("Nama_Tempat", "N/A"),
                "wisata_md": w_item.get("Membership_Degree", 1.0),
                "wisata_harga": w_item.get("Estimasi_Harga", 0),
                "wisata_rating": w_item.get("Rating", 0.0),
                "wisata_lat": w_item.get("Latitude", 0.0),
                "wisata_lon": w_item.get("Longitude", 0.0),
                
                "kuliner_pagi_nama": k_pagi_item.get("Nama_Tempat", "N/A") if k_pagi_item else "N/A",
                "kuliner_pagi_md": k_pagi_item.get("Membership_Degree", 1.0) if k_pagi_item else 1.0,
                "kuliner_pagi_harga": k_pagi_item.get("Estimasi_Harga", 0) if k_pagi_item else 0,
                "kuliner_pagi_rating": k_pagi_item.get("Rating", 0.0) if k_pagi_item else 0.0,
                "kuliner_pagi_lat": k_pagi_item.get("Latitude", 0.0) if k_pagi_item else 0.0,
                "kuliner_pagi_lon": k_pagi_item.get("Longitude", 0.0) if k_pagi_item else 0.0,
                
                "kuliner_nama": k_item.get("Nama_Tempat", "N/A"),
                "kuliner_md": k_item.get("Membership_Degree", 1.0),
                "kuliner_harga": k_item.get("Estimasi_Harga", 0),
                "kuliner_rating": k_item.get("Rating", 0.0),
                "kuliner_lat": k_item.get("Latitude", 0.0),
                "kuliner_lon": k_item.get("Longitude", 0.0),
                
                "kuliner_malam_nama": k_malam_item.get("Nama_Tempat", "N/A") if k_malam_item else "N/A",
                "kuliner_malam_md": k_malam_item.get("Membership_Degree", 1.0) if k_malam_item else 1.0,
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
            
            # pkg_formatted["additional_facilities"] akan di-set di bawah setelah itinerary terbentuk
            
            # --- RENCANA PERJALANAN HARIAN DINAMIS (DAY-BY-DAY ITINERARY VARIATION) ---
            if duration > 1:
                itinerary = []
                df_wis = df_wisata
                wisatas_in_c = df_wis[df_wis["Cluster"] == i]
                wisatas_in_c_df = pd.DataFrame(wisatas_in_c)
                w_list = wisatas_in_c_df.to_dict("records") if not wisatas_in_c_df.empty else [best_wisata]
                k_list = candidates["kuliner"][i]
                hotel_list = candidates["hotel"][i]
                
                # If hotel mode is split, we also track different hotels
                if hotel_mode == 'split' and len(hotel_list) > 1:
                    h_list = candidates["hotel"][i]
                    h_idx = 0
                    for idx, ht in enumerate(h_list):
                        if ht["Nama_Tempat"] == h_item.get("Nama_Tempat", ""):
                            h_idx = idx
                            break
                    hotel_seq = build_hotel_sequence_by_proximity(h_list[h_idx], h_list, nights)
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
                        
                    w_var_id = w_var.get("Id_Tempat") if w_var else None
                    itinerary.append({
                        "day": d,
                        "wisata_id": int(float(w_var_id)) if w_var_id is not None and pd.notna(w_var_id) else None,
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
            recalculate_pkg_legs(pkg_formatted, pkg_formatted["itinerary"], num_persons, transport_mode)

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

            # Recalculate total wisata cost dynamically based on actual daily itinerary
            total_wisata = 0.0
            wisata_names = []
            for day in itinerary_list:
                day_dict = cast(dict, day)
                w_name = day_dict.get("wisata")
                w_price = float(day_dict.get("wisata_harga") or 0.0)
                total_wisata += w_price * float(num_persons)
                if w_name and w_name != "N/A":
                    if w_name not in wisata_names:
                        wisata_names.append(w_name)
            cost_w = total_wisata
            pkg_formatted["cost_wisata"] = cost_w
            pkg_formatted["wisata_nama"] = " & ".join(wisata_names) if wisata_names else "N/A"

            cost_k = total_kuliner
            cost_t = float(pkg_formatted["cost_transport"])

            pkg_formatted["cost_akomodasi"] = cost_h
            pkg_formatted["cost_hotel"] = cost_h
            pkg_formatted["cost_kuliner"] = cost_k
            pkg_formatted["total_cost"] = cost_h + cost_w + cost_k + cost_t

            # Post-process to adjust wisata_harga to pure price in itinerary and package
            pkg_formatted["wisata_harga"] = _get_pure_wisata_price(w_item, datasets["wisata"])
            for day in itinerary_list:
                day_dict = cast(dict, day)
                day_dict["wisata_harga"] = _get_pure_wisata_price(day_dict, datasets["wisata"])

            if total_budget is not None and total_budget > 0:
                pkg_formatted["budget_input"] = total_budget
                pkg_formatted["budget_remaining"] = round(total_budget - pkg_formatted["total_cost"], 2)
            else:
                pkg_formatted["budget_input"] = None
                pkg_formatted["budget_remaining"] = None

            pkg_formatted["additional_facilities"] = _get_all_additional_facilities_for_itinerary(pkg_formatted.get("itinerary", []), datasets["wisata"])
            packages_for_option.append(pkg_formatted)

        # Enforce uniqueness of option combinations
        sorted_pkgs = sorted(packages_for_option, key=lambda x: x.get("cluster_id", 0))
        sig = tuple((p.get("hotel_nama_real", ""), p.get("wisata_nama", ""), p.get("kuliner_nama", "")) for p in sorted_pkgs)

        if sig not in seen_signatures:
            seen_signatures.add(sig)
            options_list.append({
                "option_index": len(options_list) + 1,
                "packages": sorted_pkgs,
                "best_c": best_c,
                "cluster_labels": cluster_labels,
                "clustered_items": {
                    "hotel": {i: candidates["hotel"][i] for i in range(best_c)},
                    "wisata": {i: candidates["wisata"][i] for i in range(best_c)},
                    "kuliner": {i: candidates["kuliner"][i] for i in range(best_c)}
                }
            })

    # --- Re-sort Opsi berdasarkan jumlah paket over budget ---
    options_list = sorted(options_list, key=lambda opt: sum(1 for p in opt["packages"] if p.get("budget_remaining") is not None and p["budget_remaining"] < 0))
    for idx, opt in enumerate(options_list):
        opt["option_index"] = idx + 1

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
        "hotel_cntr": clustered.get("hotel", {}).get("cntr") if "hotel" in clustered else None,
        "wisata_cntr": clustered.get("wisata", {}).get("cntr") if "wisata" in clustered else None,
        "kuliner_cntr": clustered.get("kuliner", {}).get("cntr") if "kuliner" in clustered else None,
    }

    show_recommendation_scatter(clustered, options_list, 'Destination-First Workflow')
    return options_list


# ============================================================
# 6. EXPORT HASIL REKOMENDASI KE EXCEL
# ============================================================
def export_to_excel_recom(options_list, workflow, budget, persons, duration):
    """
    Mengekspor hasil kombinasi rute rekomendasi ke dalam berkas Excel (.xlsx).
    Sheet 1: Menampilkan item secara detail (Opsi, Item, Harga, Membership Degree) beserta info centroid.
    Sheet 2: Menampilkan breakdown itinerary dan total cost.
    """
    import datetime
    import os
    import pandas as pd
    from config import OUTPUT_DIR
    from typing import Any, cast
    
    def get_fuzzy_score_from_lookup(name, category):
        if LAST_CLUSTERED is None or not name or name == "N/A" or name == "Checkout" or name == "Tanpa Akomodasi (One Day Trip)":
            return 0.0
        df = LAST_CLUSTERED.get(category)
        if df is None or df.empty or 'Fuzzy_Score' not in df.columns:
            return 0.0
            
        names = [n.strip() for n in name.split(" & ")]
        scores = []
        for n in names:
            matched = df[df['Nama_Tempat'] == n]
            if not matched.empty:
                scores.append(float(matched.iloc[0]['Fuzzy_Score']))
                
        if scores:
            return sum(scores) / len(scores)
        return 0.0

    # 1. Definisikan folder output
    out_folder = os.path.join(OUTPUT_DIR, "hasil-rekomendasi")
    os.makedirs(out_folder, exist_ok=True)
    
    # 2. Bangun nama file
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    budget_str = f"{int(budget)}" if budget else "tanpa_budget"
    filename = f"rekomendasi_{workflow}_{timestamp}_b{budget_str}_p{persons}_d{duration}.xlsx"
    filepath = os.path.join(out_folder, filename)
    
    # 3. Data Metadata / Input User & Centroid
    def format_cntr(cntr):
        if cntr is None or len(cntr) == 0: return "N/A"
        try:
            import numpy as np
            flat_cntr = np.ravel(cntr)
            
            c = len(flat_cntr)
            if c == 2:
                labels = ["Hemat", "Premium"]
            elif c == 3:
                labels = ["Hemat", "Balanced", "Premium"]
            elif c == 4:
                labels = ["Hemat", "Balanced", "Premium", "Luxury"]
            else:
                labels = [f"Kelas {i+1}" for i in range(c)]
                
            parts = []
            for i, val in enumerate(flat_cntr):
                label = labels[i] if i < len(labels) else f"Kelas {i+1}"
                parts.append(f"{label}: Rp {int(val):,.0f}")
                
            return " | ".join(parts)
        except Exception:
            return str(cntr)
            
    global LAST_CLUSTERED
    hotel_cntr_str = format_cntr(LAST_CLUSTERED.get("hotel_cntr", [])) if LAST_CLUSTERED else "N/A"
    wisata_cntr_str = format_cntr(LAST_CLUSTERED.get("wisata_cntr", [])) if LAST_CLUSTERED else "N/A"
    kuliner_cntr_str = format_cntr(LAST_CLUSTERED.get("kuliner_cntr", [])) if LAST_CLUSTERED else "N/A"
    
    meta_rows = [
        {"Informasi": "Input Workflow", "Nilai": workflow.upper()},
        {"Informasi": "Input Budget", "Nilai": f"Rp {budget:,.0f}" if budget else "Tanpa Budget"},
        {"Informasi": "Input Peserta", "Nilai": f"{persons} Orang"},
        {"Informasi": "Input Durasi", "Nilai": f"{duration} Hari"},
        {"Informasi": "Centroid Hotel", "Nilai": hotel_cntr_str},
        {"Informasi": "Centroid Wisata", "Nilai": wisata_cntr_str},
        {"Informasi": "Centroid Kuliner", "Nilai": kuliner_cntr_str},
    ]
    df_meta = pd.DataFrame(meta_rows)
    
    # 4. Sheet 1: Detail Item Per Package
    item_rows = []
    for opt in options_list:
        opt_idx = opt["option_index"]
        for pkg in opt["packages"]:
            kelas = pkg.get("kategori", "N/A").upper()
            base_row = {
                "Opsi": f"Opsi {opt_idx}",
                "Kelas Paket": kelas
            }
            
            # Calculate item fuzzy scores using lookup helper
            h_fs = round(get_fuzzy_score_from_lookup(pkg.get("hotel_nama"), "hotel"), 4)
            w_fs = round(get_fuzzy_score_from_lookup(pkg.get("wisata_nama"), "wisata"), 4)
            kp_fs = round(get_fuzzy_score_from_lookup(pkg.get("kuliner_pagi_nama"), "kuliner"), 4)
            ks_fs = round(get_fuzzy_score_from_lookup(pkg.get("kuliner_nama"), "kuliner"), 4)
            km_fs = round(get_fuzzy_score_from_lookup(pkg.get("kuliner_malam_nama"), "kuliner"), 4)
            
            # Compute average package fuzzy score (using only included items)
            fs_list = []
            if duration > 1:
                fs_list.append(h_fs)
            if pkg.get("wisata_nama") and pkg.get("wisata_nama") != "N/A":
                fs_list.append(w_fs)
            if pkg.get("kuliner_pagi_nama") and pkg.get("kuliner_pagi_nama") != "N/A":
                fs_list.append(kp_fs)
            if pkg.get("kuliner_nama") and pkg.get("kuliner_nama") != "N/A":
                fs_list.append(ks_fs)
            if duration > 1 and pkg.get("kuliner_malam_nama") and pkg.get("kuliner_malam_nama") != "N/A":
                fs_list.append(km_fs)
                
            paket_fs = round(sum(fs_list) / len(fs_list), 4) if fs_list else 0.0
            
            # Calculate item FPCs (which are their membership degrees in target cluster)
            h_fpc = round(float(pkg.get("hotel_md") or 1.0), 4)
            w_fpc = round(float(pkg.get("wisata_md") or 1.0), 4)
            kp_fpc = round(float(pkg.get("kuliner_pagi_md") or 1.0), 4)
            ks_fpc = round(float(pkg.get("kuliner_md") or 1.0), 4)
            km_fpc = round(float(pkg.get("kuliner_malam_md") or 1.0), 4)
            
            # Compute average package FPC (using only included items)
            fpc_list = []
            if duration > 1:
                fpc_list.append(h_fpc)
            if pkg.get("wisata_nama") and pkg.get("wisata_nama") != "N/A":
                fpc_list.append(w_fpc)
            if pkg.get("kuliner_pagi_nama") and pkg.get("kuliner_pagi_nama") != "N/A":
                fpc_list.append(kp_fpc)
            if pkg.get("kuliner_nama") and pkg.get("kuliner_nama") != "N/A":
                fpc_list.append(ks_fpc)
            if duration > 1 and pkg.get("kuliner_malam_nama") and pkg.get("kuliner_malam_nama") != "N/A":
                fpc_list.append(km_fpc)
                
            paket_fpc = round(sum(fpc_list) / len(fpc_list), 4) if fpc_list else 0.0
            
            # Hotel
            row_h = base_row.copy()
            row_h.update({
                "Tipe Item": "Hotel",
                "Nama Tempat": pkg.get("hotel_nama", "N/A"),
                "Estimasi Harga": pkg.get("hotel_harga", 0),
                "Membership Degree": pkg.get("hotel_md", 1.0),
                "Fuzzy Score Item": h_fs if duration > 1 else "",
                "Fuzzy Score Paket": paket_fs,
                "FPC Item": h_fpc if duration > 1 else "",
                "FPC Paket": paket_fpc
            })
            item_rows.append(row_h)
            
            # Wisata
            row_w = base_row.copy()
            row_w.update({
                "Tipe Item": "Wisata",
                "Nama Tempat": pkg.get("wisata_nama", "N/A"),
                "Estimasi Harga": pkg.get("wisata_harga", 0),
                "Membership Degree": pkg.get("wisata_md", 1.0),
                "Fuzzy Score Item": w_fs,
                "Fuzzy Score Paket": paket_fs,
                "FPC Item": w_fpc,
                "FPC Paket": paket_fpc
            })
            item_rows.append(row_w)
            
            # Kuliner Pagi
            row_kp = base_row.copy()
            row_kp.update({
                "Tipe Item": "Makan Pagi",
                "Nama Tempat": pkg.get("kuliner_pagi_nama", "N/A"),
                "Estimasi Harga": pkg.get("kuliner_pagi_harga", 0),
                "Membership Degree": pkg.get("kuliner_pagi_md", 1.0),
                "Fuzzy Score Item": kp_fs if pkg.get("kuliner_pagi_nama") != "N/A" else "",
                "Fuzzy Score Paket": paket_fs,
                "FPC Item": kp_fpc if pkg.get("kuliner_pagi_nama") != "N/A" else "",
                "FPC Paket": paket_fpc
            })
            item_rows.append(row_kp)
            
            # Kuliner Siang
            row_ks = base_row.copy()
            row_ks.update({
                "Tipe Item": "Makan Siang",
                "Nama Tempat": pkg.get("kuliner_nama", "N/A"),
                "Estimasi Harga": pkg.get("kuliner_harga", 0),
                "Membership Degree": pkg.get("kuliner_md", 1.0),
                "Fuzzy Score Item": ks_fs,
                "Fuzzy Score Paket": paket_fs,
                "FPC Item": ks_fpc,
                "FPC Paket": paket_fpc
            })
            item_rows.append(row_ks)
            
            # Kuliner Malam
            if duration > 1:
                row_km = base_row.copy()
                row_km.update({
                    "Tipe Item": "Makan Malam",
                    "Nama Tempat": pkg.get("kuliner_malam_nama", "N/A"),
                    "Estimasi Harga": pkg.get("kuliner_malam_harga", 0),
                    "Membership Degree": pkg.get("kuliner_malam_md", 1.0),
                    "Fuzzy Score Item": km_fs if pkg.get("kuliner_malam_nama") != "N/A" else "",
                    "Fuzzy Score Paket": paket_fs,
                    "FPC Item": km_fpc if pkg.get("kuliner_malam_nama") != "N/A" else "",
                    "FPC Paket": paket_fpc
                })
                item_rows.append(row_km)
                
            # Add an empty row for visual separation between packages
            item_rows.append({
                "Opsi": "", "Kelas Paket": "", "Tipe Item": "", "Nama Tempat": "", 
                "Estimasi Harga": "", "Membership Degree": "", 
                "Fuzzy Score Item": "", "Fuzzy Score Paket": "",
                "FPC Item": "", "FPC Paket": ""
            })

    df_items = pd.DataFrame(item_rows)
    
    # 5. Sheet 2: Detail Itinerary (as before)
    detail_rows = []
    for opt in options_list:
        opt_idx = opt["option_index"]
        for pkg in opt["packages"]:
            kelas = pkg.get("kategori", "N/A").upper()
            opt_label = f"Opsi {opt_idx} - {kelas}"
            
            num_persons = pkg.get("num_persons", persons)
            num_rooms = pkg.get("num_rooms", 0)
            nights = pkg.get("nights", 0)
            duration = pkg.get("duration", duration)
            
            itin = pkg.get("itinerary", [])
            legs = pkg.get("transport_detail", {}).get("legs", [])
            
            detail_rows.append({
                "Opsi & Kelas": opt_label,
                "Hari": "SEMUA HARI",
                "Item / Aktivitas": f"--- DETAIL ITINERARY {opt_label} ---",
                "Detail / Nama Tempat": "-",
                "Biaya (Rp)": 0,
                "Keterangan": f"Durasi {duration} Hari, {num_persons} Orang"
            })
            
            for d_num in range(1, duration + 1):
                day_label = f"Hari {d_num}"
                
                day_dict = {}
                if d_num - 1 < len(itin):
                    day_dict = itin[d_num - 1]
                
                detail_rows.append({
                    "Opsi & Kelas": opt_label,
                    "Hari": day_label,
                    "Item / Aktivitas": f"REKOMENDASI HARI {d_num}",
                    "Detail / Nama Tempat": "",
                    "Biaya (Rp)": 0,
                    "Keterangan": ""
                })
                
                h_name = day_dict.get("hotel", "Checkout")
                h_harga = day_dict.get("hotel_harga", 0)
                detail_rows.append({
                    "Opsi & Kelas": opt_label,
                    "Hari": day_label,
                    "Item / Aktivitas": "Hotel",
                    "Detail / Nama Tempat": h_name,
                    "Biaya (Rp)": h_harga,
                    "Keterangan": "/malam (Status: Checkout)" if h_name == "Checkout" else f"/malam (Status: Menginap)"
                })
                
                w_name = day_dict.get("wisata", "N/A")
                w_harga = day_dict.get("wisata_harga", 0)
                detail_rows.append({
                    "Opsi & Kelas": opt_label,
                    "Hari": day_label,
                    "Item / Aktivitas": "Wisata",
                    "Detail / Nama Tempat": w_name,
                    "Biaya (Rp)": w_harga,
                    "Keterangan": "/orang"
                })
                
                kp_name = day_dict.get("kuliner_pagi", "N/A")
                kp_harga = day_dict.get("kuliner_pagi_harga", 0)
                detail_rows.append({
                    "Opsi & Kelas": opt_label,
                    "Hari": day_label,
                    "Item / Aktivitas": "Makan Pagi",
                    "Detail / Nama Tempat": kp_name,
                    "Biaya (Rp)": kp_harga,
                    "Keterangan": "/orang"
                })
                
                ks_name = day_dict.get("kuliner", "N/A")
                ks_harga = day_dict.get("kuliner_harga", 0)
                detail_rows.append({
                    "Opsi & Kelas": opt_label,
                    "Hari": day_label,
                    "Item / Aktivitas": "Makan Siang",
                    "Detail / Nama Tempat": ks_name,
                    "Biaya (Rp)": ks_harga,
                    "Keterangan": "/orang"
                })
                
                if d_num < duration:
                    km_name = day_dict.get("kuliner_malam", "N/A")
                    km_harga = day_dict.get("kuliner_malam_harga", 0)
                    detail_rows.append({
                        "Opsi & Kelas": opt_label,
                        "Hari": day_label,
                        "Item / Aktivitas": "Makan Malam",
                        "Detail / Nama Tempat": km_name,
                        "Biaya (Rp)": km_harga,
                        "Keterangan": "/orang"
                    })
                
                h_cost_day = h_harga * num_rooms if h_name != "Checkout" else 0
                detail_rows.append({
                    "Opsi & Kelas": opt_label,
                    "Hari": day_label,
                    "Item / Aktivitas": f"• Kamar Hotel ({nights if h_name != 'Checkout' else 0} Malam)" if h_name == "Checkout" else f"• Kamar Hotel (1 Malam)",
                    "Detail / Nama Tempat": "",
                    "Biaya (Rp)": h_cost_day,
                    "Keterangan": ""
                })
                
                w_cost_day = w_harga * num_persons
                detail_rows.append({
                    "Opsi & Kelas": opt_label,
                    "Hari": day_label,
                    "Item / Aktivitas": f"• Tiket Wisata ({num_persons} Orang) (Hari {d_num})",
                    "Detail / Nama Tempat": "",
                    "Biaya (Rp)": w_cost_day,
                    "Keterangan": ""
                })
                
                meals_count = 3 if d_num < duration else 2
                k_cost_day = (kp_harga + ks_harga + (day_dict.get("kuliner_malam_harga", 0) if d_num < duration else 0)) * num_persons
                detail_rows.append({
                    "Opsi & Kelas": opt_label,
                    "Hari": day_label,
                    "Item / Aktivitas": f"• Kuliner ({num_persons} Orang × {meals_count}x Makan)",
                    "Detail / Nama Tempat": "",
                    "Biaya (Rp)": k_cost_day,
                    "Keterangan": ""
                })
                
                day_legs = []
                for leg in legs:
                    l_from = leg.get("from", "")
                    l_to = leg.get("to", "")
                    if f"Hari {d_num}" in l_from or f"Hari {d_num}" in l_to:
                        day_legs.append(leg)
                
                for leg in day_legs:
                    l_from = leg.get("from", "")
                    l_to = leg.get("to", "")
                    dist = leg.get("distance_km", 0)
                    cost = leg.get("cost", 0)
                    veh = leg.get("vehicle", "Motor")
                    detail_rows.append({
                        "Opsi & Kelas": opt_label,
                        "Hari": day_label,
                        "Item / Aktivitas": f"{l_from}→{l_to} ({dist} km)",
                        "Detail / Nama Tempat": "",
                        "Biaya (Rp)": cost,
                        "Keterangan": veh
                    })
                
                t_cost_day = sum(leg.get("cost", 0) for leg in day_legs)
                detail_rows.append({
                    "Opsi & Kelas": opt_label,
                    "Hari": day_label,
                    "Item / Aktivitas": f"• Transportasi ({'Motor' if num_persons <= 1 else 'Mobil'})",
                    "Detail / Nama Tempat": "",
                    "Biaya (Rp)": t_cost_day,
                    "Keterangan": ""
                })
                
                day_subtotal = h_cost_day + w_cost_day + k_cost_day + t_cost_day
                detail_rows.append({
                    "Opsi & Kelas": opt_label,
                    "Hari": day_label,
                    "Item / Aktivitas": f"Subtotal Hari {d_num}:",
                    "Detail / Nama Tempat": "",
                    "Biaya (Rp)": day_subtotal,
                    "Keterangan": ""
                })
            
            detail_rows.append({
                "Opsi & Kelas": opt_label,
                "Hari": "RINGKASAN",
                "Item / Aktivitas": "🏨 Akomodasi (1 malam × 1 kamar)" if nights == 1 and num_rooms == 1 else f"🏨 Akomodasi ({nights} malam × {num_rooms} kamar)",
                "Detail / Nama Tempat": "",
                "Biaya (Rp)": pkg.get("cost_akomodasi", 0),
                "Keterangan": pkg.get("hotel_nama", "")
            })
            
            detail_rows.append({
                "Opsi & Kelas": opt_label,
                "Hari": "RINGKASAN",
                "Item / Aktivitas": f"🎯 Tiket Wisata ({num_persons} orang)",
                "Detail / Nama Tempat": "",
                "Biaya (Rp)": pkg.get("cost_wisata", 0),
                "Keterangan": pkg.get("wisata_nama", "")
            })
            
            total_meals = (duration - 1) * 3 + 2 if duration > 1 else 2
            detail_rows.append({
                "Opsi & Kelas": opt_label,
                "Hari": "RINGKASAN",
                "Item / Aktivitas": f"🍜 Kuliner ({num_persons} orang × {total_meals} makan)",
                "Detail / Nama Tempat": "",
                "Biaya (Rp)": pkg.get("cost_kuliner", 0),
                "Keterangan": ""
            })
            
            veh_desc = pkg.get("transport_detail", {}).get("vehicle", "Motor")
            detail_rows.append({
                "Opsi & Kelas": opt_label,
                "Hari": "RINGKASAN",
                "Item / Aktivitas": f"🚗 Transportasi ({veh_desc})",
                "Detail / Nama Tempat": "",
                "Biaya (Rp)": pkg.get("cost_transport", 0),
                "Keterangan": f"Total Jarak: {pkg.get('transport_detail', {}).get('total_distance_km', 0)} km"
            })
            
            detail_rows.append({
                "Opsi & Kelas": opt_label,
                "Hari": "RINGKASAN",
                "Item / Aktivitas": "TOTAL BIAYA PAKET",
                "Detail / Nama Tempat": "",
                "Biaya (Rp)": pkg.get("total_cost", 0),
                "Keterangan": "Estimasi Total"
            })
            
            detail_rows.append({
                "Opsi & Kelas": "", "Hari": "", "Item / Aktivitas": "", "Detail / Nama Tempat": "", "Biaya (Rp)": "", "Keterangan": ""
            })
            
    df_detail = pd.DataFrame(detail_rows)
    
    with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
        df_meta.to_excel(writer, sheet_name="Rekomendasi Paket", index=False, startrow=0)
        df_items.to_excel(writer, sheet_name="Rekomendasi Paket", index=False, startrow=len(df_meta) + 2)
        df_detail.to_excel(writer, sheet_name="Detail Itinerary & Biaya", index=False)
        
        if LAST_CLUSTERED is not None:
            import numpy as np
            export_dfs = {}
            for name in ["hotel", "wisata", "kuliner"]:
                df_cls = LAST_CLUSTERED.get(name)
                if df_cls is not None and not df_cls.empty:
                    df_cls = df_cls.copy()
                    
                    # 1. Add normalization columns
                    prices_raw = pd.to_numeric(df_cls["Estimasi_Harga"], errors="coerce")
                    prices = cast(Any, prices_raw).fillna(0)
                    df_cls["Normalisasi_Harga"] = (prices - prices.min()) / (prices.max() - prices.min() + 1e-10)
                    
                    if "Rating" in df_cls.columns:
                        ratings_raw = pd.to_numeric(df_cls["Rating"], errors="coerce")
                        ratings = cast(Any, ratings_raw).fillna(4.0)
                    else:
                        ratings = pd.Series(4.0, index=df_cls.index)
                    df_cls["Normalisasi_Rating"] = (ratings - ratings.min()) / (ratings.max() - ratings.min() + 1e-10)
                    
                    if "Nilai_Numerik" in df_cls.columns:
                        categories_raw = pd.to_numeric(df_cls["Nilai_Numerik"], errors="coerce")
                        categories = cast(Any, categories_raw).fillna(0)
                    else:
                        categories = pd.Series(0.0, index=df_cls.index)
                    df_cls["Normalisasi_Nilai_Numerik"] = (categories - categories.min()) / (categories.max() - categories.min() + 1e-10)
                    
                    # 2. Rename columns first
                    cols = df_cls.columns.tolist()
                    if 'Kategori' in cols and 'Kategori_Asli' in cols:
                        df_cls = df_cls.rename(columns={'Kategori': 'klaster', 'Kategori_Asli': 'Kategori'})
                    elif 'Kategori' in cols:
                        df_cls = df_cls.rename(columns={'Kategori': 'klaster'})
                        
                    # 3. Enforce clean, structured column order
                    preferred_order = [
                        # 1. Identitas & Wilayah
                        'Id_Tempat', 'Nama_Tempat', 'Kategori', 'Region',
                        # 2. Spasial
                        'Latitude', 'Longitude',
                        # 3. Fitur Utama
                        'Estimasi_Harga', 'Rating', 'Jumlah_Ulasan', 'Nilai_Numerik',
                        # 4. Normalisasi
                        'Normalisasi_Harga', 'Normalisasi_Rating', 'Normalisasi_Nilai_Numerik',
                        # 5. Output Klastering
                        'Cluster', 'Membership_Degree', 'Fuzzy_Score', 'klaster'
                    ]
                    
                    ordered_cols = []
                    for col in preferred_order:
                        if col in df_cls.columns:
                            ordered_cols.append(col)
                            
                    # Add any remaining columns (links, source metadata, etc.)
                    for col in df_cls.columns:
                        if col not in ordered_cols:
                            ordered_cols.append(col)
                            
                    df_cls = df_cls[ordered_cols]
                    export_dfs[name] = df_cls
            
            df_hotel_export = export_dfs.get("hotel")
            if df_hotel_export is not None and not df_hotel_export.empty:
                df_hotel_export.to_excel(writer, sheet_name="Klaster Hotel (Kustom)", index=False)
            
            df_wisata_export = export_dfs.get("wisata")
            if df_wisata_export is not None and not df_wisata_export.empty:
                df_wisata_export.to_excel(writer, sheet_name="Klaster Wisata (Kustom)", index=False)
            
            df_kuliner_export = export_dfs.get("kuliner")
            if df_kuliner_export is not None and not df_kuliner_export.empty:
                df_kuliner_export.to_excel(writer, sheet_name="Klaster Kuliner (Kustom)", index=False)
                
    print(f"   [Excel Exported with Cluster Sheets] -> {filepath}")
