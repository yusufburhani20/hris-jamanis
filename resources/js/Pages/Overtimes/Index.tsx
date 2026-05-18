import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import PrimaryButton from '@/Components/PrimaryButton';

interface Overtime {
    id: number;
    user_id: number;
    date: string;
    hours: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    approved_by: number | null;
    approved_at: string | null;
    created_at: string;
    user?: {
        id: number;
        name: string;
        email: string;
    };
    approved_by_user?: {
        name: string;
    };
}

interface IndexProps {
    overtimes: Overtime[];
    role: 'admin' | 'employee';
}

export default function OvertimesIndex({ overtimes, role }: IndexProps) {
    const [showModal, setShowModal] = useState(false);
    const isAdmin = role === 'admin';

    // Form state for employee submit
    const { data, setData, post, processing, errors, reset } = useForm({
        date: '',
        hours: 2,
        reason: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('overtimes.store'), {
            onSuccess: () => {
                reset();
                setShowModal(false);
            },
        });
    };

    const handleApprove = (id: number) => {
        if (confirm('Setujui pengajuan lembur ini?')) {
            router.post(route('admin.overtimes.approve', id));
        }
    };

    const handleReject = (id: number) => {
        if (confirm('Tolak pengajuan lembur ini?')) {
            router.post(route('admin.overtimes.reject', id));
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Apakah Anda yakin ingin membatalkan pengajuan lembur ini?')) {
            router.delete(route('overtimes.destroy', id));
        }
    };

    const statusBadge = (status: string) => {
        const config: Record<string, string> = {
            pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800',
            approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800',
            rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800',
        };
        return config[status] || 'bg-slate-100 text-slate-800';
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-bold leading-tight text-slate-800 dark:text-slate-200">
                    {isAdmin ? 'Persetujuan Upah Lembur Karyawan' : 'Pengajuan Lembur Saya'}
                </h2>
            }
        >
            <Head title={isAdmin ? 'Persetujuan Lembur' : 'Lembur Saya'} />

            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header Action Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-150 dark:border-slate-700/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {isAdmin ? 'Daftar Pengajuan Lembur Masuk' : 'Riwayat Pengajuan Lembur'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {isAdmin 
                                ? 'Kelola dan setujui penugasan jam kerja lembur ekstra dari karyawan untuk kalkulasi upah.'
                                : 'Ajukan upah lembur mandiri atas kerja lembur yang telah Anda kerjakan secara transparan.'}
                        </p>
                    </div>
                    {!isAdmin && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                        >
                            Ajukan Lembur Baru
                        </button>
                    )}
                </div>

                {/* Table list */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-150 dark:border-slate-700/60 overflow-hidden transition-colors">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                    {isAdmin && <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Karyawan</th>}
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Tanggal Lembur</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Durasi Kerja</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Alasan Kerja Ekstra</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {overtimes.length === 0 ? (
                                    <tr>
                                        <td colSpan={isAdmin ? 6 : 5} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                                            Tidak ada pengajuan upah lembur saat ini.
                                        </td>
                                    </tr>
                                ) : (
                                    overtimes.map((overtime) => (
                                        <tr key={overtime.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                            {isAdmin && (
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-slate-900 dark:text-white">{overtime.user?.name}</div>
                                                    <div className="text-xs text-slate-400">{overtime.user?.email}</div>
                                                </td>
                                            )}
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-350">
                                                <div className="font-bold">
                                                    {new Date(overtime.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-semibold text-slate-800 dark:text-slate-100">
                                                {overtime.hours} Jam
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate" title={overtime.reason}>
                                                {overtime.reason}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${statusBadge(overtime.status)}`}>
                                                    {overtime.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {isAdmin ? (
                                                    overtime.status === 'pending' ? (
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => handleApprove(overtime.id)}
                                                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase px-3 py-1.5 rounded-lg transition-all"
                                                            >
                                                                Setujui
                                                            </button>
                                                            <button
                                                                onClick={() => handleReject(overtime.id)}
                                                                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase px-3 py-1.5 rounded-lg transition-all"
                                                            >
                                                                Tolak
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                                                            Diproses
                                                        </span>
                                                    )
                                                ) : (
                                                    overtime.status === 'pending' && (
                                                        <button
                                                            onClick={() => handleDelete(overtime.id)}
                                                            className="text-xs text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 font-bold underline"
                                                        >
                                                            Batalkan
                                                        </button>
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

            {/* Modal Form Ajukan Lembur (Employee Only) */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 transform transition-all scale-100 animate-scale-up">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700/60 flex justify-between items-center bg-slate-50/50 dark:bg-slate-850">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Form Pengajuan Lembur Baru</h3>
                            <button
                                onClick={() => { setShowModal(false); reset(); }}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Tanggal Kerja Lembur</label>
                                <input
                                    type="date"
                                    value={data.date}
                                    onChange={(e) => setData('date', e.target.value)}
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-150 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    required
                                />
                                {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Durasi Lembur (Jam)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="8"
                                    value={data.hours}
                                    onChange={(e) => setData('hours', parseInt(e.target.value))}
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-150 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    required
                                />
                                {errors.hours && <p className="text-red-500 text-xs mt-1">{errors.hours}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Alasan / Pekerjaan Ekstra Yang Dikerjakan</label>
                                <textarea
                                    value={data.reason}
                                    onChange={(e) => setData('reason', e.target.value)}
                                    placeholder="Jelaskan rincian pekerjaan lembur Anda..."
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
        </AuthenticatedLayout>
    );
}
