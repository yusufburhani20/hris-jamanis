<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OverheadCost extends Model
{
    protected $fillable = [
        'user_id', 'name', 'monthly_amount', 'notes',
    ];

    protected $casts = [
        'monthly_amount' => 'float',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
