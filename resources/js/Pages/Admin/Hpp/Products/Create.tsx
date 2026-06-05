import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState, useEffect } from 'react';

interface Material {
    id: number;
    name: string;
    unit: string;
    price_per_unit: number;
}

interface Props {
    materials: Material[];
    total_overhead?: number;
    other_monthly_units?: number;
}

interface SelectedMaterial {
    id: number;
    name: string;
    unit: string;
    price_per_unit: number;
    quantity: number;
}

export default function Create({ materials, total_overhead = 0, other_monthly_units = 0 }: Props) {
    const [step, setStep] = useState(0); // Step 0 is Select Type
    const [selectedType, setSelectedType] = useState<string>(''); // manufacturing | trading | service
    const [selectedMats, setSelectedMats] = useState<SelectedMaterial[]>([]);
    
    // Form fields
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        type: '',
        description: '',
        unit: 'pcs',
        labor_hours_per_unit: 0,
        labor_rate_per_hour: 0,
        purchase_price: 0,
        other_purchase_cost: 0,
        target_margin_percent: 30,
        monthly_units: 100,
        materials: [] as any[]
    });

    // Handle type selection
    const selectType = (type: string) => {
        setSelectedType(type);
        setData('type', type);
        setStep(1);
    };

    // Recipe editor helpers
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

    // Update inertia form materials on change
    useEffect(() => {
        setData('materials', selectedMats.map(sm => ({
            id: sm.id,
            quantity: sm.quantity
        })));
    }, [selectedMats]);

    // Live Calculation Simulations
    const getMaterialCost = () => {
        return selectedMats.reduce((sum, sm) => sum + (sm.price_per_unit * sm.quantity), 0);
    };

    const getLaborCost = () => {
        const hours = parseFloat(String(data.labor_hours_per_unit)) || 0;
        const rate = parseFloat(String(data.labor_rate_per_hour)) || 0;
        return hours * rate;
    };

    const getOverheadAllocation = () => {
        if (selectedType === 'trading') return 0;
        const currentMonthlyUnits = parseFloat(String(data.monthly_units)) || 0;
        const totalUnits = other_monthly_units + currentMonthlyUnits;
        return totalUnits > 0 ? (total_overhead / totalUnits) : 0;
    };

    const getHpp = () => {
        if (selectedType === 'trading') {
            const price = parseFloat(String(data.purchase_price)) || 0;
            const other = parseFloat(String(data.other_purchase_cost)) || 0;
            return price + other;
        } else if (selectedType === 'manufacturing') {
            return getMaterialCost() + getLaborCost() + getOverheadAllocation();
        } else { // Service
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
        post(route('admin.hpp.products.store'));
    };

    const renderManufacturingSteps = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Langkah 1: Informasi Dasar Produk</h3>
                        <p className="text-sm text-slate-500">Beri nama produk Anda dan tetapkan satuan jualnya.</p>
                        
                        <div className="space-y-4 pt-2">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Nama Produk</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Roti Sobek Keju, Kaos Distro Sablon"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Satuan Jual</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: pcs, porsi, bungkus, kg"
                                        value={data.unit}
                                        onChange={(e) => setData('unit', e.target.value)}
                                        className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Estimasi Produksi / Bulan</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={data.monthly_units === 0 ? '' : data.monthly_units}
                                        onChange={(e) => setData('monthly_units', e.target.value === '' ? 0 : parseInt(e.target.value))}
                                        className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Keterangan (Opsional)</label>
                                <textarea
                                    placeholder="Penjelasan singkat mengenai produk..."
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 h-24"
                                />
                            </div>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Langkah 2: Resep & Kebutuhan Bahan Baku</h3>
                        <p className="text-sm text-slate-500">Pilih bahan baku dari database Anda dan masukkan jumlah pemakaian per unit produk.</p>
                        
                        <div className="space-y-4 pt-2">
                            {/* Selector */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Pilih Bahan Baku</label>
                                <select
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            addMaterialRow(parseInt(e.target.value));
                                            e.target.value = '';
                                        }
                                    }}
                                    className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                >
                                    <option value="">-- Klik untuk memilih bahan baku --</option>
                                    {materials.map(m => (
                                        <option key={m.id} value={m.id} disabled={selectedMats.some(sm => sm.id === m.id)}>
                                            {m.name} ({formatRp(m.price_per_unit)} / {m.unit})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Table of selected ingredients */}
                            {selectedMats.length > 0 ? (
                                <div className="border border-slate-100 dark:border-slate-700/50 rounded-xl overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-400 uppercase">
                                                <th className="px-4 py-3">Bahan</th>
                                                <th className="px-4 py-3">Pemakaian Per Unit</th>
                                                <th className="px-4 py-3">Biaya Takaran</th>
                                                <th className="px-4 py-3 text-right">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm">
                                            {selectedMats.map(sm => (
                                                <tr key={sm.id}>
                                                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                                                        {sm.name}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center space-x-2">
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                min="0.0001"
                                                                value={sm.quantity}
                                                                onChange={(e) => updateQuantity(sm.id, parseFloat(e.target.value) || 0)}
                                                                className="w-20 rounded-lg border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-2 py-1 text-sm focus:ring-1 focus:ring-indigo-500"
                                                            />
                                                            <span className="text-slate-400 text-xs">{sm.unit}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">
                                                        {formatRp(sm.price_per_unit * sm.quantity)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeMaterialRow(sm.id)}
                                                            className="text-rose-500 hover:text-rose-700 font-bold"
                                                        >
                                                            Hapus
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr className="bg-slate-50 dark:bg-slate-900 font-bold text-slate-800 dark:text-slate-200">
                                                <td colSpan={2} className="px-4 py-3">Total Biaya Bahan Baku</td>
                                                <td colSpan={2} className="px-4 py-3 text-indigo-600 dark:text-indigo-400">
                                                    {formatRp(getMaterialCost())}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-8 text-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-700/50">
                                    Belum ada bahan baku yang dipilih untuk resep produk.
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Langkah 3: Biaya Tenaga Kerja Langsung</h3>
                        <p className="text-sm text-slate-500">Estimasi waktu pengerjaan per unit produk dan upah pekerja Anda.</p>
                        
                        <div className="space-y-4 pt-2">
                            {/* Tutorial Card */}
                            <div className="rounded-xl bg-indigo-50/40 dark:bg-indigo-950/10 p-4 border border-indigo-100/80 dark:border-indigo-900/30 text-xs text-slate-650 dark:text-slate-405 leading-relaxed space-y-2.5">
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Jam Pengerjaan Per Unit</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="Contoh: 0.5 (setengah jam)"
                                        value={data.labor_hours_per_unit}
                                        onChange={(e) => setData('labor_hours_per_unit', e.target.value as any)}
                                        className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Tarif Upah Per Jam (Rp)</label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: 15,000"
                                        value={data.labor_rate_per_hour === 0 ? '' : formatNumberInput(data.labor_rate_per_hour)}
                                        onChange={(e) => setData('labor_rate_per_hour', parseNumberInput(e.target.value))}
                                        className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 font-mono"
                                    />
                                </div>
                            </div>
                            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/10 p-4 border border-indigo-100 dark:border-indigo-900/30 flex justify-between items-center">
                                <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Total Upah Tenaga Kerja Per Unit:</span>
                                <span className="font-extrabold text-indigo-700 dark:text-indigo-400 text-lg">{formatRp(getLaborCost())}</span>
                            </div>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Langkah 4: Target Margin Keuntungan</h3>
                        <p className="text-sm text-slate-500">Tentukan persentase keuntungan bersih yang Anda inginkan.</p>
                        
                        <div className="space-y-4 pt-2">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Target Margin Keuntungan (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="999"
                                    placeholder="Contoh: 30"
                                    value={data.target_margin_percent}
                                    onChange={(e) => setData('target_margin_percent', e.target.value as any)}
                                    className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1"
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-700/50 text-center">
                                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                    <span className="text-xs text-slate-400 dark:text-slate-500 block font-semibold">ESTIMASI HPP</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{formatRp(getHpp())}</span>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                    <span className="text-xs text-slate-400 dark:text-slate-500 block font-semibold">LABA KOTOR</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatRp(getSellingPrice() - getHpp())}</span>
                                </div>
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl">
                                    <span className="text-xs text-indigo-600 dark:text-indigo-400 block font-bold">HARGA REKOMENDASI</span>
                                    <span className="font-extrabold text-indigo-700 dark:text-indigo-300">{formatRp(getSellingPrice())}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const renderTradingSteps = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Langkah 1: Informasi Dasar Produk</h3>
                        <p className="text-sm text-slate-500">Nama produk dagang Anda dan satuan jualnya.</p>
                        
                        <div className="space-y-4 pt-2">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Nama Produk Dagang</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Sepatu Kulit Import, Jam Tangan Kayu"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Satuan Jual</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: pcs, unit, pasang"
                                    value={data.unit}
                                    onChange={(e) => setData('unit', e.target.value)}
                                    className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Langkah 2: Biaya Pembelian Barang</h3>
                        <p className="text-sm text-slate-500">Masukkan harga beli awal dari supplier beserta biaya pengiriman/ongkir.</p>
                        
                        <div className="space-y-4 pt-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Harga Beli Supplier (Rp)</label>
                                    <input
                                        type="text"
                                        placeholder="0"
                                        value={data.purchase_price === 0 ? '' : formatNumberInput(data.purchase_price)}
                                        onChange={(e) => setData('purchase_price', parseNumberInput(e.target.value))}
                                        className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:border-indigo-500 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Ongkir & Biaya Lain (Rp)</label>
                                    <input
                                        type="text"
                                        placeholder="0"
                                        value={data.other_purchase_cost === 0 ? '' : formatNumberInput(data.other_purchase_cost)}
                                        onChange={(e) => setData('other_purchase_cost', parseNumberInput(e.target.value))}
                                        className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:border-indigo-500 font-mono"
                                    />
                                </div>
                            </div>
                            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/10 p-4 border border-indigo-100 dark:border-indigo-900/30 flex justify-between items-center">
                                <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Total HPP Barang Dagang:</span>
                                <span className="font-extrabold text-indigo-700 dark:text-indigo-400 text-lg">{formatRp(getHpp())}</span>
                            </div>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Langkah 3: Keuntungan Keuntungan</h3>
                        <p className="text-sm text-slate-500">Tentukan persentase keuntungan bersih yang ingin didapatkan.</p>
                        
                        <div className="space-y-4 pt-2">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Target Margin Keuntungan (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="999"
                                    value={data.target_margin_percent}
                                    onChange={(e) => setData('target_margin_percent', e.target.value as any)}
                                    className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:border-indigo-500"
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-700/50 text-center">
                                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                    <span className="text-xs text-slate-400 dark:text-slate-500 block font-semibold">TOTAL HPP</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{formatRp(getHpp())}</span>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                    <span className="text-xs text-slate-400 dark:text-slate-500 block font-semibold">LABA UNIT</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatRp(getSellingPrice() - getHpp())}</span>
                                </div>
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl">
                                    <span className="text-xs text-indigo-600 dark:text-indigo-400 block font-bold">HARGA JUAL</span>
                                    <span className="font-extrabold text-indigo-700 dark:text-indigo-300">{formatRp(getSellingPrice())}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const renderServiceSteps = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Langkah 1: Informasi Layanan Jasa</h3>
                        <p className="text-sm text-slate-500">Nama layanan jasa Anda dan satuan tarifnya.</p>
                        
                        <div className="space-y-4 pt-2">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Nama Jasa / Layanan</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Desain Logo Premium, Jasa Service AC"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Satuan Layanan</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: per project, per jam, per kunjungan"
                                    value={data.unit}
                                    onChange={(e) => setData('unit', e.target.value)}
                                    className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Langkah 2: Tarif Waktu Kerja</h3>
                        <p className="text-sm text-slate-500">Estimasi waktu pengerjaan dan upah tenaga ahli per jam.</p>
                        
                        <div className="space-y-4 pt-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Estimasi Jam Kerja per Layanan</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        value={data.labor_hours_per_unit}
                                        onChange={(e) => setData('labor_hours_per_unit', e.target.value as any)}
                                        className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Tarif Upah Pekerja per Jam (Rp)</label>
                                    <input
                                        type="text"
                                        placeholder="0"
                                        value={data.labor_rate_per_hour === 0 ? '' : formatNumberInput(data.labor_rate_per_hour)}
                                        onChange={(e) => setData('labor_rate_per_hour', parseNumberInput(e.target.value))}
                                        className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:border-indigo-500 font-mono"
                                    />
                                </div>
                            </div>
                            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/10 p-4 border border-indigo-100 dark:border-indigo-900/30 flex justify-between items-center">
                                <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Biaya Tenaga Kerja:</span>
                                <span className="font-extrabold text-indigo-700 dark:text-indigo-400 text-lg">{formatRp(getLaborCost())}</span>
                            </div>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Langkah 3: Target Margin Keuntungan</h3>
                        <p className="text-sm text-slate-500">Tentukan persentase keuntungan bersih yang Anda harapkan.</p>
                        
                        <div className="space-y-4 pt-2">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Target Margin Keuntungan (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="999"
                                    value={data.target_margin_percent}
                                    onChange={(e) => setData('target_margin_percent', e.target.value as any)}
                                    className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm focus:border-indigo-500"
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-700/50 text-center">
                                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                    <span className="text-xs text-slate-400 dark:text-slate-500 block font-semibold">TOTAL HPP</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{formatRp(getHpp())}</span>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                    <span className="text-xs text-slate-400 dark:text-slate-500 block font-semibold">LABA UNIT</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatRp(getSellingPrice() - getHpp())}</span>
                                </div>
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl">
                                    <span className="text-xs text-indigo-600 dark:text-indigo-400 block font-bold">HARGA JUAL</span>
                                    <span className="font-extrabold text-indigo-700 dark:text-indigo-300">{formatRp(getSellingPrice())}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                            Tambah Produk Baru (Wizard)
                        </h2>
                        <p className="text-sm font-medium text-slate-500 mt-1">
                            Langkah demi langkah asisten penghitungan HPP cerdas.
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
            <Head title="Tambah Produk Wizard" />

            <div className="max-w-3xl mx-auto">
                    
                    {/* WIZARD CONTAINER */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700/50">
                        
                        {/* Step 0: Select Type */}
                        {step === 0 && (
                            <div className="space-y-6">
                                <div className="text-center">
                                    <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">Bagaimana produk ini dibuat / didapatkan?</h3>
                                    <p className="text-sm text-slate-500 mt-2">Pilih kategori bisnis yang paling cocok agar sistem dapat menyesuaikan model perhitungan HPP.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                                    {/* Manufacturing */}
                                    <button
                                        type="button"
                                        onClick={() => selectType('manufacturing')}
                                        className="group relative flex flex-col items-center text-center p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-md transition text-slate-800 dark:text-slate-200"
                                    >
                                        <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 p-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition duration-300">
                                            🏭
                                        </div>
                                        <h4 className="font-bold text-lg mt-4 text-slate-800 dark:text-slate-200">Produksi Sendiri</h4>
                                        <p className="text-xs text-slate-400 mt-1">Untuk makanan, garmen, kerajinan, & manufaktur fisik.</p>
                                    </button>

                                    {/* Trading */}
                                    <button
                                        type="button"
                                        onClick={() => selectType('trading')}
                                        className="group relative flex flex-col items-center text-center p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-md transition text-slate-800 dark:text-slate-200"
                                    >
                                        <div className="rounded-2xl bg-sky-50 dark:bg-sky-500/10 p-4 text-sky-600 dark:text-sky-400 group-hover:scale-110 transition duration-300">
                                            🛒
                                        </div>
                                        <h4 className="font-bold text-lg mt-4 text-slate-800 dark:text-slate-200">Beli & Jual</h4>
                                        <p className="text-xs text-slate-400 mt-1">Reseller, toko kelontong, & trading barang jadi.</p>
                                    </button>

                                    {/* Service */}
                                    <button
                                        type="button"
                                        onClick={() => selectType('service')}
                                        className="group relative flex flex-col items-center text-center p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-md transition text-slate-800 dark:text-slate-200"
                                    >
                                        <div className="rounded-2xl bg-teal-50 dark:bg-teal-500/10 p-4 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition duration-300">
                                            🤝
                                        </div>
                                        <h4 className="font-bold text-lg mt-4 text-slate-800 dark:text-slate-200">Jasa / Layanan</h4>
                                        <p className="text-xs text-slate-400 mt-1">Salon, konsultasi, bengkel, & jasa profesional.</p>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Wizard Steps Form */}
                        {step > 0 && (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Progress Indicator */}
                                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700/50">
                                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                        Kategori: {selectedType === 'manufacturing' ? '🏭 Produksi Sendiri' : selectedType === 'trading' ? '🛒 Beli & Jual' : '🤝 Jasa / Layanan'}
                                    </span>
                                    <span className="text-xs font-bold text-slate-400">
                                        Langkah {step} dari {selectedType === 'manufacturing' ? '4' : '3'}
                                    </span>
                                </div>

                                {/* Step Components */}
                                {selectedType === 'manufacturing' && renderManufacturingSteps()}
                                {selectedType === 'trading' && renderTradingSteps()}
                                {selectedType === 'service' && renderServiceSteps()}

                                {/* Action Buttons */}
                                <div className="flex justify-between pt-6 border-t border-slate-100 dark:border-slate-700/50">
                                    <button
                                        type="button"
                                        onClick={() => setStep(step - 1)}
                                        className="px-4 py-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-205 text-sm font-semibold rounded-xl"
                                    >
                                        Kembali
                                    </button>

                                    {/* Next or Submit Button */}
                                    {((selectedType === 'manufacturing' && step < 4) ||
                                      (selectedType === 'trading' && step < 3) ||
                                      (selectedType === 'service' && step < 3)) ? (
                                        <button
                                            type="button"
                                            onClick={() => setStep(step + 1)}
                                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition"
                                        >
                                            Lanjut →
                                        </button>
                                    ) : (
                                        <button
                                            type="submit"
                                            disabled={processing}
                                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition"
                                        >
                                            {processing ? 'Menyimpan...' : 'Hitung HPP & Simpan'}
                                        </button>
                                    )}
                                </div>
                            </form>
                        )}
                    </div>
                </div>
        </AuthenticatedLayout>
    );
}
