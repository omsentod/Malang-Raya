

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
    DEFAULT_RATIO_SCHEME,
    get_cluster_labels, get_ratio_scheme,
)
from fcm_clustering import find_best_c_for_budget, find_best_c_offline, run_fcm
from transport_api import haversine_distance, get_osrm_route_distance

import os
import matplotlib.pyplot as plt


def format_rupiah_ticks(x, pos):
    if x >= 1_000_000:
        val = x / 1_000_000
        return f"{val:.1f} Jt" if val % 1 != 0 else f"{int(val)} Jt"
    elif x >= 1_000:
        val = x / 1_000
        return f"{val:.1f} Rb" if val % 1 != 0 else f"{int(val)} Rb"
    return str(int(x))

def plot_clustering_before_after(df_clustered, kategori="Hotel"):
    """
    df_clustered : dataframe hasil klasterisasi (kolom Estimasi_Harga, Cluster, Kategori)
    """
    if df_clustered is None or df_clustered.empty:
        return
        
    os.makedirs("output/before_after_clustering", exist_ok=True)
    
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))

    # Sebelum: histogram harga polos, belum ada label klaster
    axes[0].hist(df_clustered["Estimasi_Harga"], bins=30, color="gray")
    axes[0].set_title(f"Distribusi Harga {kategori} — SEBELUM Klasterisasi\n(belum berlabel)")
    axes[0].set_xlabel("Estimasi Harga (Rp)")

    # Sesudah: histogram bertumpuk per label klaster
    label_col = "Kategori" if "Kategori" in df_clustered.columns else ("klaster" if "klaster" in df_clustered.columns else None)
    
    if label_col:
        # Pemetakan warna statis agar warna klaster konsisten di semua plot kategori
        color_map = {
            "Hemat": "#1f77b4",     # Biru
            "Balanced": "#2ca02c",  # Hijau
            "Premium": "#ff7f0e",   # Oranye
            "Luxury": "#d62728",    # Merah
            "Elite": "#9467bd"      # Ungu
        }
        
        # Urutkan label secara logis: Hemat -> Balanced -> Premium -> Luxury -> Elite
        logical_order = ["Hemat", "Balanced", "Premium", "Luxury", "Elite"]
        labels_to_plot = [l for l in logical_order if l in df_clustered[label_col].unique()]
        for l in df_clustered[label_col].unique():
            if l not in labels_to_plot:
                labels_to_plot.append(l)
                
        for label in labels_to_plot:
            subset = df_clustered[df_clustered[label_col] == label]
            color = color_map.get(label, None)
            axes[1].hist(subset["Estimasi_Harga"], bins=30, alpha=0.6, label=label, color=color)
    else:
        axes[1].hist(df_clustered["Estimasi_Harga"], bins=30, alpha=0.6, color="gray")
        
    axes[1].set_title(f"Distribusi Harga {kategori} — SESUDAH Klasterisasi\n(berlabel per klaster FCM)")
    axes[1].set_xlabel("Estimasi Harga (Rp)")
    axes[1].legend()

    # Terapkan formatter rupiah agar sumbu-X tidak menggunakan notasi eksponen/saintifik
    import matplotlib.ticker as ticker
    formatter = ticker.FuncFormatter(format_rupiah_ticks)
    axes[0].xaxis.set_major_formatter(formatter)
    axes[1].xaxis.set_major_formatter(formatter)

    plt.tight_layout()
    plt.savefig(f"output/before_after_clustering/clustering_{kategori.lower()}_before_after.png", dpi=150)
    plt.close(fig)

def plot_target_shift_scatter(df, cluster_id, target_price, pools_by_region, kelas_label, kategori="Hotel"):
    """
    df             : dataframe seluruh kandidat kategori (df_clustered sebelum filter)
    cluster_id     : indeks klaster yang sedang diproses (i)
    target_price   : nilai target_price hasil shifting untuk klaster ini
    pools_by_region: dict mapping region_name -> pool_df (25 kandidat teratas)
    kelas_label    : label kelas, misal "Premium"
    kategori       : kategori tempat, misal "Hotel"
    """
    if df is None or df.empty:
        return
        
    os.makedirs("output/target_shift_scatter", exist_ok=True)
    items_in_c = df[df["Cluster"] == cluster_id]
    if items_in_c.empty:
        return

    # Warna-warna representatif untuk masing-masing wilayah
    region_colors = {
        "Kota Batu": {"pool": "#2ecc71", "bukan": "#a3e4d7", "label": "Batu"},
        "Kota Malang": {"pool": "#3498db", "bukan": "#a9cce3", "label": "Mlg Kota"},
        "Kabupaten Malang": {"pool": "#e67e22", "bukan": "#f5cba7", "label": "Mlg Kab"}
    }
    # Fallback default colors if region is not mapped
    default_colors = {"pool": "#9b59b6", "bukan": "#d7bde2", "label": "Lainnya"}

    fig, ax = plt.subplots(figsize=(11, 7))

    for region in ["Kota Batu", "Kota Malang", "Kabupaten Malang"]:
        items_in_reg = items_in_c[items_in_c["Region"] == region]
        if items_in_reg.empty:
            continue
            
        colors = region_colors.get(region, default_colors)
        pool_df = pools_by_region.get(region, pd.DataFrame())
        
        if pool_df is not None and not pool_df.empty:
            pool_ids = set(pool_df["Nama_Tempat"])
            bukan_pool = items_in_reg[~items_in_reg["Nama_Tempat"].isin(pool_ids)]
        else:
            bukan_pool = items_in_reg
            
        # 1. Plot Kandidat Tidak Terpilih (Pudar, s=35)
        if not bukan_pool.empty:
            ax.scatter(bukan_pool["Estimasi_Harga"], bukan_pool["Membership_Degree"],
                       c=colors["bukan"], s=35, alpha=0.5, edgecolors="white", linewidths=0.3,
                       label=f"Kandidat ({colors['label']}) (n={len(bukan_pool)})")
                       
        # 2. Plot Pool Terpilih Top-25 (Solid, s=80, border hitam tebal)
        if pool_df is not None and not pool_df.empty:
            ax.scatter(pool_df["Estimasi_Harga"], pool_df["Membership_Degree"],
                       c=colors["pool"], s=80, alpha=0.9, edgecolors="black", linewidths=0.8,
                       label=f"Pool Top-25 ({colors['label']}) (n={len(pool_df)})")

    # Garis vertikal target_price
    ax.axvline(target_price, color="red", linestyle="--", linewidth=2.5,
               label=f"Target Harga (Rp{target_price:,.0f})")

    ax.set_xlabel("Estimasi Harga (Rp)")
    ax.set_ylabel("Membership Degree (Derajat Keanggotaan Klaster)")
    ax.set_title(f"Seleksi Kandidat {kategori} Klaster {kelas_label} (Gabungan Wilayah)\n"
                 f"Berdasarkan Kedekatan Target Harga & Derajat Keanggotaan")
    ax.legend(loc="best", framealpha=0.9)
    ax.grid(True, linestyle=":", alpha=0.4)

    # Terapkan formatter rupiah ke sumbu-X
    import matplotlib.ticker as ticker
    ax.xaxis.set_major_formatter(ticker.FuncFormatter(format_rupiah_ticks))

    plt.tight_layout()
    plt.savefig(f"output/target_shift_scatter/scatter_{kategori.lower()}_{kelas_label.lower()}_target_shift.png", dpi=150)
    plt.close()

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
        import matplotlib.pyplot as plt
        
        # Generate before-after clustering plots
        for cat_name, cat_data in clustered.items():
            if 'df' in cat_data and cat_data['df'] is not None and not cat_data['df'].empty:
                plot_clustering_before_after(cat_data['df'], kategori=cat_name.capitalize())
        
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



