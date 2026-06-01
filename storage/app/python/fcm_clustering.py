"""
fcm_clustering.py — Modul Inti Fuzzy C-Means + Xie-Beni Index
===============================================================
Implementasi algoritma FCM untuk clustering data wisata berdasarkan harga,
beserta evaluasi menggunakan Xie-Beni Index sesuai rumus di skripsi:
- Persamaan (2.7) Total Variansi
- Persamaan (2.8) Separasi Minimum
- Persamaan (2.9) Xie-Beni Index
"""

# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-source-for-stubs]
import pandas as pd
# pyrefly: ignore [missing-import]
import skfuzzy as fuzz

from config import (
    DATASET_WISATA, DATASET_HOTEL, DATASET_MAKAN,
    FCM_FUZZIFIER, FCM_MAX_ITER, FCM_ERROR,
    CLUSTER_RANGE, RATIO_SCHEMES, CLUSTER_LABELS,
)


# ============================================================
# 1. LOAD DATASETS
# ============================================================
def load_datasets():
    """
    Membaca 3 file Excel dataset dan mengembalikan dictionary berisi DataFrame.

    Returns:
        dict: {'wisata': DataFrame, 'hotel': DataFrame, 'kuliner': DataFrame}
    """
    datasets: dict[str, pd.DataFrame] = {
        "wisata": pd.read_excel(DATASET_WISATA),
        "hotel": pd.read_excel(DATASET_HOTEL),
        "kuliner": pd.read_excel(DATASET_MAKAN),
    }

    for name, df in datasets.items():
        print(f"  ✓ Dataset {name}: {len(df)} data")
        # Pastikan kolom harga bertipe numerik
        df["Estimasi_Harga"] = pd.to_numeric(df["Estimasi_Harga"], errors="coerce")
        # Hapus data dengan harga kosong atau 0
        before = len(df)
        df_clean = df.dropna(subset=["Estimasi_Harga"])
        df_clean = df_clean[df_clean["Estimasi_Harga"] > 0].reset_index(drop=True)
        datasets[name] = df_clean  # type: ignore
        if len(df_clean) < before:
            print(f"    ⚠ {before - len(df_clean)} data dihapus (harga kosong/0)")
            print(f"    → Tersisa: {len(df_clean)} data")

    return datasets


# ============================================================
# 2. JALANKAN FCM
# ============================================================
def run_fcm(data_prices, n_clusters, m=FCM_FUZZIFIER, max_iter=FCM_MAX_ITER,
            error=FCM_ERROR, init_centroids=None, seed=42):
    """
    Menjalankan algoritma Fuzzy C-Means manual murni (NumPy) untuk keselarasan 100% dengan skripsi.

    Args:
        data_prices: numpy array 1D berisi harga (Estimasi_Harga)
        n_clusters: jumlah klaster (c)
        m: fuzzifier / pangkat pembobot (default: 2)
        max_iter: maksimum iterasi
        error: toleransi konvergensi (epsilon)
        init_centroids: pusat klaster awal (opsional, untuk budget-anchored)
        seed: random seed untuk reproduktibilitas

    Returns:
        dict: {
            'cntr': pusat klaster (array),
            'u': matriks keanggotaan (n_clusters x n_data),
            'labels': label klaster setiap data (array 1D),
            'fpc': Fuzzy Partition Coefficient,
            'n_iter': jumlah iterasi
        }
    """
    data = data_prices.astype(float)
    n_samples = len(data)
    
    # Ubah data menjadi 2D (n_samples, n_features)
    if len(data.shape) == 1:
        data_2d = data.reshape(-1, 1)
    else:
        data_2d = data
        
    n_features = data_2d.shape[1]
    
    np.random.seed(seed)
    
    # 1. Inisialisasi Matriks Keanggotaan (U)
    if init_centroids is not None:
        # Inisialisasi berbasis jarak dari centroid awal yang diberikan (Budget-Anchored)
        init_centers = np.array(init_centroids).reshape(n_clusters, n_features)
        distances = np.zeros((n_clusters, n_samples))
        for j in range(n_clusters):
            distances[j, :] = np.sum((data_2d - init_centers[j, :])**2, axis=1)
        distances = np.fmax(distances, 1e-10)
        
        # U_ji = 1 / d_ji^2
        temp = 1.0 / distances
        U = temp / np.sum(temp, axis=0, keepdims=True)
    else:
        # Inisialisasi acak dengan Dirichlet distribution
        U = np.random.dirichlet(np.ones(n_clusters), size=n_samples).T
    
    centers = np.zeros((n_clusters, n_features))
    
    # 2. Loop Iterasi FCM
    for iteration in range(max_iter):
        U_prev = U.copy()
        
        # A. Hitung Centroid Baru
        for j in range(n_clusters):
            numerator = np.sum((U[j, :] ** m)[:, np.newaxis] * data_2d, axis=0)
            denominator = np.sum(U[j, :] ** m)
            centers[j, :] = numerator / np.fmax(denominator, 1e-10)
            
        # B. Hitung Jarak Kuadrat
        dist_sq = np.zeros((n_clusters, n_samples))
        for j in range(n_clusters):
            dist_sq[j, :] = np.sum((data_2d - centers[j, :])**2, axis=1)
            
        dist_sq = np.fmax(dist_sq, 1e-10)
        
        # C. Update Matriks Keanggotaan U
        temp = dist_sq ** (-1.0 / (m - 1.0))
        U = temp / np.fmax(np.sum(temp, axis=0, keepdims=True), 1e-10)
        
        # D. Cek Konvergensi (Kriteria Berhenti: ||U_baru - U_lama|| < epsilon)
        if np.linalg.norm(U - U_prev) < error:
            break
            
    # Dapatkan label klaster dengan nilai keanggotaan tertinggi
    labels = np.argmax(U, axis=0)
    fpc = float(np.sum(U ** 2) / n_samples)
    
    return {
        "cntr": centers.flatten(),
        "u": U,
        "labels": labels,
        "fpc": fpc,
        "n_iter": iteration + 1
    }


