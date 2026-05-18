<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>403 - Akses Ditolak | SALIRA</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=figtree:400,600,800&display=swap" rel="stylesheet" />
    <style>
        body { font-family: 'Figtree', sans-serif; }
        .bg-pattern {
            background-color: #f8fafc;
            background-image: radial-gradient(#cbd5e1 0.5px, transparent 0.5px);
            background-size: 24px 24px;
        }
    </style>
</head>
<body class="bg-pattern min-h-screen flex items-center justify-center p-6">
    <div class="max-w-md w-full text-center space-y-8 animate-fade-in">
        <!-- Icon & Illustration -->
        <div class="relative">
            <div class="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full scale-150 -z-10"></div>
            <div class="mx-auto w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center border border-slate-100 mb-6">
                <svg class="w-12 h-12 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m11 3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
        </div>

        <!-- Text Content -->
        <div class="space-y-4">
            <h1 class="text-6xl font-black text-slate-900 tracking-tighter">403</h1>
            <h2 class="text-2xl font-bold text-slate-800">Akses Ditolak</h2>
            <p class="text-slate-500 text-sm leading-relaxed max-w-[280px] mx-auto">
                Maaf, Anda tidak memiliki izin yang cukup untuk mengakses halaman ini. Silakan hubungi administrator jika Anda merasa ini adalah kesalahan.
            </p>
        </div>

        <!-- Action Button -->
        <div class="pt-6">
            <a href="/dashboard" class="inline-flex items-center justify-center px-8 py-4 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all active:scale-95">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Kembali ke Dashboard
            </a>
        </div>

        <!-- Brand -->
        <div class="pt-8 flex items-center justify-center gap-2 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
            <img src="/images/Salira.png" alt="SALIRA" class="h-5 w-auto">
            <span class="text-sm font-black tracking-widest text-slate-800">SALIRA</span>
        </div>
    </div>

    <style>
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
    </style>
</body>
</html>
