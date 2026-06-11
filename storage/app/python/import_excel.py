import os
import sys
import json
import argparse
import pandas as pd
import numpy as np

# Ensure threads are limited
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"

# Import configurations
from config import DATASET_WISATA, DATASET_HOTEL, DATASET_MAKAN

# Define expected columns for each dataset
SCHEMAS = {
    "wisata": [
        'Id_Tempat', 'Nama_Tempat', 'Rating', 'Jumlah_Ulasan', 'Kategori', 
        'Latitude', 'Longitude', 'Link', 'Estimasi_Harga', 'Sumber_Data', 'Link_Sumber'
    ],
    "hotel": [
        'Id_Tempat', 'Nama_Tempat', 'Latitude', 'Longitude', 'Estimasi_Harga', 'Sumber_Data'
    ],
    "kuliner": [
        'Id_Tempat', 'Nama_Tempat', 'Rating', 'Jumlah_Ulasan', 'Kategori', 
        'Latitude', 'Longitude', 'Link', 'Menu_Termurah', 'Harga_Termurah', 
        'Menu_Termahal', 'Harga_Termahal', 'Harga_Median', 'Status', 
        'Estimasi_Harga', 'Sumber_Data', 'Link_Sumber'
    ]
}

def safe_to_int(series, fallback_val=0):
    try:
        converted = pd.to_numeric(series, errors="coerce")
        if hasattr(converted, "fillna"):
            return converted.fillna(fallback_val).astype(int)
        else:
            import math
            if converted is None or (isinstance(converted, float) and math.isnan(converted)):
                return fallback_val
            return int(converted)
    except Exception:
        return fallback_val

def safe_to_float(series, fallback_val=0.0):
    try:
        converted = pd.to_numeric(series, errors="coerce")
        if hasattr(converted, "fillna"):
            return converted.fillna(fallback_val).astype(float)
        else:
            if converted is None:
                return fallback_val
            val = (converted)
            import math
            if math.isnan(val):
                return fallback_val
            return val
    except Exception:
        return fallback_val

def auto_assign_ids(df_new, df_orig, start_id=1):
    existing_ids = set()
    max_id = start_id - 1
    
    # Track existing IDs in original dataframe to avoid overlaps
    if df_orig is not None and len(df_orig) > 0 and 'Id_Tempat' in df_orig.columns:
        for idx in df_orig['Id_Tempat']:
            if pd.notna(idx):
                try:
                    val = int(float(idx))
                    existing_ids.add(val)
                    if val > max_id:
                        max_id = val
                except ValueError:
                    pass

    # Ensure Id_Tempat column exists in df_new
    if 'Id_Tempat' not in df_new.columns:
        df_new['Id_Tempat'] = ""
        
    next_id = max_id + 1
    new_ids = []
    
    # Process and fill missing IDs in new dataframe
    for val in df_new['Id_Tempat']:
        val_str = str(val).strip() if pd.notna(val) else ""
        if val_str.endswith(".0"):
            val_str = val_str[:-2]
            
        if val_str == "" or val_str == "nan" or val_str == "0":
            # Auto-assign next integer ID
            while next_id in existing_ids:
                next_id += 1
            new_ids.append(str(next_id))
            existing_ids.add(next_id)
            next_id += 1
        else:
            try:
                int_val = int(float(val_str))
                new_ids.append(str(int_val))
                existing_ids.add(int_val)
            except ValueError:
                new_ids.append(val_str)
                
    df_new['Id_Tempat'] = new_ids
    return df_new

