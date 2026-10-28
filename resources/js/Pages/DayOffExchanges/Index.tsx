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

interface WorkDayOption {
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

interface DayOffReschedule {
    id: number;
    user_id: number;
    original_date: string;
    target_date: string;
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
        role?: string;
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
    reschedules?: DayOffReschedule[];
    employees: Employee[];
    myDayOffs: DayOffOption[];
    myWorkDays?: WorkDayOption[];
    role: 'admin' | 'employee';
}

export default function DayOffExchangesIndex({ 
    auth, 
    exchanges = [], 
    reschedules = [], 
    employees = [], 
    myDayOffs = [], 
    myWorkDays = [], 
    role 
}: IndexProps) {
    const isAdmin = role === 'admin';

    // Main Tab Navigation: 'reschedule' (Pindah Libur Mandiri) or 'exchange' (Tukar Libur Rekan)
    const [activeTab, setActiveTab] = useState<'reschedule' | 'exchange'>('reschedule');
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

    // --- State for Pindah Libur Mandiri (Reschedule) ---
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [selectedReschedule, setSelectedReschedule] = useState<DayOffReschedule | null>(null);
    const [rescheduleActionType, setRescheduleActionType] = useState<'approve' | 'reject' | null>(null);
    const [rescheduleRejectionReason, setRescheduleRejectionReason] = useState('');

    const {
        data: resData,
        setData: setResData,
        post: postReschedule,
        processing: resProcessing,
        errors: resErrors,
        reset: resetReschedule
    } = useForm({
        original_date: '',
        target_date: '',
        reason: '',
    });

    const openCreateRescheduleModal = () => {
        resetReschedule();
        if (myDayOffs && myDayOffs.length > 0) {
            setResData('original_date', myDayOffs[0].date);
        }
        setShowRescheduleModal(true);
    };

    const handleRescheduleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postReschedule(route('day-off-reschedules.store'), {
            onSuccess: () => {
                resetReschedule();
                setShowRescheduleModal(false);
            },
        });
    };

    const openRescheduleActionModal = (item: DayOffReschedule, type: 'approve' | 'reject') => {
        setSelectedReschedule(item);
        setRescheduleActionType(type);
        setRescheduleRejectionReason('');
    };

