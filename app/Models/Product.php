<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Product extends Model
{
    protected $fillable = [
        'user_id', 'name', 'type', 'description', 'unit',
        'labor_hours_per_unit', 'labor_rate_per_hour',
        'purchase_price', 'other_purchase_cost',
        'target_margin_percent', 'hpp', 'selling_price',
        'monthly_units', 'is_active',
    ];

    protected $casts = [
        'labor_hours_per_unit'  => 'float',
        'labor_rate_per_hour'   => 'float',
        'purchase_price'        => 'float',
        'other_purchase_cost'   => 'float',
        'target_margin_percent' => 'float',
        'hpp'                   => 'float',
        'selling_price'         => 'float',
        'monthly_units'         => 'float',
        'is_active'             => 'boolean',
    ];

    // Type constants
    const TYPE_MANUFACTURING = 'manufacturing';
    const TYPE_TRADING       = 'trading';
    const TYPE_SERVICE       = 'service';

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Bahan baku yang digunakan (resep/formula produk).
     */
    public function materials(): BelongsToMany
    {
        return $this->belongsToMany(Material::class, 'product_materials')
            ->withPivot('quantity')
            ->withTimestamps();
    }

    /**
     * Kalkulasi HPP secara otomatis berdasarkan tipe produk.
     */
    public function calculateHpp(): float
    {
        $hpp = 0;

        if ($this->type === self::TYPE_TRADING) {
            // Dagang: Harga Beli + Biaya Lain
            $hpp = $this->purchase_price + $this->other_purchase_cost;
        } else {
            // Manufaktur / Jasa: Bahan Baku + Tenaga Kerja + Overhead

            // 1. Biaya Bahan Baku (dari resep)
            $materialCost = 0;
            foreach ($this->materials as $material) {
                $materialCost += $material->price_per_unit * $material->pivot->quantity;
            }

            // 2. Biaya Tenaga Kerja
            $laborCost = $this->labor_hours_per_unit * $this->labor_rate_per_hour;

            // 3. Alokasi Overhead per unit
            $totalOverhead = OverheadCost::where('user_id', $this->user_id)->sum('monthly_amount');
            $totalMonthlyUnits = Product::where('user_id', $this->user_id)
                ->where('type', '!=', self::TYPE_TRADING)
                ->sum('monthly_units');
            $overheadPerUnit = $totalMonthlyUnits > 0
                ? ($totalOverhead / $totalMonthlyUnits)
                : 0;

            $hpp = $materialCost + $laborCost + $overheadPerUnit;
        }

        return round($hpp, 2);
    }

    /**
     * Harga jual berdasarkan HPP + margin target.
     */
    public function calculateSellingPrice(float $hpp): float
    {
        return round($hpp * (1 + ($this->target_margin_percent / 100)), 2);
    }

    /**
     * Label tipe yang ramah pengguna.
     */
    public function getTypeLabelAttribute(): string
    {
        return match ($this->type) {
            self::TYPE_MANUFACTURING => 'Produksi Sendiri',
            self::TYPE_TRADING       => 'Beli & Jual',
            self::TYPE_SERVICE       => 'Jasa / Layanan',
            default                  => $this->type,
        };
    }

    /**
     * Margin aktual: (selling_price - hpp) / hpp * 100
     */
    public function getActualMarginAttribute(): float
    {
        if ($this->hpp <= 0) return 0;
        return round((($this->selling_price - $this->hpp) / $this->hpp) * 100, 2);
    }
}
