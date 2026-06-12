<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PushSubscription extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['public_key', 'auth_token'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
