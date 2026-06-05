<?php

namespace App\Http\Controllers\Admin\Hpp;

use App\Http\Controllers\Controller;
use App\Models\Material;
use App\Models\OverheadCost;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

class HppProductController extends Controller
{
    public function index()
    {
        $products = Product::where('user_id', auth()->id())
            ->with('materials')
            ->latest()
            ->get()
            ->map(function ($p) {
                return [
                    'id'             => $p->id,
                    'name'           => $p->name,
                    'type'           => $p->type,
                    'type_label'     => $p->type_label,
                    'unit'           => $p->unit,
                    'hpp'            => $p->hpp,
                    'selling_price'  => $p->selling_price,
                    'margin'         => $p->actual_margin,
                    'target_margin'  => $p->target_margin_percent,
                    'is_active'      => $p->is_active,
                    'materials_count' => $p->materials->count(),
                ];
            });

        $materials = Material::where('user_id', auth()->id())->get(['id', 'name', 'unit', 'price_per_unit']);

        return Inertia::render('Admin/Hpp/Products/Index', [
            'products'  => $products,
            'materials' => $materials,
        ]);
    }

    public function create()
    {
        $materials = Material::where('user_id', auth()->id())->get(['id', 'name', 'unit', 'price_per_unit']);
        
        $totalOverhead = OverheadCost::where('user_id', auth()->id())->sum('monthly_amount');
        $otherMonthlyUnits = Product::where('user_id', auth()->id())
            ->where('type', '!=', 'trading')
            ->sum('monthly_units');

        return Inertia::render('Admin/Hpp/Products/Create', [
            'materials'           => $materials,
            'total_overhead'      => (float) $totalOverhead,
            'other_monthly_units' => (float) $otherMonthlyUnits,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'                  => 'required|string|max:200',
            'type'                  => 'required|in:manufacturing,trading,service',
            'description'           => 'nullable|string',
            'unit'                  => 'required|string|max:50',
            'labor_hours_per_unit'  => 'nullable|numeric|min:0',
            'labor_rate_per_hour'   => 'nullable|numeric|min:0',
            'purchase_price'        => 'nullable|numeric|min:0',
            'other_purchase_cost'   => 'nullable|numeric|min:0',
            'target_margin_percent' => 'required|numeric|min:0|max:999',
            'monthly_units'         => 'nullable|numeric|min:0.01',
            'materials'             => 'nullable|array',
            'materials.*.id'        => 'exists:materials,id',
            'materials.*.quantity'  => 'required|numeric|min:0.0001',
        ]);

        $product = Product::create([
            'user_id'               => auth()->id(),
            'name'                  => $validated['name'],
            'type'                  => $validated['type'],
            'description'           => $validated['description'] ?? null,
            'unit'                  => $validated['unit'],
            'labor_hours_per_unit'  => $validated['labor_hours_per_unit'] ?? 0,
            'labor_rate_per_hour'   => $validated['labor_rate_per_hour'] ?? 0,
            'purchase_price'        => $validated['purchase_price'] ?? 0,
            'other_purchase_cost'   => $validated['other_purchase_cost'] ?? 0,
            'target_margin_percent' => $validated['target_margin_percent'],
            'monthly_units'         => $validated['monthly_units'] ?? 1,
        ]);

        // Attach bahan baku (resep)
        if (!empty($validated['materials'])) {
            $syncData = [];
            foreach ($validated['materials'] as $mat) {
                $syncData[$mat['id']] = ['quantity' => $mat['quantity']];
            }
            $product->materials()->sync($syncData);
        }

        // Kalkulasi HPP
        $product->load('materials');
        $hpp          = $product->calculateHpp();
        $sellingPrice = $product->calculateSellingPrice($hpp);
        $product->update(['hpp' => $hpp, 'selling_price' => $sellingPrice]);

        return redirect()->route('admin.hpp.products.index')
            ->with('success', "Produk \"{$product->name}\" berhasil ditambahkan! HPP: Rp " . number_format($hpp, 0, ',', '.'));
    }

    public function edit(Product $product)
    {
        $this->authorizeProduct($product);

        $product->load('materials');
        $materials = Material::where('user_id', auth()->id())->get(['id', 'name', 'unit', 'price_per_unit']);

        $totalOverhead = OverheadCost::where('user_id', auth()->id())->sum('monthly_amount');
        $otherMonthlyUnits = Product::where('user_id', auth()->id())
            ->where('type', '!=', 'trading')
            ->where('id', '!=', $product->id)
            ->sum('monthly_units');

        $productData = [
            'id'                    => $product->id,
            'name'                  => $product->name,
            'type'                  => $product->type,
            'description'           => $product->description,
            'unit'                  => $product->unit,
            'labor_hours_per_unit'  => $product->labor_hours_per_unit,
            'labor_rate_per_hour'   => $product->labor_rate_per_hour,
            'purchase_price'        => $product->purchase_price,
            'other_purchase_cost'   => $product->other_purchase_cost,
            'target_margin_percent' => $product->target_margin_percent,
            'monthly_units'         => $product->monthly_units,
            'hpp'                   => $product->hpp,
            'selling_price'         => $product->selling_price,
            'materials'             => $product->materials->map(fn($m) => [
                'id'         => $m->id,
                'name'       => $m->name,
                'unit'       => $m->unit,
                'price_per_unit' => $m->price_per_unit,
                'quantity'   => $m->pivot->quantity,
            ]),
        ];

        return Inertia::render('Admin/Hpp/Products/Edit', [
            'product'             => $productData,
            'materials'           => $materials,
            'total_overhead'      => (float) $totalOverhead,
            'other_monthly_units' => (float) $otherMonthlyUnits,
        ]);
    }

