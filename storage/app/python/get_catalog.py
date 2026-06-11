import os
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"

import json
import re
import pandas as pd

# Path configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
GAMBAR_DIR = os.path.join(ROOT_DIR, "public", "assets", "GAMBAR")

from config import DATASET_WISATA, DATASET_HOTEL, DATASET_MAKAN

def format_folder_name(name):
    # Standardize folder name: strip, replace spaces with underscores
    if not isinstance(name, str):
        return ""
    # Safe folder name matching
    folder = name.strip().replace(" ", "_")
    return folder

def get_images_for_place(category, place_name):
    folder_name = format_folder_name(place_name)
    if not folder_name:
        return []
    
    # Target directory path
    target_dir = os.path.join(GAMBAR_DIR, category, folder_name)
    if not os.path.exists(target_dir) or not os.path.isdir(target_dir):
        return []
    
    # List and sort image files inside
    images = []
    try:
        for f in os.listdir(target_dir):
            if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                images.append(f)
        images.sort()
        
        # Convert to web-accessible relative URLs
        # Format: /assets/GAMBAR/{category}/{folder_name}/{image_name}
        return [f"/assets/GAMBAR/{category}/{folder_name}/{img}" for img in images]
    except Exception:
        return []

def safe_to_int_series(df, col_name, fallback_val=0):
    if col_name not in df.columns:
        df[col_name] = fallback_val
        return
    try:
        converted = pd.to_numeric(df[col_name], errors="coerce")
        if hasattr(converted, "fillna"):
            df[col_name] = converted.fillna(fallback_val).astype(int)
        else:
            import math
            if converted is None or (isinstance(converted, float) and math.isnan(converted)):
                df[col_name] = int(fallback_val)
            else:
                df[col_name] = int(converted)
    except Exception:
        df[col_name] = fallback_val

def safe_to_float_series(df, col_name, fallback_val=4.0):
    if col_name not in df.columns:
        df[col_name] = fallback_val
        return
    try:
        converted = pd.to_numeric(df[col_name], errors="coerce")
        if hasattr(converted, "fillna"):
            df[col_name] = converted.fillna(fallback_val).astype(float)
        else:
            import math
            if converted is None or (isinstance(converted, float) and math.isnan(converted)):
                df[col_name] = fallback_val
            else:
                df[col_name] = converted
    except Exception:
        df[col_name] = fallback_val

def main():
    print("🚀 Running get_catalog.py Image Asset Scanner & Exporter...")
    
    # Load datasets
    df_w = pd.read_excel(DATASET_WISATA)
    df_h = pd.read_excel(DATASET_HOTEL)
    df_m = pd.read_excel(DATASET_MAKAN)
    
    # Preprocess columns & handles safely
    safe_to_int_series(df_w, "Estimasi_Harga", 0)
    safe_to_int_series(df_h, "Estimasi_Harga", 0)
    safe_to_int_series(df_m, "Estimasi_Harga", 0)
    
    safe_to_float_series(df_w, "Rating", 4.0)
    safe_to_int_series(df_w, "Jumlah_Ulasan", 0)
    
    safe_to_float_series(df_m, "Rating", 4.0)
    safe_to_int_series(df_m, "Jumlah_Ulasan", 0)

    # Initialize catalogs & search lists
    search_index = []
    
    # 1. PROCESS WISATA
    wisata_list = []
    for _, row in df_w.iterrows():
        name = row["Nama_Tempat"]
        imgs = get_images_for_place("wisata", name)
        item = {
            "Id_Tempat": str(row["Id_Tempat"]),
            "Nama_Tempat": name,
            "Kategori": "Wisata",
            "Sub_Kategori": row.get("Kategori", "Nature"),
            "Estimasi_Harga": int(row["Estimasi_Harga"]),
            "Rating": float(row["Rating"]),
            "Jumlah_Ulasan": int(row["Jumlah_Ulasan"]),
            "Latitude": float(row.get("Latitude", 0)),
            "Longitude": float(row.get("Longitude", 0)),
            "Link": row.get("Link", ""),
            "Gambar": imgs,
            "Has_Gambar": len(imgs) > 0
        }
        wisata_list.append(item)
        search_index.append(item)
        
    # 2. PROCESS HOTEL
    hotel_list = []
    for _, row in df_h.iterrows():
        name = row["Nama_Tempat"]
        imgs = get_images_for_place("hotel", name)
        item = {
            "Id_Tempat": str(row["Id_Tempat"]),
            "Nama_Tempat": name,
            "Kategori": "Hotel",
            "Sub_Kategori": "Akomodasi",
            "Estimasi_Harga": int(row["Estimasi_Harga"]),
            "Rating": 4.5, # Default for hotels since rating is not in sheet
            "Jumlah_Ulasan": 120, # Default for hotels
            "Latitude": float(row.get("Latitude", 0)),
            "Longitude": float(row.get("Longitude", 0)),
            "Link": "",
            "Gambar": imgs,
            "Has_Gambar": len(imgs) > 0
        }
        hotel_list.append(item)
        search_index.append(item)
        
    # 3. PROCESS KULINER
    kuliner_list = []
    for _, row in df_m.iterrows():
        name = row["Nama_Tempat"]
        imgs = get_images_for_place("makan", name)
        item = {
            "Id_Tempat": str(row["Id_Tempat"]),
            "Nama_Tempat": name,
            "Kategori": "Kuliner",
            "Sub_Kategori": row.get("Kategori", "Makanan"),
            "Estimasi_Harga": int(row["Estimasi_Harga"]),
            "Rating": float(row["Rating"]),
            "Jumlah_Ulasan": int(row["Jumlah_Ulasan"]),
            "Latitude": float(row.get("Latitude", 0)),
            "Longitude": float(row.get("Longitude", 0)),
            "Link": row.get("Link", ""),
            "Gambar": imgs,
            "Has_Gambar": len(imgs) > 0
        }
        kuliner_list.append(item)
        search_index.append(item)
        
    # SELECT FEATURED ITEMS FOR CAROUSEL (Top 8 of each category)
    # Rules: Places with images are prioritized first!
    featured_wisata = sorted(wisata_list, key=lambda x: (x["Has_Gambar"], x["Rating"], x["Jumlah_Ulasan"]), reverse=True)[:8]
    featured_hotel = sorted(hotel_list, key=lambda x: (x["Has_Gambar"], -x["Estimasi_Harga"] if x["Estimasi_Harga"] > 0 else 999999), reverse=True)[:8]
    # For Culinary, prioritize high ratings and reviews
    featured_kuliner = sorted(kuliner_list, key=lambda x: (x["Rating"], x["Jumlah_Ulasan"]), reverse=True)[:8]
    
    catalog_featured = {
        "wisata": featured_wisata,
        "hotel": featured_hotel,
        "kuliner": featured_kuliner
    }
    
    # Save cache files
    featured_path = os.path.join(BASE_DIR, "catalog_featured.json")
    search_path = os.path.join(ROOT_DIR, "public", "assets", "search_index.json")
    
    with open(featured_path, "w", encoding="utf-8") as f:
        json.dump(catalog_featured, f, ensure_ascii=False, indent=2)
        
    with open(search_path, "w", encoding="utf-8") as f:
        json.dump(search_index, f, ensure_ascii=False, indent=2)
        
    print(f"✅ Cache generated successfully!")
    print(f"   - Featured items (homepage): {featured_path} ({len(featured_wisata)} wisata, {len(featured_hotel)} hotels, {len(featured_kuliner)} kuliner)")
    print(f"   - Search Autocomplete Index: {search_path} ({len(search_index)} items total)")

if __name__ == "__main__":
    main()
