"""
main.py — Entry Point Utama Sistem Rekomendasi Paket Wisata
=============================================================
Menjalankan seluruh pipeline:
1. Load dataset
2. Uji FCM dengan c = [2, 3, 4, 5] + Xie-Beni Index
3. Uji 5 skema rasio centroid (A-E)
4. Buat grafik visualisasi
5. Demo rekomendasi paket
6. Simpan semua hasil ke CSV
"""

import os
# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-source-for-stubs]
import pandas as pd

from config import (
    OUTPUT_DIR, CLUSTER_RANGE, SAMPLE_BUDGETS,
    DEFAULT_RATIO_SCHEME, CLUSTER_LABELS,
)
from fcm_clustering import (
    load_datasets, find_optimal_clusters, run_fcm,
    run_budget_anchored_fcm, validate_ratio_schemes,
    calculate_xie_beni, get_cluster_summary,
)
from visualize import (
    plot_xie_beni_curve, plot_cluster_scatter,
    plot_ratio_comparison, plot_membership_heatmap,
    plot_price_distribution,
)
from recommender import (
    generate_packages,
    generate_flexible_exploration_packages,
    generate_destination_first_packages
)

def main():
    print("=" * 60)
    print("  SISTEM REKOMENDASI PAKET WISATA MALANG RAYA")
    print("  Fuzzy C-Means + Xie-Beni Index")
    print("=" * 60)

    # Pastikan folder output ada
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # ==========================================================
    # TAHAP 1: LOAD DATASET
    # ==========================================================
    print("\n📂 TAHAP 1: Memuat Dataset...")
    print("-" * 40)
    datasets = load_datasets()
    print()

    # Visualisasi distribusi harga
    print("  Membuat grafik distribusi harga...")
    plot_price_distribution(datasets)

    # ==========================================================
    # TAHAP 2: VALIDASI JUMLAH KLASTER OPTIMAL (XIE-BENI)
    # ==========================================================
    print("\n📊 TAHAP 2: Validasi Jumlah Klaster Optimal (Xie-Beni)")
    print("-" * 40)

    xbi_all_results = {}

    for cat_name, df in datasets.items():
        print(f"\n  [{cat_name.upper()}] — {len(df)} data")
        prices = df["Estimasi_Harga"].values

        # Uji c = 2, 3, 4, 5
        result = find_optimal_clusters(prices, c_range=CLUSTER_RANGE)
        xbi_all_results[cat_name] = result

        # Buat grafik Xie-Beni
        plot_xie_beni_curve(
            c_values=CLUSTER_RANGE,
            xb_scores=result["all_xb"],
            category_name=cat_name.capitalize(),
        )

    # Simpan ringkasan XBI ke CSV
    xbi_rows = []
    for cat_name, result in xbi_all_results.items():
        for r in result["results"]:
            xbi_rows.append({
                "Kategori": cat_name.capitalize(),
                "Jumlah_Klaster_c": r["c"],
                "Xie_Beni_Index": r["xb"],
                "Sigma": r["sigma"],
                "Separasi": r["sep"],
                "FPC": r["fpc"],
                "Iterasi": r["n_iter"],
                "Centroid": str(sorted(r["cntr"])),
            })
    df_xbi = pd.DataFrame(xbi_rows)
    xbi_path = os.path.join(OUTPUT_DIR, "xie_beni_results.csv")
    df_xbi.to_csv(xbi_path, index=False)
    print(f"\n  ✓ Hasil XBI disimpan ke: {xbi_path}")

    # ==========================================================
    # TAHAP 3: CLUSTERING DENGAN c OPTIMAL + VISUALISASI
    # ==========================================================
    print("\n📈 TAHAP 3: Clustering dengan c Optimal + Visualisasi")
    print("-" * 40)

    clustering_all_results = {}

    for cat_name, df in datasets.items():
        optimal_c = xbi_all_results[cat_name]["optimal_c"]
        print(f"\n  [{cat_name.upper()}] — c optimal = {optimal_c}")

        prices = df["Estimasi_Harga"].values
        result = run_fcm(prices, n_clusters=optimal_c)
        xb = calculate_xie_beni(prices, result["cntr"], result["u"])

        # Summary
        summary, df_labeled = get_cluster_summary(df, result["labels"],
                                                   result["cntr"])
        clustering_all_results[cat_name] = {
            "df_labeled": df_labeled,
            "summary": summary,
            "cntr": result["cntr"],
            "u": result["u"],
            "labels": result["labels"],
            "xb": xb["xb"],
        }

        print(f"\n  Ringkasan Klaster:")
        print(summary.to_string(index=False))

        # Scatter plot
        plot_cluster_scatter(
            prices, result["labels"], result["cntr"],
            category_name=cat_name.capitalize(),
        )

        # Heatmap keanggotaan
        plot_membership_heatmap(
            result["u"],
            category_name=cat_name.capitalize(),
        )

    # Simpan hasil clustering ke CSV
    for cat_name, res in clustering_all_results.items():
        csv_path = os.path.join(OUTPUT_DIR,
                                f"clustering_{cat_name}.csv")
        res["df_labeled"].to_csv(csv_path, index=False)
        print(f"\n  ✓ Clustering {cat_name} disimpan ke: {csv_path}")

    # ==========================================================
    # TAHAP 4: VALIDASI SKEMA RASIO CENTROID (A-E)
    # ==========================================================
    print("\n🔬 TAHAP 4: Validasi 5 Skema Rasio Centroid")
    print("-" * 40)

    test_budget = SAMPLE_BUDGETS[1]  # Rp 1.000.000 sebagai sample
    ratio_all_results = {}

    for cat_name, df in datasets.items():
        prices = df["Estimasi_Harga"].values
        result = validate_ratio_schemes(
            prices, test_budget, category_name=cat_name.capitalize()
        )
        ratio_all_results[cat_name] = result

        # Grafik perbandingan
        plot_ratio_comparison(result, category_name=cat_name.capitalize())

    # Simpan hasil validasi rasio ke CSV
    ratio_rows = []
    for cat_name, result in ratio_all_results.items():
        for scheme, res in result["results"].items():
            ratio_rows.append({
                "Kategori": cat_name.capitalize(),
                "Skema": scheme,
                "Rasio": str(
                    __import__("config").RATIO_SCHEMES.get(scheme, "N/A")
                ),
                "Xie_Beni_Index": res.get("xb", "N/A"),
                "Centroid": str(
                    sorted(res["cntr"]) if "cntr" in res else "N/A"
                ),
            })
    df_ratio = pd.DataFrame(ratio_rows)
    ratio_path = os.path.join(OUTPUT_DIR, "ratio_validation_results.csv")
    df_ratio.to_csv(ratio_path, index=False)
    print(f"\n  ✓ Hasil validasi rasio disimpan ke: {ratio_path}")

    # ==========================================================
    # TAHAP 5: DEMO 3 SKENARIO WORKFLOW
    # ==========================================================
    print("\n🎯 TAHAP 5: Demo 3 Skenario Workflow Rekomendasi")
    print("-" * 40)

    # 1. FLEXIBLE EXPLORATION WORKFLOW (Tanpa Budget)
    print("\n[WORKFLOW 1: FLEXIBLE EXPLORATION]")
    flex_pkgs = generate_flexible_exploration_packages(
        num_persons=2,
        duration=2,
        datasets=datasets,
        verbose=True
    )

    # 2. BUDGET-FIRST WORKFLOW (Skenario Utama)
    print("\n[WORKFLOW 2: BUDGET-FIRST]")
    budget_pkgs = generate_packages(
        total_budget=1_500_000,
        num_persons=2,
        duration=2,
        datasets=datasets,
        verbose=True
    )

    # 3. DESTINATION-FIRST WORKFLOW
    print("\n[WORKFLOW 3: DESTINATION-FIRST]")
    # Pilih satu destinasi sembarang dari dataset (misal indeks 0)
    sample_wisata = datasets["wisata"].iloc[0]
    locked_id = sample_wisata["Id_Tempat"]
    
    # Kondisi A: Tanpa Budget
    dest_pkgs_a = generate_destination_first_packages(
        locked_wisata_id=locked_id,
        num_persons=2,
        duration=2,
        datasets=datasets,
        total_budget=None,
        verbose=True
    )
    
    # Kondisi B: Dengan Budget (contoh Rp 2.000.000)
    dest_pkgs_b = generate_destination_first_packages(
        locked_wisata_id=locked_id,
        num_persons=2,
        duration=2,
        datasets=datasets,
        total_budget=2_000_000,
        verbose=True
    )

    flat_packages = []
    for opt in (flex_pkgs + budget_pkgs + dest_pkgs_a + dest_pkgs_b):
        if isinstance(opt, dict) and "packages" in opt:
            flat_packages.extend(opt["packages"])
        elif isinstance(opt, dict):
            flat_packages.append(opt)

    # Simpan semua rekomendasi ke CSV
    if flat_packages:
        pkg_rows = []
        for pkg in flat_packages:
            pkg_rows.append({
                "Kategori": pkg["kategori"],
                "Budget": pkg.get("num_persons", "") and
                          f"Rp {pkg['cost_akomodasi'] + pkg['cost_wisata'] + pkg['cost_kuliner'] + pkg['cost_transport']:,.0f}",
                "Hotel": pkg["hotel_nama"],
                "Hotel_Harga": pkg["hotel_harga"],
                "Wisata": pkg["wisata_nama"],
                "Wisata_Harga": pkg["wisata_harga"],
                "Kuliner": pkg["kuliner_nama"],
                "Kuliner_Harga": pkg["kuliner_harga"],
                "Total_Cost": pkg["total_cost"],
                "Cost_Akomodasi": pkg["cost_akomodasi"],
                "Cost_Wisata": pkg["cost_wisata"],
                "Cost_Kuliner": pkg["cost_kuliner"],
                "Cost_Transport": pkg["cost_transport"],
                "Durasi": pkg["duration"],
                "Peserta": pkg["num_persons"],
            })
        df_pkg = pd.DataFrame(pkg_rows)
        pkg_path = os.path.join(OUTPUT_DIR, "rekomendasi_paket.csv")
        df_pkg.to_csv(pkg_path, index=False)
        print(f"\n  ✓ Rekomendasi paket disimpan ke: {pkg_path}")

    # ==========================================================
    # RINGKASAN AKHIR
    # ==========================================================
    print(f"\n{'='*60}")
    print(f"  ✅ SELESAI — Semua hasil tersimpan di: {OUTPUT_DIR}/")
    print(f"{'='*60}")
    print(f"\n  File yang dihasilkan:")

    for fname in os.listdir(OUTPUT_DIR):
        fpath = os.path.join(OUTPUT_DIR, fname)
        size = os.path.getsize(fpath)
        print(f"    • {fname} ({size:,} bytes)")

    print(f"\n  Ringkasan Xie-Beni (c optimal):")
    for cat_name, result in xbi_all_results.items():
        print(f"    • {cat_name.capitalize():10}: c = {result['optimal_c']} "
              f"(XBI = {result['optimal_xb']:.6f})")

    print(f"\n  Ringkasan Skema Ratio Terbaik "
          f"(budget test: Rp {test_budget:,.0f}):")
    for cat_name, result in ratio_all_results.items():
        print(f"    • {cat_name.capitalize():10}: Skema {result['best_scheme']} "
              f"(XBI = {result['best_xb']:.6f})")

    print()


if __name__ == "__main__":
    main()
