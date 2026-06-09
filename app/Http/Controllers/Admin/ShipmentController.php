<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Shipment;
use App\Models\ShipmentLog;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ShipmentController extends Controller
{
    /**
     * Display a listing of shipments.
     */
    public function index()
    {
        $shipments = Shipment::with(['courier', 'logs'])->orderBy('id', 'desc')->get();
        
        // Fetch users to assign as couriers (only drivers)
        $couriers = User::where('role', 'LIKE', '%driver%')
            ->where('status', 'active')
            ->select('id', 'name', 'email', 'role')
            ->get();

        // Fetch active branches
        $branches = \App\Models\Branch::where('is_active', true)->orderBy('name', 'asc')->get();

        return Inertia::render('Admin/Shipments/Index', [
            'shipments' => $shipments,
            'couriers' => $couriers,
            'branches' => $branches,
        ]);
    }

    /**
     * Store a newly created shipment in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'origin_name' => 'required|string|max:255',
            'destination_name' => 'required|string|max:255',
            'origin_lat' => 'required|numeric',
            'origin_lng' => 'required|numeric',
            'destination_lat' => 'required|numeric',
            'destination_lng' => 'required|numeric',
            'courier_id' => 'nullable|exists:users,id',
            'notes' => 'nullable|string',
        ]);

        // Get courier name if assigned
        if (!empty($validated['courier_id'])) {
            $courier = User::find($validated['courier_id']);
            $validated['courier_name'] = $courier->name;
            // Set initial courier coordinates to origin warehouse
            $validated['courier_lat'] = $validated['origin_lat'];
            $validated['courier_lng'] = $validated['origin_lng'];
        }

        $shipment = Shipment::create($validated);

        // Auto-create the initial log "Packing"
        ShipmentLog::create([
            'shipment_id' => $shipment->id,
            'status' => 'packing',
            'title' => 'Paket sedang disiapkan di gudang asal',
            'description' => "Barang sedang dikemas di {$shipment->origin_name} oleh staf logistik.",
            'latitude' => $shipment->origin_lat,
            'longitude' => $shipment->origin_lng,
        ]);

        return redirect()->route('admin.shipments.index')
            ->with('success', 'Resi pengiriman barang baru berhasil dibuat!');
    }

    /**
     * Display the specified shipment.
     */
    public function show(Shipment $shipment)
    {
        $shipment->load(['courier', 'logs']);
        
        $couriers = User::where('role', 'LIKE', '%driver%')
            ->where('status', 'active')
            ->select('id', 'name', 'email')
            ->get();

        // Fetch active branches
        $branches = \App\Models\Branch::where('is_active', true)->orderBy('name', 'asc')->get();

        return Inertia::render('Admin/Shipments/Show', [
            'shipment' => $shipment,
            'couriers' => $couriers,
            'branches' => $branches,
        ]);
    }

    /**
     * Update the specified shipment.
     */
    public function update(Request $request, Shipment $shipment)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'origin_name' => 'required|string|max:255',
            'destination_name' => 'required|string|max:255',
            'origin_lat' => 'required|numeric',
            'origin_lng' => 'required|numeric',
            'destination_lat' => 'required|numeric',
            'destination_lng' => 'required|numeric',
            'courier_id' => 'nullable|exists:users,id',
            'notes' => 'nullable|string',
        ]);

        if (!empty($validated['courier_id'])) {
            $courier = User::find($validated['courier_id']);
            $validated['courier_name'] = $courier->name;
            
            // If courier was not assigned before, set initial coordinates to origin
            if ($shipment->courier_id != $validated['courier_id']) {
                $validated['courier_lat'] = $validated['origin_lat'];
                $validated['courier_lng'] = $validated['origin_lng'];
            }
        } else {
            $validated['courier_id'] = null;
            $validated['courier_name'] = null;
        }

        $shipment->update($validated);

        return redirect()->back()->with('success', 'Data detail pengiriman berhasil diperbarui!');
    }

    /**
     * Update the status of the shipment and append a log entry.
     */
    public function updateStatus(Request $request, Shipment $shipment)
    {
        $validated = $request->validate([
            'status' => 'required|in:packing,picked_up,in_transit,delivered,failed',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'log_description' => 'nullable|string|max:500',
        ]);

        $oldStatus = $shipment->status;
        $newStatus = $validated['status'];

        if ($oldStatus !== $newStatus) {
            $shipment->status = $newStatus;
            
            // If courier location is provided, update courier current coords
            if ($request->filled('latitude') && $request->filled('longitude')) {
                $shipment->courier_lat = $validated['latitude'];
                $shipment->courier_lng = $validated['longitude'];
            }

            $shipment->save();

            // Set default Titles & Descriptions based on new status
            $titles = [
                'packing' => 'Paket sedang disiapkan di gudang asal',
                'picked_up' => 'Paket diserahkan ke kurir',
                'in_transit' => 'Paket dalam perjalanan pengiriman',
                'delivered' => 'Paket telah sampai di cabang tujuan',
                'failed' => 'Proses pengantaran mengalami kendala',
            ];

            $descriptions = [
                'packing' => "Barang sedang dikemas di {$shipment->origin_name}.",
                'picked_up' => "Kurir " . ($shipment->courier_name ?? 'logistik') . " telah mengambil paket dari {$shipment->origin_name} dan siap menuju ke {$shipment->destination_name}.",
                'in_transit' => "Paket sedang dalam perjalanan darat menuju cabang tujuan {$shipment->destination_name}.",
                'delivered' => "Paket telah sukses diterima oleh staf di cabang tujuan {$shipment->destination_name}. Distribusi selesai.",
                'failed' => "Pengiriman ditunda/gagal. Silakan periksa kolom catatan untuk detail kendala.",
            ];

            $customDesc = $validated['log_description'] ?? $descriptions[$newStatus];

            // Auto-append tracking timeline log
            ShipmentLog::create([
                'shipment_id' => $shipment->id,
                'status' => $newStatus,
                'title' => $titles[$newStatus],
                'description' => $customDesc,
                'latitude' => $validated['latitude'] ?? $shipment->courier_lat ?? $shipment->origin_lat,
                'longitude' => $validated['longitude'] ?? $shipment->courier_lng ?? $shipment->origin_lng,
            ]);

            return redirect()->back()->with('success', "Status pengiriman berhasil diubah menjadi: " . strtoupper($newStatus));
        }

        return redirect()->back();
    }

    /**
     * Manually add a transit timeline log.
     */
    public function addLog(Request $request, Shipment $shipment)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:500',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'status' => 'required|string',
        ]);

        $validated['shipment_id'] = $shipment->id;

        // If coordinates provided, also update current courier coordinates
        if ($request->filled('latitude') && $request->filled('longitude')) {
            $shipment->update([
                'courier_lat' => $validated['latitude'],
                'courier_lng' => $validated['longitude']
            ]);
        }

        ShipmentLog::create($validated);

        return redirect()->back()->with('success', 'Catatan log transit baru berhasil ditambahkan!');
    }

    /**
     * Update courier coordinates directly.
     */
    public function updateCourierCoords(Request $request, Shipment $shipment)
    {
        $validated = $request->validate([
            'courier_lat' => 'required|numeric',
            'courier_lng' => 'required|numeric',
        ]);

        $shipment->update($validated);

        return redirect()->back()->with('success', 'Koordinat real-time kurir berhasil diperbarui!');
    }

    /**
     * Display driver monitor page (Live fleet tracker).
     */
    public function driverMonitor()
    {
        return Inertia::render('Admin/Shipments/DriverMonitor');
    }

    /**
     * Fetch active drivers coords as JSON.
     */
    public function activeDrivers()
    {
        $drivers = User::where('role', 'LIKE', '%driver%')
            ->select('id', 'name', 'email', 'driver_lat', 'driver_lng', 'driver_is_sharing_location', 'driver_location_updated_at')
            ->get()
            ->map(function ($driver) {
                // If coordinates are set and updated within last 5 minutes, mark as online
                $isOnline = $driver->driver_is_sharing_location && 
                            $driver->driver_location_updated_at && 
                            $driver->driver_location_updated_at->gt(now()->subMinutes(5));
                return [
                    'id' => $driver->id,
                    'name' => $driver->name,
                    'email' => $driver->email,
                    'lat' => $driver->driver_lat,
                    'lng' => $driver->driver_lng,
                    'is_sharing' => $driver->driver_is_sharing_location,
                    'is_online' => $isOnline,
                    'last_updated' => $driver->driver_location_updated_at ? $driver->driver_location_updated_at->diffForHumans() : 'Belum pernah',
                ];
            });

        return response()->json([
            'success' => true,
            'drivers' => $drivers,
        ]);
    }

    /**
     * Remove the specified shipment from storage.
     */
    public function destroy(Shipment $shipment)
    {
        $shipment->delete();
        return redirect()->route('admin.shipments.index')
            ->with('success', 'Resi pengiriman cabang berhasil dihapus!');
    }
}