def make_pkg_desc(combo, duration, wisata_list=None):
    h_name = combo["hotel"]["Nama_Tempat"] if (duration > 1 and combo.get("hotel") and isinstance(combo["hotel"], dict)) else "Tanpa Akomodasi (ODT)"
    
    # Wisata names (collect for all days if list is provided)
    wisata_names = []
    w_item = combo.get("wisata")
    if w_item and isinstance(w_item, dict):
        w_name = w_item.get("Nama_Tempat", "N/A")
        if w_name != "N/A":
            wisata_names.append(w_name)
            
        if duration > 1 and wisata_list:
            w_alts = [x for x in wisata_list if x.get("Nama_Tempat") != w_name]
            if not w_alts:
                w_alts = wisata_list
            for d in range(2, duration + 1):
                w_var = w_alts[(d - 2) % len(w_alts)]
                w_var_name = w_var.get("Nama_Tempat", "N/A")
                if w_var_name not in wisata_names and w_var_name != "N/A":
                    wisata_names.append(w_var_name)
    wisata_str = " & ".join(wisata_names) if wisata_names else "N/A"
    
    # Kuliner names
    k_pagi = combo.get("kuliner_pagi", {})
    k_siang = combo.get("kuliner", {})
    k_malam = combo.get("kuliner_malam", {})
    
    kp_name = k_pagi.get("Nama_Tempat", "N/A") if k_pagi else "N/A"
    ks_name = k_siang.get("Nama_Tempat", "N/A") if k_siang else "N/A"
    km_name = k_malam.get("Nama_Tempat", "N/A") if k_malam else "N/A"
    
    meals = []
    if kp_name and kp_name != "N/A": meals.append(kp_name)
    if ks_name and ks_name != "N/A": meals.append(ks_name)
    if km_name and km_name != "N/A": meals.append(km_name)
    meals_str = " & ".join(meals)
    
    return f"{h_name} | {wisata_str} | {meals_str} (Rp {int(combo.get('total_cost', 0)):,})"


def apply_diversity_filter(valid_list, limit):
    diverse = []
    selected_wisata = set()
    selected_hotels = set()
    
    for combo in valid_list:
        if not combo.get("wisata") or not combo.get("hotel"):
            continue
        w_name = combo["wisata"].get("Nama_Tempat")
        if w_name not in selected_wisata:
            diverse.append(combo)
            selected_wisata.add(w_name)
            selected_hotels.add(combo["hotel"].get("Nama_Tempat"))
            if len(diverse) >= limit:
                break
                
    if len(diverse) < limit:
        for combo in valid_list:
            if combo not in diverse:
                diverse.append(combo)
                if len(diverse) >= limit:
                    break
    return diverse


def get_combo_fpc(x, duration):
    fpc_list = []
    
    # Hotel FPC
    if duration > 1 and x.get("hotel") and isinstance(x["hotel"], dict):
        fpc_list.append(float(x["hotel"].get("Membership_Degree", 1.0)))
        
    # Wisata FPC
    if x.get("wisata") and isinstance(x["wisata"], dict):
        fpc_list.append(float(x["wisata"].get("Membership_Degree", 1.0)))
        
    # Kuliner pagi
    if x.get("kuliner_pagi") and isinstance(x["kuliner_pagi"], dict):
        fpc_list.append(float(x["kuliner_pagi"].get("Membership_Degree", 1.0)))
        
    # Kuliner siang
    if x.get("kuliner") and isinstance(x["kuliner"], dict):
        fpc_list.append(float(x["kuliner"].get("Membership_Degree", 1.0)))
        
    # Kuliner malam
    if duration > 1 and x.get("kuliner_malam") and isinstance(x["kuliner_malam"], dict):
        fpc_list.append(float(x["kuliner_malam"].get("Membership_Degree", 1.0)))
        
    return round(sum(fpc_list) / len(fpc_list), 4) if fpc_list else 1.0


