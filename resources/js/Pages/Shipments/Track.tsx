import { PageProps } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import React, { useState, useEffect, useRef } from 'react';
import { 
    TruckIcon, 
    MapPinIcon, 
    ClipboardDocumentIcon, 
    CalendarIcon, 
    MagnifyingGlassIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';

interface Courier {
    id: number;
    name: string;
    email: string;
}

interface ShipmentLog {
    id: number;
    status: string;
    title: string;
    description: string;
    latitude: number | null;
    longitude: number | null;
    created_at: string;
}

interface Shipment {
    id: number;
    tracking_number: string;
    title: string;
    origin_name: string;
    destination_name: string;
    origin_lat: number;
    origin_lng: number;
    destination_lat: number;
    destination_lng: number;
    courier_id: number | null;
    courier_name: string | null;
    courier_lat: number | null;
    courier_lng: number | null;
    status: 'packing' | 'picked_up' | 'in_transit' | 'delivered' | 'failed';
    notes: string | null;
    created_at: string;
    logs: ShipmentLog[];
}

export default function ShipmentTrack({ auth, shipment, trackingNumber, error }: PageProps<{ shipment: Shipment | null, trackingNumber: string | null, error: string | null }>) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const [inputResi, setInputResi] = useState(trackingNumber || '');

    // Setup map
    useEffect(() => {
        if (!shipment || typeof window === 'undefined' || !mapContainerRef.current) return;

        const L = (window as any).L;
        if (!L) return;

        if (mapRef.current) {
            mapRef.current.remove();
        }

        // Custom icons
        const warehouseIcon = L.divIcon({
            html: `<div class="p-2 bg-blue-600 text-white rounded-full border-2 border-white shadow-lg"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg></div>`,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        const destinationIcon = L.divIcon({
            html: `<div class="p-2 bg-emerald-600 text-white rounded-full border-2 border-white shadow-lg"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></div>`,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        const truckIcon = L.divIcon({
            html: `<div class="p-2.5 bg-indigo-600 text-white rounded-full border-2 border-white shadow-xl animate-pulse-glow"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h2.586a1 1 0 00.707-.293l1.414-1.414a1 1 0 00.293-.707V16"></path></svg></div>`,
            className: '',
            iconSize: [38, 38],
            iconAnchor: [19, 19]
        });

        const oLat = Number(shipment.origin_lat);
        const oLng = Number(shipment.origin_lng);
        const dLat = Number(shipment.destination_lat);
        const dLng = Number(shipment.destination_lng);
        const cLat = Number(shipment.courier_lat || oLat);
        const cLng = Number(shipment.courier_lng || oLng);

        const map = L.map(mapContainerRef.current).setView([cLat, cLng], 9);
        mapRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        // Add markers
        L.marker([oLat, oLng], { icon: warehouseIcon }).addTo(map).bindPopup(`<b>Pusat Pengirim:</b><br>${shipment.origin_name}`);
        L.marker([dLat, dLng], { icon: destinationIcon }).addTo(map).bindPopup(`<b>Cabang Penerima:</b><br>${shipment.destination_name}`);
        L.marker([cLat, cLng], { icon: truckIcon }).addTo(map).bindPopup(`<b>Kurir Paket Live:</b><br>${shipment.courier_name || 'Driver Logistik'}`);

        // Route line polyline
        L.polyline([[oLat, oLng], [cLat, cLng], [dLat, dLng]], {
            color: '#6366f1',
            weight: 5,
            dashArray: '10, 10'
        }).addTo(map);

        const group = new L.featureGroup([
            L.marker([oLat, oLng]),
            L.marker([dLat, dLng]),
            L.marker([cLat, cLng])
        ]);
        map.fitBounds(group.getBounds().pad(0.1));

    }, [shipment]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputResi.trim()) {
            window.location.href = route('shipments.track', inputResi.trim());
        }
    };

    // Helper for Status Steps Bar
    const getStepStatusClass = (step: 'packing' | 'picked_up' | 'in_transit' | 'delivered') => {
        if (!shipment) return 'text-slate-300 dark:text-slate-700';

        const statuses = ['packing', 'picked_up', 'in_transit', 'delivered'];
        const currentIdx = statuses.indexOf(shipment.status === 'failed' ? 'in_transit' : shipment.status);
        const stepIdx = statuses.indexOf(step);

        if (currentIdx >= stepIdx) {
            return 'text-indigo-600 dark:text-indigo-400 font-bold';
        }
        return 'text-slate-400 dark:text-slate-600';
    };

    const getStepBulletClass = (step: 'packing' | 'picked_up' | 'in_transit' | 'delivered') => {
        if (!shipment) return 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700';

        const statuses = ['packing', 'picked_up', 'in_transit', 'delivered'];
        const currentIdx = statuses.indexOf(shipment.status === 'failed' ? 'in_transit' : shipment.status);
        const stepIdx = statuses.indexOf(step);

        if (currentIdx > stepIdx) {
            return 'bg-indigo-600 text-white border-indigo-600';
        } else if (currentIdx === stepIdx) {
            return 'bg-white text-indigo-600 border-indigo-600 border-4 animate-pulse';
        }
        return 'bg-slate-100 text-slate-300 border-slate-200 dark:bg-slate-800 dark:border-slate-700';
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert(`Resi ${text} berhasil disalin!`);
    };

    // Sort logs descending to show newest first for public tracking convenience
    const sortedLogs = shipment ? [...shipment.logs].reverse() : [];

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-slate-800 dark:text-slate-200 leading-tight">Pelacakan Paket Real-time</h2>}
        >
            <Head title="Pelacakan Pengiriman" />

            <div className="py-6 max-w-5xl mx-auto space-y-6">

                {/* TRACKING SEARCH HEADER */}
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border-b border-indigo-400/20">
                    <div className="text-center md:text-left">
                        <h1 className="text-2xl font-black tracking-tight">Lacak Pengiriman Stok Cabang</h1>
                        <p className="text-sm text-indigo-100 mt-1">Masukkan Nomor Resi KIR untuk memantau pergerakan truk kurir secara live di peta.</p>
                    </div>

                    <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96 flex">
                        <input
                            type="text"
                            placeholder="Nomor Resi (Contoh: KIR-20260519-001)"
                            value={inputResi}
                            onChange={e => setInputResi(e.target.value)}
                            required
                            className="w-full pl-4 pr-12 py-3 rounded-xl border-none bg-white text-slate-900 shadow-inner font-mono font-bold text-sm focus:ring-2 focus:ring-white"
                        />
                        <button
                            type="submit"
                            className="absolute right-2 top-2 p-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors"
                        >
                            <MagnifyingGlassIcon className="w-5 h-5" />
                        </button>
                    </form>
                </div>

                {error && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 px-6 py-4 rounded-2xl flex items-center space-x-3 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-400">
                        <span className="font-bold text-sm">{error}</span>
                    </div>
                )}

                {shipment ? (
                    <>
                        {/* PACKAGE BASIC INFO & STATUS STEPPER */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm p-6 space-y-6">
                            
                            {/* Resi Header */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-700/60 pb-4 gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-mono">{shipment.tracking_number}</span>
                                        <button 
                                            onClick={() => copyToClipboard(shipment.tracking_number)}
                                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
                                        >
                                            <ClipboardDocumentIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{shipment.title}</p>
                                    {shipment.notes && <p className="text-xs text-slate-400 italic">Catatan: {shipment.notes}</p>}
                                </div>
                                <div className="text-right">
                                    <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
                                        shipment.status === 'packing' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                                        shipment.status === 'picked_up' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                        shipment.status === 'in_transit' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' :
                                        shipment.status === 'delivered' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                        'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                                    }`}>
                                        {shipment.status === 'packing' ? 'Kemasan' :
                                         shipment.status === 'picked_up' ? 'Kurir Pick' :
                                         shipment.status === 'in_transit' ? 'Transit Jalan' :
                                         shipment.status === 'delivered' ? 'Diterima Cabang' : 'Gagal'}
                                    </span>
                                    <p className="text-[10px] text-slate-400 mt-1">Status Terupdate</p>
                                </div>
                            </div>

                            {/* SPX Shopee-Style Stepper Progress Bar */}
                            <div className="relative py-4">
                                <div className="absolute top-1/2 left-4 right-4 h-1 bg-slate-100 dark:bg-slate-700/60 -translate-y-1/2 z-0" />
                                
                                <div className="relative flex justify-between z-10">
                                    {/* STEP 1: PACKING */}
                                    <div className="flex flex-col items-center space-y-2 text-center w-24">
                                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${getStepBulletClass('packing')}`}>
                                            1
                                        </div>
                                        <span className={`text-[10px] tracking-tight uppercase ${getStepStatusClass('packing')}`}>Dikemas</span>
                                    </div>

                                    {/* STEP 2: PICKED UP */}
                                    <div className="flex flex-col items-center space-y-2 text-center w-24">
                                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${getStepBulletClass('picked_up')}`}>
                                            2
                                        </div>
                                        <span className={`text-[10px] tracking-tight uppercase ${getStepStatusClass('picked_up')}`}>Kurir Picked</span>
                                    </div>

                                    {/* STEP 3: IN TRANSIT */}
                                    <div className="flex flex-col items-center space-y-2 text-center w-24">
                                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${getStepBulletClass('in_transit')}`}>
                                            3
                                        </div>
                                        <span className={`text-[10px] tracking-tight uppercase ${getStepStatusClass('in_transit')}`}>Transit Jalan</span>
                                    </div>

                                    {/* STEP 4: DELIVERED */}
                                    <div className="flex flex-col items-center space-y-2 text-center w-24">
                                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${getStepBulletClass('delivered')}`}>
                                            4
                                        </div>
                                        <span className={`text-[10px] tracking-tight uppercase ${getStepStatusClass('delivered')}`}>Sampai</span>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* LIVE TRACKING MAP CONTAINER */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm p-4 space-y-3">
                            <div className="flex justify-between items-center px-2">
                                <span className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    <MapPinIcon className="w-5 h-5 text-indigo-500" />
                                    Peta Distribusi & Posisi Live Kurir
                                </span>
                                <button 
                                    onClick={() => window.location.reload()}
                                    title="Segarkan Peta"
                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1 text-xs font-bold"
                                >
                                    <ArrowPathIcon className="w-4 h-4 animate-spin-slow" />
                                    Segarkan Live
                                </button>
                            </div>
                            <div 
                                ref={mapContainerRef} 
                                className="w-full h-[380px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 z-10 shadow-inner"
                                style={{ minHeight: '300px' }}
                            />
                            <div className="flex flex-col sm:flex-row justify-between text-xs text-slate-500 dark:text-slate-400 gap-2 px-2 border-t dark:border-slate-700 pt-3">
                                <div><b>Asal Gudang:</b> {shipment.origin_name}</div>
                                <div><b>Cabang Penerima:</b> {shipment.destination_name}</div>
                                {shipment.courier_name && <div><b>Pengemudi Truk:</b> {shipment.courier_name}</div>}
                            </div>
                        </div>

                        {/* VERTICAL TIMELINE LOGS (LATEST TOP) */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm p-6 space-y-6">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Riwayat Perjalanan Barang</h3>
                            
                            <div className="relative border-l border-slate-200 dark:border-slate-700 ml-4 space-y-8">
                                {sortedLogs.map((log, index) => {
                                    const isLatest = index === 0;
                                    return (
                                        <div key={log.id} className="relative pl-8">
                                            {/* Bullet icon */}
                                            <span className={`absolute -left-3.5 top-1.5 flex items-center justify-center w-7 h-7 rounded-full border-2 ${
                                                isLatest 
                                                    ? 'bg-indigo-600 text-white border-indigo-200' 
                                                    : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                                            }`}>
                                                {isLatest ? (
                                                    <TruckIcon className="w-4 h-4" />
                                                ) : (
                                                    <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                                                )}
                                            </span>

                                            <div className={`p-4 rounded-xl border transition-all ${
                                                isLatest 
                                                    ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/30 shadow-sm' 
                                                    : 'bg-slate-50/30 dark:bg-slate-900/20 border-slate-100/50 dark:border-slate-800/40'
                                            }`}>
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 mb-2">
                                                    <h4 className={`text-sm font-black ${isLatest ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-300'}`}>
                                                        {log.title}
                                                    </h4>
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {new Date(log.created_at).toLocaleString('id-ID', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{log.description}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                ) : (
                    /* EMPTY SEARCH PROMPT */
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm p-12 text-center space-y-4">
                        <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/40 rounded-full flex items-center justify-center mx-auto text-indigo-500">
                            <TruckIcon className="w-10 h-10 animate-bounce" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white">Menunggu Nomor Resi Pelacakan</h2>
                        <p className="text-sm text-slate-400 max-w-sm mx-auto">Silakan masukkan nomor resi logistik Anda (misalnya KIR-20260519-001) pada kotak pencarian di atas untuk mulai melakukan pelacakan live.</p>
                    </div>
                )}

            </div>

            {/* Pulsing glow styling for live marker */}
            <style>{`
                @keyframes pulse-glow {
                    0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7); }
                    70% { box-shadow: 0 0 0 12px rgba(99, 102, 241, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
                }
                .animate-pulse-glow {
                    animation: pulse-glow 2s infinite;
                }
                .animate-spin-slow {
                    animation: spin 3s linear infinite;
                }
            `}</style>
        </AuthenticatedLayout>
    );
}
