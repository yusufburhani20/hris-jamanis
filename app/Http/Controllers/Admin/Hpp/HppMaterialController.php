<?php

namespace App\Http\Controllers\Admin\Hpp;

use App\Http\Controllers\Controller;
use App\Models\Material;
use Illuminate\Http\Request;
use Inertia\Inertia;

class HppMaterialController extends Controller
{
    public function index()
    {
        $materials = Material::where('user_id', auth()->id())->latest()->get();

        return Inertia::render('Admin/Hpp/Materials/Index', [
            'materials' => $materials,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'          => 'required|string|max:200',
            'unit'          => 'required|string|max:50',
            'price_per_unit' => 'required|numeric|min:0',
            'notes'         => 'nullable|string',
        ]);

        Material::create([
            'user_id'       => auth()->id(),
            'name'          => $validated['name'],
            'unit'          => $validated['unit'],
            'price_per_unit' => $validated['price_per_unit'],
            'notes'         => $validated['notes'] ?? null,
        ]);

        return redirect()->back()->with('success', "Bahan \"{$validated['name']}\" berhasil ditambahkan.");
    }

    public function update(Request $request, Material $material)
    {
        abort_if($material->user_id !== auth()->id(), 403);

        $validated = $request->validate([
            'name'          => 'required|string|max:200',
            'unit'          => 'required|string|max:50',
            'price_per_unit' => 'required|numeric|min:0',
            'notes'         => 'nullable|string',
        ]);

        $material->update($validated);

        // Recalculate HPP for all products using this material
        foreach ($material->products as $product) {
            $hpp = $product->calculateHpp();
            $sellingPrice = $product->calculateSellingPrice($hpp);
            $product->update(['hpp' => $hpp, 'selling_price' => $sellingPrice]);
        }

        return redirect()->back()->with('success', "Bahan \"{$material->name}\" berhasil diperbarui.");
    }

    public function destroy(Material $material)
    {
        abort_if($material->user_id !== auth()->id(), 403);

        if ($material->products()->count() > 0) {
            return redirect()->back()->with('error', 'Bahan ini tidak dapat dihapus karena masih digunakan pada resep produk.');
        }

        $name = $material->name;
        $material->delete();

        return redirect()->back()->with('success', "Bahan \"{$name}\" berhasil dihapus.");
    }
}
