<?php

namespace Tests\Feature;

use App\Models\Shift;
use App\Models\User;
use App\Models\UserShift;
use App\Models\Setting;
use App\Models\Attendance;
use App\Models\Geofence;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;
use Carbon\Carbon;

class AttendanceToleranceTest extends TestCase
{
    use DatabaseTransactions;

    protected $employee;
    protected $shift;

    protected function setUp(): void
    {
        parent::setUp();

        $this->employee = User::create([
            'name' => 'Employee Test',
            'email' => 'employee_test_' . uniqid() . '@test.com',
            'password' => bcrypt('password'),
            'role' => 'employee',
        ]);

        $this->shift = Shift::create([
            'name' => 'Pagi 06-16',
            'code' => 'P06',
            'start_time' => '06:00:00',
            'end_time' => '16:00:00',
        ]);

        UserShift::create([
            'user_id' => $this->employee->id,
            'shift_id' => $this->shift->id,
            'start_date' => Carbon::today()->toDateString(),
            'end_date' => Carbon::today()->toDateString(),
        ]);

        Geofence::query()->update(['is_active' => false]);
    }

    public function test_late_tolerance_applied()
    {
        Setting::set('late_tolerance_minutes', 15);

        Carbon::setTestNow(Carbon::today()->setTime(6, 10, 0));

        $response = $this->actingAs($this->employee)->post(route('attendances.check-in'), [
            'latitude' => -6.200000,
            'longitude' => 106.800000,
            'photo_base64' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        ]);

        $response->assertStatus(302);
        
        $attendance = Attendance::where('user_id', $this->employee->id)->where('date', Carbon::today()->toDateString())->first();
        $this->assertNotNull($attendance);
        $this->assertEquals('hadir', $attendance->status->value);
    }

    public function test_late_exceeding_tolerance()
    {
        Setting::set('late_tolerance_minutes', 15);

        Carbon::setTestNow(Carbon::today()->setTime(6, 16, 0));

        $response = $this->actingAs($this->employee)->post(route('attendances.check-in'), [
            'latitude' => -6.200000,
            'longitude' => 106.800000,
            'photo_base64' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        ]);

        $response->assertStatus(302);

        $attendance = Attendance::where('user_id', $this->employee->id)->where('date', Carbon::today()->toDateString())->first();
        $this->assertNotNull($attendance);
        $this->assertEquals('terlambat', $attendance->status->value);
    }

    public function test_early_checkin_adjusts_effective_end_time()
    {
        Setting::set('early_checkin_tolerance_minutes', 120);

        Carbon::setTestNow(Carbon::today()->setTime(5, 0, 0));

        $this->actingAs($this->employee)->post(route('attendances.check-in'), [
            'latitude' => -6.200000,
            'longitude' => 106.800000,
            'photo_base64' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        ]);

        Carbon::setTestNow(Carbon::today()->setTime(15, 0, 0));

        $response = $this->actingAs($this->employee)->post(route('attendances.check-out'), [
            'latitude' => -6.200000,
            'longitude' => 106.800000,
            'photo_base64' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        ]);

        $response->assertStatus(302);

        $attendance = Attendance::where('user_id', $this->employee->id)->where('date', Carbon::today()->toDateString())->first();
        $this->assertNotNull($attendance);
        $this->assertNotEquals('pulang_awal', $attendance->status->value);
        $this->assertEquals('hadir', $attendance->status->value);
    }
}
