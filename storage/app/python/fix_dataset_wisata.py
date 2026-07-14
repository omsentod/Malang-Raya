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
    # TAHAP 2 — [DIHAPUS] Kolom Flagging Wahana Obsolet
    # ════════════════════════════════════════════════════════════════════
    # Tahap 2 telah dihapus untuk merapikan database. Wahana tambahan
    # sekarang dikelola secara relasional via destination_family_id.
    pass

    # ════════════════════════════════════════════════════════════════════
    # TAHAP 3 — Tandai destination_family_id (Parent-Child, < 300m)
    # ════════════════════════════════════════════════════════════════════
    log(f"\n{'─'*70}")
    log(f"  TAHAP 3 — Pengelompokan Induk-Anak (< {FAMILY_THRESHOLD_M:.0f}m)")
    log(f"{'─'*70}")

    df["destination_family_id"] = pd.Series([pd.NA] * len(df), dtype="Int64")   # Null = Induk / Mandiri
    records_clean = df.to_dict("records")
    
    # Gunakan Disjoint Set Union (DSU) untuk mencari komponen terhubung
    dsu_parent = {}
    
    def find(i):
        if dsu_parent[i] == i: return i
        dsu_parent[i] = find(dsu_parent[i])
        return dsu_parent[i]
        
    def union(i, j):
        root_i = find(i)
        root_j = find(j)
        if root_i != root_j:
            dsu_parent[root_i] = root_j

    for a in records_clean:
        aid = a["Id_Tempat"]
        if aid not in dsu_parent:
            dsu_parent[aid] = aid

    for i, a in enumerate(records_clean):
        aid = a["Id_Tempat"]
        for j, b in enumerate(records_clean):
            if i >= j: continue
            bid = b["Id_Tempat"]
            dist = safe_haversine(a, b)
            if dist <= FAMILY_THRESHOLD_M and dist > DUPLICATE_THRESHOLD_M:
                union(aid, bid)

    from collections import defaultdict
    clusters_dict = defaultdict(set)
    for aid in dsu_parent:
        clusters_dict[find(aid)].add(aid)
        
    clusters = [c for c in clusters_dict.values() if len(c) > 1]
    
    log(f"\n  Ditemukan {len(clusters)} kompleks destinasi Induk-Anak:")

    for cluster in clusters:
        members = df[df["Id_Tempat"].isin(cluster)]
        
        # Urutkan berdasarkan Ulasan & Rating untuk mencari Induk yang paling populer
        # FillNa dengan 0 untuk amannya
        members_sorted = members.assign(
            ulas = pd.to_numeric(members['Jumlah_Ulasan'], errors='coerce').fillna(0),
            rate = pd.to_numeric(members['Rating'], errors='coerce').fillna(0)
        ).sort_values(by=["ulas", "rate"], ascending=[False, False])
        
        parent = members_sorted.iloc[0]
        parent_id = parent["Id_Tempat"]
        
        # Set family id untuk anak-anaknya saja (merujuk ke Id_Tempat induk)
        children_ids = cluster - {parent_id}
        df.loc[df["Id_Tempat"].isin(children_ids), "destination_family_id"] = parent_id

        log(f"\n  📍 INDUK [{parent_id:3d}] {parent['Nama_Tempat']} ({len(children_ids)} Anak)")
        for tid in cluster:
            m = members[members["Id_Tempat"] == tid].iloc[0]
            role = "INDUK" if tid == parent_id else "ANAK "
            log(f"       [{tid:3d}] {role} - {m['Nama_Tempat'][:50]:<50} Rp {m['Estimasi_Harga']:,}")

    # Konversi tipe kolom ke nullable integer agar tidak menjadi float (cth: 1.0)
    df["destination_family_id"] = pd.to_numeric(df["destination_family_id"], errors='coerce').astype("Int64")

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
        "destination_family_id",
    ]
    df = df[[c for c in final_cols if c in df.columns]]

    df.to_excel(DATASET_PATH, index=False)
    log(f"\n✅ Dataset disimpan: {DATASET_PATH}")
    log(f"   Baris awal  : {total_awal}")
    log(f"   Baris akhir : {len(df)} (berkurang {total_awal - len(df)} duplikat)")
    log(f"   Kolom baru  : destination_family_id")

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
