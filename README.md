# HRIS Enterprise - Sistem Informasi Manajemen Kepegawaian & Penggajian Pintar

HRIS Enterprise adalah platform sistem manajemen sumber daya manusia (HRD) modern, interaktif, dan komprehensif yang dirancang untuk mengotomasi operasional administrasi karyawan, presensi dengan tingkat keamanan tinggi, hingga sistem kalkulasi payroll (penggajian) massal terintegrasi. 

Dibangun dengan teknologi **Laravel (Backend)** + **React & Inertia.js (Frontend)** + **TailwindCSS**, aplikasi ini menyajikan antarmuka premium, super responsif, serta dilengkapi visualisasi analitik grafik yang menakjubkan.

---

## 🚀 Fitur Unggulan Sistem (Key Features)

### 1. 💰 Modul Penggajian Otomatis & Massal (Smart Payroll System)
*   **Auto-Kalkulasi Pintar:** Otomatis menghitung Gaji Bersih berdasarkan formula terstandarisasi: `Gaji Pokok + Tunjangan Kehadiran + Upah Lembur - Potongan Keterlambatan/Absensi`.
*   **Kustomisasi Draf Gaji:** Seluruh nilai pada draf gaji (Tunjangan, Lembur, dan Potongan) dapat diedit secara manual oleh Admin untuk mengakomodasi penyesuaian khusus (manual adjustment), kecuali Gaji Pokok yang terkunci demi keamanan data.
*   **Kalkulasi & Pelunasan Massal (Bulk Actions):** 
    *   **Hitung Gaji Masal (⚡):** Sekali klik untuk mengalkulasi draf gaji seluruh karyawan aktif sekaligus.
    *   **Tandai Lunas Masal (✅):** Fitur checklist dinamis untuk memilih karyawan tertentu yang ingin dilunasi gajinya secara bersamaan.
*   **e-Payslip HTML Premium & Unduh PDF:** Slip gaji elektronik berdesain ultra-modern dikirim otomatis ke email karyawan saat draf ditandai lunas, serta dapat diunduh dalam format PDF resmi.

### 2. ⏱️ Kehadiran Geofence & Lembur Hibrida (Smart Attendance & Overtime)
*   **Anti-Spoofing & Real-time Selfie:** Kehadiran check-in/check-out mewajibkan pengambilan swafoto (selfie) via kamera perangkat langsung serta perlindungan canggih yang **menolak manipulasi lokasi (Fake GPS / Mock Location)**.
*   **Lembur Hibrida:** Perhitungan jam lembur didasarkan secara dinamis dari akumulasi kehadiran lembur otomatis geofence dan pengajuan lembur manual karyawan yang telah disetujui Admin.
*   **Dasbor Pengajuan Lembur:** Karyawan dapat mengajukan jam lembur (memasukkan tanggal, durasi jam, dan alasan tugas) dengan sistem tinjau persetujuan (approve/reject) instan bagi Admin.

### 3. 📅 Manajemen Shift Kerja & Penugasan Massal
*   **Master Shift Kerja:** Kelola nama, kode unik, serta jam operasional masuk (check-in) dan pulang (check-out).
*   **Penugasan Shift Massal (Checklist-based):** Dilengkapi panel banner Indigo yang sangat elegan untuk memilih beberapa karyawan sekaligus via checklist dan menugaskan shift aktif baru beserta tanggal berlakunya dalam satu langkah mudah.

### 4. 🏖️ Pengajuan Cuti & Izin Digital
*   **Pengajuan Mandiri:** Karyawan dapat mengajukan cuti, sakit, atau izin dengan mengunggah berkas bukti fisik (surat dokter/foto pendukung).
*   **Tinjauan Admin:** Panel approval desk bagi HRD untuk meninjau secara transparan berkas bukti dan mengambil keputusan persetujuan.

### 5. 📧 Notifikasi Otomatis Real-time (Mailables System)
*   Disertai sistem Mailables berdesain HTML premium untuk memberikan informasi penting instan:
    *   Email e-Payslip otomatis ke karyawan saat gajinya ditandai lunas.
    *   Email notifikasi instan ke Admin saat karyawan mengajukan cuti/izin baru.
    *   Email notifikasi instan ke Admin saat karyawan mengirim pengajuan lembur baru.
*   **Try-Catch Mail Safety:** Semua pengiriman email dilindungi dengan try-catch aman sehingga sistem tidak akan crash meskipun SMTP mail server lokal Anda belum dikonfigurasi.

### 6. 📊 Dasbor Analitik HRD Interaktif
*   **Tren Kehadiran Harian (Area Chart):** Grafik gradasi interaktif yang menyajikan tren kehadiran harian 7 hari terakhir (Tepat Waktu vs Terlambat).
*   **Distribusi Presensi Hari Ini (Pie Chart):** Diagram donat dinamis yang menampilkan persentase kondisi kehadiran karyawan hari ini secara real-time.
*   **Rata-rata Durasi Kerja Karyawan (Bar Chart):** Grafik batang untuk mengevaluasi efisiensi jam kerja bersih masing-masing karyawan.

---

## 🛠️ Persyaratan Sistem (System Requirements)

