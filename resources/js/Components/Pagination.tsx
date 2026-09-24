import React from 'react';
import { Link } from '@inertiajs/react';

interface PaginationProps {
    links: { url: string | null; label: string; active: boolean }[];
    total?: number;
    from?: number;
    to?: number;
}

export default function Pagination({ links, total, from, to }: PaginationProps) {
    if (links.length <= 3) return null;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3 border-t border-slate-200 dark:border-slate-700/60 bg-white dark:bg-gray-800">
            <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
                {total !== undefined && from !== undefined && to !== undefined ? (
                    <span>
                        Menampilkan <span className="font-semibold text-slate-800 dark:text-slate-200">{from}</span> hingga <span className="font-semibold text-slate-800 dark:text-slate-200">{to}</span> dari <span className="font-semibold text-slate-800 dark:text-slate-200">{total}</span> data
                    </span>
                ) : (
                    <span>&nbsp;</span>
                )}
            </div>
            <div className="flex flex-wrap justify-center gap-1">
                {links.map((link, k) => {
                    const label = link.label
                        .replace('&laquo; Previous', '«')
                        .replace('Next &raquo;', '»');

                    let href = link.url;
                    // Konversi URL absolute ke relative untuk mencegah error di Cloudflare Tunnel / Proxy
                    if (href) {
                        try {
                            const urlObj = new URL(href);
                            href = urlObj.pathname + urlObj.search;
                        } catch (e) {
                            // Jika format URL tidak valid, biarkan saja
                        }
                    }

                    if (!href) {
                        return (
                            <div
                                key={k}
                                className="px-3 py-1.5 text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg cursor-not-allowed"
                                dangerouslySetInnerHTML={{ __html: label }}
                            />
                        );
                    }

                    return (
                        <Link
                            key={k}
                            href={href}
                            preserveScroll
                            preserveState
                            className={`px-3 py-1.5 text-xs border rounded-lg transition-colors ${
                                link.active
                                    ? 'bg-indigo-600 border-indigo-600 text-white font-semibold pointer-events-none'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                            dangerouslySetInnerHTML={{ __html: label }}
                        />
                    );
                })}
            </div>
        </div>
    );
}
