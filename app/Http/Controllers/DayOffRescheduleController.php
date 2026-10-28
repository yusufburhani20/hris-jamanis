<?php

namespace App\Http\Controllers;

use App\Models\DayOffExchange;
use App\Models\DayOffReschedule;
use App\Models\Shift;
use App\Models\UserShift;
use App\Traits\ResolvesWorkShift;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class DayOffRescheduleController extends Controller
{
    use ResolvesWorkShift;

    /**
     * Store a newly created day off reschedule request.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'original_date' => 'required|date_format:Y-m-d|after_or_equal:today',
            'target_date'   => 'required|date_format:Y-m-d|after_or_equal:today|different:original_date',
            'reason'        => 'required|string|max:500',
        ], [
            'original_date.required' => 'Tanggal libur asal wajib dipilih.',
            'original_date.after_or_equal' => 'Tanggal libur asal tidak boleh tanggal yang sudah lewat.',
            'target_date.required' => 'Tanggal libur baru wajib dipilih.',
            'target_date.after_or_equal' => 'Tanggal libur baru tidak boleh tanggal yang sudah lewat.',
            'target_date.different' => 'Tanggal libur baru harus berbeda dengan tanggal asal.',
            'reason.required' => 'Alasan pindah libur wajib diisi.',
            'reason.max' => 'Alasan pindah libur maksimal 500 karakter.',
        ]);

        $origCarbon = Carbon::parse($request->original_date);
        $tarCarbon  = Carbon::parse($request->target_date);

        // 1. Validasi: original_date harus merupakan hari libur aktif karyawan
        $origShift = $user->activeShift($request->original_date);
        if (!$origShift || !$origShift->is_dayoff) {
            return back()->withErrors([
                'original_date' => 'Anda tidak memiliki jadwal libur aktif pada tanggal ' . $origCarbon->locale('id')->isoFormat('D MMMM Y') . '.'
            ]);
        }

        // 2. Validasi: target_date harus merupakan hari kerja (bukan hari yang sudah libur)
        $tarShift = $user->activeShift($request->target_date);
        if ($tarShift && $tarShift->is_dayoff) {
            return back()->withErrors([
                'target_date' => 'Tanggal ' . $tarCarbon->locale('id')->isoFormat('D MMMM Y') . ' sudah merupakan hari libur Anda.'
            ]);
        }

        // 3. Validasi: Tanggal asal dan tanggal tujuan WAJIB dalam periode cut-off yang sama (25 s.d. 24)
        list($origStart, $origEnd) = $this->getCutoffPeriodForDate($origCarbon);
        list($tarStart, $tarEnd)   = $this->getCutoffPeriodForDate($tarCarbon);

        if ($origStart !== $tarStart || $origEnd !== $tarEnd) {
            $periodFormatted = Carbon::parse($origStart)->locale('id')->isoFormat('D MMM Y') . ' s.d ' . Carbon::parse($origEnd)->locale('id')->isoFormat('D MMM Y');
            return back()->withErrors([
                'target_date' => "Tanggal libur baru harus berada dalam periode cut-off yang sama ({$periodFormatted}) agar kuota libur bulanan tetap seimbang."
            ]);
        }

        // 4. Validasi: Cek apakah tanggal sedang dalam proses pengajuan pending lain
        $isPendingReschedule = DayOffReschedule::where('user_id', $user->id)
            ->where('status', 'pending')
            ->where(function ($q) use ($request) {
                $q->where('original_date', $request->original_date)
                  ->orWhere('target_date', $request->target_date)
                  ->orWhere('original_date', $request->target_date)
                  ->orWhere('target_date', $request->original_date);
            })->exists();

        if ($isPendingReschedule) {
            return back()->withErrors([
                'original_date' => 'Salah satu tanggal yang Anda pilih sedang dalam pengajuan pindah libur yang masih menunggu persetujuan.'
            ]);
        }

        $isPendingExchange = DayOffExchange::where('status', 'pending')
            ->where(function ($q) use ($user, $request) {
                $q->where(function ($sub) use ($user, $request) {
                    $sub->where('requester_id', $user->id)
                        ->whereIn('requester_date', [$request->original_date, $request->target_date]);
                })->orWhere(function ($sub) use ($user, $request) {
                    $sub->where('target_user_id', $user->id)
                        ->whereIn('target_date', [$request->original_date, $request->target_date]);
                });
            })->exists();

        if ($isPendingExchange) {
            return back()->withErrors([
                'original_date' => 'Salah satu tanggal yang Anda pilih sedang dalam proses tukar libur rekan yang masih menunggu persetujuan.'
            ]);
        }

        // Simpan pengajuan
        $reschedule = DayOffReschedule::create([
            'user_id' => $user->id,
            'original_date' => $request->original_date,
            'target_date' => $request->target_date,
            'reason' => $request->reason,
            'status' => 'pending',
        ]);

        // Kirim Push Notification ke Admin
        if (\App\Models\Setting::get('notif_shift_exchange_enabled', '1') === '1') {
            try {
                $origFormatted = $origCarbon->locale('id')->isoFormat('D MMM');
                $tarFormatted  = $tarCarbon->locale('id')->isoFormat('D MMM');
                app(\App\Services\WebPushService::class)->sendToAdmins(
                    '📅 Pengajuan Pindah Libur Mandiri',
                    "Pengajuan pindah libur dari {$user->name} ({$origFormatted} ➡️ {$tarFormatted}).",
                    ['url' => '/day-off-exchanges']
                );
            } catch (\Exception $e) {
                Log::warning("Push notif admin pindah libur error: " . $e->getMessage());
            }
        }

        return redirect()->back()->with('success', 'Pengajuan pindah libur mandiri berhasil dikirim dan menunggu persetujuan admin.');
    }

    /**
     * Approve the day off reschedule request (Admin only).
     */
    public function approve(Request $request, DayOffReschedule $dayOffReschedule)
    {
        if (!$request->user()->isAdmin()) {
            abort(403, 'Akses ditolak.');
        }

        if ($dayOffReschedule->status !== 'pending') {
            return redirect()->back()->with('error', 'Pengajuan ini sudah pernah diproses sebelumnya.');
        }

        $dayOffShift = Shift::where('is_dayoff', true)->first();
        if (!$dayOffShift) {
            return redirect()->back()->with('error', 'Shift bertipe Libur belum tersedia dalam sistem.');
        }

        $user = $dayOffReschedule->user;
        $origDate = $dayOffReschedule->original_date->toDateString();
        $tarDate  = $dayOffReschedule->target_date->toDateString();

        // 1. Pada original_date: Karyawan BATAL libur -> Masuk kerja sesuai shift regulernya
        $regularWorkShift = $this->resolveWorkShiftForUser($user, $origDate);

        UserShift::where('user_id', $user->id)
            ->where('start_date', $origDate)
            ->where('end_date', $origDate)
            ->delete();

        UserShift::create([
            'user_id'    => $user->id,
            'shift_id'   => $regularWorkShift->id,
            'start_date' => $origDate,
            'end_date'   => $origDate,
        ]);

        // 2. Pada target_date: Karyawan MENJADI libur -> Ditugaskan Shift Libur
        UserShift::where('user_id', $user->id)
            ->where('start_date', $tarDate)
            ->where('end_date', $tarDate)
            ->delete();

        UserShift::create([
            'user_id'    => $user->id,
            'shift_id'   => $dayOffShift->id,
            'start_date' => $tarDate,
            'end_date'   => $tarDate,
        ]);

        // Update status pengajuan
        $dayOffReschedule->update([
            'status' => 'approved',
            'approved_by' => Auth::id(),
            'approved_at' => now(),
        ]);

        // Push notifikasi ke karyawan
        try {
            $webPush = app(\App\Services\WebPushService::class);
            $tarFormatted = $dayOffReschedule->target_date->locale('id')->isoFormat('dddd, D MMMM Y');
            $origFormatted = $dayOffReschedule->original_date->locale('id')->isoFormat('D MMM');
            $webPush->sendToUser(
                $user->id,
                '✅ Pindah Libur Disetujui',
                "Pengajuan pindah libur Anda (dari {$origFormatted} ke {$tarFormatted}) telah disetujui admin.",
                ['url' => '/day-off-exchanges']
            );
        } catch (\Exception $e) {
            Log::warning("Notif pindah libur approve error: " . $e->getMessage());
        }

        return redirect()->back()->with('success', 'Pengajuan pindah libur berhasil disetujui. Jadwal karyawan otomatis disesuaikan.');
    }

    /**
     * Reject the day off reschedule request (Admin only).
     */
    public function reject(Request $request, DayOffReschedule $dayOffReschedule)
    {
        if (!$request->user()->isAdmin()) {
            abort(403, 'Akses ditolak.');
        }

        if ($dayOffReschedule->status !== 'pending') {
            return redirect()->back()->with('error', 'Pengajuan ini sudah pernah diproses sebelumnya.');
        }

        $request->validate([
            'rejection_reason' => 'nullable|string|max:500',
        ]);

        $dayOffReschedule->update([
            'status' => 'rejected',
            'approved_by' => Auth::id(),
            'approved_at' => now(),
            'rejection_reason' => $request->rejection_reason ?? 'Ditolak oleh admin',
        ]);

        // Push notifikasi penolakan ke karyawan
        try {
            $webPush = app(\App\Services\WebPushService::class);
            $tarFormatted = $dayOffReschedule->target_date->locale('id')->isoFormat('D MMMM Y');
            $reasonNote = $request->rejection_reason ? " Alasan: {$request->rejection_reason}" : '';
            $webPush->sendToUser(
                $dayOffReschedule->user_id,
                '❌ Pindah Libur Ditolak',
                "Pengajuan pindah libur Anda ke tanggal {$tarFormatted} tidak disetujui admin.{$reasonNote}",
                ['url' => '/day-off-exchanges']
            );
        } catch (\Exception $e) {
            Log::warning("Notif pindah libur reject error: " . $e->getMessage());
        }

        return redirect()->back()->with('success', 'Pengajuan pindah libur berhasil ditolak.');
    }

    /**
     * Cancel / Delete a pending day off reschedule.
     */
    public function destroy(Request $request, DayOffReschedule $dayOffReschedule)
    {
        $user = $request->user();

        if (!$user->isAdmin() && $dayOffReschedule->user_id !== $user->id) {
            abort(403, 'Akses ditolak.');
        }

        if ($dayOffReschedule->status !== 'pending') {
            return redirect()->back()->with('error', 'Hanya pengajuan berstatus pending yang dapat dibatalkan.');
        }

        $dayOffReschedule->delete();

        return redirect()->back()->with('success', 'Pengajuan pindah libur berhasil dibatalkan.');
    }

    /**
     * Helper to resolve cut-off period date range (25 to 24).
     */
    private function getCutoffPeriodForDate(\Carbon\CarbonInterface $date): array
    {
        if ($date->day >= 25) {
            $start = $date->copy()->day(25)->startOfDay();
            $end   = $date->copy()->addMonthNoOverflow()->day(24)->endOfDay();
        } else {
            $start = $date->copy()->subMonthNoOverflow()->day(25)->startOfDay();
            $end   = $date->copy()->day(24)->endOfDay();
        }

        return [$start->toDateString(), $end->toDateString()];
    }
}