Pastikan perangkat Anda telah memenuhi prasyarat berikut sebelum memulai instalasi:
*   **PHP >= 8.2**
*   **Composer >= 2.0**
*   **Node.js >= 18** & **NPM >= 9**
*   **MySQL >= 8.0** atau MariaDB >= 10.4
*   Driver Ekstensi PHP: `PDO`, `MBString`, `XML`, `OpenSSL`, `GD` (untuk pengolahan gambar), dan `ZIP`.

---

## 💻 Panduan Instalasi & Cara Menjalankan (Installation Guide)

Ikuti langkah-langkah di bawah ini untuk memasang aplikasi HRIS Enterprise pada perangkat lokal atau server Anda:

### Langkah 1: Kloning Repositori
Kloning kode sumber aplikasi dari repositori GitHub:
```bash
git clone https://github.com/yusufburhani20/hris.git
cd hris
```

### Langkah 2: Instalasi Dependensi PHP (Composer)
Unduh dan pasang seluruh paket dependensi Laravel yang diperlukan:
```bash
composer install
```

### Langkah 3: Instalasi Dependensi JavaScript (NPM)
Unduh dan pasang seluruh paket pustaka React, Inertia, dan chart komponen:
```bash
npm install
```

### Langkah 4: Konfigurasi Environment File
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Buka file `.env` yang baru dibuat menggunakan text editor Anda, lalu sesuaikan konfigurasi database Anda:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=nama_database_anda
DB_USERNAME=username_database_anda
DB_PASSWORD=password_database_anda
```

*(Opsional)* Konfigurasikan mail server Anda untuk mengaktifkan fitur pengiriman notifikasi email otomatis:
```env
MAIL_MAILER=smtp
MAIL_HOST=sandbox.smtp.mailtrap.io # Atau SMTP Server Anda
MAIL_PORT=2525
MAIL_USERNAME=username_smtp_anda
MAIL_PASSWORD=password_smtp_anda
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="hris@company.com"
MAIL_FROM_NAME="HRIS Enterprise"
```

### Langkah 5: Generate Application Key
Jalankan perintah berikut untuk membuat key pengaman aplikasi Laravel:
```bash
php artisan key:generate
```

### Langkah 6: Jalankan Migrasi Database & Seeder
Buat seluruh struktur tabel database beserta data seed awal (seperti akun admin default dan parameter dasar):
```bash
php artisan migrate --seed
```

### Langkah 7: Hubungkan Storage Link
Buat link tautan folder agar berkas foto selfie presensi dan bukti fisik izin karyawan dapat diakses publik:
```bash
php artisan storage:link
```

### Langkah 8: Kompilasi Aset Frontend (React/Inertia)
Kompilasi aset front-end untuk mode pengembangan atau bangun bundle mode produksi:
*   **Mode Pengembangan (Pembangunan aset real-time):**
    ```bash
    npm run dev
    ```
*   **Mode Produksi (Optimasi & Bundle Kompresi):**
    ```bash
    npm run build
    ```

### Langkah 9: Jalankan Server Lokal Laravel
Nyalakan server lokal PHP untuk menjalankan aplikasi:
```bash
php artisan serve
```
Aplikasi HRIS Enterprise sekarang siap diakses melalui peramban web Anda di alamat: `http://127.0.0.1:8000`

---

## 🔑 Kredensial Login Default
Setelah database berhasil di-seed (Langkah 6), Anda dapat masuk ke dalam sistem menggunakan akun default berikut:

*   **Akun Administrator (HRD):**
    *   **Email:** `admin@salira.com`
    *   **Password:** `password`
*   **Akun Karyawan (Employee):**
    *   **Email:** `karyawan@salira.com`
    *   **Password:** `password`

---

## 📁 Struktur Direktori Utama Pengujian
*   **Rute Web:** [routes/web.php](file:///d:/web/hris/routes/web.php)
*   **Sistem Payroll:** [Admin/PayrollController.php](file:///d:/web/hris/app/Http/Controllers/Admin/PayrollController.php)
*   **Panel Lembur:** [OvertimeRequestController.php](file:///d:/web/hris/app/Http/Controllers/OvertimeRequestController.php)
*   **Sistem Shift Kerja Karyawan:** [Admin/ShiftController.php](file:///d:/web/hris/app/Http/Controllers/Admin/ShiftController.php)
*   **Tampilan Penggajian (React):** [Pages/Admin/Payrolls/Index.tsx](file:///d:/web/hris/resources/js/Pages/Admin/Payrolls/Index.tsx)
*   **Tampilan Shift Kerja (React):** [Pages/Admin/Shifts/Index.tsx](file:///d:/web/hris/resources/js/Pages/Admin/Shifts/Index.tsx)
*   **Tampilan Lembur Karyawan (React):** [Pages/Overtimes/Index.tsx](file:///d:/web/hris/resources/js/Pages/Overtimes/Index.tsx)

---

## 📄 Lisensi
Sistem HRIS Enterprise ini dilisensikan di bawah lisensi **MIT**. Anda bebas mengembangkan dan menyesuaikannya sesuai dengan kebutuhan internal perusahaan Anda.
