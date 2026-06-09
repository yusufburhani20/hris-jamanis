import { PageProps } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import React, { useState, useEffect, useRef } from 'react';
import { 
    TruckIcon, 
    ArrowLeftIcon, 
    MapPinIcon, 
    ClipboardDocumentIcon, 
    CalendarIcon, 
    PaperAirplaneIcon,
    TrashIcon,
    ExclamationTriangleIcon
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

interface Branch {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    is_active: boolean;
}

export default function ShipmentShow({ auth, shipment, couriers, branches }: PageProps<{ shipment: Shipment, couriers: Courier[], branches: Branch[] }>) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const courierMarkerRef = useRef<any>(null);

    const [statusData, setStatusData] = useState({
        status: shipment.status,
        latitude: String(shipment.courier_lat || shipment.origin_lat),
        longitude: String(shipment.courier_lng || shipment.origin_lng),
        log_description: ''
    });

    const [newLogData, setNewLogData] = useState({
        status: 'in_transit',
        title: '',
        description: '',
        latitude: String(shipment.courier_lat || shipment.origin_lat),
        longitude: String(shipment.courier_lng || shipment.origin_lng),
    });

    // Form helper to save overall data
    const { data: editData, setData: setEditData, put, processing: editProcessing } = useForm({
        title: shipment.title,
        origin_name: shipment.origin_name,
        origin_lat: String(shipment.origin_lat),
        origin_lng: String(shipment.origin_lng),
        destination_name: shipment.destination_name,
        destination_lat: String(shipment.destination_lat),
        destination_lng: String(shipment.destination_lng),
        courier_id: String(shipment.courier_id || ''),
        notes: shipment.notes || '',
    });

    const { post: postStatus, processing: statusProcessing } = useForm();
    const { post: postLog, processing: logProcessing } = useForm();
    const { delete: deleteShipment, processing: deleteProcessing } = useForm();

    // Leaflet map initialization
    useEffect(() => {
        if (typeof window === 'undefined' || !mapContainerRef.current) return;

        // Import leaflet dynamically or ensure it exists
        const L = (window as any).L;
        if (!L) return;

        // Clean up previous map instance
        if (mapRef.current) {
            mapRef.current.remove();
        }

        // Setup custom icons
        const warehouseIcon = L.divIcon({
            html: `<div class="p-2 bg-blue-600 text-white rounded-full border-2 border-white shadow-lg animate-bounce"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg></div>`,
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
            html: `<div class="p-2.5 bg-amber-500 text-white rounded-full border-2 border-slate-900 shadow-xl cursor-move active:scale-95 transition-transform"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h2.586a1 1 0 00.707-.293l1.414-1.414a1 1 0 00.293-.707V16"></path></svg></div>`,
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

        // Center map bounding box
        const map = L.map(mapContainerRef.current).setView([cLat, cLng], 8);
        mapRef.current = map;

        // Tile layer OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        // Origin marker
        L.marker([oLat, oLng], { icon: warehouseIcon })
            .addTo(map)
            .bindPopup(`<b>Asal: ${shipment.origin_name}</b>`);

        // Destination marker
        L.marker([dLat, dLng], { icon: destinationIcon })
            .addTo(map)
            .bindPopup(`<b>Tujuan: ${shipment.destination_name}</b>`);

        // Draggable Courier marker
        const courierMarker = L.marker([cLat, cLng], { icon: truckIcon, draggable: true })
            .addTo(map)
            .bindPopup(`<b>Kurir: ${shipment.courier_name || 'Driver Logistik'}</b><br>Seret ikon ini untuk update koordinat manual.`);
        
        courierMarkerRef.current = courierMarker;

        // Update inputs on drag end
        courierMarker.on('dragend', function (event: any) {
            const position = event.target.getLatLng();
            const newLat = String(position.lat.toFixed(6));
            const newLng = String(position.lng.toFixed(6));
            
            setStatusData(prev => ({ ...prev, latitude: newLat, longitude: newLng }));
            setNewLogData(prev => ({ ...prev, latitude: newLat, longitude: newLng }));
        });

        // Route line polyline
        const latlngs = [[oLat, oLng], [cLat, cLng], [dLat, dLng]];
        const polyline = L.polyline(latlngs, { color: '#6366f1', weight: 4, dashArray: '8, 8' }).addTo(map);

        // Fit map bounds
        const group = new L.featureGroup([
            L.marker([oLat, oLng]),
            L.marker([dLat, dLng]),
            courierMarker
        ]);
        map.fitBounds(group.getBounds().pad(0.1));

    }, [shipment]);

    const handleStatusSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postStatus(route('admin.shipments.update-status', {
            shipment: shipment.id,
            status: statusData.status,
            latitude: statusData.latitude,
            longitude: statusData.longitude,
            log_description: statusData.log_description
        }), {
            onSuccess: () => setStatusData(prev => ({ ...prev, log_description: '' }))
        });
    };

    const handleLogSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postLog(route('admin.shipments.add-log', {
            shipment: shipment.id,
            ...newLogData
        }), {
            onSuccess: () => setNewLogData(prev => ({ ...prev, title: '', description: '' }))
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('admin.shipments.update', shipment.id));
    };

    const handleDelete = () => {
        if (confirm('APAKAH ANDA YAKIN ingin menghapus data pengiriman ini? Tindakan ini akan menghapus permanen seluruh riwayat log transit.')) {
            deleteShipment(route('admin.shipments.destroy', shipment.id));
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert(`Resi ${text} berhasil disalin ke clipboard!`);
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center space-x-2">
                    <Link href={route('admin.shipments.index')} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </Link>
                    <span className="font-semibold text-xl text-slate-800 dark:text-slate-200 leading-tight">Kontrol Logistik Paket {shipment.tracking_number}</span>
                </div>
            }
        >
            <Head title={`Kontrol Resi ${shipment.tracking_number}`} />

            <div className="py-6 space-y-6">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* COL 1: MAP AND TIMELINE HISTORY (SPAN 2) */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Interactive Leaflet Map */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm overflow-hidden p-4">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Peta Pelacakan Rute Real-time</h3>
                                    <p className="text-xs text-slate-400">Garis putus-putus menunjukkan rute asal, kurir di tengah, dan cabang tujuan.</p>
                                </div>
                                <span className="bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 text-xs px-2.5 py-1 rounded-full font-bold">
                                    Ikon Mobil Dapat Diseret
                                </span>
                            </div>
                            <div 
                                ref={mapContainerRef} 
                                className="w-full h-[400px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 z-10"
                                style={{ minHeight: '300px' }}
                            />
                        </div>

                        {/* KIR Transit Log History */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm p-6">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6">Timeline Log Transit Paket</h3>
                            
                            <div className="relative border-l border-slate-200 dark:border-slate-700 ml-4 space-y-8">
                                {shipment.logs.map((log, index) => {
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
                                            
                                            <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
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
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>

                    {/* COL 2: CONTROL PANEL PANEL (SPAN 1) */}
                    <div className="space-y-6">

                        {/* Status Update Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm p-6 space-y-4">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Alur Status Pengiriman KIR</h3>
                            <p className="text-xs text-slate-400">Ubah tahapan perjalanan barang. Riwayat transit log akan otomatis terbuat di bawah peta.</p>

                            <form onSubmit={handleStatusSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-400 tracking-wider">Tahapan Status</label>
                                    <select
                                        value={statusData.status}
                                        onChange={e => setStatusData(prev => ({ ...prev, status: e.target.value as any }))}
                                        className="mt-1.5 block w-full rounded-xl border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm focus:border-indigo-500 focus:ring-indigo-500 cursor-pointer"
                                    >
                                        <option value="packing">Sedang Dikemas (Packing)</option>
                                        <option value="picked_up">Kurir Pickup (Picked Up)</option>
                                        <option value="in_transit">Dalam Transit Perjalanan (In Transit)</option>
                                        <option value="delivered">Diterima Cabang (Delivered)</option>
                                        <option value="failed">Gagal / Ditunda (Failed)</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400">Lat Kurir Saat Ini</label>
                                        <input
                                            type="text"
                                            value={statusData.latitude}
                                            onChange={e => setStatusData(prev => ({ ...prev, latitude: e.target.value }))}
                                            className="mt-1 w-full rounded-xl border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-white text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400">Lng Kurir Saat Ini</label>
                                        <input
                                            type="text"
                                            value={statusData.longitude}
                                            onChange={e => setStatusData(prev => ({ ...prev, longitude: e.target.value }))}
                                            className="mt-1 w-full rounded-xl border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-white text-xs"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-400 tracking-wider">Keterangan Log Transit kustom</label>
                                    <textarea
                                        value={statusData.log_description}
                                        onChange={e => setStatusData(prev => ({ ...prev, log_description: e.target.value }))}
                                        rows={2}
                                        className="mt-1.5 block w-full rounded-xl border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        placeholder="Kosongkan untuk menggunakan deskripsi status otomatis bawaan..."
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={statusProcessing}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-2.5 rounded-xl transition-all active:scale-95 shadow-md shadow-indigo-600/10 disabled:opacity-50"
                                >
                                    {statusProcessing ? 'Memproses...' : 'Ubah Status & Update Peta'}
                                </button>
                            </form>
                        </div>

                        {/* Add Manual Timeline Log Entry */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm p-6 space-y-4">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Tambah Catatan Transit Manual</h3>
                            <p className="text-xs text-slate-400">Gunakan form ini untuk menyisipkan checkpoint transit kustom tanpa mengubah status utama (misal: masuk gerbang Tol, transit HUB kota).</p>

                            <form onSubmit={handleLogSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-400 tracking-wider">Judul Log Transit</label>
                                    <input
                                        type="text"
                                        value={newLogData.title}
                                        onChange={e => setNewLogData(prev => ({ ...prev, title: e.target.value }))}
                                        required
                                        className="mt-1.5 block w-full rounded-xl border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm"
                                        placeholder="Misal: Paket melewati Rest Area KM 57"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-400 tracking-wider">Detail Keterangan</label>
                                    <textarea
                                        value={newLogData.description}
                                        onChange={e => setNewLogData(prev => ({ ...prev, description: e.target.value }))}
                                        rows={2}
                                        className="mt-1.5 block w-full rounded-xl border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm"
                                        placeholder="Driver beristirahat sejenak untuk mengisi bahan bakar truk boks."
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={logProcessing}
                                    className="w-full bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 font-bold text-sm py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {logProcessing ? 'Menyimpan...' : 'Suntikkan Checkpoint Log'}
                                </button>
                            </form>
                        </div>

                        {/* Edit Core Shipment Data */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm p-6 space-y-4">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Sunting Pengiriman</h3>
                            
                            <form onSubmit={handleEditSubmit} className="space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500">Judul Barang</label>
                                    <input
                                        type="text"
                                        value={editData.title}
                                        onChange={e => setEditData('title', e.target.value)}
                                        className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-700 text-xs dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500">Cabang Asal</label>
                                    <select
                                        onChange={e => {
                                            const branch = branches.find(b => b.id === parseInt(e.target.value));
                                            if (branch) {
                                                setEditData(prev => ({
                                                    ...prev,
                                                    origin_name: branch.name,
                                                    origin_lat: String(branch.latitude),
                                                    origin_lng: String(branch.longitude),
                                                }));
                                            }
                                        }}
                                        className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-700 text-xs dark:text-white cursor-pointer"
                                    >
                                        <option value="">-- Ubah Cabang Asal --</option>
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                    <input
                                        type="text"
                                        value={editData.origin_name}
                                        onChange={e => setEditData('origin_name', e.target.value)}
                                        className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-700 text-xs dark:text-white"
                                        placeholder="Nama Asal"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500">Cabang Tujuan</label>
                                    <select
                                        onChange={e => {
                                            const branch = branches.find(b => b.id === parseInt(e.target.value));
                                            if (branch) {
                                                setEditData(prev => ({
                                                    ...prev,
                                                    destination_name: branch.name,
                                                    destination_lat: String(branch.latitude),
                                                    destination_lng: String(branch.longitude),
                                                }));
                                            }
                                        }}
                                        className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-700 text-xs dark:text-white cursor-pointer"
                                    >
                                        <option value="">-- Ubah Cabang Tujuan --</option>
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                    <input
                                        type="text"
                                        value={editData.destination_name}
                                        onChange={e => setEditData('destination_name', e.target.value)}
                                        className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-700 text-xs dark:text-white"
                                        placeholder="Nama Tujuan"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500">Tugaskan Kurir</label>
                                    <select
                                        value={editData.courier_id}
                                        onChange={e => setEditData('courier_id', e.target.value)}
                                        className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-700 text-xs dark:text-white cursor-pointer"
                                    >
                                        <option value="">Belum Ditugaskan</option>
                                        {couriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    disabled={editProcessing}
                                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 font-bold text-xs py-2 rounded-xl transition-all disabled:opacity-50"
                                >
                                    Perbarui Detail Barang / Driver
                                </button>
                            </form>
                        </div>

                        {/* Danger zone delete shipment */}
                        <div className="bg-rose-50/50 dark:bg-rose-950/10 rounded-2xl border border-rose-100 dark:border-rose-900/40 p-6 space-y-4">
                            <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-400">
                                <ExclamationTriangleIcon className="w-6 h-6 flex-shrink-0" />
                                <h4 className="font-black text-sm">Hapus Pengiriman</h4>
                            </div>
                            <p className="text-xs text-rose-600/80 dark:text-rose-400/80">Menghapus resi akan mematikan tautan pelacakan bagi cabang pembeli dan kurir.</p>
                            <button
                                onClick={handleDelete}
                                disabled={deleteProcessing}
                                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                            >
                                Hapus Resi Pengiriman
                            </button>
                        </div>

                    </div>

                </div>
            </div>
            
            {/* Custom Leaflet keyframes support inside the dashboard */}
            <style>{`
                @keyframes ping-once {
                    0% { transform: scale(1); opacity: 1; }
                    80%, 100% { transform: scale(1.8); opacity: 0; }
                }
                .animate-ping-once {
                    animation: ping-once 2s cubic-bezier(0, 0, 0.2, 1) infinite;
                }
            `}</style>
        </AuthenticatedLayout>
    );
}
