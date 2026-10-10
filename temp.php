<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$checkIn = \Carbon\Carbon::createFromFormat('H:i:s', '11:45:49');
$shiftStart = \Carbon\Carbon::createFromFormat('H:i:s', '08:00:00');

$diff1 = $checkIn->diffInMinutes($shiftStart);
$diff2 = $shiftStart->diffInMinutes($checkIn);
$diff3 = $checkIn->diffInMinutes($shiftStart, false);

echo "diff1: $diff1, diff2: $diff2, diff3: $diff3\n";
