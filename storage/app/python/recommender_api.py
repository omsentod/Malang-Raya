import os
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"

import argparse
import json
import sys
import io
# pyrefly: ignore [missing-source-for-stubs]
import pandas as pd
import warnings
# Matikan warning agar stdout tidak kotor dengan pesan Warning pandas
warnings.filterwarnings('ignore')

from recommender import (
    generate_packages,
    generate_flexible_exploration_packages,
    generate_destination_first_packages,
    export_to_excel_recom
)

def load_datasets():
    # Asumsikan dipanggil dalam folder yang sama
    return {
        "wisata": pd.read_excel("wisata_clean.xlsx"),
        "hotel": pd.read_excel("hotel_clean.xlsx"),
        "kuliner": pd.read_excel("tempat_makan_clean.xlsx")
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

    args = parser.parse_args()

    # Simpan stdout asli di sini, sebelum blok try, agar selalu terdefinisi
    # bahkan jika exception terjadi sebelum redirection dimulai.
    old_stdout = sys.stdout

    try:
        datasets = load_datasets()
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
                    hotel_mode=args.hotel_mode
                )

            elif args.workflow == 'flexible':
                packages = generate_flexible_exploration_packages(
                    num_persons=args.persons,
                    duration=args.duration,
                    datasets=datasets,
                    verbose=True,
                    transport_mode=args.transport
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
                    hotel_mode=args.hotel_mode
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

        # Kembalikan array packages sebagai JSON murni tanpa hiasan teks biasa
        print(json.dumps({
            "status": "success",
            "data": packages,
            "verbose": verbose_text
        }))

    except Exception as e:
        sys.stdout = old_stdout  # Selalu aman: old_stdout sudah pasti terdefinisi
        print(json.dumps({
            "status": "error",
            "message": str(e)
        }))

if __name__ == '__main__':
    main()
