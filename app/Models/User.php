<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use App\Enums\UserStatus;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $guarded = ['id'];
    protected $hidden = ['password', 'remember_token'];
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'status' => UserStatus::class,
        'last_login_at' => 'datetime',
        'basic_salary' => 'decimal:2',
        'driver_is_sharing_location' => 'boolean',
        'driver_location_updated_at' => 'datetime',
    ];

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }

    public function sessions()
    {
        return $this->hasMany(Session::class);
    }

    public function leaves()
    {
        return $this->hasMany(Leave::class);
    }

    public function overtimeRequests()
    {
        return $this->hasMany(OvertimeRequest::class);
    }

    public function shifts()
    {
        return $this->belongsToMany(Shift::class, 'user_shifts')
                    ->withPivot('start_date', 'end_date')
                    ->withTimestamps();
    }

    public function activeShift()
    {
        return $this->shifts()
                    ->where('user_shifts.start_date', '<=', today())
                    ->where(function($q) {
                        $q->where('user_shifts.end_date', '>=', today())
                          ->orWhereNull('user_shifts.end_date');
                    })
                    ->latest('user_shifts.start_date')
                    ->first();
    }

    public function getRoles(): array
    {
        return array_map('trim', explode(',', $this->role ?? ''));
    }

    public function hasRole(string $role): bool
    {
        return in_array($role, $this->getRoles());
    }

    public function isAdmin(): bool
    {
        return $this->hasRole('admin');
    }

    public function payrolls()
    {
        return $this->hasMany(Payroll::class);
    }

    public function isEmployee(): bool
    {
        return $this->hasRole('employee');
    }

    public function isDriver(): bool
    {
        return $this->hasRole('driver');
    }

    public function business()
    {
        return $this->hasOne(Business::class);
    }

    public function materials()
    {
        return $this->hasMany(Material::class);
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function overheadCosts()
    {
        return $this->hasMany(OverheadCost::class);
    }
}

