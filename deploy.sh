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

# ---- 0. Deteksi Path Node.js aaPanel & NVM ----
echo "Mendeteksi instalasi Node.js di server..."
# Cek path aaPanel Node Version Manager
for node_dir in /www/server/nodejs/v*/bin; do
    if [ -d "$node_dir" ]; then
        export PATH="$node_dir:$PATH"
        echo "      Menemukan Node.js aaPanel: $node_dir"
    fi
done

# Tambahkan path sistem umum lainnya
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
echo "      PATH aktif: $PATH"

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
echo "      Mengamankan repositori (discard local changes)..."
git reset --hard HEAD
git clean -fd

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
    npx vite build
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

# ---- 7. Restart Queue Worker (untuk push notification) ----
echo ""
echo "[7/7] Me-restart Queue Worker..."
if command -v supervisorctl &> /dev/null; then
    supervisorctl restart hris-queue:* 2>/dev/null || true
    echo "      Queue worker di-restart via Supervisor."
else
    echo "      ⚠️  Supervisor tidak ditemukan. Pastikan Queue Worker berjalan manual."
fi

# ---- Selesai ----
echo ""
echo "=== DEPLOYMENT SELESAI pada $(date) ==="
echo ""
echo "✅ Checklist:"
echo "   ✓ Kode terbaru dari GitHub"
echo "   ✓ Dependensi Composer terinstall"
echo "   ✓ Migration database selesai"
echo "   ✓ Aset frontend terkompilasi"
echo "   ✓ Cache Laravel diperbarui"
echo "   ✓ Queue Worker di-restart"
echo ""
echo "⚠️  Yang perlu dicek MANUAL (sekali saja saat pertama deploy):"
echo "   - Pastikan .env berisi VAPID_PUBLIC_KEY dan VAPID_PRIVATE_KEY"
echo "   - Pastikan Cron Job scheduler sudah aktif di aaPanel"
echo "   - Pastikan Supervisor process hris-queue sudah dibuat"
echo ""

# Hapus trap agar cleanup() tidak menjalankan artisan up dua kali
trap - EXIT
php artisan up
echo "✅ Aplikasi kembali online."