# ============================================================
# 3. HITUNG XIE-BENI INDEX
# ============================================================
def calculate_xie_beni(data_prices, cntr, u, m=FCM_FUZZIFIER):
    """
    Menghitung Xie-Beni Index sesuai rumus di skripsi:
    - Persamaan (2.7): σ = Σ Σ (u_ki)^m * D²(x_i, c_k)
    - Persamaan (2.8): sep = min_{k≠j} D²(c_k, c_j)
    - Persamaan (2.9): XB = σ / (n × sep)

    Args:
        data_prices: numpy array 1D (n data, berisi harga)
        cntr: pusat klaster (array 1D, panjang c)
        u: matriks keanggotaan (c x n)
        m: fuzzifier (default: 2)

    Returns:
        dict: {
            'xb': nilai Xie-Beni Index,
            'sigma': total variansi,
            'sep': separasi minimum
        }
    """
    n = len(data_prices)
    c = len(cntr)

    # --- Tahap 1: Hitung Total Variansi (σ) — Persamaan (2.7) ---
    # σ = Σ_{k=1}^{c} Σ_{i=1}^{n} (u_ki)^m * ||x_i - c_k||²
    sigma = 0.0
    for k in range(c):
        for i in range(n):
            d_sq = (data_prices[i] - cntr[k]) ** 2  # Jarak kuadrat
            sigma += (u[k, i] ** m) * d_sq

    # --- Tahap 2: Hitung Separasi Minimum (sep) — Persamaan (2.8) ---
    # sep = min_{k≠j} ||c_k - c_j||²
    sep = float("inf")
    for k in range(c):
        for j in range(k + 1, c):
            d_sq = (cntr[k] - cntr[j]) ** 2
            if d_sq < sep:
                sep = d_sq

    # --- Tahap 3: Hitung Xie-Beni Index (XB) — Persamaan (2.9) ---
    # XB = σ / (n × sep)
    if sep == 0 or n == 0:
        xb = float("inf")  # Hindari division by zero
    else:
        xb = sigma / (n * sep)

    return {
        "xb": xb,
        "sigma": sigma,
        "sep": sep,
    }


