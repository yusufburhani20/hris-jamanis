<?php

namespace App\Http\Controllers\Admin\Hpp;

use App\Http\Controllers\Controller;
use App\Models\OverheadCost;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

class HppOverheadController extends Controller
{
    public function index()
    {
        $overheads = OverheadCost::where('user_id', auth()->id())->latest()->get();
        $total     = $overheads->sum('monthly_amount');

        return Inertia::render('Admin/Hpp/Overheads/Index', [
            'overheads' => $overheads,
            'total'     => $total,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'          => 'required|string|max:200',
            'monthly_amount' => 'required|numeric|min:0',
            'notes'         => 'nullable|string',
        ]);

        OverheadCost::create([
            'user_id'       => auth()->id(),
            'name'          => $validated['name'],
            'monthly_amount' => $validated['monthly_amount'],
            'notes'         => $validated['notes'] ?? null,
        ]);

        // Recalculate all product HPPs after overhead change
        $this->recalculateAllProducts();

        return redirect()->back()->with('success', "Biaya overhead \"{$validated['name']}\" berhasil ditambahkan. HPP semua produk diperbarui.");
    }

    public function update(Request $request, OverheadCost $overheadCost)
    {
        abort_if($overheadCost->user_id !== auth()->id(), 403);

        $validated = $request->validate([
            'name'          => 'required|string|max:200',
            'monthly_amount' => 'required|numeric|min:0',
            'notes'         => 'nullable|string',
        ]);

        $overheadCost->update($validated);
        $this->recalculateAllProducts();

        return redirect()->back()->with('success', "Biaya overhead \"{$overheadCost->name}\" berhasil diperbarui. HPP semua produk diperbarui.");
    }

    public function destroy(OverheadCost $overheadCost)
    {
        abort_if($overheadCost->user_id !== auth()->id(), 403);

        $name = $overheadCost->name;
        $overheadCost->delete();
        $this->recalculateAllProducts();

        return redirect()->back()->with('success', "Biaya \"{$name}\" berhasil dihapus. HPP semua produk diperbarui.");
    }

    /**
     * Setiap perubahan overhead, recalculate HPP semua produk manufaktur/jasa milik user.
     */
    private function recalculateAllProducts(): void
    {
        $products = Product::where('user_id', auth()->id())
            ->whereIn('type', ['manufacturing', 'service'])
            ->with('materials')
            ->get();

        foreach ($products as $product) {
            $hpp          = $product->calculateHpp();
            $sellingPrice = $product->calculateSellingPrice($hpp);
            $product->update(['hpp' => $hpp, 'selling_price' => $sellingPrice]);
        }
    }
}
