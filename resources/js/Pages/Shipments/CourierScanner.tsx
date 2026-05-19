import { PageProps } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import React, { useState, useEffect, useRef } from 'react';
import { 
    TruckIcon, 
    MapPinIcon, 
    PaperAirplaneIcon, 
    ArrowPathIcon,
    ExclamationCircleIcon,
    ArrowLeftIcon
} from '@heroicons/react/24/outline';

interface Shipment {
    id: number;
    tracking_number: string;
    title: string;
    origin_name: string;
    destination_name: string;
    status: string;
    courier_lat: number | null;
    courier_lng: number | null;
}

export default function CourierScanner({ auth, shipment }: PageProps<{ shipment: Shipment }>) {
    const [lat, setLat] = useState<number | null>(shipment.courier_lat);
    const [lng, setLng] = useState<number | null>(shipment.courier_lng);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [autoTrack, setAutoTrack] = useState(false);
    const intervalRef = useRef<any>(null);

    const logMessage = (msg: string) => {
        const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 19)]);
    };

    const updateLocation = () => {
        if (!navigator.geolocation) {
            setErrorMsg("Browser Anda tidak mendukung Geolocation API.");
            logMessage("Error: Geolocation tidak didukung.");
            return;
        }

        setGpsLoading(true);
        setErrorMsg(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const newLat = position.coords.latitude;
                const newLng = position.coords.longitude;
                setLat(newLat);
                setLng(newLng);
                setGpsLoading(false);

                logMessage(`GPS didapatkan: ${newLat.toFixed(6)}, ${newLng.toFixed(6)}`);

                // Send coordinate update to backend via Fetch API
                fetch(route('shipments.update-gps', shipment.id), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || ''
                    },
                    body: JSON.stringify({
                        latitude: newLat,
                        longitude: newLng
                    })
                })
                .then(response => {
                    if (!response.ok) throw new Error("HTTP error " + response.status);
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        logMessage("Peta Live KIR Berhasil Ter-Update!");
                    } else {
                        logMessage("Gagal sinkronisasi data ke server.");
                    }
                })
                .catch(err => {
                    logMessage(`Gagal kirim ke server: ${err.message}`);
                });
            },
            (err) => {
                setGpsLoading(false);
                let message = "Gagal mengambil koordinat GPS.";
                if (err.code === 1) message = "Akses lokasi ditolak oleh browser/pengguna.";
                else if (err.code === 2) message = "Posisi GPS tidak dapat dideteksi.";
                else if (err.code === 3) message = "Waktu tunggu GPS habis (Timeout).";
                
                setErrorMsg(message);
                logMessage(`GPS Error: ${message}`);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    // Auto tracking hook
    useEffect(() => {
        if (autoTrack) {
            logMessage("Mode Auto-Track AKTIF (Interval: 30 detik)");
            // Trigger immediately
            updateLocation();
            
            intervalRef.current = setInterval(() => {
                updateLocation();
            }, 30000); // 30 seconds
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                logMessage("Mode Auto-Track dinonaktifkan.");
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [autoTrack]);

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center space-x-2">
                    <Link href={route('admin.shipments.index')} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </Link>
                    <span className="font-semibold text-xl text-slate-800 dark:text-slate-200 leading-tight">Broadcaster GPS Kurir</span>
                </div>
            }
        >
            <Head title={`Broadcaster GPS ${shipment.tracking_number}`} />

            <div className="py-6 max-w-md mx-auto space-y-6">
                
                {/* INSTRUCTIONS CARD */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm p-6 text-center space-y-4">
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 rounded-full flex items-center justify-center mx-auto text-indigo-500">
                        <TruckIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">Broadcaster GPS Kurir</h2>
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1 rounded-full text-xs mt-1 inline-block">
                            {shipment.tracking_number}
                        </span>
                    </div>

                    <div className="border-t border-b border-slate-100 dark:border-slate-700 py-3 text-left space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <p><b>Barang:</b> {shipment.title}</p>
                        <p><b>Rute:</b> {shipment.origin_name.split(' ')[0]} &rarr; {shipment.destination_name.split(' ')[0]}</p>
                        <p><b>Status:</b> <span className="font-bold text-indigo-600 uppercase">{shipment.status}</span></p>
                    </div>

                    {/* LIVE LATITUDE/LONGITUDE CARD */}
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl text-center">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Koordinat Terpancar</div>
                        <div className="text-sm font-mono font-bold text-slate-800 dark:text-slate-100 mt-1">
                            {lat && lng ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : 'Menunggu pemicu GPS...'}
                        </div>
                    </div>

                    {errorMsg && (
                        <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3.5 rounded-xl text-xs flex items-center space-x-2 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-400">
                            <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
                            <span className="text-left font-semibold">{errorMsg}</span>
                        </div>
                    )}

                    {/* BIG TRIGGER BUTTON */}
                    <button
                        onClick={updateLocation}
                        disabled={gpsLoading}
                        className={`w-full py-4 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center space-x-2 ${
                            gpsLoading 
                                ? 'bg-indigo-400 cursor-not-allowed' 
                                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                        }`}
                    >
                        <PaperAirplaneIcon className={`w-5 h-5 ${gpsLoading ? 'animate-bounce' : ''}`} />
                        <span>{gpsLoading ? 'Memancarkan Lokasi GPS...' : 'Pancarkan GPS Sekarang'}</span>
                    </button>

                    {/* AUTO TRACKING TOGGLE */}
                    <div className="flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="text-left">
                            <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">Mode Auto-Drive</h4>
                            <p className="text-[10px] text-slate-400">Perbarui peta otomatis tiap 30 detik saat berkendara.</p>
                        </div>
                        
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={autoTrack}
                                onChange={e => setAutoTrack(e.target.checked)}
                                className="sr-only peer cursor-pointer" 
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    <Link 
                        href={route('shipments.track', shipment.tracking_number)} 
                        target="_blank"
                        className="text-xs text-indigo-500 font-bold block hover:underline"
                    >
                        Lihat Peta KIR Hasil Pancaran &rarr;
                    </Link>

                </div>

                {/* BROADCAST LOGS LIST */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm p-5 space-y-4">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Log Pancaran GPS</h3>
                    
                    <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-[10px] text-slate-500 dark:text-slate-400">
                        {logs.map((log, i) => (
                            <div key={i} className="py-1 border-b border-slate-50 dark:border-slate-700/40 last:border-0">
                                {log}
                            </div>
                        ))}
                        {logs.length === 0 && (
                            <div className="text-center italic py-4 text-slate-300 dark:text-slate-600">
                                Belum ada log pemancaran GPS.
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </AuthenticatedLayout>
    );
}
