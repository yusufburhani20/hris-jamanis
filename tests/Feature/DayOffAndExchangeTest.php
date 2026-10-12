<?php

namespace Tests\Feature;

use App\Models\DayOffExchange;
use App\Models\Geofence;
use App\Models\Shift;
use App\Models\User;
use App\Models\UserShift;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class DayOffAndExchangeTest extends TestCase
{
    use DatabaseTransactions;

    protected $admin;
    protected $employeeA;
    protected $employeeB;
    protected $dayOffShift;
    protected $regularShift;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'name' => 'Admin Test',
            'email' => 'admin_test_' . uniqid() . '@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => \App\Enums\UserStatus::active,
        ]);

        $this->employeeA = User::create([
            'name' => 'Karyawan A',
            'email' => 'employee_a_' . uniqid() . '@test.com',
            'password' => bcrypt('password'),
            'role' => 'employee',
            'status' => \App\Enums\UserStatus::active,
        ]);

        $this->employeeB = User::create([
            'name' => 'Karyawan B',
            'email' => 'employee_b_' . uniqid() . '@test.com',
            'password' => bcrypt('password'),
            'role' => 'employee',
            'status' => \App\Enums\UserStatus::active,
        ]);

        $this->dayOffShift = Shift::create([
            'name' => 'Shift Libur (OFF)',
            'code' => 'OFF_' . strtoupper(substr(uniqid(), 0, 5)),
            'start_time' => null,
            'end_time' => null,
            'is_dayoff' => true,
        ]);

        $this->regularShift = Shift::create([
            'name' => 'Shift Normal',
            'code' => 'NORM_' . strtoupper(substr(uniqid(), 0, 5)),
            'start_time' => '08:00:00',
            'end_time' => '17:00:00',
            'is_dayoff' => false,
        ]);

        Geofence::query()->update(['is_active' => false]);
    }

    public function test_checkin_is_blocked_when_on_day_off_shift()
    {
        $today = Carbon::today()->toDateString();

        UserShift::create([
            'user_id' => $this->employeeA->id,
            'shift_id' => $this->dayOffShift->id,
            'start_date' => $today,
            'end_date' => $today,
        ]);

        $response = $this->actingAs($this->employeeA)->post(route('attendances.check-in'), [
            'latitude' => -6.200000,
            'longitude' => 106.800000,
            'photo_base64' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        ]);

        $response->assertSessionHas('error');
        $this->assertDatabaseMissing('attendances', [
            'user_id' => $this->employeeA->id,
            'date' => $today,
        ]);
    }

    public function test_colleague_dayoffs_api_returns_structured_dates()
    {
        $date1 = Carbon::today()->addDays(2)->toDateString();
        $date2 = Carbon::today()->addDays(5)->toDateString();

        UserShift::create([
            'user_id' => $this->employeeB->id,
            'shift_id' => $this->dayOffShift->id,
            'start_date' => $date1,
            'end_date' => $date1,
        ]);

        UserShift::create([
            'user_id' => $this->employeeB->id,
            'shift_id' => $this->dayOffShift->id,
            'start_date' => $date2,
            'end_date' => $date2,
        ]);

        $response = $this->actingAs($this->employeeA)
            ->get(route('day-off-exchanges.colleague-dayoffs', $this->employeeB->id));

        $response->assertStatus(200);
        $data = $response->json();

        $this->assertCount(2, $data);
        $this->assertEquals($date1, $data[0]['date']);
        $this->assertEquals($date2, $data[1]['date']);
        $this->assertArrayHasKey('formatted', $data[0]);
        $this->assertArrayHasKey('shift_name', $data[0]);
    }

    public function test_day_off_exchange_flow_and_swap_execution()
    {
        $dateA = Carbon::today()->addDays(3)->toDateString();
        $dateB = Carbon::today()->addDays(6)->toDateString();

        // Karyawan A libur di dateA, kerja di dateB
        UserShift::create([
            'user_id' => $this->employeeA->id,
            'shift_id' => $this->dayOffShift->id,
            'start_date' => $dateA,
            'end_date' => $dateA,
        ]);
        UserShift::create([
            'user_id' => $this->employeeA->id,
            'shift_id' => $this->regularShift->id,
            'start_date' => $dateB,
            'end_date' => $dateB,
        ]);

        // Karyawan B kerja di dateA, libur di dateB
        UserShift::create([
            'user_id' => $this->employeeB->id,
            'shift_id' => $this->regularShift->id,
            'start_date' => $dateA,
            'end_date' => $dateA,
        ]);
        UserShift::create([
            'user_id' => $this->employeeB->id,
            'shift_id' => $this->dayOffShift->id,
            'start_date' => $dateB,
            'end_date' => $dateB,
        ]);

        // 1. Karyawan A mengajukan tukar libur dengan Karyawan B
        $response = $this->actingAs($this->employeeA)->post(route('day-off-exchanges.store'), [
            'target_user_id' => $this->employeeB->id,
            'requester_date' => $dateA,
            'target_date' => $dateB,
            'reason' => 'Ada keperluan keluarga mendesak',
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('day_off_exchanges', [
            'requester_id' => $this->employeeA->id,
            'target_user_id' => $this->employeeB->id,
            'requester_date' => $dateA,
            'target_date' => $dateB,
            'status' => 'pending',
        ]);

        $exchange = DayOffExchange::where('requester_id', $this->employeeA->id)->first();

        // 2. Admin menyetujui (Approve) pengajuan
        $approveResponse = $this->actingAs($this->admin)
            ->post(route('admin.day-off-exchanges.approve', $exchange->id));

        $approveResponse->assertSessionHasNoErrors();
        $this->assertEquals('approved', $exchange->fresh()->status);

        // 3. Verifikasi jadwal tertukar:
        // Pada dateA: Karyawan B harusnya LIBUR, Karyawan A MASUK KERJA
        $activeShiftA_on_dateA = $this->employeeA->fresh()->activeShift($dateA);
        $activeShiftB_on_dateA = $this->employeeB->fresh()->activeShift($dateA);
        $this->assertTrue((bool)$activeShiftB_on_dateA->is_dayoff, 'Karyawan B harusnya libur pada dateA');
        $this->assertFalse((bool)$activeShiftA_on_dateA->is_dayoff, 'Karyawan A harusnya masuk kerja pada dateA');

        // Pada dateB: Karyawan A harusnya LIBUR, Karyawan B MASUK KERJA
        $activeShiftA_on_dateB = $this->employeeA->fresh()->activeShift($dateB);
        $activeShiftB_on_dateB = $this->employeeB->fresh()->activeShift($dateB);
        $this->assertTrue((bool)$activeShiftA_on_dateB->is_dayoff, 'Karyawan A harusnya libur pada dateB');
        $this->assertFalse((bool)$activeShiftB_on_dateB->is_dayoff, 'Karyawan B harusnya masuk kerja pada dateB');
    }

    public function test_cannot_submit_duplicate_pending_exchange()
    {
        $dateA = Carbon::today()->addDays(4)->toDateString();
        $dateB = Carbon::today()->addDays(7)->toDateString();

        UserShift::create([
            'user_id' => $this->employeeA->id,
            'shift_id' => $this->dayOffShift->id,
            'start_date' => $dateA,
            'end_date' => $dateA,
        ]);

        UserShift::create([
            'user_id' => $this->employeeB->id,
            'shift_id' => $this->dayOffShift->id,
            'start_date' => $dateB,
            'end_date' => $dateB,
        ]);

        // Submit first
        $this->actingAs($this->employeeA)->post(route('day-off-exchanges.store'), [
            'target_user_id' => $this->employeeB->id,
            'requester_date' => $dateA,
            'target_date' => $dateB,
            'reason' => 'Pertukaran pertama',
        ]);

        // Submit second with same dateA
        $response = $this->actingAs($this->employeeA)->post(route('day-off-exchanges.store'), [
            'target_user_id' => $this->employeeB->id,
            'requester_date' => $dateA,
            'target_date' => $dateB,
            'reason' => 'Mencoba pengajuan ganda',
        ]);

        $response->assertSessionHasErrors(['requester_date']);
    }

    public function test_payroll_synchronization_with_shift_day_off()
    {
        $now = Carbon::today();
        $month = $now->month;
        $year = $now->year;
        $startDate = $now->copy()->startOfMonth();
        $endDate = $now->copy()->endOfMonth();

        // Tugaskan 2 hari shift libur dalam bulan ini
        $offDate1 = $startDate->copy()->addDays(5)->toDateString();
        $offDate2 = $startDate->copy()->addDays(12)->toDateString();

        UserShift::create([
            'user_id' => $this->employeeA->id,
            'shift_id' => $this->dayOffShift->id,
            'start_date' => $offDate1,
            'end_date' => $offDate1,
        ]);
        UserShift::create([
            'user_id' => $this->employeeA->id,
            'shift_id' => $this->dayOffShift->id,
            'start_date' => $offDate2,
            'end_date' => $offDate2,
        ]);

        // Berikan absensi hadir untuk semua hari kerja sebelum hari ini (kecuali 2 hari libur)
        $today = Carbon::today();
        $temp = $startDate->copy();
        while ($temp->lte($today)) {
            $dateStr = $temp->toDateString();
            if ($dateStr !== $offDate1 && $dateStr !== $offDate2) {
                \App\Models\Attendance::create([
                    'user_id' => $this->employeeA->id,
                    'date' => $dateStr,
                    'check_in' => '08:00:00',
                    'check_out' => '17:00:00',
                    'status' => 'hadir',
                ]);
            }
            $temp->addDay();
        }

        // Hitung payroll
        $payroll = \App\Models\Payroll::calculateForUser($this->employeeA->id, $month, $year, $startDate, $endDate);

        // Pada 2 hari jadwal shift libur, karyawan tidak dihitung mangkir
        $this->assertEquals(0, $payroll->absent_days, 'Hari shift libur tidak boleh dihitung sebagai mangkir');
        
        // Sisa kuota 1 hari libur yang tidak diambil (kuota 3 - ambil 2 = 1) otomatis dikonversi jadi 10 jam lembur
        $this->assertEquals(10, $payroll->overtime_hours, 'Sisa 1 hari libur harus dihitung sebagai 10 jam lembur');
    }
}
