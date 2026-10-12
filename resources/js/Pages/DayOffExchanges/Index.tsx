import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';

interface Employee {
    id: number;
    name: string;
    email: string;
}

interface DayOffOption {
    date: string;
    formatted: string;
    short_formatted: string;
    shift_name: string;
}

interface DayOffExchange {
    id: number;
    requester_id: number;
    requester_date: string;
    target_user_id: number;
    target_date: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    approved_by: number | null;
    approved_at: string | null;
    rejection_reason: string | null;
    created_at: string;
    requester?: {
        id: number;
        name: string;
        email: string;
        role?: string;
    };
    target_user?: {
        id: number;
        name: string;
        email: string;
    };
    approved_by_user?: {
        name: string;
    };
}

interface IndexProps {
    auth: {
        user: {
            id: number;
            name: string;
            email: string;
        };
    };
    exchanges: DayOffExchange[];
    employees: Employee[];
    myDayOffs: DayOffOption[];
    role: 'admin' | 'employee';
}

export default function DayOffExchangesIndex({ auth, exchanges, employees, myDayOffs, role }: IndexProps) {
    const [showModal, setShowModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<DayOffExchange | null>(null);
    const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
    const [rejectionReasonInput, setRejectionReasonInput] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [colleagueDayOffs, setColleagueDayOffs] = useState<DayOffOption[]>([]);
    const [isLoadingColleagueOffs, setIsLoadingColleagueOffs] = useState(false);

    const isAdmin = role === 'admin';

    // Form state for submit
    const { data, setData, post, processing, errors, reset } = useForm({
        target_user_id: '',
        requester_date: '',
        target_date: '',
        reason: '',
    });

    const handleColleagueChange = async (colleagueId: string) => {
        setData('target_user_id', colleagueId);
        setData('target_date', '');
        setColleagueDayOffs([]);

        if (!colleagueId) return;

        setIsLoadingColleagueOffs(true);
        try {
            const res = await fetch(route('day-off-exchanges.colleague-dayoffs', colleagueId));
            if (res.ok) {
                const dayOffs = await res.json();
                setColleagueDayOffs(dayOffs);
            }
        } catch (err) {
            console.error('Failed to load colleague day-offs:', err);
        } finally {
            setIsLoadingColleagueOffs(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('day-off-exchanges.store'), {
            onSuccess: () => {
                reset();
                setShowModal(false);
            },
        });
    };

    const openActionModal = (exchange: DayOffExchange, type: 'approve' | 'reject') => {
        setSelectedRequest(exchange);
        setActionType(type);
        setRejectionReasonInput('');
    };

    const submitAction = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRequest) return;

        if (actionType === 'approve') {
            router.post(route('admin.day-off-exchanges.approve', selectedRequest.id), {}, {
                onSuccess: () => {
                    setSelectedRequest(null);
                    setActionType(null);
                }
            });
        } else {
            router.post(route('admin.day-off-exchanges.reject', selectedRequest.id), {
                rejection_reason: rejectionReasonInput
            }, {
                onSuccess: () => {
                    setSelectedRequest(null);
                    setActionType(null);
                }
            });
        }
    };

    const cancelRequest = (id: number) => {
        if (confirm('Apakah Anda yakin ingin membatalkan pengajuan tukar libur ini?')) {
            router.delete(route('day-off-exchanges.destroy', id));
        }
    };

    const filteredExchanges = exchanges.filter(exc => {
        if (filterStatus === 'all') return true;
        return exc.status === filterStatus;
    });

    const statusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40';
            case 'rejected':
                return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40';
            default:
                return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 animate-pulse';
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('id-ID', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-slate-800 dark:text-slate-200 leading-tight">Tukar Libur Antar Karyawan</h2>}>
            <Head title="Tukar Libur" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {/* Info Card */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold mb-3">
                            <span>🏖️ Roster Day-Off Exchange</span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-extrabold mb-2">
                            Tukar Jadwal Libur Silang (2 Tanggal)
                        </h3>
                        <p className="text-emerald-50 text-xs sm:text-sm leading-relaxed opacity-95">
                            Pertukaran jadwal libur silang menjaga jatah libur bulanan masing-masing karyawan (3x sebulan) tetap seimbang dan operasional tetap terpenuhi tanpa kekurangan staf.
                        </p>
                    </div>
                </div>

                {/* Header Action Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-150 dark:border-slate-700/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {isAdmin ? 'Daftar Pengajuan Tukar Libur Karyawan' : 'Daftar Pengajuan Tukar Libur Saya'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {isAdmin 
                                ? 'Verifikasi dan setujui pertukaran tanggal libur antar karyawan. Jadwal shift akan otomatis tertukar setelah disetujui.'
                                : 'Ajukan pertukaran tanggal libur Anda dengan rekan kerja yang memiliki jadwal libur di tanggal lain.'}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95 flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                        Ajukan Tukar Libur
                    </button>
                </div>

                {/* Filters tab */}
                <div className="flex border-b border-slate-200 dark:border-slate-700 gap-6">
                    {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`pb-4 px-1 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                                filterStatus === status
                                    ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
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
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Pemohon</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Rekan Ditukar</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Detail Pertukaran</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Alasan</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filteredExchanges.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                                            Tidak ada data pengajuan tukar libur pada kategori ini.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredExchanges.map((exc) => (
                                        <tr key={exc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900 dark:text-white text-sm">{exc.requester?.name}</div>
                                                <div className="text-[11px] text-slate-400">{exc.requester?.email}</div>
                                                {exc.requester_id === auth.user.id && (
                                                    <span className="inline-block mt-1 text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                                                        Anda (Pemohon)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900 dark:text-white text-sm">{exc.target_user?.name}</div>
                                                <div className="text-[11px] text-slate-400">{exc.target_user?.email}</div>
                                                {exc.target_user_id === auth.user.id && (
                                                    <span className="inline-block mt-1 text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
                                                        Anda (Rekan)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1.5 text-xs">
                                                    <div className="p-2 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-150 dark:border-slate-700/50">
                                                        <div className="text-[10px] text-slate-400 font-semibold uppercase">Hari 1: {formatDate(exc.requester_date)}</div>
                                                        <div className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{exc.target_user?.name}</span> Libur,{' '}
                                                            <span className="text-indigo-600 dark:text-indigo-400 font-bold">{exc.requester?.name}</span> Masuk Kerja
                                                        </div>
                                                    </div>
                                                    <div className="p-2 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-150 dark:border-slate-700/50">
                                                        <div className="text-[10px] text-slate-400 font-semibold uppercase">Hari 2: {formatDate(exc.target_date)}</div>
                                                        <div className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{exc.requester?.name}</span> Libur,{' '}
                                                            <span className="text-indigo-600 dark:text-indigo-400 font-bold">{exc.target_user?.name}</span> Masuk Kerja
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 max-w-xs">
                                                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
                                                    "{exc.reason}"
                                                </p>
                                                {exc.rejection_reason && (
                                                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                                                        Alasan Ditolak: {exc.rejection_reason}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadge(exc.status)}`}>
                                                    {exc.status === 'pending' ? 'Menunggu' : (exc.status === 'approved' ? 'Disetujui' : 'Ditolak')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {isAdmin && exc.status === 'pending' && (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => openActionModal(exc, 'approve')}
                                                            className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 rounded-lg text-xs font-bold transition-all"
                                                            title="Setujui Pengajuan"
                                                        >
                                                            Setujui
                                                        </button>
                                                        <button
                                                            onClick={() => openActionModal(exc, 'reject')}
                                                            className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 rounded-lg text-xs font-bold transition-all"
                                                            title="Tolak Pengajuan"
                                                        >
                                                            Tolak
                                                        </button>
                                                    </div>
                                                )}
                                                {!isAdmin && exc.status === 'pending' && exc.requester_id === auth.user.id && (
                                                    <button
                                                        onClick={() => cancelRequest(exc.id)}
                                                        className="text-xs text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 font-bold"
                                                    >
                                                        Batalkan
                                                    </button>
                                                )}
                                                {exc.status !== 'pending' && (
                                                    <span className="text-xs text-slate-400">-</span>
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

            {/* Modal Ajukan Tukar Libur */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-700 transition-all max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span>🏖️</span> Form Pengajuan Tukar Libur
                            </h3>
                            <button
                                onClick={() => { setShowModal(false); reset(); }}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Rekan Kerja */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                    Pilih Rekan Kerja yang Ingin Ditukar
                                </label>
                                <select
                                    value={data.target_user_id}
                                    onChange={(e) => handleColleagueChange(e.target.value)}
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                                    required
                                >
                                    <option value="" disabled>-- Pilih Karyawan --</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.email})</option>
                                    ))}
                                </select>
                                {errors.target_user_id && <p className="text-rose-500 text-xs mt-1">{errors.target_user_id}</p>}
                            </div>

                            {/* Tanggal Libur Pemohon */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                    Tanggal Libur Anda (Yang Ingin Diberikan ke Rekan)
                                </label>
                                {myDayOffs && myDayOffs.length > 0 ? (
                                    <select
                                        value={data.requester_date}
                                        onChange={(e) => setData('requester_date', e.target.value)}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                                        required
                                    >
                                        <option value="">-- Pilih Tanggal Libur Anda --</option>
                                        {myDayOffs.map(off => (
                                            <option key={off.date} value={off.date}>
                                                🏖️ {off.formatted} ({off.shift_name})
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
                                        <span className="text-base leading-none">⚠️</span>
                                        <span>Anda belum memiliki jadwal shift Libur mendatang yang diatur oleh Admin. Hubungi admin untuk mengatur jadwal roster libur Anda.</span>
                                    </div>
                                )}
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Otomatis diambil dari jadwal shift Libur yang telah di-set Admin (mencegah salah pilih/salah ketik).
                                </p>
                                {errors.requester_date && <p className="text-rose-500 text-xs mt-1">{errors.requester_date}</p>}
                            </div>

                            {/* Tanggal Libur Rekan */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                    Tanggal Libur Rekan (Yang Ingin Anda Ambil)
                                </label>
                                {!data.target_user_id ? (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs flex items-center gap-2">
                                        <span>ℹ️</span>
                                        <span>Silakan pilih rekan kerja terlebih dahulu di atas untuk melihat jadwal liburnya.</span>
                                    </div>
                                ) : isLoadingColleagueOffs ? (
                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 rounded-xl text-indigo-600 dark:text-indigo-400 text-xs flex items-center gap-2">
                                        <svg className="w-4 h-4 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                                        <span>Memeriksa jadwal libur rekan...</span>
                                    </div>
                                ) : colleagueDayOffs.length > 0 ? (
                                    <select
                                        value={data.target_date}
                                        onChange={(e) => setData('target_date', e.target.value)}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                                        required
                                    >
                                        <option value="">-- Pilih Tanggal Libur Rekan --</option>
                                        {colleagueDayOffs
                                            .filter(off => off.date !== data.requester_date)
                                            .map(off => (
                                                <option key={off.date} value={off.date}>
                                                    🏖️ {off.formatted} ({off.shift_name})
                                                </option>
                                            ))}
                                    </select>
                                ) : (
                                    <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                                        <span className="text-base leading-none">⚠️</span>
                                        <span>Rekan kerja terpilih belum memiliki jadwal shift Libur mendatang yang di-set oleh Admin.</span>
                                    </div>
                                )}
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Otomatis diambil dari jadwal shift Libur milik rekan kerja yang telah di-set Admin.
                                </p>
                                {errors.target_date && <p className="text-rose-500 text-xs mt-1">{errors.target_date}</p>}
                            </div>

                            {/* Alasan */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                    Alasan Penukaran Libur
                                </label>
                                <textarea
                                    value={data.reason}
                                    onChange={(e) => setData('reason', e.target.value)}
                                    rows={3}
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                                    placeholder="Jelaskan keperluan Anda menukar hari libur..."
                                    required
                                />
                                {errors.reason && <p className="text-rose-500 text-xs mt-1">{errors.reason}</p>}
                            </div>

                            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setShowModal(false); reset(); }}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={
                                        processing || 
                                        !myDayOffs || 
                                        myDayOffs.length === 0 || 
                                        !data.target_user_id || 
                                        colleagueDayOffs.length === 0 || 
                                        !data.requester_date || 
                                        !data.target_date
                                    }
                                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                                >
                                    {processing ? 'Mengirim...' : 'Kirim Pengajuan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Approval / Reject Admin */}
            {selectedRequest && actionType && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-700">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
                            {actionType === 'approve' ? 'Konfirmasi Persetujuan Tukar Libur' : 'Tolak Pengajuan Tukar Libur'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                            {actionType === 'approve' ? (
                                <>
                                    Menyetujui pertukaran libur antara <strong>{selectedRequest.requester?.name}</strong> ({formatDate(selectedRequest.requester_date)}) dan <strong>{selectedRequest.target_user?.name}</strong> ({formatDate(selectedRequest.target_date)}). Jadwal shift di kedua tanggal akan otomatis disesuaikan di sistem.
                                </>
                            ) : (
                                <>
                                    Apakah Anda yakin ingin menolak pengajuan pertukaran jadwal libur ini? Berikan alasan jika diperlukan.
                                </>
                            )}
                        </p>

                        <form onSubmit={submitAction} className="space-y-4">
                            {actionType === 'reject' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Alasan Penolakan</label>
                                    <textarea
                                        value={rejectionReasonInput}
                                        onChange={(e) => setRejectionReasonInput(e.target.value)}
                                        rows={3}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm focus:ring-rose-500 focus:border-rose-500"
                                        placeholder="Tulis alasan penolakan..."
                                        required
                                    />
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setSelectedRequest(null); setActionType(null); }}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold uppercase tracking-wider ${
                                        actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                                    } shadow-lg active:scale-95`}
                                >
                                    {actionType === 'approve' ? 'Ya, Setujui' : 'Tolak Pengajuan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
