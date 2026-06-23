import React, { useState, useEffect } from 'react';
import { PageProps } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { 
    CogIcon, 
    ArrowPathIcon, 
    PhotoIcon, 
    SparklesIcon, 
    ServerIcon,
    GlobeAltIcon,
    PhoneIcon,
    EnvelopeIcon,
    MapPinIcon,
    DocumentTextIcon,
    BellIcon,
    ClockIcon
} from '@heroicons/react/24/outline';

interface Settings {
    school_name: string;
    school_address: string;
    school_phone: string;
    school_email: string;
    report_location: string;
    school_logo: string | null;
    school_favicon: string | null;
    github_username: string;
    github_token: string;
    push_checkin_reminder_enabled: boolean;
    push_checkin_reminder_time: string;
    push_checkout_reminder_enabled: boolean;
    push_checkout_reminder_time: string;
    notif_payroll_paid_enabled: boolean;
    notif_leave_request_enabled: boolean;
    notif_leave_status_enabled: boolean;
    notif_overtime_request_enabled: boolean;
    notif_overtime_status_enabled: boolean;
    notif_admin_checkin_enabled: boolean;
    notif_admin_checkout_enabled: boolean;
    late_tolerance_minutes: number;
    early_checkin_tolerance_minutes: number;
}

type SettingsIndexProps = {
    settings: Settings;
    pwa_devices_stats: { total: number; staff: number; driver: number };
    pwa_devices_list: Array<{
        user_id: number;
        name: string;
        email: string;
        phone: string;
        role: string;
        count: number;
        last_active: string;
    }>;
};

