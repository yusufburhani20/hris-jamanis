import { PageProps } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import React, { useState } from 'react';
import { EyeIcon } from '@heroicons/react/24/outline';

interface User {
    id: number;
    name: string;
}

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
    user: User;
    latitude: number | string | null;
    longitude: number | string | null;
    is_offline?: boolean;
    offline_device_time?: string | null;
    created_at?: string;
    time_details?: string | null;
    accuracy?: number | string | null;
    checkout_accuracy?: number | string | null;
    late_details?: { hours: number; minutes: number; text: string } | null;
    overtime_details?: { hours: number; minutes: number; text: string } | null;
    early_leave_details?: { hours: number; minutes: number; text: string } | null;
}

export default function AttendanceIndex({ auth, attendances, users, filters }: PageProps<{ attendances: Attendance[], users: User[], filters: { start_date?: string, end_date?: string, user_id?: string, month?: string } }>) {
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');
    const [userId, setUserId] = useState(filters.user_id || '');
    const [month, setMonth] = useState(filters.month || '');
    const [photoViewer, setPhotoViewer] = useState<{ 
        checkin: string | null, 
        checkout: string | null, 
        checkinTime: string | null, 
        checkoutTime: string | null,
        userName?: string,
        date?: string,
        checkinCoords?: string | null,
        isOffline?: boolean,
        offlineDeviceTime?: string | null,
        createdAt?: string
    } | null>(null);

    const getMonthOptions = () => {
        const options = [];
        const today = new Date();
        // Generate last 12 months going backwards
        for (let i = 0; i < 12; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
            options.push({ value, label });
        }
        return options;
    };

    const applyFilter = (newUserId: string, newMonth: string, newStartDate: string, newEndDate: string) => {
        router.get(route('admin.attendances.index'), {
            start_date: newStartDate,
            end_date: newEndDate,
            user_id: newUserId,
            month: newMonth
        }, {
            preserveState: true,
            preserveScroll: true
        });
    };

    const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setUserId(val);
        applyFilter(val, month, startDate, endDate);
    };

    const handleMonthSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setMonth(val);
        let nextStartDate = startDate;
        let nextEndDate = endDate;
        if (val) {
            nextStartDate = '';
            nextEndDate = '';
            setStartDate('');
            setEndDate('');
        }
        applyFilter(userId, val, nextStartDate, nextEndDate);
    };

    const handleCustomDateChange = (type: 'start' | 'end', val: string) => {
        if (type === 'start') {
            setStartDate(val);
        } else {
            setEndDate(val);
        }
        if (val) {
            setMonth('');
        }
    };

    const handleFilter = () => {
        applyFilter(userId, month, startDate, endDate);
    };

    const handleExport = (type: 'excel' | 'pdf') => {
        const baseUrl = route(`admin.attendances.export.${type}`);
        const params = new URLSearchParams({
            start_date: startDate,
            end_date: endDate,
            user_id: userId,
            month: month
        });
        window.open(`${baseUrl}?${params.toString()}`, '_blank');
    };

    const openPhotoViewer = (record: Attendance) => {
        setPhotoViewer({
            checkin: record.photo_url,
            checkout: record.checkout_photo_url,
            checkinTime: record.check_in,
            checkoutTime: record.check_out,
            userName: record.user.name,
            date: new Date(record.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
            checkinCoords: record.latitude && record.longitude ? `${record.latitude}, ${record.longitude}` : null,
            isOffline: record.is_offline,
            offlineDeviceTime: record.offline_device_time,
            createdAt: record.created_at,
        });
    };

    const hasPhoto = (record: Attendance) => !!(record.photo_url || record.checkout_photo_url);

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Laporan & Tinjauan Absensi</h2>}
        >
            <Head title="Attendances" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-4">
                    {/* Filters & Actions Card */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex flex-col md:flex-row md:items-end gap-4">
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Karyawan</label>
                                    <select 
                                        value={userId}
                                        onChange={handleUserChange}
                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    >
                                        <option value="">Semua Karyawan</option>
                                        {users && users.map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Pilih Bulan</label>
                                    <select 
                                        value={month}
                                        onChange={handleMonthSelectChange}
                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    >
                                        <option value="">Pilih Bulan...</option>
                                        {getMonthOptions().map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tanggal Mulai</label>
                                    <input 
                                        type="date" 
                                        value={startDate}
                                        onChange={(e) => handleCustomDateChange('start', e.target.value)}
                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tanggal Selesai</label>
                                    <input 
                                        type="date" 
                                        value={endDate}
                                        onChange={(e) => handleCustomDateChange('end', e.target.value)}
                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button 
                                    onClick={handleFilter}
                                    className="px-6 py-2 bg-secondary hover:bg-secondary-hover text-white rounded-lg font-bold shadow-sm transition-all flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    Filter
                                </button>
                                <button 
                                    onClick={() => handleExport('excel')}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm transition-all flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    Excel
                                </button>
                                <button 
                                    onClick={() => handleExport('pdf')}
                                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-sm transition-all flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                    PDF
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                        <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">Date</th>
                                        <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">Employee</th>
                                        <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">Check In</th>
                                        <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">Check Out</th>
                                        <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">Status & Verif</th>
                                        <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">Terlambat</th>
                                        <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">Pulang Awal</th>
                                        <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">Lembur</th>
                                        <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">Notes</th>
                                        <th className="px-6 py-4 font-medium text-gray-900 dark:text-white text-center">Photo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {attendances.map((record) => (
                                        <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{new Date(record.date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{record.user.name}</td>
                                             <td className="px-6 py-4">
                                                 <div className="flex flex-col">
                                                     <span className="text-gray-600 dark:text-gray-300 font-semibold">{record.check_in || '-'}</span>
                                                     {record.check_in && record.accuracy && (
                                                         <span className={`text-[10px] font-extrabold flex items-center gap-0.5 mt-0.5 ${
                                                             Number(record.accuracy) <= 15 ? 'text-emerald-600 dark:text-emerald-400' :
                                                             Number(record.accuracy) <= 50 ? 'text-amber-600 dark:text-amber-400' :
                                                             'text-rose-600 dark:text-rose-400'
                                                         }`} title="Akurasi koordinat GPS saat Check-In">
                                                             🎯 {Math.round(Number(record.accuracy))}m
                                                         </span>
                                                     )}
                                                 </div>
                                             </td>
                                             <td className="px-6 py-4">
                                                 <div className="flex flex-col">
                                                     <span className="text-gray-600 dark:text-gray-300 font-semibold">{record.check_out || '-'}</span>
                                                     {record.check_out && record.checkout_accuracy && (
                                                         <span className={`text-[10px] font-extrabold flex items-center gap-0.5 mt-0.5 ${
                                                             Number(record.checkout_accuracy) <= 15 ? 'text-emerald-600 dark:text-emerald-400' :
                                                             Number(record.checkout_accuracy) <= 50 ? 'text-amber-600 dark:text-amber-400' :
                                                             'text-rose-600 dark:text-rose-400'
                                                         }`} title="Akurasi koordinat GPS saat Check-Out">
                                                             🎯 {Math.round(Number(record.checkout_accuracy))}m
                                                         </span>
                                                     )}
                                                 </div>
                                             </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col space-y-1">
                                                    <span className={`inline-flex text-xs font-bold rounded-full px-2 py-0.5 w-max shadow-sm 
                                                        ${record.status === 'hadir' ? 'bg-emerald-100 text-emerald-800' : 
                                                          record.status === 'terlambat' ? 'bg-amber-100 text-amber-800' : 
                                                          record.status === 'pulang_awal' ? 'bg-orange-100 text-orange-800' : 
                                                          record.status === 'lembur' ? 'bg-indigo-100 text-indigo-800' : 
                                                          'bg-gray-100 text-gray-800'}`}>
                                                        {record.status.replace('_', ' ').toUpperCase()}
                                                    </span>
                                                    <span className={`inline-flex text-[10px] uppercase font-black rounded-full px-2 py-0.5 w-max border ${record.verification_status === 'valid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                        {record.verification_status.replace('_', ' ')}
                                                    </span>
                                                    {record.is_mocked && (
                                                        <span className="inline-flex items-center gap-1 text-[9px] uppercase font-black rounded-full px-2 py-0.5 w-max bg-rose-100 text-rose-800 border border-rose-350 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800 animate-pulse">
                                                            ⚠️ GPS PALSU
                                                        </span>
                                                    )}
                                                    {record.is_offline && (
                                                        <span 
                                                            className="inline-flex items-center gap-1 text-[9px] uppercase font-black rounded-full px-2 py-0.5 w-max bg-amber-100 text-amber-800 border border-amber-200 cursor-help"
                                                            title={`Sinkronisasi Offline&#10;Waktu Klaim HP: ${record.offline_device_time || '-'}&#10;Diterima Server: ${record.created_at ? new Date(record.created_at).toLocaleString('id-ID') : '-'}`}
                                                        >
                                                            ⚡ OFFLINE SYNC
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            {/* Kolom Terlambat */}
                                            <td className="px-6 py-4">
                                                {record.late_details ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 rounded-full px-2.5 py-0.5 w-max">
                                                            ⏰ {record.late_details.text}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400">
                                                            {record.late_details.hours > 0
                                                                ? `${record.late_details.hours} jam ${record.late_details.minutes} menit`
                                                                : `${record.late_details.minutes} menit`
                                                            }
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                                                )}
                                            </td>
                                            {/* Kolom Pulang Awal */}
                                            <td className="px-6 py-4">
                                                {record.early_leave_details ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-800 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-300 border border-orange-200 dark:border-orange-800/50 rounded-full px-2.5 py-0.5 w-max">
                                                            🏃 {record.early_leave_details.text}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400">
                                                            {record.early_leave_details.hours > 0
                                                                ? `${record.early_leave_details.hours} jam ${record.early_leave_details.minutes} menit`
                                                                : `${record.early_leave_details.minutes} menit`
                                                            }
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                                                )}
                                            </td>
                                            {/* Kolom Lembur */}
                                            <td className="px-6 py-4">
                                                {record.overtime_details ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 rounded-full px-2.5 py-0.5 w-max">
                                                            🌙 {record.overtime_details.text}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400">
                                                            {record.overtime_details.hours > 0
                                                                ? `${record.overtime_details.hours} jam ${record.overtime_details.minutes} menit`
                                                                : `${record.overtime_details.minutes} menit`
                                                            }
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate" title={record.system_notes || ''}>
                                                {record.system_notes || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => openPhotoViewer(record)}
                                                    title="Lihat Foto"
                                                    className="text-gray-500 hover:text-primary transition-colors"
                                                >
                                                    <EyeIcon className="w-5 h-5 mx-auto" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {attendances.length === 0 && (
                                        <tr>
                                            <td colSpan={10} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                                No attendance records found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Photo Viewer Modal — always show both slots */}
            {photoViewer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-80" onClick={() => setPhotoViewer(null)}>
                    <div className="relative bg-white dark:bg-gray-800 rounded-xl p-4 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-3">
                            <h3 className="font-bold text-gray-900 dark:text-white text-lg">Foto Absensi</h3>
                            <button onClick={() => setPhotoViewer(null)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* Check-In Photo */}
                            <div className="flex flex-col items-center">
                                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                                    Foto Check-In {photoViewer.checkinTime && <span className="text-gray-400 normal-case font-normal">— {photoViewer.checkinTime}</span>}
                                </div>
                                <div className="relative w-full rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden bg-slate-50 dark:bg-slate-900/50">
                                    {photoViewer.checkin ? (
                                        <>
                                            <img src={photoViewer.checkin} alt="Check-In Selfie" className="max-h-[55vh] rounded-lg object-contain w-full" />
                                            <div className="absolute bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-sm text-white p-3 text-[10px] space-y-0.5 border-t border-white/10 select-none text-left">
                                                <p className="font-extrabold text-indigo-400 tracking-wider flex items-center gap-1">
                                                    📸 LIVE PHOTO VERIFIED
                                                    {photoViewer.isOffline && <span className="bg-amber-500 text-slate-950 px-1 py-0.2 rounded font-black text-[8px]">OFFLINE</span>}
                                                </p>
                                                <p>👤 <b>Karyawan:</b> {photoViewer.userName}</p>
                                                <p>📅 <b>Tanggal:</b> {photoViewer.date}</p>
                                                <p>⏰ <b>Waktu:</b> {photoViewer.checkinTime}</p>
                                                {photoViewer.checkinCoords && <p>📍 <b>GPS:</b> {photoViewer.checkinCoords}</p>}
                                                {photoViewer.isOffline && (
                                                    <>
                                                        <p className="text-amber-400">⚡ <b>Waktu Klaim HP:</b> {photoViewer.offlineDeviceTime}</p>
                                                        <p className="text-amber-400">📥 <b>Diterima Server:</b> {photoViewer.createdAt ? new Date(photoViewer.createdAt).toLocaleString('id-ID') : '-'}</p>
                                                    </>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full max-h-[55vh] h-64 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/30">
                                            <svg className="w-12 h-12 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            <p className="text-sm">Foto tidak tersedia</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Check-Out Photo */}
                            <div className="flex flex-col items-center">
                                <div className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-orange-500 inline-block animate-pulse"></span>
                                    Foto Check-Out {photoViewer.checkoutTime && <span className="text-gray-400 normal-case font-normal">— {photoViewer.checkoutTime}</span>}
                                </div>
                                <div className="relative w-full rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden bg-slate-50 dark:bg-slate-900/50">
                                    {photoViewer.checkout ? (
                                        <>
                                            <img src={photoViewer.checkout} alt="Check-Out Selfie" className="max-h-[55vh] rounded-lg object-contain w-full" />
                                            <div className="absolute bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-sm text-white p-3 text-[10px] space-y-0.5 border-t border-white/10 select-none text-left">
                                                <p className="font-extrabold text-amber-400 tracking-wider flex items-center gap-1">
                                                    📸 LIVE PHOTO VERIFIED
                                                    {photoViewer.isOffline && <span className="bg-amber-500 text-slate-950 px-1 py-0.2 rounded font-black text-[8px]">OFFLINE</span>}
                                                </p>
                                                <p>👤 <b>Karyawan:</b> {photoViewer.userName}</p>
                                                <p>📅 <b>Tanggal:</b> {photoViewer.date}</p>
                                                <p>⏰ <b>Waktu:</b> {photoViewer.checkoutTime}</p>
                                                {photoViewer.checkinCoords && <p>📍 <b>GPS:</b> {photoViewer.checkinCoords}</p>}
                                                {photoViewer.isOffline && (
                                                    <>
                                                        <p className="text-amber-400">⚡ <b>Waktu Klaim HP:</b> {photoViewer.offlineDeviceTime}</p>
                                                        <p className="text-amber-400">📥 <b>Diterima Server:</b> {photoViewer.createdAt ? new Date(photoViewer.createdAt).toLocaleString('id-ID') : '-'}</p>
                                                    </>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full max-h-[55vh] h-64 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/30">
                                            <svg className="w-12 h-12 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            <p className="text-sm">{photoViewer.checkoutTime ? 'Foto tidak tersedia' : 'Belum Check-Out'}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
