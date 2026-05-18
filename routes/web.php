<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\Admin\GeofenceController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\AttendanceController as AdminAttendanceController;
use App\Http\Controllers\LeaveController;
use App\Http\Controllers\Admin\ShiftController;
use App\Http\Controllers\Admin\PayrollController as AdminPayrollController;
use App\Http\Controllers\PayrollController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return redirect()->route('login');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // --- EMPLOYEE ATTENDANCE ROUTES ---
    Route::get('/attendances/scanner', function (Illuminate\Http\Request $request) {
        $todayAttendance = \App\Models\Attendance::where('user_id', $request->user()->id)
            ->whereDate('date', today())
            ->first();
        $geofences = \App\Models\Geofence::where('is_active', true)->get();
        
        return Inertia::render('User/Attendances/Scanner', [
            'todayAttendance' => $todayAttendance,
            'geofences' => $geofences
        ]);
    })->name('attendances.scanner');
    
    Route::post('/attendances/check-in', [AttendanceController::class, 'checkIn'])->name('attendances.check-in');
    Route::post('/attendances/check-out', [AttendanceController::class, 'checkOut'])->name('attendances.check-out');

    // --- LEAVE & PERMIT ROUTES ---
    Route::get('/leaves', [LeaveController::class, 'index'])->name('leaves.index');
    Route::post('/leaves', [LeaveController::class, 'store'])->name('leaves.store');
    Route::delete('/leaves/{leave}', [LeaveController::class, 'destroy'])->name('leaves.destroy');

    // --- OVERTIME REQUESTS ROUTES ---
    Route::get('/overtimes', [\App\Http\Controllers\OvertimeRequestController::class, 'index'])->name('overtimes.index');
    Route::post('/overtimes', [\App\Http\Controllers\OvertimeRequestController::class, 'store'])->name('overtimes.store');
    Route::delete('/overtimes/{overtime}', [\App\Http\Controllers\OvertimeRequestController::class, 'destroy'])->name('overtimes.destroy');

    // --- EMPLOYEE PAYROLL ROUTES ---
    Route::get('/payrolls', [PayrollController::class, 'index'])->name('payrolls.index');
    Route::get('/payrolls/{payroll}/download', [PayrollController::class, 'downloadPdf'])->name('payrolls.download');

    // --- ADMIN GEOLOCATION HRIS MANAGEMENT ---
    Route::middleware(['role:admin'])->prefix('admin')->name('admin.')->group(function () {
        // Geofences CRUD
        Route::apiResource('geofences', GeofenceController::class)->except(['show']);
        
        // Employee Attendance Logs
        Route::get('/attendances', [AdminAttendanceController::class, 'index'])->name('attendances.index');
        Route::get('/attendances/export/excel', [AdminAttendanceController::class, 'exportExcel'])->name('attendances.export.excel');
        Route::get('/attendances/export/pdf', [AdminAttendanceController::class, 'exportPdf'])->name('attendances.export.pdf');

        // Employee Management (CRUD)
        Route::resource('users', UserController::class)->except(['show']);

        // Admin Leave Approval Desk
        Route::post('/leaves/{leave}/approve', [LeaveController::class, 'approve'])->name('leaves.approve');
        Route::post('/leaves/{leave}/reject', [LeaveController::class, 'reject'])->name('leaves.reject');

        // Admin Overtime Approval Desk
        Route::post('/overtimes/{overtime}/approve', [\App\Http\Controllers\OvertimeRequestController::class, 'approve'])->name('overtimes.approve');
        Route::post('/overtimes/{overtime}/reject', [\App\Http\Controllers\OvertimeRequestController::class, 'reject'])->name('overtimes.reject');

        // Admin Shift Management CRUD
        Route::resource('shifts', ShiftController::class)->except(['show']);
        Route::post('/shifts/assign', [ShiftController::class, 'assign'])->name('shifts.assign');
        Route::post('/shifts/assign-bulk', [ShiftController::class, 'assignBulk'])->name('shifts.assignBulk');
        Route::post('/shifts/remove-assignment', [ShiftController::class, 'removeAssignment'])->name('shifts.remove-assignment');

        // Admin Payroll Management
        Route::get('/payrolls', [AdminPayrollController::class, 'index'])->name('payrolls.index');
        Route::post('/payrolls/calculate', [AdminPayrollController::class, 'calculate'])->name('payrolls.calculate');
        Route::post('/payrolls/calculate-bulk', [AdminPayrollController::class, 'calculateBulk'])->name('payrolls.calculateBulk');
        Route::post('/payrolls/settings', [AdminPayrollController::class, 'saveSettings'])->name('payrolls.saveSettings');
        Route::put('/payrolls/{payroll}', [AdminPayrollController::class, 'update'])->name('payrolls.update');
        Route::post('/payrolls/{payroll}/pay', [AdminPayrollController::class, 'pay'])->name('payrolls.pay');
        Route::post('/payrolls/pay-bulk', [AdminPayrollController::class, 'payBulk'])->name('payrolls.payBulk');
        Route::delete('/payrolls/{payroll}', [AdminPayrollController::class, 'destroy'])->name('payrolls.destroy');
    });
});

require __DIR__.'/auth.php';
