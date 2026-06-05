import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState, useEffect } from 'react';

interface Material {
    id: number;
    name: string;
    unit: string;
    price_per_unit: number;
}

interface SelectedMaterial {
    id: number;
    name: string;
    unit: string;
    price_per_unit: number;
    quantity: number;
}

interface ProductData {
    id: number;
    name: string;
    type: string;
    description: string | null;
    unit: string;
    labor_hours_per_unit: number;
    labor_rate_per_hour: number;
    purchase_price: number;
    other_purchase_cost: number;
    target_margin_percent: number;
    monthly_units: number;
    hpp: number;
    selling_price: number;
    materials: SelectedMaterial[];
}

interface Props {
    product: ProductData;
    materials: Material[];
    total_overhead?: number;
    other_monthly_units?: number;
}

export default function Edit({ product, materials, total_overhead = 0, other_monthly_units = 0 }: Props) {
    const [selectedMats, setSelectedMats] = useState<SelectedMaterial[]>(product.materials);

    const { data, setData, put, processing, errors } = useForm({
        name: product.name,
        description: product.description || '',
        unit: product.unit,
        labor_hours_per_unit: product.labor_hours_per_unit,
        labor_rate_per_hour: product.labor_rate_per_hour,
        purchase_price: product.purchase_price,
        other_purchase_cost: product.other_purchase_cost,
        target_margin_percent: product.target_margin_percent,
        monthly_units: product.monthly_units,
        materials: [] as any[]
    });

    const addMaterialRow = (materialId: number) => {
        const mat = materials.find(m => m.id === materialId);
        if (mat && !selectedMats.some(sm => sm.id === materialId)) {
            setSelectedMats([...selectedMats, {
                id: mat.id,
                name: mat.name,
                unit: mat.unit,
                price_per_unit: mat.price_per_unit,
                quantity: 1
            }]);
        }
    };

    const removeMaterialRow = (materialId: number) => {
        setSelectedMats(selectedMats.filter(sm => sm.id !== materialId));
    };

    const updateQuantity = (materialId: number, qty: number) => {
        setSelectedMats(selectedMats.map(sm => 
            sm.id === materialId ? { ...sm, quantity: Math.max(0.0001, qty) } : sm
        ));
    };

    useEffect(() => {
        setData('materials', selectedMats.map(sm => ({
            id: sm.id,
            quantity: sm.quantity
        })));
    }, [selectedMats]);

    const getMaterialCost = () => {
        return selectedMats.reduce((sum, sm) => sum + (sm.price_per_unit * sm.quantity), 0);
    };

    const getLaborCost = () => {
        const hours = parseFloat(String(data.labor_hours_per_unit)) || 0;
        const rate = parseFloat(String(data.labor_rate_per_hour)) || 0;
        return hours * rate;
    };

    const getOverheadAllocation = () => {
        if (product.type === 'trading') return 0;
        const currentMonthlyUnits = parseFloat(String(data.monthly_units)) || 0;
        const totalUnits = other_monthly_units + currentMonthlyUnits;
        return totalUnits > 0 ? (total_overhead / totalUnits) : 0;
    };

    const getHpp = () => {
        if (product.type === 'trading') {
            const price = parseFloat(String(data.purchase_price)) || 0;
            const other = parseFloat(String(data.other_purchase_cost)) || 0;
            return price + other;
        } else if (product.type === 'manufacturing') {
            return getMaterialCost() + getLaborCost() + getOverheadAllocation();
        } else {
            return getLaborCost() + getOverheadAllocation();
        }
    };

    const getSellingPrice = () => {
        const margin = parseFloat(String(data.target_margin_percent)) || 0;
        return getHpp() * (1 + (margin / 100));
    };

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('admin.hpp.products.update', product.id));
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                            Edit Produk: {product.name}
                        </h2>
                        <p className="text-sm font-medium text-slate-500 mt-1">
                            Sesuaikan parameter biaya HPP dan target margin.
                        </p>
                    </div>
                    <Link
                        href={route('admin.hpp.products.index')}
                        className="text-slate-650 hover:text-slate-900 font-semibold text-sm"
                    >
                        Kembali
                    </Link>
                </div>
            }
        >
            <Head title={`Edit Produk - ${product.name}`} />

            <div className="max-w-4xl mx-auto">
                    
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* Parameter Form */}
                        <div className="lg:col-span-2 space-y-6 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50">
                            
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-700/50 pb-3">Parameter Dasar</h3>
                                <div className="space-y-4 mt-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Nama Produk</label>
                                        <input
                                            type="text"
                                            required
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Satuan Jual</label>
                                            <input
                                                type="text"
                                                required
                                                value={data.unit}
                                                onChange={(e) => setData('unit', e.target.value)}
                                                className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                        {product.type !== 'trading' && (
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Kapasitas Bulanan</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={data.monthly_units === 0 ? '' : data.monthly_units}
                                                    onChange={(e) => setData('monthly_units', e.target.value === '' ? 0 : parseInt(e.target.value))}
                                                    className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Manufacturing-specific recipe editor */}
                            {product.type === 'manufacturing' && (
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 pb-3">Resep / Bahan Baku</h3>
                                    <div className="space-y-4 mt-2">
                                        <select
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    addMaterialRow(parseInt(e.target.value));
                                                    e.target.value = '';
                                                }
                                            }}
                                            className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                        >
                                            <option value="">-- Tambah Bahan Baku --</option>
                                            {materials.map(m => (
                                                <option key={m.id} value={m.id} disabled={selectedMats.some(sm => sm.id === m.id)}>
                                                    {m.name} ({formatRp(m.price_per_unit)} / {m.unit})
                                                </option>
                                            ))}
                                        </select>

                                        {selectedMats.length > 0 ? (
                                            <div className="border border-slate-100 dark:border-slate-700/50 rounded-xl overflow-hidden">
                                                <table className="w-full text-left border-collapse text-xs">
                                                    <thead>
                                                        <tr className="bg-slate-50 dark:bg-slate-900 font-bold text-slate-400 uppercase">
                                                            <th className="px-3 py-2">Bahan</th>
                                                            <th className="px-3 py-2">Jumlah</th>
                                                            <th className="px-3 py-2">Biaya</th>
                                                            <th className="px-3 py-2 text-right">Aksi</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                                        {selectedMats.map(sm => (
                                                            <tr key={sm.id}>
                                                                <td className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-350">{sm.name}</td>
                                                                <td className="px-3 py-2">
                                                                    <div className="flex items-center space-x-1">
                                                                        <input
                                                                            type="number"
                                                                            step="any"
                                                                            value={sm.quantity}
                                                                            onChange={(e) => updateQuantity(sm.id, parseFloat(e.target.value) || 0)}
                                                                            className="w-16 rounded border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-1 text-xs"
                                                                        />
                                                                        <span className="text-slate-400 text-xxs uppercase">{sm.unit}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-3 py-2 font-bold text-slate-700 dark:text-slate-300">{formatRp(sm.price_per_unit * sm.quantity)}</td>
                                                                <td className="px-3 py-2 text-right">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeMaterialRow(sm.id)}
                                                                        className="text-rose-500 hover:text-rose-700 font-bold"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-400">Belum ada bahan baku terpilih.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Direct Purchasing (Trading only) */}
                            {product.type === 'trading' && (
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 pb-3">Biaya Beli</h3>
                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Harga Beli Supplier (Rp)</label>
                                            <input
                                                type="text"
                                                placeholder="0"
                                                value={data.purchase_price === 0 ? '' : formatNumberInput(data.purchase_price)}
                                                onChange={(e) => setData('purchase_price', parseNumberInput(e.target.value))}
                                                className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Ongkir & Biaya Lain (Rp)</label>
                                            <input
                                                type="text"
                                                placeholder="0"
                                                value={data.other_purchase_cost === 0 ? '' : formatNumberInput(data.other_purchase_cost)}
                                                onChange={(e) => setData('other_purchase_cost', parseNumberInput(e.target.value))}
                                                className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Labor hours (Manufacturing & Service only) */}
                            {product.type !== 'trading' && (
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 pb-3">Tenaga Kerja Langsung</h3>
                                    
                                    {/* Tutorial Card */}
                                    <div className="rounded-xl bg-indigo-50/40 dark:bg-indigo-950/10 p-4 border border-indigo-100/80 dark:border-indigo-900/30 text-xs text-slate-650 dark:text-slate-405 leading-relaxed space-y-2.5 mb-4">
                                        <div className="flex items-center space-x-2 text-indigo-800 dark:text-indigo-400 font-bold">
                                            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>💡 Panduan Mengisi untuk Produksi Massal/Batch (Contoh: Ayam Goreng)</span>
                                        </div>
                                        <p>
                                            Jika Anda memproduksi produk sekaligus dalam jumlah banyak (misal: <strong>menggoreng 15 potong ayam sekaligus</strong> dalam waktu <strong>30 menit / 0.5 jam</strong>), berikut cara menghitungnya:
                                        </p>
                                        <ul className="list-disc pl-4 space-y-1">
                                            <li>
                                                <strong>Jam Kerja per Unit:</strong> Bagilah total waktu pengerjaan 1 kali goreng dengan total produk yang dihasilkan. <br />
                                                <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded">0.5 jam ÷ 15 ayam = 0.03 jam</span>. Masukkan angka <strong className="text-indigo-700 dark:text-indigo-400">0.03</strong> di kolom kiri.
                                            </li>
                                             <li>
                                                 <strong>Tarif Upah per Jam:</strong>
                                                 <ul className="list-circle pl-4 mt-1 space-y-1">
                                                     <li><em>Sistem Harian:</em> Upah Rp 80.000 ÷ 8 jam = <strong className="text-indigo-700 dark:text-indigo-400">Rp 10.000/jam</strong>.</li>
                                                     <li><em>Sistem Bulanan:</em> Gaji Rp 2.000.000 ÷ (25 hari × 8 jam) = <strong className="text-indigo-700 dark:text-indigo-400">Rp 10.000/jam</strong>.</li>
                                                 </ul>
                                                 Masukkan angka <strong className="text-indigo-700 dark:text-indigo-400">10,000</strong> di kolom kanan.
                                             </li>
                                        </ul>
                                        <p className="text-[11px] text-slate-500 font-medium italic border-t border-indigo-100/50 dark:border-indigo-900/10 pt-2">
                                            Aplikasi akan otomatis menghitung upah tenaga kerja per potong ayam goreng Anda sebesar Rp 300!
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Jam Kerja per Unit</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={data.labor_hours_per_unit}
                                                onChange={(e) => setData('labor_hours_per_unit', e.target.value as any)}
                                                className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Tarif per Jam (Rp)</label>
                                            <input
                                                type="text"
                                                placeholder="0"
                                                value={data.labor_rate_per_hour === 0 ? '' : formatNumberInput(data.labor_rate_per_hour)}
                                                onChange={(e) => setData('labor_rate_per_hour', parseNumberInput(e.target.value))}
                                                className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Target margin */}
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 pb-3">Penetapan Margin</h3>
                                <div className="mt-2">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Target Margin (%)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="999"
                                        value={data.target_margin_percent}
                                        onChange={(e) => setData('target_margin_percent', e.target.value as any)}
                                        className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                        </div>

                        {/* Summary panel (Sticky right on desktop) */}
                        <div className="space-y-6">
                            <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md space-y-6">
                                <h3 className="text-lg font-extrabold border-b border-slate-800 pb-3">Ringkasan HPP & Rekomendasi</h3>
                                
                                <div className="space-y-4 text-sm">
                                    {product.type === 'manufacturing' && (
                                        <div className="flex justify-between text-slate-400">
                                            <span>Biaya Bahan Baku:</span>
                                            <span className="font-semibold text-white">{formatRp(getMaterialCost())}</span>
                                        </div>
                                    )}
                                    {product.type !== 'trading' && (
                                        <div className="flex justify-between text-slate-400">
                                            <span>Biaya Tenaga Kerja:</span>
                                            <span className="font-semibold text-white">{formatRp(getLaborCost())}</span>
                                        </div>
                                    )}
                                    {product.type !== 'trading' && getOverheadAllocation() > 0 && (
                                        <div className="flex justify-between text-slate-400">
                                            <span>Alokasi Overhead:</span>
                                            <span className="font-semibold text-white">{formatRp(getOverheadAllocation())}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-3">
                                        <span className="font-bold text-indigo-400">Total HPP per Unit:</span>
                                        <span className="font-extrabold text-white text-lg">{formatRp(getHpp())}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-400">
                                        <span>Target Margin Keuntungan:</span>
                                        <span className="font-semibold text-white">{data.target_margin_percent}%</span>
                                    </div>
                                    <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-3">
                                        <span className="font-bold text-emerald-400">Harga Jual Rekomendasi:</span>
                                        <span className="font-extrabold text-emerald-300 text-xl">{formatRp(getSellingPrice())}</span>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition duration-150 shadow"
                                >
                                    {processing ? 'Menyimpan...' : 'Perbarui & Hitung HPP'}
                                </button>
                            </div>
                        </div>

                    </form>
            </div>
        </AuthenticatedLayout>
    );
}
