import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';

interface Material {
    id: number;
    name: string;
    unit: string;
    price_per_unit: number;
    notes: string | null;
}

interface Props {
    materials: Material[];
}

export default function Index({ materials }: Props) {
    const [isEditMode, setIsEditMode] = useState(false);
    const [activeId, setActiveId] = useState<number | null>(null);
    const [showModal, setShowModal] = useState(false);

    const { data, setData, post, put, delete: destroy, reset, errors, processing } = useForm({
        name: '',
        unit: 'gram',
        price_per_unit: 0,
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

    const openEditModal = (material: Material) => {
        setIsEditMode(true);
        setActiveId(material.id);
        setData({
            name: material.name,
            unit: material.unit,
            price_per_unit: material.price_per_unit,
            notes: material.notes || ''
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
            put(route('admin.hpp.materials.update', activeId), {
                onSuccess: () => closeModal(),
            });
        } else {
            post(route('admin.hpp.materials.store'), {
                onSuccess: () => closeModal(),
            });
        }
    };

    const handleDelete = (id: number, name: string) => {
        if (confirm(`Apakah Anda yakin ingin menghapus bahan baku "${name}"?`)) {
            destroy(route('admin.hpp.materials.destroy', id));
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                            Database Bahan Baku
                        </h2>
                        <p className="text-sm font-medium text-slate-500 mt-1">
                            Simpan database harga beli bahan baku Anda untuk dasar perhitungan resep produk.
                        </p>
                    </div>
                    <button
                        onClick={openAddModal}
                        className="inline-flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition shadow-sm"
                    >
                        + Tambah Bahan Baku
                    </button>
                </div>
            }
        >
            <Head title="Kelola Bahan Baku" />

            <div>
                    
                    {/* Catalog */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden">
                        
                        {materials.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                            <th className="px-6 py-4">Nama Bahan</th>
                                            <th className="px-6 py-4">Satuan Takar</th>
                                            <th className="px-6 py-4">Harga Beli Per Satuan</th>
                                            <th className="px-6 py-4">Catatan</th>
                                            <th className="px-6 py-4 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm">
                                        {materials.map((material) => (
                                            <tr key={material.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-slate-800 dark:text-slate-200">{material.name}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase">
                                                        {material.unit}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100">
                                                    {formatRp(material.price_per_unit)}
                                                    <span className="text-xs font-normal text-slate-400"> / {material.unit}</span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 dark:text-slate-400 truncate max-w-xs">
                                                    {material.notes || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-right space-x-3">
                                                    <button
                                                        onClick={() => openEditModal(material)}
                                                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-200 font-semibold text-xs transition"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(material.id, material.name)}
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
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Belum ada bahan baku</p>
                                <p className="text-xs text-slate-450 dark:text-slate-550 mt-1 mb-6">Database bahan baku digunakan untuk menghitung biaya resep secara otomatis.</p>
                                <button
                                    onClick={openAddModal}
                                    className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition duration-150"
                                >
                                    + Tambah Bahan Pertama
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
                                {isEditMode ? 'Edit Bahan Baku' : 'Tambah Bahan Baku Baru'}
                            </h3>
                            <button onClick={closeModal} className="text-slate-400 dark:text-slate-500 hover:text-slate-650 text-xl font-bold">×</button>
                        </div>
                        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wide">Nama Bahan</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Tepung Terigu, Gula Pasir, Kain Garmen"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wide">Satuan</label>
                                    <select
                                        value={data.unit}
                                        onChange={(e) => setData('unit', e.target.value)}
                                        className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    >
                                        <option value="pcs">Pcs / Buah</option>
                                        <option value="gram">Gram (g)</option>
                                        <option value="kg">Kilogram (kg)</option>
                                        <option value="ml">Mililiter (ml)</option>
                                        <option value="liter">Liter (L)</option>
                                        <option value="meter">Meter (m)</option>
                                    </select>
                                    {errors.unit && <p className="text-xs text-rose-500 mt-1">{errors.unit}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wide">Harga Satuan (Rp)</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="0"
                                        value={data.price_per_unit === 0 ? '' : formatNumberInput(data.price_per_unit)}
                                        onChange={(e) => setData('price_per_unit', parseNumberInput(e.target.value))}
                                        className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                                    />
                                    {errors.price_per_unit && <p className="text-xs text-rose-500 mt-1">{errors.price_per_unit}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wide">Catatan Tambahan (Opsional)</label>
                                <textarea
                                    placeholder="Spesifikasi bahan, supplier, dll"
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
