import sys
sys.path.append("storage/app/python")
import pandas as pd
import numpy as np
from recommender import run_multi_attribute_fcm
from config import DATASET_HOTEL

df = pd.read_excel(DATASET_HOTEL)
df["Estimasi_Harga"] = pd.to_numeric(df["Estimasi_Harga"], errors="coerce")
df = df.dropna(subset=["Estimasi_Harga"])
df = df[df["Estimasi_Harga"] > 0].reset_index(drop=True)

# The user ran: rekomendasi_budget_20260708_111646_b1000000_p1_d2.xlsx
# Budget 1M, Persons 1, Duration 2.
# Which means budget_anchor for hotel = (1,000,000 * 0.40) / (1 * 1) = 400,000.
# What is best_c? It's dynamically calculated. Let's force it to 2 and 3 to see.
for c in [2, 3]:
    print(f"\n--- Testing c={c} ---")
    res = run_multi_attribute_fcm(df, budget_anchor=400000, n_clusters=c, workflow="budget")
    u_matrix = res["u"]
    labels = res["labels"]
    
    print("Centroids (Price):", res["cntr"])
    
    # 1.5M hotel
    idx_15m = df[df["Estimasi_Harga"] >= 1400000].index[0]
    print("1.5M Hotel:", df.loc[idx_15m, "Nama_Tempat"])
    print("Price:", df.loc[idx_15m, "Estimasi_Harga"], "Rating:", df.loc[idx_15m, "Rating"], "Cat:", df.loc[idx_15m, "Nilai_Numerik"])
    print("Memberships:", u_matrix[:, idx_15m])
    print("Assigned Label:", labels[idx_15m])
    
    # 144k hotel
    idx_144 = df[(df["Estimasi_Harga"] >= 144000) & (df["Estimasi_Harga"] <= 145000)].index[0]
    print("\n144k Hotel:", df.loc[idx_144, "Nama_Tempat"])
    print("Price:", df.loc[idx_144, "Estimasi_Harga"], "Rating:", df.loc[idx_144, "Rating"], "Cat:", df.loc[idx_144, "Nilai_Numerik"])
    print("Memberships:", u_matrix[:, idx_144])
    print("Assigned Label:", labels[idx_144])
