<?php

namespace App\Http\Controllers;

use App\Models\DayOffExchange;
use App\Models\Shift;
use App\Models\User;
use App\Models\UserShift;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class DayOffExchangeController extends Controller
{
    /**
     * Display a listing of day off exchange requests.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            $exchanges = DayOffExchange::with([
                'requester:id,name,email,role',
                'targetUser:id,name,email',
                'approvedBy:id,name'
            ])->latest()->get();
        } else {
            $exchanges = DayOffExchange::where('requester_id', $user->id)
                ->orWhere('target_user_id', $user->id)
                ->with([
                    'requester:id,name,email,role',
                    'targetUser:id,name,email',
                    'approvedBy:id,name'
                ])->latest()->get();
        }

        // List colleagues for dropdown
        $employees = User::where('id', '!=', $user->id)
            ->where(function ($query) {
                $query->where('role', 'LIKE', '%employee%')
                      ->orWhere('role', 'LIKE', '%driver%');
            })->get(['id', 'name', 'email']);

        // List requester's upcoming scheduled day-offs
        $myDayOffs = $this->getUpcomingDayOffDates($user);

        return Inertia::render('DayOffExchanges/Index', [
            'exchanges' => $exchanges,
            'employees' => $employees,
            'myDayOffs' => $myDayOffs,
            'role' => $user->isAdmin() ? 'admin' : 'employee',
        ]);
    }

    /**
     * Helper to get upcoming scheduled day-offs for a user (next 60 days).
     */
    private function getUpcomingDayOffDates(User $user): array
    {
        $today = today();
        $limitDate = today()->addDays(60);

        $dayOffs = UserShift::with('shift')
            ->where('user_id', $user->id)
            ->whereHas('shift', function ($q) {
                $q->where('is_dayoff', true);
            })
            ->where('start_date', '<=', $limitDate->toDateString())
            ->where(function ($q) use ($today) {
                $q->whereNull('end_date')
                  ->orWhere('end_date', '>=', $today->toDateString());
            })
            ->orderBy('start_date')
            ->get();

        $dates = [];

        foreach ($dayOffs as $us) {
            $usStart = \Carbon\Carbon::parse($us->start_date)->max($today);
            $usEnd   = $us->end_date ? \Carbon\Carbon::parse($us->end_date)->min($limitDate) : $usStart->copy();

            for ($d = $usStart->copy(); $d->lte($usEnd); $d->addDay()) {
                $dateStr = $d->toDateString();
                if (!isset($dates[$dateStr])) {
                    $dates[$dateStr] = [
                        'date' => $dateStr,
                        'formatted' => $d->locale('id')->isoFormat('dddd, D MMMM Y'),
                        'short_formatted' => $d->locale('id')->isoFormat('D MMM Y'),
                        'shift_name' => $us->shift->name ?? 'Libur',
                    ];
                }
            }
        }

        ksort($dates);

        return array_values($dates);
    }

    /**
     * Fetch scheduled days off for a specific colleague (AJAX / Inertia helper).
     */
    public function getColleagueDayOffs(User $user)
    {
        return response()->json($this->getUpcomingDayOffDates($user));
    }

    /**
     * Store a newly created day off exchange request.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'target_user_id' => 'required|exists:users,id|different:' . $user->id,
            'requester_date' => 'required|date|after_or_equal:today',
            'target_date' => 'required|date|after_or_equal:today|different:requester_date',
            'reason' => 'required|string|max:500',
        ], [
            'target_user_id.different' => 'Anda tidak dapat memilih diri sendiri sebagai rekan pertukaran.',
            'target_date.different' => 'Tanggal libur rekan harus berbeda dengan tanggal libur Anda.',
        ]);

        // Cegah pengajuan ganda untuk tanggal yang sama yang masih pending
        $alreadyPendingRequester = DayOffExchange::where('status', 'pending')
            ->where(function ($q) use ($user, $request) {
                $q->where(function ($sub) use ($user, $request) {
                    $sub->where('requester_id', $user->id)
                        ->where('requester_date', $request->requester_date);
                })->orWhere(function ($sub) use ($user, $request) {
                    $sub->where('target_user_id', $user->id)
                        ->where('target_date', $request->requester_date);
                });
            })->exists();

        if ($alreadyPendingRequester) {
            return back()->withErrors(['requester_date' => 'Tanggal libur Anda ini sedang dalam proses pengajuan tukar libur lain yang masih menunggu persetujuan.']);
        }

        // Pastikan pemohon memang memiliki shift libur di requester_date
        $requesterShift = $user->activeShift($request->requester_date);
        if (!$requesterShift || !$requesterShift->is_dayoff) {
            return back()->withErrors(['requester_date' => 'Anda tidak memiliki jadwal libur pada tanggal ' . date('d/m/Y', strtotime($request->requester_date)) . '.']);
        }

        // Pastikan rekan memang memiliki shift libur di target_date
        $targetUser = User::findOrFail($request->target_user_id);

        $alreadyPendingTarget = DayOffExchange::where('status', 'pending')
            ->where(function ($q) use ($targetUser, $request) {
                $q->where(function ($sub) use ($targetUser, $request) {
                    $sub->where('requester_id', $targetUser->id)
                        ->where('requester_date', $request->target_date);
                })->orWhere(function ($sub) use ($targetUser, $request) {
                    $sub->where('target_user_id', $targetUser->id)
                        ->where('target_date', $request->target_date);
                });
            })->exists();

        if ($alreadyPendingTarget) {
            return back()->withErrors(['target_date' => 'Tanggal libur rekan ini sedang dalam proses pengajuan tukar libur lain yang masih menunggu persetujuan.']);
        }

        $targetShift = $targetUser->activeShift($request->target_date);
        if (!$targetShift || !$targetShift->is_dayoff) {
            return back()->withErrors(['target_date' => 'Rekan kerja terpilih tidak memiliki jadwal libur pada tanggal ' . date('d/m/Y', strtotime($request->target_date)) . '.']);
        }

        $exchange = DayOffExchange::create([
            'requester_id' => $user->id,
            'requester_date' => $request->requester_date,
            'target_user_id' => $targetUser->id,
            'target_date' => $request->target_date,
            'reason' => $request->reason,
            'status' => 'pending',
        ]);

        // Push notification ke Admin
        if (\App\Models\Setting::get('notif_shift_exchange_enabled', '1') === '1') {
            try {
                app(\App\Services\WebPushService::class)->sendToAdmins(
                    '🏖️ Pengajuan Tukar Libur',
                    "Pengajuan tukar libur baru dari {$user->name} dengan {$targetUser->name}.",
                    ['url' => '/admin/day-off-exchanges']
                );
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning("Push notif admin tukar libur error: " . $e->getMessage());
            }
        }

        return redirect()->route('day-off-exchanges.index')->with('success', 'Pengajuan tukar libur berhasil dikirim dan menunggu persetujuan admin.');
    }

    /**
     * Helper to resolve the most appropriate work shift for a user on a given date.
     * Prioritizes:
     * 1. The user's underlying base work shift covering that date.
     * 2. The colleague's active work shift on that date (if replacing their duty).
     * 3. The user's most recently assigned work shift.
     * 4. The system default work shift.
     */
    private function resolveWorkShiftForUser(User $user, string $date, ?User $colleague = null): Shift
    {
        // 1. Underlying base work shift (multi-day roster span) covering $date
        $baseUserShift = UserShift::with('shift')
            ->where('user_id', $user->id)
            ->where('start_date', '<=', $date)
            ->where(function ($q) use ($date) {
                $q->whereNull('end_date')->orWhere('end_date', '>=', $date);
            })
            ->where(function ($q) {
                // Ignore single-day override records to ensure we get the true base schedule
                $q->whereNull('end_date')->orWhereColumn('start_date', '!=', 'end_date');
            })
            ->whereHas('shift', function ($q) {
                $q->where('is_dayoff', false);
            })
            ->latest('id')
            ->first();

        if ($baseUserShift && $baseUserShift->shift) {
            return $baseUserShift->shift;
        }

        // 2. Colleague's active work shift on $date (if replacing colleague's post)
        if ($colleague) {
            $colleagueShift = $colleague->activeShift($date);
            if ($colleagueShift && !$colleagueShift->is_dayoff) {
                return $colleagueShift;
            }
        }

        // 3. User's most recently assigned multi-day work shift anywhere
        $recentShift = $user->shifts()
            ->where('is_dayoff', false)
            ->where(function ($q) {
                $q->whereNull('user_shifts.end_date')->orWhereColumn('user_shifts.start_date', '!=', 'user_shifts.end_date');
            })
            ->latest('user_shifts.id')
            ->first();

        if ($recentShift) {
            return $recentShift;
        }

        // 4. Default fallback
        return Shift::where('is_dayoff', false)->first() 
            ?? Shift::first();
    }

    /**
     * Approve the day off exchange request (Admin only).
     */
    public function approve(Request $request, DayOffExchange $dayOffExchange)
    {
        if (!$request->user()->isAdmin()) {
            abort(403, 'Akses ditolak.');
        }

        if ($dayOffExchange->status !== 'pending') {
            return redirect()->back()->with('error', 'Pengajuan ini sudah pernah diproses sebelumnya.');
        }

        $dayOffShift = Shift::where('is_dayoff', true)->first();

        if (!$dayOffShift) {
            return redirect()->back()->with('error', 'Shift bertipe Libur belum tersedia dalam sistem.');
        }

        $reqDate = $dayOffExchange->requester_date->toDateString();
        $tarDate = $dayOffExchange->target_date->toDateString();

        $requester = $dayOffExchange->requester;
        $targetUser = $dayOffExchange->targetUser;

        // Tentukan shift kerja yang sesuai untuk masing-masing karyawan (bukan asal Gudang 1)
        $workShiftForRequester = $this->resolveWorkShiftForUser($requester, $reqDate, $targetUser);
        $workShiftForTarget    = $this->resolveWorkShiftForUser($targetUser, $tarDate, $requester);

        // 1. Pada requester_date: Target User menjadi Libur, Requester masuk kerja (sesuai shift kerjanya)
        UserShift::where('user_id', $dayOffExchange->requester_id)
            ->where('start_date', $reqDate)
            ->where('end_date', $reqDate)
            ->delete();

        UserShift::create([
            'user_id' => $dayOffExchange->requester_id,
            'shift_id' => $workShiftForRequester->id,
            'start_date' => $reqDate,
            'end_date' => $reqDate,
        ]);

        UserShift::where('user_id', $dayOffExchange->target_user_id)
            ->where('start_date', $reqDate)
            ->where('end_date', $reqDate)
            ->delete();

        UserShift::create([
            'user_id' => $dayOffExchange->target_user_id,
            'shift_id' => $dayOffShift->id,
            'start_date' => $reqDate,
            'end_date' => $reqDate,
        ]);

        // 2. Pada target_date: Requester menjadi Libur, Target User masuk kerja (sesuai shift kerjanya)
        UserShift::where('user_id', $dayOffExchange->target_user_id)
            ->where('start_date', $tarDate)
            ->where('end_date', $tarDate)
            ->delete();

        UserShift::create([
            'user_id' => $dayOffExchange->target_user_id,
            'shift_id' => $workShiftForTarget->id,
            'start_date' => $tarDate,
            'end_date' => $tarDate,
        ]);

        UserShift::where('user_id', $dayOffExchange->requester_id)
            ->where('start_date', $tarDate)
            ->where('end_date', $tarDate)
            ->delete();

        UserShift::create([
            'user_id' => $dayOffExchange->requester_id,
            'shift_id' => $dayOffShift->id,
            'start_date' => $tarDate,
            'end_date' => $tarDate,
        ]);

        $dayOffExchange->update([
            'status' => 'approved',
            'approved_by' => Auth::id(),
            'approved_at' => now(),
        ]);

        // Push notifikasi ke kedua karyawan
        try {
            $webPush = app(\App\Services\WebPushService::class);
            $webPush->sendToUser(
                $dayOffExchange->requester_id,
                '✅ Tukar Libur Disetujui',
                "Pengajuan tukar libur Anda untuk tanggal {$dayOffExchange->requester_date->format('d/m/Y')} dengan {$dayOffExchange->target_date->format('d/m/Y')} telah disetujui admin.",
                ['url' => '/day-off-exchanges']
            );
            $webPush->sendToUser(
                $dayOffExchange->target_user_id,
                '✅ Jadwal Libur Ditukar',
                "Jadwal libur Anda tanggal {$dayOffExchange->target_date->format('d/m/Y')} telah ditukar dengan tanggal {$dayOffExchange->requester_date->format('d/m/Y')}.",
                ['url' => '/day-off-exchanges']
            );
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning("Notif tukar libur approve error: " . $e->getMessage());
        }

        return redirect()->back()->with('success', 'Pengajuan tukar libur berhasil disetujui. Jadwal kedua karyawan otomatis disesuaikan.');
    }

    /**
     * Reject the day off exchange request (Admin only).
     */
    public function reject(Request $request, DayOffExchange $dayOffExchange)
    {
        if (!$request->user()->isAdmin()) {
            abort(403, 'Akses ditolak.');
        }

        if ($dayOffExchange->status !== 'pending') {
            return redirect()->back()->with('error', 'Pengajuan ini sudah pernah diproses sebelumnya.');
        }

        $request->validate([
            'rejection_reason' => 'nullable|string|max:500',
        ]);

        $dayOffExchange->update([
            'status' => 'rejected',
            'rejection_reason' => $request->rejection_reason ?: 'Tidak disetujui oleh admin.',
        ]);

        try {
            app(\App\Services\WebPushService::class)->sendToUser(
                $dayOffExchange->requester_id,
                '❌ Tukar Libur Ditolak',
                "Pengajuan tukar libur Anda ditolak oleh admin.",
                ['url' => '/day-off-exchanges']
            );
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning("Notif tukar libur reject error: " . $e->getMessage());
        }

        return redirect()->back()->with('success', 'Pengajuan tukar libur telah ditolak.');
    }

    /**
     * Cancel / delete a pending request (Requester only).
     */
    public function destroy(Request $request, DayOffExchange $dayOffExchange)
    {
        if ($dayOffExchange->requester_id !== Auth::id()) {
            abort(403, 'Akses ditolak.');
        }

        if ($dayOffExchange->status !== 'pending') {
            return redirect()->back()->with('error', 'Pengajuan yang sudah diproses tidak dapat dibatalkan.');
        }

        $dayOffExchange->delete();

        return redirect()->back()->with('success', 'Pengajuan tukar libur berhasil dibatalkan.');
    }
}
