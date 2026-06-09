import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useState, useEffect } from 'react';
import ThemeToggle from '@/Components/ThemeToggle';
import SystemClock from '@/Components/SystemClock';

export default function Authenticated({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const { props } = usePage();
    const flash = props.flash as any;
    const user = props.auth.user as any; 
    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    // Sidebar collapse state (Desktop)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('sidebarCollapsed') === 'true';
        }
        return false;
    });

    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
    }, [sidebarCollapsed]);
    
    // Toast state management
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        if (flash.success) {
            setToast({ message: flash.success, type: 'success' });
            const timer = setTimeout(() => setToast(null), 5000);
            return () => clearTimeout(timer);
        }
        if (flash.error) {
            setToast({ message: flash.error, type: 'error' });
            const timer = setTimeout(() => setToast(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [flash.success, flash.error]);

    const userRoles = user.role ? user.role.split(',').map((r: string) => r.trim()) : [];
    const isAdmin = userRoles.includes('admin');
    const isEmployee = userRoles.includes('employee');
    const isDriver = userRoles.includes('driver');

    // Live Telemetry Setup for Driver
    const [isSharing, setIsSharing] = useState(user.driver_is_sharing_location || false);

    const updateGlobalGPS = (sharingState: boolean) => {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                fetch(route('courier.update-location'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || ''
                    },
                    body: JSON.stringify({
                        latitude,
                        longitude,
                        is_sharing: sharingState
                    })
                }).catch(err => console.error("Error broadcasting GPS:", err));
            },
            (error) => {
                console.warn("Telemetry GPS warning:", error.message);
                fetch(route('courier.update-location'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || ''
                    },
                    body: JSON.stringify({
                        latitude: 0,
                        longitude: 0,
                        is_sharing: sharingState
                    })
                }).catch(err => console.error("Error broadcasting GPS:", err));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    const handleSharingToggle = (val: boolean) => {
        setIsSharing(val);
        updateGlobalGPS(val);
    };

    useEffect(() => {
        let interval: any = null;
        if (isDriver && isSharing) {
            updateGlobalGPS(true);
            interval = setInterval(() => {
                updateGlobalGPS(true);
            }, 30000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isSharing, isDriver]);

    // Grouped HRIS nav structure
    const navGroups = [
        {
            group: 'Beranda',
            show: true,
            items: [
                {
                    label: 'Dashboard',
                    href: route('dashboard'),
                    active: route().current('dashboard'),
                    show: true,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>),
                },
            ],
        },
        {
            group: 'Kepegawaian',
            show: true,
            items: [
                {
                    label: 'Presensi Pegawai',
                    href: route('attendances.scanner'),
                    active: route().current('attendances.scanner'),
                    show: true,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>),
                },
                {
                    label: 'Riwayat Absensi Saya',
                    href: route('attendances.history'),
                    active: route().current('attendances.history'),
                    show: true,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>),
                },
                {
                    label: isAdmin ? 'Persetujuan Cuti & Izin' : 'Cuti & Izin Saya',
                    href: route('leaves.index'),
                    active: route().current('leaves.*') || route().current('admin.leaves.*'),
                    show: true,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>),
                },
                {
                    label: isAdmin ? 'Persetujuan Lembur' : 'Lembur Saya',
                    href: route('overtimes.index'),
                    active: route().current('overtimes.*') || route().current('admin.overtimes.*'),
                    show: true,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
                },
                {
                    label: 'Slip Gaji Saya',
                    href: route('payrolls.index'),
                    active: route().current('payrolls.*'),
                    show: true,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
                },
            ],
        },
        {
            group: 'Manajemen HRD',
            show: isAdmin,
            items: [
                {
                    label: 'Rekap Absensi',
                    href: route('admin.attendances.index'),
                    active: route().current('admin.attendances.*'),
                    show: isAdmin,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
                },
                {
                    label: 'Kelola Shift Kerja',
                    href: route('admin.shifts.index'),
                    active: route().current('admin.shifts.*'),
                    show: isAdmin,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
                },
                {
                    label: 'Kelola Lokasi Geofence',
                    href: route('admin.geofences.index'),
                    active: route().current('admin.geofences.*'),
                    show: isAdmin,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>),
                },
                {
                    label: 'Kelola Gaji & Payroll',
                    href: route('admin.payrolls.index'),
                    active: route().current('admin.payrolls.*'),
                    show: isAdmin,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>),
                },
                {
                    label: 'Data Karyawan',
                    href: route('admin.users.index'),
                    active: route().current('admin.users.*'),
                    show: isAdmin,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>),
                },
                {
                    label: 'Pengaturan Umum',
                    href: route('admin.settings.index'),
                    active: route().current('admin.settings.*'),
                    show: isAdmin,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>),
                },
            ],
        },
        {
            group: 'Kalkulasi HPP',
            show: isAdmin,
            items: [
                {
                    label: 'Dashboard HPP',
                    href: route('admin.hpp.dashboard'),
                    active: route().current('admin.hpp.dashboard'),
                    show: isAdmin,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>),
                },
                {
                    label: 'Bahan Baku',
                    href: route('admin.hpp.materials.index'),
                    active: route().current('admin.hpp.materials.index'),
                    show: isAdmin,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>),
                },
                {
                    label: 'Biaya Overhead',
                    href: route('admin.hpp.overheads.index'),
                    active: route().current('admin.hpp.overheads.index'),
                    show: isAdmin,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
                },
                {
                    label: 'Produk & HPP',
                    href: route('admin.hpp.products.index'),
                    active: route().current('admin.hpp.products.*'),
                    show: isAdmin,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>),
                },
            ],
        },
        {
            group: 'Distribusi Logistik',
            show: isAdmin || isDriver,
            items: [
                {
                    label: 'Tugas Pengiriman Saya',
                    href: route('courier.shipments.index'),
                    active: route().current('courier.shipments.*'),
                    show: isDriver,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>),
                },
                {
                    label: 'Pelacakan Paket',
                    href: route('shipments.track'),
                    active: route().current('shipments.track') || route().current('shipments.courier-scanner'),
                    show: isAdmin || isDriver,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>),
                },
                {
                    label: 'Pantau Posisi Driver',
                    href: route('admin.driver-monitor'),
                    active: route().current('admin.driver-monitor'),
                    show: isAdmin,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>),
                },
                {
                    label: 'Kelola Pengiriman',
                    href: route('admin.shipments.index'),
                    active: route().current('admin.shipments.*'),
                    show: isAdmin,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293h3.172a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H20" /></svg>),
                },
                {
                    label: 'Kelola Cabang',
                    href: route('admin.branches.index'),
                    active: route().current('admin.branches.*'),
                    show: isAdmin,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>),
                },
            ],
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            {/* OVERLAY (mobile only) */}
            <div
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300"
                style={{
                    opacity: sidebarOpen ? 1 : 0,
                    pointerEvents: sidebarOpen ? 'auto' : 'none',
                    visibility: sidebarOpen ? 'visible' : 'hidden',
                }}
            />

            {/* SIDEBAR */}
            <aside className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700/60 transition-all duration-300 transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'} flex flex-col shadow-2xl lg:shadow-none`}>
                {/* Logo Area */}
                <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-700/60 flex-shrink-0 overflow-hidden">
                    <Link href={route('dashboard')} className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
                        <img src="/images/Salira.png" alt="HRIS Logo" className="h-8 w-8 flex-shrink-0" />
                        {!sidebarCollapsed && (
                            <span className="text-lg font-black tracking-tighter text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                                HRIS GEOLOCATION
                            </span>
                        )}
                    </Link>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 overflow-y-auto py-3 custom-scrollbar">
                    {navGroups.map((group) => {
                        const visibleItems = group.items.filter(i => i.show);
                        if (!group.show || visibleItems.length === 0) return null;
                        return (
                            <div key={group.group} className="mb-1">
                                {!sidebarCollapsed ? (
                                    <p className="px-4 pt-4 pb-1.5 text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.15em] truncate">
                                        {group.group}
                                    </p>
                                ) : (
                                    <div className="h-4" />
                                )}
                                <div className="px-2 space-y-0.5">
                                    {visibleItems.map((item) => (
                                        <Link
                                            key={item.label}
                                            href={item.href}
                                            onClick={() => setSidebarOpen(false)}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                                                item.active
                                                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                                            }`}
                                        >
                                            <span className={`flex-shrink-0 ${item.active ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                                {item.icon}
                                            </span>
                                            {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                                            {!sidebarCollapsed && item.active && (
                                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </nav>

                {/* Footer User Profile */}
                <div className="border-t border-slate-100 dark:border-slate-700/60 p-4 flex-shrink-0">
                    <div className="flex items-center gap-3 px-2 py-1.5">
                        {user.avatar ? (
                            <img src={user.avatar} alt="User Avatar" className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-slate-200 dark:border-slate-600" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm flex-shrink-0">
                                {user.name.charAt(0)}
                            </div>
                        )}
                        {!sidebarCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{user.name}</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">
                                    {userRoles.map((r: string) => r === 'admin' ? 'HR Admin' : (r === 'driver' ? 'Sopir / Driver' : 'Karyawan')).join(', ')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Force transform 0 on Desktop */}
            <style>{`
                @media (min-width: 1024px) {
                    aside { transform: translateX(0) !important; }
                }
            `}</style>

            {/* MAIN CONTENT */}
            <div className={`flex flex-col min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
                {/* TOP HEADER */}
                <header className="sticky top-0 z-30 h-16 flex items-center gap-3 px-4 sm:px-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-700/60">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden p-2 -ml-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>

                    {/* Sidebar Toggle — desktop only */}
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="hidden lg:flex p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 transition-all hover:scale-110 active:scale-95"
                        title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {sidebarCollapsed ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                        )}
                    </button>

                    <div className="lg:hidden flex items-center gap-2">
                        <img src="/images/Salira.png" alt="HRIS Logo" className="h-7 w-auto" />
                        <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">HRIS</span>
                    </div>

                    {header && (
                        <div className="hidden lg:block flex-1 text-slate-700 dark:text-slate-200 font-semibold">
                            {header}
                        </div>
                    )}

                    <div className="flex-1 lg:flex-none" />

                    <div className="flex items-center gap-2">
                        {isDriver && (
                            <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700/60 shadow-sm mr-1.5 select-none">
                                <span className={`w-2 h-2 rounded-full ${isSharing ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">GPS Live</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={isSharing}
                                        onChange={e => handleSharingToggle(e.target.checked)}
                                        className="sr-only peer cursor-pointer" 
                                    />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                                </label>
                            </div>
                        )}
                        <SystemClock />
                        <ThemeToggle />

                        <Dropdown>
                            <Dropdown.Trigger>
                                <button className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                    {user.avatar ? (
                                        <img src={user.avatar} alt="User Avatar" className="w-8 h-8 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                                            {user.name.charAt(0)}
                                        </div>
                                    )}
                                    <div className="hidden sm:block text-left leading-tight">
                                        <div className="text-sm font-semibold">{user.name}</div>
                                        <div className="text-xs text-slate-400 capitalize">
                                            {userRoles.map((r: string) => r === 'admin' ? 'HR Admin' : (r === 'driver' ? 'Sopir / Driver' : 'Karyawan')).join(', ')}
                                        </div>
                                    </div>
                                    <svg className="hidden sm:block w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </button>
                            </Dropdown.Trigger>
                            <Dropdown.Content>
                                <Dropdown.Link href={route('profile.edit')}>Profile</Dropdown.Link>
                                <Dropdown.Link href={route('logout')} method="post" as="button">Log Out</Dropdown.Link>
                            </Dropdown.Content>
                        </Dropdown>
                    </div>
                </header>

                <main className="flex-1 p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-900/50">
                    {children}
                </main>

                {toast && (
                    <div className="fixed bottom-6 right-6 z-[100] animate-bounce-in">
                        <div className={`px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3 border-2 ${
                            toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-rose-600 text-white border-rose-400'
                        }`}>
                            <span className="font-bold">{toast.message}</span>
                            <button onClick={() => setToast(null)} className="ml-4 p-1 hover:bg-white/20 rounded-full">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes bounce-in {
                    0% { transform: scale(0.8); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .animate-bounce-in { animation: bounce-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
            `}</style>
        </div>
    );
}
