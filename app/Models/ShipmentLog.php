<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ShipmentLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'shipment_id',
        'status',
        'title',
        'description',
        'latitude',
        'longitude',
    ];

    /**
     * Relationship to Shipment model.
     */
    public function shipment()
    {
        return $this->belongsTo(Shipment::class);
    }
}
