import { PageProps } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import React, { useState, useEffect, useRef } from 'react';
import { 
    MapIcon, 
    ArrowPathIcon,
    TruckIcon,
    EnvelopeIcon,
    ClockIcon,
    SignalIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';

interface Driver {
    id: number;
    name: string;
    email: string;
    lat: number | null;
    lng: number | null;
    is_sharing: boolean;
    is_online: boolean;
    last_updated: string;
}

export default function DriverMonitor({ auth }: PageProps) {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [leafletReady, setLeafletReady] = useState(false);
    const [activeDriverId, setActiveDriverId] = useState<number | null>(null);

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markersRef = useRef<{ [key: number]: any }>({});

    // Load Leaflet css & js dynamically
    useEffect(() => {
        if (typeof window === 'undefined') return;

        if (!document.getElementById('leaflet-css')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css';
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }

        if (!document.getElementById('leaflet-js')) {
            const script = document.createElement('script');
            script.id = 'leaflet-js';
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => {
                setLeafletReady(true);
            };
            document.body.appendChild(script);
        } else {
            setLeafletReady(true);
        }
    }, []);

    // Initialize Map
    useEffect(() => {
        if (!leafletReady || !mapContainerRef.current) return;

        const L = (window as any).L;
        if (!L) return;

        // Clean up previous map
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }

        // Default: Center of Indonesia/Jakarta
        const defaultLat = -6.2088;
        const defaultLng = 106.8456;

        const map = L.map(mapContainerRef.current).setView([defaultLat, defaultLng], 10);
        mapRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [leafletReady]);

    // Fetch active drivers GPS
    const fetchDrivers = () => {
        fetch(route('admin.active-drivers'))
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setDrivers(data.drivers);
                    updateMapMarkers(data.drivers);
                }
            })
            .catch(err => console.error("Gagal memuat koordinat driver:", err))
            .finally(() => setLoading(false));
    };

    // Initial fetch & loop pooling (every 15s)
    useEffect(() => {
        fetchDrivers();
        const timer = setInterval(() => {
            fetchDrivers();
        }, 15000);

        return () => clearInterval(timer);
    }, [leafletReady]);

    // Update markers on the map
    const updateMapMarkers = (driversList: Driver[]) => {
        const L = (window as any).L;
        const map = mapRef.current;
        if (!L || !map) return;

        driversList.forEach(driver => {
            const hasCoords = driver.lat !== null && driver.lng !== null;
            
            if (hasCoords) {
                const lat = Number(driver.lat);
                const lng = Number(driver.lng);

                // Driver custom icon
                const customIcon = L.divIcon({
                    html: `
                        <div class="relative flex items-center justify-center p-2 rounded-full border-2 border-white shadow-xl transition-all duration-300 ${
                            driver.is_online 
                                ? 'bg-emerald-500 ring-4 ring-emerald-500/20 scale-110 animate-pulse' 
                                : 'bg-slate-400 scale-95'
                        }">
                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h2.586a1 1 0 00.707-.293l1.414-1.414a1 1 0 00.293-.707V16"></path>
                            </svg>
                            <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 dark:bg-slate-950/90 text-white font-black text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap border border-slate-700/80 shadow-md">
                                ${driver.name.split(' ')[0]}
                            </div>
                        </div>
                    `,
                    className: '',
                    iconSize: [36, 36],
                    iconAnchor: [18, 18]
                });

                if (markersRef.current[driver.id]) {
                    // Update existing marker
                    markersRef.current[driver.id].setLatLng([lat, lng]);
                    markersRef.current[driver.id].setIcon(customIcon);
                } else {
                    // Create new marker
                    const marker = L.marker([lat, lng], { icon: customIcon })
                        .addTo(map)
                        .bindPopup(`
                            <div class="p-1 font-sans">
                                <h4 class="font-black text-sm text-slate-900 mb-0.5">${driver.name}</h4>
                                <p class="text-xs text-slate-500 mb-2">${driver.email}</p>
                                <div class="text-[10px] space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    <div><b>Status:</b> ${driver.is_online ? '🟢 Online (Melacak)' : '🔴 Offline / Berhenti'}</div>
                                    <div><b>Koordinat:</b> ${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
                                    <div><b>Update:</b> ${driver.last_updated}</div>
                                </div>
                            </div>
                        `);
                    markersRef.current[driver.id] = marker;
                }
            } else {
                // If coordinates removed, remove from map
                if (markersRef.current[driver.id]) {
                    markersRef.current[driver.id].remove();
                    delete markersRef.current[driver.id];
                }
            }
        });
    };

    // Pan/Zoom to driver
    const flyToDriver = (driver: Driver) => {
        if (!mapRef.current || driver.lat === null || driver.lng === null) return;
        
        setActiveDriverId(driver.id);
        mapRef.current.setView([Number(driver.lat), Number(driver.lng)], 15);
        
        if (markersRef.current[driver.id]) {
            markersRef.current[driver.id].openPopup();
        }
    };

    const onlineDrivers = drivers.filter(d => d.is_online);
    const offlineDrivers = drivers.filter(d => !d.is_online);

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-slate-800 dark:text-slate-200 leading-tight">Live Fleet Monitoring</h2>}
        >
            <Head title="Live Monitor Driver" />

            <div className="py-6 max-w-7xl mx-auto space-y-6">
                
                {/* HEAD DETAILS */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-indigo-500/20">
                    <div className="space-y-1">
                        <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
                            <SignalIcon className="w-6 h-6 text-indigo-400 animate-pulse" />
                            Pelacakan Real-time Driver & Fleet
                        </h1>
                        <p className="text-xs text-slate-350 max-w-2xl">
                            Halaman ini memantau lokasi real-time semua driver yang sedang bertugas logistik. Koordinat diperbarui secara otomatis setiap 15 detik secara background.
                        </p>
                    </div>
                    <button
                        onClick={() => { setLoading(true); fetchDrivers(); }}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center space-x-1.5 active:scale-95 flex-shrink-0"
                    >
                        <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        <span>Segarkan Manual</span>
                    </button>
                </div>

                {/* WRAPPER COLS */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-280px)] min-h-[500px]">
                    
                    {/* LEFT PANEL: DRIVERS LISTING (SPAN 4) */}
                    <div className="lg:col-span-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm flex flex-col overflow-hidden h-full">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/10 flex justify-between items-center">
                            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Daftar Sopir / Driver</h3>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                                {onlineDrivers.length} Online
                            </span>
                        </div>

                        {/* LIST SCROLLABLE */}
                        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60 custom-scrollbar">
                            
                            {drivers.length === 0 && (
                                <div className="p-8 text-center text-xs text-slate-400 italic">
                                    Tidak ada driver terdaftar di sistem.
                                </div>
                            )}

                            {drivers.map(driver => {
                                const hasCoords = driver.lat !== null && driver.lng !== null;
                                return (
                                    <div 
                                        key={driver.id}
                                        onClick={() => hasCoords && flyToDriver(driver)}
                                        className={`p-4 transition-all flex items-start justify-between gap-3 ${
                                            hasCoords ? 'cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-700/30' : 'opacity-60'
                                        } ${activeDriverId === driver.id ? 'bg-indigo-50/30 dark:bg-indigo-950/10 border-l-4 border-l-indigo-600' : ''}`}
                                    >
                                        <div className="flex items-start space-x-3 min-w-0">
                                            <div className={`p-2 rounded-xl flex-shrink-0 ${
                                                driver.is_online 
                                                    ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-950/20 dark:text-emerald-400' 
                                                    : 'bg-slate-100 text-slate-400 dark:bg-slate-900'
                                            }`}>
                                                <TruckIcon className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0 space-y-0.5">
                                                <span className="font-semibold text-xs text-slate-950 dark:text-white block truncate">{driver.name}</span>
                                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                    <EnvelopeIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                                    <span className="truncate">{driver.email}</span>
                                                </span>
                                                {hasCoords ? (
                                                    <span className="text-[9px] text-slate-450 dark:text-slate-400 font-mono block">
                                                        GPS: {Number(driver.lat).toFixed(5)}, {Number(driver.lng).toFixed(5)}
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] text-rose-500 italic block">GPS Tidak Terdeteksi</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-right flex-shrink-0 flex flex-col items-end space-y-1">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                                                driver.is_online 
                                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' 
                                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-900'
                                            }`}>
                                                {driver.is_online ? 'Online' : 'Offline'}
                                            </span>
                                            <span className="text-[9px] text-slate-400 flex items-center gap-0.5 font-bold uppercase tracking-tighter">
                                                <ClockIcon className="w-3 h-3 flex-shrink-0" />
                                                <span>{driver.last_updated}</span>
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* RIGHT PANEL: MAP CONTAINER (SPAN 8) */}
                    <div className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm overflow-hidden h-full flex flex-col relative">
                        {!leafletReady && (
                            <div className="absolute inset-0 z-30 bg-white dark:bg-slate-800 flex flex-col items-center justify-center text-slate-400">
                                <ArrowPathIcon className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
                                <span className="text-xs">Menyiapkan Mesin Peta Leaflet...</span>
                            </div>
                        )}

                        <div className="flex-1 w-full h-full relative z-10">
                            <div ref={mapContainerRef} className="absolute inset-0 bg-slate-50 z-0" />
                        </div>

                        {/* MAP FOOTER HINT */}
                        <div className="bg-slate-50 dark:bg-slate-900/60 px-4 py-2 text-[10px] text-slate-450 flex items-center gap-1.5 border-t border-slate-100 dark:border-slate-700/60 flex-shrink-0">
                            <InformationCircleIcon className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                            <span>
                                Driver yang aktif berbagi lokasi akan memancarkan GPS mereka di peta. Klik pada list driver untuk melacak langsung.
                            </span>
                        </div>
                    </div>

                </div>

            </div>
        </AuthenticatedLayout>
    );
}
