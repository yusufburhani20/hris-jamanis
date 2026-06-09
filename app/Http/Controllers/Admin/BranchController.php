<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BranchController extends Controller
{
    public function index()
    {
        $branches = Branch::latest()->get();
        return Inertia::render('Admin/Branches/Index', [
            'branches' => $branches
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
            'address' => 'nullable|string|max:1000',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'is_active' => 'boolean',
        ]);

        Branch::create($validated);

        return back()->with('success', 'Cabang baru berhasil dibuat.');
    }

    public function update(Request $request, Branch $branch)
    {
        $request->merge([
            'latitude' => str_replace(',', '.', $request->latitude),
            'longitude' => str_replace(',', '.', $request->longitude),
        ]);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string|max:1000',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'is_active' => 'boolean',
        ]);

        $branch->update($validated);

        return back()->with('success', 'Cabang berhasil diperbarui.');
    }

    public function destroy(Branch $branch)
    {
        $branch->delete();
        return back()->with('success', 'Cabang berhasil dihapus.');
    }
}
