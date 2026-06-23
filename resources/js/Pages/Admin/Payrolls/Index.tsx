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
    // Breakdown tunjangan
    tunjangan_jabatan: string;
    tunjangan_masa_kerja: string;
    tunjangan_kesehatan: string;
    tunjangan_konsumsi: string;
    bonus: string;
    allowances: string;
    overtime_pay: string;
    // Breakdown potongan
    potongan_agnia_care: string;
    potongan_biaya_konsumsi: string;
    potongan_bpjs: string;
    potongan_kehadiran: string;
    potongan_kasbon: string;
    deductions: string;
    net_salary: string;
    status: 'draft' | 'paid';
    paid_at: string | null;
    user: User;
    start_date: string | null;
    end_date: string | null;
    absent_days?: number;
    late_hours?: string;
    overtime_hours?: string;
}

interface PayrollSettings {
    payroll_leave_quota: string;
    payroll_tunjangan_konsumsi: string;
    payroll_biaya_konsumsi_per_hari: string;
    payroll_bpjs_amount: string;
    payroll_period_start_day: string;
    payroll_period_end_day: string;
    payroll_auto_calculate_day: string;
    payroll_auto_calculate_enabled: string;
}

export default function PayrollIndex({ auth, payrolls, employees, currentMonth, currentYear, payrollSettings }: PageProps<{ payrolls: Payroll[], employees: User[], currentMonth: number, currentYear: number, payrollSettings: PayrollSettings }>) {
    const [month, setMonth] = useState(currentMonth);
    const [year, setYear] = useState(currentYear);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingPayroll, setEditingPayroll] = useState<Payroll | null>(null);
    const [selectedPayrollIds, setSelectedPayrollIds] = useState<number[]>([]);

    const getCalculatedStartDate = (m: number, y: number) => {
        const startDay = parseInt(payrollSettings.payroll_period_start_day || '26');
        if (startDay === 1) {
            return `${y}-${String(m).padStart(2, '0')}-01`;
        } else {
            let prevMonth = m - 1;
            let prevYear = y;
            if (prevMonth === 0) { prevMonth = 12; prevYear = y - 1; }
            const daysInMonth = new Date(prevYear, prevMonth, 0).getDate();
            const finalDay = Math.min(startDay, daysInMonth);
            return `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`;
        }
    };

    const getCalculatedEndDate = (m: number, y: number) => {
        const endDay = parseInt(payrollSettings.payroll_period_end_day || '25');
        const daysInMonth = new Date(y, m, 0).getDate();
        const finalDay = Math.min(endDay, daysInMonth);
        return `${y}-${String(m).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`;
    };

    const { data, setData, post, processing, errors } = useForm({
        user_id: '',
        month: currentMonth,
        year: currentYear,
        start_date: getCalculatedStartDate(currentMonth, currentYear),
        end_date: getCalculatedEndDate(currentMonth, currentYear),
    });

    const { data: settingsData, setData: setSettingsData, post: postSettings, processing: processingSettings } = useForm({
        payroll_leave_quota: payrollSettings.payroll_leave_quota,
        payroll_tunjangan_konsumsi: payrollSettings.payroll_tunjangan_konsumsi,
        payroll_biaya_konsumsi_per_hari: payrollSettings.payroll_biaya_konsumsi_per_hari,
        payroll_bpjs_amount: payrollSettings.payroll_bpjs_amount,
        payroll_period_start_day: payrollSettings.payroll_period_start_day,
        payroll_period_end_day: payrollSettings.payroll_period_end_day,
        payroll_auto_calculate_day: payrollSettings.payroll_auto_calculate_day,
        payroll_auto_calculate_enabled: payrollSettings.payroll_auto_calculate_enabled,
    });

    const { data: editData, setData: setEditData, put: putPayroll, processing: processingEdit, errors: editErrors } = useForm({
        tunjangan_jabatan: '',
        tunjangan_masa_kerja: '',
        tunjangan_kesehatan: '',
        bonus: '',
        overtime_pay: '',
        potongan_bpjs: '',
        potongan_kasbon: '',
        potongan_agnia_care: '',
        potongan_kehadiran: '',
        potongan_biaya_konsumsi: '',
    });

    const handleFilter = (e: React.FormEvent) => {
        e.preventDefault();
        window.location.href = route('admin.payrolls.index', { month, year });
    };

    const handleCalculate = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.payrolls.calculate'), {
            preserveScroll: true,
            onSuccess: () => { setData('user_id', ''); }
        });
    };

    const handleSaveSettings = (e: React.FormEvent) => {
        e.preventDefault();
        postSettings(route('admin.payrolls.saveSettings'), { preserveScroll: true });
    };

    const openEditModal = (payroll: Payroll) => {
        setEditingPayroll(payroll);
        setEditData({
            tunjangan_jabatan: String(Math.round(parseFloat(payroll.tunjangan_jabatan || '0'))),
            tunjangan_masa_kerja: String(Math.round(parseFloat(payroll.tunjangan_masa_kerja || '0'))),
            tunjangan_kesehatan: String(Math.round(parseFloat(payroll.tunjangan_kesehatan || '0'))),
            bonus: String(Math.round(parseFloat(payroll.bonus || '0'))),
            overtime_pay: String(Math.round(parseFloat(payroll.overtime_pay))),
            potongan_bpjs: String(Math.round(parseFloat(payroll.potongan_bpjs || '0'))),
            potongan_kasbon: String(Math.round(parseFloat(payroll.potongan_kasbon || '0'))),
            potongan_agnia_care: String(Math.round(parseFloat(payroll.potongan_agnia_care || '0'))),
            potongan_kehadiran: String(Math.round(parseFloat(payroll.potongan_kehadiran || '0'))),
            potongan_biaya_konsumsi: String(Math.round(parseFloat(payroll.potongan_biaya_konsumsi || '0'))),
        });
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPayroll) return;
        putPayroll(route('admin.payrolls.update', editingPayroll.id), {
            preserveScroll: true,
            onSuccess: () => { setIsEditModalOpen(false); setEditingPayroll(null); }
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
                month, year, start_date: data.start_date, end_date: data.end_date
            }, { preserveScroll: true });
        }
    };

    const handlePayBulk = () => {
        if (selectedPayrollIds.length === 0) { alert('Silakan pilih minimal satu karyawan untuk dilunasi.'); return; }
        if (confirm(`Apakah Anda yakin ingin melunasi ${selectedPayrollIds.length} draf gaji yang dipilih sekaligus?`)) {
            router.post(route('admin.payrolls.payBulk'), {
                month, year, ids: selectedPayrollIds
            }, { preserveScroll: true, onSuccess: () => setSelectedPayrollIds([]) });
        }
    };

    const handleApplyBpjs = () => {
        if (selectedPayrollIds.length === 0) { alert('Silakan pilih minimal satu karyawan untuk diterapkan BPJS-nya.'); return; }
        const bpjs = formatRupiah(payrollSettings.payroll_bpjs_amount);
        if (confirm(`Terapkan potongan BPJS (${bpjs}) ke ${selectedPayrollIds.length} karyawan terpilih?`)) {
            router.post(route('admin.payrolls.applyBpjs'), { ids: selectedPayrollIds }, {
                preserveScroll: true,
                onSuccess: () => setSelectedPayrollIds([])
            });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Hapus draf gaji ini?')) {
            router.delete(route('admin.payrolls.destroy', id), { preserveScroll: true });
        }
    };

    const formatRupiah = (val: string | number) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        if (isNaN(num)) return 'Rp 0';
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
    };

    const formatNumberInput = (val: string | number) => {
        if (val === null || val === undefined || val === '') return '';
        const numStr = String(val).replace(/\D/g, '');
        if (!numStr) return '';
        return new Intl.NumberFormat('id-ID').format(Number(numStr));
    };

    const parseNumberInput = (val: string) => val.replace(/\D/g, '');

    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const currentYearList = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

    const inputCls = "w-full rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500 text-xs py-2.5 font-mono";

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Manajemen Payroll & Gaji Karyawan</h2>}>
            <Head title="Manajemen Gaji" />
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">

                    {/* ── SETTINGS PANEL ─────────────────────────────────────── */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-slate-100 dark:shadow-none border border-slate-100 dark:border-slate-700/60 overflow-hidden">
                        <button
                            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                            className="w-full px-6 py-4 flex justify-between items-center bg-slate-50 dark:bg-slate-700/20 text-gray-900 dark:text-white font-bold hover:bg-slate-100 dark:hover:bg-slate-700/30 transition-all"
                        >
                            <span className="flex items-center gap-2 text-sm">
                                <span className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl text-indigo-600 dark:text-indigo-400 flex items-center">
                                    <CurrencyDollarIcon className="w-5 h-5" />
                                </span>
                                <span className="font-extrabold tracking-tight">⚙️ Pengaturan Parameter Penggajian Bakmi SA</span>
                            </span>
                            <span className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-extrabold px-3 py-1.5 rounded-lg">
                                {isSettingsOpen ? 'TUTUP ▲' : 'BUKA ▼'}
                            </span>
                        </button>

                        {isSettingsOpen && (
                            <form onSubmit={handleSaveSettings} className="p-6 border-t border-slate-100 dark:border-slate-700/60 space-y-6">
                                {/* Info rumus */}
                                <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl px-4 py-3 text-xs text-indigo-700 dark:text-indigo-300 space-y-1">
                                    <p className="font-bold">📐 Rumus Kalkulasi Otomatis:</p>
                                    <p>• <strong>Hari Efektif</strong> = Total Hari Bulan − Jatah Libur</p>
                                    <p>• <strong>Tarif/Jam</strong> = Gaji Pokok ÷ Hari Efektif ÷ 10</p>
                                    <p>• <strong>Lembur</strong> = Jam Lembur × Tarif/Jam &nbsp;|&nbsp; <strong>Jatah Libur tidak diambil → dihitung Lembur</strong></p>
                                    <p>• <strong>Potongan Kehadiran</strong> = (Hari Mangkir × Tarif/Hari) + (Jam Terlambat × Tarif/Jam) &nbsp;|&nbsp; Izin Terlambat acc = tidak dipotong</p>
                                    <p>• <strong>Biaya Konsumsi</strong> = Hari Mangkir × Rp 13.000 (configurable)</p>
                                </div>

                                {/* Jatah Libur */}
                                <div>
                                    <h4 className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3">🏖️ Jatah Libur</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Jatah Libur / Bulan (Hari)</label>
                                            <input
                                                type="number" min="0" max="15"
                                                value={settingsData.payroll_leave_quota}
                                                onChange={e => setSettingsData('payroll_leave_quota', e.target.value)}
                                                required className={inputCls} placeholder="Contoh: 3"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Tunjangan Global */}
                                <div className="border-t border-dashed border-slate-200 dark:border-slate-700 pt-5">
                                    <h4 className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-3">💚 Tunjangan Global (Sama Semua Karyawan)</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tunjangan Konsumsi (Rp)</label>
                                            <input type="text"
                                                value={formatNumberInput(settingsData.payroll_tunjangan_konsumsi)}
                                                onChange={e => setSettingsData('payroll_tunjangan_konsumsi', parseNumberInput(e.target.value))}
                                                required className={inputCls} placeholder="Contoh: 100.000"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2">Tunjangan Jabatan, Tunjangan Masa Kerja, & Tunjangan Kesehatan diisi manual per karyawan saat edit draf.</p>
                                </div>

                                {/* Potongan Global */}
                                <div className="border-t border-dashed border-slate-200 dark:border-slate-700 pt-5">
                                    <h4 className="text-xs font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-3">🔴 Potongan Global (Sama Semua Karyawan)</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Biaya Konsumsi / Hari Mangkir (Rp)</label>
                                            <input type="text"
                                                value={formatNumberInput(settingsData.payroll_biaya_konsumsi_per_hari)}
                                                onChange={e => setSettingsData('payroll_biaya_konsumsi_per_hari', parseNumberInput(e.target.value))}
                                                required className={inputCls} placeholder="Contoh: 13.000"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nominal BPJS (Rp) — Terapkan Masal</label>
                                            <input type="text"
                                                value={formatNumberInput(settingsData.payroll_bpjs_amount)}
                                                onChange={e => setSettingsData('payroll_bpjs_amount', parseNumberInput(e.target.value))}
                                                required className={inputCls} placeholder="Contoh: 100.000"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2">Agnia Care/Zakat & Kasbon diisi manual per karyawan saat edit draf. BPJS diterapkan via tombol "Terapkan BPJS" di tabel.</p>
                                </div>

                                {/* Periode & Otomasi */}
                                <div className="border-t border-dashed border-slate-200 dark:border-slate-700 pt-5">
                                    <h4 className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3">🗓️ Pengaturan Periode & Otomatisasi</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tanggal Mulai Periode</label>
                                            <input type="number" min="1" max="31"
                                                value={settingsData.payroll_period_start_day}
                                                onChange={e => setSettingsData('payroll_period_start_day', e.target.value)}
                                                required className={inputCls} placeholder="26"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tanggal Selesai Periode</label>
                                            <input type="number" min="1" max="31"
                                                value={settingsData.payroll_period_end_day}
                                                onChange={e => setSettingsData('payroll_period_end_day', e.target.value)}
                                                required className={inputCls} placeholder="25"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Hari Eksekusi Otomatis</label>
                                            <input type="number" min="1" max="31"
                                                value={settingsData.payroll_auto_calculate_day}
                                                onChange={e => setSettingsData('payroll_auto_calculate_day', e.target.value)}
                                                required className={inputCls} placeholder="26"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Kalkulasi Otomatis</label>
                                            <select
                                                value={settingsData.payroll_auto_calculate_enabled}
                                                onChange={e => setSettingsData('payroll_auto_calculate_enabled', e.target.value)}
                                                required className={inputCls}
                                            >
                                                <option value="0">Nonaktif</option>
                                                <option value="1">Aktif (Otomatis)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button type="submit" disabled={processingSettings}
                                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/10 transition-all text-xs"
                                    >
                                        {processingSettings ? 'Menyimpan...' : 'Simpan Parameter Penggajian'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* ── CALCULATOR CARDS ──────────────────────────────────── */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Filter */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Pilih Periode Gaji</h3>
                            <form onSubmit={handleFilter} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Bulan</label>
                                    <select value={month} onChange={(e) => {
                                        const nm = parseInt(e.target.value); setMonth(nm);
                                        setData(prev => ({ ...prev, month: nm, start_date: getCalculatedStartDate(nm, prev.year), end_date: getCalculatedEndDate(nm, prev.year) }));
                                    }} className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500">
                                        {months.map((m, idx) => <option key={idx} value={idx + 1}>{m}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tahun</label>
                                    <select value={year} onChange={(e) => {
                                        const ny = parseInt(e.target.value); setYear(ny);
                                        setData(prev => ({ ...prev, year: ny, start_date: getCalculatedStartDate(prev.month, ny), end_date: getCalculatedEndDate(prev.month, ny) }));
                                    }} className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500">
                                        {currentYearList.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-sm transition-all">
                                    Tampilkan Data
                                </button>
                            </form>
                        </div>

                        {/* Auto-Calculate */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 md:col-span-2">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center">
                                <CurrencyDollarIcon className="w-6 h-6 text-indigo-500 mr-2" />
                                Kalkulator Gaji Otomatis
                            </h3>
                            <p className="text-xs text-gray-500 mb-4">
                                Sistem mengalkulasikan Gaji Pokok, Tunjangan Global, Lembur, Jatah Libur tidak diambil, dan Potongan Kehadiran (mangkir + terlambat proporsional).
                            </p>
                            <form onSubmit={handleCalculate} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tanggal Mulai Periode</label>
                                        <input type="date" value={data.start_date} onChange={(e) => setData('start_date', e.target.value)} required
                                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500 text-xs"
                                        />
                                        {errors.start_date && <p className="text-red-500 text-xs mt-1">{errors.start_date}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tanggal Selesai Periode</label>
                                        <input type="date" value={data.end_date} onChange={(e) => setData('end_date', e.target.value)} required
                                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500 text-xs"
                                        />
                                        {errors.end_date && <p className="text-red-500 text-xs mt-1">{errors.end_date}</p>}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Pilih Karyawan</label>
                                    <select value={data.user_id} onChange={(e) => setData('user_id', e.target.value)} required
                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500">
                                        <option value="">-- Pilih Karyawan --</option>
                                        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({formatRupiah(emp.basic_salary)})</option>)}
                                    </select>
                                    {errors.user_id && <p className="text-red-500 text-xs mt-1">{errors.user_id}</p>}
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                    <button type="submit" disabled={processing}
                                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md transition-all text-sm">
                                        {processing ? 'Menghitung...' : 'Hitung & Buat Draf'}
                                    </button>
                                    <button type="button" onClick={handleCalculateBulk}
                                        className="py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-md transition-all text-sm">
                                        ⚡ Hitung Masal
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* ── PAYROLL TABLE ─────────────────────────────────────── */}
                    <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center flex-wrap gap-3">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                                Rekap Gaji: {months[month - 1]} {year}
                            </h3>
                            {selectedPayrollIds.length > 0 && (
                                <div className="flex gap-2 flex-wrap">
                                    <button onClick={handleApplyBpjs}
                                        className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-all flex items-center gap-1.5">
                                        🏥 Terapkan BPJS ({selectedPayrollIds.length})
                                    </button>
                                    <button onClick={handlePayBulk}
                                        className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow transition-all flex items-center gap-1.5">
                                        <CheckIcon className="w-4 h-4" />
                                        Tandai Lunas Masal ({selectedPayrollIds.length})
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                        <th className="w-12 px-4 py-4 text-center">
                                            <input type="checkbox"
                                                className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                checked={payrolls.length > 0 && payrolls.filter(p => p.status === 'draft').every(p => selectedPayrollIds.includes(p.id))}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedPayrollIds(payrolls.filter(p => p.status === 'draft').map(p => p.id));
                                                    else setSelectedPayrollIds([]);
                                                }}
                                                disabled={!payrolls.some(p => p.status === 'draft')}
                                            />
                                        </th>
                                        <th className="px-4 py-4 font-medium text-gray-900 dark:text-white text-xs">Karyawan</th>
                                        <th className="px-4 py-4 font-medium text-gray-900 dark:text-white text-xs">Gaji Pokok</th>
                                        <th className="px-4 py-4 font-medium text-emerald-700 dark:text-emerald-400 text-xs">Penerimaan</th>
                                        <th className="px-4 py-4 font-medium text-indigo-700 dark:text-indigo-400 text-xs">Lembur</th>
                                        <th className="px-4 py-4 font-medium text-rose-600 dark:text-rose-400 text-xs">Potongan</th>
                                        <th className="px-4 py-4 font-medium text-gray-900 dark:text-white text-xs font-bold">Gaji Bersih</th>
                                        <th className="px-4 py-4 font-medium text-gray-900 dark:text-white text-xs">Status</th>
                                        <th className="px-4 py-4 font-medium text-gray-900 dark:text-white text-xs text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {payrolls.map((payroll) => (
                                        <tr key={payroll.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                                            <td className="px-4 py-4 text-center">
                                                {payroll.status === 'draft' ? (
                                                    <input type="checkbox"
                                                        className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                        checked={selectedPayrollIds.includes(payroll.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedPayrollIds([...selectedPayrollIds, payroll.id]);
                                                            else setSelectedPayrollIds(selectedPayrollIds.filter(id => id !== payroll.id));
                                                        }}
                                                    />
                                                ) : (
                                                    <span className="text-emerald-500 text-xs font-black" title="Lunas">✓</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="font-bold text-gray-900 dark:text-white text-sm">{payroll.user.name}</div>
                                                <div className="text-xs text-gray-500">NIP: {payroll.user.nip || '-'}</div>
                                                {payroll.start_date && payroll.end_date && (
                                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                        🗓️ {new Date(payroll.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – {new Date(payroll.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-gray-600 dark:text-gray-300 font-mono text-xs">{formatRupiah(payroll.basic_salary)}</td>
                                            <td className="px-4 py-4">
                                                <div className="text-emerald-600 font-mono text-xs font-bold">+{formatRupiah(payroll.allowances)}</div>
                                                <div className="text-[10px] text-slate-400 space-y-0.5 mt-0.5">
                                                    {parseFloat(payroll.tunjangan_jabatan) > 0 && <div>Jabatan: {formatRupiah(payroll.tunjangan_jabatan)}</div>}
                                                    {parseFloat(payroll.tunjangan_masa_kerja) > 0 && <div>Masa Kerja: {formatRupiah(payroll.tunjangan_masa_kerja)}</div>}
                                                    {parseFloat(payroll.tunjangan_kesehatan) > 0 && <div>Kesehatan: {formatRupiah(payroll.tunjangan_kesehatan)}</div>}
                                                    {parseFloat(payroll.tunjangan_konsumsi) > 0 && <div>Konsumsi: {formatRupiah(payroll.tunjangan_konsumsi)}</div>}
                                                    {parseFloat(payroll.bonus) > 0 && <div>Bonus: {formatRupiah(payroll.bonus)}</div>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-indigo-600 font-mono text-xs">
                                                 <div>+{formatRupiah(payroll.overtime_pay)}</div>
                                                 {payroll.overtime_hours !== undefined && parseFloat(payroll.overtime_hours) > 0 && (
                                                     <div className="text-[10px] text-slate-400 font-normal">({parseFloat(payroll.overtime_hours)} jam)</div>
                                                 )}
                                             </td>
                                            <td className="px-4 py-4">
                                                <div className="text-rose-600 font-mono text-xs font-bold">-{formatRupiah(payroll.deductions)}</div>
                                                <div className="text-[10px] text-slate-400 space-y-0.5 mt-0.5">
                                                    {parseFloat(payroll.potongan_agnia_care) > 0 && <div>Agnia Care: {formatRupiah(payroll.potongan_agnia_care)}</div>}
                                                    {parseFloat(payroll.potongan_biaya_konsumsi) > 0 && (
                                                        <div>
                                                            Biaya Kons: {formatRupiah(payroll.potongan_biaya_konsumsi)}
                                                            {payroll.absent_days !== undefined && payroll.absent_days > 0 && ` (${payroll.absent_days} hari)`}
                                                        </div>
                                                    )}
                                                    {parseFloat(payroll.potongan_bpjs) > 0 && <div>BPJS: {formatRupiah(payroll.potongan_bpjs)}</div>}
                                                    {parseFloat(payroll.potongan_kehadiran) > 0 && (
                                                        <div>
                                                            Kehadiran: {formatRupiah(payroll.potongan_kehadiran)}
                                                            {((payroll.absent_days && payroll.absent_days > 0) || (payroll.late_hours && parseFloat(payroll.late_hours) > 0)) && (
                                                                ` (${payroll.absent_days || 0} hr, ${parseFloat(payroll.late_hours || '0')} jam)`
                                                            )}
                                                        </div>
                                                    )}
                                                    {parseFloat(payroll.potongan_kasbon) > 0 && <div>Kasbon: {formatRupiah(payroll.potongan_kasbon)}</div>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-gray-900 dark:text-white font-bold font-mono text-sm">{formatRupiah(payroll.net_salary)}</td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex text-xs font-bold rounded-full px-2 py-0.5 shadow-sm ${payroll.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                                    {payroll.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <div className="flex justify-center gap-2">
                                                    {payroll.status === 'draft' && (
                                                        <>
                                                            <button onClick={() => openEditModal(payroll)} title="Edit Manual" className="p-1 text-indigo-600 hover:bg-indigo-50 rounded">
                                                                <PencilIcon className="w-5 h-5" />
                                                            </button>
                                                            <button onClick={() => handlePay(payroll.id)} title="Tandai Lunas" className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                                                                <CheckIcon className="w-5 h-5" />
                                                            </button>
                                                            <button onClick={() => handleDelete(payroll.id)} title="Hapus Draf" className="p-1 text-rose-600 hover:bg-rose-50 rounded">
                                                                <TrashIcon className="w-5 h-5" />
                                                            </button>
                                                        </>
                                                    )}
                                                    {payroll.status === 'paid' && (
                                                        <a href={route('payrolls.download', payroll.id)} title="Unduh Slip Gaji PDF" target="_blank"
                                                            className="p-1 text-indigo-600 hover:bg-indigo-50 rounded">
                                                            <ArrowDownTrayIcon className="w-5 h-5" />
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {payrolls.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
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

            {/* ── EDIT DRAFT MODAL ──────────────────────────────────────── */}
            {isEditModalOpen && editingPayroll && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-modal="true" role="dialog">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
                            <form onSubmit={handleSaveEdit}>
                                <div className="bg-white dark:bg-gray-800 px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700/60">
                                    <h3 className="text-lg font-black text-gray-900 dark:text-white">✏️ Edit Manual Draf Gaji</h3>
                                    <p className="text-xs text-slate-400 mt-1">Koreksi komponen gaji untuk <strong>{editingPayroll.user.name}</strong>.</p>
                                </div>
                                <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                                    {/* Info gaji pokok */}
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono flex justify-between text-slate-500">
                                        <span>Gaji Pokok (Locked):</span>
                                        <span className="font-bold">{formatRupiah(editingPayroll.basic_salary)}</span>
                                    </div>

                                    {/* PENERIMAAN MANUAL */}
                                    <div>
                                        <h4 className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider mb-3">💚 Tunjangan Manual</h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Tunjangan Jabatan (Rp)</label>
                                                <input type="text"
                                                    value={formatNumberInput(editData.tunjangan_jabatan)}
                                                    onChange={e => setEditData('tunjangan_jabatan', parseNumberInput(e.target.value))}
                                                    required className="w-full rounded-xl border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white text-xs py-2.5 font-mono"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Tunjangan Masa Kerja (Rp)</label>
                                                <input type="text"
                                                    value={formatNumberInput(editData.tunjangan_masa_kerja)}
                                                    onChange={e => setEditData('tunjangan_masa_kerja', parseNumberInput(e.target.value))}
                                                    required className="w-full rounded-xl border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white text-xs py-2.5 font-mono"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Tunjangan Kesehatan (Rp)</label>
                                                <input type="text"
                                                    value={formatNumberInput(editData.tunjangan_kesehatan)}
                                                    onChange={e => setEditData('tunjangan_kesehatan', parseNumberInput(e.target.value))}
                                                    required className="w-full rounded-xl border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white text-xs py-2.5 font-mono"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Bonus (Rp)</label>
                                                <input type="text"
                                                    value={formatNumberInput(editData.bonus)}
                                                    onChange={e => setEditData('bonus', parseNumberInput(e.target.value))}
                                                    required className="w-full rounded-xl border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white text-xs py-2.5 font-mono"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Upah Lembur (Rp) — Override</label>
                                                <input type="text"
                                                    value={formatNumberInput(editData.overtime_pay)}
                                                    onChange={e => setEditData('overtime_pay', parseNumberInput(e.target.value))}
                                                    required className="w-full rounded-xl border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white text-xs py-2.5 font-mono"
                                                    placeholder="Auto dari presensi"
                                                />
                                                {editingPayroll.overtime_hours !== undefined && (
                                                    <p className="text-[10px] text-slate-400 mt-1">
                                                        Kalkulasi sistem: {parseFloat(editingPayroll.overtime_hours)} jam lembur.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* POTONGAN */}
                                    <div>
                                        <h4 className="text-xs font-extrabold text-rose-600 uppercase tracking-wider mb-3">🔴 Potongan Gaji</h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                                    Potongan Kehadiran (Mangkir + Terlambat) (Rp)
                                                </label>
                                                <input type="text"
                                                    value={formatNumberInput(editData.potongan_kehadiran)}
                                                    onChange={e => setEditData('potongan_kehadiran', parseNumberInput(e.target.value))}
                                                    required className="w-full rounded-xl border-rose-300 dark:border-rose-900 dark:bg-gray-900 dark:text-white text-xs py-2.5 font-mono"
                                                    placeholder="0"
                                                />
                                                {editingPayroll.absent_days !== undefined && (
                                                    <p className="text-[10px] text-slate-400 mt-1">
                                                        Kalkulasi sistem: {editingPayroll.absent_days} hari mangkir, {parseFloat(editingPayroll.late_hours || '0')} jam terlambat.
                                                    </p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                                    Biaya Konsumsi (Rp)
                                                </label>
                                                <input type="text"
                                                    value={formatNumberInput(editData.potongan_biaya_konsumsi)}
                                                    onChange={e => setEditData('potongan_biaya_konsumsi', parseNumberInput(e.target.value))}
                                                    required className="w-full rounded-xl border-rose-300 dark:border-rose-900 dark:bg-gray-900 dark:text-white text-xs py-2.5 font-mono"
                                                    placeholder="0"
                                                />
                                                {editingPayroll.absent_days !== undefined && (
                                                    <p className="text-[10px] text-slate-400 mt-1">
                                                        Kalkulasi sistem: {editingPayroll.absent_days} hari mangkir × {formatRupiah(payrollSettings.payroll_biaya_konsumsi_per_hari)}/hari.
                                                    </p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Agnia Care / Zakat (Rp)</label>
                                                <input type="text"
                                                    value={formatNumberInput(editData.potongan_agnia_care)}
                                                    onChange={e => setEditData('potongan_agnia_care', parseNumberInput(e.target.value))}
                                                    required className="w-full rounded-xl border-rose-300 dark:border-rose-900 dark:bg-gray-900 dark:text-white text-xs py-2.5 font-mono"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">BPJS (Rp)</label>
                                                <input type="text"
                                                    value={formatNumberInput(editData.potongan_bpjs)}
                                                    onChange={e => setEditData('potongan_bpjs', parseNumberInput(e.target.value))}
                                                    required className="w-full rounded-xl border-rose-300 dark:border-rose-900 dark:bg-gray-900 dark:text-white text-xs py-2.5 font-mono"
                                                    placeholder="0 (isi jika karyawan punya BPJS)"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Kasbon (Rp)</label>
                                                <input type="text"
                                                    value={formatNumberInput(editData.potongan_kasbon)}
                                                    onChange={e => setEditData('potongan_kasbon', parseNumberInput(e.target.value))}
                                                    required className="w-full rounded-xl border-rose-300 dark:border-rose-900 dark:bg-gray-900 dark:text-white text-xs py-2.5 font-mono"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/40 px-6 py-4 border-t border-gray-100 dark:border-gray-700/60 flex justify-end gap-3 rounded-b-2xl">
                                    <button type="button" onClick={() => setIsEditModalOpen(false)}
                                        className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">
                                        Batal
                                    </button>
                                    <button type="submit" disabled={processingEdit}
                                        className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all">
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
