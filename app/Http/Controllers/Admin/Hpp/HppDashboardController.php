<?php

namespace App\Http\Controllers\Admin\Hpp;

use App\Http\Controllers\Controller;
use App\Models\OverheadCost;
use App\Models\Product;
use Inertia\Inertia;

class HppDashboardController extends Controller
{
    public function index()
    {
        $user = auth()->user();

        $products = Product::where('user_id', $user->id)
            ->with('materials')
            ->where('is_active', true)
            ->latest()
            ->get()
            ->map(function ($p) {
                return [
                    'id'            => $p->id,
                    'name'          => $p->name,
                    'type'          => $p->type,
                    'type_label'    => $p->type_label,
                    'hpp'           => $p->hpp,
                    'selling_price' => $p->selling_price,
                    'margin'        => $p->actual_margin,
                    'unit'          => $p->unit,
                ];
            });

        $totalOverhead   = OverheadCost::where('user_id', $user->id)->sum('monthly_amount');
        $totalProducts   = $products->count();
        $avgMargin       = $products->avg('margin') ?? 0;
        $bestProduct     = $products->sortByDesc('margin')->first();
        $worstProduct    = $products->where('hpp', '>', 0)->sortBy('margin')->first();

        return Inertia::render('Admin/Hpp/Dashboard', [
            'products'     => $products->values(),
            'business'     => $user->business,
            'stats' => [
                'total_products'  => $totalProducts,
                'total_overhead'  => $totalOverhead,
                'avg_margin'      => round($avgMargin, 2),
                'best_product'    => $bestProduct,
                'worst_product'   => $worstProduct,
            ],
        ]);
    }
}
