import { PageProps } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import React from 'react';
import { ArrowDownTrayIcon, InboxStackIcon } from '@heroicons/react/24/outline';

interface Payroll {
    id: number;
    month: number;
    year: number;
    basic_salary: string;
    allowances: string;
    deductions: string;
    overtime_pay: string;
    net_salary: string;
    status: 'draft' | 'paid';
    paid_at: string | null;
}

export default function UserPayrollIndex({ auth, payrolls }: PageProps<{ payrolls: Payroll[] }>) {
    const formatRupiah = (val: string | number) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
    };

    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Slip Gaji Elektronik Anda (e-Payslip)</h2>}
        >
            <Head title="Slip Gaji" />

            <div className="py-12">
                <div className="max-w-5xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    <div className="bg-gradient-to-r from-violet-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-2xl font-bold mb-2 flex items-center">
                                <InboxStackIcon className="w-6 h-6 mr-2" />
                                Slip Gaji & Remunerasi Resmi
                            </h3>
                            <p className="text-violet-100 max-w-2xl text-sm">
                                Di bawah ini adalah daftar slip gaji elektronik resmi Anda. Slip gaji dapat diunduh dalam format PDF sebagai dokumen sah setelah dikonfirmasi lunas oleh tim keuangan perusahaan.
                            </p>
                        </div>
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                        <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">Periode Gaji</th>
                                        <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">Gaji Pokok</th>
                                        <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">Tunjangan & Lembur</th>
                                        <th className="px-6 py-4 font-medium text-gray-900 dark:text-white text-rose-600">Potongan</th>
                                        <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">Gaji Bersih</th>
                                        <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">Status</th>
                                        <th className="px-6 py-4 font-medium text-gray-900 dark:text-white text-center">Unduh PDF</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {payrolls.map((payroll) => (
                                        <tr key={payroll.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                                            <td className="px-6 py-4 text-gray-900 dark:text-white font-bold">
                                                {months[payroll.month - 1]} {payroll.year}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300 font-mono text-sm">{formatRupiah(payroll.basic_salary)}</td>
                                            <td className="px-6 py-4 text-emerald-600 font-mono text-sm">
                                                +{formatRupiah(parseFloat(payroll.allowances) + parseFloat(payroll.overtime_pay))}
                                            </td>
                                            <td className="px-6 py-4 text-rose-600 font-mono text-sm">-{formatRupiah(payroll.deductions)}</td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-white font-black font-mono text-sm">{formatRupiah(payroll.net_salary)}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex text-xs font-bold rounded-full px-2 py-0.5 shadow-sm 
                                                    ${payroll.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                                    {payroll.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {payroll.status === 'paid' ? (
                                                    <a
                                                        href={route('payrolls.download', payroll.id)}
                                                        target="_blank"
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
                                                    >
                                                        <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                                                        Unduh PDF
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500 italic">Menunggu Verifikasi</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {payrolls.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                                Belum ada slip gaji yang dipublikasikan untuk Anda.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
