"""
fix_dataset_wisata.py
======================
Script pembersihan & enrichment dataset wisata_clean.xlsx:

TAHAP 1 — Hapus duplikat geografis sempurna (< 10m), simpan yang rating/ulasan terbaik.
TAHAP 2 — Tambah kolom flagging wahana & biaya tambahan:
           has_additional_cost, additional_cost_min, additional_cost_max,
           additional_cost_label, destination_family_id
TAHAP 3 — Tandai destination_family_id untuk destinasi satu kompleks (< 300m).
TAHAP 4 — Simpan ke wisata_clean.xlsx (overwrite) + backup wisata_clean_backup.xlsx.

Jalankan: python fix_dataset_wisata.py
"""

import math
import pandas as pd
import shutil
import os
from datetime import datetime

# ─────────────────────────────────────────────────────────────
# KONFIGURASI
# ─────────────────────────────────────────────────────────────
DATASET_PATH   = os.path.join(os.path.dirname(__file__), "datasets", "wisata_clean.xlsx")
BACKUP_PATH    = os.path.join(os.path.dirname(__file__), "datasets", f"wisata_clean_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx")
REPORT_PATH    = os.path.join(os.path.dirname(__file__), "output", "laporan_fix_dataset.txt")

DUPLICATE_THRESHOLD_M  = 10.0   # Jarak (meter) untuk deteksi duplikat sempurna
FAMILY_THRESHOLD_M     = 300.0  # Jarak (meter) untuk deteksi destinasi satu kompleks

# ─────────────────────────────────────────────────────────────
# MANUAL RULES — Flagging Biaya Wahana
# Kunci: Id_Tempat dari dataset asli
# ─────────────────────────────────────────────────────────────
WAHANA_FLAGS = {
    # FORMAT:
    # id: (has_cost, cost_min, cost_max, label)
    # ─── RAFTING ──────────────────────────────────────────────
    16:  (True,  175000, 250000, "Wahana Rafting"),
    42:  (True,   50000, 150000, "Wahana Rafting"),
    50:  (True,  150000, 275000, "Wahana Rafting"),  # 'Rafting Malang' — harga parkir Rp5k, wahana exclude
    52:  (True,  150000, 195000, "Wahana Rafting"),
    151: (True,  150000, 275000, "Wahana Rafting & Outbound"),
    200: (True,  150000, 250000, "Wahana Rafting"),
    207: (True,  150000, 185000, "Wahana Rafting"),
    272: (True,  150000, 195000, "Wahana Rafting"),
    # ─── TUBING ───────────────────────────────────────────────
    439: (True,   30000,  75000, "Wahana Tubing"),
    554: (True,   50000,  75000, "Wahana Tubing"),
    # ─── OUTBOUND / ADVENTURE ─────────────────────────────────
    49:  (True,   50000, 150000, "Wahana Outbound"),
    122: (True,   65000, 150000, "Wahana Jungle Adventure"),
    205: (True,   50000, 150000, "Wahana Farm Adventure"),
    269: (True,   50000, 150000, "Wahana Farm Garden Adventure"),
    320: (True,   50000, 200000, "Wahana Extreme Sports"),
    486: (True,   80000, 200000, "Wahana Outbound & Edukasi"),
    588: (True,  150000, 250000, "Wahana River Adventure"),
    # ─── PAINTBALL ────────────────────────────────────────────
    390: (True,  100000, 175000, "Wahana Paintball"),
    # ─── KOLAM RENANG / WATERPARK (wahana seluncuran dll) ─────
    66:  (True,    5000,  30000, "Wahana Kolam Renang"),
    96:  (True,    5000,  20000, "Wahana Kolam Renang"),
    117: (True,    5000,  20000, "Wahana Kolam Renang"),
    144: (True,   25000,  75000, "Wahana Waterpark"),
    171: (True,    5000,  20000, "Wahana Kolam Renang"),
    181: (True,    5000,  20000, "Wahana Kolam Renang"),
    255: (True,    5000,  20000, "Wahana Kolam Renang"),
    395: (True,    5000,  20000, "Wahana Waterpark"),
    419: (True,    5000,  30000, "Wahana Waterpark"),
    423: (True,   10000,  50000, "Wahana Kolam Renang"),
    426: (True,   20000,  80000, "Wahana Kolam Renang"),
    477: (True,   50000, 120000, "Wahana Waterpark"),
    481: (True,    5000,  20000, "Wahana Kolam Renang"),
    528: (True,    5000,  20000, "Wahana Kolam Renang"),
    543: (True,    5000,  30000, "Wahana Waterpark"),
    # ─── BERKUDA / KUDA ───────────────────────────────────────
    462: (True,   30000, 100000, "Wahana Berkuda"),
    # ─── GLAMPING / CAMPING (biaya tenda/fasilitas malam) ─────
    536: (True,  150000, 350000, "Biaya Glamping (per malam)"),
    566: (True,   50000, 150000, "Biaya Camping (tenda/malam)"),
    # ─── OFFROAD / ATV ────────────────────────────────────────
    279: (True,   75000, 250000, "Wahana Offroad/ATV"),
    # ─── WAHANA PINUS / TAMAN ─────────────────────────────────
    458: (True,   10000,  50000, "Wahana Taman (flying fox/dll)"),
    # ─── RESORT (fasilitas kolam renang/wahana include) ───────
    446: (True,   60000, 150000, "Fasilitas Resort (kolam/wahana)"),
}

