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

        $branches = Branch::where('is_active', true)->orderBy('name', 'asc')->get();

        return Inertia::render('Courier/Shipments/Show', [
            'shipment' => $shipment,
            'branches' => $branches
        ]);
    }

    /**
     * Start the shipment trip.
     */
    public function startTrip(Request $request, $id)
    {
        $shipment = Shipment::where('id', $id)
            ->where('courier_id', Auth::id())
            ->firstOrFail();

        $request->validate([
            'photo' => 'required|image|max:5120', // Max 5MB
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'start_from' => 'required|string|max:255',
        ]);

        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('checkpoint_photos', 'public');

            $shipment->update([
                'status' => 'in_transit',
                'courier_lat' => $request->latitude,
                'courier_lng' => $request->longitude,
            ]);

            // Add starting checkpoint log
            ShipmentLog::create([
                'shipment_id' => $shipment->id,
                'status' => 'in_transit',
                'title' => 'Mulai Perjalanan',
                'description' => 'Driver memulai sesi perjalanan pengiriman barang dari ' . $request->start_from . '.',
                'latitude' => $request->latitude,
                'longitude' => $request->longitude,
                'photo_path' => $path,
            ]);

            return redirect()->back()->with('success', 'Perjalanan berhasil dimulai! Navigator pelacakan aktif.');
        }

        return back()->withErrors(['photo' => 'Gagal mengunggah foto awal perjalanan.']);
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
                'title' => 'Sesi Perjalanan Selesai',
                'description' => 'Driver telah menutup dan menyelesaikan seluruh rangkaian pengiriman hari ini.',
                'latitude' => $request->latitude ?? $shipment->courier_lat,
                'longitude' => $request->longitude ?? $shipment->courier_lng,
                'photo_path' => $path,
            ]);

            return redirect()->route('courier.shipments.index')->with('success', 'Perjalanan berhasil diselesaikan dan ditutup!');
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
            'origin_branch_id' => 'required|exists:branches,id',
        ]);

        $user = Auth::user();
        $branch = Branch::findOrFail($validated['origin_branch_id']);

        // Create the shipment
        $shipment = Shipment::create([
            'title' => 'Perjalanan Mandiri - ' . $user->name,
            'origin_name' => $branch->name,
            'destination_name' => 'Perjalanan Mandiri',
            'origin_lat' => $branch->latitude,
            'origin_lng' => $branch->longitude,
            'destination_lat' => $branch->latitude,
            'destination_lng' => $branch->longitude,
            'courier_id' => $user->id,
            'courier_name' => $user->name,
            'courier_lat' => $branch->latitude,
            'courier_lng' => $branch->longitude,
            'status' => 'in_transit',
            'notes' => $validated['notes'] ?? 'Perjalanan logistik mandiri.',
            'is_self_initiated' => true,
        ]);

        // Create initial log
        ShipmentLog::create([
            'shipment_id' => $shipment->id,
            'status' => 'in_transit',
            'title' => 'Mulai Perjalanan Mandiri',
            'description' => "Perjalanan mandiri dimulai dari " . $branch->name . ".",
            'latitude' => $branch->latitude,
            'longitude' => $branch->longitude,
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
            'title' => 'required|string|max:255',
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
                'title' => 'Stop: ' . $request->title,
                'description' => $request->description ?? 'Paket berhasil diserahterimakan / tiba di lokasi tujuan.',
                'latitude' => $request->latitude,
                'longitude' => $request->longitude,
                'photo_path' => $path,
            ]);

            return redirect()->back()->with('success', 'Bukti pengiriman stop berhasil disimpan ke log perjalanan!');
        }

        return back()->withErrors(['photo' => 'Gagal mengunggah foto bukti stop.']);
    }
}
