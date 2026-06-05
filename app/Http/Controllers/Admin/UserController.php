<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use App\Enums\UserStatus;
use Inertia\Inertia;

class UserController extends Controller
{
    public function index()
    {
        $users = User::latest()->get();
        
        $statuses = [];
        foreach(UserStatus::cases() as $case) {
            $statuses[] = ['value' => $case->value, 'label' => $case->label()];
        }

        $roles = [
            ['value' => 'admin', 'label' => 'Admin HRIS'],
            ['value' => 'employee', 'label' => 'Karyawan / Staff'],
            ['value' => 'driver', 'label' => 'Sopir / Driver'],
        ];

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
            'roles' => $roles,
            'statuses' => $statuses,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'nip' => 'nullable|string|max:50',
            'phone' => 'nullable|string|max:20',
            'status' => ['required', Rule::enum(UserStatus::class)],
            'role' => [
                'required',
                'string',
                function ($attribute, $value, $fail) {
                    $roles = array_map('trim', explode(',', $value));
                    $validRoles = ['admin', 'employee', 'driver'];
                    foreach ($roles as $role) {
                        if (!in_array($role, $validRoles)) {
                            $fail('Peran (role) yang dipilih tidak valid.');
                        }
                    }
                }
            ],
            'basic_salary' => 'nullable|numeric|min:0',
        ]);

        User::create([
            'name' => $request->name,
            'email' => $request->email,
            'nip' => $request->nip,
            'phone' => $request->phone,
            'password' => Hash::make('password'),
            'status' => $request->status,
            'role' => $request->role,
            'basic_salary' => $request->basic_salary ?: 4500000,
        ]);

        return back()->with('success', 'Karyawan/User berhasil dibuat dengan password default "password".');
    }

    public function update(Request $request, User $user)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'nip' => 'nullable|string|max:50',
            'phone' => 'nullable|string|max:20',
            'status' => ['required', Rule::enum(UserStatus::class)],
            'role' => [
                'required',
                'string',
                function ($attribute, $value, $fail) {
                    $roles = array_map('trim', explode(',', $value));
                    $validRoles = ['admin', 'employee', 'driver'];
                    foreach ($roles as $role) {
                        if (!in_array($role, $validRoles)) {
                            $fail('Peran (role) yang dipilih tidak valid.');
                        }
                    }
                }
            ],
            'basic_salary' => 'nullable|numeric|min:0',
        ]);

        $user->update([
            'name' => $request->name,
            'email' => $request->email,
            'nip' => $request->nip,
            'phone' => $request->phone,
            'status' => $request->status,
            'role' => $request->role,
            'basic_salary' => $request->basic_salary ?: 4500000,
        ]);
        
        if ($request->reset_password_default) {
            $user->update(['password' => Hash::make('password')]);
        }

        $msg = 'Data karyawan berhasil diperbarui.';
        if ($request->reset_password_default) $msg .= ' Password telah di-reset ke "password".';

        return back()->with('success', $msg);
    }

    public function destroy(User $user)
    {
        if (auth()->id() === $user->id) {
            return back()->with('error', 'Anda tidak dapat menghapus akun Anda sendiri.');
        }

        $user->delete();
        return back()->with('success', 'User berhasil dihapus.');
    }
}
