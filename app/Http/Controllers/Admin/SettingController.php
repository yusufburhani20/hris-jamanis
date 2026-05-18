<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;

class SettingController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/Settings/Index', [
            'settings' => [
                'school_name'              => Setting::get('school_name', 'SALIRA ACADEMY'),
                'school_address'           => Setting::get('school_address', ''),
                'school_phone'             => Setting::get('school_phone', ''),
                'school_email'             => Setting::get('school_email', ''),
                'report_location'          => Setting::get('report_location', 'Kota'),
                'school_logo'              => Setting::get('school_logo') ? Storage::url(Setting::get('school_logo')) : null,
                'school_favicon'           => Setting::get('school_favicon') ? Storage::url(Setting::get('school_favicon')) : null,
                'github_username'          => Setting::get('github_username', ''),
                'github_token'             => Setting::get('github_token', ''),
            ]
        ]);
    }

    public function update(Request $request)
    {
        $request->validate([
            'school_name'        => 'required|string|max:255',
            'school_address'     => 'nullable|string',
            'school_phone'       => 'nullable|string|max:50',
            'school_email'       => 'nullable|email|max:100',
            'report_location'    => 'nullable|string|max:100',
            'school_logo'        => 'nullable|image|max:2048',
            'school_favicon'     => 'nullable|image|mimes:ico,png,jpg,jpeg,svg|max:1024',
            'github_username'    => 'nullable|string|max:100',
            'github_token'       => 'nullable|string|max:255',
        ]);

        Setting::set('school_name', $request->school_name);
        Setting::set('school_address', $request->school_address);
        Setting::set('school_phone', $request->school_phone);
        Setting::set('school_email', $request->school_email);
        Setting::set('report_location', $request->report_location);
        Setting::set('github_username', $request->github_username);
        Setting::set('github_token', $request->github_token);

        if ($request->hasFile('school_logo')) {
            // Delete old logo
            $oldLogo = Setting::get('school_logo');
            if ($oldLogo) {
                Storage::disk('public')->delete($oldLogo);
            }

            $path = $request->file('school_logo')->store('settings', 'public');
            Setting::set('school_logo', $path);
        }

        if ($request->hasFile('school_favicon')) {
            $oldFavicon = Setting::get('school_favicon');
            if ($oldFavicon) {
                Storage::disk('public')->delete($oldFavicon);
            }

            $path = $request->file('school_favicon')->store('settings', 'public');
            Setting::set('school_favicon', $path);
        }

        return back()->with('success', 'Pengaturan berhasil diperbarui');
    }

    public function systemUpdate()
    {
        $scriptPath = base_path('deploy.sh');
        $logPath = storage_path('logs/deploy.log');

        $ts = now()->format('H:i:s');

        // Mulai log baru
        $initLog = "[{$ts}] Memulai proses pembaruan sistem...\n";
        $initLog .= "[{$ts}] Server path: {$scriptPath}\n";
        $initLog .= "[{$ts}] Log path: {$logPath}\n";

        if (!file_exists($scriptPath)) {
            $initLog .= "[{$ts}] ❌ ERROR: deploy.sh tidak ditemukan!\n";
            file_put_contents($logPath, $initLog);
            return response()->json(['status' => 'error', 'message' => 'Script deploy.sh tidak ditemukan.'], 404);
        }

        // Pastikan script bisa dieksekusi
        @chmod($scriptPath, 0755);

        // Cek apakah fungsi exec tersedia
        $disabledFunctions = explode(',', ini_get('disable_functions'));
        if (in_array('exec', array_map('trim', $disabledFunctions))) {
            $initLog .= "[{$ts}] ❌ ERROR: Fungsi exec() dinonaktifkan di server ini (disable_functions).\n";
            $initLog .= "[{$ts}] Solusi: Hapus 'exec' dari disable_functions di konfigurasi PHP aaPanel.\n";
            file_put_contents($logPath, $initLog);
            return response()->json(['status' => 'error', 'message' => 'exec() tidak tersedia.'], 500);
        }

        $initLog .= "[{$ts}] ✅ Menjalankan deploy.sh di latar belakang...\n";
        file_put_contents($logPath, $initLog);

        // Ambil kredensial dari setting dan bersihkan spasi
        $githubToken = trim(Setting::get('github_token', ''));
        $githubUser  = trim(Setting::get('github_username', ''));

        // Pass GitHub credentials as environment variables to the script
        $envPrefix = '';
        if ($githubToken && $githubUser) {
            $envPrefix = "GITHUB_TOKEN=" . escapeshellarg($githubToken) . " GITHUB_USER=" . escapeshellarg($githubUser) . " ";
        }

        // Jalankan script (output append ke log)
        $cmd = "{$envPrefix}bash " . escapeshellarg($scriptPath) . " >> " . escapeshellarg($logPath) . " 2>&1 &";
        exec($cmd);

        return response()->json(['status' => 'success', 'message' => 'Proses pembaruan sedang berjalan.']);
    }

    public function updateLogs()
    {
        $logPath = storage_path('logs/deploy.log');

        if (!file_exists($logPath)) {
            return response()->json(['logs' => 'Belum ada log pembaruan.']);
        }

        // Read file with pure PHP — no shell_exec (more reliable on all servers)
        $content = file_get_contents($logPath);
        
        // Return only the last ~8000 chars to avoid huge payloads
        if (strlen($content) > 8000) {
            $content = '...[log dipotong]...' . substr($content, -8000);
        }

        if (trim($content) === '') {
            return response()->json(['logs' => 'Belum ada log pembaruan.']);
        }

        return response()->json(['logs' => $content]);
    }
}
