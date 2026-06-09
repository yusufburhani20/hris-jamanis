import { PageProps } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import React, { useState, useRef, useEffect } from 'react';
import { 
    TruckIcon, 
    PlusIcon, 
    ClipboardDocumentIcon, 
    MapPinIcon, 
    ClockIcon, 
    CheckCircleIcon, 
    XCircleIcon,
    ArrowRightIcon
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
    courier?: Courier;
}

interface Branch {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    is_active: boolean;
}

export default function ShipmentsIndex({ auth, shipments, couriers, branches }: PageProps<{ shipments: Shipment[], couriers: Courier[], branches: Branch[] }>) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const { data, setData, post, reset, processing, errors } = useForm({
        title: '',
        origin_name: '',
        origin_lat: '',
        origin_lng: '',
        destination_name: '',
        destination_lat: '',
        destination_lng: '',
        courier_id: '',
        notes: '',
    });

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const originMarkerRef = useRef<any>(null);
    const destinationMarkerRef = useRef<any>(null);
    const polylineRef = useRef<any>(null);
    const [mapTarget, setMapTarget] = useState<'origin' | 'destination'>('origin');

    const [searchMapQuery, setSearchMapQuery] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);

    const handleMapSearch = async () => {
        if (!searchMapQuery.trim()) return;

        setSearchLoading(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchMapQuery)}&limit=1`);
            const dataResults = await response.json();

            if (dataResults && dataResults.length > 0) {
                const result = dataResults[0];
                const lat = parseFloat(result.lat);
                const lng = parseFloat(result.lon);
                const displayName = result.display_name;

                const map = mapRef.current;
                if (map) {
                    map.setView([lat, lng], 15);

                    if (mapTarget === 'origin') {
                        if (originMarkerRef.current) {
                            originMarkerRef.current.setLatLng([lat, lng]);
                        }
                        setData(prev => ({
                            ...prev,
                            origin_name: displayName.split(',')[0] || displayName,
                            origin_lat: String(lat.toFixed(6)),
                            origin_lng: String(lng.toFixed(6))
                        }));
                    } else {
                        if (destinationMarkerRef.current) {
                            destinationMarkerRef.current.setLatLng([lat, lng]);
                        }
                        setData(prev => ({
                            ...prev,
                            destination_name: displayName.split(',')[0] || displayName,
                            destination_lat: String(lat.toFixed(6)),
                            destination_lng: String(lng.toFixed(6))
                        }));
                    }
                }
            } else {
                alert("Lokasi tidak ditemukan. Harap coba kata kunci pencarian lainnya.");
            }
        } catch (err) {
            console.error("Gagal melakukan pencarian:", err);
            alert("Terjadi kesalahan saat mencari lokasi. Harap periksa koneksi internet Anda.");
        } finally {
            setSearchLoading(false);
        }
    };

    // Haversine Distance helper
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371000; // meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Map in Modal initialization
    useEffect(() => {
        if (!isDialogOpen || typeof window === 'undefined' || !mapContainerRef.current) return;

        const L = (window as any).L;
        if (!L) return;

        // Clean up previous map instance
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }

        const defaultOriginLat = parseFloat(data.origin_lat) || -6.175392;
        const defaultOriginLng = parseFloat(data.origin_lng) || 106.827153;
        const defaultDestLat = parseFloat(data.destination_lat) || -7.795580;
        const defaultDestLng = parseFloat(data.destination_lng) || 110.369490;

        // Setup custom divIcons
        const warehouseIcon = L.divIcon({
            html: `<div class="p-2 bg-blue-600 text-white rounded-full border-2 border-white shadow-lg animate-bounce"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg></div>`,
            className: '',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });

        const destinationIcon = L.divIcon({
            html: `<div class="p-2 bg-emerald-600 text-white rounded-full border-2 border-white shadow-lg"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></div>`,
            className: '',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });

        const map = L.map(mapContainerRef.current).setView([defaultOriginLat, defaultOriginLng], 7);
        mapRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        // Origin marker
        const originMarker = L.marker([defaultOriginLat, defaultOriginLng], { icon: warehouseIcon, draggable: true })
            .addTo(map)
            .bindPopup("<b>Gudang Asal</b><br>Seret untuk memindahkan.");
        originMarkerRef.current = originMarker;

        // Destination marker
        const destMarker = L.marker([defaultDestLat, defaultDestLng], { icon: destinationIcon, draggable: true })
            .addTo(map)
            .bindPopup("<b>Cabang Tujuan</b><br>Seret untuk memindahkan.");
        destinationMarkerRef.current = destMarker;

        // Polyline connecting them
        const polyline = L.polyline([[defaultOriginLat, defaultOriginLng], [defaultDestLat, defaultDestLng]], {
            color: '#6366f1',
            weight: 3,
            dashArray: '5, 5'
        }).addTo(map);
        polylineRef.current = polyline;

        // Origin Drag event
        originMarker.on('drag', () => {
            const pos = originMarker.getLatLng();
            polyline.setLatLngs([[pos.lat, pos.lng], destMarker.getLatLng()]);
        });
        originMarker.on('dragend', () => {
            const pos = originMarker.getLatLng();
            setData(prev => ({
                ...prev,
                origin_lat: String(pos.lat.toFixed(6)),
                origin_lng: String(pos.lng.toFixed(6))
            }));
        });

        // Destination Drag event
        destMarker.on('drag', () => {
            const pos = destMarker.getLatLng();
            polyline.setLatLngs([originMarker.getLatLng(), [pos.lat, pos.lng]]);
        });
        destMarker.on('dragend', () => {
            const pos = destMarker.getLatLng();
            setData(prev => ({
                ...prev,
                destination_lat: String(pos.lat.toFixed(6)),
                destination_lng: String(pos.lng.toFixed(6))
            }));
        });

        // Map Click event
        map.on('click', (e: any) => {
            const pos = e.latlng;
            const clickLat = String(pos.lat.toFixed(6));
            const clickLng = String(pos.lng.toFixed(6));

            const target = (window as any)._mapTargetActive || 'origin';
            if (target === 'origin') {
                originMarker.setLatLng(pos);
                polyline.setLatLngs([[pos.lat, pos.lng], destMarker.getLatLng()]);
                setData(prev => ({
                    ...prev,
                    origin_lat: clickLat,
                    origin_lng: clickLng
                }));
            } else {
                destMarker.setLatLng(pos);
                polyline.setLatLngs([originMarker.getLatLng(), [pos.lat, pos.lng]]);
                setData(prev => ({
                    ...prev,
                    destination_lat: clickLat,
                    destination_lng: clickLng
                }));
            }
        });

        // Fit bounds to show both markers
        const group = new L.featureGroup([originMarker, destMarker]);
        map.fitBounds(group.getBounds().pad(0.15));

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
            originMarkerRef.current = null;
            destinationMarkerRef.current = null;
            polylineRef.current = null;
        };
    }, [isDialogOpen]);

    // Keep active target sync in window global
    useEffect(() => {
        (window as any)._mapTargetActive = mapTarget;
    }, [mapTarget]);

    // Update map markers when manual state input or presets change
    useEffect(() => {
        if (!isDialogOpen || !mapRef.current) return;

        const oLat = parseFloat(data.origin_lat);
        const oLng = parseFloat(data.origin_lng);
        const dLat = parseFloat(data.destination_lat);
        const dLng = parseFloat(data.destination_lng);

        if (isNaN(oLat) || isNaN(oLng) || isNaN(dLat) || isNaN(dLng)) return;

        const L = (window as any).L;
        if (!L) return;

        let changed = false;

        if (originMarkerRef.current) {
            const cur = originMarkerRef.current.getLatLng();
            if (Math.abs(cur.lat - oLat) > 0.0001 || Math.abs(cur.lng - oLng) > 0.0001) {
                originMarkerRef.current.setLatLng([oLat, oLng]);
                changed = true;
            }
        }

        if (destinationMarkerRef.current) {
            const cur = destinationMarkerRef.current.getLatLng();
            if (Math.abs(cur.lat - dLat) > 0.0001 || Math.abs(cur.lng - dLng) > 0.0001) {
                destinationMarkerRef.current.setLatLng([dLat, dLng]);
                changed = true;
            }
        }

        if (polylineRef.current) {
            polylineRef.current.setLatLngs([[oLat, oLng], [dLat, dLng]]);
        }

        if (changed) {
            const group = new L.featureGroup([originMarkerRef.current, destinationMarkerRef.current]);
            mapRef.current.fitBounds(group.getBounds().pad(0.15));
        }
    }, [data.origin_lat, data.origin_lng, data.destination_lat, data.destination_lng]);

    const openDialog = () => {
        reset();
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        reset();
    };

    const handlePresetSelect = (type: 'origin' | 'destination', branchId: number) => {
        const branch = branches.find(b => b.id === branchId);
        if (!branch) return;
        if (type === 'origin') {
            setData(prev => ({
                ...prev,
                origin_name: branch.name,
                origin_lat: String(branch.latitude),
                origin_lng: String(branch.longitude),
            }));
        } else {
            setData(prev => ({
                ...prev,
                destination_name: branch.name,
                destination_lat: String(branch.latitude),
                destination_lng: String(branch.longitude),
            }));
        }
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.shipments.store'), {
            onSuccess: () => closeDialog(),
        });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert(`Resi ${text} berhasil disalin ke clipboard!`);
    };

    // Stats calculations
    const stats = {
        total: shipments.length,
        packing: shipments.filter(s => s.status === 'packing').length,
        transit: shipments.filter(s => s.status === 'in_transit' || s.status === 'picked_up').length,
        delivered: shipments.filter(s => s.status === 'delivered').length,
        failed: shipments.filter(s => s.status === 'failed').length,
    };

    // Filter shipments
    const filteredShipments = shipments.filter(shipment => {
        const matchesSearch = 
            shipment.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            shipment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            shipment.origin_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            shipment.destination_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (shipment.courier_name && shipment.courier_name.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-slate-800 dark:text-slate-200 leading-tight">Kelola Pengiriman Barang</h2>}
        >
            <Head title="Kelola Pengiriman" />

            <div className="py-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    
                    {/* Header Controls */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Logistik Pengisian Cabang</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Kontrol distribusi stok dari gudang pusat ke cabang-cabang retail secara real-time.</p>
                        </div>
                        <button
                            onClick={openDialog}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl flex items-center space-x-2 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                        >
                            <PlusIcon className="w-5 h-5" />
                            <span>Registrasi Resi Baru</span>
                        </button>
                    </div>

                    {/* Stats Counter Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm flex items-center space-x-4">
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                <TruckIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Paket</p>
                                <p className="text-xl font-black text-slate-900 dark:text-white">{stats.total}</p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm flex items-center space-x-4">
                            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
                                <ClockIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Sedang Dikemas</p>
                                <p className="text-xl font-black text-slate-900 dark:text-white">{stats.packing}</p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm flex items-center space-x-4">
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
                                <TruckIcon className="w-6 h-6 animate-pulse" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Di Perjalanan</p>
                                <p className="text-xl font-black text-slate-900 dark:text-white">{stats.transit}</p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm flex items-center space-x-4">
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                <CheckCircleIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Sukses Cabang</p>
                                <p className="text-xl font-black text-slate-900 dark:text-white">{stats.delivered}</p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm flex items-center space-x-4 col-span-2 lg:col-span-1">
                            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl">
                                <XCircleIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pengiriman Gagal</p>
                                <p className="text-xl font-black text-slate-900 dark:text-white">{stats.failed}</p>
                            </div>
                        </div>
                    </div>

                    {/* Filter and Search Section */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-80">
                            <input
                                type="text"
                                placeholder="Cari resi, nama barang, kurir..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-4 pr-10 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:text-white"
                            />
                        </div>
                        
                        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                            {['all', 'packing', 'picked_up', 'in_transit', 'delivered', 'failed'].map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setStatusFilter(filter)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap capitalize transition-all ${
                                        statusFilter === filter
                                            ? 'bg-indigo-600 text-white shadow-md'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                    }`}
                                >
                                    {filter === 'all' ? 'Semua Status' : filter === 'picked_up' ? 'Diserahkan ke Kurir' : filter === 'in_transit' ? 'Dalam Transit' : filter === 'delivered' ? 'Selesai' : filter === 'failed' ? 'Gagal' : 'Kemasan'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Shipments List Table */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700/60">
                                        <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-wider">No. Resi Pelacakan</th>
                                        <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-wider">Deskripsi Barang</th>
                                        <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-wider">Rute Cabang</th>
                                        <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-wider">Kurir Logistik</th>
                                        <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-wider text-center">Status</th>
                                        <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-wider text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                    {filteredShipments.map((shipment) => (
                                        <tr key={shipment.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-2">
                                                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{shipment.tracking_number}</span>
                                                    <button 
                                                        onClick={() => copyToClipboard(shipment.tracking_number)}
                                                        title="Salin Resi"
                                                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-600 transition-colors"
                                                    >
                                                        <ClipboardDocumentIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <span className="text-[10px] text-slate-400">{new Date(shipment.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-slate-900 dark:text-white">{shipment.title}</div>
                                                <div className="text-xs text-slate-400 truncate max-w-xs">{shipment.notes || 'Tanpa catatan khusus'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300">
                                                    <span className="font-bold text-slate-900 dark:text-white truncate max-w-[120px]">{shipment.origin_name.split(' ')[0]}</span>
                                                    <ArrowRightIcon className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                                    <span className="font-bold text-slate-900 dark:text-white truncate max-w-[120px]">{shipment.destination_name.split(' ')[0]}</span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 block mt-0.5 truncate max-w-[200px]">{shipment.destination_name}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                {shipment.courier_name ? (
                                                    <div>
                                                        <div className="font-semibold text-slate-800 dark:text-slate-200">{shipment.courier_name}</div>
                                                        <div className="text-[10px] text-slate-400">Assigned Driver</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs italic text-slate-400">Belum Ditugaskan</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                                                    shipment.status === 'packing' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                                                    shipment.status === 'picked_up' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                                    shipment.status === 'in_transit' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' :
                                                    shipment.status === 'delivered' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                    'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                                                }`}>
                                                    {shipment.status === 'packing' ? 'Kemasan' :
                                                     shipment.status === 'picked_up' ? 'Kurir Picked' :
                                                     shipment.status === 'in_transit' ? 'Perjalanan' :
                                                     shipment.status === 'delivered' ? 'Diterima' : 'Gagal'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <Link 
                                                        href={route('shipments.track', shipment.tracking_number)} 
                                                        target="_blank"
                                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors"
                                                    >
                                                        Peta KIR
                                                    </Link>
                                                    <Link 
                                                        href={route('admin.shipments.show', shipment.id)} 
                                                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                                                    >
                                                        Kontrol & Log
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredShipments.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                                                Tidak ada data pengiriman barang ditemukan.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>

            {/* Dialog Form Registrasi Baru */}
            {isDialogOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={closeDialog}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        
                        <div className="inline-block align-bottom bg-white dark:bg-slate-800 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl lg:max-w-5xl w-full">
                            <form onSubmit={submit}>
                                <div className="bg-white dark:bg-slate-800 px-6 pt-6 pb-4">
                                    <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700/60 mb-4">
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white">Registrasi Pengiriman Stok Cabang</h3>
                                        <button type="button" onClick={closeDialog} className="text-slate-400 hover:text-slate-600">&times;</button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                        {/* LEFT COLUMN: FORM FIELDS (SPAN 5) */}
                                        <div className="md:col-span-5 space-y-4">
                                            <div>
                                                <label className="block text-xs font-black uppercase text-slate-400 tracking-wider">Nama Barang / Deskripsi Stok</label>
                                                <input 
                                                    type="text" 
                                                    value={data.title} 
                                                    onChange={e => setData('title', e.target.value)} 
                                                    required 
                                                    className="mt-1.5 block w-full rounded-xl border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm focus:border-indigo-500 focus:ring-indigo-500" 
                                                    placeholder="Contoh: Pengisian 100 Pcs Baju" 
                                                />
                                                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                                            </div>

                                            {/* RUTE ASAL (Origin) */}
                                            <div className="border border-slate-100 dark:border-slate-700/60 p-4 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block animate-ping"></span>
                                                        Cabang Asal
                                                    </span>
                                                    <select 
                                                        onChange={e => handlePresetSelect('origin', parseInt(e.target.value))}
                                                        className="text-[10px] border-none bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-lg py-0.5 px-1.5 font-bold focus:ring-0 cursor-pointer animate-pulse"
                                                    >
                                                        <option value="">Pilih Cabang</option>
                                                        {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                                                    </select>
                                                </div>
                                                <input 
                                                    type="text" 
                                                    value={data.origin_name} 
                                                    onChange={e => setData('origin_name', e.target.value)} 
                                                    required 
                                                    placeholder="Nama Gudang Asal"
                                                    className="block w-full rounded-xl border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <input 
                                                        type="text" 
                                                        value={data.origin_lat} 
                                                        onChange={e => setData('origin_lat', e.target.value)} 
                                                        required 
                                                        placeholder="Latitude Asal"
                                                        className="block w-full rounded-xl border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-xs focus:border-indigo-500 focus:ring-indigo-500 font-mono"
                                                    />
                                                    <input 
                                                        type="text" 
                                                        value={data.origin_lng} 
                                                        onChange={e => setData('origin_lng', e.target.value)} 
                                                        required 
                                                        placeholder="Longitude Asal"
                                                        className="block w-full rounded-xl border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-xs focus:border-indigo-500 focus:ring-indigo-500 font-mono"
                                                    />
                                                </div>
                                            </div>

                                            {/* RUTE TUJUAN (Destination) */}
                                            <div className="border border-slate-100 dark:border-slate-700/60 p-4 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
                                                        Cabang Tujuan
                                                    </span>
                                                    <select 
                                                        onChange={e => handlePresetSelect('destination', parseInt(e.target.value))}
                                                        className="text-[10px] border-none bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg py-0.5 px-1.5 font-bold focus:ring-0 cursor-pointer animate-pulse"
                                                    >
                                                        <option value="">Pilih Cabang</option>
                                                        {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                                                    </select>
                                                </div>
                                                <input 
                                                    type="text" 
                                                    value={data.destination_name} 
                                                    onChange={e => setData('destination_name', e.target.value)} 
                                                    required 
                                                    placeholder="Nama Cabang Tujuan"
                                                    className="block w-full rounded-xl border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <input 
                                                        type="text" 
                                                        value={data.destination_lat} 
                                                        onChange={e => setData('destination_lat', e.target.value)} 
                                                        required 
                                                        placeholder="Latitude Tujuan"
                                                        className="block w-full rounded-xl border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-xs focus:border-indigo-500 focus:ring-indigo-500 font-mono"
                                                    />
                                                    <input 
                                                        type="text" 
                                                        value={data.destination_lng} 
                                                        onChange={e => setData('destination_lng', e.target.value)} 
                                                        required 
                                                        placeholder="Longitude Tujuan"
                                                        className="block w-full rounded-xl border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-xs focus:border-indigo-500 focus:ring-indigo-500 font-mono"
                                                    />
                                                </div>
                                            </div>

                                            {/* TUGASKAN KURIR */}
                                            <div>
                                                <label className="block text-xs font-black uppercase text-slate-400 tracking-wider">Tugaskan Kurir Logistik</label>
                                                <select 
                                                    value={data.courier_id} 
                                                    onChange={e => setData('courier_id', e.target.value)}
                                                    className="mt-1.5 block w-full rounded-xl border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm focus:border-indigo-500 focus:ring-indigo-500 cursor-pointer"
                                                >
                                                    <option value="">-- Pilih Kurir Aktif (Opsional) --</option>
                                                    {couriers.map(c => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* CATATAN TAMBAHAN */}
                                            <div>
                                                <label className="block text-xs font-black uppercase text-slate-400 tracking-wider">Catatan Pengiriman</label>
                                                <textarea 
                                                    value={data.notes} 
                                                    onChange={e => setData('notes', e.target.value)} 
                                                    rows={2}
                                                    className="mt-1.5 block w-full rounded-xl border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm focus:border-indigo-500 focus:ring-indigo-500" 
                                                    placeholder="Keterangan tambahan..." 
                                                />
                                            </div>
                                        </div>

                                        {/* RIGHT COLUMN: INTERACTIVE MAP (SPAN 7) */}
                                        <div className="md:col-span-7 flex flex-col space-y-3">
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b dark:border-slate-700 pb-3">
                                                <div>
                                                    <span className="text-xs font-black uppercase text-slate-400 tracking-wider block">Peta Pemilih Rute</span>
                                                    <span className="text-[10px] text-slate-400 block mt-0.5">Klik/seret penanda rute di peta.</span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {/* Target selector */}
                                                    <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-0.5 font-bold text-[10px] border dark:border-slate-700">
                                                        <button
                                                            type="button"
                                                            onClick={() => setMapTarget('origin')}
                                                            className={`px-2.5 py-1.5 rounded-lg transition-all ${mapTarget === 'origin' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                                                        >
                                                            Set Asal
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setMapTarget('destination')}
                                                            className={`px-2.5 py-1.5 rounded-lg transition-all ${mapTarget === 'destination' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                                                        >
                                                            Set Tujuan
                                                        </button>
                                                    </div>
                                                    
                                                    {/* Search bar */}
                                                    <div className="relative w-44">
                                                        <input
                                                            type="text"
                                                            placeholder="Cari lokasi/jalan..."
                                                            value={searchMapQuery}
                                                            onChange={e => setSearchMapQuery(e.target.value)}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    handleMapSearch();
                                                                }
                                                            }}
                                                            className="w-full pl-2 pr-7 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-[10px] focus:border-indigo-500 focus:ring-0 dark:text-white"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={handleMapSearch}
                                                            disabled={searchLoading}
                                                            className="absolute right-1.5 top-1.5 text-slate-450 hover:text-indigo-500"
                                                        >
                                                            {searchLoading ? (
                                                                <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                                            ) : (
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/60 shadow-inner flex-1 h-[450px] md:h-[480px] min-h-[350px]">
                                                <div 
                                                    ref={mapContainerRef} 
                                                    className="w-full h-full z-10 absolute inset-0 bg-slate-50 dark:bg-slate-900"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-slate-50 dark:bg-slate-700/50 px-6 py-4 flex flex-row-reverse gap-2 border-t border-slate-100 dark:border-slate-700">
                                    <button 
                                        type="submit" 
                                        disabled={processing} 
                                        className="inline-flex justify-center rounded-xl px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {processing ? 'Menyimpan...' : 'Registrasi & Mulai Packing'}
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={closeDialog} 
                                        className="inline-flex justify-center rounded-xl px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700 text-sm font-bold transition-all"
                                    >
                                        Batal
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
