<?php

namespace App\Http\Controllers;

use App\Models\PushSubscription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PushSubscriptionController extends Controller
{
    /**
     * Return the VAPID public key for the frontend.
     */
    public function vapidPublicKey()
    {
        return response()->json([
            'publicKey' => config('services.vapid.public_key', ''),
        ]);
    }

    /**
     * Store a new push subscription.
     */
    public function store(Request $request)
    {
        $request->validate([
            'endpoint'   => 'required|string',
            'publicKey'  => 'nullable|string',
            'authToken'  => 'nullable|string',
        ]);

        // Safely clean up duplicate endpoint references associated with other users
        PushSubscription::where('endpoint', $request->endpoint)
            ->where('user_id', '!=', Auth::id())
            ->delete();

        $existing = PushSubscription::where('user_id', Auth::id())
            ->where('endpoint', $request->endpoint)
            ->first();

        if ($existing) {
            $existing->update([
                'public_key'       => $request->publicKey,
                'auth_token'       => $request->authToken,
                'content_encoding' => $request->contentEncoding ?? 'aesgcm',
            ]);
        } else {
            PushSubscription::create([
                'user_id'          => Auth::id(),
                'endpoint'         => $request->endpoint,
                'public_key'       => $request->publicKey,
                'auth_token'       => $request->authToken,
                'content_encoding' => $request->contentEncoding ?? 'aesgcm',
            ]);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Remove a push subscription (user unsubscribed).
     */
    public function destroy(Request $request)
    {
        $request->validate([
            'endpoint' => 'required|string',
        ]);

        PushSubscription::where('user_id', Auth::id())
            ->where('endpoint', $request->endpoint)
            ->delete();

        return response()->json(['success' => true]);
    }
}
