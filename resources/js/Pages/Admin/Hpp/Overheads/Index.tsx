import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';

interface Overhead {
    id: number;
    name: string;
    monthly_amount: number;
    notes: string | null;
}

interface Props {
    overheads: Overhead[];
    total: number;
}

export default function Index({ overheads, total }: Props) {
    const [isEditMode, setIsEditMode] = useState(false);
    const [activeId, setActiveId] = useState<number | null>(null);
    const [showModal, setShowModal] = useState(false);

    const { data, setData, post, put, delete: destroy, reset, errors, processing } = useForm({
        name: '',
        monthly_amount: 0,
        notes: ''
    });

    const formatRp = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    const formatNumberInput = (val: string | number) => {
        if (!val && val !== 0) return '';
        const cleanStr = String(val).replace(/\D/g, '');
        if (!cleanStr) return '';
        return cleanStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    const parseNumberInput = (val: string) => {
        const cleanStr = val.replace(/\D/g, '');
        return cleanStr ? parseInt(cleanStr, 10) : 0;
    };

    const openAddModal = () => {
        setIsEditMode(false);
        setActiveId(null);
        reset();
        setShowModal(true);
    };

    const openEditModal = (overhead: Overhead) => {
        setIsEditMode(true);
        setActiveId(overhead.id);
        setData({
            name: overhead.name,
            monthly_amount: overhead.monthly_amount,
            notes: overhead.notes || ''
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        reset();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditMode && activeId) {
            put(route('admin.hpp.overheads.update', activeId), {
                onSuccess: () => closeModal(),
            });
        } else {
            post(route('admin.hpp.overheads.store'), {
                onSuccess: () => closeModal(),
            });
        }
    };

    const handleDelete = (id: number, name: string) => {
        if (confirm(`Apakah Anda yakin ingin menghapus biaya overhead "${name}"?`)) {
            destroy(route('admin.hpp.overheads.destroy', id));
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                            Biaya Overhead Tetap
                        </h2>
                        <p className="text-sm font-medium text-slate-500 mt-1">
                            Kelola biaya tetap bulanan (seperti sewa ruko, listrik, air, internet) yang dialokasikan ke HPP produk secara otomatis.
                        </p>
                    </div>
                    <button
                        onClick={openAddModal}
                        className="inline-flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition shadow-sm"
                    >
                        + Tambah Overhead
                    </button>
                </div>
            }
        >
            <Head title="Kelola Biaya Overhead" />

            <div className="space-y-8">
                    
                    {/* Ringkasan Total */}
                    <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-950/10 p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <span className="text-xs text-indigo-700 dark:text-indigo-400 font-bold uppercase tracking-wider block">Total Pengeluaran Tetap Bulanan</span>
                                <h3 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">{formatRp(total)}</h3>
                            </div>
                            <div className="text-left sm:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                                💡 Sistem otomatis membagi total ini dengan volume kapasitas produksi bulanan Anda untuk menetapkan nilai overhead per unit produk.
                            </div>
                        </div>
                    </div>

                    {/* Catalog */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden">
                        
                        {overheads.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                            <th className="px-6 py-4">Nama Pengeluaran</th>
                                            <th className="px-6 py-4">Nominal Bulanan</th>
                                            <th className="px-6 py-4">Keterangan</th>
                                            <th className="px-6 py-4 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm">
                                        {overheads.map((overhead) => (
                                            <tr key={overhead.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-slate-800 dark:text-slate-200">{overhead.name}</div>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100">
                                                    {formatRp(overhead.monthly_amount)}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 dark:text-slate-400 truncate max-w-xs">
                                                    {overhead.notes || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-right space-x-3">
                                                    <button
                                                        onClick={() => openEditModal(overhead)}
                                                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-200 font-semibold text-xs transition"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(overhead.id, overhead.name)}
                                                        className="text-rose-600 dark:text-rose-450 hover:text-rose-900 dark:hover:text-rose-300 font-semibold text-xs transition"
                                                    >
                                                        Hapus
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-12 text-center text-slate-400 dark:text-slate-500">
                                <svg className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-650 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Belum ada pengeluaran overhead</p>
                                <p className="text-xs text-slate-450 dark:text-slate-550 mt-1 mb-6">Tambahkan overhead bulanan agar sistem dapat membebankan biaya tidak langsung secara presisi.</p>
                                <button
                                    onClick={openAddModal}
                                    className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition duration-150"
                                >
                                    + Tambah Pengeluaran Pertama
                                </button>
                            </div>
                        )}
                    </div>

            </div>

            {/* Modal Input Form */}
            {showModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 dark:border-slate-700/50 transform transition-all duration-300">
                        <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-700/50">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                {isEditMode ? 'Edit Pengeluaran Overhead' : 'Tambah Pengeluaran Overhead'}
                            </h3>
                            <button onClick={closeModal} className="text-slate-400 dark:text-slate-500 hover:text-slate-650 text-xl font-bold">×</button>
                        </div>
                        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wide">Nama Pengeluaran</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Sewa Toko, Tagihan Listrik, Internet Kantor"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wide">Nominal Pengeluaran Per Bulan (Rp)</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="0"
                                    value={data.monthly_amount === 0 ? '' : formatNumberInput(data.monthly_amount)}
                                    onChange={(e) => setData('monthly_amount', parseNumberInput(e.target.value))}
                                    className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                                />
                                {errors.monthly_amount && <p className="text-xs text-rose-500 mt-1">{errors.monthly_amount}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wide">Keterangan / Catatan (Opsional)</label>
                                <textarea
                                    placeholder="Spesifikasi biaya, detail langganan, dll"
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 h-20"
                                />
                                {errors.notes && <p className="text-xs text-rose-500 mt-1">{errors.notes}</p>}
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-sm font-semibold rounded-xl"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition"
                                >
                                    {processing ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
