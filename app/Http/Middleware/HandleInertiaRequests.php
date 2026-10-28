<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        // Detect user from either default 'web' guard or 'student' guard
        $user = $request->user() ?: $request->user('student');
        
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? array_merge($user->toArray(), [
                    'roles' => method_exists($user, 'getRoleNames') ? $user->getRoleNames() : ['Siswa'],
                    'avatar_url' => isset($user->avatar) ? asset('storage/' . $user->avatar) : null,
                ]) : null,
            ],
            'notifications' => [
                'unreadCount' => $user ? $user->unreadNotifications()->count() : 0,
                'recent' => $user ? $user->notifications()->take(5)->get() : [],
            ],
            'pending_approvals' => $user && (method_exists($user, 'hasRole') ? $user->hasRole('admin') : $user->role === 'admin') ? [
                'leaves' => \App\Models\Leave::where('status', 'pending')->count(),
                'overtimes' => \App\Models\OvertimeRequest::where('status', 'pending')->count(),
                'shift_exchanges' => \App\Models\ShiftExchangeRequest::where('status', 'pending')->count(),
                'day_off_exchanges' => (\Illuminate\Support\Facades\Schema::hasTable('day_off_exchanges') ? \App\Models\DayOffExchange::where('status', 'pending')->count() : 0) +
                                       (\Illuminate\Support\Facades\Schema::hasTable('day_off_reschedules') ? \App\Models\DayOffReschedule::where('status', 'pending')->count() : 0),
            ] : null,
            'employee_updates' => $user ? [
                'leaves' => \App\Models\Leave::where('user_id', $user->id)
                    ->whereIn('status', ['approved', 'rejected'])
                    ->where('updated_at', '>=', now()->subDays(30))
                    ->pluck('updated_at'),
                'overtimes' => \App\Models\OvertimeRequest::where('user_id', $user->id)
                    ->whereIn('status', ['approved', 'rejected'])
                    ->where('updated_at', '>=', now()->subDays(30))
                    ->pluck('updated_at'),
                'shift_exchanges' => \App\Models\ShiftExchangeRequest::where('user_id', $user->id)
                    ->whereIn('status', ['approved', 'rejected'])
                    ->where('updated_at', '>=', now()->subDays(30))
                    ->pluck('updated_at'),
                'day_off_exchanges' => array_merge(
                    \Illuminate\Support\Facades\Schema::hasTable('day_off_exchanges') ? \App\Models\DayOffExchange::where(function($q) use ($user) {
                        $q->where('requester_id', $user->id)->orWhere('target_user_id', $user->id);
                    })
                    ->whereIn('status', ['approved', 'rejected'])
                    ->where('updated_at', '>=', now()->subDays(30))
                    ->pluck('updated_at')->toArray() : [],
                    \Illuminate\Support\Facades\Schema::hasTable('day_off_reschedules') ? \App\Models\DayOffReschedule::where('user_id', $user->id)
                    ->whereIn('status', ['approved', 'rejected'])
                    ->where('updated_at', '>=', now()->subDays(30))
                    ->pluck('updated_at')->toArray() : []
                ),
            ] : null,
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
            'app_settings' => [
                'school_name' => \App\Models\Setting::get('school_name', 'HRIS System'),
                'school_logo' => \App\Models\Setting::get('school_logo') ? asset('storage/' . \App\Models\Setting::get('school_logo')) : null,
            ]
        ];
    }
}
