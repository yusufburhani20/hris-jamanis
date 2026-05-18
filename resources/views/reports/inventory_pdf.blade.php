@extends('reports.pdf_layout')

@section('content')
<table class="data">
    <thead>
        <tr>
            <th width="30" class="text-center">No</th>
            <th>Nama Barang</th>
            <th width="100" class="text-center">Kode Item</th>
            <th width="80" class="text-center">Kategori</th>
            <th width="80" class="text-center">Total</th>
            <th width="80" class="text-center" style="background: #ecfdf5">Tersedia</th>
            <th width="80" class="text-center" style="background: #eff6ff">Dipinjam</th>
            <th width="80" class="text-center" style="background: #fff7ed">Perbaikan</th>
            <th width="80" class="text-center" style="background: #fef2f2">Dihapus</th>
        </tr>
    </thead>
    <tbody>
        @foreach($items as $index => $item)
        <tr>
            <td class="text-center">{{ $index + 1 }}</td>
            <td style="font-weight: bold;">{{ $item->name }}</td>
            <td class="text-center" style="font-family: monospace;">{{ $item->code }}</td>
            <td class="text-center">{{ $item->category->name ?? '-' }}</td>
            <td class="text-center" style="font-weight: bold;">{{ $item->total_unit }}</td>
            <td class="text-center">{{ $item->tersedia }}</td>
            <td class="text-center">{{ $item->dipinjam }}</td>
            <td class="text-center">{{ $item->perbaikan }}</td>
            <td class="text-center" style="color: #ef4444;">{{ $item->dihapus }}</td>
        </tr>
        @endforeach
    </tbody>
</table>

<div style="margin-top: 20px; font-size: 9px; color: #64748b;">
    <strong>Keterangan:</strong> Laporan status pergerakan unit fisik barang secara real-time.
</div>
@endsection
