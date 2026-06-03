"""
how_it_works_api.py — API untuk halaman How It Works
=====================================================
Menjalankan pipeline lengkap FCM dan mengembalikan data JSON
yang berisi semua informasi untuk divisualisasikan di halaman web:
- Statistik dataset
- Hasil XBI per c (2,3,4,5) per kategori
- Validasi 5 skema ratio
- Hasil clustering: centroid, distribusi klaster
- Hasil rekomendasi paket
"""

import os
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"

import argparse
import json
import warnings
# pyrefly: ignore [missing-import]
import numpy as np

# pyrefly: ignore [missing-source-for-stubs]
import pandas as pd

warnings.filterwarnings('ignore')

from fcm_clustering import run_budget_anchored_fcm, run_fcm, calculate_xie_beni
from recommender import generate_packages
from config import RATIO_SCHEMES, CLUSTER_RANGE


def load_datasets():
    return {
        "wisata": pd.read_excel("wisata_clean.xlsx"),
        "hotel":  pd.read_excel("hotel_clean.xlsx"),
        "kuliner": pd.read_excel("tempat_makan_clean.xlsx"),
    }


def dataset_stats(datasets):
    """Statistik ringkasan dataset."""
    stats = {}
    for name, df in datasets.items():
        prices = df["Estimasi_Harga"].values
        stats[name] = {
            "total":  len(df),
            "min":    int(prices.min()),
            "max":    int(prices.max()),
            "mean":   int(prices.mean()),
            "median": int(np.median(prices)),
            "std":    int(prices.std()),
        }
    return stats


def xbi_per_c(datasets, budget_anchor_map):
    """
    Hitung Xie-Beni Index untuk c=2,3,4,5 di setiap dataset.
    Returns: dict {category: [{c, xbi}, ...]}
    """
    results = {}
    for cat, df in datasets.items():
        prices = df["Estimasi_Harga"].values.astype(float)
        cat_results = []
        anchor = budget_anchor_map[cat]
        for c in CLUSTER_RANGE:
            try:
                # Inisialisasi centroid berbasis budget (skema B: 0.6, 1.0, 1.4)
                if c == 3:
                    ratios = [0.6, 1.0, 1.4]
                elif c == 2:
                    ratios = [0.6, 1.4]
                elif c == 4:
                    ratios = [0.5, 0.75, 1.25, 1.5]
                else:  # c == 5
                    ratios = [0.4, 0.7, 1.0, 1.3, 1.6]

                init_centers = [anchor * r for r in ratios]
                res_fcm = run_fcm(prices, n_clusters=c, init_centroids=init_centers)
                cntr = res_fcm["cntr"]
                u = res_fcm["u"]
                xb_result = calculate_xie_beni(prices, cntr, u)
                cat_results.append({
                    "c": c,
                    "xbi": round(float(xb_result["xb"]), 6),  # type: ignore
                    "centroids": [round(float(v), 0) for v in cntr],
                })
            except Exception as e:
                cat_results.append({"c": c, "xbi": None, "error": str(e)})
        results[cat] = cat_results
    return results



def ratio_validation(datasets, budget_anchor_map):
    """
    Validasi 5 skema ratio (A-E) untuk setiap dataset.
    Returns: dict {category: [{scheme, ratio, xbi, diversity}, ...]}
    """
    results = {}
    for cat, df in datasets.items():
        prices = df["Estimasi_Harga"].values
        anchor = budget_anchor_map[cat]
        cat_results = []
        for scheme_name, (r_hemat, r_balanced, r_premium) in RATIO_SCHEMES.items():
            try:
                res = run_budget_anchored_fcm(prices, anchor, ratio_scheme=scheme_name)
                labels = res["labels"]
                diversity = len(set(labels))  # jumlah cluster yang terisi
                cat_results.append({
                    "scheme": scheme_name,
                    "ratios": [round(r_hemat, 1), round(r_balanced, 1), round(r_premium, 1)],
                    "xbi": round(float(res["xb"]), 6),  # type: ignore
                    "diversity": diversity,
                    "dist": {
                        "hemat":    int((labels == 0).sum()),
                        "balanced": int((labels == 1).sum()),
                        "premium":  int((labels == 2).sum()),
                    }
                })
            except Exception as e:
                cat_results.append({"scheme": scheme_name, "xbi": None, "error": str(e)})
        results[cat] = cat_results
    return results


