import { PageProps } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import React, { useState } from 'react';
import { 
    TruckIcon, 
    MapPinIcon, 
    ClipboardDocumentIcon, 
    CheckCircleIcon, 
    ClockIcon, 
    ArrowRightIcon,
    CameraIcon,
    PlusIcon
} from '@heroicons/react/24/outline';

interface Shipment {
    id: number;
    tracking_number: string;
    title: string;
    origin_name: string;
    destination_name: string;
    status: 'packing' | 'picked_up' | 'in_transit' | 'delivered' | 'failed';
    notes: string | null;
    created_at: string;
    delivery_photo: string | null;
}

interface Branch {
    id: number;
    name: string;
    address: string | null;
    latitude: number;
    longitude: number;
}

export default function CourierIndex({ auth, shipments, branches }: PageProps<{ shipments: Shipment[], branches: Branch[] }>) {
    const [filterTab, setFilterTab] = useState<'active' | 'history'>('active');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // useForm helper for starting a trip
    const { data, setData, post, processing, errors, reset } = useForm({
        notes: '',
        origin_branch_id: '',
    });

    // Categorize assignments
    const activeDeliveries = shipments.filter(s => s.status !== 'delivered' && s.status !== 'failed');
    const completedDeliveries = shipments.filter(s => s.status === 'delivered' || s.status === 'failed');

    const visibleShipments = filterTab === 'active' ? activeDeliveries : completedDeliveries;

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert(`Resi ${text} berhasil disalin!`);
    };

    const handleSelfInitiateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('courier.shipments.self-initiate'), {
            onSuccess: () => {
                setIsModalOpen(false);
                reset();
            }
        });
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-slate-800 dark:text-slate-200 leading-tight">Daftar Tugas Pengiriman Kurir</h2>}
        >
            <Head title="Tugas Pengiriman" />

            <div className="py-6 max-w-4xl mx-auto space-y-6">
                
                {/* DRIVER WELCOME HEADER WITH SELF-INITIATED TRIP BUTTON */}
                <div className="bg-gradient-to-r from-slate-800 to-indigo-950 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                        <div className="p-3.5 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20 flex-shrink-0">
                            <TruckIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black tracking-tight">Halo, {auth.user.name}!</h1>
                            <p className="text-xs text-slate-300">Berikut adalah daftar stok pengisian cabang yang ditugaskan kepada Anda. Harap pancarkan GPS saat berkendara.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center space-x-1.5 whitespace-nowrap self-start md:self-auto"
                    >
                        <PlusIcon className="w-4 h-4" />
                        <span>Buat Perjalanan Mandiri</span>
                    </button>
                </div>

                {/* TASK SUMMARY COUNTER */}
                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => setFilterTab('active')}
                        className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                            filterTab === 'active'
                                ? 'bg-white dark:bg-slate-800 border-indigo-500 shadow-md ring-1 ring-indigo-500'
                                : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700/60 shadow-sm hover:bg-slate-50/50'
                        }`}
                    >
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tugas Aktif</span>
                            <ClockIcon className="w-5 h-5 text-indigo-500" />
                        </div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{activeDeliveries.length}</p>
                        {filterTab === 'active' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600" />}
                    </button>

                    <button 
                        onClick={() => setFilterTab('history')}
                        className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                            filterTab === 'history'
                                ? 'bg-white dark:bg-slate-800 border-indigo-500 shadow-md ring-1 ring-indigo-500'
                                : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700/60 shadow-sm hover:bg-slate-50/50'
                        }`}
                    >
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Selesai / Gagal</span>
                            <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                        </div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{completedDeliveries.length}</p>
                        {filterTab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600" />}
                    </button>
                </div>

                {/* TASK ITEMS LIST */}
                <div className="space-y-4">
                    {visibleShipments.map((shipment) => (
                        <div 
                            key={shipment.id}
                            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm p-5 space-y-4 hover:shadow-md transition-shadow"
                        >
                            {/* Card Header */}
                            <div className="flex justify-between items-start gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center space-x-2">
                                        <span className="font-mono font-bold text-slate-900 dark:text-white">{shipment.tracking_number}</span>
                                        <button 
                                            onClick={() => copyToClipboard(shipment.tracking_number)}
                                            className="text-slate-400 hover:text-slate-600"
                                        >
                                            <ClipboardDocumentIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">{shipment.title}</h3>
                                </div>
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    shipment.status === 'packing' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                                    shipment.status === 'picked_up' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                    shipment.status === 'in_transit' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' :
                                    shipment.status === 'delivered' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                    'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                                }`}>
                                    {shipment.status === 'packing' ? 'Dikemas' :
                                     shipment.status === 'picked_up' ? 'Kurir Pick' :
                                     shipment.status === 'in_transit' ? 'Di Perjalanan' :
                                     shipment.status === 'delivered' ? 'Diterima' : 'Gagal'}
                                </span>
                            </div>

                            {/* Origin -> Destination Route Details */}
                            <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                                <div className="space-y-0.5">
                                    <div className="text-[10px] text-slate-400 font-bold uppercase">Asal Gudang</div>
                                    <div className="font-bold text-slate-800 dark:text-slate-100">{shipment.origin_name}</div>
                                </div>
                                <ArrowRightIcon className="w-4 h-4 text-slate-400 flex-shrink-0 mx-2" />
                                <div className="space-y-0.5 text-right">
                                    <div className="text-[10px] text-slate-400 font-bold uppercase">Cabang Tujuan</div>
                                    <div className="font-bold text-slate-800 dark:text-slate-100">{shipment.destination_name}</div>
                                </div>
                            </div>

                            {/* Additional info */}
                            {shipment.notes && (
                                <p className="text-xs text-slate-400 italic"><b>Catatan:</b> {shipment.notes}</p>
                            )}

                            {/* Uploaded photo thumbnail if delivered */}
                            {shipment.delivery_photo && (
                                <div className="flex items-center space-x-3 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 p-2.5 rounded-xl">
                                    <img 
                                        src={`/storage/${shipment.delivery_photo}`} 
                                        alt="Bukti Pengiriman" 
                                        className="w-12 h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-700" 
                                    />
                                    <div>
                                        <div className="text-xs font-black text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                                            <CheckCircleIcon className="w-4 h-4" />
                                            Bukti Foto Terunggah
                                        </div>
                                        <a 
                                            href={`/storage/${shipment.delivery_photo}`} 
                                            target="_blank" 
                                            className="text-[10px] text-indigo-500 font-bold hover:underline"
                                        >
                                            Lihat Foto Ukuran Penuh
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* Card Footer Actions */}
                            {shipment.status !== 'delivered' && shipment.status !== 'failed' && (
                                <div className="flex justify-end pt-2">
                                    <Link
                                        href={route('courier.shipments.show', shipment.id)}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 active:scale-95 flex items-center space-x-1.5"
                                    >
                                        <CameraIcon className="w-4 h-4" />
                                        <span>Buka Navigator & Unggah Bukti</span>
                                    </Link>
                                </div>
                            )}
                        </div>
                    ))}

                    {visibleShipments.length === 0 && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm p-12 text-center text-slate-400 dark:text-slate-500">
                            Tidak ada tugas pengiriman yang ditemukan untuk kategori ini.
                        </div>
                    )}
                </div>

            </div>

            {/* SELF INITIATED TRIP MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-2xl max-w-md w-full overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                            <h3 className="font-black text-slate-900 dark:text-white text-lg">Mulai Perjalanan Mandiri</h3>
                            <button 
                                onClick={() => { setIsModalOpen(false); reset(); }} 
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSelfInitiateSubmit} className="p-6 space-y-4">
                            <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl text-xs space-y-2 border border-slate-100 dark:border-slate-800 select-none">
                                <p className="font-bold text-indigo-600 dark:text-indigo-400">📍 Informasi Perjalanan Mandiri:</p>
                                <p className="text-slate-500">Tujuan akhir perjalanan akan otomatis diset ke <b>Perjalanan Mandiri</b>. Anda dapat memilih cabang asal dan mengambil foto checkpoint sepanjang jalan untuk mencatat pengiriman secara dinamis.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Cabang Asal</label>
                                <select
                                    value={data.origin_branch_id}
                                    onChange={e => setData('origin_branch_id', e.target.value)}
                                    required
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-sm dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                                >
                                    <option value="">-- Pilih Cabang Asal --</option>
                                    {branches && branches.map(branch => (
                                        <option key={branch.id} value={branch.id}>
                                            {branch.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.origin_branch_id && <p className="text-rose-500 text-xs mt-1">{errors.origin_branch_id}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Catatan Perjalanan (Opsional)</label>
                                <textarea
                                    value={data.notes}
                                    onChange={e => setData('notes', e.target.value)}
                                    rows={3}
                                    placeholder="Tuliskan tujuan khusus, rincian barang, atau instruksi..."
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-sm dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                                />
                                {errors.notes && <p className="text-rose-500 text-xs mt-1">{errors.notes}</p>}
                            </div>

                            <div className="flex justify-end space-x-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setIsModalOpen(false); reset(); }}
                                    className="px-4 py-2 text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50 transition-all shadow-md shadow-indigo-600/10"
                                >
                                    {processing ? 'Menyimpan...' : 'Mulai Jalan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
