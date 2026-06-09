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
use App\Http\Controllers\Admin\Hpp\HppDashboardController;
use App\Http\Controllers\Admin\Hpp\HppBusinessController;
use App\Http\Controllers\Admin\Hpp\HppMaterialController;
use App\Http\Controllers\Admin\Hpp\HppOverheadController;
use App\Http\Controllers\Admin\Hpp\HppProductController;
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
    Route::get('/attendances/history', [AttendanceController::class, 'history'])->name('attendances.history');

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

    // --- SHIPMENT & COURIER TRACKING ROUTES (Restricted to Admin & Driver) ---
    Route::middleware(['role:admin,driver'])->group(function () {
        Route::get('/shipments/track/{trackingNumber?}', [\App\Http\Controllers\ShipmentController::class, 'trackPage'])->name('shipments.track');
        Route::get('/shipments/courier/{trackingNumber}', [\App\Http\Controllers\ShipmentController::class, 'courierScanner'])->name('shipments.courier-scanner');
        Route::post('/shipments/{shipment}/update-gps', [\App\Http\Controllers\ShipmentController::class, 'updateGPS'])->name('shipments.update-gps');

        // --- COURIER SHIPMENTS DASHBOARD ROUTES ---
        Route::get('/courier/shipments', [\App\Http\Controllers\Courier\CourierShipmentController::class, 'index'])->name('courier.shipments.index');
        Route::post('/courier/update-location', [\App\Http\Controllers\Courier\CourierShipmentController::class, 'updateGlobalLocation'])->name('courier.update-location');
        Route::post('/courier/shipments/self-initiate', [\App\Http\Controllers\Courier\CourierShipmentController::class, 'storeSelfInitiated'])->name('courier.shipments.self-initiate');
        Route::get('/courier/shipments/{shipment}', [\App\Http\Controllers\Courier\CourierShipmentController::class, 'show'])->name('courier.shipments.show');
        Route::post('/courier/shipments/{shipment}/deliver', [\App\Http\Controllers\Courier\CourierShipmentController::class, 'deliver'])->name('courier.shipments.deliver');
    });

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

        // Settings Management
        Route::get('/settings', [\App\Http\Controllers\Admin\SettingController::class, 'index'])->name('settings.index');
        Route::post('/settings', [\App\Http\Controllers\Admin\SettingController::class, 'update'])->name('settings.update');
        Route::post('/settings/deploy', [\App\Http\Controllers\Admin\SettingController::class, 'systemUpdate'])->name('settings.deploy');
        Route::get('/settings/logs', [\App\Http\Controllers\Admin\SettingController::class, 'updateLogs'])->name('settings.logs');

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

        // Admin Shipment CRUD & Tracking Controls
        Route::get('/driver-monitor', [\App\Http\Controllers\Admin\ShipmentController::class, 'driverMonitor'])->name('driver-monitor');
        Route::get('/active-drivers', [\App\Http\Controllers\Admin\ShipmentController::class, 'activeDrivers'])->name('active-drivers');
        Route::resource('shipments', \App\Http\Controllers\Admin\ShipmentController::class);
        Route::post('/shipments/{shipment}/status', [\App\Http\Controllers\Admin\ShipmentController::class, 'updateStatus'])->name('shipments.update-status');
        Route::post('/shipments/{shipment}/log', [\App\Http\Controllers\Admin\ShipmentController::class, 'addLog'])->name('shipments.add-log');
        Route::post('/shipments/{shipment}/coords', [\App\Http\Controllers\Admin\ShipmentController::class, 'updateCourierCoords'])->name('shipments.coords');

        // Admin Branch CRUD
        Route::resource('branches', \App\Http\Controllers\Admin\BranchController::class)->except(['show']);

        // Admin HPP Calculation Module
        Route::prefix('hpp')->name('hpp.')->group(function () {
            Route::get('/dashboard', [HppDashboardController::class, 'index'])->name('dashboard');
            Route::post('/business', [HppBusinessController::class, 'store'])->name('business.store');
            Route::post('/products/simulate', [HppProductController::class, 'simulate'])->name('products.simulate');
            
            Route::resource('materials', HppMaterialController::class)->except(['show', 'create', 'edit']);
            Route::resource('overheads', HppOverheadController::class)->except(['show', 'create', 'edit']);
            Route::resource('products', HppProductController::class);
        });
    });
});

require __DIR__.'/auth.php';
