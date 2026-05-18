import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import PrimaryButton from '@/Components/PrimaryButton';

interface Leave {
    id: number;
    user_id: number;
    type: 'cuti' | 'sakit' | 'izin';
    start_date: string;
    end_date: string;
    reason: string;
    proof_file: string | null;
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
    leaves: Leave[];
    role: 'admin' | 'employee';
}

export default function LeavesIndex({ leaves, role }: IndexProps) {
    const [showModal, setShowModal] = useState(false);
    const isAdmin = role === 'admin';

    // Form state for employee submit
    const { data, setData, post, processing, errors, reset } = useForm({
        type: 'cuti',
        start_date: '',
        end_date: '',
        reason: '',
        proof_file: null as File | null,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('leaves.store'), {
            onSuccess: () => {
                reset();
                setShowModal(false);
            },
        });
    };

    const handleApprove = (id: number) => {
        router.post(route('admin.leaves.approve', id));
    };

    const handleReject = (id: number) => {
        router.post(route('admin.leaves.reject', id));
    };

    const handleDelete = (id: number) => {
        if (confirm('Apakah Anda yakin ingin membatalkan pengajuan ini?')) {
            router.delete(route('leaves.destroy', id));
        }
    };

    const typeBadge = (type: string) => {
        const config: Record<string, string> = {
            cuti: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
            sakit: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800',
            izin: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
        };
        return config[type] || 'bg-slate-100 text-slate-800';
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
                    {isAdmin ? 'Persetujuan Cuti & Izin Karyawan' : 'Pengajuan Cuti & Izin Saya'}
                </h2>
            }
        >
            <Head title={isAdmin ? 'Persetujuan Cuti & Izin' : 'Cuti & Izin Saya'} />

            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header Action Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-150 dark:border-slate-700/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {isAdmin ? 'Daftar Pengajuan Masuk' : 'Riwayat Pengajuan Cuti & Izin'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {isAdmin 
                                ? 'Kelola dan setujui surat sakit, izin darurat, atau cuti tahunan dari karyawan.'
                                : 'Ajukan perizinan baru dan pantau status persetujuan dari tim HRD secara real-time.'}
                        </p>
                    </div>
                    {!isAdmin && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                        >
                            Ajukan Cuti / Izin
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
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Tipe</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Tanggal</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Alasan</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Bukti Dokumen</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {leaves.length === 0 ? (
                                    <tr>
                                        <td colSpan={isAdmin ? 7 : 6} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                                            Tidak ada pengajuan cuti atau izin.
                                        </td>
                                    </tr>
                                ) : (
                                    leaves.map((leave) => (
                                        <tr key={leave.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                            {isAdmin && (
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-slate-900 dark:text-white">{leave.user?.name}</div>
                                                    <div className="text-xs text-slate-400">{leave.user?.email}</div>
                                                </td>
                                            )}
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${typeBadge(leave.type)}`}>
                                                    {leave.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                <div className="font-medium">
                                                    {new Date(leave.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </div>
                                                <div className="text-xs text-slate-400 dark:text-slate-500">
                                                    s/d {new Date(leave.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate" title={leave.reason}>
                                                {leave.reason}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                {leave.proof_file ? (
                                                    <a
                                                        href={`/storage/${leave.proof_file}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold underline"
                                                    >
                                                        Lihat Dokumen &rarr;
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${statusBadge(leave.status)}`}>
                                                    {leave.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {isAdmin ? (
                                                    leave.status === 'pending' ? (
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => handleApprove(leave.id)}
                                                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase px-3 py-1.5 rounded-lg transition-all"
                                                            >
                                                                Setujui
                                                            </button>
                                                            <button
                                                                onClick={() => handleReject(leave.id)}
                                                                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase px-3 py-1.5 rounded-lg transition-all"
                                                            >
                                                                Tolak
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                                                            Diproses oleh Admin
                                                        </span>
                                                    )
                                                ) : (
                                                    leave.status === 'pending' && (
                                                        <button
                                                            onClick={() => handleDelete(leave.id)}
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

            {/* Modal Form Ajukan Izin (Employee Only) */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 transform transition-all scale-100 animate-scale-up">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700/60 flex justify-between items-center bg-slate-50/50 dark:bg-slate-850">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Form Pengajuan Cuti / Izin</h3>
                            <button
                                onClick={() => { setShowModal(false); reset(); }}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Tipe Perizinan</label>
                                <select
                                    value={data.type}
                                    onChange={(e) => setData('type', e.target.value as any)}
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-150 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                >
                                    <option value="cuti">Cuti Tahunan</option>
                                    <option value="sakit">Sakit (Butuh Surat Dokter)</option>
                                    <option value="izin">Izin Lainnya</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Tanggal Mulai</label>
                                    <input
                                        type="date"
                                        value={data.start_date}
                                        onChange={(e) => setData('start_date', e.target.value)}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-150 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                        required
                                    />
                                    {errors.start_date && <p className="text-red-500 text-xs mt-1">{errors.start_date}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Tanggal Selesai</label>
                                    <input
                                        type="date"
                                        value={data.end_date}
                                        onChange={(e) => setData('end_date', e.target.value)}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-150 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                        required
                                    />
                                    {errors.end_date && <p className="text-red-500 text-xs mt-1">{errors.end_date}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Alasan Pengajuan</label>
                                <textarea
                                    value={data.reason}
                                    onChange={(e) => setData('reason', e.target.value)}
                                    placeholder="Jelaskan alasan perizinan Anda secara jelas..."
                                    rows={3}
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-150 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    required
                                />
                                {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Dokumen Pendukung (PDF/Gambar - Opsional)</label>
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => setData('proof_file', e.target.files ? e.target.files[0] : null)}
                                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                />
                                {errors.proof_file && <p className="text-red-500 text-xs mt-1">{errors.proof_file}</p>}
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
