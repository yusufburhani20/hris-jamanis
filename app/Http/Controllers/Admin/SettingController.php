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
        $pwa_devices_stats = [
            'total' => \App\Models\PushSubscription::count(),
            'staff' => \App\Models\PushSubscription::whereHas('user', function($q) {
                $q->where('role', 'like', '%employee%')->orWhere('role', 'like', '%admin%');
            })->count(),
            'driver' => \App\Models\PushSubscription::whereHas('user', function($q) {
                $q->where('role', 'like', '%driver%');
            })->count(),
        ];

        $pwa_devices_list = \App\Models\PushSubscription::with('user')
            ->latest('updated_at')
            ->get()
            ->groupBy('user_id')
            ->map(function ($subs) {
                $first = $subs->first();
                $user = $first->user;
                return [
                    'user_id' => $user?->id,
                    'name' => $user?->name ?? 'User Tidak Dikenal',
                    'email' => $user?->email ?? '-',
                    'phone' => $user?->phone ?? '-',
                    'role' => $user?->role ?? '',
                    'count' => $subs->count(),
                    'last_active' => $first->updated_at ? $first->updated_at->diffForHumans() : '-',
                ];
            })->values();

        return Inertia::render('Admin/Settings/Index', [
            'pwa_devices_stats' => $pwa_devices_stats,
            'pwa_devices_list' => $pwa_devices_list,
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
                
                // Attendance parameter configurations
                'late_tolerance_minutes'   => (int) Setting::get('late_tolerance_minutes', 0),
                'early_checkin_tolerance_minutes' => (int) Setting::get('early_checkin_tolerance_minutes', 60),
                'overtime_tolerance_minutes' => (int) Setting::get('overtime_tolerance_minutes', 60),

                // Notification keys
                'push_checkin_reminder_enabled'  => Setting::get('push_checkin_reminder_enabled', '1') === '1',
                'push_checkin_reminder_time'     => Setting::get('push_checkin_reminder_time', '07:45'),
                'push_checkout_reminder_enabled' => Setting::get('push_checkout_reminder_enabled', '1') === '1',
                'push_checkout_reminder_time'    => Setting::get('push_checkout_reminder_time', '17:00'),
                'notif_payroll_paid_enabled'     => Setting::get('notif_payroll_paid_enabled', '1') === '1',
                'notif_leave_request_enabled'    => Setting::get('notif_leave_request_enabled', '1') === '1',
                'notif_leave_status_enabled'     => Setting::get('notif_leave_status_enabled', '1') === '1',
                'notif_overtime_request_enabled' => Setting::get('notif_overtime_request_enabled', '1') === '1',
                'notif_overtime_status_enabled'  => Setting::get('notif_overtime_status_enabled', '1') === '1',
                'notif_admin_checkin_enabled'    => Setting::get('notif_admin_checkin_enabled', '1') === '1',
                'notif_admin_checkout_enabled'   => Setting::get('notif_admin_checkout_enabled', '1') === '1',
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
            
            // Attendance parameter configuration validation
            'late_tolerance_minutes'          => 'required|integer|min:0|max:1440',
            'early_checkin_tolerance_minutes' => 'required|integer|min:0|max:1440',
            'overtime_tolerance_minutes'      => 'required|integer|min:0|max:1440',

            // Notification validation
            'push_checkin_reminder_enabled'  => 'nullable|boolean',
            'push_checkin_reminder_time'     => 'nullable|string|max:5',
            'push_checkout_reminder_enabled' => 'nullable|boolean',
            'push_checkout_reminder_time'    => 'nullable|string|max:5',
            'notif_payroll_paid_enabled'     => 'nullable|boolean',
            'notif_leave_request_enabled'    => 'nullable|boolean',
            'notif_leave_status_enabled'     => 'nullable|boolean',
            'notif_overtime_request_enabled' => 'nullable|boolean',
            'notif_overtime_status_enabled'  => 'nullable|boolean',
            'notif_admin_checkin_enabled'    => 'nullable|boolean',
            'notif_admin_checkout_enabled'   => 'nullable|boolean',
        ]);

        Setting::set('school_name', $request->school_name);
        Setting::set('school_address', $request->school_address);
        Setting::set('school_phone', $request->school_phone);
        Setting::set('school_email', $request->school_email);
        Setting::set('report_location', $request->report_location);
        Setting::set('github_username', $request->github_username);
        Setting::set('github_token', $request->github_token);

        Setting::set('late_tolerance_minutes', $request->late_tolerance_minutes);
        Setting::set('early_checkin_tolerance_minutes', $request->early_checkin_tolerance_minutes);
        Setting::set('overtime_tolerance_minutes', $request->overtime_tolerance_minutes);

        Setting::set('push_checkin_reminder_enabled', $request->push_checkin_reminder_enabled ? '1' : '0');
        Setting::set('push_checkin_reminder_time', $request->push_checkin_reminder_time ?? '07:45');
        Setting::set('push_checkout_reminder_enabled', $request->push_checkout_reminder_enabled ? '1' : '0');
        Setting::set('push_checkout_reminder_time', $request->push_checkout_reminder_time ?? '17:00');
        Setting::set('notif_payroll_paid_enabled', $request->notif_payroll_paid_enabled ? '1' : '0');
        Setting::set('notif_leave_request_enabled', $request->notif_leave_request_enabled ? '1' : '0');
        Setting::set('notif_leave_status_enabled', $request->notif_leave_status_enabled ? '1' : '0');
        Setting::set('notif_overtime_request_enabled', $request->notif_overtime_request_enabled ? '1' : '0');
        Setting::set('notif_overtime_status_enabled', $request->notif_overtime_status_enabled ? '1' : '0');
        Setting::set('notif_admin_checkin_enabled', $request->notif_admin_checkin_enabled ? '1' : '0');
        Setting::set('notif_admin_checkout_enabled', $request->notif_admin_checkout_enabled ? '1' : '0');

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

    public function testPush(Request $request)
    {
        $user = auth()->user();
        if (!$user) {
            return response()->json(['status' => 'error', 'message' => 'User tidak terotentikasi.'], 401);
        }

        // Validate custom input
        $request->validate([
            'title'      => 'required|string|max:255',
            'body'       => 'required|string|max:1000',
            'target'     => 'nullable|string|in:all,staff,driver',
            'action_url' => 'nullable|string|max:255',
        ]);

        $target = $request->input('target', 'all');
        $actionUrl = $request->input('action_url', '/dashboard');

        $query = \App\Models\PushSubscription::query();

        if ($target === 'staff') {
            $query->whereHas('user', function($q) {
                $q->where('role', 'like', '%employee%')->orWhere('role', 'like', '%admin%');
            });
        } elseif ($target === 'driver') {
            $query->whereHas('user', function($q) {
                $q->where('role', 'like', '%driver%');
            });
        }

        $subscriptions = $query->get();
        $subscriptionsCount = $subscriptions->count();

        if ($subscriptionsCount === 0) {
            return response()->json([
                'status' => 'error', 
                'message' => 'Tidak ada perangkat terdaftar yang cocok dengan target penerima yang dipilih.'
            ]);
        }

        try {
            app(\App\Services\WebPushService::class)->dispatch(
                $subscriptions,
                $request->input('title'),
                $request->input('body'),
                ['url' => $actionUrl]
            );
            $targetLabel = $target === 'staff' ? 'Staf & Karyawan' : ($target === 'driver' ? 'Sopir / Driver' : 'Semua Perangkat');
            return response()->json(['status' => 'success', 'message' => 'Push notifikasi berhasil disiarkan ke ' . $targetLabel . ' (' . $subscriptionsCount . ' perangkat).']);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Gagal mengirim notifikasi: ' . $e->getMessage()], 500);
        }
    }

    public function backupDb()
    {
        try {
            $pdo = \DB::connection()->getPdo();
            $driver = \DB::connection()->getDriverName();
            $tables = [];

            if ($driver === 'sqlite') {
                $result = $pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
                while ($row = $result->fetch(\PDO::FETCH_NUM)) {
                    $tables[] = $row[0];
                }
            } else {
                $result = $pdo->query('SHOW TABLES');
                while ($row = $result->fetch(\PDO::FETCH_NUM)) {
                    $tables[] = $row[0];
                }
            }

            $sql = "-- HRIS Enterprise Database Backup\n";
            $sql .= "-- Generated at: " . now()->toDateTimeString() . "\n";
            $sql .= "-- Driver: " . $driver . "\n\n";

            if ($driver === 'sqlite') {
                $sql .= "PRAGMA foreign_keys = OFF;\n\n";
            } else {
                $sql .= "SET FOREIGN_KEY_CHECKS = 0;\n\n";
            }

            foreach ($tables as $table) {
                // Get table structure
                if ($driver === 'sqlite') {
                    $stmt = $pdo->query("SELECT sql FROM sqlite_master WHERE type='table' AND name = " . $pdo->quote($table));
                    $createRow = $stmt->fetch(\PDO::FETCH_NUM);
                    $sql .= "DROP TABLE IF EXISTS `{$table}`;\n";
                    $sql .= $createRow[0] . ";\n\n";
                } else {
                    $stmt = $pdo->query("SHOW CREATE TABLE `{$table}`");
                    $createRow = $stmt->fetch(\PDO::FETCH_NUM);
                    $sql .= "DROP TABLE IF EXISTS `{$table}`;\n";
                    $sql .= $createRow[1] . ";\n\n";
                }

                // Get table data
                $dataStmt = $pdo->query("SELECT * FROM `{$table}`");
                $rows = $dataStmt->fetchAll(\PDO::FETCH_ASSOC);

                if (count($rows) > 0) {
                    $sql .= "-- Dumping data for table `{$table}`\n";
                    foreach ($rows as $row) {
                        $keys = array_map(function($key) {
                            return "`{$key}`";
                        }, array_keys($row));
                        
                        $values = array_map(function($value) use ($pdo) {
                            if (is_null($value)) {
                                return 'NULL';
                            }
                            return $pdo->quote($value);
                        }, array_values($row));

                        $sql .= "INSERT INTO `{$table}` (" . implode(', ', $keys) . ") VALUES (" . implode(', ', $values) . ");\n";
                    }
                    $sql .= "\n";
                }
            }

            if ($driver === 'sqlite') {
                $sql .= "PRAGMA foreign_keys = ON;\n";
            } else {
                $sql .= "SET FOREIGN_KEY_CHECKS = 1;\n";
            }

            // Create temporary zip file
            $zip = new \ZipArchive();
            $zipFileName = tempnam(sys_get_temp_dir(), 'hris_backup_') . '.zip';
            
            if ($zip->open($zipFileName, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
                return back()->with('error', 'Gagal membuat file ZIP di server.');
            }

            // Add database.sql file
            $zip->addFromString('database.sql', $sql);

            // Add files from storage/app/public/ recursively
            $storagePath = storage_path('app/public');
            if (file_exists($storagePath)) {
                $files = new \RecursiveIteratorIterator(
                    new \RecursiveDirectoryIterator($storagePath),
                    \RecursiveIteratorIterator::LEAVES_ONLY
                );

                foreach ($files as $name => $file) {
                    if (!$file->isDir()) {
                        $filePath = $file->getRealPath();
                        // Relative path inside zip
                        $relativePath = 'storage/' . substr($filePath, strlen($storagePath) + 1);
                        // Standardize slash to forward slash
                        $relativePath = str_replace('\\', '/', $relativePath);
                        $zip->addFile($filePath, $relativePath);
                    }
                }
            }

            $zip->close();

            $downloadName = 'hris_backup_' . now()->format('Y-m-d_His') . '.zip';

            return response()->download($zipFileName, $downloadName)->deleteFileAfterSend(true);
                
        } catch (\Exception $e) {
            return back()->with('error', 'Gagal membackup aplikasi: ' . $e->getMessage());
        }
    }

    public function restoreDb(Request $request)
    {
        $request->validate([
            'backup_file' => 'required|file|mimes:zip|max:102400', // max 100MB
        ]);

        try {
            $file = $request->file('backup_file');
            $zip = new \ZipArchive();
            
            if ($zip->open($file->getRealPath()) !== true) {
                return back()->with('error', 'Gagal membuka file ZIP.');
            }

            // 1. Get database.sql content and restore DB
            $sqlContent = $zip->getFromName('database.sql');
            if (!$sqlContent) {
                $zip->close();
                return back()->with('error', 'File database.sql tidak ditemukan di dalam arsip ZIP.');
            }

            $driver = \DB::connection()->getDriverName();

            // Execute SQL statements inside transaction with foreign key check disabled
            try {
                \DB::transaction(function() use ($sqlContent, $driver) {
                    if ($driver === 'sqlite') {
                        \DB::unprepared('PRAGMA foreign_keys = OFF;');
                    } else {
                        \DB::unprepared('SET FOREIGN_KEY_CHECKS = 0;');
                    }
                    
                    \DB::unprepared($sqlContent);
                    
                    if ($driver === 'sqlite') {
                        \DB::unprepared('PRAGMA foreign_keys = ON;');
                    } else {
                        \DB::unprepared('SET FOREIGN_KEY_CHECKS = 1;');
                    }
                });
            } catch (\Exception $dbEx) {
                $zip->close();
                return back()->with('error', 'Gagal merestore database: ' . $dbEx->getMessage());
            }

            // 2. Restore storage files
            $storagePath = storage_path('app/public');
            
            // Loop files inside ZIP
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $stat = $zip->statIndex($i);
                $zipFilePath = $stat['name'];

                // Check if file is inside 'storage/' directory
                if (strpos($zipFilePath, 'storage/') === 0) {
                    // Extract file path
                    $relativeFilePath = substr($zipFilePath, strlen('storage/'));
                    $destinationPath = $storagePath . '/' . $relativeFilePath;

                    // Ensure target directory exists
                    $dir = dirname($destinationPath);
                    if (!file_exists($dir)) {
                        mkdir($dir, 0755, true);
                    }

                    // Extract file content and save
                    $content = $zip->getFromIndex($i);
                    file_put_contents($destinationPath, $content);
                }
            }

            $zip->close();

            return back()->with('success', 'Aplikasi berhasil di-restore! Database dan file media telah dipulihkan.');
        } catch (\Exception $e) {
            return back()->with('error', 'Gagal merestore aplikasi: ' . $e->getMessage());
        }
    }

    public function resetApp()
    {
        try {
            \DB::transaction(function() {
                $driver = \DB::connection()->getDriverName();
                // Disable foreign key checks
                if ($driver === 'sqlite') {
                    \DB::statement('PRAGMA foreign_keys = OFF;');
                } else {
                    \DB::statement('SET FOREIGN_KEY_CHECKS = 0;');
                }

                // 1. Truncate transactional tables
                \App\Models\Attendance::truncate();
                \App\Models\Payroll::truncate();
                \App\Models\Leave::truncate();
                \App\Models\OvertimeRequest::truncate();
                \App\Models\ShiftExchangeRequest::truncate();
                \App\Models\UserShift::truncate();
                \App\Models\Shift::truncate();
                \App\Models\ShipmentLog::truncate();
                \App\Models\Shipment::truncate();
                \App\Models\PushSubscription::truncate();
                \Illuminate\Support\Facades\DB::table('notifications')->truncate();
                
                // Clear sessions except current admin session
                \Illuminate\Support\Facades\DB::table('sessions')
                    ->where('id', '!=', session()->getId())
                    ->delete();
                    
                \Illuminate\Support\Facades\DB::table('cache')->truncate();

                // 2. Clear HPP related tables
                \App\Models\Material::truncate();
                \App\Models\Product::truncate();
                \Illuminate\Support\Facades\DB::table('product_materials')->truncate();
                \App\Models\OverheadCost::truncate();
                \App\Models\Business::truncate();

                // 3. Clear non-admin users, keeping only admin@hris.com
                \App\Models\User::where('email', '!=', 'admin@hris.com')->delete();

                // 4. Ensure admin@hris.com user exists and has admin privileges
                $admin = \App\Models\User::where('email', 'admin@hris.com')->first();
                if ($admin) {
                    $admin->update([
                        'role' => 'admin',
                        'status' => \App\Enums\UserStatus::active,
                    ]);
                } else {
                    \App\Models\User::create([
                        'name' => 'HR Admin Utama',
                        'email' => 'admin@hris.com',
                        'nip' => 'HR-0001',
                        'phone' => '081234567890',
                        'role' => 'admin',
                        'status' => \App\Enums\UserStatus::active,
                        'password' => \Illuminate\Support\Facades\Hash::make('password'),
                        'email_verified_at' => now(),
                    ]);
                }

                // 5. Default geofence
                \App\Models\Geofence::where('name', '!=', 'Kantor Pusat Jakarta (Monas)')->delete();
                \App\Models\Geofence::firstOrCreate(
                    ['name' => 'Kantor Pusat Jakarta (Monas)'],
                    [
                        'latitude' => -6.175392,
                        'longitude' => 106.827153,
                        'radius' => 150.00,
                        'work_start_time' => '08:00:00',
                        'work_end_time' => '17:00:00',
                        'is_active' => true,
                    ]
                );

                // 6. Default branch
                \App\Models\Branch::where('name', '!=', 'Kantor Pusat Jakarta (Monas)')->delete();
                \App\Models\Branch::firstOrCreate(
                    ['name' => 'Kantor Pusat Jakarta (Monas)'],
                    [
                        'address' => 'Gudang Pusat Jakarta, Kawasan Monas, Jakarta Pusat',
                        'latitude' => -6.175392,
                        'longitude' => 106.827153,
                        'is_active' => true,
                    ]
                );

                // Enable foreign key checks
                if ($driver === 'sqlite') {
                    \DB::statement('PRAGMA foreign_keys = ON;');
                } else {
                    \DB::statement('SET FOREIGN_KEY_CHECKS = 1;');
                }
            });

            // 7. Delete files in storage/app/public/ recursively, except the 'settings' folder
            $storagePath = storage_path('app/public');
            if (file_exists($storagePath)) {
                $dir = new \DirectoryIterator($storagePath);
                foreach ($dir as $fileinfo) {
                    if ($fileinfo->isDir() && !$fileinfo->isDot()) {
                        $folderName = $fileinfo->getFilename();
                        // Ignore settings folder
                        if ($folderName !== 'settings') {
                            $this->deleteDirectoryRecursive($fileinfo->getPathname());
                        }
                    } elseif ($fileinfo->isFile()) {
                        @unlink($fileinfo->getPathname());
                    }
                }
            }

            return back()->with('success', 'Aplikasi berhasil dikosongkan. Data transaksi dan file media dibersihkan, admin@hris.com dipertahankan.');
        } catch (\Exception $e) {
            return back()->with('error', 'Gagal mengosongkan aplikasi: ' . $e->getMessage());
        }
    }

    private function deleteDirectoryRecursive($dirPath)
    {
        if (!is_dir($dirPath)) {
            return;
        }
        $files = array_diff(scandir($dirPath), ['.', '..']);
        foreach ($files as $file) {
            $filePath = $dirPath . '/' . $file;
            (is_dir($filePath)) ? $this->deleteDirectoryRecursive($filePath) : @unlink($filePath);
        }
        return @rmdir($dirPath);
    }
}
