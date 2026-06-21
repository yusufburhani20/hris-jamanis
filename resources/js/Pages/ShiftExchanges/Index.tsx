import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import PrimaryButton from '@/Components/PrimaryButton';

interface Shift {
    id: number;
    name: string;
    code: string;
    start_time: string;
    end_time: string;
}

interface Employee {
    id: number;
    name: string;
    email: string;
}

interface ShiftExchange {
    id: number;
    user_id: number;
    target_date: string;
    type: 'shift' | 'employee';
    from_shift_id: number;
    to_shift_id: number | null;
    target_user_id: number | null;
    target_user_from_shift_id: number | null;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    approved_by: number | null;
    approved_at: string | null;
    rejection_reason: string | null;
    created_at: string;
    user?: {
        id: number;
        name: string;
        email: string;
    };
    target_user?: {
        id: number;
        name: string;
        email: string;
    };
    from_shift: Shift;
    to_shift?: Shift | null;
    target_user_from_shift?: Shift | null;
    approved_by_user?: {
        name: string;
    };
}

interface User {
    id: number;
    name: string;
    email: string;
}

interface IndexProps {
    auth: {
        user: User;
    };
    exchanges: ShiftExchange[];
    shifts: Shift[];
    employees: Employee[];
    role: 'admin' | 'employee';
}

