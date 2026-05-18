import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';

// ── Icon components ──────────────────────────────────────────────────────────
const QrisIcon = () => (
    <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
        <rect width="48" height="48" rx="8" fill="#00A8E0" opacity=".12" />
        <rect x="8" y="8" width="14" height="14" rx="2" stroke="#00A8E0" strokeWidth="2.5" />
        <rect x="11" y="11" width="8" height="8" rx="1" fill="#00A8E0" />
        <rect x="26" y="8" width="14" height="14" rx="2" stroke="#00A8E0" strokeWidth="2.5" />
        <rect x="29" y="11" width="8" height="8" rx="1" fill="#00A8E0" />
        <rect x="8" y="26" width="14" height="14" rx="2" stroke="#00A8E0" strokeWidth="2.5" />
        <rect x="11" y="29" width="8" height="8" rx="1" fill="#00A8E0" />
        <rect x="26" y="26" width="4" height="4" fill="#00A8E0" />
        <rect x="34" y="26" width="6" height="4" fill="#00A8E0" />
        <rect x="26" y="34" width="6" height="6" fill="#00A8E0" />
        <rect x="36" y="32" width="4" height="8" fill="#00A8E0" />
    </svg>
);
const GopayIcon = () => (
    <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
        <rect width="48" height="48" rx="8" fill="#00AED6" opacity=".12" />
        <circle cx="24" cy="24" r="13" stroke="#00AED6" strokeWidth="2.5" />
        <path d="M18 24h8m0 0l-3-3m3 3l-3 3" stroke="#00AED6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
const ShopeepayIcon = () => (
    <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
        <rect width="48" height="48" rx="8" fill="#EE4D2D" opacity=".12" />
        <path d="M24 12c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12S30.627 12 24 12z" stroke="#EE4D2D" strokeWidth="2.5" />
        <path d="M20 22s0-4 4-4 4 4 4 4M20 26s0 4 4 4 4-4 4-4" stroke="#EE4D2D" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
);
const BankIcon = () => (
    <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
        <rect width="48" height="48" rx="8" fill="#4f46e5" opacity=".10" />
        <path d="M10 22h28M24 10l14 12H10L24 10z" stroke="#4f46e5" strokeWidth="2.5" strokeLinejoin="round" />
        <rect x="14" y="22" width="4" height="10" fill="#4f46e5" opacity=".4" />
        <rect x="22" y="22" width="4" height="10" fill="#4f46e5" opacity=".4" />
        <rect x="30" y="22" width="4" height="10" fill="#4f46e5" opacity=".4" />
        <rect x="10" y="32" width="28" height="3" rx="1" fill="#4f46e5" />
    </svg>
);
const StoreIcon = () => (
    <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
        <rect width="48" height="48" rx="8" fill="#f59e0b" opacity=".12" />
        <path d="M10 20v18h28V20" stroke="#f59e0b" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M8 20l4-10h24l4 10" stroke="#f59e0b" strokeWidth="2.5" strokeLinejoin="round" />
        <rect x="20" y="28" width="8" height="10" rx="2" fill="#f59e0b" opacity=".5" />
        <rect x="14" y="26" width="6" height="6" rx="1" stroke="#f59e0b" strokeWidth="2" />
    </svg>
);

const ICONS: Record<string, () => JSX.Element> = {
    qris: QrisIcon,
    gopay: GopayIcon,
    shopeepay: ShopeepayIcon,
    bank: BankIcon,
    store: StoreIcon,
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function InvoiceShow({ bill: initialBill, isProduction, clientKey, paymentMethods, adminFee }: any) {
    const [bill, setBill] = useState(initialBill);
    const [isSnapLoaded, setSnapLoaded] = useState(false);
    const [selectedMethod, setSelected] = useState<string | null>(null);
    const [isProcessing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load Midtrans Snap.js
    useEffect(() => {
        if (!clientKey) return;
        const script = document.createElement('script');
        script.src = isProduction
            ? 'https://app.midtrans.com/snap/snap.js'
            : 'https://app.sandbox.midtrans.com/snap/snap.js';
        script.setAttribute('data-client-key', clientKey);
        script.onload = () => setSnapLoaded(true);
        document.body.appendChild(script);
        return () => { if (document.body.contains(script)) document.body.removeChild(script); };
    }, [clientKey, isProduction]);

    const formatRp = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(n);

    const handlePay = async (methodKey: string) => {
        if (!isSnapLoaded) return;
        setSelected(methodKey);
        setProcessing(true);
        setError(null);

        try {
            const res = await fetch(`/invoice/${bill.bill_number}/prepare-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ method_group: methodKey }),
            });
            const data = await res.json();

            if (!res.ok || data.error) {
                setError(data.error || 'Gagal menyiapkan pembayaran.');
                setProcessing(false);
                return;
            }

            setBill((prev: any) => ({ ...prev, admin_fee: data.admin_fee?.amount ?? 0 }));

            window.snap.pay(data.snap_token, {
                onSuccess: () => window.location.reload(),
                onPending: () => { setProcessing(false); setSelected(null); },
                onError: () => { setError('Pembayaran gagal. Silakan pilih metode lain atau coba lagi.'); setProcessing(false); setSelected(null); },
                onClose: () => { setProcessing(false); setSelected(null); },
            });
        } catch {
            setError('Tidak dapat menghubungi server. Periksa koneksi internet Anda.');
            setProcessing(false);
            setSelected(null);
        }
    };

    const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
        paid: { label: 'LUNAS', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
        pending: { label: 'MENUNGGU', bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
        expired: { label: 'KADALUARSA', bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
        unpaid: { label: 'BELUM DIBAYAR', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
        failed: { label: 'GAGAL', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
    };
    const billStatus = String(bill.status || 'unpaid');
    const st = statusConfig[billStatus] ?? statusConfig['unpaid'];

    const methodsArray: any[] = paymentMethods ? Object.values(paymentMethods) : [];

    // Format payment_method code to readable text (no question marks)
    const formatMethodLabel = (raw: string | null | undefined): string => {
        if (!raw) return 'Pembayaran Digital';
        const map: Record<string, string> = {
            gopay: 'GoPay', shopeepay: 'ShopeePay', qris: 'QRIS',
            bank_transfer: 'Transfer Bank', bca_va: 'BCA Virtual Account',
            bni_va: 'BNI Virtual Account', bri_va: 'BRI Virtual Account',
            mandiri_bill: 'Mandiri Bill', permata_va: 'Permata Virtual Account',
            echannel: 'Mandiri Echannel', other_va: 'Virtual Account',
            cstore: 'Gerai (Alfamart/Indomaret)', alfamart: 'Alfamart',
            indomaret: 'Indomaret', credit_card: 'Kartu Kredit',
        };
        return map[raw] ?? raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 to-indigo-50 flex items-start justify-center p-4 pt-10 pb-16">
            <Head title={`Invoice ${bill.bill_number}`} />

            <div className="w-full max-w-lg">
                {/* ── Header card ── */}
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl px-6 pt-8 pb-10 text-white shadow-xl shadow-indigo-200 mb-[-20px] relative z-0">
                    <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest mb-1">SALIRA · Kuitansi Pembayaran</p>
                    <h1 className="text-2xl font-bold">{bill.title}</h1>
                    <p className="text-indigo-200 text-sm mt-1">Bulan {bill.month} / {bill.year}</p>
                    <div className="flex justify-between items-end mt-6">
                        <div>
                            <p className="text-indigo-200 text-xs">Tagihan kepada</p>
                            <p className="font-bold text-lg leading-tight">{bill.student?.name ?? '-'}</p>
                            <p className="text-indigo-200 text-xs">NIS: {bill.student?.nis ?? '-'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-indigo-200 text-xs">No. Invoice</p>
                            <p className="text-xs font-mono font-semibold opacity-90">{bill.bill_number}</p>
                        </div>
                    </div>
                </div>

                {/* ── Main card ── */}
                <div className="bg-white rounded-2xl shadow-lg ring-1 ring-black/5 relative z-10 px-6 pt-8 pb-6">

                    {/* Status + Amount */}
                    <div className="flex items-center justify-between mb-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${st.bg} ${st.text}`}>
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" aria-hidden="true"><circle cx="4" cy="4" r="4"/></svg>
                            {st.label}
                        </span>
                        <div className="text-right">
                            <p className="text-xs text-gray-400">Tagihan SPP</p>
                            <p className="text-2xl font-black text-indigo-700">{formatRp(bill.amount)}</p>
                        </div>
                    </div>

                    {/* ── PAID STATE ── */}
                    {bill.status === 'paid' && (
                        <>
                            <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center mb-4">
                                <svg className="mx-auto h-10 w-10 text-green-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <h3 className="font-bold text-green-800">Tagihan Telah Lunas</h3>
                                <p className="text-xs text-green-600 mt-1">Terima kasih atas pembayaran Anda.</p>
                            </div>
                            {/* Details */}
                            <div className="space-y-2 text-sm border-t pt-4">
                                {bill.paid_at && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Tanggal Lunas</span>
                                        <span className="font-medium text-gray-800">
                                            {new Date(bill.paid_at).toLocaleString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Metode Bayar</span>
                                    <span className="font-medium text-gray-800">
                                        {formatMethodLabel(bill.payment_method)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Tagihan SPP</span>
                                    <span className="font-medium text-gray-800">{formatRp(bill.amount)}</span>
                                </div>
                                {adminFee && adminFee.amount > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">{adminFee.label}</span>
                                        <span className="text-orange-600 font-medium">+ {formatRp(adminFee.amount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold pt-2 border-t">
                                    <span className="text-gray-700">Total Dibayar</span>
                                    <span className="text-indigo-700">{formatRp(Number(bill.amount) + (adminFee?.amount ?? 0))}</span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── UNPAID / EXPIRED STATE — Method Selection ── */}
                    {bill.status !== 'paid' && (
                        <>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Pilih Metode Pembayaran</p>

                            {error && (
                                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
                                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    {error}
                                </div>
                            )}

                            <div className="space-y-3">
                                {methodsArray.map((method: any) => {
                                    const Icon = ICONS[method.icon] ?? BankIcon;
                                    const isThisLoading = isProcessing && selectedMethod === method.key;
                                    const isDisabled = isProcessing && selectedMethod !== method.key;
                                    return (
                                        <button
                                            key={method.key}
                                            onClick={() => handlePay(method.key)}
                                            disabled={isProcessing || !isSnapLoaded}
                                            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all
                                                ${isThisLoading
                                                    ? 'border-indigo-400 bg-indigo-50 scale-[0.99]'
                                                    : isDisabled
                                                        ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                                                        : 'border-gray-150 hover:border-indigo-300 hover:bg-indigo-50/50 hover:shadow-sm active:scale-[0.98] cursor-pointer'
                                                }`}
                                        >
                                            <div className="flex-shrink-0">
                                                <Icon />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-900 text-sm">{method.label}</p>
                                                <p className="text-xs text-gray-500 truncate">{method.description}</p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                {method.fee_amount > 0 ? (
                                                    <>
                                                        <p className="text-xs text-orange-500 font-semibold">
                                                            +{method.fee_type === 'percent'
                                                                ? `${method.fee_value}%`
                                                                : formatRp(method.fee_value)}
                                                        </p>
                                                        <p className="text-xs font-bold text-gray-700">Total: {formatRp(method.total)}</p>
                                                    </>
                                                ) : (
                                                    <p className="text-xs font-bold text-green-600">Gratis</p>
                                                )}
                                                {isThisLoading
                                                    ? <span className="inline-block animate-spin w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full mt-1"></span>
                                                    : <svg className="w-4 h-4 text-gray-300 mt-1 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                }
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {!isSnapLoaded && (
                                <p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1">
                                    <span className="animate-spin inline-block w-3 h-3 border border-gray-400 border-t-transparent rounded-full"></span>
                                    Menyiapkan payment gateway...
                                </p>
                            )}
                            <p className="text-center text-xs text-gray-400 mt-4">
                                Pembayaran diproses dengan aman oleh <span className="font-semibold">Midtrans</span>
                            </p>
                        </>
                    )}

                    {/* ── Unduh PDF ── */}
                    <div className="mt-5 pt-4 border-t border-gray-100">
                        <a
                            href={`/invoice/${bill.bill_number}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-indigo-200 rounded-xl text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Unduh Invoice PDF
                        </a>
                    </div>
                </div>

                <p className="text-center text-xs text-gray-400 mt-4">
                    © {new Date().getFullYear()} SALIRA · Sistem Administrasi Sekolah
                </p>
            </div>
        </div>
    );
}

declare global { interface Window { snap: any; } }
