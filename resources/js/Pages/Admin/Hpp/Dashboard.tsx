import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

interface Product {
    id: number;
    name: string;
    type: string;
    type_label: string;
    hpp: number;
    selling_price: number;
    margin: number;
    unit: string;
}

interface Stats {
    total_products: number;
    total_overhead: number;
    avg_margin: number;
    best_product: Product | null;
    worst_product: Product | null;
}

interface Business {
    id: number;
    name: string;
    industry: string | null;
    monthly_production_capacity: number;
    phone: string | null;
    address: string | null;
}

interface Props {
    products: Product[];
    stats: Stats;
    business: Business | null;
}

export default function Dashboard({ products, stats, business }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        industry: 'Makanan & Minuman',
        monthly_production_capacity: 100,
        phone: '',
        address: ''
    });

    const formatRp = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    const handleBusinessSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.hpp.business.store'));
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center space-x-2">
                        <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                            Dasbor Analitik HPP & Profitabilitas
                        </h2>
                        <div className="group relative inline-block">
                            <button
                                type="button"
                                className="text-slate-400 hover:text-indigo-600 transition p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </button>
                            
                            {/* Kamus Pintar Tooltip */}
                            <div className="absolute top-full left-0 mt-2 w-80 p-5 bg-slate-900 text-white text-xs rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none border border-slate-800">
                                <div className="absolute bottom-full left-3 border-8 border-transparent border-b-slate-900"></div>
                                <div className="flex items-center space-x-2 font-bold mb-3 text-slate-100">
                                    <span>📚</span>
                                    <span className="text-sm">Kamus Pintar HPP & UMKM</span>
                                </div>
                                <div className="space-y-3 leading-relaxed text-slate-300 font-normal">
                                    <p>
                                        <strong className="text-indigo-300">⚡ Biaya Overhead:</strong> Biaya tetap bulanan (sewa, listrik, wifi, gas) yang dialokasikan otomatis ke HPP per unit produk.
                                    </p>
                                    <p>
                                        <strong className="text-emerald-300">📈 Margin Keuntungan:</strong> Persentase laba bersih yang ditambahkan di atas HPP untuk membentuk harga jual.
                                    </p>
                                    <p>
                                        <strong className="text-amber-300">🏭 Kapasitas Bulanan (Profil):</strong> Target produksi bulanan. Angka ini bertindak sebagai pembagi utama overhead bulanan agar HPP akurat.
                                    </p>
                                    <p>
                                        <strong className="text-violet-300">🧪 Lihat Resep:</strong> Pembedah seluruh detail biaya bahan baku & upah pekerja.
                                    </p>
                                    <p>
                                        <strong className="text-rose-300">🎯 Simulasi Harga:</strong> Bereksperimen dengan target keuntungan di kalkulator secara real-time.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <span className="text-sm font-medium text-slate-500 mt-1 md:mt-0">
                        {business ? `Usaha: ${business.name}` : 'Lengkapi profil usaha Anda'}
                    </span>
                </div>
            }
        >
            <Head title="Dasbor Analitik HPP" />

            <div className="space-y-8">

                    {/* Onboarding Widget if no Business exists */}
                    {!business && (
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-8 text-white shadow-lg space-y-6">
                            <div className="max-w-2xl">
                                <h3 className="text-2xl font-extrabold">Selamat Datang di HPP UMKM! 👋</h3>
                                <p className="text-sm text-indigo-100 mt-2">
                                    Silakan isi profil singkat bisnis Anda terlebih dahulu untuk memulai perhitungan HPP, biaya overhead tetap, dan penentuan margin laba secara otomatis.
                                </p>
                            </div>

                            <form onSubmit={handleBusinessSubmit} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-805">
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-indigo-100 uppercase">Nama Usaha / Toko</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: Roti Lezat Solo"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className="w-full rounded-xl border border-transparent bg-white/90 px-4 py-2.5 text-sm text-slate-800 focus:bg-white focus:outline-none"
                                    />
                                    {errors.name && <p className="text-xs text-rose-300 mt-1">{errors.name}</p>}
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-indigo-100 uppercase">Jenis Industri</label>
                                    <select
                                        value={data.industry}
                                        onChange={(e) => setData('industry', e.target.value)}
                                        className="w-full rounded-xl border border-transparent bg-white/90 px-4 py-2.5 text-sm text-slate-800 focus:bg-white focus:outline-none"
                                    >
                                        <option value="Makanan & Minuman">Makanan & Minuman</option>
                                        <option value="Pakaian / Fashion">Pakaian / Fashion</option>
                                        <option value="Kerajinan & Kriya">Kerajinan & Kriya</option>
                                        <option value="Jasa / Layanan">Jasa / Layanan</option>
                                        <option value="Perdagangan / Retail">Perdagangan / Retail</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-indigo-100 uppercase">Kapasitas Produksi Bulanan (Unit)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.monthly_production_capacity === 0 ? '' : data.monthly_production_capacity}
                                        onChange={(e) => setData('monthly_production_capacity', e.target.value === '' ? 0 : parseInt(e.target.value))}
                                        className="w-full rounded-xl border border-transparent bg-white/90 px-4 py-2.5 text-sm text-slate-800 focus:bg-white focus:outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-indigo-100 uppercase">Nomor HP / WhatsApp (Opsional)</label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: 08123456789"
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        className="w-full rounded-xl border border-transparent bg-white/90 px-4 py-2.5 text-sm text-slate-800 focus:bg-white focus:outline-none"
                                    />
                                </div>

                                <div className="md:col-span-2 space-y-1">
                                    <label className="block text-xs font-bold text-indigo-100 uppercase">Alamat Usaha (Opsional)</label>
                                    <textarea
                                        placeholder="Alamat lengkap lokasi usaha..."
                                        value={data.address}
                                        onChange={(e) => setData('address', e.target.value)}
                                        className="w-full rounded-xl border border-transparent bg-white/90 px-4 py-2 text-sm text-slate-800 focus:bg-white focus:outline-none h-16"
                                    />
                                </div>

                                <div className="md:col-span-2 pt-2 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="px-6 py-2.5 bg-white text-indigo-700 font-bold rounded-xl hover:bg-indigo-50 transition shadow"
                                    >
                                        {processing ? 'Menyimpan...' : 'Simpan & Mulai Dasbor'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Ringkasan Statistik Utama */}
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        
                        {/* Total Produk */}
                        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-100 dark:border-slate-700/50 transition hover:shadow-md">
                            <div className="flex items-center space-x-4">
                                <div className="rounded-xl bg-indigo-50 dark:bg-indigo-500/10 p-3 text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Produk</p>
                                    <h4 className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-1 tracking-tight">
                                        {stats.total_products} <span className="text-xs font-normal text-slate-400">item</span>
                                    </h4>
                                </div>
                            </div>
                        </div>

                        {/* Total Overhead Bulanan */}
                        <div className="relative rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-100 dark:border-slate-700/50 transition hover:shadow-md">
                            <div className="flex items-center space-x-4">
                                <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-rose-600 dark:text-rose-400 flex-shrink-0">
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16v1M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L14 10" />
                                    </svg>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center space-x-1.5">
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Overhead Bulanan</p>
                                        <div className="relative group inline-block">
                                            <button
                                                type="button"
                                                className="text-slate-300 dark:text-slate-600 hover:text-rose-600 transition p-0.5"
                                            >
                                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </button>
                                            
                                            {/* Tooltip Content */}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-4 bg-slate-900 text-white text-xs rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none border border-slate-800">
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-slate-900"></div>
                                                <div className="flex items-center space-x-1.5 font-bold mb-1 text-slate-200">
                                                    <span>⚡</span>
                                                    <span>Biaya Overhead</span>
                                                </div>
                                                <p className="text-slate-300 leading-relaxed font-normal">
                                                    Biaya di luar bahan baku & upah langsung (sewa, listrik, wifi, gas, air).
                                                </p>
                                                <p className="text-slate-400 mt-1.5 leading-relaxed font-normal border-t border-slate-800 pt-1.5">
                                                    <strong>Cara Kerja:</strong> Total overhead bulanan dibagi Kapasitas Bulanan, lalu dibebankan otomatis ke HPP produk.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <h4 className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-1 tracking-tight">
                                        {formatRp(stats.total_overhead)}
                                    </h4>
                                </div>
                            </div>
                        </div>

                        {/* Rata-rata Margin Keuntungan */}
                        <div className="relative rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-100 dark:border-slate-700/50 transition hover:shadow-md">
                            <div className="flex items-center space-x-4">
                                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center space-x-1.5">
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Rata-rata Margin</p>
                                        <div className="relative group inline-block">
                                            <button
                                                type="button"
                                                className="text-slate-300 dark:text-slate-600 hover:text-emerald-600 transition p-0.5"
                                            >
                                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </button>
                                            
                                            {/* Tooltip Content */}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-4 bg-slate-900 text-white text-xs rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none border border-slate-850">
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-slate-900"></div>
                                                <div className="flex items-center space-x-1.5 font-bold mb-1 text-slate-200">
                                                    <span>📈</span>
                                                    <span>Margin Keuntungan</span>
                                                </div>
                                                <p className="text-slate-300 leading-relaxed font-normal">
                                                    Persentase keuntungan bersih yang Anda ambil di atas total biaya HPP per unit.
                                                </p>
                                                <p className="text-slate-400 mt-1.5 leading-relaxed font-normal border-t border-slate-800 pt-1.5">
                                                    <strong>Cara Kerja:</strong> HPP Rp 10.000 + Margin 20% = Keuntungan Rp 2.000 (Harga Jual Rp 12.000).
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <h4 className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-1 tracking-tight">
                                        {stats.avg_margin}%
                                    </h4>
                                </div>
                            </div>
                        </div>

                        {/* Produk Profit Tertinggi */}
                        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-100 dark:border-slate-700/50 transition hover:shadow-md">
                            <div className="flex items-center space-x-4">
                                <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 p-3 text-amber-600 dark:text-amber-400 flex-shrink-0">
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                    </svg>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Profit Terbesar</p>
                                    <h4 className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-1 tracking-tight">
                                        {stats.best_product ? `${stats.best_product.margin}%` : '-'}
                                    </h4>
                                    {stats.best_product && (
                                        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 truncate mt-0.5" title={stats.best_product.name}>
                                            {stats.best_product.name}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Sorotan Laba / Rugi Margin Kritis */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Best Performer */}
                        <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-950/10 p-6 flex flex-col justify-between">
                            <div>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300">
                                    ⭐ Margin Keuntungan Tertinggi
                                </span>
                                {stats.best_product ? (
                                    <div className="mt-4">
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{stats.best_product.name}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Jenis Produk: {stats.best_product.type_label}</p>
                                        <div className="grid grid-cols-2 gap-4 mt-4">
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 block font-medium">HPP PER UNIT</span>
                                                <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">{formatRp(stats.best_product.hpp)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 block font-medium">HARGA JUAL</span>
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{formatRp(stats.best_product.selling_price)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-4">Belum ada data produk</p>
                                )}
                            </div>
                            {stats.best_product && (
                                <div className="mt-6 flex items-center justify-between border-t border-emerald-100/50 dark:border-emerald-900/20 pt-4">
                                    <Link
                                        href={route('admin.hpp.products.edit', stats.best_product.id)}
                                        className="inline-flex items-center text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-850 space-x-1"
                                    >
                                        <span>Lihat resep & struktur biaya</span>
                                        <span>→</span>
                                    </Link>
                                    <div className="relative group inline-block">
                                        <button
                                            type="button"
                                            className="text-emerald-500/60 hover:text-emerald-800 transition p-0.5 rounded-full hover:bg-emerald-100/50 dark:hover:bg-emerald-950/30"
                                        >
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </button>
                                        
                                        {/* Tooltip Content */}
                                        <div className="absolute bottom-full right-0 mb-2 w-64 p-4 bg-slate-900 text-white text-xs rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none border border-slate-800">
                                            <div className="absolute top-full right-3 border-8 border-transparent border-t-slate-900"></div>
                                            <div className="flex items-center space-x-1.5 font-bold mb-1 text-slate-200">
                                                <span>🧪</span>
                                                <span>Lihat Resep & Struktur</span>
                                            </div>
                                            <p className="text-slate-300 leading-relaxed font-normal">
                                                Membedah detail komponen biaya (bahan baku, upah pekerja, overhead) produk Anda.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Worst Performer / Perlu Peninjauan */}
                        <div className="rounded-2xl border border-rose-100 dark:border-rose-900/30 bg-rose-50/30 dark:bg-rose-950/10 p-6 flex flex-col justify-between">
                            <div>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300">
                                    ⚠️ Margin Keuntungan Terendah
                                </span>
                                {stats.worst_product ? (
                                    <div className="mt-4">
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{stats.worst_product.name}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Jenis Produk: {stats.worst_product.type_label}</p>
                                        <div className="grid grid-cols-2 gap-4 mt-4">
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 block font-medium">HPP PER UNIT</span>
                                                <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">{formatRp(stats.worst_product.hpp)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 block font-medium">HARGA JUAL</span>
                                                <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">{formatRp(stats.worst_product.selling_price)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-4">Belum ada data produk dengan biaya HPP</p>
                                )}
                            </div>
                            {stats.worst_product && (
                                <div className="mt-6 flex items-center justify-between border-t border-rose-100/50 dark:border-rose-900/20 pt-4">
                                    <Link
                                        href={route('admin.hpp.products.edit', stats.worst_product.id)}
                                        className="inline-flex items-center text-xs font-bold text-rose-700 dark:text-rose-400 hover:text-rose-850 space-x-1"
                                    >
                                        <span>Simulasi naikkan harga jual</span>
                                        <span>→</span>
                                    </Link>
                                    <div className="relative group inline-block">
                                        <button
                                            type="button"
                                            className="text-rose-600/60 hover:text-rose-800 transition p-0.5 rounded-full hover:bg-rose-100/50 dark:hover:bg-rose-955/30"
                                        >
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </button>
                                        
                                        {/* Tooltip Content */}
                                        <div className="absolute bottom-full right-0 mb-2 w-64 p-4 bg-slate-900 text-white text-xs rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none border border-slate-800">
                                            <div className="absolute top-full right-3 border-8 border-transparent border-t-slate-900"></div>
                                            <div className="flex items-center space-x-1.5 font-bold mb-1 text-slate-200">
                                                <span>🎯</span>
                                                <span>Simulasi Harga</span>
                                            </div>
                                            <p className="text-slate-300 leading-relaxed font-normal">
                                                Bereksperimen dengan menaikkan margin (%) atau menekan biaya bahan baku untuk merencanakan harga jual yang aman.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Daftar Produk Baru */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Katalog Produk Terdaftar</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Analisis HPP dan harga jual per produk</p>
                            </div>
                            <div className="flex space-x-3">
                                <Link
                                    href={route('admin.hpp.products.create')}
                                    className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition duration-150 animate-pulse-subtle"
                                >
                                    <span className="mr-1">+</span> Tambah Produk Baru
                                </Link>
                            </div>
                        </div>

                        {products.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                            <th className="px-6 py-4">Nama Produk</th>
                                            <th className="px-6 py-4">Tipe Kategori</th>
                                            <th className="px-6 py-4">HPP Per Unit</th>
                                            <th className="px-6 py-4">Harga Jual</th>
                                            <th className="px-6 py-4 text-center">Margin</th>
                                            <th className="px-6 py-4 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm">
                                        {products.map((product) => (
                                            <tr key={product.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-slate-800 dark:text-slate-200">{product.name}</div>
                                                    <div className="text-xs text-slate-400 dark:text-slate-500">Satuan jual: {product.unit}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                                        product.type === 'manufacturing' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' :
                                                        product.type === 'trading' ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400' :
                                                        'bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400'
                                                    }`}>
                                                        {product.type_label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">
                                                    {formatRp(product.hpp)}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100">
                                                    {formatRp(product.selling_price)}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                                                        product.margin >= 30 ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300' :
                                                        product.margin >= 15 ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300' :
                                                        'bg-rose-100 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300'
                                                    }`}>
                                                        {product.margin}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Link
                                                        href={route('admin.hpp.products.edit', product.id)}
                                                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-200 font-semibold text-xs transition mr-4"
                                                    >
                                                        Detail & Edit
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-12 text-center text-slate-400 dark:text-slate-500">
                                <svg className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Belum ada produk terdaftar</p>
                                <p className="text-xs text-slate-450 dark:text-slate-500 mt-1 mb-6">Mulai dengan menambahkan bahan baku dan hitung HPP produk pertama Anda.</p>
                                <Link
                                    href={route('admin.hpp.products.create')}
                                    className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition duration-150"
                                >
                                    + Produk Pertama
                                </Link>
                            </div>
                        )}
                    </div>

            </div>
        </AuthenticatedLayout>
    );
}
