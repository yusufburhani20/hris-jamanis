<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Business extends Model
{
    protected $fillable = [
        'user_id', 'name', 'industry', 'description',
        'phone', 'address', 'monthly_production_capacity',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
