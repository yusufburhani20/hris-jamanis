#!/bin/bash

# ============================================================
# HRIS Deploy Script
# Script ini aman: php artisan up SELALU dijalankan di akhir
# meskipun terjadi error di tengah proses.
# ============================================================

# Pindah ke folder root proyek (tempat script berada)
cd "$(dirname "$0")"
echo "=== MEMULAI DEPLOYMENT SISTEM HRIS ==="
echo "Direktori: $(pwd)"
date

# --- TRAP: Jaminan php artisan up selalu berjalan saat script exit ---
# Fungsi ini dipanggil otomatis saat script selesai, berhasil maupun error.
function cleanup {
    EXIT_CODE=$?
    if [ $EXIT_CODE -ne 0 ]; then
        echo ""
        echo "⚠️  Script berhenti dengan kode error: $EXIT_CODE"
        echo "Memastikan maintenance mode dimatikan agar aplikasi tetap online..."
    fi
    php artisan up
    echo "✅ Aplikasi kembali online."
}
trap cleanup EXIT

# ---- 1. Aktifkan Maintenance Mode ----
echo ""
echo "[1/7] Mengaktifkan maintenance mode..."
php artisan down || true

# ---- 2. Git Pull ----
echo ""
echo "[2/7] Menarik pembaruan kode dari GitHub..."
if [ -n "$GITHUB_USER" ] && [ -n "$GITHUB_TOKEN" ]; then
    echo "      Menggunakan token GitHub untuk autentikasi..."
    git remote set-url origin "https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/${GITHUB_USER}/hris.git"
    git pull origin main
    # Kembalikan remote URL bersih agar token tidak tersimpan di server
    git remote set-url origin "https://github.com/${GITHUB_USER}/hris.git"
else
    echo "      Menarik tanpa token (SSH key / HTTPS publik)..."
    git pull origin main
fi

# ---- 3. Instalasi Dependensi PHP ----
echo ""
echo "[3/7] Menginstal dependensi Composer..."
composer install --no-dev --optimize-autoloader --no-interaction

# ---- 4. Migrasi Database ----
echo ""
echo "[4/7] Menjalankan migrasi database..."
php artisan migrate --force

# ---- 5. Kompilasi Aset Frontend ----
echo ""
echo "[5/7] Mengecek ketersediaan Node.js / NPM..."
if command -v npm &> /dev/null; then
    echo "      Node.js ditemukan. Memulai kompilasi aset React (Vite)..."
    npm install --legacy-peer-deps --no-audit --no-fund
    npm run build
    echo "      Kompilasi frontend selesai."
else
    echo "      ⚠️  npm tidak ditemukan di server ini."
    echo "      Lewati build aset — pastikan folder public/build sudah di-push dari lokal."
fi

# ---- 6. Optimasi Cache Laravel ----
echo ""
echo "[6/7] Memperbarui cache konfigurasi, rute, dan tampilan Laravel..."
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# ---- 7. Selesai ----
echo ""
echo "[7/7] Proses deployment selesai pada $(date)."
echo "✅ Pembaruan selesai dengan sukses!"

# Hapus trap agar cleanup() tidak menjalankan artisan up dua kali
trap - EXIT
php artisan up
echo "✅ Aplikasi kembali online."