    public function update(Request $request, Product $product)
    {
        $this->authorizeProduct($product);

        $validated = $request->validate([
            'name'                  => 'required|string|max:200',
            'description'           => 'nullable|string',
            'unit'                  => 'required|string|max:50',
            'labor_hours_per_unit'  => 'nullable|numeric|min:0',
            'labor_rate_per_hour'   => 'nullable|numeric|min:0',
            'purchase_price'        => 'nullable|numeric|min:0',
            'other_purchase_cost'   => 'nullable|numeric|min:0',
            'target_margin_percent' => 'required|numeric|min:0|max:999',
            'monthly_units'         => 'nullable|numeric|min:0.01',
            'materials'             => 'nullable|array',
            'materials.*.id'        => 'exists:materials,id',
            'materials.*.quantity'  => 'required|numeric|min:0.0001',
        ]);

        $product->update([
            'name'                  => $validated['name'],
            'description'           => $validated['description'] ?? null,
            'unit'                  => $validated['unit'],
            'labor_hours_per_unit'  => $validated['labor_hours_per_unit'] ?? 0,
            'labor_rate_per_hour'   => $validated['labor_rate_per_hour'] ?? 0,
            'purchase_price'        => $validated['purchase_price'] ?? 0,
            'other_purchase_cost'   => $validated['other_purchase_cost'] ?? 0,
            'target_margin_percent' => $validated['target_margin_percent'],
            'monthly_units'         => $validated['monthly_units'] ?? 1,
        ]);

        if (isset($validated['materials'])) {
            $syncData = [];
            foreach ($validated['materials'] as $mat) {
                $syncData[$mat['id']] = ['quantity' => $mat['quantity']];
            }
            $product->materials()->sync($syncData);
        }

        // Recalculate HPP
        $product->load('materials');
        $hpp          = $product->calculateHpp();
        $sellingPrice = $product->calculateSellingPrice($hpp);
        $product->update(['hpp' => $hpp, 'selling_price' => $sellingPrice]);

        return redirect()->route('admin.hpp.products.index')
            ->with('success', "Produk \"{$product->name}\" berhasil diperbarui! HPP: Rp " . number_format($hpp, 0, ',', '.'));
    }

    public function destroy(Product $product)
    {
        $this->authorizeProduct($product);
        $name = $product->name;
        $product->delete();
        return redirect()->route('admin.hpp.products.index')->with('success', "Produk \"{$name}\" berhasil dihapus.");
    }

    /**
     * API: Simulasi HPP dari form tanpa menyimpan.
     */
    public function simulate(Request $request)
    {
        $validated = $request->validate([
            'type'                  => 'required|in:manufacturing,trading,service',
            'labor_hours_per_unit'  => 'nullable|numeric|min:0',
            'labor_rate_per_hour'   => 'nullable|numeric|min:0',
            'purchase_price'        => 'nullable|numeric|min:0',
            'other_purchase_cost'   => 'nullable|numeric|min:0',
            'target_margin_percent' => 'required|numeric|min:0',
            'monthly_units'         => 'nullable|numeric|min:0.01',
            'materials'             => 'nullable|array',
            'materials.*.material_id' => 'exists:materials,id',
            'materials.*.quantity'  => 'required|numeric|min:0',
        ]);

        $hpp = 0;
        $breakdown = [];

        if ($validated['type'] === 'trading') {
            $purchaseCost = $validated['purchase_price'] ?? 0;
            $otherCost    = $validated['other_purchase_cost'] ?? 0;
            $hpp          = $purchaseCost + $otherCost;
            $breakdown    = [
                ['label' => 'Harga Beli',      'amount' => $purchaseCost],
                ['label' => 'Biaya Lain-lain', 'amount' => $otherCost],
            ];
        } else {
            // Biaya bahan baku
            $materialCost = 0;
            $materialBreakdown = [];
            if (!empty($validated['materials'])) {
                foreach ($validated['materials'] as $item) {
                    $mat = Material::find($item['material_id']);
                    if ($mat) {
                        $cost = $mat->price_per_unit * $item['quantity'];
                        $materialCost += $cost;
                        $materialBreakdown[] = [
                            'label'  => $mat->name . " ({$item['quantity']} {$mat->unit})",
                            'amount' => $cost,
                        ];
                    }
                }
            }

            // Biaya TK
            $laborCost = ($validated['labor_hours_per_unit'] ?? 0) * ($validated['labor_rate_per_hour'] ?? 0);

            // Biaya Overhead alokasi
            $totalOverhead     = OverheadCost::where('user_id', auth()->id())->sum('monthly_amount');
            $totalMonthlyUnits = Product::where('user_id', auth()->id())
                ->where('type', '!=', 'trading')
                ->sum('monthly_units');
            $monthlyUnits = max(1, $validated['monthly_units'] ?? 1);
            $totalMonthlyUnits = max($totalMonthlyUnits, $monthlyUnits);
            $overheadPerUnit = $totalMonthlyUnits > 0 ? ($totalOverhead / $totalMonthlyUnits) : 0;

            $hpp = $materialCost + $laborCost + $overheadPerUnit;

            $breakdown = array_merge($materialBreakdown, [
                ['label' => 'Biaya Tenaga Kerja',  'amount' => $laborCost],
                ['label' => 'Alokasi Overhead',    'amount' => $overheadPerUnit],
            ]);
        }

        $margin       = $validated['target_margin_percent'];
        $sellingPrice = $hpp * (1 + ($margin / 100));

        return response()->json([
            'hpp'           => round($hpp, 2),
            'selling_price' => round($sellingPrice, 2),
            'profit_per_unit' => round($sellingPrice - $hpp, 2),
            'breakdown'     => $breakdown,
        ]);
    }

    private function authorizeProduct(Product $product): void
    {
        abort_if($product->user_id !== auth()->id(), 403);
    }
}
