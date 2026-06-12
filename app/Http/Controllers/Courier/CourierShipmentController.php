<?php

namespace App\Http\Controllers\Courier;

use App\Http\Controllers\Controller;
use App\Models\Shipment;
use App\Models\ShipmentLog;
use App\Models\Branch;
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

        $branches = Branch::where('is_active', true)->orderBy('name', 'asc')->get();

        return Inertia::render('Courier/Shipments/Index', [
            'shipments' => $shipments,
            'branches' => $branches
        ]);
    }

    /**
     * Display the detail of a specific shipment for the courier (including GPS broadcaster & upload photo form).
     */
    public function show($id)
    {
        $shipment = Shipment::with('logs')
            ->where('courier_id', Auth::id())
            ->where('id', $id)
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

    /**
     * API Endpoint: Receive global/live courier telemetry.
     */
    public function updateGlobalLocation(Request $request)
    {
        $validated = $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'is_sharing' => 'required|boolean',
        ]);

        $user = $request->user();
        
        $user->update([
            'driver_lat' => $validated['latitude'],
            'driver_lng' => $validated['longitude'],
            'driver_is_sharing_location' => $validated['is_sharing'],
            'driver_location_updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Lokasi global driver berhasil diperbarui.'
        ]);
    }

    /**
     * Store a self-initiated shipment created by the driver.
     */
    public function storeSelfInitiated(Request $request)
    {
        $validated = $request->validate([
            'notes' => 'nullable|string|max:500',
        ]);

        $user = Auth::user();

        // Create the shipment
        $shipment = Shipment::create([
            'title' => 'Perjalanan Mandiri - ' . $user->name,
            'origin_name' => 'Jamanis',
            'destination_name' => 'Perjalanan Mandiri',
            'origin_lat' => -7.2478,
            'origin_lng' => 108.1472,
            'destination_lat' => -7.2478,
            'destination_lng' => 108.1472,
            'courier_id' => $user->id,
            'courier_name' => $user->name,
            'courier_lat' => -7.2478,
            'courier_lng' => 108.1472,
            'status' => 'in_transit',
            'notes' => $validated['notes'] ?? 'Perjalanan logistik mandiri.',
            'is_self_initiated' => true,
        ]);

        // Create initial log
        ShipmentLog::create([
            'shipment_id' => $shipment->id,
            'status' => 'in_transit',
            'title' => 'Sopir memulai perjalanan logistik mandiri',
            'description' => "Perjalanan mandiri dimulai dari Jamanis.",
            'latitude' => -7.2478,
            'longitude' => 108.1472,
        ]);

        return redirect()->route('courier.shipments.show', $shipment->id)
            ->with('success', 'Perjalanan mandiri berhasil dimulai! Navigator pelacakan aktif.');
    }

    /**
     * Store a checkpoint photo with GPS telemetry.
     */
    public function addCheckpointPhoto(Request $request, $id)
    {
        $shipment = Shipment::where('id', $id)
            ->where('courier_id', Auth::id())
            ->firstOrFail();

        $request->validate([
            'photo' => 'required|image|max:5120', // Max 5MB
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'description' => 'nullable|string|max:500',
        ]);

        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('checkpoint_photos', 'public');

            // Update courier current position
            $shipment->update([
                'courier_lat' => $request->latitude,
                'courier_lng' => $request->longitude,
            ]);

            // Add checkpoint timeline log
            ShipmentLog::create([
                'shipment_id' => $shipment->id,
                'status' => 'in_transit',
                'title' => 'Checkpoint Perjalanan Mandiri',
                'description' => $request->description ?? 'Driver mengunggah foto checkpoint lokasi di tengah perjalanan.',
                'latitude' => $request->latitude,
                'longitude' => $request->longitude,
                'photo_path' => $path,
            ]);

            return redirect()->back()->with('success', 'Foto checkpoint lokasi berhasil disimpan ke log perjalanan!');
        }

        return back()->withErrors(['photo' => 'Gagal mengunggah foto checkpoint.']);
    }
}
