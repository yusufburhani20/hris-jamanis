import { PageProps } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import React, { useState } from 'react';
import { CurrencyDollarIcon, CheckIcon, TrashIcon, ArrowDownTrayIcon, PencilIcon } from '@heroicons/react/24/outline';

interface User {
    id: number;
    name: string;
    email: string;
    nip: string | null;
    basic_salary: string | number;
}

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
    user: User;
}

interface PayrollSettings {
    payroll_late_penalty: string;
    payroll_overtime_rate: string;
    payroll_allowance: string;
    payroll_absent_penalty: string;
    payroll_working_days: string[];
}

export default function PayrollIndex({ auth, payrolls, employees, currentMonth, currentYear, payrollSettings }: PageProps<{ payrolls: Payroll[], employees: User[], currentMonth: number, currentYear: number, payrollSettings: PayrollSettings }>) {
    const [month, setMonth] = useState(currentMonth);
    const [year, setYear] = useState(currentYear);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingPayroll, setEditingPayroll] = useState<Payroll | null>(null);
    const [selectedPayrollIds, setSelectedPayrollIds] = useState<number[]>([]);

    const { data, setData, post, processing, errors } = useForm({
        user_id: '',
        month: currentMonth,
        year: currentYear,
    });

    const { data: settingsData, setData: setSettingsData, post: postSettings, processing: processingSettings } = useForm({
        payroll_late_penalty: payrollSettings.payroll_late_penalty,
        payroll_overtime_rate: payrollSettings.payroll_overtime_rate,
        payroll_allowance: payrollSettings.payroll_allowance,
        payroll_absent_penalty: payrollSettings.payroll_absent_penalty,
        payroll_working_days: payrollSettings.payroll_working_days,
    });

    const { data: editData, setData: setEditData, put: putPayroll, processing: processingEdit, errors: editErrors } = useForm({
        allowances: '',
        overtime_pay: '',
        deductions: '',
    });

    const handleFilter = (e: React.FormEvent) => {
        e.preventDefault();
        window.location.href = route('admin.payrolls.index', { month, year });
    };

    const handleCalculate = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.payrolls.calculate'), {
            preserveScroll: true,
            onSuccess: () => {
                setData('user_id', '');
            }
        });
    };

    const handleSaveSettings = (e: React.FormEvent) => {
        e.preventDefault();
        postSettings(route('admin.payrolls.saveSettings'), {
            preserveScroll: true,
        });
    };

    const handleDayToggle = (day: string) => {
        const currentDays = [...settingsData.payroll_working_days];
        if (currentDays.includes(day)) {
            setSettingsData('payroll_working_days', currentDays.filter(d => d !== day));
        } else {
            setSettingsData('payroll_working_days', [...currentDays, day]);
        }
    };

    const openEditModal = (payroll: Payroll) => {
        setEditingPayroll(payroll);
        setEditData({
            allowances: String(Math.round(parseFloat(payroll.allowances))),
            overtime_pay: String(Math.round(parseFloat(payroll.overtime_pay))),
            deductions: String(Math.round(parseFloat(payroll.deductions))),
        });
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPayroll) return;
        putPayroll(route('admin.payrolls.update', editingPayroll.id), {
            preserveScroll: true,
            onSuccess: () => {
                setIsEditModalOpen(false);
                setEditingPayroll(null);
            }
        });
    };

    const handlePay = (id: number) => {
        if (confirm('Tandai gaji ini telah dibayarkan secara lunas?')) {
            post(route('admin.payrolls.pay', id), { preserveScroll: true });
        }
    };

    const handleCalculateBulk = () => {
        if (confirm('Hitung draf gaji untuk seluruh karyawan pada periode ini secara masal?')) {
            router.post(route('admin.payrolls.calculateBulk'), {
                month,
                year
            }, {
                preserveScroll: true
            });
        }
    };

    const handlePayBulk = () => {
        if (selectedPayrollIds.length === 0) {
            alert('Silakan pilih minimal satu karyawan untuk dilunasi.');
            return;
        }
        if (confirm(`Apakah Anda yakin ingin melunasi ${selectedPayrollIds.length} draf gaji yang dipilih sekaligus dan mengirimkan email slip gaji kepada masing-masing karyawan?`)) {
            router.post(route('admin.payrolls.payBulk'), {
                month,
                year,
                ids: selectedPayrollIds
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedPayrollIds([]);
                }
            });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Hapus draf gaji ini?')) {
            // Using standard post/delete mapping
            const form = useForm();
            form.delete(route('admin.payrolls.destroy', id), { preserveScroll: true });
        }
    };

    const formatRupiah = (val: string | number) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
    };

    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const daysOfWeek = [
        { key: 'Monday', label: 'Senin' },
        { key: 'Tuesday', label: 'Selasa' },
        { key: 'Wednesday', label: 'Rabu' },
        { key: 'Thursday', label: 'Kamis' },
        { key: 'Friday', label: 'Jumat' },
        { key: 'Saturday', label: 'Sabtu' },
        { key: 'Sunday', label: 'Minggu' },
    ];

    const formatNumberInput = (val: string | number) => {
        if (val === null || val === undefined || val === '') return '';
        const numStr = String(val).replace(/\D/g, '');
        if (!numStr) return '';
        return new Intl.NumberFormat('id-ID').format(Number(numStr));
    };

    const parseNumberInput = (val: string) => {
        return val.replace(/\D/g, '');
    };

    const currentYearList = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Manajemen Payroll & Gaji Karyawan</h2>}
        >
            <Head title="Manajemen Gaji" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    {/* Collapsible settings panel */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-slate-100 dark:shadow-none border border-slate-100 dark:border-slate-700/60 overflow-hidden">
                        <button
                            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                            className="w-full px-6 py-4 flex justify-between items-center bg-slate-50 dark:bg-slate-700/20 text-gray-900 dark:text-white font-bold hover:bg-slate-100 dark:hover:bg-slate-700/30 transition-all"
                        >
                            <span className="flex items-center gap-2 text-sm">
                                <span className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl text-indigo-600 dark:text-indigo-400 flex items-center">
                                    <CurrencyDollarIcon className="w-5 h-5" />
                                </span>
                                <span className="font-extrabold tracking-tight">⚙️ Pengaturan Parameter Keuangan, Denda Mangkir & Hari Kerja</span>
                            </span>
                            <span className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-extrabold px-3 py-1.5 rounded-lg transition-colors">
                                {isSettingsOpen ? 'TUTUP PENGATURAN ▲' : 'BUKA PENGATURAN ▼'}
                            </span>
                        </button>

                        {isSettingsOpen && (
                            <form onSubmit={handleSaveSettings} className="p-6 border-t border-slate-100 dark:border-slate-700/60 space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Denda Terlambat (Rp)</label>
                                        <input
                                            type="text"
                                            value={formatNumberInput(settingsData.payroll_late_penalty)}
                                            onChange={e => setSettingsData('payroll_late_penalty', parseNumberInput(e.target.value))}
                                            required
                                            className="w-full rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500 text-xs py-2.5 font-mono"
                                            placeholder="Contoh: 50.000"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tarif Lembur (Rp / Hari)</label>
                                        <input
                                            type="text"
                                            value={formatNumberInput(settingsData.payroll_overtime_rate)}
                                            onChange={e => setSettingsData('payroll_overtime_rate', parseNumberInput(e.target.value))}
                                            required
                                            className="w-full rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500 text-xs py-2.5 font-mono"
                                            placeholder="Contoh: 100.000"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tunjangan Kehadiran (Rp)</label>
                                        <input
                                            type="text"
                                            value={formatNumberInput(settingsData.payroll_allowance)}
                                            onChange={e => setSettingsData('payroll_allowance', parseNumberInput(e.target.value))}
                                            required
                                            className="w-full rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500 text-xs py-2.5 font-mono"
                                            placeholder="Contoh: 500.000"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Denda Mangkir / Hari (Rp)</label>
                                        <input
                                            type="text"
                                            value={formatNumberInput(settingsData.payroll_absent_penalty)}
                                            onChange={e => setSettingsData('payroll_absent_penalty', parseNumberInput(e.target.value))}
                                            required
                                            className="w-full rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500 text-xs py-2.5 font-mono"
                                            placeholder="Contoh: 100.000"
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-dashed border-slate-200 dark:border-slate-700 pt-5">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                        🗓️ Hari Kerja Aktif (Karyawan tidak absen pada hari ini akan dikenakan denda mangkir)
                                    </label>
                                    <div className="flex flex-wrap gap-4">
                                        {daysOfWeek.map((day) => (
                                            <label key={day.key} className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 font-bold cursor-pointer select-none bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700/40 px-3.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={settingsData.payroll_working_days.includes(day.key)}
                                                    onChange={() => handleDayToggle(day.key)}
                                                    className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span>{day.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button
                                        type="submit"
                                        disabled={processingSettings}
                                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/10 transition-all text-xs"
                                    >
                                        {processingSettings ? 'Menyimpan...' : 'Simpan Parameter Penggajian'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Filter Card */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Pilih Periode Gaji</h3>
                            <form onSubmit={handleFilter} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Bulan</label>
                                    <select
                                        value={month}
                                        onChange={(e) => {
                                            setMonth(parseInt(e.target.value));
                                            setData('month', parseInt(e.target.value));
                                        }}
                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        {months.map((m, idx) => (
                                            <option key={idx} value={idx + 1}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tahun</label>
                                    <select
                                        value={year}
                                        onChange={(e) => {
                                            setYear(parseInt(e.target.value));
                                            setData('year', parseInt(e.target.value));
                                        }}
                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        {currentYearList.map((y) => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    type="submit"
                                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-sm transition-all"
                                >
                                    Tampilkan Data
                                </button>
                            </form>
                        </div>

                        {/* Auto-Calculate Action Card */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 md:col-span-2">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center">
                                <CurrencyDollarIcon className="w-6 h-6 text-indigo-500 mr-2" />
                                Kalkulator Gaji Otomatis (Presensi & Lembur)
                            </h3>
                            <p className="text-xs text-gray-500 mb-4">
                                Sistem akan otomatis mengalkulasikan **Gaji Pokok**, **Tunjangan Kehadiran**, upah **Lembur** (dari Geofence), dan **Potongan Keterlambatan** absensi karyawan dalam periode terpilih.
                            </p>
                            
                            <form onSubmit={handleCalculate} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Pilih Karyawan</label>
                                    <select
                                        value={data.user_id}
                                        onChange={(e) => setData('user_id', e.target.value)}
                                        required
                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="">-- Pilih Karyawan --</option>
                                        {employees.map((emp) => (
                                            <option key={emp.id} value={emp.id}>{emp.name} (Salary: {formatRupiah(emp.basic_salary)})</option>
                                        ))}
                                    </select>
                                    {errors.user_id && <p className="text-red-500 text-xs mt-1">{errors.user_id}</p>}
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md transition-all flex items-center justify-center gap-2 text-sm"
                                    >
                                        {processing ? 'Menghitung...' : 'Mulai Hitung Gaji & Buat Draf'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCalculateBulk}
                                        className="py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-md transition-all flex items-center justify-center gap-2 text-sm"
                                        title="Hitung Gaji Seluruh Karyawan Sekaligus"
                                    >
                                        ⚡ Hitung Gaji Masal
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Payroll Table Card */}
                    <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                                Rekap Gaji Periode: {months[month - 1]} {year}
                            </h3>
                            {selectedPayrollIds.length > 0 && (
                                <button
                                    onClick={handlePayBulk}
                                    className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow transition-all flex items-center gap-1.5"
                                    title="Tandai Draf Terpilih Sebagai Lunas Sekaligus"
                                >
                                    <CheckIcon className="w-4 h-4" />
                                    Tandai Lunas Masal ({selectedPayrollIds.length})
                                </button>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                        <th className="w-12 px-6 py-4 text-center">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                checked={payrolls.length > 0 && payrolls.filter(p => p.status === 'draft').every(p => selectedPayrollIds.includes(p.id))}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedPayrollIds(payrolls.filter(p => p.status === 'draft').map(p => p.id));
                                                    } else {
                                                        setSelectedPayrollIds([]);
                                                    }
                                                }}
                                                disabled={!payrolls.some(p => p.status === 'draft')}
                                            />
                                        </th>
                                        <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">Karyawan</th>
                                        <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">Gaji Pokok</th>
                                        <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">Tunjangan</th>
                                        <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">Lembur</th>
                                        <th className="px-6 py-4 font-medium text-gray-900 dark:text-white text-rose-600">Potongan</th>
                                        <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">Gaji Bersih</th>
                                        <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">Status</th>
                                        <th className="px-6 py-4 font-medium text-gray-900 dark:text-white text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {payrolls.map((payroll) => (
                                        <tr key={payroll.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                                            <td className="px-6 py-4 text-center">
                                                {payroll.status === 'draft' ? (
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                        checked={selectedPayrollIds.includes(payroll.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedPayrollIds([...selectedPayrollIds, payroll.id]);
                                                            } else {
                                                                setSelectedPayrollIds(selectedPayrollIds.filter(id => id !== payroll.id));
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    <span className="text-emerald-500 dark:text-emerald-400 text-xs font-black" title="Sudah Lunas">✓</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900 dark:text-white">{payroll.user.name}</div>
                                                <div className="text-xs text-gray-500">NIP: {payroll.user.nip || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300 font-mono text-sm">{formatRupiah(payroll.basic_salary)}</td>
                                            <td className="px-6 py-4 text-emerald-600 font-mono text-sm">+{formatRupiah(payroll.allowances)}</td>
                                            <td className="px-6 py-4 text-indigo-600 font-mono text-sm">+{formatRupiah(payroll.overtime_pay)}</td>
                                            <td className="px-6 py-4 text-rose-600 font-mono text-sm">-{formatRupiah(payroll.deductions)}</td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-white font-bold font-mono text-sm">{formatRupiah(payroll.net_salary)}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex text-xs font-bold rounded-full px-2 py-0.5 shadow-sm 
                                                    ${payroll.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                                    {payroll.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center gap-2">
                                                    {payroll.status === 'draft' && (
                                                        <>
                                                            <button
                                                                onClick={() => openEditModal(payroll)}
                                                                title="Sesuaikan Draf Gaji"
                                                                className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                                                            >
                                                                <PencilIcon className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handlePay(payroll.id)}
                                                                title="Tandai Lunas"
                                                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                                            >
                                                                <CheckIcon className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(payroll.id)}
                                                                title="Hapus Draft"
                                                                className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                                            >
                                                                <TrashIcon className="w-5 h-5" />
                                                            </button>
                                                        </>
                                                    )}
                                                    {payroll.status === 'paid' && (
                                                        <a
                                                            href={route('payrolls.download', payroll.id)}
                                                            title="Unduh Slip Gaji PDF"
                                                            target="_blank"
                                                            className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                                                        >
                                                            <ArrowDownTrayIcon className="w-5 h-5 mx-auto" />
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {payrolls.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                                Belum ada draf gaji yang dihitung untuk periode ini.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Draft Modal */}
            {isEditModalOpen && editingPayroll && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsEditModalOpen(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md w-full">
                            <form onSubmit={handleSaveEdit}>
                                <div className="bg-white dark:bg-gray-800 px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700/60">
                                    <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                                        ✏️ Sesuaikan Draf Gaji
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Koreksi manual rincian gaji untuk <strong>{editingPayroll.user.name}</strong>.
                                    </p>
                                </div>

                                <div className="p-6 space-y-4">
                                    {/* Gaji Pokok (Locked / Read-Only) */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                            Gaji Pokok (Kunci / Sesuai Database)
                                        </label>
                                        <div className="mt-1.5 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-500 flex justify-between select-none">
                                            <span>Gaji Pokok:</span>
                                            <span>{formatRupiah(editingPayroll.basic_salary)}</span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-1 italic">
                                            *Untuk merubah Gaji Pokok, silakan edit melalui menu Kelola Karyawan.
                                        </p>
                                    </div>

                                    {/* Tunjangan (Editable) */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                            Tunjangan Kerja / Bonus (Rp)
                                        </label>
                                        <input
                                            type="text"
                                            value={formatNumberInput(editData.allowances)}
                                            onChange={e => setEditData('allowances', parseNumberInput(e.target.value))}
                                            required
                                            className="mt-1.5 block w-full rounded-xl border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 dark:bg-gray-900 dark:text-white text-xs py-2.5 font-mono"
                                            placeholder="Masukkan Tunjangan..."
                                        />
                                        {editErrors.allowances && <p className="text-red-500 text-[10px] mt-1">{editErrors.allowances}</p>}
                                    </div>

                                    {/* Lembur (Editable) */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                            Upah Lembur (Rp)
                                        </label>
                                        <input
                                            type="text"
                                            value={formatNumberInput(editData.overtime_pay)}
                                            onChange={e => setEditData('overtime_pay', parseNumberInput(e.target.value))}
                                            required
                                            className="mt-1.5 block w-full rounded-xl border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 dark:bg-gray-900 dark:text-white text-xs py-2.5 font-mono"
                                            placeholder="Masukkan Upah Lembur..."
                                        />
                                        {editErrors.overtime_pay && <p className="text-red-500 text-[10px] mt-1">{editErrors.overtime_pay}</p>}
                                    </div>

                                    {/* Potongan (Editable) */}
                                    <div>
                                        <label className="block text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                                            Potongan Keterlambatan / Mangkir (Rp)
                                        </label>
                                        <input
                                            type="text"
                                            value={formatNumberInput(editData.deductions)}
                                            onChange={e => setEditData('deductions', parseNumberInput(e.target.value))}
                                            required
                                            className="mt-1.5 block w-full rounded-xl border-rose-300 dark:border-rose-900 shadow-sm focus:border-rose-500 focus:ring focus:ring-rose-200 dark:bg-gray-900 dark:text-white text-xs py-2.5 font-mono"
                                            placeholder="Masukkan Potongan..."
                                        />
                                        {editErrors.deductions && <p className="text-red-500 text-[10px] mt-1">{editErrors.deductions}</p>}
                                    </div>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-800/40 px-6 py-4 border-t border-gray-100 dark:border-gray-700/60 flex justify-end gap-3 rounded-b-2xl">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processingEdit}
                                        className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all"
                                    >
                                        {processingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
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
