<?php

namespace App\Http\Controllers\Admin\Hpp;

use App\Http\Controllers\Controller;
use App\Models\Business;
use Illuminate\Http\Request;

class HppBusinessController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'                        => 'required|string|max:200',
            'industry'                    => 'nullable|string|max:100',
            'phone'                       => 'nullable|string|max:20',
            'address'                     => 'nullable|string',
            'monthly_production_capacity' => 'nullable|numeric|min:0',
        ]);

        Business::updateOrCreate(
            ['user_id' => auth()->id()],
            [
                'name'                        => $validated['name'],
                'industry'                    => $validated['industry'] ?? null,
                'phone'                       => $validated['phone'] ?? null,
                'address'                     => $validated['address'] ?? null,
                'monthly_production_capacity' => $validated['monthly_production_capacity'] ?? 0,
            ]
        );

        return redirect()->back()->with('success', 'Profil bisnis Anda berhasil diperbarui!');
    }
}
