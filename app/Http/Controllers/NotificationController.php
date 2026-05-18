<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class NotificationController extends Controller
{
    /**
     * Display a listing of all notifications.
     */
    public function index(Request $request)
    {
        $notifications = $request->user()
            ->notifications()
            ->paginate(15);

        return Inertia::render('Notifications/Index', [
            'notifications' => $notifications,
        ]);
    }

    /**
     * Mark notification as read and redirect to action URL.
     */
    public function readAndRedirect(Request $request, $id)
    {
        $notification = $request->user()->notifications()->where('id', $id)->first();

        $url = '/dashboard'; // fallback default

        if ($notification) {
            $notification->markAsRead();
            // Ambil action_url dari data notifikasi
            if (!empty($notification->data['action_url'])) {
                $url = $notification->data['action_url'];
                // Fix for old notifications that have incorrect action_url
                if ($url === '/user/permissions') {
                    $url = '/permissions';
                }
            }
        }

        return redirect($url);
    }

    /**
     * Mark a specific notification as read.
     */
    public function markAsRead(Request $request, $id)
    {
        $notification = $request->user()->notifications()->where('id', $id)->first();

        if ($notification) {
            $notification->markAsRead();
        }

        return back();
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllAsRead(Request $request)
    {
        $request->user()->unreadNotifications->markAsRead();

        return back()->with('success', 'Semua notifikasi telah ditandai sebagai terbaca.');
    }
}