export default function SettingsIndex({ 
    auth, 
    settings,
    pwa_devices_stats,
    pwa_devices_list
}: PageProps<SettingsIndexProps>) {
    const [activeTab, setActiveTab] = useState<'general' | 'system' | 'notifications'>('general');
    const [deployLogs, setDeployLogs] = useState<string>('Belum ada log pembaruan.');
    const [isDeploying, setIsDeploying] = useState<boolean>(false);
    const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
    const [testingPush, setTestingPush] = useState<boolean>(false);

    // Broadcast notification state
    const [broadcastTitle, setBroadcastTitle] = useState('📢 Pengumuman HRIS');
    const [broadcastBody, setBroadcastBody] = useState('');
    const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'staff' | 'driver'>('all');
    const [broadcastActionUrl, setBroadcastActionUrl] = useState('/dashboard');

    const sendTestPush = async () => {
        if (!broadcastTitle.trim()) {
            alert('Judul notifikasi tidak boleh kosong!');
            return;
        }
        if (!broadcastBody.trim()) {
            alert('Isi pesan notifikasi tidak boleh kosong!');
            return;
        }
        setTestingPush(true);
        try {
            const res = await fetch(route('admin.settings.test-push'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || ''
                },
                body: JSON.stringify({
                    title: broadcastTitle,
                    body: broadcastBody,
                    target: broadcastTarget,
                    action_url: broadcastActionUrl
                })
            });
            const resData = await res.json();
            if (resData.status === 'success') {
                alert('Berhasil! ' + resData.message);
                setBroadcastBody(''); // Clear text after successful broadcast
            } else {
                alert('Gagal: ' + resData.message);
            }
        } catch (err) {
            console.error('Gagal mengirim broadcast:', err);
            alert('Gagal mengirim push notifikasi. Silakan pastikan server Anda terhubung.');
        } finally {
            setTestingPush(false);
        }
    };

    const [restoreFile, setRestoreFile] = useState<File | null>(null);
    const [restoreProcessing, setRestoreProcessing] = useState<boolean>(false);
    const [resetConfirm, setResetConfirm] = useState<string>('');
    const [resetProcessing, setResetProcessing] = useState<boolean>(false);

    const handleRestoreSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!restoreFile) {
            alert('Silakan pilih file ZIP backup terlebih dahulu.');
            return;
        }
        if (!confirm('Apakah Anda yakin ingin merestore aplikasi? Semua data dan file saat ini akan ditimpa dengan data dari file backup!')) {
            return;
        }

        setRestoreProcessing(true);
        const formData = new FormData();
        formData.append('backup_file', restoreFile);

        router.post(route('admin.settings.restore'), formData, {
            forceFormData: true,
            onSuccess: () => {
                setRestoreFile(null);
                setRestoreProcessing(false);
                alert('Restorasi berhasil diselesaikan!');
            },
            onError: (errs) => {
                setRestoreProcessing(false);
                alert('Gagal merestore: ' + (errs.backup_file || 'Terjadi kesalahan sistem.'));
            },
            onFinish: () => {
                setRestoreProcessing(false);
            }
        });
    };

    const handleResetSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (resetConfirm !== 'KOSONGKAN') {
            alert('Kata kunci konfirmasi salah. Harap ketik "KOSONGKAN" dengan huruf besar.');
            return;
        }
        if (!confirm('PERINGATAN KERAS! Operasi ini akan menghapus semua data kehadiran, payroll, cuti, lembur, dan seluruh data karyawan lain secara permanen! Hanya akun admin@hris.com dan pengaturan utama yang akan dipertahankan. Apakah Anda benar-benar yakin?')) {
            return;
        }

        setResetProcessing(true);
        router.post(route('admin.settings.reset'), {}, {
            onSuccess: () => {
                setResetConfirm('');
                setResetProcessing(false);
                alert('Aplikasi berhasil dikosongkan!');
            },
            onError: () => {
                setResetProcessing(false);
                alert('Gagal mengosongkan aplikasi.');
            },
            onFinish: () => {
                setResetProcessing(false);
            }
        });
    };

    const { data, setData, errors, processing } = useForm({
        school_name: settings.school_name || 'SALIRA ACADEMY',
        school_address: settings.school_address || '',
        school_phone: settings.school_phone || '',
        school_email: settings.school_email || '',
        report_location: settings.report_location || 'Kota',
        school_logo: null as File | null | string,
        school_favicon: null as File | null | string,
        github_username: settings.github_username || '',
        github_token: settings.github_token || '',
        
        // Notification settings keys
        push_checkin_reminder_enabled: settings.push_checkin_reminder_enabled ?? true,
        push_checkin_reminder_time: settings.push_checkin_reminder_time || '07:45',
        push_checkout_reminder_enabled: settings.push_checkout_reminder_enabled ?? true,
        push_checkout_reminder_time: settings.push_checkout_reminder_time || '17:00',
        notif_payroll_paid_enabled: settings.notif_payroll_paid_enabled ?? true,
        notif_leave_request_enabled: settings.notif_leave_request_enabled ?? true,
        notif_leave_status_enabled: settings.notif_leave_status_enabled ?? true,
        notif_overtime_request_enabled: settings.notif_overtime_request_enabled ?? true,
        notif_overtime_status_enabled: settings.notif_overtime_status_enabled ?? true,
        notif_admin_checkin_enabled: settings.notif_admin_checkin_enabled ?? true,
        notif_admin_checkout_enabled: settings.notif_admin_checkout_enabled ?? true,
        late_tolerance_minutes: settings.late_tolerance_minutes ?? 0,
        early_checkin_tolerance_minutes: settings.early_checkin_tolerance_minutes ?? 60,
    });

    // File selection state for preview
    const [logoPreview, setLogoPreview] = useState<string | null>(settings.school_logo);
    const [faviconPreview, setFaviconPreview] = useState<string | null>(settings.school_favicon);

    const handleFileChange = (field: 'school_logo' | 'school_favicon', file: File | null) => {
        setData(field, file);
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (field === 'school_logo') setLogoPreview(reader.result as string);
                else setFaviconPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(route('admin.settings.update'), {
            _method: 'POST', // standard POST is fine because SettingController is Route::post
            school_name: data.school_name,
            school_address: data.school_address,
            school_phone: data.school_phone,
            school_email: data.school_email,
            report_location: data.report_location,
            school_logo: data.school_logo,
            school_favicon: data.school_favicon,
            github_username: data.github_username,
            github_token: data.github_token,
            
            // Notification settings
            push_checkin_reminder_enabled: data.push_checkin_reminder_enabled,
            push_checkin_reminder_time: data.push_checkin_reminder_time,
            push_checkout_reminder_enabled: data.push_checkout_reminder_enabled,
            push_checkout_reminder_time: data.push_checkout_reminder_time,
            notif_payroll_paid_enabled: data.notif_payroll_paid_enabled,
            notif_leave_request_enabled: data.notif_leave_request_enabled,
            notif_leave_status_enabled: data.notif_leave_status_enabled,
            notif_overtime_request_enabled: data.notif_overtime_request_enabled,
            notif_overtime_status_enabled: data.notif_overtime_status_enabled,
            notif_admin_checkin_enabled: data.notif_admin_checkin_enabled,
            notif_admin_checkout_enabled: data.notif_admin_checkout_enabled,
            late_tolerance_minutes: data.late_tolerance_minutes,
            early_checkin_tolerance_minutes: data.early_checkin_tolerance_minutes,
        });
    };

    const fetchLogs = async () => {
        try {
            const res = await fetch(route('admin.settings.logs'));
            const resData = await res.json();
            if (resData.logs) {
                setDeployLogs(resData.logs);
                // Stop deployment indicator if execution finishes/errors out
                if (resData.logs.includes('✅ Pembaruan selesai!') || 
                    resData.logs.includes('❌ ERROR') || 
                    resData.logs.includes('selesai dengan sukses')) {
                    setIsDeploying(false);
                }
            }
        } catch (err) {
            console.error('Gagal mengambil log:', err);
        }
    };

    const runSystemUpdate = async () => {
        if (!confirm('Apakah Anda yakin ingin memicu pembaruan sistem git pull dan kompilasi ulang di latar belakang?')) return;
        setIsDeploying(true);
        setDeployLogs('Menghubungkan ke skrip deploy.sh...');
        try {
            const res = await fetch(route('admin.settings.deploy'), { method: 'POST', headers: { 'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '' } });
            const resData = await res.json();
            if (resData.status === 'success') {
                // Poll logs every 2 seconds
                fetchLogs();
            } else {
                setDeployLogs(`❌ Gagal memulai pembaruan: ${resData.message}`);
                setIsDeploying(false);
            }
        } catch (err) {
            setDeployLogs(`❌ Gagal menjalankan skrip pembaruan.`);
            setIsDeploying(false);
        }
    };

    // Auto-poll logs when deployment is running
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isDeploying) {
            interval = setInterval(() => {
                fetchLogs();
            }, 2000);
            setPollingInterval(interval);
        } else {
            if (pollingInterval) clearInterval(pollingInterval);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isDeploying]);

    // Initial log load
    useEffect(() => {
        fetchLogs();
    }, []);

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Pengaturan Aplikasi</h2>}
        >
            <Head title="Pengaturan Umum" />

            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">Sesuaikan profil identitas UMKM/Perusahaan, favicon browser, dan kelola pembaruan otomatis situs.</p>
                        </div>
                    </div>

                    {/* Tabs bar */}
                    <div className="flex space-x-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl w-fit">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                activeTab === 'general'
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                            }`}
                        >
                            <CogIcon className="w-4 h-4" />
                            <span>Profil Bisnis & Favicon</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('notifications')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                activeTab === 'notifications'
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                            }`}
                        >
                            <BellIcon className="w-4 h-4" />
                            <span>Pengaturan Notifikasi</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('system')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                activeTab === 'system'
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                            }`}
                        >
                            <ServerIcon className="w-4 h-4" />
                            <span>Pembaruan Sistem</span>
                        </button>
                    </div>

                    {activeTab === 'general' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Form */}
                            <div className="lg:col-span-2 bg-white dark:bg-gray-800 shadow-xl border border-slate-100 dark:border-slate-700 rounded-2xl p-6">
                                <form onSubmit={submit} className="space-y-6">
                                    <div className="border-b border-slate-100 dark:border-slate-700/60 pb-3">
                                        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Identitas Perusahaan / UMKM</h3>
                                        <p className="text-xs text-slate-400">Pengaturan ini akan digunakan pada kop surat slip gaji, e-mail mailable, dan header laporan.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                                <GlobeAltIcon className="w-4 h-4 text-slate-400" />
                                                <span>Nama Perusahaan</span>
                                            </label>
                                            <input 
                                                type="text" 
                                                value={data.school_name} 
                                                onChange={e => setData('school_name', e.target.value)} 
                                                required 
                                                className="mt-2 block w-full rounded-xl border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 dark:bg-gray-900 dark:text-white text-xs py-2.5" 
                                            />
                                            {errors.school_name && <p className="text-red-500 text-[10px] mt-1">{errors.school_name}</p>}
                                        </div>
                                        <div>
                                            <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                                <MapPinIcon className="w-4 h-4 text-slate-400" />
                                                <span>Kota Laporan</span>
                                            </label>
                                            <input 
                                                type="text" 
                                                value={data.report_location} 
                                                onChange={e => setData('report_location', e.target.value)} 
                                                className="mt-2 block w-full rounded-xl border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 dark:bg-gray-900 dark:text-white text-xs py-2.5" 
                                                placeholder="Contoh: Jakarta"
                                            />
                                            {errors.report_location && <p className="text-red-500 text-[10px] mt-1">{errors.report_location}</p>}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                            <DocumentTextIcon className="w-4 h-4 text-slate-400" />
                                            <span>Alamat Perusahaan</span>
                                        </label>
                                        <textarea 
                                            value={data.school_address} 
                                            onChange={e => setData('school_address', e.target.value)} 
                                            rows={3}
                                            className="mt-2 block w-full rounded-xl border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 dark:bg-gray-900 dark:text-white text-xs py-2.5"
                                            placeholder="Tulis alamat lengkap operasional UMKM / Perusahaan..."
                                        />
                                        {errors.school_address && <p className="text-red-500 text-[10px] mt-1">{errors.school_address}</p>}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                                <PhoneIcon className="w-4 h-4 text-slate-400" />
                                                <span>Nomor Telepon</span>
                                            </label>
                                            <input 
                                                type="text" 
                                                value={data.school_phone} 
                                                onChange={e => setData('school_phone', e.target.value)} 
                                                className="mt-2 block w-full rounded-xl border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 dark:bg-gray-900 dark:text-white text-xs py-2.5" 
                                            />
                                            {errors.school_phone && <p className="text-red-500 text-[10px] mt-1">{errors.school_phone}</p>}
                                        </div>
                                        <div>
                                            <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                                <EnvelopeIcon className="w-4 h-4 text-slate-400" />
                                                <span>Email Perusahaan</span>
                                            </label>
                                            <input 
                                                type="email" 
                                                value={data.school_email} 
                                                onChange={e => setData('school_email', e.target.value)} 
                                                className="mt-2 block w-full rounded-xl border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 dark:bg-gray-900 dark:text-white text-xs py-2.5" 
                                            />
                                            {errors.school_email && <p className="text-red-500 text-[10px] mt-1">{errors.school_email}</p>}
                                        </div>
                                    </div>

                                    {/* Parameter Toleransi Absensi */}
                                    <div className="border-t border-slate-100 dark:border-slate-700/60 pt-5 space-y-4">
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Parameter Toleransi Absensi</h3>
                                            <p className="text-xs text-slate-400">Atur batas toleransi keterlambatan masuk dan toleransi masuk lebih awal untuk penyesuaian jam kerja.</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                                    <ClockIcon className="w-4 h-4 text-slate-400" />
                                                    <span>Toleransi Terlambat (Menit)</span>
                                                </label>
                                                <input 
                                                    type="number" 
                                                    value={data.late_tolerance_minutes} 
                                                    onChange={e => setData('late_tolerance_minutes', parseInt(e.target.value) || 0)} 
                                                    min="0"
                                                    required 
                                                    className="mt-2 block w-full rounded-xl border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 dark:bg-gray-900 dark:text-white text-xs py-2.5" 
                                                />
                                                {errors.late_tolerance_minutes && <p className="text-red-500 text-[10px] mt-1">{errors.late_tolerance_minutes}</p>}
                                            </div>
                                            <div>
                                                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                                    <ClockIcon className="w-4 h-4 text-slate-400" />
                                                    <span>Toleransi Masuk Awal (Menit)</span>
                                                </label>
                                                <input 
                                                    type="number" 
                                                    value={data.early_checkin_tolerance_minutes} 
                                                    onChange={e => setData('early_checkin_tolerance_minutes', parseInt(e.target.value) || 0)} 
                                                    min="0"
                                                    required 
                                                    className="mt-2 block w-full rounded-xl border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 dark:bg-gray-900 dark:text-white text-xs py-2.5" 
                                                />
                                                {errors.early_checkin_tolerance_minutes && <p className="text-red-500 text-[10px] mt-1">{errors.early_checkin_tolerance_minutes}</p>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Credentials (opsional) */}
                                    <div className="border-t border-slate-100 dark:border-slate-700/60 pt-5 space-y-4">
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Integrasi Git Deploy (Opsional)</h3>
                                            <p className="text-xs text-slate-400">Digunakan jika Anda mendeploy langsung dengan auto pull script di VPS aaPanel Anda.</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">GitHub Username</label>
                                                <input 
                                                    type="text" 
                                                    value={data.github_username} 
                                                    onChange={e => setData('github_username', e.target.value)} 
                                                    className="mt-2 block w-full rounded-xl border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 dark:bg-gray-900 dark:text-white text-xs py-2.5" 
                                                />
                                                {errors.github_username && <p className="text-red-500 text-[10px] mt-1">{errors.github_username}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">GitHub PAT (Token)</label>
                                                <input 
                                                    type="password" 
                                                    value={data.github_token} 
                                                    onChange={e => setData('github_token', e.target.value)} 
                                                    placeholder="ghp_..."
                                                    className="mt-2 block w-full rounded-xl border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 dark:bg-gray-900 dark:text-white text-xs py-2.5" 
                                                />
                                                {errors.github_token && <p className="text-red-500 text-[10px] mt-1">{errors.github_token}</p>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-3">
                                        <button 
                                            type="submit" 
                                            disabled={processing}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md shadow-indigo-600/10 disabled:opacity-50"
                                        >
                                            {processing ? 'Menyimpan...' : 'Simpan Pengaturan'}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Files sidebar */}
                            <div className="space-y-6">
                                {/* Logo Upload */}
                                <div className="bg-white dark:bg-gray-800 shadow-xl border border-slate-100 dark:border-slate-700 rounded-2xl p-6">
                                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm border-b dark:border-slate-700 pb-3 flex items-center gap-2">
                                        <PhotoIcon className="w-5 h-5 text-indigo-500" />
                                        <span>Logo Perusahaan</span>
                                    </h3>
                                    <div className="mt-4 flex flex-col items-center">
                                        <div className="w-32 h-32 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden relative group">
                                            {logoPreview ? (
                                                <img src={logoPreview} alt="Logo Company" className="w-full h-full object-contain p-2" />
                                            ) : (
                                                <PhotoIcon className="w-10 h-10 text-slate-300" />
                                            )}
                                        </div>
                                        <div className="w-full mt-4">
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                id="logo-input"
                                                onChange={e => handleFileChange('school_logo', e.target.files ? e.target.files[0] : null)}
                                                className="hidden" 
                                            />
                                            <label 
                                                htmlFor="logo-input"
                                                className="block w-full text-center bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 text-indigo-700 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                                            >
                                                Pilih Logo Baru
                                            </label>
                                            {errors.school_logo && <p className="text-red-500 text-[10px] text-center mt-1">{errors.school_logo}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Favicon Upload */}
                                <div className="bg-white dark:bg-gray-800 shadow-xl border border-slate-100 dark:border-slate-700 rounded-2xl p-6">
                                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm border-b dark:border-slate-700 pb-3 flex items-center gap-2">
                                        <SparklesIcon className="w-5 h-5 text-indigo-500" />
                                        <span>Favicon Aplikasi</span>
                                    </h3>
                                    <div className="mt-4 flex flex-col items-center">
                                        <div className="w-16 h-16 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden relative">
                                            {faviconPreview ? (
                                                <img src={faviconPreview} alt="Favicon" className="w-10 h-10 object-contain" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center font-black text-indigo-600 text-sm">S</div>
                                            )}
                                        </div>
                                        <div className="w-full mt-4">
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                id="favicon-input"
                                                onChange={e => handleFileChange('school_favicon', e.target.files ? e.target.files[0] : null)}
                                                className="hidden" 
                                            />
                                            <label 
                                                htmlFor="favicon-input"
                                                className="block w-full text-center bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 text-indigo-700 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                                            >
                                                Pilih Favicon Baru
                                            </label>
                                            <p className="text-[9px] text-slate-400 text-center mt-2">Gunakan format gambar persegi (PNG, ICO, JPG, SVG). Maksimal 1MB.</p>
                                            {errors.school_favicon && <p className="text-red-500 text-[10px] text-center mt-1">{errors.school_favicon}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'notifications' ? (
                        /* Notifications Tab */
                        <form onSubmit={submit} className="bg-white dark:bg-gray-800 shadow-xl border border-slate-100 dark:border-slate-700 rounded-2xl p-6 space-y-8">
                            <div className="border-b border-slate-100 dark:border-slate-700/60 pb-4">
                                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Konfigurasi Pengingat & Notifikasi HRIS</h3>
                                <p className="text-xs text-slate-400 mt-1">Atur jadwal pengingat absensi harian dan matriks notifikasi otomatis untuk proses kepegawaian.</p>
                            </div>

                            {/* Section 1: Attendance Reminders */}
                            <div className="space-y-6">
                                <h4 className="font-bold text-indigo-600 dark:text-indigo-400 text-xs uppercase tracking-wider flex items-center gap-2">
                                    <BellIcon className="w-4 h-4 text-indigo-500" />
                                    <span>Pengingat Absensi Harian (Push PWA)</span>
                                </h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Check-in Reminder */}
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs">Pengingat Absensi Masuk</h5>
                                                <p className="text-[11px] text-slate-400 mt-1">Kirim push notifikasi ke karyawan yang belum check-in pada jam pengingat.</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={data.push_checkin_reminder_enabled}
                                                    onChange={e => setData('push_checkin_reminder_enabled', e.target.checked)}
                                                    className="sr-only peer" 
                                                />
                                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                                            </label>
                                        </div>
                                        {data.push_checkin_reminder_enabled && (
                                            <div className="w-fit">
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Waktu Pengingat Default</label>
                                                <input 
                                                    type="time" 
                                                    value={data.push_checkin_reminder_time}
                                                    onChange={e => setData('push_checkin_reminder_time', e.target.value)}
                                                    className="rounded-xl border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 dark:bg-gray-900 dark:text-white text-xs py-2 px-3"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Check-out Reminder */}
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs">Pengingat Absensi Pulang</h5>
                                                <p className="text-[11px] text-slate-400 mt-1">Kirim push notifikasi ke karyawan yang belum check-out pada jam pengingat.</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={data.push_checkout_reminder_enabled}
                                                    onChange={e => setData('push_checkout_reminder_enabled', e.target.checked)}
                                                    className="sr-only peer" 
                                                />
                                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                                            </label>
                                        </div>
                                        {data.push_checkout_reminder_enabled && (
                                            <div className="w-fit">
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Waktu Pengingat Default</label>
                                                <input 
                                                    type="time" 
                                                    value={data.push_checkout_reminder_time}
                                                    onChange={e => setData('push_checkout_reminder_time', e.target.value)}
                                                    className="rounded-xl border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 dark:bg-gray-900 dark:text-white text-xs py-2 px-3"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Notification Matrix */}
                            <div className="space-y-6">
                                <h4 className="font-bold text-indigo-600 dark:text-indigo-400 text-xs uppercase tracking-wider flex items-center gap-2">
                                    <ServerIcon className="w-4 h-4 text-indigo-500" />
                                    <span>Matriks Notifikasi HRIS</span>
                                </h4>

                                <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                                    <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-900/60">
                                            <tr>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Aktivitas Notifikasi</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Penerima</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trigger</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 text-right uppercase tracking-wider">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-slate-100 dark:divide-slate-800">
                                            {/* Notif 3 */}
                                            <tr>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">📋 Payroll Selesai Dihitung</div>
                                                </td>
                                                <td className="px-6 py-4 text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Karyawan Terkait</td>
                                                <td className="px-6 py-4 text-[11px] text-slate-400">Setelah kalkulasi payroll selesai & draf dilunasi</td>
                                                <td className="px-6 py-4 text-right">
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={data.notif_payroll_paid_enabled}
                                                            onChange={e => setData('notif_payroll_paid_enabled', e.target.checked)}
                                                            className="sr-only peer" 
                                                        />
                                                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                                                    </label>
                                                </td>
                                            </tr>

                                            {/* Notif 4 */}
                                            <tr>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">📝 Pengajuan Izin/Sakit Baru</div>
                                                </td>
                                                <td className="px-6 py-4 text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Semua Admin</td>
                                                <td className="px-6 py-4 text-[11px] text-slate-400">Saat karyawan mengajukan izin/cuti/sakit baru</td>
                                                <td className="px-6 py-4 text-right">
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={data.notif_leave_request_enabled}
                                                            onChange={e => setData('notif_leave_request_enabled', e.target.checked)}
                                                            className="sr-only peer" 
                                                        />
                                                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                                                    </label>
                                                </td>
                                            </tr>

                                            {/* Notif 5 */}
                                            <tr>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">✅ Status Izin Diperbarui</div>
                                                </td>
                                                <td className="px-6 py-4 text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Karyawan Terkait</td>
                                                <td className="px-6 py-4 text-[11px] text-slate-400">Saat admin menyetujui atau menolak izin</td>
                                                <td className="px-6 py-4 text-right">
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={data.notif_leave_status_enabled}
                                                            onChange={e => setData('notif_leave_status_enabled', e.target.checked)}
                                                            className="sr-only peer" 
                                                        />
                                                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                                                    </label>
                                                </td>
                                            </tr>

                                            {/* Notif 6 */}
                                            <tr>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">⏰ Pengajuan Lembur Baru</div>
                                                </td>
                                                <td className="px-6 py-4 text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Semua Admin</td>
                                                <td className="px-6 py-4 text-[11px] text-slate-400">Saat karyawan mengajukan lembur baru</td>
                                                <td className="px-6 py-4 text-right">
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={data.notif_overtime_request_enabled}
                                                            onChange={e => setData('notif_overtime_request_enabled', e.target.checked)}
                                                            className="sr-only peer" 
                                                        />
                                                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                                                    </label>
                                                </td>
                                            </tr>

                                            {/* Notif 7 */}
                                            <tr>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">✅ Status Lembur Diperbarui</div>
                                                </td>
                                                <td className="px-6 py-4 text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Karyawan Terkait</td>
                                                <td className="px-6 py-4 text-[11px] text-slate-400">Saat admin menyetujui atau menolak lembur</td>
                                                <td className="px-6 py-4 text-right">
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={data.notif_overtime_status_enabled}
                                                            onChange={e => setData('notif_overtime_status_enabled', e.target.checked)}
                                                            className="sr-only peer" 
                                                        />
                                                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                                                    </label>
                                                </td>
                                            </tr>

                                            {/* Notif 8 */}
                                            <tr>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">📢 Karyawan Check-in (Masuk)</div>
                                                </td>
                                                <td className="px-6 py-4 text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Semua Admin</td>
                                                <td className="px-6 py-4 text-[11px] text-slate-400">Saat karyawan berhasil melakukan absensi masuk</td>
                                                <td className="px-6 py-4 text-right">
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={data.notif_admin_checkin_enabled}
                                                            onChange={e => setData('notif_admin_checkin_enabled', e.target.checked)}
                                                            className="sr-only peer" 
                                                        />
                                                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                                                    </label>
                                                </td>
                                            </tr>

                                            {/* Notif 9 */}
                                            <tr>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">📢 Karyawan Check-out (Pulang)</div>
                                                </td>
                                                <td className="px-6 py-4 text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Semua Admin</td>
                                                <td className="px-6 py-4 text-[11px] text-slate-400">Saat karyawan berhasil melakukan absensi pulang</td>
                                                <td className="px-6 py-4 text-right">
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={data.notif_admin_checkout_enabled}
                                                            onChange={e => setData('notif_admin_checkout_enabled', e.target.checked)}
                                                            className="sr-only peer" 
                                                        />
                                                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                                                    </label>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Broadcast Push Notification */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-6">
                                <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
                                    <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2">
                                        <BellIcon className="w-5 h-5 text-indigo-500" />
                                        <span>📢 Broadcast Push Notifikasi Massal</span>
                                    </h5>
                                    <p className="text-[11px] text-slate-400 mt-1">Kirim pesan instan langsung ke perangkat browser seluruh pengguna yang telah mengaktifkan notifikasi push.</p>
                                </div>

                                {/* Stats Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">TOTAL PERANGKAT TERDAFTAR</p>
                                        <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{pwa_devices_stats.total} Device</p>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Menggunakan push notifikasi web</p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">PERANGKAT GURU & PEGAWAI</p>
                                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{pwa_devices_stats.staff} Device</p>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Akun staf & karyawan terdaftar</p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">PERANGKAT SOPIR / DRIVER</p>
                                        <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{pwa_devices_stats.driver} Device</p>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Akun sopir & driver terdaftar</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Form Fields (2 columns) */}
                                    <div className="lg:col-span-2 space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-1">Target Penerima</label>
                                            <select
                                                value={broadcastTarget}
                                                onChange={e => setBroadcastTarget(e.target.value as any)}
                                                className="block w-full rounded-xl border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 dark:bg-gray-900 dark:text-white text-xs py-2 px-3"
                                            >
                                                <option value="all">Semua Perangkat (Staf, Karyawan, & Sopir)</option>
                                                <option value="staff">Staf & Karyawan</option>
                                                <option value="driver">Sopir / Driver</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-1">Judul Notifikasi</label>
                                            <input 
                                                type="text" 
                                                value={broadcastTitle} 
                                                onChange={e => setBroadcastTitle(e.target.value)} 
                                                placeholder="Contoh: Quote Hari Ini / Pengumuman Penting"
                                                className="block w-full rounded-xl border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 dark:bg-gray-900 dark:text-white text-xs py-2.5 px-3" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-1">Isi Pesan (Body)</label>
                                            <textarea 
                                                value={broadcastBody} 
                                                onChange={e => setBroadcastBody(e.target.value)} 
                                                placeholder="Tulis detail pengumuman yang ingin disampaikan..."
                                                rows={4}
                                                className="block w-full rounded-xl border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 dark:bg-gray-900 dark:text-white text-xs py-2.5 px-3" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-1">Tautan Tindakan (Action URL)</label>
                                            <input 
                                                type="text" 
                                                value={broadcastActionUrl} 
                                                onChange={e => setBroadcastActionUrl(e.target.value)} 
                                                placeholder="Contoh: /dashboard atau /payrolls"
                                                className="block w-full rounded-xl border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 dark:bg-gray-900 dark:text-white text-xs py-2.5 px-3" 
                                            />
                                        </div>
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={sendTestPush}
                                                disabled={testingPush}
                                                className="bg-[#1b75a9] hover:bg-[#155a82] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-2"
                                            >
                                                <BellIcon className="w-4 h-4" />
                                                <span>{testingPush ? 'Menyiarkan...' : 'Kirim Broadcast'}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Quick Templates (1 column) */}
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-start">
                                        <p className="text-[10px] font-black text-slate-650 dark:text-slate-350 uppercase tracking-wider mb-1">QUICK TEMPLATE</p>
                                        <p className="text-[11px] text-slate-400 mb-3">Gunakan template cepat ini untuk mempermudah pengisian formulir broadcast.</p>
                                        <div className="space-y-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setBroadcastTitle('🌴 Pengumuman Hari Libur Bersama');
                                                    setBroadcastBody('Halo rekan-rekan, diinformasikan bahwa kantor akan libur bersama. Selamat berlibur dan berkumpul dengan keluarga!');
                                                    setBroadcastActionUrl('/dashboard');
                                                }}
                                                className="w-full text-left px-3 py-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg border border-slate-150 dark:border-slate-700 transition-all flex items-center gap-2"
                                            >
                                                <span>🌴 Libur Bersama</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setBroadcastTitle('🏫 Rapat Koordinasi Staf');
                                                    setBroadcastBody('Undangan rapat koordinasi bulanan staf dan karyawan besok pagi pukul 09:00 WIB di ruang meeting.');
                                                    setBroadcastActionUrl('/dashboard');
                                                }}
                                                className="w-full text-left px-3 py-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg border border-slate-150 dark:border-slate-700 transition-all flex items-center gap-2"
                                            >
                                                <span>🏫 Rapat Staf</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setBroadcastTitle('💳 Slip Gaji Bulanan Terbit');
                                                    setBroadcastBody('Slip gaji Anda untuk periode bulan ini sudah selesai diproses dan telah terbit. Silakan cek detailnya di menu payroll.');
                                                    setBroadcastActionUrl('/payrolls');
                                                }}
                                                className="w-full text-left px-3 py-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg border border-slate-150 dark:border-slate-700 transition-all flex items-center gap-2"
                                            >
                                                <span>💳 Slip Gaji Bulanan</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setBroadcastTitle('🔧 Pemeliharaan Sistem (Maintenance)');
                                                    setBroadcastBody('Sistem HRIS akan dimaintenance malam ini pukul 23:00 - 01:00 WIB untuk peningkatan performa. Layanan mungkin akan terganggu sementara.');
                                                    setBroadcastActionUrl('/dashboard');
                                                }}
                                                className="w-full text-left px-3 py-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg border border-slate-150 dark:border-slate-700 transition-all flex items-center gap-2"
                                            >
                                                <span>🔧 Maintenance Sistem</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Daftar Perangkat Terdaftar */}
                            <div className="bg-white dark:bg-gray-800 border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm space-y-4">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                    <h5 className="font-extrabold text-slate-850 dark:text-slate-200 text-xs">📱 Daftar Perangkat Terdaftar ({pwa_devices_list.length} Pengguna)</h5>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-150 dark:divide-slate-800 text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-900/60">
                                            <tr>
                                                <th className="px-6 py-3.5 text-[10px] font-black text-slate-450 uppercase tracking-wider">Nama</th>
                                                <th className="px-6 py-3.5 text-[10px] font-black text-slate-450 uppercase tracking-wider">Tipe / Peran</th>
                                                <th className="px-6 py-3.5 text-[10px] font-black text-slate-450 uppercase tracking-wider">Email / No. HP</th>
                                                <th className="px-6 py-3.5 text-[10px] font-black text-slate-450 text-center uppercase tracking-wider">Jumlah Perangkat</th>
                                                <th className="px-6 py-3.5 text-[10px] font-black text-slate-450 uppercase tracking-wider">Terakhir Aktif</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-slate-100 dark:divide-slate-850">
                                            {pwa_devices_list.length > 0 ? (
                                                pwa_devices_list.map((device, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 text-xs">
                                                        <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-800 dark:text-slate-200">
                                                            {device.name}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            {device.role.split(',').map((r, rIdx) => {
                                                                const roleName = r.trim() === 'admin' ? 'HR Admin' : (r.trim() === 'driver' ? 'Sopir / Driver' : 'Karyawan');
                                                                const badgeColor = r.trim() === 'admin' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400' : (r.trim() === 'driver' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400');
                                                                return (
                                                                    <span key={rIdx} className={`px-2 py-0.5 rounded-full font-black uppercase mr-1 text-[9px] ${badgeColor}`}>
                                                                        {roleName}
                                                                    </span>
                                                                );
                                                            })}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                                                            <div className="font-medium">{device.email}</div>
                                                            <div className="text-[10px] text-slate-450">{device.phone}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                                                {device.count} Device
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-[11px] text-slate-500 dark:text-slate-400">
                                                            {device.last_active}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-8 text-center text-xs text-slate-450">
                                                        Belum ada perangkat yang terdaftar di sistem.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Submit button */}
                            <div className="flex justify-end pt-4 border-t dark:border-slate-700">
                                <button 
                                    type="submit" 
                                    disabled={processing}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md shadow-indigo-600/10 disabled:opacity-50"
                                >
                                    {processing ? 'Menyimpan...' : 'Simpan Pengaturan'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* System Tab */
                        <div className="bg-white dark:bg-gray-800 shadow-xl border border-slate-100 dark:border-slate-700 rounded-2xl p-6 space-y-6">
                            <div className="flex justify-between items-start border-b dark:border-slate-700 pb-4">
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                                        <ServerIcon className="w-5 h-5 text-indigo-500" />
                                        <span>Git Deploy & Build System</span>
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1">Picu penarikan repository dari GitHub (`git pull`) dan bangun ulang bundel React (`npm run build`) secara otomatis.</p>
                                </div>
                                <button
                                    onClick={runSystemUpdate}
                                    disabled={isDeploying}
                                    className={`bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl flex items-center space-x-2 transition-all font-semibold text-xs disabled:opacity-50 shadow-md ${
                                        isDeploying ? 'animate-pulse' : ''
                                    }`}
                                >
                                    <ArrowPathIcon className={`w-4 h-4 ${isDeploying ? 'animate-spin' : ''}`} />
                                    <span>{isDeploying ? 'Sedang Memperbarui...' : 'Picu Update Sistem'}</span>
                                </button>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Log Aktivitas Pembaruan Terakhir:</h4>
                                <div className="bg-slate-950 text-slate-100 p-5 rounded-2xl font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 shadow-inner max-h-[180px] custom-scrollbar whitespace-pre-wrap">
                                    {deployLogs}
                                </div>
                            </div>

                            {/* Database Maintenance Section */}
                            <div className="border-t dark:border-slate-700 pt-6 space-y-4">
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                                        <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                                        </svg>
                                        <span>Pemeliharaan & Reset Database Aplikasi</span>
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1">Kelola cadangan database, restore data, atau kosongkan aplikasi untuk memulai dari awal.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* 1. Backup Card */}
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="space-y-2">
                                            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2">
                                                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                                <span>Backup Aplikasi (ZIP)</span>
                                            </h4>
                                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                                Mengunduh seluruh skema & data database beserta semua file media yang diunggah (foto absen, bukti logistik, dll.) dalam bentuk berkas <strong>.zip</strong>.
                                            </p>
                                        </div>
                                        <a
                                            href={route('admin.settings.backup')}
                                            className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                                        >
                                            Unduh Backup Lengkap (.zip)
                                        </a>
                                    </div>

                                    {/* 2. Restore Card */}
                                    <form onSubmit={handleRestoreSubmit} className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="space-y-2">
                                            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2">
                                                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                </svg>
                                                <span>Restore Aplikasi (ZIP)</span>
                                            </h4>
                                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                                Unggah berkas ZIP cadangan Anda untuk memulihkan database dan file media di server. 
                                                <span className="text-amber-500 font-bold block mt-1">⚠️ Seluruh data saat ini akan ditimpa!</span>
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <input
                                                type="file"
                                                accept=".zip"
                                                onChange={e => setRestoreFile(e.target.files ? e.target.files[0] : null)}
                                                className="block w-full text-[10px] text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 dark:file:bg-slate-800 dark:file:text-slate-300 cursor-pointer"
                                                required
                                            />
                                            <button
                                                type="submit"
                                                disabled={restoreProcessing || !restoreFile}
                                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/10 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                            >
                                                {restoreProcessing ? (
                                                    <>
                                                        <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                        </svg>
                                                        <span>Sedang Memulihkan...</span>
                                                    </>
                                                ) : (
                                                    <span>Unggah & Restore</span>
                                                )}
                                            </button>
                                        </div>
                                    </form>

                                    {/* 3. Reset Card */}
                                    <form onSubmit={handleResetSubmit} className="bg-rose-50/50 dark:bg-rose-950/10 p-5 rounded-2xl border border-rose-100 dark:border-rose-900/40 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="space-y-2">
                                            <h4 className="font-bold text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                                                <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                                <span>Kosongkan Aplikasi (Reset)</span>
                                            </h4>
                                            <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 leading-relaxed">
                                                Menghapus semua data transaksional (absen, payroll, cuti, lembur, file media, karyawan). 
                                                <strong> admin@hris.com, settings, geofence & cabang utama dipertahankan.</strong>
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="space-y-1">
                                                <label className="block text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Ketik "KOSONGKAN" untuk konfirmasi:</label>
                                                <input
                                                    type="text"
                                                    value={resetConfirm}
                                                    onChange={e => setResetConfirm(e.target.value)}
                                                    placeholder="Tulis KOSONGKAN"
                                                    className="block w-full rounded-lg border-rose-200 dark:border-rose-900/60 focus:border-rose-500 focus:ring-rose-200 dark:bg-gray-900 dark:text-white text-[10px] py-1.5 px-2.5"
                                                    required
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={resetProcessing || resetConfirm !== 'KOSONGKAN'}
                                                className="w-full bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-600/10 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                            >
                                                {resetProcessing ? (
                                                    <>
                                                        <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                        </svg>
                                                        <span>Sedang Menghapus...</span>
                                                    </>
                                                ) : (
                                                    <span>Kosongkan Semua Data</span>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
