import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { getOfflineQueue, deleteFromOfflineQueue, OfflineAttendance } from '@/utils/offlineStore';
import StatCard from '@/Components/StatCard';
import Card from '@/Components/Card';
import { 
    UserIcon, 
    MapPinIcon,
    CheckCircleIcon,
    ClockIcon,
    CameraIcon,
    ExclamationTriangleIcon,
    ArrowRightOnRectangleIcon,
    ArrowLeftOnRectangleIcon,
    ChartBarIcon,
    CalendarIcon
} from '@heroicons/react/24/outline';
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    Tooltip, 
    PieChart, 
    Pie, 
    Cell, 
    BarChart, 
    Bar, 
    Legend
} from 'recharts';

interface DashboardProps {
    role: 'admin' | 'employee';
    stats?: {
        total_employees: number;
        total_geofences: number;
        present_today: number;
        late_today: number;
        checkout_today: number;
    };
    activeUsers?: any[];
    lastLogins?: any[];
    todayLogs?: any[];
    todayAttendance?: any;
    geofences?: any[];
    recentAttendances?: any[];
    analytics?: {
        attendanceTrend: Array<{ date: string; hadir: number; terlambat: number }>;
        todayDistribution: Array<{ name: string; value: number; color: string }>;
        averageWorkHours: Array<{ name: string; hours: number }>;
    };
    activeShift?: any;
}

