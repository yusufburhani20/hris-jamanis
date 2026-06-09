<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Shipment extends Model
{
    use HasFactory;

    protected $fillable = [
        'tracking_number',
        'title',
        'origin_name',
        'destination_name',
        'origin_lat',
        'origin_lng',
        'destination_lat',
        'destination_lng',
        'courier_id',
        'courier_name',
        'courier_lat',
        'courier_lng',
        'status',
        'notes',
        'delivery_photo',
        'is_self_initiated',
    ];

    protected $casts = [
        'is_self_initiated' => 'boolean',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        // Auto-generate sequential KIR-style tracking number on creation
        static::creating(function ($shipment) {
            if (empty($shipment->tracking_number)) {
                $datePrefix = date('Ymd');
                $prefix = "KIR-{$datePrefix}-";

                // Find the latest shipment created today starting with this prefix
                $latestShipment = self::where('tracking_number', 'like', "{$prefix}%")
                    ->orderBy('tracking_number', 'desc')
                    ->first();

                if ($latestShipment) {
                    $parts = explode('-', $latestShipment->tracking_number);
                    $lastSeq = intval(end($parts));
                    $nextSeq = $lastSeq + 1;
                } else {
                    $nextSeq = 1;
                }

                $shipment->tracking_number = $prefix . str_pad($nextSeq, 3, '0', STR_PAD_LEFT);
            }
        });
    }

    /**
     * Relationship to courier (User model).
     */
    public function courier()
    {
        return $this->belongsTo(User::class, 'courier_id');
    }

    /**
     * Relationship to transit logs.
     */
    public function logs()
    {
        return $this->hasMany(ShipmentLog::class)->orderBy('id', 'asc');
    }
}