export default function ShiftExchangesIndex({ auth, exchanges, shifts, employees, role }: IndexProps) {
    const [showModal, setShowModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectId, setRejectId] = useState<number | null>(null);
    const [rejectionReasonInput, setRejectionReasonInput] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    
    const isAdmin = role === 'admin';

    // Form state for employee submit
    const { data, setData, post, processing, errors, reset } = useForm({
        target_date: '',
        type: 'shift' as 'shift' | 'employee',
        to_shift_id: '',
        target_user_id: '',
        reason: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('shift-exchanges.store'), {
            onSuccess: () => {
                reset();
                setShowModal(false);
            },
        });
    };

    const handleApprove = (id: number) => {
        if (confirm('Apakah Anda yakin ingin menyetujui pengajuan tukar shift ini? Jadwal kerja karyawan akan otomatis diperbarui.')) {
            router.post(route('admin.shift-exchanges.approve', id));
        }
    };

    const handleRejectClick = (id: number) => {
        setRejectId(id);
        setRejectionReasonInput('');
        setShowRejectModal(true);
    };

    const handleRejectSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!rejectId) return;
        
        router.post(route('admin.shift-exchanges.reject', rejectId), {
            rejection_reason: rejectionReasonInput
        }, {
            onSuccess: () => {
                setShowRejectModal(false);
                setRejectId(null);
                setRejectionReasonInput('');
            }
        });
    };

    const handleDelete = (id: number) => {
        if (confirm('Apakah Anda yakin ingin membatalkan pengajuan ini?')) {
            router.delete(route('shift-exchanges.destroy', id));
        }
    };

    const typeBadge = (type: string) => {
        const config: Record<string, string> = {
            shift: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800',
            employee: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400 border border-teal-200 dark:border-teal-800',
        };
        return config[type] || 'bg-slate-100 text-slate-800';
    };

    const statusBadge = (status: string) => {
        const config: Record<string, string> = {
            pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800',
            approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-green-200 dark:border-emerald-800',
            rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800',
        };
        return config[status] || 'bg-slate-100 text-slate-800';
    };

    const filteredExchanges = exchanges.filter(exc => {
        if (filterStatus === 'all') return true;
        return exc.status === filterStatus;
    });

    const stats = {
        pending: exchanges.filter(e => e.status === 'pending').length,
        approved: exchanges.filter(e => e.status === 'approved').length,
        rejected: exchanges.filter(e => e.status === 'rejected').length,
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-bold leading-tight text-slate-800 dark:text-slate-200">
                    {isAdmin ? 'Persetujuan Tukar Shift Kerja' : 'Pengajuan Tukar Shift Saya'}
                </h2>
            }
        >
            <Head title={isAdmin ? 'Persetujuan Tukar Shift' : 'Tukar Shift Saya'} />

            <div className="max-w-7xl mx-auto space-y-6">
                {/* Stats Section */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Menunggu Persetujuan</p>
                            <h4 className="text-2xl font-black text-amber-500 mt-1">{stats.pending}</h4>
                        </div>
                        <span className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-xl">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </span>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Disetujui / Selesai</p>
                            <h4 className="text-2xl font-black text-emerald-500 mt-1">{stats.approved}</h4>
                        </div>
                        <span className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-xl">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        </span>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Ditolak</p>
                            <h4 className="text-2xl font-black text-rose-500 mt-1">{stats.rejected}</h4>
                        </div>
                        <span className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                        </span>
                    </div>
                </div>

                {/* Header Action Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-150 dark:border-slate-700/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {isAdmin ? 'Daftar Pengajuan Penukaran Shift Karyawan' : 'Daftar Pengajuan Tukar Shift Saya'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {isAdmin 
                                ? 'Setujui atau tolak permintaan pertukaran shift kerja antar karyawan untuk hari tertentu.'
                                : 'Ajukan penukaran shift harian Anda secara mandiri atau tukar silang dengan rekan kerja Anda.'}
                        </p>
                    </div>
                    {!isAdmin && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                            Ajukan Tukar Shift
                        </button>
                    )}
                </div>

                {/* Filters tab */}
                <div className="flex border-b border-slate-200 dark:border-slate-700 gap-6">
                    {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`pb-4 px-1 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                                filterStatus === status
                                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                        >
                            {status === 'all' ? 'Semua' : (status === 'pending' ? 'Menunggu' : (status === 'approved' ? 'Disetujui' : 'Ditolak'))}
                        </button>
                    ))}
                </div>

                {/* Table List */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-150 dark:border-slate-700/60 overflow-hidden transition-colors">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                    {isAdmin && <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Karyawan</th>}
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Jenis Tukar</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Tanggal</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Shift Asal</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Shift Baru / Rekan</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Alasan</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filteredExchanges.length === 0 ? (
                                    <tr>
                                        <td colSpan={isAdmin ? 8 : 7} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                                            Tidak ada pengajuan tukar shift untuk kategori ini.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredExchanges.map((exc) => (
                                        <tr key={exc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                            {isAdmin && (
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-900 dark:text-white">{exc.user?.name}</div>
                                                    <div className="text-[10px] text-slate-400">{exc.user?.email}</div>
                                                </td>
                                            )}
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${typeBadge(exc.type)}`}>
                                                    {exc.type === 'shift' ? 'Ganti Shift' : 'Tukar Rekan'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-350 font-semibold font-mono">
                                                {new Date(exc.target_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4 text-xs">
                                                <div className="font-bold text-slate-800 dark:text-slate-200">{exc.from_shift?.name}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">{exc.from_shift?.start_time.substring(0, 5)} - {exc.from_shift?.end_time.substring(0, 5)}</div>
                                            </td>
                                            <td className="px-6 py-4 text-xs">
                                                {exc.type === 'shift' ? (
                                                    exc.to_shift ? (
                                                        <>
                                                            <div className="font-bold text-slate-800 dark:text-slate-200">{exc.to_shift.name}</div>
                                                            <div className="text-[10px] text-slate-400 font-mono">{exc.to_shift.start_time.substring(0, 5)} - {exc.to_shift.end_time.substring(0, 5)}</div>
                                                        </>
                                                    ) : '-'
                                                ) : (
                                                    exc.target_user ? (
                                                        <>
                                                            <div className="font-bold text-indigo-600 dark:text-indigo-400">↔ {exc.target_user.name}</div>
                                                            {exc.target_user_from_shift && (
                                                                <div className="text-[10px] text-slate-400">
                                                                    (Shift Rekan: {exc.target_user_from_shift.name} {exc.target_user_from_shift.start_time.substring(0, 5)}-{exc.target_user_from_shift.end_time.substring(0, 5)})
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : '-'
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-350 max-w-xs truncate" title={exc.reason}>
                                                {exc.reason}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${statusBadge(exc.status)}`}>
                                                    {exc.status === 'pending' ? 'Menunggu' : (exc.status === 'approved' ? 'Disetujui' : 'Ditolak')}
                                                </span>
                                                {exc.status === 'rejected' && exc.rejection_reason && (
                                                    <div className="text-[10px] text-rose-500 dark:text-rose-400 mt-1 italic max-w-[150px] truncate" title={exc.rejection_reason}>
                                                        Alasan: {exc.rejection_reason}
                                                    </div>
                                                )}
                                                {exc.status === 'approved' && exc.approved_by_user && (
                                                    <div className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                                                        Oleh: {exc.approved_by_user.name}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {isAdmin ? (
                                                    exc.status === 'pending' ? (
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => handleApprove(exc.id)}
                                                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase px-3 py-1.5 rounded-lg transition-all"
                                                            >
                                                                Setujui
                                                            </button>
                                                            <button
                                                                onClick={() => handleRejectClick(exc.id)}
                                                                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] uppercase px-3 py-1.5 rounded-lg transition-all"
                                                            >
                                                                Tolak
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Selesai</span>
                                                    )
                                                ) : (
                                                    // Employee actions
                                                    exc.status === 'pending' && exc.user_id === auth.user.id ? (
                                                        <button
                                                            onClick={() => handleDelete(exc.id)}
                                                            className="text-xs text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 font-bold underline"
                                                        >
                                                            Batalkan
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">-</span>
                                                    )
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal Form Ajukan Perubahan Shift (Employee Only) */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 transform transition-all scale-100 animate-scale-up">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700/60 flex justify-between items-center bg-slate-50/50 dark:bg-slate-850">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Form Pengajuan Tukar Shift</h3>
                            <button
                                onClick={() => { setShowModal(false); reset(); }}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Tanggal Target Kerja</label>
                                <input
                                    type="date"
                                    value={data.target_date}
                                    onChange={(e) => setData('target_date', e.target.value)}
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-150 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    required
                                />
                                {errors.target_date && <p className="text-red-500 text-xs mt-1">{errors.target_date}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Tipe Penukaran</label>
                                <select
                                    value={data.type}
                                    onChange={(e) => {
                                        const typeVal = e.target.value as 'shift' | 'employee';
                                        setData(prev => ({
                                            ...prev,
                                            type: typeVal,
                                            to_shift_id: '',
                                            target_user_id: '',
                                        }));
                                    }}
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-150 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                >
                                    <option value="shift">Ganti Shift Mandiri (Ubah Shift Pribadi)</option>
                                    <option value="employee">Tukar Shift dengan Rekan Kerja (Tukar Silang)</option>
                                </select>
                            </div>

                            {data.type === 'shift' ? (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Shift Tujuan Baru</label>
                                    <select
                                        value={data.to_shift_id}
                                        onChange={(e) => setData('to_shift_id', e.target.value)}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-150 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                        required
                                    >
                                        <option value="">-- Pilih Shift Tujuan --</option>
                                        {shifts.map(shift => (
                                            <option key={shift.id} value={shift.id}>
                                                {shift.name} ({shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)})
                                            </option>
                                        ))}
                                    </select>
                                    {errors.to_shift_id && <p className="text-red-500 text-xs mt-1">{errors.to_shift_id}</p>}
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Rekan Kerja Sasaran</label>
                                    <select
                                        value={data.target_user_id}
                                        onChange={(e) => setData('target_user_id', e.target.value)}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-150 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                        required
                                    >
                                        <option value="">-- Pilih Rekan Kerja --</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.name} ({emp.email})
                                            </option>
                                        ))}
                                    </select>
                                    {errors.target_user_id && <p className="text-red-500 text-xs mt-1">{errors.target_user_id}</p>}
                                    <p className="text-[10px] text-indigo-500 dark:text-indigo-400 mt-1">
                                        *Shift kerja Anda dan rekan kerja terpilih pada tanggal target akan ditukar secara otomatis setelah disetujui Admin.
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Alasan Penukaran</label>
                                <textarea
                                    value={data.reason}
                                    onChange={(e) => setData('reason', e.target.value)}
                                    placeholder="Jelaskan alasan permohonan tukar shift Anda..."
                                    rows={3}
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-150 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    required
                                />
                                {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason}</p>}
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setShowModal(false); reset(); }}
                                    className="flex-1 border border-slate-200 dark:border-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-750 font-bold text-xs uppercase tracking-wide py-3 rounded-xl transition-all"
                                >
                                    Batal
                                </button>
                                <PrimaryButton
                                    type="submit"
                                    disabled={processing}
                                    className="flex-1 justify-center py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/20"
                                >
                                    Kirim Pengajuan
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Input Alasan Penolakan (Admin Only) */}
            {showRejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 transform transition-all scale-100">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700/60 flex justify-between items-center bg-slate-50/50 dark:bg-slate-850">
                            <h3 className="text-md font-black text-slate-900 dark:text-white">Alasan Penolakan</h3>
                            <button
                                onClick={() => { setShowRejectModal(false); setRejectId(null); }}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleRejectSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Tulis Alasan Penolakan</label>
                                <textarea
                                    value={rejectionReasonInput}
                                    onChange={(e) => setRejectionReasonInput(e.target.value)}
                                    placeholder="Tulis alasan mengapa pengajuan ini ditolak oleh Admin..."
                                    rows={3}
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-150 focus:ring-rose-500 focus:border-rose-500 text-sm"
                                    required
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setShowRejectModal(false); setRejectId(null); }}
                                    className="flex-1 border border-slate-200 dark:border-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-750 font-bold text-xs uppercase tracking-wide py-2.5 rounded-xl transition-all"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 justify-center py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs uppercase shadow-lg shadow-rose-600/20"
                                >
                                    Tolak Pengajuan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