# ============================================================
# 4. CARI JUMLAH KLASTER OPTIMAL
# ============================================================
def find_optimal_clusters(data_prices, c_range=CLUSTER_RANGE,
                          m=FCM_FUZZIFIER, verbose=True):
    """
    Menguji beberapa nilai c (jumlah klaster) dan memilih yang terbaik
    berdasarkan Xie-Beni Index terkecil.

    Args:
        data_prices: numpy array 1D berisi harga
        c_range: list jumlah klaster yang diuji (default: [2,3,4,5])
        m: fuzzifier
        verbose: cetak detail ke console

    Returns:
        dict: {
            'optimal_c': jumlah klaster terbaik,
            'optimal_xb': nilai XBI terkecil,
            'results': list dict per c,
            'all_xb': dict {c: xb_value}
        }
    """
    results = []
    all_xb = {}

    for c in c_range:
        fcm_result = run_fcm(data_prices, n_clusters=c, m=m)
        xb_result = calculate_xie_beni(
            data_prices, fcm_result["cntr"], fcm_result["u"], m=m
        )

        result = {
            "c": c,
            "xb": xb_result["xb"],
            "sigma": xb_result["sigma"],
            "sep": xb_result["sep"],
            "fpc": fcm_result["fpc"],
            "n_iter": fcm_result["n_iter"],
            "cntr": fcm_result["cntr"],
        }
        results.append(result)
        all_xb[c] = xb_result["xb"]

        if verbose:
            cntr_str = ", ".join([f"Rp {v:,.0f}" for v in sorted(fcm_result["cntr"])])
            print(f"    c={c}: XBI = {xb_result['xb']:.6f} | "
                  f"σ = {xb_result['sigma']:.2f} | "
                  f"sep = {xb_result['sep']:.2f} | "
                  f"FPC = {fcm_result['fpc']:.4f} | "
                  f"Iterasi = {fcm_result['n_iter']}")
            print(f"          Centroid: [{cntr_str}]")

    # Cari c dengan XBI terkecil
    optimal = min(results, key=lambda x: x["xb"])

    if verbose:
        print(f"\n    ★ Klaster Optimal: c = {optimal['c']} "
              f"(XBI = {optimal['xb']:.6f})")

    return {
        "optimal_c": optimal["c"],
        "optimal_xb": optimal["xb"],
        "results": results,
        "all_xb": all_xb,
    }


# ============================================================
# 5. FCM DENGAN INISIALISASI CENTROID BERBASIS BUDGET
# ============================================================
def run_budget_anchored_fcm(data_prices, budget, ratio_scheme="B",
                            m=FCM_FUZZIFIER):
    """
    Menjalankan FCM dengan inisialisasi centroid berbasis anggaran pengguna.
    Sesuai Sub-bab 3.3.3 skripsi: centroid diinisialisasi secara proporsional
    dari budget (misal: 0.6x, 1.0x, 1.4x untuk Skema B).

    Args:
        data_prices: numpy array 1D berisi harga
        budget: total anggaran pengguna (Rupiah)
        ratio_scheme: kode skema ratio (A/B/C/D/E)
        m: fuzzifier

    Returns:
        dict: hasil FCM + XBI + info centroid awal
    """
    ratios = RATIO_SCHEMES[ratio_scheme]
    n_clusters = len(ratios)  # Selalu 3 (Hemat, Balanced, Premium)

    # Hitung centroid awal berdasarkan budget × ratio
    init_centers = np.array([budget * r for r in ratios]).reshape(-1, 1)

    if budget <= 0:
        raise ValueError("Budget harus lebih besar dari 0")

    # Jalankan FCM dengan centroid awal
    fcm_result = run_fcm(
        data_prices, n_clusters=n_clusters, m=m, init_centroids=init_centers
    )

    # Hitung Xie-Beni
    xb_result = calculate_xie_beni(
        data_prices, fcm_result["cntr"], fcm_result["u"], m=m
    )

    # Urutkan centroid & re-label (0=Hemat, 1=Balanced, 2=Premium)
    sorted_indices = np.argsort(fcm_result["cntr"])
    sorted_cntr = fcm_result["cntr"][sorted_indices]
    sorted_u = fcm_result["u"][sorted_indices]
    sorted_labels = np.argmax(sorted_u, axis=0)

    return {
        "cntr": sorted_cntr,
        "u": sorted_u,
        "labels": sorted_labels,
        "xb": xb_result["xb"],
        "sigma": xb_result["sigma"],
        "sep": xb_result["sep"],
        "fpc": fcm_result["fpc"],
        "n_iter": fcm_result["n_iter"],
        "init_centers": [budget * r for r in ratios],
        "ratio_scheme": ratio_scheme,
        "budget": budget,
    }

