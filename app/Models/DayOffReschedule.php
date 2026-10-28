<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DayOffReschedule extends Model
{
    use HasFactory;

    protected $table = 'day_off_reschedules';
    protected $guarded = ['id'];

    protected $casts = [
        'original_date' => 'date',
        'target_date' => 'date',
        'approved_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