def clean_data(df, dataset_type):
    df_clean = df.copy()
    
    # Fill missing strings
    string_cols = ['Nama_Tempat', 'Kategori', 'Link', 'Sumber_Data', 'Link_Sumber', 'Status', 'Menu_Termurah', 'Menu_Termahal']
    for col in string_cols:
        if col in df_clean.columns:
            df_clean[col] = df_clean[col].fillna("").astype(str).str.strip()

    # Clean Id_Tempat - ensure it is string/stripped
    if 'Id_Tempat' in df_clean.columns:
        df_clean['Id_Tempat'] = df_clean['Id_Tempat'].fillna("").astype(str).str.strip()
        # Drop rows where Id_Tempat is empty
        df_clean = df_clean[df_clean['Id_Tempat'] != ""]

    # Clean numerical columns
    num_cols_int = ['Estimasi_Harga', 'Jumlah_Ulasan', 'Harga_Termurah', 'Harga_Termahal', 'Harga_Median']
    for col in num_cols_int:
        if col in df_clean.columns:
            df_clean[col] = safe_to_int(df_clean[col], 0)

    num_cols_float = ['Rating', 'Latitude', 'Longitude']
    for col in num_cols_float:
        if col in df_clean.columns:
            # Defaults
            default_val = 4.0 if col == 'Rating' else 0.0
            df_clean[col] = safe_to_float(df_clean[col], default_val)
            
    return df_clean

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--file', type=str, required=True, help='Path to uploaded Excel file')
    parser.add_argument('--type', type=str, required=True, choices=['wisata', 'hotel', 'kuliner'], help='Dataset type')
    parser.add_argument('--mode', type=str, required=True, choices=['append', 'replace'], help='Import mode')
    args = parser.parse_args()

    uploaded_file = args.file
    dataset_type = args.type
    import_mode = args.mode

    # Resolve target file path
    if dataset_type == 'wisata':
        target_path = DATASET_WISATA
    elif dataset_type == 'hotel':
        target_path = DATASET_HOTEL
    else:
        target_path = DATASET_MAKAN

    if not os.path.exists(uploaded_file):
        print(json.dumps({"status": "error", "message": f"Berkas unggahan tidak ditemukan di path: {uploaded_file}"}))
        sys.exit(1)

    try:
        # Load uploaded file
        df_new = pd.read_excel(uploaded_file)
    except Exception as e:
        print(json.dumps({"status": "error", "message": f"Gagal membaca berkas Excel unggahan: {str(e)}"}))
        sys.exit(1)

    # Validate Schema Columns (Id_Tempat is optional in upload, auto-assigned)
    required_cols = SCHEMAS[dataset_type]
    required_cols_to_check = [col for col in required_cols if col != 'Id_Tempat']
    missing_cols = [col for col in required_cols_to_check if col not in df_new.columns]
    if missing_cols:
        print(json.dumps({
            "status": "error", 
            "message": f"Skema Excel salah. Kolom berikut tidak ditemukan: {', '.join(missing_cols)}. Harap sesuaikan dengan format template."
        }))
        sys.exit(1)

    try:
        # Resolve original dataset to determine max ID and merge
        df_orig = None
        if os.path.exists(target_path):
            try:
                df_orig = pd.read_excel(target_path)
            except Exception:
                pass

        # Auto-assign IDs to the new uploaded data
        df_new = auto_assign_ids(df_new, df_orig)

        # Pre-clean uploaded dataframe
        df_new_cleaned = clean_data(df_new[required_cols], dataset_type)
        added_count = len(df_new_cleaned)

        if import_mode == 'append' and df_orig is not None:
            df_orig_cleaned = clean_data(df_orig[required_cols], dataset_type)
            
            # Combine
            df_combined = pd.concat([df_orig_cleaned, df_new_cleaned], ignore_index=True)
            
            # Remove duplicate Id_Tempat, keeping the newly uploaded one (last entry)
            df_combined = df_combined.drop_duplicates(subset=['Id_Tempat'], keep='last').reset_index(drop=True)
            
            final_df = df_combined
            actual_added = len(final_df) - len(df_orig_cleaned)
        else:
            final_df = df_new_cleaned
            actual_added = added_count

        # Save back to target file
        final_df.to_excel(target_path, index=False)

        print(json.dumps({
            "status": "success",
            "message": f"Berhasil mengimpor data dalam mode {import_mode.upper()}.",
            "added_rows": (actual_added),
            "total_rows": (len(final_df))
        }, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({"status": "error", "message": f"Terjadi kesalahan saat menyimpan dataset: {str(e)}"}))
        sys.exit(1)

if __name__ == '__main__':
    main()
