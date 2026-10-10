<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Shift extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'is_dayoff' => 'boolean',
    ];

    public function users()
    {
        return $this->belongsToMany(User::class, 'user_shifts')
                    ->withPivot('start_date', 'end_date')
                    ->withTimestamps();
    }
}
