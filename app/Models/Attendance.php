<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
use App\Enums\AttendanceStatus;
use App\Enums\VerificationStatus;

class Attendance extends Model
{
    protected $guarded = ['id'];
    protected $casts = [
        'date' => 'date:Y-m-d',
        'status' => AttendanceStatus::class,
        'verification_status' => VerificationStatus::class,
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'is_mocked' => 'boolean',
    ];
    
    protected $appends = ['photo_url', 'checkout_photo_url'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
    
    public function getPhotoUrlAttribute()
    {
        return $this->photo_path ? Storage::url($this->photo_path) : null;
    }

    public function getCheckoutPhotoUrlAttribute()
    {
        return $this->checkout_photo_path ? Storage::url($this->checkout_photo_path) : null;
    }
}
