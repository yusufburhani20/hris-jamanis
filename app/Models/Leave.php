<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Services\WebPushService;
use Illuminate\Support\Facades\Log;

class Leave extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'start_date'  => 'date',
        'end_date'    => 'date',
        'approved_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    protected static function booted(): void
    {
        // Notify admins when a new leave request is submitted
        static::created(function (Leave $leave) {
            try {
                $employee = $leave->user;
                $name = $employee?->name ?? 'Karyawan';
                $type = $leave->type ?? 'Izin';
                $startDate = $leave->start_date?->format('d/m/Y') ?? '-';

                app(WebPushService::class)->sendToAdmins(
                    "📝 Pengajuan {$type} Baru",
                    "{$name} mengajukan {$type} mulai {$startDate}. Mohon segera ditinjau.",
                    ['url' => '/admin/attendances']
                );
            } catch (\Exception $e) {
                Log::warning('Push notif (leave created) failed: ' . $e->getMessage());
            }
        });

        // Notify employee when their leave status is updated
        static::updated(function (Leave $leave) {
            if ($leave->isDirty('status') && in_array($leave->status, ['approved', 'rejected'])) {
                try {
                    $status = $leave->status === 'approved' ? '✅ Disetujui' : '❌ Ditolak';
                    $type   = $leave->type ?? 'Izin';

                    app(WebPushService::class)->sendToUser(
                        $leave->user_id,
                        "Status {$type} Anda Diperbarui",
                        "Pengajuan {$type} Anda telah {$status}.",
                        ['url' => '/leaves']
                    );
                } catch (\Exception $e) {
                    Log::warning('Push notif (leave updated) failed: ' . $e->getMessage());
                }
            }
        });
    }
}