def build_ranking_comparison(valid_noboost, valid_boosted, get_comb_pref_score, limit, label, duration, wisata_list=None):
    diverse_noboost = apply_diversity_filter(valid_noboost, limit)
    diverse_boosted = apply_diversity_filter(valid_boosted, limit)
    
    rows_hotel = []
    rows_wisata = []
    rows_kuliner = []
    
    max_len = max(len(diverse_noboost), len(diverse_boosted))
    for r in range(max_len):
        c_no = diverse_noboost[r] if r < len(diverse_noboost) else None
        c_bo = diverse_boosted[r] if r < len(diverse_boosted) else None
        
        for d in range(1, duration + 1):
            h_row: dict[str, Any] = {"Kelas Paket": label, "Peringkat": r + 1, "Hari / Waktu": f"Hari {d}", 
                     "SEBELUM Boost (murni harga)": "", "Membership_Degree (Sebelum)": "", "Skor Kategori (Sebelum)": "", 
                     "SESUDAH Boost (skor kategori diprioritaskan)": "", "Membership_Degree (Sesudah)": "", "Skor Kategori (Sesudah)": ""}
            w_row = dict(h_row)
            
            if c_no:
                boost_no = get_comb_pref_score(c_no) if d == 1 else "" 
                
                h_name_no = c_no["hotel"].get("Nama_Tempat", "N/A") if c_no.get("hotel") and isinstance(c_no["hotel"], dict) else "Tanpa Akomodasi"
                h_fpc_no = float(c_no["hotel"].get("Membership_Degree", 1.0)) if c_no.get("hotel") and isinstance(c_no["hotel"], dict) else ""
                
                h_row["SEBELUM Boost (murni harga)"] = h_name_no
                h_row["Membership_Degree (Sebelum)"] = h_fpc_no
                h_row["Skor Kategori (Sebelum)"] = boost_no
                
                w_item_no = c_no.get("wisata")
                w_name_no = w_item_no.get("Nama_Tempat", "N/A") if w_item_no and isinstance(w_item_no, dict) else "N/A"
                w_fpc_no = float(w_item_no.get("Membership_Degree", 1.0)) if w_item_no and isinstance(w_item_no, dict) else ""
                
                if d > 1 and wisata_list:
                    w_alts = [x for x in wisata_list if x.get("Nama_Tempat") != w_name_no]
                    if not w_alts: w_alts = wisata_list
                    w_var = w_alts[(d - 2) % len(w_alts)]
                    w_name_no = w_var.get("Nama_Tempat", "N/A")
                    w_fpc_no = float(w_var.get("Membership_Degree", 1.0))
                    
                w_row["SEBELUM Boost (murni harga)"] = w_name_no
                w_row["Membership_Degree (Sebelum)"] = w_fpc_no
                w_row["Skor Kategori (Sebelum)"] = boost_no
                
            if c_bo:
                boost_bo = get_comb_pref_score(c_bo) if d == 1 else ""
                
                h_name_bo = c_bo["hotel"].get("Nama_Tempat", "N/A") if c_bo.get("hotel") and isinstance(c_bo["hotel"], dict) else "Tanpa Akomodasi"
                h_fpc_bo = float(c_bo["hotel"].get("Membership_Degree", 1.0)) if c_bo.get("hotel") and isinstance(c_bo["hotel"], dict) else ""
                
                h_row["SESUDAH Boost (skor kategori diprioritaskan)"] = h_name_bo
                h_row["Membership_Degree (Sesudah)"] = h_fpc_bo
                h_row["Skor Kategori (Sesudah)"] = boost_bo
                
                w_item_bo = c_bo.get("wisata")
                w_name_bo = w_item_bo.get("Nama_Tempat", "N/A") if w_item_bo and isinstance(w_item_bo, dict) else "N/A"
                w_fpc_bo = float(w_item_bo.get("Membership_Degree", 1.0)) if w_item_bo and isinstance(w_item_bo, dict) else ""
                
                if d > 1 and wisata_list:
                    w_alts = [x for x in wisata_list if x.get("Nama_Tempat") != w_name_bo]
                    if not w_alts: w_alts = wisata_list
                    w_var = w_alts[(d - 2) % len(w_alts)]
                    w_name_bo = w_var.get("Nama_Tempat", "N/A")
                    w_fpc_bo = float(w_var.get("Membership_Degree", 1.0))
                    
                w_row["SESUDAH Boost (skor kategori diprioritaskan)"] = w_name_bo
                w_row["Membership_Degree (Sesudah)"] = w_fpc_bo
                w_row["Skor Kategori (Sesudah)"] = boost_bo
                
            rows_hotel.append(h_row)
            rows_wisata.append(w_row)
            
            meals = [("Makan Pagi", "kuliner_pagi"), ("Makan Siang", "kuliner")]
            if d < duration:
                meals.append(("Makan Malam", "kuliner_malam"))
                
            for m_idx, (m_label, m_key) in enumerate(meals):
                m_row: dict[str, Any] = {"Kelas Paket": label, "Peringkat": r + 1, "Hari / Waktu": f"Hari {d} - {m_label}", 
                         "SEBELUM Boost (murni harga)": "", "Membership_Degree (Sebelum)": "", "Skor Kategori (Sebelum)": "", 
                         "SESUDAH Boost (skor kategori diprioritaskan)": "", "Membership_Degree (Sesudah)": "", "Skor Kategori (Sesudah)": ""}
                
                if c_no:
                    boost_no = get_comb_pref_score(c_no) if (d == 1 and m_idx == 0) else ""
                    m_item_no = c_no.get(m_key, {})
                    m_name_no = m_item_no.get("Nama_Tempat", "N/A") if m_item_no and isinstance(m_item_no, dict) else "N/A"
                    m_fpc_no = float(m_item_no.get("Membership_Degree", 1.0)) if m_item_no and isinstance(m_item_no, dict) else ""
                    
                    m_row["SEBELUM Boost (murni harga)"] = m_name_no
                    m_row["Membership_Degree (Sebelum)"] = m_fpc_no
                    m_row["Skor Kategori (Sebelum)"] = boost_no
                    
                if c_bo:
                    boost_bo = get_comb_pref_score(c_bo) if (d == 1 and m_idx == 0) else ""
                    m_item_bo = c_bo.get(m_key, {})
                    m_name_bo = m_item_bo.get("Nama_Tempat", "N/A") if m_item_bo and isinstance(m_item_bo, dict) else "N/A"
                    m_fpc_bo = float(m_item_bo.get("Membership_Degree", 1.0)) if m_item_bo and isinstance(m_item_bo, dict) else ""
                    
                    m_row["SESUDAH Boost (skor kategori diprioritaskan)"] = m_name_bo
                    m_row["Membership_Degree (Sesudah)"] = m_fpc_bo
                    m_row["Skor Kategori (Sesudah)"] = boost_bo
                    
                rows_kuliner.append(m_row)
        
    return {
        "Hotel": rows_hotel,
        "Wisata": rows_wisata,
        "Kuliner": rows_kuliner
    }



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
    top25_data = {}

    if verbose:
        print(f"  Auto-c: best_c = {best_c} | Label: {list(cluster_labels.values())}")

    # --- Langkah 1: Alokasi Budget ---
    budget_alloc = allocate_budget(total_budget, num_persons, duration)

    if verbose:
        print(f"\n{'='*60}")
        print("  BUDGET-FIRST RECOMMENDATION (COMBINATORIAL OPTIMIZED)")
        print(f"{'='*60}")
        print(f"  Total Budget  : Rp {total_budget:,.0f}")
        print(f"  Peserta       : {num_persons} orang")
        print(f"  Durasi        : {duration} hari")
        print(f"  Skema Ratio   : {ratio_scheme}")
        print("\n  Alokasi Budget:")
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
            pools_by_region = {}
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
                    print(sorted_items.head(25)[["Nama_Tempat","Estimasi_Harga","distance_to_target","Membership_Degree"]])
                    
                    # Simpan data frame top 25 ke dictionary untuk diproses di akhir
                    top25_df = sorted_items.head(25)[["Nama_Tempat","Estimasi_Harga","distance_to_target","Membership_Degree"]].copy()
                    top25_data[(key, i, region)] = top25_df

                    pool = sorted_items.head(25) # Ambil top 25 sebagai pool
                    pools_by_region[region] = pool
                    if not pool.empty:
                        sample_size = min(8, len(pool))
                        local_seed = (base_seed + hash(key) + i + hash(region)) % (2**32 - 1)
                        best_items_list.append(pool.sample(n=sample_size, random_state=local_seed))
            
            # Generate combined scatter plot across all regions for this cluster
            plot_target_shift_scatter(
                df,
                cluster_id=i,
                target_price=target_price,
                pools_by_region=pools_by_region,
                kelas_label=cluster_labels[i],
                kategori=key.capitalize()
            )
            
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
    comparison_data: dict[str, list] = {"Hotel": [], "Wisata": [], "Kuliner": []}

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
            if pref_bias < -0.1:
                valid_combinations_noboost = sorted(valid_combinations, key=lambda x: (x.get("selisih", 0) < 0, x["total_dist"], hemat_key(x)))
                valid_combinations = sorted(valid_combinations, key=lambda x: (x.get("selisih", 0) < 0, x["total_dist"], -get_comb_pref_score(x), hemat_key(x)))
            else:
                valid_combinations_noboost = sorted(valid_combinations, key=lambda x: (x.get("selisih", 0) < 0, hemat_key(x), x["total_dist"]))
                valid_combinations = sorted(valid_combinations, key=lambda x: (x.get("selisih", 0) < 0, -get_comb_pref_score(x), hemat_key(x), x["total_dist"]))
        elif i == best_c - 1:
            # Premium/kelas tertinggi: Personalisasi dengan target budget
            premium_target = total_budget * ratios_for_c[-1] if total_budget is not None else None
            premium_key = (lambda x: get_val(x["hotel"], "Estimasi_Harga") if pref_bias < -0.1 else -get_val(x["hotel"], "Estimasi_Harga")) if premium_target is None else (lambda x: abs(x["total_cost"] - premium_target))
            valid_combinations_noboost = sorted(
                valid_combinations,
                key=lambda x: (
                    x.get("selisih", 0) < 0, 
                    premium_key(x),
                    -get_val(x["wisata"], "Rating"), 
                    x["total_dist"]
                )
            )
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
            valid_combinations_noboost = sorted(
                valid_combinations,
                key=lambda x: (
                    x.get("selisih", 0) < 0, 
                    balanced_key(x),
                    -get_val(x["wisata"], "Rating"),
                    x["total_dist"]
                )
            )
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
                valid_combinations_noboost.append(min_cost_comb)

        # Collect ranking comparison
        comparison_rows = build_ranking_comparison(
            valid_combinations_noboost,
            valid_combinations,
            get_comb_pref_score,
            max_options_to_show[i],
            cluster_labels[i],
            duration,
            wisata_list
        )
        comparison_data["Hotel"].extend(comparison_rows["Hotel"])
        comparison_data["Wisata"].extend(comparison_rows["Wisata"])
        comparison_data["Kuliner"].extend(comparison_rows["Kuliner"])

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

    if options_list:
        options_list[0]["ranking_comparison"] = comparison_data

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
                print("  🏨 Akomodasi: Tanpa Akomodasi (One Day Trip)")
            print(f"  🎯 Wisata  : {pkg['wisata_nama']}")
            print(f"               Rp {pkg['wisata_harga']:,.0f}/orang × {pkg['num_persons']} orang = Rp {pkg['cost_wisata']:,.0f}")
            print(f"  🍜 Kuliner : {pkg['kuliner_nama']} & {pkg['kuliner_malam_nama']}")
            print(f"               (Rp {pkg['kuliner_harga']:,.0f} + Rp {pkg['kuliner_malam_harga']:,.0f})/orang × {pkg['num_persons']} orang × {pkg['duration']} hari = Rp {pkg['cost_kuliner']:,.0f}")
            print(f"  🚗 Transport: Rp {pkg['cost_transport']:,.0f} ({pkg['transport_detail']['total_distance_km']:.2f} km via {pkg['transport_detail']['legs'][0]['vehicle']})")
            
            # Print transparent daily subtotals if multi-day
            if pkg["duration"] > 1 and pkg.get("itinerary"):
                print("  🗂️  Rincian Harian Transparan:")
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

    # ── Ekspor 25 kandidat teratas wilayah ke dalam Excel terpadu (dengan penanda pilihan rekomendasi) ──
    if 'top25_data' in locals() and top25_data:
        # 1. Kumpulkan semua nama tempat yang terpilih dalam options_list beserta nomor opsinya
        place_options_map = {}
        for opt in options_list:
            opt_idx = opt.get("option_index")
            for pkg in opt.get('packages', []):
                for key_name in ['hotel_nama', 'hotel_nama_real', 'wisata_nama', 'kuliner_pagi_nama', 'kuliner_nama', 'kuliner_malam_nama']:
                    name = pkg.get(key_name)
                    if name and name != 'N/A':
                        if ' & ' in name:
                            for sub_name in name.split(' & '):
                                n = sub_name.strip()
                                if n not in place_options_map:
                                    place_options_map[n] = set()
                                place_options_map[n].add(opt_idx)
                        else:
                            n = name.strip()
                            if n not in place_options_map:
                                place_options_map[n] = set()
                            place_options_map[n].add(opt_idx)
                for itin in pkg.get('itinerary', []):
                    for key_name in ['hotel_nama', 'hotel_nama_real', 'wisata_nama', 'kuliner_pagi_nama', 'kuliner_nama', 'kuliner_malam_nama']:
                        name = itin.get(key_name)
                        if name and name != 'N/A':
                            if ' & ' in name:
                                for sub_name in name.split(' & '):
                                    n = sub_name.strip()
                                    if n not in place_options_map:
                                        place_options_map[n] = set()
                                    place_options_map[n].add(opt_idx)
                            else:
                                n = name.strip()
                                if n not in place_options_map:
                                    place_options_map[n] = set()
                                place_options_map[n].add(opt_idx)
        
        # 2. Tulis Excel file
        excel_dir = "output/target_shift_scatter/excel"
        os.makedirs(excel_dir, exist_ok=True)
        
        # Kelompokkan data per (kategori, cluster)
        grouped_excel = {}
        for (key_name, i, region), df_top25 in top25_data.items():
            grp_key = (key_name, i)
            if grp_key not in grouped_excel:
                grouped_excel[grp_key] = {}
            grouped_excel[grp_key][region] = df_top25
            
        for (key_name, i), regions_dict in grouped_excel.items():
            excel_path = os.path.join(excel_dir, f"top25_{key_name.lower()}_{cluster_labels[i].lower()}.xlsx")
            with pd.ExcelWriter(excel_path) as writer:
                for region, r_df in regions_dict.items():
                    # Tambahkan kolom penanda masuk opsi keberapa
                    r_df = r_df.copy()
                    
                    def get_recommendation_status(name):
                        name_str = str(name).strip()
                        if name_str in place_options_map:
                            opts = sorted(list(place_options_map[name_str]))
                            return ", ".join([f"Opsi {o}" for o in opts])
                        return "Tidak Terpilih"
                        
                    r_df["Terpilih_Rekomendasi"] = r_df["Nama_Tempat"].apply(get_recommendation_status)
                    sheet_name = region.replace("Kota Batu", "Batu").replace("Kota Malang", "Malang Kota").replace("Kabupaten Malang", "Malang Kab")
                    r_df.to_excel(writer, sheet_name=sheet_name, index=False)

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
        print("  FLEXIBLE EXPLORATION WORKFLOW")
        print(f"{'='*60}")
        print(f"  Peserta       : {num_persons} orang")
        print(f"  Durasi        : {duration} hari")
        print(f"  Auto-c        : best_c = {best_c} | Label: {list(cluster_labels.values())}")
        print("  Skema         : Centroid Persentil (Offline)\n")

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
    comparison_data: dict[str, list] = {"Hotel": [], "Wisata": [], "Kuliner": []}
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
            hemat_target = None
            hemat_key = (lambda x: x["total_cost"]) if hemat_target is None else (lambda x: abs(x["total_cost"] - hemat_target))
            if pref_bias < -0.1:
                valid_combinations_noboost = sorted(valid_combinations, key=lambda x: (x.get("selisih", 0) < 0, x["total_dist"], hemat_key(x)))
                valid_combinations = sorted(valid_combinations, key=lambda x: (x.get("selisih", 0) < 0, x["total_dist"], -get_comb_pref_score(x), hemat_key(x)))
            else:
                valid_combinations_noboost = sorted(valid_combinations, key=lambda x: (x.get("selisih", 0) < 0, hemat_key(x), x["total_dist"]))
                valid_combinations = sorted(valid_combinations, key=lambda x: (x.get("selisih", 0) < 0, -get_comb_pref_score(x), hemat_key(x), x["total_dist"]))
        elif i == best_c - 1:
            # Premium/kelas tertinggi: Personalisasi dengan target budget
            premium_target = None
            premium_key = (lambda x: get_val(x["hotel"], "Estimasi_Harga") if pref_bias < -0.1 else -get_val(x["hotel"], "Estimasi_Harga")) if premium_target is None else (lambda x: abs(x["total_cost"] - premium_target))
            valid_combinations_noboost = sorted(
                valid_combinations,
                key=lambda x: (
                    x.get("selisih", 0) < 0, 
                    premium_key(x),
                    -get_val(x["wisata"], "Rating"), 
                    x["total_dist"]
                )
            )
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
            valid_combinations_noboost = sorted(
                valid_combinations,
                key=lambda x: (
                    x.get("selisih", 0) < 0, 
                    balanced_key(x),
                    -get_val(x["wisata"], "Rating"),
                    x["total_dist"]
                )
            )
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

        # Collect ranking comparison
        comparison_rows = build_ranking_comparison(
            valid_combinations_noboost,
            valid_combinations,
            get_comb_pref_score,
            max_options_to_show[i],
            cluster_labels[i],
            duration,
            candidates["wisata"][i]
        )
        comparison_data["Hotel"].extend(comparison_rows["Hotel"])
        comparison_data["Wisata"].extend(comparison_rows["Wisata"])
        comparison_data["Kuliner"].extend(comparison_rows["Kuliner"])


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

    if options_list:
        options_list[0]["ranking_comparison"] = comparison_data

    if verbose and options_list:
        rep_packages = cast(list, options_list[0]["packages"])
        print("\n  HASIL FLEXIBLE EXPLORATION OPSI 1:")
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
    except Exception:
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
        print("  DESTINATION-FIRST WORKFLOW")
        print(f"{'='*60}")
        print(f"  Destinasi Kunci: {best_wisata['Nama_Tempat']}")
        print(f"  Harga Tiket    : Rp {harga_tiket:,.0f} × {num_persons} orang = Rp {tiket_total:,.0f}")
        print(f"  Peserta       : {num_persons} orang")
        print(f"  Durasi        : {duration} hari")
        
        if total_budget:
            print(f"  Total Budget  : Rp {total_budget:,.0f}")
        else:
            print("  Total Budget  : Tanpa Batasan (Kondisi A)")
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
    comparison_data: dict[str, list] = {"Hotel": [], "Wisata": [], "Kuliner": []}
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
            if pref_bias < -0.1:
                valid_combinations_noboost = sorted(valid_combinations, key=lambda x: (x.get("selisih", 0) < 0, x["total_dist"], hemat_key(x)))
                valid_combinations = sorted(valid_combinations, key=lambda x: (x.get("selisih", 0) < 0, x["total_dist"], -get_comb_pref_score(x), hemat_key(x)))
            else:
                valid_combinations_noboost = sorted(valid_combinations, key=lambda x: (x.get("selisih", 0) < 0, hemat_key(x), x["total_dist"]))
                valid_combinations = sorted(valid_combinations, key=lambda x: (x.get("selisih", 0) < 0, -get_comb_pref_score(x), hemat_key(x), x["total_dist"]))
        elif i == best_c - 1:
            # Premium/kelas tertinggi: Personalisasi dengan target budget
            premium_target = total_budget * ratios_dest[-1] if total_budget is not None else None
            premium_key = (lambda x: get_val(x["hotel"], "Estimasi_Harga") if pref_bias < -0.1 else -get_val(x["hotel"], "Estimasi_Harga")) if premium_target is None else (lambda x: abs(x["total_cost"] - premium_target))
            valid_combinations_noboost = sorted(
                valid_combinations,
                key=lambda x: (
                    x.get("selisih", 0) < 0, 
                    premium_key(x),
                    -get_val(x["wisata"], "Rating"), 
                    x["total_dist"]
                )
            )
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
            valid_combinations_noboost = sorted(
                valid_combinations,
                key=lambda x: (
                    x.get("selisih", 0) < 0, 
                    balanced_key(x),
                    -get_val(x["wisata"], "Rating"),
                    x["total_dist"]
                )
            )
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
                valid_combinations_noboost.append(min_cost_comb)

        # Collect ranking comparison
        comparison_rows = build_ranking_comparison(
            valid_combinations_noboost,
            valid_combinations,
            get_comb_pref_score,
            max_options_to_show[i],
            cluster_labels[i],
            duration,
            candidates["wisata"][i]
        )
        comparison_data["Hotel"].extend(comparison_rows["Hotel"])
        comparison_data["Wisata"].extend(comparison_rows["Wisata"])
        comparison_data["Kuliner"].extend(comparison_rows["Kuliner"])

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

    if options_list:
        options_list[0]["ranking_comparison"] = comparison_data

    if verbose and options_list:
        rep_packages = cast(list, options_list[0]["packages"])
        print("\n  HASIL DESTINATION-FIRST OPSI 1:")
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
def export_to_excel_recom(options_list, workflow, budget, persons, duration, pref_wisata="", pref_hotel="", pref_kuliner=""):
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
        if LAST_CLUSTERED is None or not name or name in ["N/A", "Checkout", "Tanpa Akomodasi", "Tanpa Akomodasi (One Day Trip)"]:
            return 0.0
        df = LAST_CLUSTERED.get(category)
        if df is None or df.empty or 'Fuzzy_Score' not in df.columns:
            return 0.0
            
        # Try exact match first to prevent breaking names containing " & "
        matched = df[df['Nama_Tempat'] == name]
        if not matched.empty:
            return float(matched.iloc[0]['Fuzzy_Score'])
            
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
            
    hotel_cntr_str = format_cntr(LAST_CLUSTERED.get("hotel_cntr", [])) if LAST_CLUSTERED else "N/A"
    wisata_cntr_str = format_cntr(LAST_CLUSTERED.get("wisata_cntr", [])) if LAST_CLUSTERED else "N/A"
    kuliner_cntr_str = format_cntr(LAST_CLUSTERED.get("kuliner_cntr", [])) if LAST_CLUSTERED else "N/A"
    
    meta_rows = [
        {"Informasi": "Input Workflow", "Nilai": workflow.upper()},
        {"Informasi": "Input Budget", "Nilai": f"Rp {budget:,.0f}" if budget else "Tanpa Budget"},
        {"Informasi": "Input Peserta", "Nilai": f"{persons} Orang"},
        {"Informasi": "Input Durasi", "Nilai": f"{duration} Hari"},
        {"Informasi": "Preferensi Wisata User", "Nilai": pref_wisata if pref_wisata else "Tidak diatur"},
        {"Informasi": "Preferensi Hotel User", "Nilai": pref_hotel if pref_hotel else "Tidak diatur"},
        {"Informasi": "Preferensi Kuliner User", "Nilai": pref_kuliner if pref_kuliner else "Tidak diatur"},
        {"Informasi": "Centroid Hotel", "Nilai": hotel_cntr_str},
        {"Informasi": "Centroid Wisata", "Nilai": wisata_cntr_str},
        {"Informasi": "Centroid Kuliner", "Nilai": kuliner_cntr_str},
    ]
    df_meta = pd.DataFrame(meta_rows)
    
    def get_md_from_lookup(name, category):
        if LAST_CLUSTERED is None or not name or name in ["N/A", "Checkout", "Tanpa Akomodasi", "Tanpa Akomodasi (One Day Trip)"]:
            return 0.0
        df = LAST_CLUSTERED.get(category)
        if df is None or df.empty or 'Membership_Degree' not in df.columns:
            return 0.0
            
        # Try exact match first to prevent breaking names containing " & "
        matched = df[df['Nama_Tempat'] == name]
        if not matched.empty:
            return float(matched.iloc[0]['Membership_Degree'])
            
        names = [n.strip() for n in name.split(" & ")]
        scores = []
        for n in names:
            matched = df[df['Nama_Tempat'] == n]
            if not matched.empty:
                scores.append(float(matched.iloc[0]['Membership_Degree']))
        if scores:
            return sum(scores) / len(scores)
        return 0.0

    # 4. Sheet 1: Detail Item Per Package
    def is_placeholder(name):
        return not name or name in ["N/A", "Checkout", "Tanpa Akomodasi", "Tanpa Akomodasi (One Day Trip)"]

    item_rows = []
    for opt in options_list:
        opt_idx = opt["option_index"]
        for pkg in opt["packages"]:
            kelas = pkg.get("kategori", "N/A").upper()
            base_row = {
                "Opsi": f"Opsi {opt_idx}",
                "Kelas Paket": kelas
            }
            
            itin = pkg.get("itinerary", [])
            
            # Compute average package FPC (Membership Degree) using all actual items in the itinerary
            package_mds = []
            package_fss = []
            for day in itin:
                h_n = day.get("hotel")
                if h_n and h_n not in ["Checkout", "Tanpa Akomodasi (One Day Trip)", "Tanpa Akomodasi"]:
                    package_mds.append(get_md_from_lookup(h_n, "hotel"))
                    package_fss.append(get_fuzzy_score_from_lookup(h_n, "hotel"))
                
                w_n = day.get("wisata")
                if w_n and w_n != "N/A":
                    package_mds.append(get_md_from_lookup(w_n, "wisata"))
                    package_fss.append(get_fuzzy_score_from_lookup(w_n, "wisata"))
                    
                kp_n = day.get("kuliner_pagi")
                if kp_n and kp_n != "N/A":
                    package_mds.append(get_md_from_lookup(kp_n, "kuliner"))
                    package_fss.append(get_fuzzy_score_from_lookup(kp_n, "kuliner"))
                    
                ks_n = day.get("kuliner")
                if ks_n and ks_n != "N/A":
                    package_mds.append(get_md_from_lookup(ks_n, "kuliner"))
                    package_fss.append(get_fuzzy_score_from_lookup(ks_n, "kuliner"))
                    
                km_n = day.get("kuliner_malam")
                if km_n and km_n != "N/A":
                    package_mds.append(get_md_from_lookup(km_n, "kuliner"))
                    package_fss.append(get_fuzzy_score_from_lookup(km_n, "kuliner"))
                    
            paket_fpc = round(sum(package_mds) / len(package_mds), 4) if package_mds else 0.0
            paket_fs = round(sum(package_fss) / len(package_fss), 4) if package_fss else 0.0
            
            for d_num in range(1, duration + 1):
                day_dict = {}
                if d_num - 1 < len(itin):
                    day_dict = itin[d_num - 1]
                    
                h_name = day_dict.get("hotel", "Checkout")
                h_harga = day_dict.get("hotel_harga", 0)
                h_fs = round(get_fuzzy_score_from_lookup(h_name, "hotel"), 4)
                h_fpc = round(get_md_from_lookup(h_name, "hotel"), 4)
                
                w_name = day_dict.get("wisata", "N/A")
                w_harga = day_dict.get("wisata_harga", 0)
                w_fs = round(get_fuzzy_score_from_lookup(w_name, "wisata"), 4)
                w_fpc = round(get_md_from_lookup(w_name, "wisata"), 4)
                
                kp_name = day_dict.get("kuliner_pagi", "N/A")
                kp_harga = day_dict.get("kuliner_pagi_harga", 0)
                kp_fs = round(get_fuzzy_score_from_lookup(kp_name, "kuliner"), 4)
                kp_fpc = round(get_md_from_lookup(kp_name, "kuliner"), 4)
                
                ks_name = day_dict.get("kuliner", "N/A")
                ks_harga = day_dict.get("kuliner_harga", 0)
                ks_fs = round(get_fuzzy_score_from_lookup(ks_name, "kuliner"), 4)
                ks_fpc = round(get_md_from_lookup(ks_name, "kuliner"), 4)
                
                km_name = day_dict.get("kuliner_malam", "N/A")
                km_harga = day_dict.get("kuliner_malam_harga", 0)
                km_fs = round(get_fuzzy_score_from_lookup(km_name, "kuliner"), 4)
                km_fpc = round(get_md_from_lookup(km_name, "kuliner"), 4)
                
                # Hotel
                row_h = base_row.copy()
                row_h.update({
                    "Hari / Waktu": f"Hari {d_num}",
                    "Tipe Item": "Hotel",
                    "Nama Tempat": h_name,
                    "Estimasi Harga": h_harga,
                    "Fuzzy Score Item": h_fs if not is_placeholder(h_name) else "",
                    "Fuzzy Score Paket": paket_fs,
                    "Membership_Degree": h_fpc if not is_placeholder(h_name) else "",
                    "FPC Paket": paket_fpc
                })
                item_rows.append(row_h)
                
                # Wisata
                row_w = base_row.copy()
                row_w.update({
                    "Hari / Waktu": f"Hari {d_num}",
                    "Tipe Item": "Wisata",
                    "Nama Tempat": w_name,
                    "Estimasi Harga": w_harga,
                    "Fuzzy Score Item": w_fs if not is_placeholder(w_name) else "",
                    "Fuzzy Score Paket": paket_fs,
                    "Membership_Degree": w_fpc if not is_placeholder(w_name) else "",
                    "FPC Paket": paket_fpc
                })
                item_rows.append(row_w)
                
                # Kuliner Pagi
                row_kp = base_row.copy()
                row_kp.update({
                    "Hari / Waktu": f"Hari {d_num} - Pagi",
                    "Tipe Item": "Makan Pagi",
                    "Nama Tempat": kp_name,
                    "Estimasi Harga": kp_harga,
                    "Fuzzy Score Item": kp_fs if not is_placeholder(kp_name) else "",
                    "Fuzzy Score Paket": paket_fs,
                    "Membership_Degree": kp_fpc if not is_placeholder(kp_name) else "",
                    "FPC Paket": paket_fpc
                })
                item_rows.append(row_kp)
                
                # Kuliner Siang
                row_ks = base_row.copy()
                row_ks.update({
                    "Hari / Waktu": f"Hari {d_num} - Siang",
                    "Tipe Item": "Makan Siang",
                    "Nama Tempat": ks_name,
                    "Estimasi Harga": ks_harga,
                    "Fuzzy Score Item": ks_fs if not is_placeholder(ks_name) else "",
                    "Fuzzy Score Paket": paket_fs,
                    "Membership_Degree": ks_fpc if not is_placeholder(ks_name) else "",
                    "FPC Paket": paket_fpc
                })
                item_rows.append(row_ks)
                
                # Kuliner Malam
                if d_num < duration or duration == 1:
                    row_km = base_row.copy()
                    row_km.update({
                        "Hari / Waktu": f"Hari {d_num} - Malam",
                        "Tipe Item": "Makan Malam",
                        "Nama Tempat": km_name,
                        "Estimasi Harga": km_harga,
                        "Fuzzy Score Item": km_fs if not is_placeholder(km_name) else "",
                        "Fuzzy Score Paket": paket_fs,
                        "Membership_Degree": km_fpc if not is_placeholder(km_name) else "",
                        "FPC Paket": paket_fpc
                    })
                    item_rows.append(row_km)
                    
            # Add an empty row for visual separation between packages
            item_rows.append({
                "Opsi": "", "Kelas Paket": "", "Hari / Waktu": "", "Tipe Item": "", "Nama Tempat": "", 
                "Estimasi Harga": "", "Fuzzy Score Item": "", "Fuzzy Score Paket": "", "Membership_Degree": "", "FPC Paket": ""
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
                    "Keterangan": "/malam (Status: Checkout)" if h_name == "Checkout" else "/malam (Status: Menginap)"
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
                    "Item / Aktivitas": f"• Kamar Hotel ({nights if h_name != 'Checkout' else 0} Malam)" if h_name == "Checkout" else "• Kamar Hotel (1 Malam)",
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
    
    # ── PRA-KOMPUTASI DOKUMENTASI FCM (sebelum ExcelWriter dibuka) ──
    _doc_sheets = {}  # dict: sheet_name -> DataFrame
    if LAST_CLUSTERED is not None:
        try:
            from fcm_clustering import run_percentile_fcm as _run_pct_fcm
            _run_fcm_ma = run_multi_attribute_fcm
            _get_labels = get_cluster_labels

            _cats = {
                "hotel":   ("Akomodasi (Hotel)",      LAST_CLUSTERED.get("hotel")),
                "wisata":  ("Destinasi Wisata",        LAST_CLUSTERED.get("wisata")),
                "kuliner": ("Kuliner (Tempat Makan)",  LAST_CLUSTERED.get("kuliner")),
            }
            best_c_detected = 2
            for _, df_tmp in _cats.values():
                if df_tmp is not None and "Cluster" in df_tmp.columns:
                    best_c_detected = int(df_tmp["Cluster"].max()) + 1
                    break
            labels_map = _get_labels(best_c_detected)

            # --- TABEL 1: Konvergensi FCM ---
            iterasi_rows = []
            for key, (label, df_cat) in _cats.items():
                if df_cat is None or df_cat.empty:
                    continue
                res_tmp = _run_fcm_ma(df_cat, n_clusters=best_c_detected, workflow="flexible")
                iterasi_rows.append({
                    "Kategori": label,
                    "Jumlah Iterasi (Berhenti saat ‖ΔU‖ < ε)": res_tmp.get("n_iter", "-"),
                    "FPC (Fuzzy Partition Coefficient)": round(res_tmp.get("fpc", 0.0), 6),
                    "XBI (Xie-Beni Index)": round(res_tmp.get("xb", 0.0), 6),
                })
            if iterasi_rows:
                _doc_sheets["FCM Konvergensi"] = pd.DataFrame(iterasi_rows)

            # --- TABEL 2: Centroid Final ---
            centroid_rows = []
            for key, (label, df_cat) in _cats.items():
                if df_cat is None or df_cat.empty:
                    continue
                res_tmp = _run_fcm_ma(df_cat, n_clusters=best_c_detected, workflow="flexible")
                cntr_full = res_tmp.get("cntr_full")
                row = {"Kategori": label}
                if cntr_full is not None:
                    for ci in range(best_c_detected):
                        kelas = labels_map.get(ci, f"Klaster {ci}")
                        row[f"Centroid {kelas} — Harga (Rp)"] = round(float(cntr_full[ci, 0]))
                        row[f"Centroid {kelas} — Rating"] = round(float(cntr_full[ci, 1]), 4)
                        row[f"Centroid {kelas} — Nilai Kategori"] = round(float(cntr_full[ci, 2]), 4)
                centroid_rows.append(row)
            if centroid_rows:
                _doc_sheets["FCM Centroid Final"] = pd.DataFrame(centroid_rows)

            # --- TABEL 3: Sampel Matriks U ---
            for key, (label, df_cat) in _cats.items():
                if df_cat is None or df_cat.empty:
                    continue
                res_tmp = _run_fcm_ma(df_cat, n_clusters=best_c_detected, workflow="flexible")
                u_matrix = res_tmp.get("u")
                sorted_labels_u = res_tmp.get("labels")
                df_u = df_cat.copy().reset_index(drop=True)
                for ci in range(best_c_detected):
                    kelas = labels_map.get(ci, f"Klaster {ci}")
                    df_u[f"U_{kelas}"] = u_matrix[ci, :]
                df_u["Label Klaster"] = [labels_map.get(int(l), str(l)) for l in sorted_labels_u]
                sample_rows_u = []
                if "U_Hemat" in df_u.columns and "Label Klaster" in df_u.columns:
                    hemat_strong = df_u[df_u["Label Klaster"] == "Hemat"].nlargest(2, "U_Hemat")
                    sample_rows_u.append(hemat_strong)
                prem_label = labels_map.get(best_c_detected - 1, "Premium")
                prem_col = f"U_{prem_label}"
                if prem_col in df_u.columns:
                    prem_strong = df_u[df_u["Label Klaster"] == prem_label].nlargest(2, prem_col)
                    sample_rows_u.append(prem_strong)
                if "U_Hemat" in df_u.columns:
                    df_u["_borderline"] = (df_u["U_Hemat"] - 0.5).abs()
                    sample_rows_u.append(df_u.nsmallest(1, "_borderline"))
                if sample_rows_u:
                    df_sample = pd.concat(sample_rows_u).drop_duplicates().head(5)
                    cols_to_show = (["Nama_Tempat", "Estimasi_Harga", "Rating", "Nilai_Numerik"] +
                                    [f"U_{labels_map.get(ci, str(ci))}" for ci in range(best_c_detected)] +
                                    ["Label Klaster"])
                    cols_to_show = [c for c in cols_to_show if c in df_sample.columns]
                    sheet_u = f"Matriks U — {label[:20]}"
                    _doc_sheets[sheet_u] = df_sample[cols_to_show]

            # --- TABEL 4: Normalisasi Detail ---
            def _pick3(df_src, harga_col):
                if len(df_src) == 0:
                    return df_src
                hemat = df_src.nsmallest(1, harga_col)
                premium = df_src.nlargest(1, harga_col)
                mid_idx = df_src[harga_col].sub(df_src[harga_col].median()).abs().idxmin()
                return pd.concat([hemat, df_src.loc[[mid_idx]], premium]).drop_duplicates().head(3)

            for key, (label, df_cat) in _cats.items():
                if df_cat is None or df_cat.empty:
                    continue
                df_n = df_cat.copy()
                prices_n = pd.to_numeric(df_n["Estimasi_Harga"], errors="coerce").fillna(0)
                ratings_n = pd.to_numeric(df_n["Rating"], errors="coerce").fillna(4.0) if "Rating" in df_n.columns else pd.Series(4.0, index=df_n.index)
                cats_n = pd.to_numeric(df_n["Nilai_Numerik"], errors="coerce").fillna(0) if "Nilai_Numerik" in df_n.columns else pd.Series(0.0, index=df_n.index)
                p_min, p_max = prices_n.min(), prices_n.max()
                r_min, r_max = ratings_n.min(), ratings_n.max()
                c_min, c_max = cats_n.min(), cats_n.max()
                W_p, W_r, W_c = 0.8, 0.1, 0.1
                norm_h = (prices_n - p_min) / (p_max - p_min + 1e-10)
                norm_r = (ratings_n - r_min) / (r_max - r_min + 1e-10)
                norm_c = (cats_n - c_min) / (c_max - c_min + 1e-10)
                df_n["Harga Asli (Rp)"] = prices_n
                df_n["Rating Asli"] = ratings_n
                df_n["Kategori Asli (Nilai Numerik)"] = cats_n
                df_n["Norm Harga"] = norm_h.round(6)
                df_n["Norm Rating"] = norm_r.round(6)
                df_n["Norm Kategori"] = norm_c.round(6)
                df_n[f"×Wp ({W_p})"] = (norm_h * W_p).round(6)
                df_n[f"×Wr ({W_r})"] = (norm_r * W_r).round(6)
                df_n[f"×Wc ({W_c})"] = (norm_c * W_c).round(6)
                stats_rows = [
                    {"Statistik Normalisasi": f"Harga — Min: Rp{int(p_min):,} | Max: Rp{int(p_max):,}"},
                    {"Statistik Normalisasi": f"Rating — Min: {r_min:.2f} | Max: {r_max:.2f}"},
                    {"Statistik Normalisasi": f"Kategori (Nilai Numerik) — Min: {c_min} | Max: {c_max}"},
                    {"Statistik Normalisasi": f"Bobot — Harga: {W_p} | Rating: {W_r} | Kategori: {W_c}"},
                ]
                cols_norm = (["Nama_Tempat", "Harga Asli (Rp)", "Rating Asli", "Kategori Asli (Nilai Numerik)",
                              "Norm Harga", "Norm Rating", "Norm Kategori",
                              f"×Wp ({W_p})", f"×Wr ({W_r})", f"×Wc ({W_c})"])
                cols_norm = [c for c in cols_norm if c in df_n.columns]
                df_norm_sample = _pick3(df_n, "Harga Asli (Rp)")[cols_norm]
                sheet_norm = f"Norm Detail — {label[:18]}"
                _doc_sheets[sheet_norm] = (pd.DataFrame(stats_rows), df_norm_sample)  # tuple: (stats, data)

            # --- TABEL 5: XBI & FPC multi-atribut c=2..5 ---
            xb_rows = []
            for c_val in [2, 3, 4, 5]:
                row_xb = {"c": c_val}
                xb_vals_5 = []
                for key, (label, df_cat) in _cats.items():
                    cat_name = "Wisata" if key == "wisata" else ("Hotel" if key == "hotel" else "Kuliner")
                    if df_cat is None or df_cat.empty:
                        row_xb[f"XBI {cat_name}"] = "-"
                        row_xb[f"FPC {cat_name}"] = "-"
                        continue
                    res_c = _run_fcm_ma(df_cat, n_clusters=c_val, workflow="flexible")
                    xb_v = res_c.get("xb", float("inf"))
                    fpc_v = res_c.get("fpc", 0.0)
                    row_xb[f"XBI {cat_name}"] = round(xb_v, 6) if xb_v != float("inf") else "∞"
                    row_xb[f"FPC {cat_name}"] = round(fpc_v, 6)
                    if xb_v != float("inf"):
                        xb_vals_5.append(xb_v)
                
                # Enforce column order: c | XBI Wisata | XBI Hotel | XBI Kuliner | FPC Wisata | FPC Hotel | FPC Kuliner | Rata-rata XBI
                ordered_row_xb = {"c": c_val}
                for c_name in ["Wisata", "Hotel", "Kuliner"]:
                    ordered_row_xb[f"XBI {c_name}"] = row_xb.get(f"XBI {c_name}", "-")
                for c_name in ["Wisata", "Hotel", "Kuliner"]:
                    ordered_row_xb[f"FPC {c_name}"] = row_xb.get(f"FPC {c_name}", "-")
                ordered_row_xb["Rata-rata XBI"] = round(sum(xb_vals_5) / len(xb_vals_5), 6) if xb_vals_5 else "∞"
                xb_rows.append(ordered_row_xb)
            if xb_rows:
                _doc_sheets["XBI & FPC (c=2 sampai 5)"] = pd.DataFrame(xb_rows)

            # --- TABEL 5b: XBI Skripsi (3D Multi-Atribut) ---
            xb_skripsi_rows = []
            for c_val in [2, 3, 4, 5]:
                row_sk2 = {"c": c_val}
                xb_vals_sk2 = []
                for key, (label, df_cat) in _cats.items():
                    if df_cat is None or df_cat.empty:
                        row_sk2[f"XBI {label.split('(')[0].strip()}"] = "-"
                        continue
                    res_ma = _run_fcm_ma(df_cat, n_clusters=c_val, workflow="flexible")
                    xb_v2 = res_ma.get("xb", float("inf"))
                    col_name = f"XBI {label.split('(')[0].strip()}"
                    if xb_v2 == float("inf"):
                        row_sk2[col_name] = "∞"
                    else:
                        row_sk2[col_name] = round(xb_v2, 6)
                        xb_vals_sk2.append(xb_v2)
                row_sk2["Rata-rata XBI"] = round(sum(xb_vals_sk2) / len(xb_vals_sk2), 6) if xb_vals_sk2 else "∞"
                xb_skripsi_rows.append(row_sk2)
            if xb_skripsi_rows:
                _doc_sheets["XBI per Kategori (Skripsi)"] = pd.DataFrame(xb_skripsi_rows)

            # --- TABEL 6: Breakdown XBI untuk best_c ---
            breakdown_rows = []
            for key, (label, df_cat) in _cats.items():
                if df_cat is None or df_cat.empty:
                    continue
                prices_bd = pd.to_numeric(df_cat["Estimasi_Harga"], errors="coerce").fillna(0).values.astype(float)
                ratings_bd = pd.to_numeric(df_cat["Rating"], errors="coerce").fillna(4.0).values.astype(float) if "Rating" in df_cat.columns else np.full(len(df_cat), 4.0)
                cats_bd = pd.to_numeric(df_cat["Nilai_Numerik"], errors="coerce").fillna(0).values.astype(float) if "Nilai_Numerik" in df_cat.columns else np.zeros(len(df_cat))
                p_min_bd, p_max_bd = prices_bd.min(), prices_bd.max()
                r_min_bd, r_max_bd = ratings_bd.min(), ratings_bd.max()
                c_min_bd, c_max_bd = cats_bd.min(), cats_bd.max()
                W_p2, W_r2, W_c2 = 0.8, 0.1, 0.1
                p_sc = ((prices_bd - p_min_bd) / (p_max_bd - p_min_bd + 1e-10)) * W_p2
                r_sc = ((ratings_bd - r_min_bd) / (r_max_bd - r_min_bd + 1e-10)) * W_r2
                c_sc = ((cats_bd - c_min_bd) / (c_max_bd - c_min_bd + 1e-10)) * W_c2
                X_bd = np.column_stack([p_sc, r_sc, c_sc])
                res_bd = _run_fcm_ma(df_cat, n_clusters=best_c_detected, workflow="flexible")
                u_bd = res_bd["u"]
                cntr_full_bd = res_bd.get("cntr_full")
                if cntr_full_bd is None:
                    continue
                cntr_sc = np.column_stack([
                    ((cntr_full_bd[:, 0] - p_min_bd) / (p_max_bd - p_min_bd + 1e-10)) * W_p2,
                    ((cntr_full_bd[:, 1] - r_min_bd) / (r_max_bd - r_min_bd + 1e-10)) * W_r2,
                    ((cntr_full_bd[:, 2] - c_min_bd) / (c_max_bd - c_min_bd + 1e-10)) * W_c2,
                ])
                sigma_bd = 0.0
                for ki in range(best_c_detected):
                    diff_bd = X_bd - cntr_sc[ki]
                    dist_sq_bd = np.sum(diff_bd ** 2, axis=1)
                    sigma_bd += float(np.sum((u_bd[ki, :] ** 2) * dist_sq_bd))
                sep_bd = float("inf")
                for ki in range(best_c_detected):
                    for ji in range(ki + 1, best_c_detected):
                        d2 = float(np.sum((cntr_sc[ki] - cntr_sc[ji]) ** 2))
                        if d2 < sep_bd:
                            sep_bd = d2
                N_bd = len(X_bd)
                xb_bd = sigma_bd / (N_bd * sep_bd) if sep_bd > 0 else float("inf")
                breakdown_rows.append({
                    "Kategori": label,
                    "N (jumlah data)": N_bd,
                    "Total Variansi (σ)": round(sigma_bd, 6),
                    "Separasi Min (sep)": round(sep_bd, 6),
                    "XBI": round(xb_bd, 6) if xb_bd != float("inf") else "∞",
                    "FPC": round(res_bd.get("fpc", 0.0), 6),
                })
            if breakdown_rows:
                _doc_sheets[f"XBI Breakdown c={best_c_detected}"] = pd.DataFrame(breakdown_rows)

            # --- TABEL 7: Perbandingan 4 Skema Rasio ---
            skema_defs = {"A": [0.8, 1.2], "B": [0.7, 1.3], "C": [0.6, 1.4], "D": [0.5, 1.5]}
            skema_rows = []
            for skema_name, rasio_list in skema_defs.items():
                rasio_label = " — ".join([f"{r}×" for r in rasio_list])
                row_sk = {"Skema": skema_name, "Rasio": rasio_label}
                xb_vals_sk = []
                for key, (label, df_cat) in _cats.items():
                    cat_name = "Wisata" if key == "wisata" else ("Hotel" if key == "hotel" else "Kuliner")
                    if df_cat is None or df_cat.empty:
                        row_sk[f"XBI {cat_name}"] = "-"
                        row_sk[f"FPC {cat_name}"] = "-"
                        continue
                    prices_sk = pd.to_numeric(df_cat["Estimasi_Harga"], errors="coerce").fillna(0).values.astype(float)
                    anchor_sk = float(np.median(prices_sk))
                    res_sk = _run_fcm_ma(df_cat, budget_anchor=anchor_sk * rasio_list[0], n_clusters=best_c_detected, workflow="budget")
                    xb_v_sk = res_sk.get("xb", float("inf"))
                    fpc_v_sk = res_sk.get("fpc", 0.0)
                    row_sk[f"XBI {cat_name}"] = round(xb_v_sk, 6) if xb_v_sk != float("inf") else "∞"
                    row_sk[f"FPC {cat_name}"] = round(fpc_v_sk, 6)
                    if xb_v_sk != float("inf"):
                        xb_vals_sk.append(xb_v_sk)
                
                # Enforce column order: Skema | Rasio | XBI Wisata | XBI Hotel | XBI Kuliner | FPC Wisata | FPC Hotel | FPC Kuliner | Rata-rata XBI
                ordered_row_sk = {"Skema": skema_name, "Rasio": rasio_label}
                for c_name in ["Wisata", "Hotel", "Kuliner"]:
                    ordered_row_sk[f"XBI {c_name}"] = row_sk.get(f"XBI {c_name}", "-")
                for c_name in ["Wisata", "Hotel", "Kuliner"]:
                    ordered_row_sk[f"FPC {c_name}"] = row_sk.get(f"FPC {c_name}", "-")
                ordered_row_sk["Rata-rata XBI"] = round(sum(xb_vals_sk) / len(xb_vals_sk), 6) if xb_vals_sk else "∞"
                skema_rows.append(ordered_row_sk)
            if skema_rows:
                _doc_sheets["Skema Rasio Perbandingan"] = pd.DataFrame(skema_rows)

        except Exception as _e_doc:
            print(f"   ⚠ Gagal pra-komputasi dokumentasi FCM: {_e_doc}")

    with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
        df_meta.to_excel(writer, sheet_name="Rekomendasi Paket", index=False, startrow=0)
        df_items.to_excel(writer, sheet_name="Rekomendasi Paket", index=False, startrow=len(df_meta) + 2)
        df_detail.to_excel(writer, sheet_name="Detail Itinerary & Biaya", index=False)
        
        comparison_data = None
        if options_list:
            comparison_data = options_list[0].get("ranking_comparison")
            
        if comparison_data:
            if isinstance(comparison_data, dict) and "Hotel" in comparison_data:
                pd.DataFrame(comparison_data["Hotel"]).to_excel(writer, sheet_name="Ranking Hotel", index=False)
                pd.DataFrame(comparison_data["Wisata"]).to_excel(writer, sheet_name="Ranking Wisata", index=False)
                pd.DataFrame(comparison_data["Kuliner"]).to_excel(writer, sheet_name="Ranking Makan", index=False)
            else:
                df_comp = pd.DataFrame(comparison_data)
                df_comp.to_excel(writer, sheet_name="Perbandingan Boost Ranking", index=False)
        
        if LAST_CLUSTERED is not None:
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

        # ── TULIS SHEET DOKUMENTASI FCM (dalam ExcelWriter yang sama) ──
        for _sheet_name, _sheet_data in _doc_sheets.items():
            try:
                if isinstance(_sheet_data, tuple):
                    # Sheet dengan stats header + data table (Tabel 4 Normalisasi)
                    _df_stats, _df_data = _sheet_data
                    _df_stats.to_excel(writer, sheet_name=_sheet_name, index=False, startrow=0)
                    _df_data.to_excel(writer, sheet_name=_sheet_name, index=False, startrow=len(_df_stats) + 2)
                else:
                    _sheet_data.to_excel(writer, sheet_name=_sheet_name, index=False)
            except Exception as _e_sheet:
                print(f"   ⚠ Gagal menulis sheet '{_sheet_name}': {_e_sheet}")

    print(f"   [Excel Exported with Cluster Sheets] -> {filepath}")
