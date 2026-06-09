#!/bin/bash
# ============================================================
# setup_venv.sh — Inisialisasi venv Python di path permanen
# Jalankan SEKALI via SSH setelah fresh deployment pertama:
#   bash /home/u707667165/domains/rifqi.sumdebetta.com/public_html/storage/app/python/setup_venv.sh
# ============================================================

VENV_DIR="/home/u707667165/python_venv/malang_raya"
PYTHON_BIN="/opt/alt/python311/bin/python3"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> Membuat venv permanen di: $VENV_DIR"
mkdir -p "$VENV_DIR"
"$PYTHON_BIN" -m venv "$VENV_DIR"

echo "==> Mengaktifkan venv..."
source "$VENV_DIR/bin/activate"

echo "==> Menginstall dependensi dari requirements.txt..."
pip install --upgrade pip
pip install -r "$SCRIPT_DIR/requirements.txt"

echo ""
echo "==> SELESAI. Venv berhasil dibuat di: $VENV_DIR"
echo "    Laravel akan otomatis menggunakan venv ini pada request berikutnya."
