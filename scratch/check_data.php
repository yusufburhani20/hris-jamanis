<?php
// We should use artisan tinker or a proper command if we want access to models easily.
// But let's just use a simple artisan command to output data.
// Or just fix the require paths.
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->handle(Illuminate\Http\Request::capture());

use App\Models\AcademicYear;
use App\Models\AcademicClass;

echo "--- DIAGNOSIS ---\n";
$activeYears = AcademicYear::where('is_active', true)->get();
echo "Active Years: " . $activeYears->count() . "\n";
foreach($activeYears as $y) echo "- ID: {$y->id}, Name: {$y->name}\n";

$totalClasses = AcademicClass::count();
echo "Total Classes: $totalClasses\n";

$classesInActiveYear = AcademicClass::whereHas('academicYear', function($q){
    $q->where('is_active', true);
})->get();
echo "Classes in Active Year: " . $classesInActiveYear->count() . "\n";
foreach($classesInActiveYear as $c) echo "- ID: {$c->id}, Name: {$c->name}, YearID: {$c->academic_year_id}\n";
