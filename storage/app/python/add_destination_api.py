"""
add_destination_api.py
========================
API untuk mencari kandidat destinasi tambahan berdasarkan:
- Koordinat wisata saat ini (anchor lat/lon)
- Sisa budget user
- Daftar Id wisata yang sudah ada di hari itu (exclude)
- Cluster ID (opsional, untuk menjaga konsistensi kategori paket)

Output JSON:
{
  "status": "success",
  "candidates": [
    {
      "id": 123,
      "nama": "Taman XYZ",
      "kategori": "Wisata Alam",
      "harga_tiket": 15000,
      "rating": 4.5,
      "distance_km": 2.3,
      "lat": -7.88,
      "lon": 112.52,
      "has_additional_cost": 0,
      "additional_cost_label": "",
      "additional_cost_min": 0,
      "additional_cost_max": 0
    }, ...
  ]
}

Jalankan dari Laravel via:
  python add_destination_api.py
    --lat -7.89 --lon 112.53
    --budget_remaining 150000
    --persons 2
    --existing_ids "16,42,50"   (opsional)
    --max_results 10
    --max_dist_km 15
"""

import os
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"

import argparse
import json
import math
import sys
import io

import warnings
warnings.filterwarnings("ignore")

# pyrefly: ignore [missing-source-for-stubs]
import pandas as pd


def haversine(lat1, lon1, lat2, lon2):
    R = 6_371.0  # km
    phi1, phi2 = math.radians(float(lat1)), math.radians(float(lat2))
    dphi = math.radians(float(lat2) - float(lat1))
    dlambda = math.radians(float(lon2) - float(lon1))
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def sanitize_nan(obj):
    if isinstance(obj, float):
        return obj if math.isfinite(obj) else None
    if isinstance(obj, dict):
        return {k: sanitize_nan(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [sanitize_nan(v) for v in obj]
    return obj


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--lat",              type=float, required=True,  help="Latitude wisata saat ini (anchor)")
    parser.add_argument("--lon",              type=float, required=True,  help="Longitude wisata saat ini (anchor)")
    parser.add_argument("--budget_remaining", type=float, required=True,  help="Sisa budget setelah paket + wahana (Rp)")
    parser.add_argument("--persons",          type=int,   default=1,      help="Jumlah peserta")
    parser.add_argument("--existing_ids",     type=str,   default="",     help="Id wisata yang sudah ada hari ini (comma-separated)")
    parser.add_argument("--max_results",      type=int,   default=12,     help="Maksimal kandidat yang dikembalikan")
    parser.add_argument("--max_dist_km",      type=float, default=20.0,   help="Radius pencarian maksimal (km)")
    args = parser.parse_args()

    # Parse existing IDs to exclude
    excluded_ids = set()
    if args.existing_ids.strip():
        for sid in args.existing_ids.split(","):
            sid = sid.strip()
            if sid.isdigit():
                excluded_ids.add(int(sid))

    # Budget per orang yang tersedia untuk tiket masuk wisata tambahan
    # Kita sisakan 15% dari budget_remaining untuk transport tambahan
    transport_buffer = args.budget_remaining * 0.15
    budget_for_ticket = args.budget_remaining - transport_buffer
    max_ticket_per_person = budget_for_ticket / max(args.persons, 1)

    # Load dataset
    base_dir = os.path.dirname(os.path.abspath(__file__))
    from config import load_wisata_dataset
    from recommender import _get_additional_facilities_for_wisata
    df = load_wisata_dataset()

    # Expand excluded_ids to include all members of the same destination family
    # Ini memastikan wisata yang sudah jadi "Fasilitas Opsional" tidak muncul lagi
    if "destination_family_id" in df.columns:
        extended_ids = set(excluded_ids)
        for eid in excluded_ids:
            row = df[df["Id_Tempat"] == eid]
            if not row.empty:
                fam_id = row.iloc[0].get("destination_family_id")
                parent_id = int(float(fam_id)) if (fam_id is not None and not pd.isna(fam_id)) else eid
                extended_ids.add(parent_id)
                children = df[df["destination_family_id"] == parent_id]["Id_Tempat"]
                for child in children:
                    extended_ids.add(int(child))
        excluded_ids = extended_ids

    results = []
    for _, row in df.iterrows():
        tid = int(row["Id_Tempat"])
        if tid in excluded_ids:
            continue

        harga = float(row.get("Estimasi_Harga", 0) or 0)
        # Filter: tiket masuk tidak boleh melebihi budget per orang yang tersedia
        if harga > max_ticket_per_person:
            continue

        # Filter: Jangan jadikan "Anak" (child) sebagai kandidat destinasi utama.
        # Destinasi Anak hanya boleh diakses melalui fasilitas opsional Induknya.
        fam_id = row.get("destination_family_id")
        if fam_id is not None and not pd.isna(fam_id):
            parent_id = int(float(fam_id))
            if tid != parent_id:
                continue

        try:
            dist = haversine(args.lat, args.lon, float(row["Latitude"]), float(row["Longitude"]))
        except Exception:
            continue

        if dist > args.max_dist_km:
            continue

        def safe_str(val):
            if val is None:
                return ""
            if isinstance(val, float) and math.isnan(val):
                return ""
            s = str(val).strip()
            return "" if s.lower() == "nan" else s

        def safe_int(val, default=0):
            try:
                if val is None or (isinstance(val, float) and math.isnan(val)):
                    return default
                return int(val)
            except Exception:
                return default

        # Ambil fasilitas opsional (anak) jika ini adalah destinasi induk
        facs = _get_additional_facilities_for_wisata(row.to_dict(), df)

        results.append({
            "id":                    tid,
            "nama":                  str(row.get("Nama_Tempat", "")),
            "kategori":              str(row.get("Kategori", "")),
            "harga_tiket":           int(harga),
            "rating":                float(row.get("Rating", 0) or 0),
            "jumlah_ulasan":         safe_int(row.get("Jumlah_Ulasan", 0)),
            "distance_km":           round(dist, 2),
            "lat":                   float(row.get("Latitude", 0)),
            "lon":                   float(row.get("Longitude", 0)),
            "has_additional_cost":   0,
            "additional_cost_label": "",
            "additional_cost_min":   0,
            "additional_cost_max":   0,
            # Total biaya tiket untuk seluruh peserta
            "total_ticket_cost":     int(harga) * args.persons,
            "additional_facilities": facs
        })

    # Urutkan: terdekat & rating tertinggi
    results.sort(key=lambda x: (round(x["distance_km"], 0), -x["rating"]))
    results = results[: args.max_results]

    print(json.dumps(sanitize_nan({
        "status":     "success",
        "anchor_lat": args.lat,
        "anchor_lon": args.lon,
        "budget_remaining": args.budget_remaining,
        "budget_for_ticket": round(budget_for_ticket, 0),
        "persons":    args.persons,
        "candidates": results,
    }), allow_nan=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))