def clustering_result(datasets, budget_anchor_map):
    """
    Hasil clustering akhir (Skema B default) untuk c=3.
    Returns: dict {category: {centroids, distribution, sample_data}}
    """
    results = {}
    for cat, df in datasets.items():
        prices = df["Estimasi_Harga"].values
        anchor = budget_anchor_map[cat]
        try:
            res = run_budget_anchored_fcm(prices, anchor, ratio_scheme="B")
            labels = res["labels"]
            cntr   = res["cntr"]
            results[cat] = {
                "centroids": {
                    "hemat":    round(float(cntr[0]), 0),
                    "balanced": round(float(cntr[1]), 0),
                    "premium":  round(float(cntr[2]), 0),
                },
                "distribution": {
                    "hemat":    int((labels == 0).sum()),
                    "balanced": int((labels == 1).sum()),
                    "premium":  int((labels == 2).sum()),
                },
                "xbi": round(float(res["xb"]), 6),  # type: ignore
                # Harga masing2 klaster (untuk grafik scatter)
                "cluster_prices": {
                    "hemat":    [int(p) for p in prices[labels == 0][:20].tolist()],
                    "balanced": [int(p) for p in prices[labels == 1][:20].tolist()],
                    "premium":  [int(p) for p in prices[labels == 2][:20].tolist()],
                }
            }
        except Exception as e:
            results[cat] = {"error": str(e)}
    return results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--budget',   type=float, default=3_000_000)
    parser.add_argument('--persons',  type=int,   default=2)
    parser.add_argument('--duration', type=int,   default=2)
    args = parser.parse_args()

    try:
        datasets = load_datasets()

        # Hitung budget anchor per kategori (seperti di recommender.py)
        import math
        num_rooms = math.ceil(args.persons / 2)
        nights = args.duration - 1 if args.duration > 1 else 1
        MEALS_PER_DAY = 2
        
        # Alokasi budget sesuai skripsi versi revisi di recommender.py
        if args.duration == 1:
            budget_alloc = {
                "akomodasi": 0.0,
                "wisata": args.budget * (15.0 / 60.0),
                "kuliner": args.budget * (20.0 / 60.0),
                "transportasi": args.budget * (25.0 / 60.0),
            }
            budget_anchor_map = {
                "hotel": (args.budget * 0.40) / (1 * num_rooms),
                "wisata": budget_alloc["wisata"] / args.persons,
                "kuliner": budget_alloc["kuliner"] / (args.persons * MEALS_PER_DAY * args.duration),
            }
        else:
            budget_alloc = {
                "akomodasi": args.budget * 0.40,
                "wisata": args.budget * 0.15,
                "kuliner": args.budget * 0.20,
                "transportasi": args.budget * 0.25,
            }
            budget_anchor_map = {
                "hotel": budget_alloc["akomodasi"] / (nights * num_rooms),
                "wisata": budget_alloc["wisata"] / args.persons,
                "kuliner": budget_alloc["kuliner"] / (args.persons * MEALS_PER_DAY * args.duration),
            }

        # Langkah 1: Statistik dataset
        stats = dataset_stats(datasets)

        # Langkah 2: XBI per c
        xbi_table = xbi_per_c(datasets, budget_anchor_map)

        # Langkah 3: Validasi skema ratio
        ratio_val = ratio_validation(datasets, budget_anchor_map)

        # Langkah 4: Hasil clustering akhir
        cluster_res = clustering_result(datasets, budget_anchor_map)

        # Langkah 5: Hasil rekomendasi
        packages = generate_packages(
            total_budget=args.budget,
            num_persons=args.persons,
            duration=args.duration,
            datasets=datasets,
            verbose=False
        )

        print(json.dumps({
            "status": "success",
            "input": {
                "budget":   args.budget,
                "persons":  args.persons,
                "duration": args.duration,
                "budget_anchors": {
                    "akomodasi": round(budget_anchor_map["hotel"], 0),
                    "wisata":      round(budget_anchor_map["wisata"], 0),
                    "kuliner":     round(budget_anchor_map["kuliner"], 0),
                },
                "budget_alloc":   {k: round(v, 0) for k, v in budget_alloc.items()},
            },
            "dataset_stats":     stats,
            "xbi_per_c":         xbi_table,
            "ratio_validation":  ratio_val,
            "clustering_result": cluster_res,
            "packages":          packages,
        }, ensure_ascii=False))

    except Exception as e:
        import traceback
        print(json.dumps({
            "status": "error",
            "message": str(e),
            "trace": traceback.format_exc()
        }))


if __name__ == '__main__':
    main()
