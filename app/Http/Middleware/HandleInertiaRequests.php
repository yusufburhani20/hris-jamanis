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
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ]
        ];
    }
}
