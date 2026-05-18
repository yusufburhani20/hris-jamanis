<x-mail::message>
# Pemberitahuan Peminjaman Barang

Halo,

Anda telah meminjam barang dari sistem inventaris **SALIRA** dengan rincian sebagai berikut:

- **Nama Barang:** {{ $item->name }}
- **Kategori:** {{ $item->category->name ?? '-' }}
- **Barcode/Serial:** {{ $barcode->barcode_value }}

<x-mail::panel>
**Batas Waktu Pengembalian:**
{{ \Carbon\Carbon::parse($dueDate)->translatedFormat('l, d F Y') }}
</x-mail::panel>

Harap pastikan barang dikembalikan dalam kondisi baik (sama seperti saat dipinjam) sebelum atau tepat pada tanggal tersebut.

Terima kasih,<br>
**{{ config('app.name') }} - Tim Inventaris**
</x-mail::message>
