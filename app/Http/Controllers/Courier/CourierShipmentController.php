<?php

namespace App\Http\Controllers\Courier;

use App\Http\Controllers\Controller;
use App\Models\Shipment;
use App\Models\ShipmentLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class CourierShipmentController extends Controller
{
    /**
     * Display a listing of shipments assigned to the logged-in courier.
     */
    public function index()
    {
        $shipments = Shipment::where('courier_id', Auth::id())
            ->orderBy('id', 'desc')
            ->get();

        return Inertia::render('Courier/Shipments/Index', [
            'shipments' => $shipments
        ]);
    }

    /**
     * Display the detail of a specific shipment for the courier (including GPS broadcaster & upload photo form).
     */
    public function show($id)
    {
        $shipment = Shipment::with('logs')
            ->where('courier_id', Auth::id())
            ->firstOrFail();

        return Inertia::render('Courier/Shipments/Show', [
            'shipment' => $shipment
        ]);
    }

    /**
     * Mark the shipment as delivered with a photo proof.
     */
    public function deliver(Request $request, $id)
    {
        $shipment = Shipment::where('id', $id)
            ->where('courier_id', Auth::id())
            ->firstOrFail();

        $request->validate([
            'delivery_photo' => 'required|image|max:5120', // Max 5MB
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
        ]);

        if ($request->hasFile('delivery_photo')) {
            // Store file inside public disk under 'delivery_photos'
            $path = $request->file('delivery_photo')->store('delivery_photos', 'public');
            
            // Update Shipment state
            $shipment->update([
                'status' => 'delivered',
                'delivery_photo' => $path,
                'courier_lat' => $request->latitude ?? $shipment->courier_lat,
                'courier_lng' => $request->longitude ?? $shipment->courier_lng,
            ]);

            // Add delivered timeline log
            ShipmentLog::create([
                'shipment_id' => $shipment->id,
                'status' => 'delivered',
                'title' => 'Paket Berhasil Diterima di Cabang',
                'description' => 'Paket pengisian stok telah berhasil diserahterimakan kepada staf retail cabang. Bukti foto penerimaan telah diunggah oleh pengemudi.',
                'latitude' => $request->latitude ?? $shipment->courier_lat,
                'longitude' => $request->longitude ?? $shipment->courier_lng,
            ]);

            return redirect()->route('courier.shipments.index')->with('success', 'Paket berhasil diselesaikan dengan bukti foto!');
        }

        return back()->withErrors(['delivery_photo' => 'Gagal mengunggah foto. Harap pilih gambar yang valid.']);
    }
}