# ============================================================
# 5A. FCM DENGAN INISIALISASI CENTROID BERBASIS PERSENTIL (OFFLINE)
# ============================================================
def run_percentile_fcm(data_prices, m=FCM_FUZZIFIER):
    """
    Menjalankan FCM dengan inisialisasi centroid berdasarkan distribusi statistik harga.
    Q1 (25th percentile) untuk Hemat.
    Median (50th percentile) untuk Balanced.
    Q3 (75th percentile) untuk Premium.
    
    Argumen:
        data_prices: array 1D harga
        m: fuzzifier
    """
    # Hitung persentil
    q1 = np.percentile(data_prices, 25)
    median = np.percentile(data_prices, 50)
    q3 = np.percentile(data_prices, 75)
    
    init_centers = np.array([q1, median, q3]).reshape(-1, 1)
    
    # Jalankan FCM
    fcm_result = run_fcm(
        data_prices, n_clusters=3, m=m, init_centroids=init_centers
    )
    
    xb_result = calculate_xie_beni(
        data_prices, fcm_result["cntr"], fcm_result["u"], m=m
    )
    
    sorted_indices = np.argsort(fcm_result["cntr"])
    sorted_cntr = fcm_result["cntr"][sorted_indices]
    sorted_u = fcm_result["u"][sorted_indices]
    sorted_labels = np.argmax(sorted_u, axis=0)
    
    return {
        "cntr": sorted_cntr,
        "u": sorted_u,
        "labels": sorted_labels,
        "xb": xb_result["xb"],
        "init_centers": [q1, median, q3],
    }

# ============================================================
# 6. VALIDASI 5 SKEMA RASIO
# ============================================================
def validate_ratio_schemes(data_prices, budget, category_name="",
                           verbose=True):
    """
    Menguji 5 skema rasio inisialisasi centroid (A-E) dan
    membandingkan nilai Xie-Beni Index untuk menentukan skema terbaik.

    Args:
        data_prices: numpy array 1D berisi harga
        budget: total anggaran pengguna
        category_name: nama kategori (untuk display)
        verbose: cetak detail

    Returns:
        dict: {
            'best_scheme': kode skema terbaik,
            'best_xb': nilai XBI terkecil,
            'results': dict {skema: result_dict}
        }
    """
    results = {}

    if verbose:
        print(f"\n  Validasi Skema Ratio — {category_name} "
              f"(Budget: Rp {budget:,.0f})")
        print(f"  {'='*65}")

    for scheme_code, ratios in RATIO_SCHEMES.items():
        try:
            result = run_budget_anchored_fcm(
                data_prices, budget, ratio_scheme=scheme_code
            )
            results[scheme_code] = result

            if verbose:
                cntr_str = " | ".join(
                    [f"Rp {v:,.0f}" for v in result["cntr"]]
                )
                print(f"    Skema {scheme_code} ({ratios}): "
                      f"XBI = {result['xb']:.6f} | "
                      f"Centroid: [{cntr_str}]")
        except Exception as e:
            if verbose:
                print(f"    Skema {scheme_code}: ERROR — {e}")
            results[scheme_code] = {"xb": float("inf"), "error": str(e)}

    # Cari skema terbaik
    valid_results = {k: v for k, v in results.items()
                     if isinstance(v.get("xb"), (int, float))
                     and v["xb"] != float("inf")}

    if valid_results:
        best_scheme = min(valid_results, key=lambda k: valid_results[k]["xb"])
        best_xb = valid_results[best_scheme]["xb"]
    else:
        best_scheme = "B"
        best_xb = float("inf")

    if verbose:
        print(f"\n    ★ Skema Terbaik: {best_scheme} (XBI = {best_xb:.6f})")

    return {
        "best_scheme": best_scheme,
        "best_xb": best_xb,
        "results": results,
    }


# ============================================================
# 7. UTILITAS: Label & Summary
# ============================================================
def get_cluster_summary(df, labels, cntr):
    """
    Membuat ringkasan per klaster: jumlah anggota, rata-rata harga, centroid.

    Args:
        df: DataFrame original
        labels: array label klaster
        cntr: pusat klaster (sorted)

    Returns:
        DataFrame: ringkasan per klaster
    """
    df_result = df.copy()
    df_result["Cluster"] = labels

    # Sort centroid & map label
    sorted_idx = np.argsort(cntr)
    label_map = {sorted_idx[i]: i for i in range(len(sorted_idx))}
    df_result["Cluster_Sorted"] = df_result["Cluster"].map(label_map)
    df_result["Kategori"] = df_result["Cluster_Sorted"].map(CLUSTER_LABELS)

    summary = df_result.groupby("Kategori").agg(
        Jumlah=("Estimasi_Harga", "count"),
        Rata_Rata_Harga=("Estimasi_Harga", "mean"),
        Min_Harga=("Estimasi_Harga", "min"),
        Max_Harga=("Estimasi_Harga", "max"),
    ).reset_index()

    # Tambahkan centroid
    for i, label in enumerate(["Hemat", "Balanced", "Premium"]):
        if label in summary["Kategori"].values and i < len(cntr):
            sorted_cntr = np.sort(cntr)
            summary.loc[summary["Kategori"] == label, "Centroid"] = sorted_cntr[i]

    return summary, df_result
