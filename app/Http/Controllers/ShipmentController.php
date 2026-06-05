<?php

namespace App\Http\Controllers;

use App\Models\Shipment;
use App\Models\ShipmentLog;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ShipmentController extends Controller
{
    /**
     * Track a package by tracking number (SPX Style public/employee tracker).
     */
    public function trackPage($trackingNumber = null)
    {
        $shipment = null;
        $error = null;

        if ($trackingNumber) {
            $shipment = Shipment::with(['logs', 'courier'])
                ->where('tracking_number', trim($trackingNumber))
                ->first();

            if (!$shipment) {
                $error = "Nomor resi pelacakan '{$trackingNumber}' tidak ditemukan. Silakan periksa kembali input Anda.";
            }
        }

        return Inertia::render('Shipments/Track', [
            'shipment' => $shipment,
            'trackingNumber' => $trackingNumber,
            'error' => $error
        ]);
    }

    /**
     * Render the courier mobile scanner page to update coordinates.
     */
    public function courierScanner(Request $request, $trackingNumber)
    {
        $shipment = Shipment::where('tracking_number', $trackingNumber)->firstOrFail();

        // Security check: only the assigned courier or admin can access
        $user = $request->user();
        if (!$user->isAdmin() && $shipment->courier_id !== $user->id) {
            abort(403, 'Anda tidak ditugaskan sebagai kurir untuk pengiriman barang ini.');
        }

        return Inertia::render('Shipments/CourierScanner', [
            'shipment' => $shipment
        ]);
    }

    /**
     * API Endpoint: Courier posting GPS coordinates from phone.
     */
    public function updateGPS(Request $request, Shipment $shipment)
    {
        $validated = $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
        ]);

        // Security check: only the assigned courier or admin can update
        $user = $request->user();
        if (!$user->isAdmin() && $shipment->courier_id !== $user->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $shipment->update([
            'courier_lat' => $validated['latitude'],
            'courier_lng' => $validated['longitude'],
        ]);

        // Optionally update the latest log with coords if they were set
        return response()->json([
            'success' => true,
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'message' => 'Koordinat kurir berhasil diperbarui secara real-time.'
        ]);
    }
}
