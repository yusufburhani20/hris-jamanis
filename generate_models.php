<?php

$enumDir = __DIR__ . '/app/Enums/';
if (!is_dir($enumDir)) {
    mkdir($enumDir, 0755, true);
}

// 1. GENERATE ENUMS
$enums = [
    'AttendanceStatus' => ['hadir' => 'Hadir', 'izin' => 'Izin', 'sakit' => 'Sakit', 'alpha' => 'Alpha', 'terlambat' => 'Terlambat'],
    'VerificationStatus' => ['valid' => 'Valid', 'pending' => 'Pending', 'rejected' => 'Rejected', 'system_flagged' => 'System Flagged'],
    'PermissionType' => ['sakit' => 'Sakit', 'izin' => 'Izin', 'cuti' => 'Cuti', 'dispensasi' => 'Dispensasi'],
    'PermissionStatus' => ['pending' => 'Pending', 'approved' => 'Approved', 'rejected' => 'Rejected'],
    'Gender' => ['L' => 'Laki-laki', 'P' => 'Perempuan'],
    'ConsultationCategory' => ['akademik' => 'Akademik', 'perilaku' => 'Perilaku', 'pribadi' => 'Pribadi', 'karir' => 'Karir', 'lainnya' => 'Lainnya'],
    'ConsultationPrivacy' => ['normal' => 'Normal', 'confidential' => 'Confidential'],
    'FollowUpStatus' => ['pending' => 'Pending', 'in_progress' => 'In Progress', 'completed' => 'Completed'],
    'InventoryCondition' => ['baik' => 'Baik', 'rusak_ringan' => 'Rusak Ringan', 'rusak_berat' => 'Rusak Berat'],
    'InventoryStatus' => ['tersedia' => 'Tersedia', 'dipinjam' => 'Dipinjam', 'perbaikan' => 'Perbaikan', 'dihapus' => 'Dihapus'],
    'InventoryAction' => ['masuk' => 'Masuk', 'keluar' => 'Keluar', 'pinjam' => 'Pinjam', 'kembali' => 'Kembali', 'perbaikan' => 'Perbaikan', 'pemusnahan' => 'Pemusnahan'],
    'UserStatus' => ['active' => 'Active', 'inactive' => 'Inactive', 'suspended' => 'Suspended'],
    'StudentStatus' => ['active' => 'Active', 'graduated' => 'Graduated', 'transferred' => 'Transferred', 'dropped_out' => 'Dropped Out'],
    'AgendaStatus' => ['draft' => 'Draft', 'published' => 'Published'],
    'DayOfWeek' => ['monday' => 'Monday', 'tuesday' => 'Tuesday', 'wednesday' => 'Wednesday', 'thursday' => 'Thursday', 'friday' => 'Friday', 'saturday' => 'Saturday', 'sunday' => 'Sunday'],
];

foreach ($enums as $enumName => $values) {
    $cases = "";
    foreach ($values as $key => $label) {
        $cases .= "    case {$key} = '{$key}';\n";
    }

    $content = "<?php\n\nnamespace App\Enums;\n\nenum {$enumName}: string\n{\n{$cases}\n    public function label(): string\n    {\n        return match(\$this) {\n";
    foreach ($values as $key => $label) {
        $content .= "            self::{$key} => '{$label}',\n";
    }
    $content .= "        };\n    }\n}\n";

    file_put_contents($enumDir . $enumName . '.php', $content);
}
echo "Enums generated.\n";

// 2. GENERATE MODELS AND RELATIONSHIPS
$modelsDir = __DIR__ . '/app/Models/';

