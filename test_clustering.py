import sys
sys.path.append("storage/app/python")
import pandas as pd
from recommender import run_multi_attribute_fcm
from config import DATASET_HOTEL

df = pd.read_excel(DATASET_HOTEL)
df["Estimasi_Harga"] = pd.to_numeric(df["Estimasi_Harga"], errors="coerce")
df = df.dropna(subset=["Estimasi_Harga"])
df = df[df["Estimasi_Harga"] > 0].reset_index(drop=True)

# Find a 1.5M hotel and 144k hotel
res = run_multi_attribute_fcm(df, budget_anchor=400000, n_clusters=2, workflow='budget')

df["Cluster"] = res["labels"]
df["Membership_Degree"] = [float(res["u"][res["labels"][j], j]) for j in range(len(df))]

print("Centroids (Price):", res["cntr"])
print("\nHotels > 1.4M:")
print(df[df["Estimasi_Harga"] >= 1400000][["Nama_Tempat", "Estimasi_Harga", "Rating", "Nilai_Numerik", "Cluster", "Membership_Degree"]])

print("\nHotels around 144k:")
print(df[(df["Estimasi_Harga"] >= 140000) & (df["Estimasi_Harga"] <= 150000)][["Nama_Tempat", "Estimasi_Harga", "Rating", "Nilai_Numerik", "Cluster", "Membership_Degree"]].head())