    const submitRescheduleAction = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReschedule) return;

        if (rescheduleActionType === 'approve') {
            router.post(route('admin.day-off-reschedules.approve', selectedReschedule.id), {}, {
                onSuccess: () => {
                    setSelectedReschedule(null);
                    setRescheduleActionType(null);
                }
            });
        } else {
            router.post(route('admin.day-off-reschedules.reject', selectedReschedule.id), {
                rejection_reason: rescheduleRejectionReason
            }, {
                onSuccess: () => {
                    setSelectedReschedule(null);
                    setRescheduleActionType(null);
                }
            });
        }
    };

    const cancelReschedule = (id: number) => {
        if (confirm('Apakah Anda yakin ingin membatalkan pengajuan pindah libur ini?')) {
            router.delete(route('day-off-reschedules.destroy', id));
        }
    };

    // --- State for Tukar Libur Rekan (Exchange) ---
    const [showExchangeModal, setShowExchangeModal] = useState(false);
    const [selectedExchange, setSelectedExchange] = useState<DayOffExchange | null>(null);
    const [exchangeActionType, setExchangeActionType] = useState<'approve' | 'reject' | null>(null);
    const [exchangeRejectionReason, setExchangeRejectionReason] = useState('');
    const [colleagueDayOffs, setColleagueDayOffs] = useState<DayOffOption[]>([]);
    const [isLoadingColleagueOffs, setIsLoadingColleagueOffs] = useState(false);

    const {
        data: excData,
        setData: setExcData,
        post: postExchange,
        processing: excProcessing,
        errors: excErrors,
        reset: resetExchange
    } = useForm({
        target_user_id: '',
        requester_date: '',
        target_date: '',
        reason: '',
    });

    const openCreateExchangeModal = () => {
        resetExchange();
        setColleagueDayOffs([]);
        if (myDayOffs && myDayOffs.length === 1) {
            setExcData(prev => ({
                ...prev,
                requester_date: myDayOffs[0].date,
            }));
        }
        setShowExchangeModal(true);
    };

    const handleColleagueChange = async (colleagueId: string) => {
        setExcData(prev => ({
            ...prev,
            target_user_id: colleagueId,
            target_date: '',
        }));
        setColleagueDayOffs([]);

        if (!colleagueId) return;

        setIsLoadingColleagueOffs(true);
        try {
            let url = `/day-off-exchanges/colleague/${colleagueId}`;
            try {
                if (typeof route === 'function') {
                    url = route('day-off-exchanges.colleague-dayoffs', colleagueId);
                }
            } catch {
                url = `/day-off-exchanges/colleague/${colleagueId}`;
            }

            const res = await fetch(url);
            if (res.ok) {
                const dayOffs: DayOffOption[] = await res.json();
                setColleagueDayOffs(dayOffs);

                const available = dayOffs.filter(d => d.date !== excData.requester_date);
                if (available.length === 1) {
                    setExcData(prev => ({
                        ...prev,
                        target_user_id: colleagueId,
                        target_date: available[0].date,
                    }));
                }
            }
        } catch (err) {
            console.error('Failed to load colleague day-offs:', err);
        } finally {
            setIsLoadingColleagueOffs(false);
        }
    };

    const handleExchangeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postExchange(route('day-off-exchanges.store'), {
            onSuccess: () => {
                resetExchange();
                setShowExchangeModal(false);
            },
        });
    };

    const openExchangeActionModal = (exchange: DayOffExchange, type: 'approve' | 'reject') => {
        setSelectedExchange(exchange);
        setExchangeActionType(type);
        setExchangeRejectionReason('');
    };

    const submitExchangeAction = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedExchange) return;

        if (exchangeActionType === 'approve') {
            router.post(route('admin.day-off-exchanges.approve', selectedExchange.id), {}, {
                onSuccess: () => {
                    setSelectedExchange(null);
                    setExchangeActionType(null);
                }
            });
        } else {
            router.post(route('admin.day-off-exchanges.reject', selectedExchange.id), {
                rejection_reason: exchangeRejectionReason
            }, {
                onSuccess: () => {
                    setSelectedExchange(null);
                    setExchangeActionType(null);
                }
            });
        }
    };

    const cancelExchange = (id: number) => {
        if (confirm('Apakah Anda yakin ingin membatalkan pengajuan tukar libur ini?')) {
            router.delete(route('day-off-exchanges.destroy', id));
        }
    };

    // Filtered lists based on status
    const filteredReschedules = reschedules.filter(item => {
        if (filterStatus === 'all') return true;
        return item.status === filterStatus;
    });

    const filteredExchanges = exchanges.filter(item => {
        if (filterStatus === 'all') return true;
        return item.status === filterStatus;
    });

    const pendingReschedulesCount = reschedules.filter(r => r.status === 'pending').length;
    const pendingExchangesCount = exchanges.filter(e => e.status === 'pending').length;

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
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-slate-800 dark:text-slate-200 leading-tight">Pengelolaan & Jadwal Libur</h2>}>
            <Head title="Pengajuan & Kelola Libur" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                
                {/* Header Information Banner */}
                <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                    <div className="relative z-10 max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold mb-3">
                            <span>🏖️ Roster Day-Off Management</span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-extrabold mb-2 tracking-tight">
                            Kelola Jadwal Hari Libur Karyawan
                        </h3>
                        <p className="text-emerald-50 text-xs sm:text-sm leading-relaxed opacity-95">
                            Atur pergeseran hari libur mandiri atau tukar libur silang antar rekan kerja. Sistem menjaga kuota libur bulanan (3x per cut-off 25 s.d 24) tetap seimbang dan operasional outlet/produksi tetap stabil.
                        </p>
                    </div>
                </div>

                {/* 2-TAB NAVIGATION (Unified Module) */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-2 shadow-sm border border-slate-150 dark:border-slate-700/60 flex flex-col sm:flex-row gap-2">
                    <button
                        onClick={() => { setActiveTab('reschedule'); setFilterStatus('all'); }}
                        className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                            activeTab === 'reschedule'
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Pindah Libur Mandiri</span>
                        {pendingReschedulesCount > 0 && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                                activeTab === 'reschedule' ? 'bg-white text-emerald-700' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                            }`}>
                                {pendingReschedulesCount}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => { setActiveTab('exchange'); setFilterStatus('all'); }}
                        className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                            activeTab === 'exchange'
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <span>Tukar Libur Rekan</span>
                        {pendingExchangesCount > 0 && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                                activeTab === 'exchange' ? 'bg-white text-indigo-700' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200'
                            }`}>
                                {pendingExchangesCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* ============================================================== */}
                {/* TAB 1: PINDAH LIBUR MANDIRI                                  */}
                {/* ============================================================== */}
                {activeTab === 'reschedule' && (
                    <div className="space-y-6">
                        {/* Action Header Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-150 dark:border-slate-700/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span>🗓️</span>
                                    {isAdmin ? 'Persetujuan Pindah Libur Mandiri' : 'Pengajuan Pindah Libur Mandiri Saya'}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    {isAdmin 
                                        ? 'Tinjau pengajuan pergeseran hari libur mandiri karyawan. Tanggal asal otomatis diubah jadi hari kerja reguler, dan tanggal baru menjadi hari libur.'
                                        : 'Geser jadwal libur Anda sendiri ke tanggal kerja lain dalam periode cut-off (25 s.d 24) tanpa perlu mencari rekan pengganti.'}
                                </p>
                            </div>
                            <button
                                onClick={openCreateRescheduleModal}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                Ajukan Pindah Libur
                            </button>
                        </div>

                        {/* Status Filters */}
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

                        {/* Table List of Reschedules */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-150 dark:border-slate-700/60 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Karyawan</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Detail Pergeseran Libur</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Alasan</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {filteredReschedules.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                                                    Tidak ada data pengajuan pindah libur pada kategori ini.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredReschedules.map((item) => (
                                                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-slate-900 dark:text-white text-sm">{item.user?.name}</div>
                                                        <div className="text-[11px] text-slate-400">{item.user?.email}</div>
                                                        {item.user_id === auth.user.id && (
                                                            <span className="inline-block mt-1 text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-semibold">
                                                                Anda
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="space-y-1.5 text-xs">
                                                            <div className="p-2.5 bg-rose-50/60 dark:bg-rose-950/20 rounded-xl border border-rose-150 dark:border-rose-900/30 flex items-center justify-between">
                                                                <div>
                                                                    <div className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">Libur Semula (Batal Libur)</div>
                                                                    <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                                                                        {formatDate(item.original_date)}
                                                                    </div>
                                                                </div>
                                                                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded font-bold">
                                                                    Masuk Kerja
                                                                </span>
                                                            </div>

                                                            <div className="p-2.5 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-150 dark:border-emerald-900/30 flex items-center justify-between">
                                                                <div>
                                                                    <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Libur Baru yang Diminta</div>
                                                                    <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                                                                        {formatDate(item.target_date)}
                                                                    </div>
                                                                </div>
                                                                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded font-bold">
                                                                    Hari Libur
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 max-w-xs">
                                                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
                                                            "{item.reason}"
                                                        </p>
                                                        {item.rejection_reason && (
                                                            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                                                                Alasan Ditolak: {item.rejection_reason}
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadge(item.status)}`}>
                                                            {item.status === 'pending' ? 'Menunggu' : (item.status === 'approved' ? 'Disetujui' : 'Ditolak')}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {isAdmin && item.status === 'pending' && (
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => openRescheduleActionModal(item, 'approve')}
                                                                    className="p-1.5 px-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 rounded-lg text-xs font-bold transition-all"
                                                                >
                                                                    Setujui
                                                                </button>
                                                                <button
                                                                    onClick={() => openRescheduleActionModal(item, 'reject')}
                                                                    className="p-1.5 px-3 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 rounded-lg text-xs font-bold transition-all"
                                                                >
                                                                    Tolak
                                                                </button>
                                                            </div>
                                                        )}
                                                        {!isAdmin && item.status === 'pending' && item.user_id === auth.user.id && (
                                                            <button
                                                                onClick={() => cancelReschedule(item.id)}
                                                                className="text-xs text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 font-bold"
                                                            >
                                                                Batalkan
                                                            </button>
                                                        )}
                                                        {item.status !== 'pending' && (
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
                )}

                {/* ============================================================== */}
                {/* TAB 2: TUKAR LIBUR REKAN                                     */}
                {/* ============================================================== */}
                {activeTab === 'exchange' && (
                    <div className="space-y-6">
                        {/* Header Action Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-150 dark:border-slate-700/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span>🔄</span>
                                    {isAdmin ? 'Persetujuan Tukar Libur Silang Rekan' : 'Pengajuan Tukar Libur Rekan Saya'}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    {isAdmin 
                                        ? 'Verifikasi dan setujui pertukaran tanggal libur silang antar 2 karyawan. Jadwal shift akan otomatis tertukar setelah disetujui.'
                                        : 'Ajukan pertukaran tanggal libur Anda dengan rekan kerja yang memiliki jadwal libur di tanggal lain.'}
                                </p>
                            </div>
                            <button
                                onClick={openCreateExchangeModal}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                Ajukan Tukar Libur
                            </button>
                        </div>

                        {/* Status Filters */}
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

                        {/* Table List of Exchanges */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-150 dark:border-slate-700/60 overflow-hidden">
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
                                                            <span className="inline-block mt-1 text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-semibold">
                                                                Anda (Pemohon)
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-slate-900 dark:text-white text-sm">{exc.target_user?.name}</div>
                                                        <div className="text-[11px] text-slate-400">{exc.target_user?.email}</div>
                                                        {exc.target_user_id === auth.user.id && (
                                                            <span className="inline-block mt-1 text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-semibold">
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
                                                                    onClick={() => openExchangeActionModal(exc, 'approve')}
                                                                    className="p-1.5 px-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 rounded-lg text-xs font-bold transition-all"
                                                                >
                                                                    Setujui
                                                                </button>
                                                                <button
                                                                    onClick={() => openExchangeActionModal(exc, 'reject')}
                                                                    className="p-1.5 px-3 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 rounded-lg text-xs font-bold transition-all"
                                                                >
                                                                    Tolak
                                                                </button>
                                                            </div>
                                                        )}
                                                        {!isAdmin && exc.status === 'pending' && exc.requester_id === auth.user.id && (
                                                            <button
                                                                onClick={() => cancelExchange(exc.id)}
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
                )}
            </div>

            {/* ============================================================== */}
            {/* MODAL 1: FORM AJUKAN PINDAH LIBUR MANDIRI                      */}
            {/* ============================================================== */}
            {showRescheduleModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-700 transition-all max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span>🗓️</span> Form Pindah Libur Mandiri
                            </h3>
                            <button
                                onClick={() => { setShowRescheduleModal(false); resetReschedule(); }}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleRescheduleSubmit} className="space-y-4">
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs">
                                ℹ️ Memindahkan hari libur Anda sendiri tidak mengubah total kuota libur bulanan. Tanggal semula akan dijadikan shift kerja reguler Anda, dan tanggal baru menjadi hari libur.
                            </div>

                            {/* 1. Tanggal Libur Semula */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                    Pilih Jadwal Libur Semula (Yang Ingin Dibatalkan/Masuk Kerja)
                                </label>
                                {myDayOffs && myDayOffs.length > 0 ? (
                                    <select
                                        value={resData.original_date}
                                        onChange={(e) => setResData('original_date', e.target.value)}
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
                                        <span>Anda belum memiliki jadwal shift Libur mendatang yang diatur dalam sistem.</span>
                                    </div>
                                )}
                                {resErrors.original_date && <p className="text-rose-500 text-xs mt-1">{resErrors.original_date}</p>}
                            </div>

                            {/* 2. Tanggal Libur Baru yang Diinginkan */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                    Pilih Tanggal Libur Baru yang Diinginkan
                                </label>
                                {myWorkDays && myWorkDays.length > 0 ? (
                                    <select
                                        value={resData.target_date}
                                        onChange={(e) => setResData('target_date', e.target.value)}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                                        required
                                    >
                                        <option value="">-- Pilih Hari Kerja dalam Periode Ini --</option>
                                        {myWorkDays
                                            .filter(work => work.date !== resData.original_date)
                                            .map(work => (
                                                <option key={work.date} value={work.date}>
                                                    📅 {work.formatted} (Shift: {work.shift_name})
                                                </option>
                                            ))}
                                    </select>
                                ) : (
                                    <input
                                        type="date"
                                        value={resData.target_date}
                                        onChange={(e) => setResData('target_date', e.target.value)}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                                        required
                                    />
                                )}
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Harus berada dalam periode cut-off yang sama (25 s.d 24) dengan tanggal semula.
                                </p>
                                {resErrors.target_date && <p className="text-rose-500 text-xs mt-1">{resErrors.target_date}</p>}
                            </div>

                            {/* 3. Alasan */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                    Alasan Pindah Libur
                                </label>
                                <textarea
                                    value={resData.reason}
                                    onChange={(e) => setResData('reason', e.target.value)}
                                    rows={3}
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                                    placeholder="Jelaskan alasan keperluan memindahkan hari libur..."
                                    required
                                />
                                {resErrors.reason && <p className="text-rose-500 text-xs mt-1">{resErrors.reason}</p>}
                            </div>

                            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setShowRescheduleModal(false); resetReschedule(); }}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={resProcessing || !resData.original_date || !resData.target_date || !resData.reason}
                                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                                >
                                    {resProcessing ? 'Mengirim...' : 'Kirim Pengajuan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* MODAL 2: FORM AJUKAN TUKAR LIBUR REKAN                         */}
            {/* ============================================================== */}
            {showExchangeModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-700 transition-all max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span>🏖️</span> Form Tukar Libur Rekan
                            </h3>
                            <button
                                onClick={() => { setShowExchangeModal(false); resetExchange(); }}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleExchangeSubmit} className="space-y-4">
                            {/* Rekan Kerja */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                    Pilih Rekan Kerja yang Ingin Ditukar
                                </label>
                                <select
                                    value={excData.target_user_id}
                                    onChange={(e) => handleColleagueChange(e.target.value)}
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                >
                                    <option value="" disabled>-- Pilih Karyawan --</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.email})</option>
                                    ))}
                                </select>
                                {excErrors.target_user_id && <p className="text-rose-500 text-xs mt-1">{excErrors.target_user_id}</p>}
                            </div>

                            {/* Tanggal Libur Pemohon */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                    Tanggal Libur Anda (Yang Ingin Diberikan ke Rekan)
                                </label>
                                {myDayOffs && myDayOffs.length > 0 ? (
                                    <select
                                        value={excData.requester_date}
                                        onChange={(e) => setExcData('requester_date', e.target.value)}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm focus:ring-indigo-500 focus:border-indigo-500 font-medium"
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
                                        <span>Anda belum memiliki jadwal shift Libur mendatang yang diatur oleh Admin.</span>
                                    </div>
                                )}
                                {excErrors.requester_date && <p className="text-rose-500 text-xs mt-1">{excErrors.requester_date}</p>}
                            </div>

                            {/* Tanggal Libur Rekan */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                    Tanggal Libur Rekan (Yang Ingin Anda Ambil)
                                </label>
                                {!excData.target_user_id ? (
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
                                        value={excData.target_date}
                                        onChange={(e) => setExcData('target_date', e.target.value)}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                                        required
                                    >
                                        <option value="">-- Pilih Tanggal Libur Rekan --</option>
                                        {colleagueDayOffs
                                            .filter(off => off.date !== excData.requester_date)
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
                                {excErrors.target_date && <p className="text-rose-500 text-xs mt-1">{excErrors.target_date}</p>}
                            </div>

                            {/* Alasan */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                    Alasan Penukaran Libur
                                </label>
                                <textarea
                                    value={excData.reason}
                                    onChange={(e) => setExcData('reason', e.target.value)}
                                    rows={3}
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Jelaskan keperluan Anda menukar hari libur..."
                                    required
                                />
                                {excErrors.reason && <p className="text-rose-500 text-xs mt-1">{excErrors.reason}</p>}
                            </div>

                            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setShowExchangeModal(false); resetExchange(); }}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={
                                        excProcessing || 
                                        !myDayOffs || 
                                        myDayOffs.length === 0 || 
                                        !excData.target_user_id || 
                                        colleagueDayOffs.length === 0 || 
                                        !excData.requester_date || 
                                        !excData.target_date
                                    }
                                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
                                >
                                    {excProcessing ? 'Mengirim...' : 'Kirim Pengajuan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* MODAL 3: APPROVAL / REJECT RESCHEDULE (ADMIN)                  */}
            {/* ============================================================== */}
            {selectedReschedule && rescheduleActionType && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-700">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
                            {rescheduleActionType === 'approve' ? 'Konfirmasi Persetujuan Pindah Libur' : 'Tolak Pengajuan Pindah Libur'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                            {rescheduleActionType === 'approve' ? (
                                <>
                                    Menyetujui pergeseran libur untuk <strong>{selectedReschedule.user?.name}</strong>. Pada tanggal <strong>{formatDate(selectedReschedule.original_date)}</strong> karyawan akan dijadwalkan masuk kerja sesuai shift regulernya, dan pada tanggal <strong>{formatDate(selectedReschedule.target_date)}</strong> karyawan akan menjadi libur.
                                </>
                            ) : (
                                <>
                                    Apakah Anda yakin ingin menolak pengajuan pindah libur mandiri ini? Berikan alasan penolakan di bawah.
                                </>
                            )}
                        </p>

                        <form onSubmit={submitRescheduleAction} className="space-y-4">
                            {rescheduleActionType === 'reject' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Alasan Penolakan</label>
                                    <textarea
                                        value={rescheduleRejectionReason}
                                        onChange={(e) => setRescheduleRejectionReason(e.target.value)}
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
                                    onClick={() => { setSelectedReschedule(null); setRescheduleActionType(null); }}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold uppercase tracking-wider ${
                                        rescheduleActionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                                    } shadow-lg active:scale-95`}
                                >
                                    {rescheduleActionType === 'approve' ? 'Ya, Setujui' : 'Tolak Pengajuan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* MODAL 4: APPROVAL / REJECT EXCHANGE (ADMIN)                    */}
            {/* ============================================================== */}
            {selectedExchange && exchangeActionType && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-700">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
                            {exchangeActionType === 'approve' ? 'Konfirmasi Persetujuan Tukar Libur' : 'Tolak Pengajuan Tukar Libur'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                            {exchangeActionType === 'approve' ? (
                                <>
                                    Menyetujui pertukaran libur antara <strong>{selectedExchange.requester?.name}</strong> ({formatDate(selectedExchange.requester_date)}) dan <strong>{selectedExchange.target_user?.name}</strong> ({formatDate(selectedExchange.target_date)}). Jadwal shift di kedua tanggal akan otomatis disesuaikan di sistem.
                                </>
                            ) : (
                                <>
                                    Apakah Anda yakin ingin menolak pengajuan pertukaran jadwal libur ini? Berikan alasan jika diperlukan.
                                </>
                            )}
                        </p>

                        <form onSubmit={submitExchangeAction} className="space-y-4">
                            {exchangeActionType === 'reject' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Alasan Penolakan</label>
                                    <textarea
                                        value={exchangeRejectionReason}
                                        onChange={(e) => setExchangeRejectionReason(e.target.value)}
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
                                    onClick={() => { setSelectedExchange(null); setExchangeActionType(null); }}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold uppercase tracking-wider ${
                                        exchangeActionType === 'approve' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                                    } shadow-lg active:scale-95`}
                                >
                                    {exchangeActionType === 'approve' ? 'Ya, Setujui' : 'Tolak Pengajuan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
