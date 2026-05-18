/**
 * Format tanggal menggunakan zona waktu LOKAL browser, bukan UTC.
 * Menghindari masalah toISOString() yang mengkonversi ke UTC sehingga
 * tanggal bisa bergeser 1 hari untuk zona waktu UTC+ (seperti WIB UTC+7).
 *
 * Contoh masalah:
 *   new Date(2026, 3, 30).toISOString() → "2026-04-29T17:00:00.000Z" (salah!)
 *   formatLocalDate(new Date(2026, 3, 30)) → "2026-04-30" (benar!)
 */
export function formatLocalDate(d: Date): string {
    const y   = d.getFullYear();
    const m   = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** Tanggal hari ini sebagai YYYY-MM-DD (timezone lokal) */
export const todayLocal = (): string => formatLocalDate(new Date());

/** Hari pertama bulan sebagai YYYY-MM-DD (timezone lokal, month = 0-indexed) */
export const firstDayOfMonth = (year: number, month: number): string =>
    formatLocalDate(new Date(year, month, 1));

/** Hari terakhir bulan sebagai YYYY-MM-DD (timezone lokal, month = 0-indexed) */
export const lastDayOfMonth = (year: number, month: number): string =>
    formatLocalDate(new Date(year, month + 1, 0));
