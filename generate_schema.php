<?php

$migrationsDir = __DIR__ . '/database/migrations/';
$files = glob($migrationsDir . '*.php');

$schemas = [
    'users' => <<<PHP
            \$table->id();
            \$table->string('name');
            \$table->string('email')->unique();
            \$table->string('nip')->unique()->nullable();
            \$table->string('phone')->nullable();
            \$table->text('address')->nullable();
            \$table->string('avatar')->nullable();
            \$table->enum('status', ['active', 'inactive', 'suspended'])->default('active');
            \$table->timestamp('email_verified_at')->nullable();
            \$table->string('password');
            \$table->rememberToken();
            \$table->timestamp('last_login_at')->nullable();
            \$table->string('last_login_ip')->nullable();
            \$table->timestamps();
PHP,
    'academic_years' => <<<PHP
            \$table->id();
            \$table->string('name'); // e.g. 2024/2025
            \$table->boolean('is_active')->default(false);
            \$table->timestamps();
PHP,
    'semesters' => <<<PHP
            \$table->id();
            \$table->foreignId('academic_year_id')->constrained()->onDelete('cascade');
            \$table->string('name'); // Ganjil, Genap
            \$table->boolean('is_active')->default(false);
            \$table->date('start_date');
            \$table->date('end_date');
            \$table->timestamps();
PHP,
    'academic_classes' => <<<PHP
            \$table->id();
            \$table->foreignId('academic_year_id')->constrained()->onDelete('cascade');
            \$table->string('name');
            \$table->string('level'); 
            \$table->foreignId('homeroom_teacher_id')->nullable()->constrained('users')->nullOnDelete(); // wali kelas
            \$table->timestamps();
PHP,
    'students' => <<<PHP
            \$table->id();
            \$table->string('nisn')->unique();
            \$table->string('nis')->unique()->nullable();
            \$table->string('name');
            \$table->enum('gender', ['L', 'P']);
            \$table->string('birth_place')->nullable();
            \$table->date('birth_date')->nullable();
            \$table->string('religion')->nullable();
            \$table->text('address')->nullable();
            \$table->string('phone')->nullable();
            \$table->string('parent_name')->nullable();
            \$table->string('parent_phone')->nullable();
            \$table->enum('status', ['active', 'graduated', 'transferred', 'dropped_out'])->default('active');
            \$table->timestamps();
PHP,
    'class_members' => <<<PHP
            \$table->id();
            \$table->foreignId('class_id')->constrained('academic_classes')->onDelete('cascade');
            \$table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            \$table->boolean('is_active')->default(true);
            \$table->timestamps();
PHP,
    'schedules' => <<<PHP
            \$table->id();
            \$table->foreignId('class_id')->constrained('academic_classes')->onDelete('cascade');
            \$table->foreignId('teacher_id')->constrained('users')->onDelete('cascade');
            \$table->string('subject');
            \$table->enum('day', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
            \$table->time('start_time');
            \$table->time('end_time');
            \$table->timestamps();
PHP,
    'geofences' => <<<PHP
            \$table->id();
            \$table->string('name');
            \$table->decimal('latitude', 10, 8);
            \$table->decimal('longitude', 11, 8);
            \$table->integer('radius'); // in meters
            \$table->boolean('is_active')->default(true);
            \$table->timestamps();
PHP,
    'attendances' => <<<PHP
            \$table->id();
            \$table->foreignId('user_id')->constrained()->onDelete('cascade');
            \$table->date('date');
            \$table->time('check_in')->nullable();
            \$table->time('check_out')->nullable();
            \$table->enum('status', ['hadir', 'izin', 'sakit', 'alpha', 'terlambat']);
            \$table->string('device_id')->nullable();
            \$table->string('ip_address')->nullable();
            \$table->decimal('latitude', 10, 8)->nullable();
            \$table->decimal('longitude', 11, 8)->nullable();
            \$table->string('photo_path')->nullable(); // selfie
            \$table->enum('verification_status', ['valid', 'pending', 'rejected', 'system_flagged'])->default('pending');
            \$table->text('system_notes')->nullable();
            \$table->timestamps();
PHP,
    'student_attendances' => <<<PHP
            \$table->id();
            \$table->foreignId('schedule_id')->constrained('schedules')->onDelete('cascade');
            \$table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            \$table->foreignId('recorded_by')->constrained('users')->onDelete('cascade'); // guru yang absen
            \$table->date('date');
            \$table->enum('status', ['hadir', 'izin', 'sakit', 'alpha', 'terlambat']);
            \$table->text('notes')->nullable();
            \$table->timestamps();
PHP,
    'class_agendas' => <<<PHP
            \$table->id();
            \$table->foreignId('schedule_id')->constrained('schedules')->onDelete('cascade');
            \$table->foreignId('teacher_id')->constrained('users')->onDelete('cascade');
            \$table->date('date');
            \$table->string('topic');
            \$table->text('activities');
            \$table->text('student_tasks')->nullable();
            \$table->string('attachment_path')->nullable();
            \$table->enum('status', ['draft', 'published'])->default('published');
            \$table->timestamps();
PHP,
    'student_consultations' => <<<PHP
            \$table->id();
            \$table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            \$table->foreignId('teacher_id')->constrained('users')->onDelete('cascade'); // guru wali
            \$table->foreignId('class_id')->constrained('academic_classes')->onDelete('cascade');
            \$table->date('consultation_date');
            \$table->enum('category', ['akademik', 'perilaku', 'pribadi', 'karir', 'lainnya']);
            \$table->string('subject');
            \$table->text('problem_description');
            \$table->text('advice_given')->nullable();
            \$table->text('action_plan')->nullable();
            \$table->text('follow_up_notes')->nullable();
            \$table->date('follow_up_date')->nullable();
            \$table->enum('follow_up_status', ['pending', 'in_progress', 'completed'])->nullable();
            \$table->boolean('parent_contacted')->default(false);
            \$table->text('parent_feedback')->nullable();
            \$table->string('attachment_path')->nullable();
            \$table->enum('privacy_level', ['normal', 'confidential'])->default('normal');
            \$table->timestamps();
PHP,
    'permission_requests' => <<<PHP
            \$table->id();
            \$table->foreignId('user_id')->constrained()->onDelete('cascade');
            \$table->enum('type', ['sakit', 'izin', 'cuti', 'dispensasi']);
            \$table->date('start_date');
            \$table->date('end_date');
            \$table->text('reason');
            \$table->string('attachment_path')->nullable(); // surat keterangan dll
            \$table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            \$table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            \$table->timestamp('approved_at')->nullable();
            \$table->text('rejection_reason')->nullable();
            \$table->timestamps();
PHP,
    'inventory_categories' => <<<PHP
            \$table->id();
            \$table->string('code')->unique();
            \$table->string('name');
            \$table->text('description')->nullable();
            \$table->timestamps();
PHP,
    'inventory_items' => <<<PHP
            \$table->id();
            \$table->foreignId('category_id')->constrained('inventory_categories')->onDelete('cascade');
            \$table->string('code')->unique();
            \$table->string('name');
            \$table->text('description')->nullable();
            \$table->string('brand')->nullable();
            \$table->integer('total_quantity');
            \$table->decimal('unit_price', 15, 2)->nullable();
            \$table->enum('condition', ['baik', 'rusak_ringan', 'rusak_berat']);
            \$table->enum('status', ['tersedia', 'dipinjam', 'perbaikan', 'dihapus']);
            \$table->string('location')->nullable();
            \$table->string('image_path')->nullable();
            \$table->timestamps();
PHP,
    'inventory_barcodes' => <<<PHP
            \$table->id();
            \$table->foreignId('item_id')->constrained('inventory_items')->onDelete('cascade');
            \$table->string('barcode_value')->unique(); // unik untuk tiap SATUAN barang
            \$table->string('serial_number')->nullable();
            \$table->enum('condition', ['baik', 'rusak_ringan', 'rusak_berat'])->default('baik');
            \$table->enum('status', ['tersedia', 'dipinjam', 'perbaikan', 'dihapus'])->default('tersedia');
            \$table->timestamps();
PHP,
    'inventory_logs' => <<<PHP
            \$table->id();
            \$table->foreignId('item_id')->constrained('inventory_items')->onDelete('cascade');
            \$table->foreignId('barcode_id')->nullable()->constrained('inventory_barcodes')->onDelete('set null');
            \$table->foreignId('user_id')->constrained()->onDelete('cascade');
            \$table->enum('action', ['masuk', 'keluar', 'pinjam', 'kembali', 'perbaikan', 'pemusnahan']);
            \$table->integer('quantity');
            \$table->text('notes')->nullable();
            \$table->timestamps();
PHP,
];

foreach ($files as $file) {
    if (strpos($file, 'create_cache_table') !== false || strpos($file, 'create_jobs_table') !== false || strpos($file, 'permission_tables') !== false) {
        continue;
    }

    $tableName = '';
    foreach ($schemas as $key => $schema) {
        if (strpos($file, "create_{$key}_table") !== false) {
            $tableName = $key;
            break;
        }
    }

    if (!$tableName) {
        continue; // e.g. unknown migration
    }

    $content = "<?php\n\n" .
    "use Illuminate\\Database\\Migrations\\Migration;\n" .
    "use Illuminate\\Database\\Schema\\Blueprint;\n" .
    "use Illuminate\\Support\\Facades\\Schema;\n\n" .
    "return new class extends Migration\n" .
    "{\n" .
    "    public function up(): void\n" .
    "    {\n" .
    "        Schema::create('{$tableName}', function (Blueprint \$table) {\n" .
    $schemas[$tableName] . "\n" .
    "        });\n" .
    "    }\n\n" .
    "    public function down(): void\n" .
    "    {\n" .
    "        Schema::dropIfExists('{$tableName}');\n" .
    "    }\n" .
    "};\n";

    if ($tableName === 'users') {
        $content = "<?php\n\n" .
        "use Illuminate\\Database\\Migrations\\Migration;\n" .
        "use Illuminate\\Database\\Schema\\Blueprint;\n" .
        "use Illuminate\\Support\\Facades\\Schema;\n\n" .
        "return new class extends Migration\n" .
        "{\n" .
        "    public function up(): void\n" .
        "    {\n" .
        "        Schema::create('users', function (Blueprint \$table) {\n" .
        $schemas['users'] . "\n" .
        "        });\n\n" .
        "        Schema::create('password_reset_tokens', function (Blueprint \$table) {\n" .
        "            \$table->string('email')->primary();\n" .
        "            \$table->string('token');\n" .
        "            \$table->timestamp('created_at')->nullable();\n" .
        "        });\n\n" .
        "        Schema::create('sessions', function (Blueprint \$table) {\n" .
        "            \$table->string('id')->primary();\n" .
        "            \$table->foreignId('user_id')->nullable()->index();\n" .
        "            \$table->string('ip_address', 45)->nullable();\n" .
        "            \$table->text('user_agent')->nullable();\n" .
        "            \$table->longText('payload');\n" .
        "            \$table->integer('last_activity')->index();\n" .
        "        });\n" .
        "    }\n\n" .
        "    public function down(): void\n" .
        "    {\n" .
        "        Schema::dropIfExists('users');\n" .
        "        Schema::dropIfExists('password_reset_tokens');\n" .
        "        Schema::dropIfExists('sessions');\n" .
        "    }\n" .
        "};\n";
    }

    file_put_contents($file, $content);
    echo "Updated $tableName\n";
}
echo "Done.";
