"""
config.py — Konfigurasi & Parameter Sistem Rekomendasi Paket Wisata
====================================================================
Berisi seluruh parameter yang digunakan oleh algoritma Fuzzy C-Means,
tarif transportasi, dan skema rasio inisialisasi centroid.
"""

import os
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

# Muat variabel dari file .env
load_dotenv()

# ============================================================
# PATH DATASET
# ============================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATASET_WISATA = os.path.join(BASE_DIR, "wisata_clean.xlsx")
DATASET_HOTEL = os.path.join(BASE_DIR, "hotel_clean.xlsx")
DATASET_MAKAN = os.path.join(BASE_DIR, "tempat_makan_clean.xlsx")

OUTPUT_DIR = os.path.join(BASE_DIR, "output")

# ============================================================
# GOOGLE MAPS API
# ============================================================
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "YOUR_API_KEY_HERE")

# ============================================================
# PARAMETER ALGORITMA FUZZY C-MEANS
# ============================================================
FCM_FUZZIFIER = 2        # Pangkat pembobot (m), standar = 2
FCM_MAX_ITER = 300        # Maksimum iterasi
FCM_ERROR = 1e-5          # Toleransi error (epsilon) untuk konvergensi

# ============================================================
# RANGE JUMLAH KLASTER UNTUK PENGUJIAN XIE-BENI
# ============================================================
CLUSTER_RANGE = [2, 3, 4, 5]

# ============================================================
# SKEMA RASIO INISIALISASI CENTROID
# Sesuai Tabel Sub-bab 3.3.4 skripsi
# Format: (ratio_hemat, ratio_balanced, ratio_premium)
# ============================================================
RATIO_SCHEMES = {
    "A": (0.5, 1.0, 1.5),   # Sangat Lebar (100%)
    "B": (0.6, 1.0, 1.4),   # Moderat (80%) — Pilihan utama
    "C": (0.7, 1.0, 1.3),   # Sempit (60%)
    "D": (0.5, 1.0, 2.0),   # Ekstrem (150%)
    "E": (0.8, 1.0, 1.2),   # Sangat Sempit (40%)
}

# Skema default yang digunakan sistem
DEFAULT_RATIO_SCHEME = "B"

# ============================================================
# TARIF TRANSPORTASI ONLINE
# Sesuai Tabel III.4 skripsi — Tarif Gojek Malang Raya (Jan 2026)
# ============================================================
TRANSPORT_RATES = {
    "GoRide": {
        "rate_per_km": 2250,       # Rp/km
        "min_persons": 1,
        "max_persons": 1,
        "description": "Motor — 1 orang",
        "source": "KP 667/2022",
    },
    "GoCar_Standard": {
        "rate_per_km": 5150,       # Rp/km
        "min_persons": 2,
        "max_persons": 4,
        "description": "Mobil — 2-4 orang",
        "source": "Pergub Jatim 188/291/KPTS/013/2023",
    },
    "GoCar_XL": {
        "rate_per_km": 6000,       # Rp/km
        "min_persons": 5,
        "max_persons": 6,
        "description": "Mobil XL — 5-6 orang",
        "source": "Pergub Jatim 188/291/KPTS/013/2023",
    },
}

# ============================================================
# LABEL KATEGORI KLASTER
# ============================================================
CLUSTER_LABELS = {
    0: "Hemat",
    1: "Balanced",
    2: "Premium",
}

# ============================================================
# SAMPLE BUDGET UNTUK PENGUJIAN
# ============================================================
SAMPLE_BUDGETS = [500_000, 1_000_000, 2_000_000, 5_000_000]

# ============================================================
# PARAMETER REKOMENDASI
# ============================================================
MAX_PACKAGES_DISPLAY = 3   # Jumlah paket yang ditampilkan
MEALS_PER_DAY = 2          # Asumsi makan 2x sehari
MAX_PERSONS_PER_ROOM = 2   # Kapasitas kamar hotel
