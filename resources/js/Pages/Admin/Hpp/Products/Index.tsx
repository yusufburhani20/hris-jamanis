import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

interface Product {
    id: number;
    name: string;
    type: string;
    type_label: string;
    unit: string;
    hpp: number;
    selling_price: number;
    margin: number;
    target_margin: number;
    is_active: boolean;
    materials_count: number;
}

interface Material {
    id: number;
    name: string;
    unit: string;
    price_per_unit: number;
}

interface Props {
    products: Product[];
    materials: Material[];
}

export default function Index({ products, materials }: Props) {
    const { delete: destroy } = useForm();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');

    const formatRp = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    const handleDelete = (id: number, name: string) => {
        if (confirm(`Apakah Anda yakin ingin menghapus produk "${name}"?`)) {
            destroy(route('admin.hpp.products.destroy', id));
        }
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'all' || p.type === filterType;
        return matchesSearch && matchesType;
    });

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                            Katalog Produk & HPP
                        </h2>
                        <p className="text-sm font-medium text-slate-500 mt-1">
                            Kelola perhitungan HPP produk produksi, barang dagangan, maupun estimasi jasa layanan Anda.
                        </p>
                    </div>
                    <Link
                        href={route('admin.hpp.products.create')}
                        className="inline-flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition shadow-sm"
                    >
                        + Tambah Produk (Wizard)
                    </Link>
                </div>
            }
        >
            <Head title="Katalog Produk & HPP" />

            <div className="space-y-6">

                    {/* Filter & Search Bar */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:max-w-md">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                🔍
                            </span>
                            <input
                                type="text"
                                placeholder="Cari nama produk..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 pl-10 pr-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                        
                        <div className="flex space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                            <button
                                onClick={() => setFilterType('all')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                                    filterType === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                }`}
                            >
                                Semua
                            </button>
                            <button
                                onClick={() => setFilterType('manufacturing')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                                    filterType === 'manufacturing' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                }`}
                            >
                                Produksi Sendiri
                            </button>
                            <button
                                onClick={() => setFilterType('trading')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                                    filterType === 'trading' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                }`}
                            >
                                Beli & Jual
                            </button>
                            <button
                                onClick={() => setFilterType('service')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                                    filterType === 'service' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                }`}
                            >
                                Jasa / Layanan
                            </button>
                        </div>
                    </div>

                    {/* Catalog */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden">
                        
                        {filteredProducts.length > 0 ? (
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
                                        {filteredProducts.map((product) => (
                                            <tr key={product.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-slate-800 dark:text-slate-200">{product.name}</div>
                                                    <div className="text-xs text-slate-400 dark:text-slate-500">
                                                        Satuan jual: {product.unit} 
                                                        {product.type === 'manufacturing' && ` • ${product.materials_count} Bahan resep`}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                                        product.type === 'manufacturing' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' :
                                                        product.type === 'trading' ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-405' :
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
                                                <td className="px-6 py-4 text-right space-x-3">
                                                    <Link
                                                        href={route('admin.hpp.products.edit', product.id)}
                                                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-200 font-semibold text-xs transition"
                                                    >
                                                        Edit
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(product.id, product.name)}
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
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Belum ada produk terdaftar</p>
                                <p className="text-xs text-slate-450 dark:text-slate-550 mt-1 mb-6">Mulai dengan menambahkan bahan baku dan hitung HPP produk pertama Anda.</p>
                                <Link
                                    href={route('admin.hpp.products.create')}
                                    className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition duration-150"
                                >
                                    + Tambah Produk Pertama
                                </Link>
                            </div>
                        )}
                    </div>

            </div>
        </AuthenticatedLayout>
    );
}
