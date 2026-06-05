import { PageProps } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import React, { useState } from 'react';
import { EyeIcon, CalendarIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface Attendance {
    id: number;
    date: string;
    check_in: string | null;
    check_out: string | null;
    status: string;
    photo_url: string | null;
    checkout_photo_url: string | null;
    verification_status: string;
    system_notes: string | null;
    is_mocked: boolean;
}

export default function History({ auth, attendances, filters }: PageProps<{ attendances: Attendance[], filters: { start_date?: string, end_date?: string } }>) {
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');
    const [photoViewer, setPhotoViewer] = useState<{ checkin: string | null, checkout: string | null, checkinTime: string | null, checkoutTime: string | null } | null>(null);

    const handleFilter = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('attendances.history'), { 
            start_date: startDate, 
            end_date: endDate 
        }, {
            preserveState: true,
            preserveScroll: true
        });
    };

    const handleReset = () => {
        setStartDate('');
        setEndDate('');
        router.get(route('attendances.history'), {}, {
            preserveState: true,
            preserveScroll: true
        });
    };

    // Calculate dynamic stats
    const totalRecords = attendances.length;
    const stats = attendances.reduce((acc, curr) => {
        if (curr.status === 'hadir') acc.hadir++;
        else if (curr.status === 'terlambat') acc.terlambat++;
        else if (curr.status === 'lembur') acc.lembur++;
        else if (curr.status === 'pulang_awal') acc.pulang_awal++;
        return acc;
    }, { hadir: 0, terlambat: 0, lembur: 0, pulang_awal: 0 });

    const openPhotoViewer = (record: Attendance) => {
        setPhotoViewer({
            checkin: record.photo_url,
            checkout: record.checkout_photo_url,
            checkinTime: record.check_in,
            checkoutTime: record.check_out,
        });
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Riwayat Absensi Saya</h2>}
        >
            <Head title="Riwayat Absensi Saya" />

            <div className="py-6 space-y-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    
                    {/* Ringkasan Statistik */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex items-center space-x-4">
                            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                <CalendarIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-medium">Total Absen</p>
                                <h4 className="text-xl font-bold dark:text-white mt-1">{totalRecords}</h4>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex items-center space-x-4">
                            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <CheckCircleIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-medium">Hadir Tepat Waktu</p>
                                <h4 className="text-xl font-bold dark:text-white mt-1">{stats.hadir}</h4>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex items-center space-x-4">
                            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <ClockIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-medium">Terlambat</p>
                                <h4 className="text-xl font-bold dark:text-white mt-1">{stats.terlambat}</h4>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex items-center space-x-4">
                            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-medium">Lembur</p>
                                <h4 className="text-xl font-bold dark:text-white mt-1">{stats.lembur}</h4>
                            </div>
                        </div>
                    </div>

                    {/* Filter Tanggal */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm">
                        <form onSubmit={handleFilter} className="flex flex-col md:flex-row md:items-end gap-4">
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tanggal Mulai</label>
                                    <input 
                                        type="date" 
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500 text-sm py-2.5"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tanggal Selesai</label>
                                    <input 
                                        type="date" 
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500 text-sm py-2.5"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    type="submit"
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/10 transition-all flex items-center justify-center gap-2 text-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    Terapkan Filter
                                </button>
                                {(startDate || endDate) && (
                                    <button 
                                        type="button"
                                        onClick={handleReset}
                                        className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-650 text-gray-700 dark:text-white rounded-xl font-semibold transition-all text-sm"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* Tabel Riwayat Absensi */}
                    <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700/60 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 dark:bg-gray-900/40 border-b border-gray-150 dark:border-gray-700">
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tanggal</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Jam Masuk</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Jam Pulang</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Status Kehadiran</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Verifikasi Geofence</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Catatan Sistem</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-center">Foto Selfie</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                    {attendances.map((record) => (
                                        <tr key={record.id} className="hover:bg-gray-50/55 dark:hover:bg-gray-800/20 transition-colors">
                                            <td className="px-6 py-4 text-sm font-semibold text-gray-800 dark:text-gray-200">
                                                {new Date(record.date).toLocaleDateString('id-ID', {
                                                    weekday: 'short',
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-mono font-semibold">
                                                {record.check_in ? record.check_in : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-mono font-semibold">
                                                {record.check_out ? record.check_out : '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex text-xs font-bold rounded-full px-2.5 py-0.5 shadow-sm 
                                                    ${record.status === 'hadir' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30' : 
                                                      record.status === 'terlambat' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30' : 
                                                      record.status === 'pulang_awal' ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 border border-orange-100 dark:border-orange-900/30' : 
                                                      record.status === 'lembur' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30' : 
                                                      'bg-gray-50 text-gray-700 border border-gray-100 dark:bg-gray-900/10 dark:text-gray-400 dark:border-gray-800'}`}>
                                                    {record.status.replace('_', ' ').toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col space-y-1">
                                                    <span className={`inline-flex text-[10px] uppercase font-black rounded-full px-2 py-0.5 w-max border ${record.verification_status === 'valid' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800'}`}>
                                                        {record.verification_status.replace('_', ' ')}
                                                    </span>
                                                    {record.is_mocked && (
                                                        <span className="inline-flex items-center gap-1 text-[9px] uppercase font-black rounded-full px-2 py-0.5 w-max bg-rose-100 text-rose-800 border border-rose-250 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800 animate-pulse">
                                                            ⚠️ GPS PALSU
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate" title={record.system_notes || ''}>
                                                {record.system_notes || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => openPhotoViewer(record)}
                                                    className="p-1.5 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors inline-flex items-center justify-center"
                                                    title="Lihat Foto Selfie"
                                                >
                                                    <EyeIcon className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {attendances.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-gray-405 dark:text-gray-500 font-medium">
                                                Belum ada riwayat absensi pada rentang tanggal terpilih.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Photo Viewer Modal */}
            {photoViewer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setPhotoViewer(null)}>
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-3">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Bukti Foto Presensi Selfie</h3>
                                <p className="text-xs text-gray-400">Verifikasi visual absensi masuk dan pulang Anda.</p>
                            </div>
                            <button onClick={() => setPhotoViewer(null)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* Check-In Photo */}
                            <div className="flex flex-col items-center space-y-2">
                                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping"></span>
                                    <span>Foto Selfie Check-In</span>
                                    {photoViewer.checkinTime && <span className="text-gray-400 dark:text-gray-500 normal-case font-mono font-medium">— {photoViewer.checkinTime}</span>}
                                </div>
                                {photoViewer.checkin ? (
                                    <img src={photoViewer.checkin} alt="Check-In Selfie" className="max-h-[50vh] rounded-xl object-contain border border-gray-200 dark:border-gray-700 w-full shadow-md bg-gray-50 dark:bg-gray-900" />
                                ) : (
                                    <div className="w-full max-h-[50vh] h-64 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-750 text-gray-400 bg-gray-50/50 dark:bg-gray-900/30">
                                        <svg className="w-12 h-12 mb-2 opacity-40 text-gray-300 dark:text-gray-605" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        <p className="text-sm font-semibold">Foto tidak tersedia</p>
                                    </div>
                                )}
                            </div>

                            {/* Check-Out Photo */}
                            <div className="flex flex-col items-center space-y-2">
                                <div className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-orange-500 inline-block"></span>
                                    <span>Foto Selfie Check-Out</span>
                                    {photoViewer.checkoutTime && <span className="text-gray-400 dark:text-gray-500 normal-case font-mono font-medium">— {photoViewer.checkoutTime}</span>}
                                </div>
                                {photoViewer.checkout ? (
                                    <img src={photoViewer.checkout} alt="Check-Out Selfie" className="max-h-[50vh] rounded-xl object-contain border border-gray-200 dark:border-gray-700 w-full shadow-md bg-gray-50 dark:bg-gray-900" />
                                ) : (
                                    <div className="w-full max-h-[50vh] h-64 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-750 text-gray-400 bg-gray-50/50 dark:bg-gray-900/30">
                                        <svg className="w-12 h-12 mb-2 opacity-40 text-gray-300 dark:text-gray-605" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        <p className="text-sm font-semibold">{photoViewer.checkoutTime ? 'Foto tidak tersedia' : 'Belum Check-Out'}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