$models = [
    'User' => "<?php\n\nnamespace App\Models;\n\nuse Illuminate\Database\Eloquent\Factories\HasFactory;\nuse Illuminate\Foundation\Auth\User as Authenticatable;\nuse Illuminate\Notifications\Notifiable;\nuse Spatie\Permission\Traits\HasRoles;\nuse App\Enums\UserStatus;\n\nclass User extends Authenticatable\n{\n    use HasFactory, Notifiable, HasRoles;\n\n    protected \$guarded = ['id'];\n    protected \$hidden = ['password', 'remember_token'];\n    protected \$casts = [\n        'email_verified_at' => 'datetime',\n        'password' => 'hashed',\n        'status' => UserStatus::class,\n        'last_login_at' => 'datetime',\n    ];\n\n    public function classesAsHomeroom()\n    {\n        return \$this->hasMany(AcademicClass::class, 'homeroom_teacher_id');\n    }\n\n    public function schedules()\n    {\n        return \$this->hasMany(Schedule::class, 'teacher_id');\n    }\n\n    public function attendances()\n    {\n        return \$this->hasMany(Attendance::class);\n    }\n\n    public function recordedStudentAttendances()\n    {\n        return \$this->hasMany(StudentAttendance::class, 'recorded_by');\n    }\n\n    public function classAgendas()\n    {\n        return \$this->hasMany(ClassAgenda::class, 'teacher_id');\n    }\n\n    public function studentConsultations()\n    {\n        return \$this->hasMany(StudentConsultation::class, 'teacher_id');\n    }\n\n    public function permissionRequests()\n    {\n        return \$this->hasMany(PermissionRequest::class);\n    }\n\n    public function approvedPermissions()\n    {\n        return \$this->hasMany(PermissionRequest::class, 'approved_by');\n    }\n\n    public function inventoryLogs()\n    {\n        return \$this->hasMany(InventoryLog::class);\n    }\n}\n",

    'AcademicYear' => "<?php\n\nnamespace App\Models;\n\nuse Illuminate\Database\Eloquent\Model;\n\nclass AcademicYear extends Model\n{\n    protected \$guarded = ['id'];\n\n    public function semesters()\n    {\n        return \$this->hasMany(Semester::class);\n    }\n\n    public function academicClasses()\n    {\n        return \$this->hasMany(AcademicClass::class);\n    }\n}\n",

    'Semester' => "<?php\n\nnamespace App\Models;\n\nuse Illuminate\Database\Eloquent\Model;\n\nclass Semester extends Model\n{\n    protected \$guarded = ['id'];\n    protected \$casts = [\n        'start_date' => 'date',\n        'end_date' => 'date',\n        'is_active' => 'boolean',\n    ];\n\n    public function academicYear()\n    {\n        return \$this->belongsTo(AcademicYear::class);\n    }\n}\n",

    'AcademicClass' => "<?php\n\nnamespace App\Models;\n\nuse Illuminate\Database\Eloquent\Model;\n\nclass AcademicClass extends Model\n{\n    protected \$guarded = ['id'];\n\n    public function academicYear()\n    {\n        return \$this->belongsTo(AcademicYear::class);\n    }\n\n    public function homeroomTeacher()\n    {\n        return \$this->belongsTo(User::class, 'homeroom_teacher_id');\n    }\n\n    public function students()\n    {\n        return \$this->belongsToMany(Student::class, 'class_members', 'class_id', 'student_id')->withPivot('is_active')->withTimestamps();\n    }\n\n    public function schedules()\n    {\n        return \$this->hasMany(Schedule::class, 'class_id');\n    }\n\n    public function studentConsultations()\n    {\n        return \$this->hasMany(StudentConsultation::class, 'class_id');\n    }\n}\n",

    'Student' => "<?php\n\nnamespace App\Models;\n\nuse Illuminate\Database\Eloquent\Model;\nuse App\Enums\Gender;\nuse App\Enums\StudentStatus;\n\nclass Student extends Model\n{\n    protected \$guarded = ['id'];\n    protected \$casts = [\n        'birth_date' => 'date',\n        'gender' => Gender::class,\n        'status' => StudentStatus::class,\n    ];\n\n    public function academicClasses()\n    {\n        return \$this->belongsToMany(AcademicClass::class, 'class_members', 'student_id', 'class_id')->withPivot('is_active')->withTimestamps();\n    }\n\n    public function attendances()\n    {\n        return \$this->hasMany(StudentAttendance::class);\n    }\n\n    public function consultations()\n    {\n        return \$this->hasMany(StudentConsultation::class);\n    }\n}\n",

    'ClassMember' => "<?php\n\nnamespace App\Models;\n\nuse Illuminate\Database\Eloquent\Model;\n\n// Usually Pivot models extend Illuminate\Database\Eloquent\Relations\Pivot, but this can also just be a normal model if we query it directly.\nclass ClassMember extends Model\n{\n    protected \$guarded = ['id'];\n    protected \$casts = [\n        'is_active' => 'boolean',\n    ];\n}\n",

    'Schedule' => "<?php\n\nnamespace App\Models;\n\nuse Illuminate\Database\Eloquent\Model;\nuse App\Enums\DayOfWeek;\n\nclass Schedule extends Model\n{\n    protected \$guarded = ['id'];\n    protected \$casts = [\n        'day' => DayOfWeek::class,\n    ];\n\n    public function academicClass()\n    {\n        return \$this->belongsTo(AcademicClass::class, 'class_id');\n    }\n\n    public function teacher()\n    {\n        return \$this->belongsTo(User::class, 'teacher_id');\n    }\n\n    public function classAgendas()\n    {\n        return \$this->hasMany(ClassAgenda::class);\n    }\n}\n",

    'Geofence' => "<?php\n\nnamespace App\Models;\n\nuse Illuminate\Database\Eloquent\Model;\n\nclass Geofence extends Model\n{\n    protected \$guarded = ['id'];\n    protected \$casts = [\n        'is_active' => 'boolean',\n        'latitude' => 'decimal:8',\n        'longitude' => 'decimal:8',\n    ];\n}\n",

    'Attendance' => "<?php\n\nnamespace App\Models;\n\nuse Illuminate\Database\Eloquent\Model;\nuse App\Enums\AttendanceStatus;\nuse App\Enums\VerificationStatus;\n\nclass Attendance extends Model\n{\n    protected \$guarded = ['id'];\n    protected \$casts = [\n        'date' => 'date',\n        'status' => AttendanceStatus::class,\n        'verification_status' => VerificationStatus::class,\n        'latitude' => 'decimal:8',\n        'longitude' => 'decimal:8',\n    ];\n\n    public function user()\n    {\n        return \$this->belongsTo(User::class);\n    }\n}\n",

    'StudentAttendance' => "<?php\n\nnamespace App\Models;\n\nuse Illuminate\Database\Eloquent\Model;\nuse App\Enums\AttendanceStatus;\n\nclass StudentAttendance extends Model\n{\n    protected \$guarded = ['id'];\n    protected \$casts = [\n        'date' => 'date',\n        'status' => AttendanceStatus::class,\n    ];\n\n    public function schedule()\n    {\n        return \$this->belongsTo(Schedule::class);\n    }\n\n    public function student()\n    {\n        return \$this->belongsTo(Student::class);\n    }\n\n    public function recordedBy()\n    {\n        return \$this->belongsTo(User::class, 'recorded_by');\n    }\n}\n",

    'ClassAgenda' => "<?php\n\nnamespace App\Models;\n\nuse Illuminate\Database\Eloquent\Model;\nuse App\Enums\AgendaStatus;\n\nclass ClassAgenda extends Model\n{\n    protected \$guarded = ['id'];\n    protected \$casts = [\n        'date' => 'date',\n        'status' => AgendaStatus::class,\n    ];\n\n    public function schedule()\n    {\n        return \$this->belongsTo(Schedule::class);\n    }\n\n    public function teacher()\n    {\n        return \$this->belongsTo(User::class, 'teacher_id');\n    }\n}\n",

    'StudentConsultation' => "<?php\n\nnamespace App\Models;\n\nuse Illuminate\Database\Eloquent\Model;\nuse App\Enums\ConsultationCategory;\nuse App\Enums\FollowUpStatus;\nuse App\Enums\ConsultationPrivacy;\n\nclass StudentConsultation extends Model\n{\n    protected \$guarded = ['id'];\n    protected \$casts = [\n        'consultation_date' => 'date',\n        'follow_up_date' => 'date',\n        'parent_contacted' => 'boolean',\n        'category' => ConsultationCategory::class,\n        'follow_up_status' => FollowUpStatus::class,\n        'privacy_level' => ConsultationPrivacy::class,\n    ];\n\n    public function student()\n    {\n        return \$this->belongsTo(Student::class);\n    }\n\n    public function homeroomTeacher()\n    {\n        return \$this->belongsTo(User::class, 'teacher_id');\n    }\n\n    public function academicClass()\n    {\n        return \$this->belongsTo(AcademicClass::class, 'class_id');\n    }\n}\n",

    'PermissionRequest' => "<?php\n\nnamespace App\Models;\n\nuse Illuminate\Database\Eloquent\Model;\nuse App\Enums\PermissionType;\nuse App\Enums\PermissionStatus;\n\nclass PermissionRequest extends Model\n{\n    protected \$guarded = ['id'];\n    protected \$casts = [\n        'start_date' => 'date',\n        'end_date' => 'date',\n        'type' => PermissionType::class,\n        'status' => PermissionStatus::class,\n        'approved_at' => 'datetime',\n    ];\n\n    public function user()\n    {\n        return \$this->belongsTo(User::class);\n    }\n\n    public function approvedBy()\n    {\n        return \$this->belongsTo(User::class, 'approved_by');\n    }\n}\n",

    'InventoryCategory' => "<?php\n\nnamespace App\Models;\n\nuse Illuminate\Database\Eloquent\Model;\n\nclass InventoryCategory extends Model\n{\n    protected \$guarded = ['id'];\n\n    public function items()\n    {\n        return \$this->hasMany(InventoryItem::class, 'category_id');\n    }\n}\n",

    'InventoryItem' => "<?php\n\nnamespace App\Models;\n\nuse Illuminate\Database\Eloquent\Model;\nuse App\Enums\InventoryCondition;\nuse App\Enums\InventoryStatus;\n\nclass InventoryItem extends Model\n{\n    protected \$guarded = ['id'];\n    protected \$casts = [\n        'condition' => InventoryCondition::class,\n        'status' => InventoryStatus::class,\n        'unit_price' => 'decimal:2',\n    ];\n\n    public function category()\n    {\n        return \$this->belongsTo(InventoryCategory::class, 'category_id');\n    }\n\n    public function barcodes()\n    {\n        return \$this->hasMany(InventoryBarcode::class, 'item_id');\n    }\n\n    public function logs()\n    {\n        return \$this->hasMany(InventoryLog::class, 'item_id');\n    }\n}\n",

    'InventoryBarcode' => "<?php\n\nnamespace App\Models;\n\nuse Illuminate\Database\Eloquent\Model;\nuse App\Enums\InventoryCondition;\nuse App\Enums\InventoryStatus;\n\nclass InventoryBarcode extends Model\n{\n    protected \$guarded = ['id'];\n    protected \$casts = [\n        'condition' => InventoryCondition::class,\n        'status' => InventoryStatus::class,\n    ];\n\n    public function item()\n    {\n        return \$this->belongsTo(InventoryItem::class, 'item_id');\n    }\n\n    public function logs()\n    {\n        return \$this->hasMany(InventoryLog::class, 'barcode_id');\n    }\n}\n",

    'InventoryLog' => "<?php\n\nnamespace App\Models;\n\nuse Illuminate\Database\Eloquent\Model;\nuse App\Enums\InventoryAction;\n\nclass InventoryLog extends Model\n{\n    protected \$guarded = ['id'];\n    protected \$casts = [\n        'action' => InventoryAction::class,\n    ];\n\n    public function item()\n    {\n        return \$this->belongsTo(InventoryItem::class, 'item_id');\n    }\n\n    public function barcode()\n    {\n        return \$this->belongsTo(InventoryBarcode::class, 'barcode_id');\n    }\n\n    public function user()\n    {\n        return \$this->belongsTo(User::class);\n    }\n}\n"
];

foreach ($models as $name => $content) {
    file_put_contents($modelsDir . $name . '.php', $content);
}
echo "Models generated.\n";
