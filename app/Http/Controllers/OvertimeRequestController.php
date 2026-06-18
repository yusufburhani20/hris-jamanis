<?php

namespace App\Http\Controllers;

use App\Models\OvertimeRequest;
use App\Models\User;
use App\Mail\OvertimeRequestNotification;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class OvertimeRequestController extends Controller
{
    /**
     * Display a listing of overtime requests.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            // Admin sees all overtime requests
            $overtimes = OvertimeRequest::with('user:id,name,email,role')
                ->with('approvedBy:id,name')
                ->latest()
                ->get();
        } else {
            // Employee sees their own overtime requests
            $overtimes = OvertimeRequest::where('user_id', $user->id)
                ->with('approvedBy:id,name')
                ->latest()
                ->get();
        }

        return Inertia::render('Overtimes/Index', [
            'overtimes' => $overtimes,
            'role' => $user->role,
        ]);
    }

    /**
     * Store a newly created overtime request in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'date' => 'required|date|after_or_equal:today',
            'hours' => 'required|integer|min:1|max:8',
            'reason' => 'required|string|max:500',
        ]);

        $overtime = OvertimeRequest::create([
            'user_id' => Auth::id(),
            'date' => $request->date,
            'hours' => $request->hours,
            'reason' => $request->reason,
            'status' => 'pending',
        ]);

        // Load user relationship for notification email
        $overtime->load('user');

        // Send Email & PWA notification to all Admin(s)
        $notifEnabled = \App\Models\Setting::get('notif_overtime_request_enabled', '1') === '1';
        if ($notifEnabled) {
            try {
                $admins = User::where('role', 'LIKE', '%admin%')->get();
                foreach ($admins as $admin) {
                    if ($admin->email) {
                        Mail::to($admin->email)->send(new OvertimeRequestNotification($overtime));
                    }
                }
            } catch (\Exception $e) {
                Log::error("Email sending failed for new Overtime request: " . $e->getMessage());
            }

            try {
                $push = app(\App\Services\WebPushService::class);
                $admins = User::where('role', 'LIKE', '%admin%')->get();
                foreach ($admins as $admin) {
                    $push->sendToUser(
                        $admin->id,
                        '⏰ Pengajuan Lembur Baru',
                        "Pengajuan lembur baru dari {$overtime->user->name} membutuhkan persetujuan Anda.",
                        ['url' => '/admin/overtimes']
                    );
                }
            } catch (\Exception $e) {
                Log::warning("PWA overtime request notification failed: " . $e->getMessage());
            }
        }

        return redirect()->route('overtimes.index')->with('success', 'Pengajuan upah lembur berhasil dikirim.');
    }

    /**
     * Approve the specified overtime request (Admin only).
     */
    public function approve(Request $request, OvertimeRequest $overtime)
    {
        if (!$request->user()->isAdmin()) {
            abort(403, 'Unauthorized action.');
        }

        $overtime->update([
            'status' => 'approved',
            'approved_by' => Auth::id(),
            'approved_at' => now(),
        ]);

        // Load user relationship
        $overtime->load('user');

        // Send Email & PWA status notification to Karyawan
        $notifEnabled = \App\Models\Setting::get('notif_overtime_status_enabled', '1') === '1';
        if ($notifEnabled) {
            try {
                if ($overtime->user && $overtime->user->email) {
                    Mail::to($overtime->user->email)->send(new \App\Mail\OvertimeStatusNotification($overtime));
                }
            } catch (\Exception $e) {
                Log::error("Email status overtime approved failed: " . $e->getMessage());
            }

            try {
                $dateLabel = $overtime->date->format('d M Y');
                app(\App\Services\WebPushService::class)->sendToUser(
                    $overtime->user_id,
                    '✅ Status Lembur Diperbarui',
                    "Pengajuan lembur Anda untuk tanggal {$dateLabel} telah disetujui oleh Admin.",
                    ['url' => '/overtimes']
                );
            } catch (\Exception $e) {
                Log::warning("PWA overtime approved notification failed: " . $e->getMessage());
            }
        }

        return redirect()->back()->with('success', 'Pengajuan lembur disetujui.');
    }

    /**
     * Reject the specified overtime request (Admin only).
     */
    public function reject(Request $request, OvertimeRequest $overtime)
    {
        if (!$request->user()->isAdmin()) {
            abort(403, 'Unauthorized action.');
        }

        $overtime->update([
            'status' => 'rejected',
            'approved_by' => Auth::id(),
            'approved_at' => now(),
        ]);

        // Load user relationship
        $overtime->load('user');

        // Send Email & PWA status notification to Karyawan
        $notifEnabled = \App\Models\Setting::get('notif_overtime_status_enabled', '1') === '1';
        if ($notifEnabled) {
            try {
                if ($overtime->user && $overtime->user->email) {
                    Mail::to($overtime->user->email)->send(new \App\Mail\OvertimeStatusNotification($overtime));
                }
            } catch (\Exception $e) {
                Log::error("Email status overtime rejected failed: " . $e->getMessage());
            }

            try {
                $dateLabel = $overtime->date->format('d M Y');
                app(\App\Services\WebPushService::class)->sendToUser(
                    $overtime->user_id,
                    '✅ Status Lembur Diperbarui',
                    "Pengajuan lembur Anda untuk tanggal {$dateLabel} telah ditolak oleh Admin.",
                    ['url' => '/overtimes']
                );
            } catch (\Exception $e) {
                Log::warning("PWA overtime rejected notification failed: " . $e->getMessage());
            }
        }

        return redirect()->back()->with('success', 'Pengajuan lembur ditolak.');
    }

    /**
     * Remove the specified overtime from storage.
     */
    public function destroy(Request $request, OvertimeRequest $overtime)
    {
        // Karyawan can delete their own pending overtime request
        if ($overtime->user_id !== Auth::id()) {
            abort(403, 'Unauthorized action.');
        }

        if ($overtime->status !== 'pending') {
            return redirect()->back()->with('error', 'Lembur yang sudah diproses tidak dapat dihapus.');
        }

        $overtime->delete();

        return redirect()->back()->with('success', 'Pengajuan lembur berhasil dibatalkan.');
    }
}
