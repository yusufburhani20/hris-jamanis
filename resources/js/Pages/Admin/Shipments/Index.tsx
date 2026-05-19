import { PageProps } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import React, { useState } from 'react';
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

const PRESET_BRANCHES = [
    { name: 'Gudang Pusat Jakarta (Monas)', lat: -6.175392, lng: 106.827153 },
    { name: 'Cabang Bandung (Paskal)', lat: -6.917464, lng: 107.619122 },
    { name: 'Cabang Yogyakarta (Malioboro)', lat: -7.795580, lng: 110.369490 },
    { name: 'Cabang Surabaya (Tunjungan)', lat: -7.257472, lng: 112.752090 },
    { name: 'Cabang Semarang (Simpang Lima)', lat: -6.966667, lng: 110.416664 },
];

export default function ShipmentsIndex({ auth, shipments, couriers }: PageProps<{ shipments: Shipment[], couriers: Courier[] }>) {
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

    const openDialog = () => {
        reset();
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        reset();
    };

    const handlePresetSelect = (type: 'origin' | 'destination', index: number) => {
        const branch = PRESET_BRANCHES[index];
        if (type === 'origin') {
            setData(prev => ({
                ...prev,
                origin_name: branch.name,
                origin_lat: String(branch.lat),
                origin_lng: String(branch.lng),
            }));
        } else {
            setData(prev => ({
                ...prev,
                destination_name: branch.name,
                destination_lat: String(branch.lat),
                destination_lng: String(branch.lng),
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
                        
                        <div className="inline-block align-bottom bg-white dark:bg-slate-800 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl w-full">
                            <form onSubmit={submit}>
                                <div className="bg-white dark:bg-slate-800 px-6 pt-6 pb-4">
                                    <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700/60 mb-4">
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white">Registrasi Pengiriman Stok Cabang</h3>
                                        <button type="button" onClick={closeDialog} className="text-slate-400 hover:text-slate-600">&times;</button>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-black uppercase text-slate-400 tracking-wider">Nama Barang / Deskripsi Stok</label>
                                            <input 
                                                type="text" 
                                                value={data.title} 
                                                onChange={e => setData('title', e.target.value)} 
                                                required 
                                                className="mt-1.5 block w-full rounded-xl border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm focus:border-indigo-500 focus:ring-indigo-500" 
                                                placeholder="Contoh: Pengisian 100 Pcs Baju Muslim Cabang Yogya" 
                                            />
                                            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                                        </div>

                                        {/* RUTE ASAL (Origin) */}
                                        <div className="border border-slate-100 dark:border-slate-700/60 p-4 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                                                    <MapPinIcon className="w-4 h-4 text-blue-500" />
                                                    Warehouse / Cabang Asal
                                                </span>
                                                <select 
                                                    onChange={e => handlePresetSelect('origin', parseInt(e.target.value))}
                                                    className="text-xs border-none bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-lg py-1 px-2 font-bold focus:ring-0 cursor-pointer"
                                                >
                                                    <option value="">Pilih Cabang Preset</option>
                                                    {PRESET_BRANCHES.map((b, i) => <option key={i} value={i}>{b.name.split(' ')[0]}</option>)}
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
                                                    className="block w-full rounded-xl border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-xs focus:border-indigo-500 focus:ring-indigo-500"
                                                />
                                                <input 
                                                    type="text" 
                                                    value={data.origin_lng} 
                                                    onChange={e => setData('origin_lng', e.target.value)} 
                                                    required 
                                                    placeholder="Longitude Asal"
                                                    className="block w-full rounded-xl border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-xs focus:border-indigo-500 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </div>

                                        {/* RUTE TUJUAN (Destination) */}
                                        <div className="border border-slate-100 dark:border-slate-700/60 p-4 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                                                    <MapPinIcon className="w-4 h-4 text-emerald-500" />
                                                    Cabang Tujuan
                                                </span>
                                                <select 
                                                    onChange={e => handlePresetSelect('destination', parseInt(e.target.value))}
                                                    className="text-xs border-none bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg py-1 px-2 font-bold focus:ring-0 cursor-pointer"
                                                >
                                                    <option value="">Pilih Cabang Preset</option>
                                                    {PRESET_BRANCHES.map((b, i) => <option key={i} value={i}>{b.name.split(' ')[0]}</option>)}
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
                                                    className="block w-full rounded-xl border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-xs focus:border-indigo-500 focus:ring-indigo-500"
                                                />
                                                <input 
                                                    type="text" 
                                                    value={data.destination_lng} 
                                                    onChange={e => setData('destination_lng', e.target.value)} 
                                                    required 
                                                    placeholder="Longitude Tujuan"
                                                    className="block w-full rounded-xl border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-xs focus:border-indigo-500 focus:ring-indigo-500"
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
                                                    <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
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
                                                placeholder="Keterangan tambahan (misal: Baju warna merah harap ditaruh terpisah)" 
                                            />
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
