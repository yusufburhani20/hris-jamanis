<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Services\WebPushService;
use Illuminate\Support\Facades\Log;

class OvertimeRequest extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'date'        => 'date',
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
        // Notify admins when a new overtime request is submitted
        static::created(function (OvertimeRequest $overtime) {
            try {
                $employee = $overtime->user;
                $name     = $employee?->name ?? 'Karyawan';
                $date     = $overtime->date?->format('d/m/Y') ?? '-';
                $duration = $overtime->duration_hours ?? '';

                app(WebPushService::class)->sendToAdmins(
                    '⏰ Pengajuan Lembur Baru',
                    "{$name} mengajukan lembur pada {$date}" . ($duration ? " ({$duration} jam)" : '') . ". Mohon segera ditinjau.",
                    ['url' => '/admin/attendances']
                );
            } catch (\Exception $e) {
                Log::warning('Push notif (overtime created) failed: ' . $e->getMessage());
            }
        });

        // Notify employee when their overtime status is updated
        static::updated(function (OvertimeRequest $overtime) {
            if ($overtime->isDirty('status') && in_array($overtime->status, ['approved', 'rejected'])) {
                try {
                    $status = $overtime->status === 'approved' ? '✅ Disetujui' : '❌ Ditolak';
                    $date   = $overtime->date?->format('d/m/Y') ?? '-';

                    app(WebPushService::class)->sendToUser(
                        $overtime->user_id,
                        'Status Lembur Anda Diperbarui',
                        "Pengajuan lembur tanggal {$date} telah {$status}.",
                        ['url' => '/overtimes']
                    );
                } catch (\Exception $e) {
                    Log::warning('Push notif (overtime updated) failed: ' . $e->getMessage());
                }
            }
        });
    }
}
