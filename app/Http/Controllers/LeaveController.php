<?php

namespace App\Http\Controllers;

use App\Models\Leave;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class LeaveController extends Controller
{
    /**
     * Display a listing of leaves.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            // Admin sees all leaves
            $leaves = Leave::with('user:id,name,email,role')
                ->with('approvedBy:id,name')
                ->latest()
                ->get();
        } else {
            // Employee sees their own leaves
            $leaves = Leave::where('user_id', $user->id)
                ->with('approvedBy:id,name')
                ->latest()
                ->get();
        }

        return Inertia::render('Leaves/Index', [
            'leaves' => $leaves,
            'role' => $user->role,
        ]);
    }

    /**
     * Store a newly created leave in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'type'       => 'required|in:cuti,sakit,izin,izin_terlambat',
            'start_date' => [
                'required',
                'date',
                // izin_terlambat bisa untuk hari ini atau masa lalu (sudah terlambat baru minta izin)
                // tipe lain harus hari ini atau ke depan
                $request->type === 'izin_terlambat' ? 'before_or_equal:today' : 'after_or_equal:today',
            ],
            'end_date'   => 'required|date|after_or_equal:start_date',
            'reason'     => 'required|string|max:500',
            'proof_file' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:2048',
        ]);

        $proofPath = null;
        if ($request->hasFile('proof_file')) {
            $proofPath = $request->file('proof_file')->store('leaves_proof', 'public');
        }

        $leave = Leave::create([
            'user_id' => Auth::id(),
            'type' => $request->type,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'reason' => $request->reason,
            'proof_file' => $proofPath,
            'status' => 'pending',
        ]);

        // Load user relationship for email mailable
        $leave->load('user');

        // Send Email & PWA notification to all Admin(s)
        $notifEnabled = \App\Models\Setting::get('notif_leave_request_enabled', '1') === '1';
        if ($notifEnabled) {
            try {
                $admins = \App\Models\User::where('role', 'LIKE', '%admin%')->get();
                foreach ($admins as $admin) {
                    if ($admin->email) {
                        \Illuminate\Support\Facades\Mail::to($admin->email)->send(new \App\Mail\LeaveRequestNotification($leave));
                    }
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error("Email sending failed for new Leave request: " . $e->getMessage());
            }

            try {
                $push = app(\App\Services\WebPushService::class);
                $admins = \App\Models\User::where('role', 'LIKE', '%admin%')->get();
                foreach ($admins as $admin) {
                    $push->sendToUser(
                        $admin->id,
                        '📝 Pengajuan Izin Baru',
                        "Pengajuan {$leave->type} baru dari {$leave->user->name} membutuhkan persetujuan Anda.",
                        ['url' => '/admin/leaves']
                    );
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning("PWA leave request notification failed: " . $e->getMessage());
            }
        }

        return redirect()->route('leaves.index')->with('success', 'Pengajuan izin/cuti berhasil dikirim.');
    }

    /**
     * Approve the specified leave request (Admin only).
     */
    public function approve(Request $request, Leave $leave)
    {
        if (!$request->user()->isAdmin()) {
            abort(403, 'Unauthorized action.');
        }

        $leave->update([
            'status' => 'approved',
            'approved_by' => Auth::id(),
            'approved_at' => now(),
        ]);

        // Load user relationship
        $leave->load('user');

        // Send Email & PWA status notification to Karyawan
        $notifEnabled = \App\Models\Setting::get('notif_leave_status_enabled', '1') === '1';
        if ($notifEnabled) {
            try {
                if ($leave->user && $leave->user->email) {
                    \Illuminate\Support\Facades\Mail::to($leave->user->email)->send(new \App\Mail\LeaveStatusNotification($leave));
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error("Email status leave approved failed: " . $e->getMessage());
            }

            try {
                app(\App\Services\WebPushService::class)->sendToUser(
                    $leave->user_id,
                    '✅ Status Izin Diperbarui',
                    "Pengajuan {$leave->type} Anda telah disetujui oleh Admin.",
                    ['url' => '/leaves']
                );
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning("PWA leave approved notification failed: " . $e->getMessage());
            }
        }

        return redirect()->back()->with('success', 'Pengajuan izin/cuti disetujui.');
    }

    /**
     * Reject the specified leave request (Admin only).
     */
    public function reject(Request $request, Leave $leave)
    {
        if (!$request->user()->isAdmin()) {
            abort(403, 'Unauthorized action.');
        }

        $leave->update([
            'status' => 'rejected',
            'approved_by' => Auth::id(),
            'approved_at' => now(),
        ]);

        // Load user relationship
        $leave->load('user');

        // Send Email & PWA status notification to Karyawan
        $notifEnabled = \App\Models\Setting::get('notif_leave_status_enabled', '1') === '1';
        if ($notifEnabled) {
            try {
                if ($leave->user && $leave->user->email) {
                    \Illuminate\Support\Facades\Mail::to($leave->user->email)->send(new \App\Mail\LeaveStatusNotification($leave));
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error("Email status leave rejected failed: " . $e->getMessage());
            }

            try {
                app(\App\Services\WebPushService::class)->sendToUser(
                    $leave->user_id,
                    '✅ Status Izin Diperbarui',
                    "Pengajuan {$leave->type} Anda telah ditolak oleh Admin.",
                    ['url' => '/leaves']
                );
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning("PWA leave rejected notification failed: " . $e->getMessage());
            }
        }

        return redirect()->back()->with('success', 'Pengajuan izin/cuti ditolak.');
    }

    /**
     * Remove the specified leave from storage.
     */
    public function destroy(Request $request, Leave $leave)
    {
        // Karyawan can delete their own pending leave request
        if ($leave->user_id !== Auth::id()) {
            abort(403, 'Unauthorized action.');
        }

        if ($leave->status !== 'pending') {
            return redirect()->back()->with('error', 'Izin yang sudah diproses tidak dapat dihapus.');
        }

        if ($leave->proof_file) {
            Storage::disk('public')->delete($leave->proof_file);
        }

        $leave->delete();

        return redirect()->back()->with('success', 'Pengajuan izin berhasil dibatalkan.');
    }
}
