<?php

namespace App\Http\Controllers;

use App\Models\Shift;
use App\Models\User;
use App\Models\UserShift;
use App\Models\ShiftExchangeRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ShiftExchangeRequestController extends Controller
{
    /**
     * Display a listing of shift exchange requests.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            // Admin views all requests
            $exchanges = ShiftExchangeRequest::with([
                'user:id,name,email,role',
                'targetUser:id,name,email',
                'fromShift:id,name,start_time,end_time',
                'toShift:id,name,start_time,end_time',
                'targetUserFromShift:id,name,start_time,end_time',
                'approvedBy:id,name'
            ])->latest()->get();
        } else {
            // Employee views their own requests (either sent or where they are the target)
            $exchanges = ShiftExchangeRequest::where('user_id', $user->id)
                ->orWhere('target_user_id', $user->id)
                ->with([
                    'user:id,name,email,role',
                    'targetUser:id,name,email',
                    'fromShift:id,name,start_time,end_time',
                    'toShift:id,name,start_time,end_time',
                    'targetUserFromShift:id,name,start_time,end_time',
                    'approvedBy:id,name'
                ])->latest()->get();
        }

        // Fetch available shifts and colleagues for the submit form
        $shifts = Shift::latest()->get();
        $employees = User::where('id', '!=', $user->id)
            ->where(function ($query) {
                $query->where('role', 'LIKE', '%employee%')
                      ->orWhere('role', 'LIKE', '%driver%');
            })->get(['id', 'name', 'email']);

        return Inertia::render('ShiftExchanges/Index', [
            'exchanges' => $exchanges,
            'shifts' => $shifts,
            'employees' => $employees,
            'role' => $user->isAdmin() ? 'admin' : 'employee',
        ]);
    }

    /**
     * Store a newly created shift exchange request in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'target_date' => 'required|date|after_or_equal:today',
            'type' => 'required|in:shift,employee',
            'to_shift_id' => 'required_if:type,shift|nullable|exists:shifts,id',
            'target_user_id' => 'required_if:type,employee|nullable|exists:users,id',
            'reason' => 'required|string|max:500',
        ]);

        $user = $request->user();
        
        // Find requester's active shift on the target date
        $fromShift = $user->activeShift($request->target_date);
        if (!$fromShift) {
            return back()->withErrors(['target_date' => 'Anda tidak memiliki penugasan shift pada tanggal tersebut.']);
        }

        $targetShiftId = null;
        if ($request->type === 'employee') {
            // Find target user
            $targetUser = User::findOrFail($request->target_user_id);
            // Find target user's shift on target date
            $targetShift = $targetUser->activeShift($request->target_date);
            if (!$targetShift) {
                return back()->withErrors(['target_user_id' => 'Rekan kerja terpilih tidak memiliki penugasan shift aktif pada tanggal tersebut.']);
            }
            $targetShiftId = $targetShift->id;

            if ($targetUser->id === $user->id) {
                return back()->withErrors(['target_user_id' => 'Anda tidak dapat memilih diri sendiri sebagai rekan kerja untuk ditukar.']);
            }
        }

        $exchange = ShiftExchangeRequest::create([
            'user_id' => $user->id,
            'target_date' => $request->target_date,
            'type' => $request->type,
            'from_shift_id' => $fromShift->id,
            'to_shift_id' => $request->type === 'shift' ? $request->to_shift_id : null,
            'target_user_id' => $request->type === 'employee' ? $request->target_user_id : null,
            'target_user_from_shift_id' => $targetShiftId,
            'reason' => $request->reason,
            'status' => 'pending',
        ]);

        // Load relationships for mail template
        $exchange->load(['user', 'fromShift', 'toShift', 'targetUser', 'targetUserFromShift']);

        // Send Email & Push notifications to Admins
        $notifEnabled = \App\Models\Setting::get('notif_shift_exchange_enabled', '1') === '1';
        if ($notifEnabled) {
            try {
                $admins = User::where('role', 'LIKE', '%admin%')->get();
                foreach ($admins as $admin) {
                    if ($admin->email) {
                        \Illuminate\Support\Facades\Mail::to($admin->email)->send(new \App\Mail\ShiftExchangeRequestNotification($exchange));
                    }
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error("Email sending failed for Shift Exchange Request: " . $e->getMessage());
            }

            try {
                app(\App\Services\WebPushService::class)->sendToAdmins(
                    '🔄 Pengajuan Tukar Shift',
                    "Pengajuan tukar shift baru dari {$exchange->user->name} pada tanggal {$exchange->target_date->format('d/m/Y')}.",
                    ['url' => '/admin/shift-exchanges']
                );
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning("PWA shift exchange request notification failed: " . $e->getMessage());
            }
        }

        return redirect()->route('shift-exchanges.index')->with('success', 'Pengajuan tukar shift berhasil dikirim.');
    }

    /**
     * Approve the shift exchange request (Admin only).
     */
    public function approve(Request $request, ShiftExchangeRequest $shiftExchange)
    {
        if (!$request->user()->isAdmin()) {
            abort(403, 'Unauthorized action.');
        }

        if ($shiftExchange->status !== 'pending') {
            return redirect()->back()->with('error', 'Pengajuan ini sudah diproses.');
        }

        $targetDate = $shiftExchange->target_date->toDateString();

        if ($shiftExchange->type === 'shift') {
            // Apply single-day override for requester
            UserShift::create([
                'user_id' => $shiftExchange->user_id,
                'shift_id' => $shiftExchange->to_shift_id,
                'start_date' => $targetDate,
                'end_date' => $targetDate,
            ]);
        } else {
            // Cross assignment (swap shifts)
            // 1. Assign requester to target colleague's shift
            UserShift::create([
                'user_id' => $shiftExchange->user_id,
                'shift_id' => $shiftExchange->target_user_from_shift_id,
                'start_date' => $targetDate,
                'end_date' => $targetDate,
            ]);
            // 2. Assign colleague to requester's shift
            UserShift::create([
                'user_id' => $shiftExchange->target_user_id,
                'shift_id' => $shiftExchange->from_shift_id,
                'start_date' => $targetDate,
                'end_date' => $targetDate,
            ]);
        }

        $shiftExchange->update([
            'status' => 'approved',
            'approved_by' => Auth::id(),
            'approved_at' => now(),
        ]);

        $shiftExchange->load(['user', 'fromShift', 'toShift', 'targetUser', 'targetUserFromShift']);

        // Send Email & Push notifications to employees
        $notifEnabled = \App\Models\Setting::get('notif_shift_exchange_enabled', '1') === '1';
        if ($notifEnabled) {
            try {
                if ($shiftExchange->user && $shiftExchange->user->email) {
                    \Illuminate\Support\Facades\Mail::to($shiftExchange->user->email)->send(new \App\Mail\ShiftExchangeStatusNotification($shiftExchange));
                }
                if ($shiftExchange->type === 'employee' && $shiftExchange->targetUser && $shiftExchange->targetUser->email) {
                    \Illuminate\Support\Facades\Mail::to($shiftExchange->targetUser->email)->send(new \App\Mail\ShiftExchangeStatusNotification($shiftExchange));
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error("Email status shift exchange approved failed: " . $e->getMessage());
            }

            try {
                $push = app(\App\Services\WebPushService::class);
                $push->sendToUser(
                    $shiftExchange->user_id,
                    '✅ Tukar Shift Disetujui',
                    "Pengajuan tukar shift Anda untuk tanggal {$shiftExchange->target_date->format('d/m/Y')} telah disetujui.",
                    ['url' => '/shift-exchanges']
                );

                if ($shiftExchange->type === 'employee') {
                    $push->sendToUser(
                        $shiftExchange->target_user_id,
                        '🔄 Jadwal Shift Ditukar',
                        "Shift Anda untuk tanggal {$shiftExchange->target_date->format('d/m/Y')} telah ditukar dengan {$shiftExchange->user->name}.",
                        ['url' => '/shift-exchanges']
                    );
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning("PWA shift approved notification failed: " . $e->getMessage());
            }
        }

        return redirect()->back()->with('success', 'Pengajuan tukar shift berhasil disetujui dan jadwal telah diperbarui.');
    }

    /**
     * Reject the shift exchange request (Admin only).
     */
    public function reject(Request $request, ShiftExchangeRequest $shiftExchange)
    {
        if (!$request->user()->isAdmin()) {
            abort(403, 'Unauthorized action.');
        }

        if ($shiftExchange->status !== 'pending') {
            return redirect()->back()->with('error', 'Pengajuan ini sudah diproses.');
        }

        $request->validate([
            'rejection_reason' => 'nullable|string|max:255',
        ]);

        $shiftExchange->update([
            'status' => 'rejected',
            'approved_by' => Auth::id(),
            'approved_at' => now(),
            'rejection_reason' => $request->rejection_reason,
        ]);

        $shiftExchange->load(['user', 'fromShift', 'toShift', 'targetUser', 'targetUserFromShift']);

        // Send Email & Push notification to employee
        $notifEnabled = \App\Models\Setting::get('notif_shift_exchange_enabled', '1') === '1';
        if ($notifEnabled) {
            try {
                if ($shiftExchange->user && $shiftExchange->user->email) {
                    \Illuminate\Support\Facades\Mail::to($shiftExchange->user->email)->send(new \App\Mail\ShiftExchangeStatusNotification($shiftExchange));
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error("Email status shift exchange rejected failed: " . $e->getMessage());
            }

            try {
                app(\App\Services\WebPushService::class)->sendToUser(
                    $shiftExchange->user_id,
                    '❌ Tukar Shift Ditolak',
                    "Pengajuan tukar shift Anda untuk tanggal {$shiftExchange->target_date->format('d/m/Y')} telah ditolak.",
                    ['url' => '/shift-exchanges']
                );
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning("PWA shift rejected notification failed: " . $e->getMessage());
            }
        }

        return redirect()->back()->with('success', 'Pengajuan tukar shift berhasil ditolak.');
    }

    /**
     * Remove the specified shift exchange request from storage.
     */
    public function destroy(Request $request, ShiftExchangeRequest $shiftExchange)
    {
        // Only the requester can cancel the pending request
        if ($shiftExchange->user_id !== Auth::id()) {
            abort(403, 'Unauthorized action.');
        }

        if ($shiftExchange->status !== 'pending') {
            return redirect()->back()->with('error', 'Pengajuan yang sudah diproses tidak dapat dibatalkan.');
        }

        $shiftExchange->delete();

        return redirect()->back()->with('success', 'Pengajuan tukar shift berhasil dibatalkan.');
    }
}