export default function Dashboard({ 
    role, 
    stats, 
    activeUsers, 
    lastLogins, 
    todayLogs, 
    todayAttendance, 
    geofences, 
    recentAttendances,
    analytics,
    activeShift
}: DashboardProps) {
    const [offlineQueue, setOfflineQueue] = useState<OfflineAttendance[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [syncSuccess, setSyncSuccess] = useState<boolean>(false);

    // PWA Installation States
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [showInstallGuide, setShowInstallGuide] = useState(false);
    const [hideInstallBanner, setHideInstallBanner] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('hideInstallBanner') === 'true';
        }
        return false;
    });

    useEffect(() => {
        // Detect iOS/iPhone
        const ua = navigator.userAgent;
        const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
        setIsIOS(ios);

        // Detect Standalone/Installed Mode
        const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
        setIsStandalone(standalone);

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            alert("Aplikasi HRIS siap diinstal melalui menu browser Anda (Pilih 'Tambahkan ke Layar Utama' / 'Instal').");
            return;
        }
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    useEffect(() => {
        checkOfflineQueue();
        
        const handleOnline = () => {
            checkOfflineQueue();
        };
        window.addEventListener('online', handleOnline);
        return () => {
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    const checkOfflineQueue = async () => {
        try {
            const queue = await getOfflineQueue();
            setOfflineQueue(queue);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSync = async () => {
        if (offlineQueue.length === 0 || isSyncing) return;
        setIsSyncing(true);
        setSyncError(null);
        setSyncSuccess(false);

        const queueCopy = [...offlineQueue];
        let successCount = 0;

        for (const item of queueCopy) {
            const endpoint = route(item.type === 'check-in' ? 'attendances.check-in' : 'attendances.check-out');
            try {
                await axios.post(endpoint, {
                    latitude: item.latitude,
                    longitude: item.longitude,
                    photo_base64: item.photo_base64,
                    offline_device_time: item.offline_device_time,
                    is_mocked: item.is_mocked,
                    accuracy: item.accuracy,
                }, {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                if (item.id !== undefined) {
                    await deleteFromOfflineQueue(item.id);
                    successCount++;
                }
            } catch (err: any) {
                console.error("Gagal sinkronisasi item:", err);
                const errMsg = err.response?.data?.message || err.message || "Kesalahan jaringan";
                setSyncError(`Sinkronisasi terhenti: ${errMsg}`);
                break;
            }
        }

        await checkOfflineQueue();
        setIsSyncing(false);

        if (successCount > 0) {
            setSyncSuccess(true);
            router.reload({ preserveScroll: true } as any);
            setTimeout(() => setSyncSuccess(false), 5000);
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-xl font-black leading-tight text-slate-800 dark:text-slate-200 tracking-tight">
                        {role === 'admin' ? 'HR Dashboard Overview' : 'Dashboard Karyawan'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        {role === 'admin' 
                            ? 'Pantau kehadiran karyawan dan status lokasi kantor secara real-time' 
                            : 'Catat kehadiran harian Anda dengan verifikasi GPS dan Selfie'}
                    </p>
                </div>
            }
        >
            <Head title="Dashboard" />

            <div className="space-y-6">

                {/* ── SECTION: Offline Sync Banner ── */}
                {offlineQueue.length > 0 && (
                    <div className="bg-gradient-to-r from-amber-500 to-orange-600 dark:from-amber-600 dark:to-orange-700 text-white rounded-2xl p-5 shadow-lg border border-amber-400/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl shrink-0">
                                <ExclamationTriangleIcon className="w-6 h-6 text-amber-100" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold">Data Absensi Offline Terdeteksi</h4>
                                <p className="text-xs text-amber-100/90 mt-0.5">
                                    Terdapat {offlineQueue.length} data absensi lokal yang belum disinkronkan ke server. Silakan kirim data ini sekarang.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="w-full sm:w-auto px-5 py-2.5 bg-white text-orange-700 hover:bg-orange-50 disabled:bg-white/50 disabled:text-orange-700/50 font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
                        >
                            {isSyncing ? (
                                <>
                                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-orange-700 border-t-transparent"></div>
                                    <span>Menyinkronkan...</span>
                                </>
                            ) : (
                                <span>Kirim Data Absensi ({offlineQueue.length})</span>
                            )}
                        </button>
                    </div>
                )}

                {syncSuccess && (
                    <div className="bg-emerald-500 text-white rounded-2xl p-4 shadow-lg flex items-center gap-3">
                        <CheckCircleIcon className="w-6 h-6 shrink-0 text-emerald-100" />
                        <div>
                            <p className="text-sm font-bold">Sinkronisasi Berhasil!</p>
                            <p className="text-xs text-emerald-100">Semua data absensi offline Anda telah sukses diunggah ke server.</p>
                        </div>
                    </div>
                )}

                {syncError && (
                    <div className="bg-rose-500 text-white rounded-2xl p-4 shadow-lg flex items-center gap-3">
                        <ExclamationTriangleIcon className="w-6 h-6 shrink-0 text-rose-100" />
                        <div>
                            <p className="text-sm font-bold">Gagal Sinkronisasi</p>
                            <p className="text-xs text-rose-100">{syncError}</p>
                        </div>
                    </div>
                )}
                
                {/* ── SECTION 1: Welcome Banner ── */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 text-white shadow-2xl shadow-indigo-500/20 isolate">
                    {/* Decorative blobs */}
                    <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-20 -left-16 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6 sm:p-8">
                        <div>
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                <span className="inline-flex items-center px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">
                                    HRIS Geolocation Active
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 rounded-full text-[10px] font-bold uppercase tracking-widest text-emerald-300 border border-emerald-500/20">
                                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                                    Sistem GPS & Kamera Aktif
                                </span>
                            </div>
                            <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mb-2">
                                {role === 'admin' ? 'Monitoring Kehadiran Pegawai' : 'Presensi Kehadiran Geolocation'}
                            </h3>
                            <p className="text-indigo-100/80 text-sm leading-relaxed max-w-xl">
                                {role === 'admin' 
                                    ? 'Memantau radius geofencing kantor, selfie kedatangan, jam kerja terlambat, hingga rekap laporan harian secara instan.' 
                                    : 'Silakan pastikan GPS handphone/browser Anda aktif dan lakukan check-in/out saat berada di zona radius kantor.'}
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 min-w-[200px] items-stretch md:items-end">
                            <Link 
                                href={route('attendances.scanner')} 
                                className="group flex items-center justify-center gap-3 bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold rounded-xl px-5 py-3 shadow-lg shadow-amber-400/20 transition-all duration-200 active:scale-95 text-sm"
                            >
                                <CameraIcon className="w-5 h-5 shrink-0" />
                                <span>Buka Kamera Absen</span>
                            </Link>
                            {!isStandalone && (
                                <button
                                    onClick={() => {
                                        if (isIOS) {
                                            setShowInstallGuide(!showInstallGuide);
                                        } else {
                                            handleInstallClick();
                                        }
                                    }}
                                    className="group flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl px-5 py-3 border border-white/20 transition-all duration-200 active:scale-95 text-sm"
                                >
                                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    <span>{isIOS && showInstallGuide ? "Tutup Petunjuk" : "Instal Aplikasi PWA"}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* iPhone / iOS Safari PWA Installation Instructions */}
                    {isIOS && showInstallGuide && (
                        <div className="relative z-10 mx-4 sm:mx-6 mb-4 sm:mb-6 p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 text-[11px] space-y-2 animate-fade-in text-indigo-50 leading-relaxed">
                            <p className="font-bold text-amber-300 flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Langkah Instalasi PWA di iOS iPhone:
                            </p>
                            <ol className="list-decimal list-inside space-y-1 pl-1">
                                <li>Buka browser <span className="font-bold text-white">Safari</span> di iPhone Anda.</li>
                                <li>Pastikan link: <code className="bg-indigo-900/40 px-1 py-0.5 rounded font-mono text-[9px] text-white">https://hris.konfigin.my.id</code></li>
                                <li>Ketuk tombol <span className="font-bold text-white inline-flex items-center gap-0.5">Bagikan (Share) <svg className="w-3 h-3 inline text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg></span> di menu bawah Safari.</li>
                                <li>Pilih opsi <span className="font-bold text-amber-300">Tambahkan ke Layar Utama</span> (Add to Home Screen).</li>
                                <li>Beri nama aplikasi, lalu klik <span className="font-bold text-amber-350">Tambah</span> (Add) di kanan atas.</li>
                            </ol>
                        </div>
                    )}
                </div>

                {role === 'admin' ? (
                    // ────────────────────────────────────────────────────────
                    // ── ADMIN VIEW ──
                    // ────────────────────────────────────────────────────────
                    <div className="space-y-6">
                        {/* Stats Cards */}
                        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
                            <StatCard 
                                title="Total Karyawan" 
                                value={stats?.total_employees || 0} 
                                icon={<UserIcon className="w-5 h-5" />}
                                colorClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
                            />
                            <StatCard 
                                title="Geofence Aktif" 
                                value={stats?.total_geofences || 0} 
                                icon={<MapPinIcon className="w-5 h-5" />}
                                colorClass="bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                            />
                            <StatCard 
                                title="Hadir Tepat Waktu" 
                                value={stats?.present_today || 0} 
                                icon={<CheckCircleIcon className="w-5 h-5" />}
                                colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                            />
                            <StatCard 
                                title="Terlambat" 
                                value={stats?.late_today || 0} 
                                icon={<ExclamationTriangleIcon className="w-5 h-5" />}
                                colorClass="bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                            />
                            <StatCard 
                                title="Sudah Check-out" 
                                value={stats?.checkout_today || 0} 
                                icon={<ClockIcon className="w-5 h-5" />}
                                colorClass="bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400"
                            />
                        </div>

                        {/* ── FASE 4: VISUAL ANALYTICS DASHBOARD ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Area Chart: Tren Kehadiran */}
                            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700/50">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <ChartBarIcon className="w-5 h-5 text-indigo-500" />
                                            Tren Kehadiran Harian (7 Hari Terakhir)
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Statistik kehadiran tepat waktu vs terlambat</p>
                                    </div>
                                </div>
                                <div className="h-72 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={analytics?.attendanceTrend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorHadir" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorTerlambat" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                            <Legend verticalAlign="top" height={36} iconType="circle" />
                                            <Area name="Tepat Waktu" type="monotone" dataKey="hadir" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorHadir)" />
                                            <Area name="Terlambat" type="monotone" dataKey="terlambat" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorTerlambat)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Pie Chart: Status Hari Ini */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700/50 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Distribusi Presensi Hari Ini
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Pembagian status kehadiran harian</p>
                                </div>
                                <div className="h-56 w-full relative flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={analytics?.todayDistribution || []}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {(analytics?.todayDistribution || []).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute text-center">
                                        <p className="text-2xl font-black text-slate-800 dark:text-white">
                                            {stats?.present_today || 0}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hadir</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
                                    {(analytics?.todayDistribution || []).map((entry, index) => (
                                        <div key={index} className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                            <span className="text-slate-600 dark:text-slate-400 font-semibold">{entry.name} ({entry.value})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Bar Chart: Rata-rata Durasi Kerja */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700/50">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Rata-rata Durasi Kerja Efektif Karyawan
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Rata-rata jam kerja bersih karyawan dalam 10 absensi terakhir (Toleransi Jam Shift)</p>
                            </div>
                            <div className="h-64 w-full mt-6">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analytics?.averageWorkHours || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                        <YAxis name="Jam" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                        <Tooltip formatter={(value) => [`${value} Jam`, 'Durasi Kerja']} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                        <Bar dataKey="hours" radius={[8, 8, 0, 0]}>
                                            {(analytics?.averageWorkHours || []).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#a855f7'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Logs and Online Users Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Today's Live Attendance Feed */}
                            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-slate-200/60 dark:shadow-none border border-slate-100 dark:border-slate-700/50 flex flex-col h-[500px]">
                                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center shrink-0">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Presensi Pegawai Hari Ini</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Log kehadiran masuk & pulang terupdate</p>
                                    </div>
                                    <Link 
                                        href={route('admin.attendances.index')} 
                                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-3 py-1.5 rounded-lg hover:brightness-95 transition-all"
                                    >
                                        Semua Log
                                    </Link>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                    {todayLogs && todayLogs.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead>
                                                    <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                                        <th className="py-2.5 px-3">Pegawai</th>
                                                        <th className="py-2.5 px-3">Status</th>
                                                        <th className="py-2.5 px-3">Check-In</th>
                                                        <th className="py-2.5 px-3">Check-Out</th>
                                                        <th className="py-2.5 px-3 text-center">Selfie</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                                                    {todayLogs.map((log: any) => (
                                                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                                            <td className="py-3 px-3">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500 overflow-hidden">
                                                                        {log.user?.avatar ? (
                                                                            <img src={log.user.avatar} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            log.user?.name?.charAt(0)
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-bold text-slate-800 dark:text-slate-200">{log.user?.name}</p>
                                                                        <p className="text-[10px] text-slate-400">{log.user?.email}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-3">
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                                    log.status === 'hadir' 
                                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400' 
                                                                        : log.status === 'terlambat'
                                                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400'
                                                                        : 'bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400'
                                                                }`}>
                                                                    {log.status}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-3">
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-slate-700 dark:text-slate-300">{log.check_in || '-'}</span>
                                                                    {log.distance_in_meters !== null && (
                                                                        <span className="text-[10px] text-slate-400 font-medium">Jarak: {Math.round(log.distance_in_meters)}m</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-3">
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-slate-700 dark:text-slate-300">{log.check_out || '-'}</span>
                                                                    {log.checkout_distance_in_meters !== null && (
                                                                        <span className="text-[10px] text-slate-400 font-medium">Jarak: {Math.round(log.checkout_distance_in_meters)}m</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-3 text-center">
                                                                <div className="flex justify-center gap-1.5">
                                                                    {log.photo_path ? (
                                                                        <a href={`/storage/${log.photo_path}`} target="_blank" rel="noreferrer" title="Foto Check-In">
                                                                            <img src={`/storage/${log.photo_path}`} className="w-8 h-8 rounded-lg object-cover border border-slate-200 hover:scale-125 transition-transform" />
                                                                        </a>
                                                                    ) : (
                                                                        <span className="text-slate-300">-</span>
                                                                    )}
                                                                    {log.checkout_photo_path && (
                                                                        <a href={`/storage/${log.checkout_photo_path}`} target="_blank" rel="noreferrer" title="Foto Check-Out">
                                                                            <img src={`/storage/${log.checkout_photo_path}`} className="w-8 h-8 rounded-lg object-cover border border-slate-200 hover:scale-125 transition-transform" />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-40">
                                            <ExclamationTriangleIcon className="w-8 h-8 text-slate-400 mb-2" />
                                            <p className="text-xs font-bold">Belum ada presensi pegawai hari ini</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Sidebar Active and Logins */}
                            <div className="flex flex-col gap-6">
                                {/* Active Users Now */}
                                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-slate-200/60 dark:shadow-none border border-slate-100 dark:border-slate-700/50 flex flex-col h-[237px]">
                                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between shrink-0">
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Admin / Karyawan Online</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Sedang online sekarang</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950 rounded-full border border-emerald-200 dark:border-emerald-800 shrink-0">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                            </span>
                                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">LIVE</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
                                        {activeUsers && activeUsers.length > 0 ? activeUsers.map((user: any) => (
                                            <div key={user.id} className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-slate-700 flex items-center justify-center font-bold text-indigo-600 text-xs shrink-0 overflow-hidden">
                                                    {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : user.name.charAt(0)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{user.name}</p>
                                                    <p className="text-[10px] text-slate-400 capitalize">{user.role === 'admin' ? 'HR Admin' : 'Karyawan'}</p>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="h-full flex items-center justify-center text-slate-400 text-xs py-8">Tidak ada user online</div>
                                        )}
                                    </div>
                                </div>

                                {/* Last Logins Audit */}
                                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-slate-200/60 dark:shadow-none border border-slate-100 dark:border-slate-700/50 flex flex-col h-[237px]">
                                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 shrink-0">
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Akses Login Terakhir</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Log aktivitas login terbaru</p>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
                                        {lastLogins && lastLogins.map((user: any) => (
                                            <div key={user.id} className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 text-xs shrink-0 overflow-hidden">
                                                    {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : user.name.charAt(0)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{user.name}</p>
                                                    <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold">{user.time_ago}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // ────────────────────────────────────────────────────────
                    // ── EMPLOYEE VIEW ──
                    // ────────────────────────────────────────────────────────
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Attendance Today Checklist */}
                        <div className="lg:col-span-2 space-y-6">
                            


                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700/50 p-6">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Status Absensi Hari Ini</h3>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Check-In Card */}
                                    <div className="border border-slate-100 dark:border-slate-700/60 rounded-xl p-4 flex items-start gap-4">
                                        <div className={`p-3 rounded-xl shrink-0 ${
                                            todayAttendance ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' : 'bg-orange-50 dark:bg-orange-950/40 text-orange-600'
                                        }`}>
                                            <ArrowLeftOnRectangleIcon className="w-6 h-6" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">CHECK-IN (MASUK)</h4>
                                            {todayAttendance ? (
                                                <div className="mt-1">
                                                    <p className="text-lg font-black text-slate-800 dark:text-slate-200">{todayAttendance.check_in}</p>
                                                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                                        todayAttendance.status === 'hadir' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400'
                                                    }`}>
                                                        {todayAttendance.status === 'hadir' ? 'Tepat Waktu' : 'Terlambat'}
                                                    </span>
                                                </div>
                                            ) : (
                                                <p className="text-sm font-bold text-orange-500 mt-1">Belum Melakukan Absen</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Check-Out Card */}
                                    <div className="border border-slate-100 dark:border-slate-700/60 rounded-xl p-4 flex items-start gap-4">
                                        <div className={`p-3 rounded-xl shrink-0 ${
                                            todayAttendance?.check_out ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-600' : 'bg-slate-50 dark:bg-slate-700/40 text-slate-400'
                                        }`}>
                                            <ArrowRightOnRectangleIcon className="w-6 h-6" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">CHECK-OUT (PULANG)</h4>
                                            {todayAttendance?.check_out ? (
                                                <div className="mt-1">
                                                    <p className="text-lg font-black text-slate-800 dark:text-slate-200">{todayAttendance.check_out}</p>
                                                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-400 uppercase tracking-wider">Sudah Pulang</span>
                                                </div>
                                            ) : todayAttendance ? (
                                                <p className="text-sm font-bold text-slate-500 mt-1">Belum Absen Pulang</p>
                                            ) : (
                                                <p className="text-sm font-medium text-slate-400 mt-1">Check-in terlebih dahulu</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── SECTION: Active Shift Card ── */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700/50 p-6 flex flex-col">
                                <div className="flex items-center gap-3 mb-4 shrink-0">
                                    <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-xl">
                                        <ClockIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Shift Aktif Hari Ini</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Informasi jam kerja Anda</p>
                                    </div>
                                </div>

                                {activeShift ? (
                                    <div className="space-y-4">
                                        <div className="bg-slate-50 dark:bg-slate-700/25 rounded-xl p-4 space-y-3 border border-slate-100 dark:border-slate-700/40">
                                            <div className="flex justify-between items-start gap-2">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Nama Shift</p>
                                                    <p className="text-base font-black text-slate-800 dark:text-slate-200 mt-0.5 leading-tight">{activeShift.name}</p>
                                                </div>
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 uppercase tracking-wider">
                                                    {activeShift.code}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/40">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Jam Masuk</p>
                                                    <p className="text-xs font-black text-slate-750 dark:text-slate-300 mt-0.5">
                                                        {activeShift.start_time ? activeShift.start_time.substring(0, 5) : '-'} WIB
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Jam Pulang</p>
                                                    <p className="text-xs font-black text-slate-750 dark:text-slate-300 mt-0.5">
                                                        {activeShift.end_time ? activeShift.end_time.substring(0, 5) : '-'} WIB
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-100/40 dark:border-indigo-950/50">
                                            <CalendarIcon className="w-4 h-4 text-indigo-555 dark:text-indigo-400 shrink-0 mt-0.5" />
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">Masa Berlaku Shift</p>
                                                <p className="text-[10px] mt-0.5 text-slate-500 dark:text-slate-400 leading-normal font-medium">
                                                    {activeShift.pivot?.start_date ? new Date(activeShift.pivot.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'} s/d {activeShift.pivot?.end_date ? new Date(activeShift.pivot.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Seterusnya'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border border-dashed border-amber-200 dark:border-amber-900/40 rounded-xl p-5 text-center bg-amber-50/30 dark:bg-amber-950/10 space-y-2">
                                        <ExclamationTriangleIcon className="w-8 h-8 text-amber-500 mx-auto animate-pulse" />
                                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Belum Ada Shift Aktif</h4>
                                        <p className="text-[11px] text-slate-550 dark:text-slate-400 leading-relaxed font-medium">
                                            Jadwal shift Anda belum terdaftar hari ini. Silakan hubungi Admin atau HRD untuk pengaturan penugasan shift Anda.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Personal History of last 5 days */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700/50 overflow-hidden flex flex-col">
                                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Riwayat Kehadiran Terbaru</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Log kehadiran 5 hari kerja terakhir Anda</p>
                                </div>
                                <div className="p-4 overflow-x-auto">
                                    {recentAttendances && recentAttendances.length > 0 ? (
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                                    <th className="py-2 px-3">Tanggal</th>
                                                    <th className="py-2 px-3">Status</th>
                                                    <th className="py-2 px-3">Masuk</th>
                                                    <th className="py-2 px-3">Pulang</th>
                                                    <th className="py-2 px-3">Keterangan</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                                                {recentAttendances.map((item: any) => (
                                                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                                        <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">
                                                            {new Date(item.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                                                item.status === 'hadir' 
                                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                            }`}>
                                                                {item.status}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-3 font-bold text-slate-700 dark:text-slate-300">{item.check_in || '-'}</td>
                                                        <td className="py-3 px-3 font-bold text-slate-700 dark:text-slate-300">{item.check_out || '-'}</td>
                                                        <td className="py-3 px-3 text-slate-500 max-w-[120px] truncate">{item.notes || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="text-center py-6 text-slate-400 font-medium">Belum ada riwayat presensi terekam</div>
                                    )}
                                </div>
                            </div>
                        </div>


                        {/* Authorized Geofences Locations */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700/50 p-6 flex flex-col h-fit">
                            <div className="flex items-center gap-3 mb-4 shrink-0">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-xl">
                                    <MapPinIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Lokasi Kantor Resmi</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Lokasi presensi geofence aktif</p>
                                </div>
                            </div>

                            <div className="space-y-4 overflow-y-auto max-h-[360px] custom-scrollbar">
                                {geofences && geofences.length > 0 ? geofences.map((office: any) => (
                                    <div key={office.id} className="border border-slate-100 dark:border-slate-700/50 rounded-xl p-4 space-y-2 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-all">
                                        <div className="flex justify-between items-center">
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{office.name}</p>
                                            <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full">{office.radius}m Radius</span>
                                        </div>
                                        <div className="text-xs text-slate-400 space-y-1">
                                            <p className="flex items-center gap-1.5"><span className="font-bold">Lat:</span> {office.latitude}</p>
                                            <p className="flex items-center gap-1.5"><span className="font-bold">Lng:</span> {office.longitude}</p>
                                            {office.work_start_time && (
                                                <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-1 mt-1">
                                                    <ClockIcon className="w-3.5 h-3.5" />
                                                    <span>Jam Kerja: {office.work_start_time} - {office.work_end_time || 'Selesai'}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-6 text-slate-400 font-medium">Belum ada lokasi kantor aktif</div>
                                )}
                            </div>
                        </div>

                    </div>
                )}

            </div>
        </AuthenticatedLayout>
    );
}
