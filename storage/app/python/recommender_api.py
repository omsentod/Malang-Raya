import os
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"

import argparse
import json
import math
import sys
import io


def sanitize_nan(obj):
    """
    Ganti NaN/Infinity (float non-finite) menjadi None secara rekursif.

    Diperlukan karena json.dumps Python memancarkan token NaN/Infinity yang
    BUKAN JSON valid, sehingga json_decode PHP menolaknya (respons 500 di web).
    Nilai non-finite ini berasal dari sel kosong dataset yang ikut ter-dump
    lewat to_dict("records") ke dalam clustered_items.
    """
    if isinstance(obj, float):
        return obj if math.isfinite(obj) else None
    if isinstance(obj, dict):
        return {k: sanitize_nan(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [sanitize_nan(v) for v in obj]
    return obj
# pyrefly: ignore [missing-source-for-stubs]
import pandas as pd
import warnings
warnings.filterwarnings('ignore')

from recommender import (
    generate_packages,
    generate_flexible_exploration_packages,
    generate_destination_first_packages,
    export_to_excel_recom
)

def load_datasets():
    from config import DATASET_WISATA, DATASET_HOTEL, DATASET_MAKAN
    return {
        "wisata": pd.read_excel(DATASET_WISATA),
        "hotel": pd.read_excel(DATASET_HOTEL),
        "kuliner": pd.read_excel(DATASET_MAKAN)
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--workflow', type=str, required=True,
                        choices=['budget', 'flexible', 'destination'])
    parser.add_argument('--budget', type=float, default=None)
    parser.add_argument('--persons', type=int, required=True)
    parser.add_argument('--duration', type=int, required=True)
    parser.add_argument('--dest_id', type=str, default=None)
    parser.add_argument('--transport', type=str, default=None)
    parser.add_argument('--hotel_mode', type=str, default='same',
                        choices=['same', 'split'])
    parser.add_argument('--pref_hemat', type=float, default=0.33)
    parser.add_argument('--pref_balanced', type=float, default=0.33)
    parser.add_argument('--pref_premium', type=float, default=0.34)
    parser.add_argument('--user_id', type=str, default='guest')

    args = parser.parse_args()

    # Simpan stdout asli di sini, sebelum blok try, agar selalu terdefinisi
    # bahkan jika exception terjadi sebelum redirection dimulai.
    old_stdout = sys.stdout

    try:
        datasets = load_datasets()
        
        # Implement 3-tier min rating filter
        pref_bias = args.pref_premium - args.pref_hemat
        if pref_bias < -0.1: # Backpacker
            min_rating = 0.0
        elif pref_bias > 0.1: # Luxury
            min_rating = 4.2
        else: # Mid-range
            min_rating = 3.8
            
        for key in datasets:
            if 'Kategori' in datasets[key].columns:
                datasets[key]['Kategori_Asli'] = datasets[key]['Kategori']
            
            if 'Rating' in datasets[key].columns:
                filtered_df = datasets[key][datasets[key]['Rating'] >= min_rating].copy()
                if not filtered_df.empty:
                    datasets[key] = filtered_df
        
        packages = []

        # Setup redirection to capture verbose prints
        captured_io = io.StringIO()
        sys.stdout = captured_io

        try:
            if args.workflow == 'budget':
                if args.budget is None:
                    raise ValueError("Workflow 'budget' requires --budget argument")
                packages = generate_packages(
                    total_budget=args.budget,
                    num_persons=args.persons,
                    duration=args.duration,
                    datasets=datasets,
                    verbose=True,
                    transport_mode=args.transport,
                    hotel_mode=args.hotel_mode,
                    pref_hemat=args.pref_hemat,
                    pref_balanced=args.pref_balanced,
                    pref_premium=args.pref_premium,
                    user_id=args.user_id,
                )

            elif args.workflow == 'flexible':
                packages = generate_flexible_exploration_packages(
                    num_persons=args.persons,
                    duration=args.duration,
                    datasets=datasets,
                    verbose=True,
                    transport_mode=args.transport,
                    pref_hemat=args.pref_hemat,
                    pref_balanced=args.pref_balanced,
                    pref_premium=args.pref_premium,
                    user_id=args.user_id,
                )

            elif args.workflow == 'destination':
                if args.dest_id is None:
                    raise ValueError("Workflow 'destination' requires --dest_id argument")
                packages = generate_destination_first_packages(
                    locked_wisata_id=args.dest_id,
                    num_persons=args.persons,
                    duration=args.duration,
                    datasets=datasets,
                    total_budget=args.budget,
                    verbose=True,
                    transport_mode=args.transport,
                    hotel_mode=args.hotel_mode,
                    pref_hemat=args.pref_hemat,
                    pref_balanced=args.pref_balanced,
                    pref_premium=args.pref_premium,
                    user_id=args.user_id,
                    pref_wisata=args.pref_wisata,
                    pref_hotel=args.pref_hotel,
                    pref_kuliner=args.pref_kuliner,
                )
            # Ekspor otomatis hasil rekomendasi ke berkas Excel di output/hasil-rekomendasi
            try:
                export_to_excel_recom(
                    options_list=packages,
                    workflow=args.workflow,
                    budget=args.budget,
                    persons=args.persons,
                    duration=args.duration
                )
            except Exception as ex_err:
                print(f"Warning Excel Export: {str(ex_err)}")
        finally:
            sys.stdout = old_stdout

        verbose_text = captured_io.getvalue()

        # Mengembalikan array packages sebagai respon JSON terstruktur.
        # sanitize_nan + allow_nan=False menjamin output selalu JSON valid
        # agar bisa di-decode oleh PHP (json_decode menolak NaN/Infinity).
        print(json.dumps(sanitize_nan({
            "status": "success",
            "data": packages,
            "verbose": verbose_text
        }), allow_nan=False))

    except Exception as e:
        sys.stdout = old_stdout  # Mengembalikan output stream standar ke sistem
        print(json.dumps({
            "status": "error",
            "message": str(e)
        }))

if __name__ == '__main__':
    main()
