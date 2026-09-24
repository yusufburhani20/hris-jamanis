<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use App\Enums\UserStatus;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\UsersExport;
use App\Imports\UsersImport;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::query();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('nip', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($request->filled('role')) {
            $query->where('role', 'like', "%{$request->role}%");
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $perPage = $request->input('per_page', 10);
        $users = $query->latest()->paginate($perPage)->withQueryString();
        
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
            'filters' => $request->only(['search', 'role', 'status', 'per_page'])
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
            'avatar' => 'nullable|image|max:2048',
        ]);

        $avatarPath = null;
        if ($request->hasFile('avatar')) {
            $avatarPath = \App\Helpers\ImageHelper::compressAndStore($request->file('avatar'), 'avatars');
        }

        User::create([
            'name' => $request->name,
            'email' => $request->email,
            'nip' => $request->nip,
            'phone' => $request->phone,
            'password' => Hash::make('password'),
            'status' => $request->status,
            'role' => $request->role,
            'basic_salary' => $request->basic_salary ?: 4500000,
            'avatar' => $avatarPath,
        ]);

        return back()->with('success', 'Karyawan/User berhasil dibuat dengan password default "password".');
    }

    public function update(Request $request, User $user)
    {
        $rules = [
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
        ];

        if ($request->hasFile('avatar')) {
            $rules['avatar'] = 'nullable|image|max:2048';
        } else {
            $rules['avatar'] = 'nullable|string';
        }

        $request->validate($rules);

        $updateData = [
            'name' => $request->name,
            'email' => $request->email,
            'nip' => $request->nip,
            'phone' => $request->phone,
            'status' => $request->status,
            'role' => $request->role,
            'basic_salary' => $request->basic_salary ?: 4500000,
        ];

        if ($request->hasFile('avatar')) {
            if ($user->avatar) {
                Storage::disk('public')->delete($user->avatar);
            }
            $updateData['avatar'] = \App\Helpers\ImageHelper::compressAndStore($request->file('avatar'), 'avatars');
        }

        $user->update($updateData);
        
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

    public function destroyBulk(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:users,id'
        ]);

        $ids = $request->ids;
        
        // Prevent deleting self
        if (in_array(auth()->id(), $ids)) {
            $ids = array_diff($ids, [auth()->id()]);
            $selfExcluded = true;
        }

        if (count($ids) > 0) {
            User::whereIn('id', $ids)->delete();
        }

        $msg = count($ids) . ' data karyawan berhasil dihapus.';
        if (isset($selfExcluded)) {
            $msg .= ' (Akun Anda sendiri tidak dihapus).';
        }

        return back()->with('success', $msg);
    }

    public function export()
    {
        return Excel::download(new UsersExport, 'data_karyawan_' . date('Ymd_His') . '.xlsx');
    }

    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,xls,csv|max:2048'
        ]);

        try {
            Excel::import(new UsersImport, $request->file('file'));
            return back()->with('success', 'Data karyawan berhasil diimport.');
        } catch (\Exception $e) {
            return back()->with('error', 'Gagal mengimport data: ' . $e->getMessage());
        }
    }
}
