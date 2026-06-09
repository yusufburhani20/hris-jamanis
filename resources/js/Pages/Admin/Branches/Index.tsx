import { PageProps } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import React, { useState, useEffect, useRef } from 'react';
import { 
    MapPinIcon, 
    PlusIcon, 
    PencilIcon, 
    TrashIcon, 
    MagnifyingGlassIcon,
    ArrowPathIcon,
    MapIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationCircleIcon
} from '@heroicons/react/24/outline';

interface Branch {
    id: number;
    name: string;
    address: string | null;
    latitude: number;
    longitude: number;
    is_active: boolean;
    created_at: string;
}

export default function BranchIndex({ auth, branches }: PageProps<{ branches: Branch[] }>) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const { data, setData, post, put, delete: destroy, reset, processing, errors } = useForm({
        name: '',
        address: '',
        latitude: '',
        longitude: '',
        is_active: true,
    });

    // Map-related refs & states
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const [searchMapQuery, setSearchMapQuery] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);

    const handleMapSearch = async () => {
        if (!searchMapQuery.trim()) return;

        setSearchLoading(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchMapQuery)}&limit=1`);
            const results = await response.json();

            if (results && results.length > 0) {
                const result = results[0];
                const lat = parseFloat(result.lat);
                const lng = parseFloat(result.lon);
                const displayName = result.display_name;

                const map = mapRef.current;
                if (map) {
                    map.setView([lat, lng], 15);
                    if (markerRef.current) {
                        markerRef.current.setLatLng([lat, lng]);
                    }
                    
                    setData(prev => ({
                        ...prev,
                        address: displayName,
                        latitude: String(lat.toFixed(6)),
                        longitude: String(lng.toFixed(6))
                    }));
                }
            } else {
                alert("Lokasi tidak ditemukan. Silakan gunakan kata kunci pencarian lainnya.");
            }
        } catch (err) {
            console.error("Gagal melakukan pencarian koordinat:", err);
            alert("Terjadi masalah koneksi saat melacak lokasi.");
        } finally {
            setSearchLoading(false);
        }
    };

    // Initialize map when dialog opens
    useEffect(() => {
        if (!isDialogOpen || typeof window === 'undefined' || !mapContainerRef.current) return;

        const L = (window as any).L;
        if (!L) return;

        // Clean up previous map instance
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }

        const defaultLat = parseFloat(data.latitude) || -6.175392;
        const defaultLng = parseFloat(data.longitude) || 106.827153;

        const pinIcon = L.divIcon({
            html: `<div class="p-2 bg-indigo-600 text-white rounded-full border-2 border-white shadow-lg animate-bounce"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></div>`,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        const map = L.map(mapContainerRef.current).setView([defaultLat, defaultLng], editingBranch ? 14 : 10);
        mapRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        const marker = L.marker([defaultLat, defaultLng], { icon: pinIcon, draggable: true })
            .addTo(map)
            .bindPopup("<b>Lokasi Cabang</b><br>Seret atau klik peta untuk menggeser.");
        markerRef.current = marker;

        // Drag marker event
        marker.on('dragend', function (e: any) {
            const position = marker.getLatLng();
            setData(prev => ({
                ...prev,
                latitude: String(position.lat.toFixed(6)),
                longitude: String(position.lng.toFixed(6))
            }));
        });

        // Click map event
        map.on('click', function (e: any) {
            const position = e.latlng;
            marker.setLatLng(position);
            setData(prev => ({
                ...prev,
                latitude: String(position.lat.toFixed(6)),
                longitude: String(position.lng.toFixed(6))
            }));
        });

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
            markerRef.current = null;
        };
    }, [isDialogOpen]);

    // Keep map marker position in sync if coordinates are manually typed
    useEffect(() => {
        if (!isDialogOpen || !mapRef.current || !markerRef.current) return;

        const typedLat = parseFloat(data.latitude);
        const typedLng = parseFloat(data.longitude);

        if (isNaN(typedLat) || isNaN(typedLng)) return;

        const currentMarkerLatLng = markerRef.current.getLatLng();
        if (Math.abs(currentMarkerLatLng.lat - typedLat) > 0.0001 || Math.abs(currentMarkerLatLng.lng - typedLng) > 0.0001) {
            markerRef.current.setLatLng([typedLat, typedLng]);
            mapRef.current.panTo([typedLat, typedLng]);
        }
    }, [data.latitude, data.longitude]);

    const openDialog = (branch?: Branch) => {
        if (branch) {
            setEditingBranch(branch);
            setData({
                name: branch.name,
                address: branch.address || '',
                latitude: String(branch.latitude),
                longitude: String(branch.longitude),
                is_active: branch.is_active,
            });
            setSearchMapQuery(branch.name);
        } else {
            setEditingBranch(null);
            reset();
            setSearchMapQuery('');
        }
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        reset();
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingBranch) {
            put(route('admin.branches.update', editingBranch.id), {
                onSuccess: () => closeDialog(),
            });
        } else {
            post(route('admin.branches.store'), {
                onSuccess: () => closeDialog(),
            });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('APAKAH ANDA YAKIN ingin menghapus data kantor cabang ini? Cabang yang terhubung pada riwayat pengiriman logistik mungkin akan kehilangan referensi nama.')) {
            destroy(route('admin.branches.destroy', id));
        }
    };

    // Filter branches based on query and status
    const filteredBranches = branches.filter(branch => {
        const matchesSearch = 
            branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (branch.address && branch.address.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesStatus = 
            statusFilter === 'all' || 
            (statusFilter === 'active' && branch.is_active) ||
            (statusFilter === 'inactive' && !branch.is_active);

        return matchesSearch && matchesStatus;
    });

    const activeCount = branches.filter(b => b.is_active).length;
    const inactiveCount = branches.length - activeCount;

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-slate-800 dark:text-slate-200 leading-tight">Manajemen Kantor Cabang</h2>}
        >
            <Head title="Kelola Cabang" />

            <div className="py-6 max-w-7xl mx-auto space-y-6">
                
                {/* HERO HEADER */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-indigo-500/20">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                            <MapIcon className="w-7 h-7 text-indigo-400" />
                            Kelola Lokasi Cabang & Gudang
                        </h1>
                        <p className="text-xs text-slate-300 max-w-xl">Daftarkan seluruh titik distribusi logistik (cabang retail / gudang penyimpanan) beserta koordinat presisi untuk memudahkan pemetaan pengiriman resi KIR.</p>
                    </div>
                    <button
                        onClick={() => openDialog()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl flex items-center space-x-2 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 whitespace-nowrap"
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span>Daftarkan Cabang Baru</span>
                    </button>
                </div>

                {/* STATS COUNT */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm flex items-center space-x-4">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-xl">
                            <MapPinIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Cabang</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{branches.length}</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm flex items-center space-x-4">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 rounded-xl">
                            <CheckCircleIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Aktif Beroperasi</p>
                            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{activeCount}</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm flex items-center space-x-4">
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-500 rounded-xl">
                            <XCircleIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Non-Aktif / Tutup</p>
                            <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{inactiveCount}</p>
                        </div>
                    </div>
                </div>

                {/* SEARCH & FILTERS */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-80">
                        <input
                            type="text"
                            placeholder="Cari nama cabang, alamat..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-4 pr-10 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:text-white"
                        />
                    </div>
                    
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                        {['all', 'active', 'inactive'].map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setStatusFilter(filter)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap capitalize transition-all ${
                                    statusFilter === filter
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                }`}
                            >
                                {filter === 'all' ? 'Semua Cabang' : filter === 'active' ? 'Aktif' : 'Non-Aktif'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* BRANCHES LIST TABLE */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700/60">
                                    <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-wider">Nama Cabang / Gudang</th>
                                    <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-wider">Alamat Lengkap</th>
                                    <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-wider">Koordinat GPS</th>
                                    <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-wider text-center">Status</th>
                                    <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-wider text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                {filteredBranches.map((branch) => (
                                    <tr key={branch.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <div className={`p-2 rounded-xl border ${branch.is_active ? 'bg-indigo-50 border-indigo-100 text-indigo-500 dark:bg-indigo-950/20 dark:border-indigo-900/40' : 'bg-slate-100 border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-800'}`}>
                                                    <MapPinIcon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-slate-950 dark:text-white block">{branch.name}</span>
                                                    <span className="text-[10px] text-slate-400">Terdaftar: {new Date(branch.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-350 max-w-xs truncate">
                                            {branch.address || <span className="italic text-slate-400">Tidak ada alamat tertulis</span>}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono text-slate-700 dark:text-slate-300">
                                            <div className="space-y-0.5">
                                                <div>Lat: {branch.latitude}</div>
                                                <div>Lng: {branch.longitude}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${branch.is_active ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400'}`}>
                                                {branch.is_active ? 'Aktif' : 'Tutup'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end space-x-2">
                                                <button
                                                    onClick={() => openDialog(branch)}
                                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-indigo-600 dark:text-indigo-400 transition-colors"
                                                    title="Edit Cabang"
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(branch.id)}
                                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-rose-600 dark:text-rose-400 transition-colors"
                                                    title="Hapus Cabang"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredBranches.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-450 dark:text-slate-500 italic">
                                            Tidak ada cabang terdaftar yang cocok dengan filter pencarian.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* DIALOG FORM TAMBAH / EDIT CABANG */}
            {isDialogOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={closeDialog}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        
                        <div className="inline-block align-bottom bg-white dark:bg-slate-800 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl w-full">
                            <form onSubmit={submit}>
                                <div className="bg-white dark:bg-slate-800 px-6 pt-6 pb-4">
                                    <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700/60 mb-4">
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white" id="modal-title">
                                            {editingBranch ? `Sunting Cabang: ${editingBranch.name}` : 'Registrasi Cabang Baru'}
                                        </h3>
                                        <button type="button" onClick={closeDialog} className="text-slate-450 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold">&times;</button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                        
                                        {/* FORM INPUT (LEFT SPAN 5) */}
                                        <div className="md:col-span-5 space-y-4">
                                            <div>
                                                <label className="block text-xs font-black uppercase text-slate-400 tracking-wider">Nama Cabang / Gudang</label>
                                                <input 
                                                    type="text" 
                                                    value={data.name} 
                                                    onChange={e => setData('name', e.target.value)} 
                                                    required 
                                                    className="mt-1.5 block w-full rounded-xl border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm focus:border-indigo-500 focus:ring-indigo-500" 
                                                    placeholder="Contoh: Cabang Bandung (Paskal)" 
                                                />
                                                {errors.name && <p className="text-rose-500 text-xs mt-1">{errors.name}</p>}
                                            </div>

                                            <div>
                                                <label className="block text-xs font-black uppercase text-slate-400 tracking-wider">Alamat Lengkap</label>
                                                <textarea 
                                                    value={data.address} 
                                                    onChange={e => setData('address', e.target.value)} 
                                                    rows={3}
                                                    className="mt-1.5 block w-full rounded-xl border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm focus:border-indigo-500 focus:ring-indigo-500" 
                                                    placeholder="Jl. Pasir Kaliki No. 25, Bandung" 
                                                />
                                                {errors.address && <p className="text-rose-500 text-xs mt-1">{errors.address}</p>}
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-black uppercase text-slate-400 tracking-wider">Latitude</label>
                                                    <input 
                                                        type="text" 
                                                        value={data.latitude} 
                                                        onChange={e => setData('latitude', e.target.value)} 
                                                        required 
                                                        className="mt-1.5 block w-full rounded-xl border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-white text-xs font-mono" 
                                                        placeholder="-6.917464" 
                                                    />
                                                    {errors.latitude && <p className="text-rose-500 text-xs mt-1">{errors.latitude}</p>}
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-black uppercase text-slate-400 tracking-wider">Longitude</label>
                                                    <input 
                                                        type="text" 
                                                        value={data.longitude} 
                                                        onChange={e => setData('longitude', e.target.value)} 
                                                        required 
                                                        className="mt-1.5 block w-full rounded-xl border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-white text-xs font-mono" 
                                                        placeholder="107.619122" 
                                                    />
                                                    {errors.longitude && <p className="text-rose-500 text-xs mt-1">{errors.longitude}</p>}
                                                </div>
                                            </div>

                                            <div className="flex items-center bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                                <input 
                                                    type="checkbox" 
                                                    checked={data.is_active} 
                                                    onChange={e => setData('is_active', e.target.checked)} 
                                                    id="is_active" 
                                                    className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-900 dark:border-slate-700" 
                                                />
                                                <label htmlFor="is_active" className="ml-2 block text-xs font-bold text-slate-700 dark:text-slate-300 select-none cursor-pointer">Cabang Aktif & Dapat Digunakan</label>
                                            </div>
                                        </div>

                                        {/* INTERACTIVE MAP (RIGHT SPAN 7) */}
                                        <div className="md:col-span-7 flex flex-col space-y-3">
                                            <div>
                                                <label className="block text-xs font-black uppercase text-slate-400 tracking-wider">Cari Lokasi di Peta</label>
                                                <div className="flex gap-2 mt-1.5">
                                                    <input 
                                                        type="text" 
                                                        placeholder="Ketik kota, gedung, atau jalan..." 
                                                        value={searchMapQuery} 
                                                        onChange={e => setSearchMapQuery(e.target.value)} 
                                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleMapSearch())}
                                                        className="flex-1 rounded-xl border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm focus:border-indigo-500" 
                                                    />
                                                    <button 
                                                        type="button" 
                                                        onClick={handleMapSearch}
                                                        disabled={searchLoading}
                                                        className="px-4 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-xl text-xs flex items-center gap-1 active:scale-95 disabled:opacity-50"
                                                    >
                                                        {searchLoading ? (
                                                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <MagnifyingGlassIcon className="w-4 h-4" />
                                                        )}
                                                        <span>Cari</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* MAP CANVAS */}
                                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-inner flex-1 min-h-[300px] md:min-h-[340px] relative z-10">
                                                <div 
                                                    ref={mapContainerRef} 
                                                    className="absolute inset-0 z-0 bg-slate-50" 
                                                />
                                            </div>
                                            <span className="text-[10px] text-slate-400 italic">💡 Petunjuk: Anda bisa mengklik di mana saja pada peta atau menyeret marker merah untuk memindahkan koordinat pin.</span>
                                        </div>

                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900/60 px-6 py-4 border-t border-slate-100 dark:border-slate-700/60 flex justify-end space-x-3">
                                    <button 
                                        type="button" 
                                        onClick={closeDialog} 
                                        className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                                    >
                                        Batal
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={processing}
                                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {processing ? 'Menyimpan...' : 'Simpan Cabang'}
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