# ─────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────
def haversine(lat1, lon1, lat2, lon2):
    """Hitung jarak (meter) antara dua koordinat."""
    R = 6_371_000.0
    phi1, phi2 = math.radians(float(lat1)), math.radians(float(lat2))
    dphi       = math.radians(float(lat2) - float(lat1))
    dlambda    = math.radians(float(lon2) - float(lon1))
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def safe_haversine(a, b):
    """Haversine dengan fallback 999999 jika koordinat tidak valid."""
    try:
        return haversine(a["Latitude"], a["Longitude"], b["Latitude"], b["Longitude"])
    except Exception:
        return 999_999.0


# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────
def main():
    log_lines = []

    def log(msg=""):
        print(msg)
        log_lines.append(msg)

    log("=" * 70)
    log("  FIX DATASET WISATA — Cleanup & Enrichment")
    log(f"  Dijalankan: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    log("=" * 70)

    # ── BACKUP ──────────────────────────────────────────────────────────
    shutil.copy2(DATASET_PATH, BACKUP_PATH)
    log(f"\n✅ Backup tersimpan: {os.path.basename(BACKUP_PATH)}")

    # ── LOAD ────────────────────────────────────────────────────────────
    df = pd.read_excel(DATASET_PATH)
    total_awal = len(df)
    log(f"📂 Dataset dimuat: {total_awal} baris")

    # ════════════════════════════════════════════════════════════════════
    # TAHAP 1 — Hapus Duplikat Geografis Sempurna (< DUPLICATE_THRESHOLD_M)
    # ════════════════════════════════════════════════════════════════════
    log(f"\n{'─'*70}")
    log(f"  TAHAP 1 — Hapus Duplikat Geografis (< {DUPLICATE_THRESHOLD_M:.0f}m)")
    log(f"{'─'*70}")

    records = df.to_dict("records")
    to_delete_ids = set()   # Id_Tempat yang akan dihapus
    duplicate_report = []

    for i, a in enumerate(records):
        if a["Id_Tempat"] in to_delete_ids:
            continue
        for j, b in enumerate(records):
            if j <= i or b["Id_Tempat"] in to_delete_ids:
                continue
            dist = safe_haversine(a, b)
            if dist <= DUPLICATE_THRESHOLD_M:
                # Pertahankan yang rating lebih tinggi; jika sama, yang ulasan lebih banyak
                score_a = (float(a.get("Rating", 0) or 0), int(a.get("Jumlah_Ulasan", 0) or 0))
                score_b = (float(b.get("Rating", 0) or 0), int(b.get("Jumlah_Ulasan", 0) or 0))

                if score_a >= score_b:
                    loser = b
                else:
                    loser = a

                to_delete_ids.add(loser["Id_Tempat"])
                winner = a if loser is b else b
                duplicate_report.append((
                    winner["Id_Tempat"], winner["Nama_Tempat"],
                    loser["Id_Tempat"],  loser["Nama_Tempat"],
                    round(dist, 1)
                ))
                log(f"  🗑  HAPUS [{loser['Id_Tempat']:3d}] {loser['Nama_Tempat'][:45]}")
                log(f"       ↳  SIMPAN [{winner['Id_Tempat']:3d}] {winner['Nama_Tempat'][:45]} | Jarak: {dist:.1f}m")

    df = df[~df["Id_Tempat"].isin(to_delete_ids)].copy()
    df = df.reset_index(drop=True)
    log(f"\n  Total dihapus: {len(to_delete_ids)} baris duplikat")
    log(f"  Sisa data    : {len(df)} baris")

    # ════════════════════════════════════════════════════════════════════
    # TAHAP 2 — Tambah Kolom Flagging Wahana
    # ════════════════════════════════════════════════════════════════════
    log(f"\n{'─'*70}")
    log("  TAHAP 2 — Flagging Biaya Wahana Tambahan")
    log(f"{'─'*70}")

    df["has_additional_cost"]   = 0
    df["additional_cost_min"]   = 0
    df["additional_cost_max"]   = 0
    df["additional_cost_label"] = ""

    flagged_count = 0
    for idx, row in df.iterrows():
        tid = int(row["Id_Tempat"])
        if tid in WAHANA_FLAGS:
            has_cost, cost_min, cost_max, label = WAHANA_FLAGS[tid]
            df.at[idx, "has_additional_cost"]   = 1 if has_cost else 0
            df.at[idx, "additional_cost_min"]   = cost_min
            df.at[idx, "additional_cost_max"]   = cost_max
            df.at[idx, "additional_cost_label"] = label
            flagged_count += 1
            log(f"  ⚠  [{tid:3d}] {row['Nama_Tempat'][:45]:<45} → {label} (+Rp {cost_min:,}–{cost_max:,})")

    log(f"\n  Total diflag : {flagged_count} destinasi wahana")

    # ════════════════════════════════════════════════════════════════════
    # TAHAP 3 — Tandai destination_family_id (satu kompleks, < 300m)
    # ════════════════════════════════════════════════════════════════════
    log(f"\n{'─'*70}")
    log(f"  TAHAP 3 — Pengelompokan Destinasi Satu Kompleks (< {FAMILY_THRESHOLD_M:.0f}m)")
    log(f"{'─'*70}")

    df["destination_family_id"] = pd.NA   # Null = bukan bagian dari kompleks
    records_clean = df.to_dict("records")
    family_id = 1
    id_to_family = {}   # Id_Tempat -> family_id

    for i, a in enumerate(records_clean):
        aid = a["Id_Tempat"]
        nearby = []
        for j, b in enumerate(records_clean):
            if i == j:
                continue
            bid = b["Id_Tempat"]
            dist = safe_haversine(a, b)
            if dist <= FAMILY_THRESHOLD_M and dist > DUPLICATE_THRESHOLD_M:
                nearby.append(bid)

        if nearby:
            # Jika a sudah punya family, gunakan yang sama; jika tidak, buat baru
            existing_fid = id_to_family.get(aid)
            if existing_fid is None:
                existing_fid = family_id
                id_to_family[aid] = existing_fid
                family_id += 1

            for bid in nearby:
                if bid not in id_to_family:
                    id_to_family[bid] = existing_fid

    # Merge id_to_family ke df
    df["destination_family_id"] = df["Id_Tempat"].map(id_to_family)

    family_counts = df["destination_family_id"].value_counts()
    families_with_2plus = family_counts[family_counts >= 2]
    log(f"\n  Ditemukan {len(families_with_2plus)} kompleks destinasi dengan 2+ anggota:")

    for fid, cnt in families_with_2plus.sort_index().items():
        members = df[df["destination_family_id"] == fid][["Id_Tempat", "Nama_Tempat", "Estimasi_Harga"]]
        log(f"\n  📍 KOMPLEKS #{fid} ({cnt} destinasi):")
        for _, m in members.iterrows():
            log(f"       [{m['Id_Tempat']:3d}] {m['Nama_Tempat'][:50]:<50} Rp {m['Estimasi_Harga']:,}")

    # ════════════════════════════════════════════════════════════════════
    # TAHAP 4 — Simpan ke Excel
    # ════════════════════════════════════════════════════════════════════
    log(f"\n{'─'*70}")
    log("  TAHAP 4 — Simpan Dataset")
    log(f"{'─'*70}")

    # Susun urutan kolom final
    final_cols = [
        "Id_Tempat", "Nama_Tempat", "Rating", "Jumlah_Ulasan",
        "Kategori", "Nilai_Numerik", "Latitude", "Longitude",
        "Link", "Estimasi_Harga", "Sumber_Data", "Link_Sumber",
        # Kolom baru
        "has_additional_cost", "additional_cost_min", "additional_cost_max",
        "additional_cost_label", "destination_family_id",
    ]
    df = df[[c for c in final_cols if c in df.columns]]

    df.to_excel(DATASET_PATH, index=False)
    log(f"\n✅ Dataset disimpan: {DATASET_PATH}")
    log(f"   Baris awal  : {total_awal}")
    log(f"   Baris akhir : {len(df)} (berkurang {total_awal - len(df)} duplikat)")
    log(f"   Kolom baru  : has_additional_cost, additional_cost_min,")
    log(f"                 additional_cost_max, additional_cost_label,")
    log(f"                 destination_family_id")

    # ── Simpan Laporan ──────────────────────────────────────────────────
    os.makedirs(os.path.dirname(REPORT_PATH), exist_ok=True)
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(log_lines))
    log(f"\n📄 Laporan lengkap: {REPORT_PATH}")
    log("\n" + "=" * 70)
    log("  SELESAI ✅")
    log("=" * 70)


if __name__ == "__main__":
    main()
