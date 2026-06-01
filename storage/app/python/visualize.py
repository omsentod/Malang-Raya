"""
visualize.py — Modul Visualisasi Hasil Clustering
===================================================
Membuat grafik matplotlib untuk:
1. Kurva Xie-Beni Index vs jumlah klaster
2. Scatter plot hasil clustering
3. Perbandingan 5 skema rasio
4. Heatmap derajat keanggotaan
"""

import os
# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-import]
import matplotlib.pyplot as plt
# pyrefly: ignore [missing-import]
import matplotlib.ticker as mticker

from config import OUTPUT_DIR, CLUSTER_LABELS, RATIO_SCHEMES


# Pastikan folder output ada
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Style global
plt.rcParams.update({
    "figure.figsize": (10, 6),
    "font.size": 11,
    "axes.grid": True,
    "grid.alpha": 0.3,
})


# ============================================================
# 1. GRAFIK XIE-BENI INDEX vs JUMLAH KLASTER
# ============================================================
def plot_xie_beni_curve(c_values, xb_scores, category_name,
                        save=True, show=False):
    """
    Membuat grafik garis Xie-Beni Index untuk setiap jumlah klaster `c`.

    Args:
        c_values: list jumlah klaster [2, 3, 4, 5]
        xb_scores: dict {c: xb_value}
        category_name: nama kategori (wisata/hotel/kuliner)
        save: simpan ke file
        show: tampilkan di layar
    """
    fig, ax = plt.subplots(figsize=(8, 5))

    c_list = sorted(xb_scores.keys())
    xb_list = [xb_scores[c] for c in c_list]

    # Plot garis
    ax.plot(c_list, xb_list, "bo-", linewidth=2, markersize=10,
            label="Xie-Beni Index")

    # Tandai titik optimal (XBI terkecil)
    optimal_c = min(xb_scores, key=xb_scores.get)
    optimal_xb = xb_scores[optimal_c]
    ax.plot(optimal_c, optimal_xb, "r*", markersize=20,
            label=f"Optimal: c={optimal_c} (XBI={optimal_xb:.4f})")

    # Anotasi
    for c, xb in zip(c_list, xb_list):
        ax.annotate(f"{xb:.4f}", (c, xb),
                    textcoords="offset points", xytext=(0, 12),
                    ha="center", fontsize=9, fontweight="bold")

    ax.set_xlabel("Jumlah Klaster (c)", fontsize=12)
    ax.set_ylabel("Xie-Beni Index (XBI)", fontsize=12)
    ax.set_title(f"Validasi Jumlah Klaster Optimal — {category_name}",
                 fontsize=14, fontweight="bold")
    ax.set_xticks(c_list)
    ax.legend(fontsize=10)
    ax.grid(True, alpha=0.3)

    plt.tight_layout()

    if save:
        path = os.path.join(OUTPUT_DIR, f"xie_beni_{category_name.lower()}.png")
        fig.savefig(path, dpi=150, bbox_inches="tight")
        print(f"    ✓ Grafik disimpan: {path}")

    if show:
        plt.show()
    plt.close(fig)


# ============================================================
# 2. SCATTER PLOT HASIL CLUSTERING
# ============================================================
def plot_cluster_scatter(data_prices, labels, centroids, category_name,
                         names=None, save=True, show=False):
    """
    Scatter plot hasil clustering: harga destinasi diwarnai per klaster.

    Args:
        data_prices: array harga
        labels: array label klaster (0, 1, 2)
        centroids: pusat klaster (sorted)
        category_name: nama kategori
        names: array nama destinasi (opsional)
        save: simpan ke file
        show: tampilkan di layar
    """
    fig, ax = plt.subplots(figsize=(12, 6))

    colors = ["#2ecc71", "#3498db", "#e74c3c"]  # Hijau, Biru, Merah
    sorted_cntr = np.sort(centroids)

    for cluster_id in range(len(sorted_cntr)):
        mask = labels == cluster_id
        cluster_data = data_prices[mask]
        label_name = CLUSTER_LABELS.get(cluster_id, f"Cluster {cluster_id}")

        ax.scatter(
            np.where(mask)[0], cluster_data,
            c=colors[cluster_id % len(colors)],
            alpha=0.6, s=40, edgecolors="white", linewidth=0.5,
            label=f"{label_name} (n={mask.sum()}, "
                  f"centroid=Rp {sorted_cntr[cluster_id]:,.0f})",
        )

    # Garis centroid
    for i, c in enumerate(sorted_cntr):
        ax.axhline(y=c, color=colors[i % len(colors)],
                   linestyle="--", alpha=0.5, linewidth=1.5)

    ax.set_xlabel("Index Data", fontsize=12)
    ax.set_ylabel("Estimasi Harga (Rp)", fontsize=12)
    ax.set_title(f"Hasil Clustering FCM — {category_name}",
                 fontsize=14, fontweight="bold")
    ax.legend(fontsize=9, loc="upper right")
    ax.yaxis.set_major_formatter(
        mticker.FuncFormatter(lambda x, _: f"Rp {x:,.0f}")
    )

    plt.tight_layout()

    if save:
        path = os.path.join(OUTPUT_DIR,
                            f"cluster_scatter_{category_name.lower()}.png")
        fig.savefig(path, dpi=150, bbox_inches="tight")
        print(f"    ✓ Grafik disimpan: {path}")

    if show:
        plt.show()
    plt.close(fig)


