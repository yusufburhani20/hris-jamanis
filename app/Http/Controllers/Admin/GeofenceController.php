<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Geofence;
use Illuminate\Http\Request;
use Inertia\Inertia;

class GeofenceController extends Controller
{
    public function index()
    {
        $geofences = Geofence::latest()->get();
        return Inertia::render('Admin/Geofences/Index', [
            'geofences' => $geofences
        ]);
    }

    public function store(Request $request)
    {
        $request->merge([
            'latitude' => str_replace(',', '.', $request->latitude),
            'longitude' => str_replace(',', '.', $request->longitude),
        ]);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'radius' => 'required|integer|min:1',
            'is_active' => 'boolean',
            'work_start_time' => 'nullable|date_format:H:i',
            'work_end_time' => 'nullable|date_format:H:i',
        ]);

        Geofence::create($validated);

        return back()->with('success', 'Geofence created successfully.');
    }

    public function update(Request $request, Geofence $geofence)
    {
        $request->merge([
            'latitude' => str_replace(',', '.', $request->latitude),
            'longitude' => str_replace(',', '.', $request->longitude),
        ]);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'radius' => 'required|integer|min:1',
            'is_active' => 'boolean',
            'work_start_time' => 'nullable|date_format:H:i',
            'work_end_time' => 'nullable|date_format:H:i',
        ]);

        $geofence->update($validated);

        return back()->with('success', 'Geofence updated successfully.');
    }

    public function destroy(Geofence $geofence)
    {
        $geofence->delete();
        return back()->with('success', 'Geofence deleted successfully.');
    }
}
