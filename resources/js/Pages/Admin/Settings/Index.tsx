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
    DocumentTextIcon
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
}

export default function SettingsIndex({ auth, settings }: PageProps<{ settings: Settings }>) {
    const [activeTab, setActiveTab] = useState<'general' | 'system'>('general');
    const [deployLogs, setDeployLogs] = useState<string>('Belum ada log pembaruan.');
    const [isDeploying, setIsDeploying] = useState<boolean>(false);
    const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

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
                                <div className="bg-slate-950 text-slate-100 p-5 rounded-2xl font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 shadow-inner max-h-[450px] custom-scrollbar whitespace-pre-wrap">
                                    {deployLogs}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
