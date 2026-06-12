import { PageProps } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import React, { useState, useEffect, useRef } from 'react';
import { 
    TruckIcon, 
    MapPinIcon, 
    PaperAirplaneIcon, 
    ArrowPathIcon,
    ExclamationCircleIcon,
    ArrowLeftIcon,
    CameraIcon,
    CheckCircleIcon,
    CalendarIcon
} from '@heroicons/react/24/outline';

interface ShipmentLog {
    id: number;
    status: string;
    title: string;
    description: string;
    latitude: number | null;
    longitude: number | null;
    photo_path: string | null;
    created_at: string;
}

interface Shipment {
    id: number;
    tracking_number: string;
    title: string;
    origin_name: string;
    destination_name: string;
    status: string;
    courier_lat: number | null;
    courier_lng: number | null;
    logs: ShipmentLog[];
}

export default function CourierShow({ auth, shipment }: PageProps<{ shipment: Shipment }>) {
    const [lat, setLat] = useState<number | null>(shipment.courier_lat);
    const [lng, setLng] = useState<number | null>(shipment.courier_lng);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [autoTrack, setAutoTrack] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [checkpointPreview, setCheckpointPreview] = useState<string | null>(null);
    const [viewerPhoto, setViewerPhoto] = useState<{
        url: string;
        title: string;
        time: string;
        gps: string | null;
    } | null>(null);
    const intervalRef = useRef<any>(null);

    const { data, setData, post, processing, errors } = useForm({
        delivery_photo: null as File | null,
        latitude: '',
        longitude: '',
    });

    const checkpointForm = useForm({
        photo: null as File | null,
        latitude: '',
        longitude: '',
        description: '',
    });

    const logMessage = (msg: string) => {
        const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 19)]);
    };

    // Geolocation API fetcher
    const updateLocation = (callback?: (latitude: number, longitude: number) => void) => {
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

                // Auto update form values
                setData(prev => ({
                    ...prev,
                    latitude: String(newLat),
                    longitude: String(newLng)
                }));

                logMessage(`GPS didapatkan: ${newLat.toFixed(6)}, ${newLng.toFixed(6)}`);

                // Send coordinate update to backend
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
                .then(resData => {
                    if (resData.success) {
                        logMessage("Posisi Truk Terpancar ke Peta!");
                        if (callback) callback(newLat, newLng);
                    }
                })
                .catch(err => {
                    logMessage(`Gagal kirim ke server: ${err.message}`);
                    if (callback) callback(newLat, newLng);
                });
            },
            (err) => {
                setGpsLoading(false);
                let message = "Gagal mengambil koordinat GPS.";
                if (err.code === 1) message = "Akses lokasi ditolak. Harap izinkan akses GPS.";
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
            logMessage("Auto-Track AKTIF (Perbarui GPS tiap 30 detik)");
            updateLocation();
            
            intervalRef.current = setInterval(() => {
                updateLocation();
            }, 30000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                logMessage("Auto-Track dinonaktifkan.");
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [autoTrack]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setData('delivery_photo', file);
            setPreviewUrl(URL.createObjectURL(file));
            
            // Instantly try to get location when photo is selected to guarantee precision coordinate binding!
            logMessage("Foto terpilih. Mendeteksi titik GPS presisi saat ini...");
            updateLocation();
        }
    };

    const handleCheckpointFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            checkpointForm.setData('photo', file);
            setCheckpointPreview(URL.createObjectURL(file));
            
            logMessage("Foto checkpoint terpilih. Mendeteksi lokasi GPS...");
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        checkpointForm.setData(prev => ({
                            ...prev,
                            latitude: String(position.coords.latitude),
                            longitude: String(position.coords.longitude)
                        }));
                        logMessage(`GPS Checkpoint: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
                    },
                    () => {
                        logMessage("Gagal mendeteksi lokasi checkpoint. Pastikan GPS aktif.");
                    },
                    { enableHighAccuracy: true }
                );
            }
        }
    };

    const submitCheckpoint = (e: React.FormEvent) => {
        e.preventDefault();
        if (!checkpointForm.data.photo) {
            alert("Harap ambil atau pilih foto checkpoint terlebih dahulu!");
            return;
        }

        checkpointForm.post(route('courier.shipments.checkpoint', shipment.id), {
            preserveScroll: true,
            onSuccess: () => {
                setCheckpointPreview(null);
                checkpointForm.reset();
                logMessage("Foto checkpoint berhasil disimpan!");
            }
        });
    };

    const submitDelivery = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!data.delivery_photo) {
            alert("Harap pilih atau ambil bukti foto terlebih dahulu!");
            return;
        }

        // Final coordinate verification
        if (!data.latitude || !data.longitude) {
            logMessage("GPS belum terdeteksi. Mencoba menembak GPS terakhir kali...");
            updateLocation((latitude, longitude) => {
                post(route('courier.shipments.deliver', shipment.id));
            });
        } else {
            post(route('courier.shipments.deliver', shipment.id));
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center space-x-2">
                    <Link href={route('courier.shipments.index')} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </Link>
                    <span className="font-semibold text-xl text-slate-800 dark:text-slate-200 leading-tight">Navigator Tugas Kurir</span>
                </div>
            }
        >
            <Head title={`Navigator Tugas ${shipment.tracking_number}`} />

            <div className="py-6 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* COL 1: GPS BROADCASTER & AUTOTRACK (LEFT) */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm p-6 space-y-5 text-center">
                        <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/40 rounded-full flex items-center justify-center mx-auto text-indigo-500">
                            <TruckIcon className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white">Pemancar Posisi Live</h2>
                            <p className="text-xs text-slate-400">Aktifkan pemancar saat berkendara agar pembeli dapat melihat rute truk Anda secara langsung.</p>
                        </div>

                        {/* LIVE COORDINATE VIEW */}
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                            <div className="text-[10px] text-slate-400 font-bold uppercase">Koordinat Terpancar</div>
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

                        {/* BIG BROADCAST TRIGGER */}
                        <button
                            onClick={() => updateLocation()}
                            disabled={gpsLoading}
                            className={`w-full py-3.5 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center space-x-2 ${
                                gpsLoading 
                                    ? 'bg-indigo-400 cursor-not-allowed' 
                                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                            }`}
                        >
                            <PaperAirplaneIcon className={`w-5 h-5 ${gpsLoading ? 'animate-bounce' : ''}`} />
                            <span>{gpsLoading ? 'Menembak GPS...' : 'Pancarkan Posisi GPS'}</span>
                        </button>

                        {/* AUTO TRACKING TOGGLE */}
                        <div className="flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="text-left">
                                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">Mode Auto-Drive</h4>
                                <p className="text-[10px] text-slate-400">Perbarui posisi otomatis tiap 30 detik saat mengemudi.</p>
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
                    </div>

                    {/* BROADCAST GPS LOGS */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm p-5 space-y-4">
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Log Pancaran GPS</h3>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto font-mono text-[10px] text-slate-500 dark:text-slate-400">
                            {logs.map((log, i) => (
                                <div key={i} className="py-1 border-b border-slate-50 dark:border-slate-700/40 last:border-0">{log}</div>
                            ))}
                            {logs.length === 0 && <div className="text-center italic py-4 text-slate-300">Belum ada aktivitas pemancaran.</div>}
                        </div>
                    </div>
                </div>

                {/* COL 2: CHECKPOINT PHOTO & FINAL PROOF (RIGHT) */}
                <div className="space-y-6">
                    {/* Checkpoint Photo Card */}
                    {shipment.status !== 'delivered' && shipment.status !== 'failed' && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm p-6 space-y-4">
                            <div className="flex items-center space-x-2 text-slate-900 dark:text-white">
                                <CameraIcon className="w-6 h-6 text-indigo-500" />
                                <h3 className="text-lg font-black">Foto Checkpoint Rute</h3>
                            </div>
                            <p className="text-xs text-slate-400">Unggah foto checkpoint kondisi perjalanan Anda untuk menandai rute Anda secara real-time.</p>

                            <form onSubmit={submitCheckpoint} className="space-y-4">
                                <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[160px] bg-slate-50/50 dark:bg-slate-900/30 overflow-hidden">
                                    {checkpointPreview ? (
                                        <div className="relative w-full h-full flex flex-col items-center">
                                            <img 
                                                src={checkpointPreview} 
                                                alt="Preview Checkpoint" 
                                                className="max-h-[120px] w-auto object-contain rounded-xl border border-slate-100 dark:border-slate-800 shadow" 
                                            />
                                            <button
                                                type="button"
                                                onClick={() => { setCheckpointPreview(null); checkpointForm.setData('photo', null); }}
                                                className="mt-2 text-xs text-rose-500 font-bold hover:underline"
                                            >
                                                Hapus & Ambil Ulang
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer flex flex-col items-center space-y-2 text-center p-4 w-full">
                                            <CameraIcon className="w-8 h-8 text-indigo-500 animate-pulse" />
                                            <div>
                                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">Ambil / Pilih Foto Checkpoint</span>
                                                <p className="text-[10px] text-slate-400 mt-1">Gunakan Kamera HP langsung di jalan</p>
                                            </div>
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                capture="environment"
                                                onChange={handleCheckpointFileChange}
                                                required
                                                className="hidden" 
                                            />
                                        </label>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Keterangan / Deskripsi Checkpoint</label>
                                    <input
                                        type="text"
                                        value={checkpointForm.data.description}
                                        onChange={e => checkpointForm.setData('description', e.target.value)}
                                        placeholder="Contoh: Bongkar muat paket / macet / cuaca buruk"
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-xs dark:text-white"
                                    />
                                    {checkpointForm.errors.description && <p className="text-rose-500 text-[10px] mt-1">{checkpointForm.errors.description}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <div>Lat Checkpoint: {checkpointForm.data.latitude || 'Mencari GPS...'}</div>
                                    <div>Lng Checkpoint: {checkpointForm.data.longitude || 'Mencari GPS...'}</div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={checkpointForm.processing}
                                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {checkpointForm.processing ? 'Mengirim Checkpoint...' : 'Kirim Foto Checkpoint'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Bukti Foto Kedatangan Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm p-6 space-y-5">
                        <div className="flex items-center space-x-2 text-slate-900 dark:text-white">
                            <CheckCircleIcon className="w-6 h-6 text-emerald-500" />
                            <h3 className="text-lg font-black">Bukti Foto Kedatangan (POD)</h3>
                        </div>
                        <p className="text-xs text-slate-400">Ambil foto atau pilih file gambar dari perangkat Anda saat paket pengisian stok telah sampai di cabang tujuan.</p>

                        <form onSubmit={submitDelivery} className="space-y-4">
                            
                            {/* PHOTO PICKER OR PREVIEW */}
                            <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[200px] bg-slate-50/50 dark:bg-slate-900/30 overflow-hidden">
                                {previewUrl ? (
                                    <div className="relative w-full h-full flex flex-col items-center">
                                        <img 
                                            src={previewUrl} 
                                            alt="Preview Bukti" 
                                            className="max-h-[160px] w-auto object-contain rounded-xl border border-slate-100 dark:border-slate-800 shadow" 
                                        />
                                        <button
                                            type="button"
                                            onClick={() => { setPreviewUrl(null); setData('delivery_photo', null); }}
                                            className="mt-2 text-xs text-rose-500 font-bold hover:underline"
                                        >
                                            Hapus & Ambil Ulang Foto
                                        </button>
                                    </div>
                                ) : (
                                    <label className="cursor-pointer flex flex-col items-center space-y-2 text-center p-6 w-full">
                                        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-full">
                                            <CameraIcon className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">Ambil / Pilih Gambar Bukti</span>
                                            <p className="text-[10px] text-slate-400 mt-1">Mendukung kamera HP langsung maupun file galeri (Max 5MB)</p>
                                        </div>
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            capture="environment"
                                            onChange={handleFileChange}
                                            required
                                            className="hidden" 
                                        />
                                    </label>
                                )}
                            </div>
                            {errors.delivery_photo && <p className="text-rose-500 text-xs mt-1">{errors.delivery_photo}</p>}

                            {/* COORDINATES BINDING FLAGS */}
                            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div>Lat Checkpoint: {data.latitude || 'Mencari...'}</div>
                                <div>Lng Checkpoint: {data.longitude || 'Mencari...'}</div>
                            </div>

                            {/* SUBMIT BUTTON */}
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50"
                            >
                                <CheckCircleIcon className="w-5 h-5" />
                                <span>{processing ? 'Mengirim Data...' : 'Konfirmasi Sampai (Kirim Bukti)'}</span>
                            </button>

                        </form>
                    </div>
                </div>

            </div>

            {/* Timeline History Section */}
            <div className="py-4 max-w-4xl mx-auto px-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm p-6">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6">Timeline Perjalanan & Foto Checkpoint</h3>
                    
                    <div className="relative border-l border-slate-200 dark:border-slate-700 ml-4 space-y-8">
                        {shipment.logs && shipment.logs.map((log, index) => {
                            const isLatest = index === shipment.logs.length - 1;
                            return (
                                <div key={log.id} className="relative pl-8">
                                    {/* Circular Bullet */}
                                    <span className={`absolute -left-3 top-1 flex items-center justify-center w-6 h-6 rounded-full border-2 ${
                                        isLatest 
                                            ? 'bg-indigo-600 text-white border-indigo-200 animate-ping-once' 
                                            : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-700 dark:border-slate-600'
                                    }`}>
                                        <div className={`w-2.5 h-2.5 rounded-full ${isLatest ? 'bg-white' : 'bg-slate-400'}`} />
                                    </span>
                                    
                                    <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-start">
                                        <div className="flex-1">
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 mb-2">
                                                <h4 className={`text-sm font-black ${isLatest ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-300'}`}>
                                                    {log.title}
                                                </h4>
                                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                    <CalendarIcon className="w-3 h-3" />
                                                    {new Date(log.created_at).toLocaleString('id-ID', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{log.description}</p>
                                            {log.latitude && (
                                                <div className="text-[9px] font-mono text-slate-400 mt-2">
                                                    GPS Checkpoint: {log.latitude}, {log.longitude}
                                                </div>
                                            )}
                                        </div>

                                        {log.photo_path && (
                                            <div 
                                                onClick={() => setViewerPhoto({
                                                    url: `/storage/${log.photo_path}`,
                                                    title: log.title,
                                                    time: new Date(log.created_at).toLocaleString('id-ID', {day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'}),
                                                    gps: log.latitude && log.longitude ? `${log.latitude}, ${log.longitude}` : null
                                                })}
                                                className="relative w-32 h-24 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 flex-shrink-0 cursor-pointer active:scale-95 transition-all shadow-sm"
                                            >
                                                <img 
                                                    src={`/storage/${log.photo_path}`} 
                                                    alt="Foto Checkpoint" 
                                                    className="w-full h-full object-cover" 
                                                />
                                                <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                    <span className="text-[10px] text-white font-bold bg-indigo-600/90 backdrop-blur-sm px-2.5 py-1.5 rounded-lg">🔍 Tinjau</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Glassmorphic Photo Zoom Modal */}
            {viewerPhoto && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
                    onClick={() => setViewerPhoto(null)}
                >
                    <div 
                        className="relative bg-white dark:bg-slate-800 rounded-2xl p-4 max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-700/60"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-3 border-b dark:border-slate-700 pb-2">
                            <h3 className="font-black text-slate-855 dark:text-white text-sm">{viewerPhoto.title}</h3>
                            <button 
                                onClick={() => setViewerPhoto(null)} 
                                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-900/50 flex-1 flex items-center justify-center">
                            <img src={viewerPhoto.url} alt="Checkpoint" className="max-h-[60vh] w-auto object-contain rounded-xl" />
                            <div className="absolute bottom-0 left-0 right-0 bg-slate-950/85 backdrop-blur-md text-white p-3.5 text-[10px] space-y-0.5 border-t border-white/10 select-none text-left">
                                <p className="font-extrabold text-indigo-400 tracking-wider">📸 LIVE PHOTO CHECKPOINT</p>
                                <p>👤 <b>Kurir:</b> {auth.user.name}</p>
                                <p>📅 <b>Waktu:</b> {viewerPhoto.time} WIB</p>
                                {viewerPhoto.gps && <p>📍 <b>GPS:</b> {viewerPhoto.gps}</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
