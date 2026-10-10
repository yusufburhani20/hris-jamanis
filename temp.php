<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$count = \App\Models\Attendance::count();
echo "Total: " . $count . "\n";

$dates = \App\Models\Attendance::select('date')->distinct()->get();
echo "Dates:\n";
print_r($dates->pluck('date')->toArray());
