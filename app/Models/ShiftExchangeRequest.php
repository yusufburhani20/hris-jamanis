<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ShiftExchangeRequest extends Model
{
    use HasFactory;

    protected $table = 'shift_exchange_requests';
    protected $guarded = ['id'];

    protected $casts = [
        'target_date' => 'date',
        'approved_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function targetUser()
    {
        return $this->belongsTo(User::class, 'target_user_id');
    }

    public function fromShift()
    {
        return $this->belongsTo(Shift::class, 'from_shift_id');
    }

    public function toShift()
    {
        return $this->belongsTo(Shift::class, 'to_shift_id');
    }

    public function targetUserFromShift()
    {
        return $this->belongsTo(Shift::class, 'target_user_from_shift_id');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
