import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function NotificationsIndex({ notifications }: { notifications: any }) {
    const { patch } = useForm();

    const markAllAsRead = () => {
        patch(route('notifications.markAllAsRead'));
    };

    return (
        <AuthenticatedLayout header="Semua Notifikasi">
            <Head title="Notifikasi" />

            <div className="max-w-4xl mx-auto py-8">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Riwayat Notifikasi</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Pemberitahuan terkait aktivitas akun Anda.</p>
                        </div>
                        <button
                            onClick={markAllAsRead}
                            className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 dark:text-indigo-400 rounded-lg transition-colors"
                        >
                            Tandai Semua Terbaca
                        </button>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {notifications.data.length > 0 ? (
                            notifications.data.map((notif: any) => (
                                <div
                                    key={notif.id}
                                    className={`p-6 flex gap-4 transition-colors ${!notif.read_at ? 'bg-indigo-50/30 dark:bg-indigo-900/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${!notif.read_at ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className={`text-base ${!notif.read_at ? 'font-semibold text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>
                                                    {notif.data?.message || 'Pemberitahuan baru'}
                                                </p>
                                                <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                                                    <span className="flex items-center gap-1">
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        {new Date(notif.created_at).toLocaleDateString('id-ID', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit'})}
                                                    </span>
                                                </div>
                                            </div>
                                            {!notif.read_at && (
                                                <Link
                                                    href={route('notifications.markAsRead', notif.id)}
                                                    method="patch"
                                                    as="button"
                                                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                    Tandai dibaca
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center flex flex-col items-center justify-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Belum Ada Notifikasi</h3>
                                    <p className="text-slate-500 dark:text-slate-400 mt-1">Anda belum memiliki riwayat notifikasi apapun saat ini.</p>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Pagination */}
                    {notifications.links && notifications.links.length > 3 && (
                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
                            <div className="flex flex-wrap justify-center gap-1">
                                {notifications.links.map((link: any, k: number) => (
                                    <Link
                                        key={k}
                                        href={link.url || '#'}
                                        className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                                            link.active 
                                            ? 'bg-indigo-600 text-white border-indigo-600' 
                                            : link.url 
                                                ? 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700' 
                                                : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
