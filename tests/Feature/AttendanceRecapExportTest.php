<?php

namespace Tests\Feature;

use App\Models\Shift;
use App\Models\User;
use App\Models\UserShift;
use App\Models\Setting;
use App\Models\Attendance;
use App\Models\Geofence;
use App\Exports\AttendanceExport;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;
use Carbon\Carbon;

class AttendanceRecapExportTest extends TestCase
{
    use DatabaseTransactions;

    protected $employee;
    protected $shift;

    protected function setUp(): void
    {
        parent::setUp();

        $this->employee = User::create([
            'name' => 'Budi Santoso',
            'email' => 'budi_' . uniqid() . '@test.com',
            'password' => bcrypt('password'),
            'role' => 'employee',
        ]);

        $this->shift = Shift::create([
            'name' => 'Shift Reguler 08-17',
            'code' => 'REG08',
            'start_time' => '08:00:00',
            'end_time' => '17:00:00',
            'is_dayoff' => false,
        ]);

        UserShift::create([
            'user_id' => $this->employee->id,
            'shift_id' => $this->shift->id,
            'start_date' => Carbon::today()->subDays(30)->toDateString(),
            'end_date' => Carbon::today()->addDays(30)->toDateString(),
        ]);
    }

    public function test_late_details_displayed_when_status_terlambat()
    {
        $att = Attendance::create([
            'user_id' => $this->employee->id,
            'date' => Carbon::today()->toDateString(),
            'check_in' => '08:45:00',
            'check_out' => '17:00:00',
            'status' => 'terlambat',
            'verification_status' => 'valid',
        ]);

        $this->assertNotNull($att->late_details);
        $this->assertEquals('45m', $att->late_details['text']);
    }

    public function test_late_details_works_with_hi_format_without_seconds()
    {
        $att = Attendance::create([
            'user_id' => $this->employee->id,
            'date' => Carbon::today()->toDateString(),
            'check_in' => '08:35', // No seconds!
            'check_out' => '17:00',
            'status' => 'terlambat',
            'verification_status' => 'valid',
        ]);

        $this->assertNotNull($att->late_details, 'Late details should not be null when check_in is H:i format');
        $this->assertEquals('35m', $att->late_details['text']);
    }

    public function test_overtime_details_displayed_even_under_60_minutes_when_status_lembur()
    {
        // Default overtime tolerance is 60 minutes, but user worked 30 mins overtime
        Setting::set('overtime_tolerance_minutes', 60);

        $att = Attendance::create([
            'user_id' => $this->employee->id,
            'date' => Carbon::today()->toDateString(),
            'check_in' => '08:00:00',
            'check_out' => '17:30:00', // 30 minutes overtime
            'status' => 'lembur',
            'verification_status' => 'valid',
        ]);

        $this->assertNotNull($att->overtime_details, 'Overtime details should not be null for status lembur even if < 60 mins');
        $this->assertEquals('30m', $att->overtime_details['text']);
    }

    public function test_early_leave_details_displayed_when_status_pulang_awal()
    {
        $att = Attendance::create([
            'user_id' => $this->employee->id,
            'date' => Carbon::today()->toDateString(),
            'check_in' => '08:00:00',
            'check_out' => '15:30:00', // 1h 30m early
            'status' => 'pulang_awal',
            'verification_status' => 'valid',
        ]);

        $this->assertNotNull($att->early_leave_details);
        $this->assertEquals('1j 30m', $att->early_leave_details['text']);
    }

    public function test_dual_status_late_and_overtime_both_show_difference()
    {
        // Arrived at 08:30 (late), stayed until 19:00 (overtime). Status became 'lembur'.
        $att = Attendance::create([
            'user_id' => $this->employee->id,
            'date' => Carbon::today()->toDateString(),
            'check_in' => '08:30:00',
            'check_out' => '19:00:00',
            'status' => 'lembur',
            'verification_status' => 'valid',
        ]);

        $this->assertNotNull($att->late_details, 'Late details should appear even if final status is lembur');
        $this->assertEquals('30m', $att->late_details['text']);

        $this->assertNotNull($att->overtime_details, 'Overtime details should appear for lembur');
        $this->assertEquals('2j 0m', $att->overtime_details['text']);
    }

    public function test_dual_status_late_and_early_leave_both_show_difference()
    {
        // Arrived at 08:30 (late), left at 15:00 (early). Status became 'pulang_awal'.
        $att = Attendance::create([
            'user_id' => $this->employee->id,
            'date' => Carbon::today()->toDateString(),
            'check_in' => '08:30:00',
            'check_out' => '15:00:00',
            'status' => 'pulang_awal',
            'verification_status' => 'valid',
        ]);

        $this->assertNotNull($att->late_details, 'Late details should appear even if final status is pulang_awal');
        $this->assertEquals('30m', $att->late_details['text']);

        $this->assertNotNull($att->early_leave_details, 'Early leave details should appear for pulang_awal');
        $this->assertEquals('2j 0m', $att->early_leave_details['text']);
    }

    public function test_late_details_fallback_when_no_active_shift_assigned()
    {
        // User with no user_shifts
        $noShiftUser = User::create([
            'name' => 'No Shift User',
            'email' => 'noshift_' . uniqid() . '@test.com',
            'password' => bcrypt('password'),
            'role' => 'employee',
        ]);

        // Active geofence with work_start_time = 08:00:00
        Geofence::query()->update(['is_active' => false]);
        Geofence::create([
            'name' => 'Kantor Pusat',
            'latitude' => -6.2,
            'longitude' => 106.8,
            'radius' => 100,
            'is_active' => true,
            'work_start_time' => '08:00:00',
        ]);

        $att = Attendance::create([
            'user_id' => $noShiftUser->id,
            'date' => Carbon::today()->toDateString(),
            'check_in' => '08:40:00',
            'check_out' => '17:00:00',
            'status' => 'terlambat',
            'verification_status' => 'valid',
        ]);

        $this->assertNotNull($att->late_details, 'Late details should fallback to geofence work_start_time');
        $this->assertEquals('40m', $att->late_details['text']);
    }

    public function test_excel_and_pdf_view_render_with_attendance_differences()
    {
        $att = Attendance::create([
            'user_id' => $this->employee->id,
            'date' => Carbon::today()->toDateString(),
            'check_in' => '08:30:00',
            'check_out' => '19:00:00',
            'status' => 'lembur',
            'verification_status' => 'valid',
        ]);

        $export = new AttendanceExport(
            Carbon::today()->startOfMonth()->toDateString(),
            Carbon::today()->endOfMonth()->toDateString(),
            $this->employee->id
        );

        $view = $export->view();
        $rendered = $view->render();

        $this->assertStringContainsString('Budi Santoso', $rendered);
        $this->assertStringContainsString('30m', $rendered, 'Rendered excel should contain late duration');
        $this->assertStringContainsString('2j 0m', $rendered, 'Rendered excel should contain overtime duration');
    }
}