# ============================================================
# 3. PERBANDINGAN 5 SKEMA RASIO
# ============================================================
def plot_ratio_comparison(ratio_results, category_name,
                          save=True, show=False):
    """
    Bar chart perbandingan Xie-Beni Index dari 5 skema rasio (A-E).

    Args:
        ratio_results: dict dari validate_ratio_schemes()
        category_name: nama kategori
    """
    fig, ax = plt.subplots(figsize=(10, 6))

    schemes = sorted(ratio_results["results"].keys())
    xb_values = []
    bar_colors = []

    for s in schemes:
        result = ratio_results["results"][s]
        xb = result.get("xb", float("inf"))
        xb_values.append(xb if xb != float("inf") else 0)

        if s == ratio_results["best_scheme"]:
            bar_colors.append("#e74c3c")  # Merah untuk terbaik
        else:
            bar_colors.append("#3498db")  # Biru untuk lainnya

    bars = ax.bar(schemes, xb_values, color=bar_colors, edgecolor="white",
                  linewidth=1.5, width=0.6)

    # Label di atas bar
    for bar, xb, scheme in zip(bars, xb_values, schemes):
        ratio_text = f"{RATIO_SCHEMES[scheme]}"
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height(),
                f"{xb:.4f}\n{ratio_text}",
                ha="center", va="bottom", fontsize=9, fontweight="bold")

    ax.set_xlabel("Skema Rasio", fontsize=12)
    ax.set_ylabel("Xie-Beni Index (XBI)", fontsize=12)
    ax.set_title(
        f"Perbandingan Skema Rasio Centroid — {category_name}\n"
        f"(★ Terbaik: Skema {ratio_results['best_scheme']})",
        fontsize=14, fontweight="bold",
    )

    plt.tight_layout()

    if save:
        path = os.path.join(OUTPUT_DIR,
                            f"ratio_comparison_{category_name.lower()}.png")
        fig.savefig(path, dpi=150, bbox_inches="tight")
        print(f"    ✓ Grafik disimpan: {path}")

    if show:
        plt.show()
    plt.close(fig)


# ============================================================
# 4. HEATMAP DERAJAT KEANGGOTAAN
# ============================================================
def plot_membership_heatmap(u_matrix, category_name, max_items=50,
                            save=True, show=False):
    """
    Heatmap derajat keanggotaan (membership degree) — menunjukkan
    seberapa kuat setiap data 'termasuk' ke tiap klaster.

    Args:
        u_matrix: matriks keanggotaan (c x n)
        category_name: nama kategori
        max_items: maksimum data yang ditampilkan (untuk keterbacaan)
    """
    # Ambil sampel jika data terlalu banyak
    n_data = u_matrix.shape[1]
    if n_data > max_items:
        indices = np.linspace(0, n_data - 1, max_items, dtype=int)
        u_sample = u_matrix[:, indices]
    else:
        u_sample = u_matrix
        indices = range(n_data)

    fig, ax = plt.subplots(figsize=(14, 4))

    im = ax.imshow(u_sample, aspect="auto", cmap="YlOrRd",
                   vmin=0, vmax=1)

    ax.set_yticks(range(u_sample.shape[0]))
    ax.set_yticklabels(
        [CLUSTER_LABELS.get(i, f"C{i}") for i in range(u_sample.shape[0])]
    )
    ax.set_xlabel("Index Data (sample)", fontsize=11)
    ax.set_ylabel("Kategori Klaster", fontsize=11)
    ax.set_title(f"Heatmap Derajat Keanggotaan FCM — {category_name}",
                 fontsize=13, fontweight="bold")

    plt.colorbar(im, ax=ax, label="Derajat Keanggotaan (μ)")
    plt.tight_layout()

    if save:
        path = os.path.join(OUTPUT_DIR,
                            f"membership_heatmap_{category_name.lower()}.png")
        fig.savefig(path, dpi=150, bbox_inches="tight")
        print(f"    ✓ Grafik disimpan: {path}")

    if show:
        plt.show()
    plt.close(fig)


# ============================================================
# 5. GRAFIK DISTRIBUSI HARGA PER KATEGORI
# ============================================================
def plot_price_distribution(datasets, save=True, show=False):
    """
    Histogram distribusi harga untuk ketiga dataset.
    """
    fig, axes = plt.subplots(1, 3, figsize=(16, 5))

    colors = {"wisata": "#2ecc71", "hotel": "#3498db", "kuliner": "#e74c3c"}

    for ax, (name, df) in zip(axes, datasets.items()):
        prices = df["Estimasi_Harga"].values
        ax.hist(prices, bins=30, color=colors.get(name, "#95a5a6"),
                edgecolor="white", alpha=0.8)
        ax.set_title(f"Distribusi Harga — {name.capitalize()}",
                     fontsize=12, fontweight="bold")
        ax.set_xlabel("Harga (Rp)")
        ax.set_ylabel("Frekuensi")
        ax.xaxis.set_major_formatter(
            mticker.FuncFormatter(lambda x, _: f"{x/1000:.0f}K")
        )

    plt.suptitle("Distribusi Harga Dataset", fontsize=14, fontweight="bold",
                 y=1.02)
    plt.tight_layout()

    if save:
        path = os.path.join(OUTPUT_DIR, "distribusi_harga.png")
        fig.savefig(path, dpi=150, bbox_inches="tight")
        print(f"    ✓ Grafik disimpan: {path}")

    if show:
        plt.show()
    plt.close(fig)
