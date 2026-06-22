<?php

namespace Tests\Feature;

use App\Models\Shift;
use App\Models\User;
use App\Models\UserShift;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class ShiftOverlapTest extends TestCase
{
    use DatabaseTransactions;

    protected $admin;
    protected $employee;
    protected $shiftA;
    protected $shiftB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
        ]);

        $this->employee = User::create([
            'name' => 'Employee User',
            'email' => 'employee@test.com',
            'password' => bcrypt('password'),
            'role' => 'employee',
        ]);

        $this->shiftA = Shift::create([
            'name' => 'Shift A',
            'code' => 'SHA',
            'start_time' => '08:00',
            'end_time' => '17:00',
        ]);

        $this->shiftB = Shift::create([
            'name' => 'Shift B',
            'code' => 'SHB',
            'start_time' => '17:00',
            'end_time' => '01:00',
        ]);
    }

    /**
     * Test Case 1: The new shift completely covers the existing shift.
     * E.g., [S_n, E_n] contains [S_e, E_e].
     * Exists: June 5 - June 15
     * New: June 1 - June 20
     * Result: Exists is deleted.
     */
    public function test_new_shift_completely_covers_existing()
    {
        UserShift::create([
            'user_id' => $this->employee->id,
            'shift_id' => $this->shiftA->id,
            'start_date' => '2026-06-05',
            'end_date' => '2026-06-15',
        ]);

        $response = $this->actingAs($this->admin)->post(route('admin.shifts.assign'), [
            'user_id' => $this->employee->id,
            'shift_id' => $this->shiftB->id,
            'start_date' => '2026-06-01',
            'end_date' => '2026-06-20',
        ]);

        $response->assertStatus(302);
        
        $this->assertDatabaseHas('user_shifts', [
            'user_id' => $this->employee->id,
            'shift_id' => $this->shiftB->id,
            'start_date' => '2026-06-01',
            'end_date' => '2026-06-20',
        ]);

        $this->assertDatabaseMissing('user_shifts', [
            'shift_id' => $this->shiftA->id,
        ]);
    }

    /**
     * Test Case 2: The new shift is strictly inside the existing shift (split).
     * Exists: June 1 - Indefinite (null)
     * New: June 10 - June 20
     * Result: Exists is split into June 1 - June 9, and June 21 - Indefinite (null).
     */
    public function test_new_shift_inside_existing_splits_existing()
    {
        UserShift::create([
            'user_id' => $this->employee->id,
            'shift_id' => $this->shiftA->id,
            'start_date' => '2026-06-01',
            'end_date' => null,
        ]);

        $response = $this->actingAs($this->admin)->post(route('admin.shifts.assign'), [
            'user_id' => $this->employee->id,
            'shift_id' => $this->shiftB->id,
            'start_date' => '2026-06-10',
            'end_date' => '2026-06-20',
        ]);

        $response->assertStatus(302);

        // Verify the split parts and the new assignment
        $this->assertDatabaseHas('user_shifts', [
            'user_id' => $this->employee->id,
            'shift_id' => $this->shiftA->id,
            'start_date' => '2026-06-01',
            'end_date' => '2026-06-09',
        ]);

        $this->assertDatabaseHas('user_shifts', [
            'user_id' => $this->employee->id,
            'shift_id' => $this->shiftB->id,
            'start_date' => '2026-06-10',
            'end_date' => '2026-06-20',
        ]);

        $this->assertDatabaseHas('user_shifts', [
            'user_id' => $this->employee->id,
            'shift_id' => $this->shiftA->id,
            'start_date' => '2026-06-21',
            'end_date' => null,
        ]);
    }

    /**
     * Test Case 3: The new shift overlaps the start of the existing shift.
     * Exists: June 10 - June 20
     * New: June 5 - June 15
     * Result: Exists is pushed to June 16 - June 20.
     */
    public function test_new_shift_overlaps_start_of_existing()
    {
        UserShift::create([
            'user_id' => $this->employee->id,
            'shift_id' => $this->shiftA->id,
            'start_date' => '2026-06-10',
            'end_date' => '2026-06-20',
        ]);

        $response = $this->actingAs($this->admin)->post(route('admin.shifts.assign'), [
            'user_id' => $this->employee->id,
            'shift_id' => $this->shiftB->id,
            'start_date' => '2026-06-05',
            'end_date' => '2026-06-15',
        ]);

        $response->assertStatus(302);

        $this->assertDatabaseHas('user_shifts', [
            'user_id' => $this->employee->id,
            'shift_id' => $this->shiftA->id,
            'start_date' => '2026-06-16',
            'end_date' => '2026-06-20',
        ]);

        $this->assertDatabaseHas('user_shifts', [
            'user_id' => $this->employee->id,
            'shift_id' => $this->shiftB->id,
            'start_date' => '2026-06-05',
            'end_date' => '2026-06-15',
        ]);
    }

    /**
     * Test Case 4: The new shift overlaps the end of the existing shift.
     * Exists: June 5 - June 15
     * New: June 10 - June 20
     * Result: Exists is pulled to June 5 - June 9.
     */
    public function test_new_shift_overlaps_end_of_existing()
    {
        UserShift::create([
            'user_id' => $this->employee->id,
            'shift_id' => $this->shiftA->id,
            'start_date' => '2026-06-05',
            'end_date' => '2026-06-15',
        ]);

        $response = $this->actingAs($this->admin)->post(route('admin.shifts.assign'), [
            'user_id' => $this->employee->id,
            'shift_id' => $this->shiftB->id,
            'start_date' => '2026-06-10',
            'end_date' => '2026-06-20',
        ]);

        $response->assertStatus(302);

        $this->assertDatabaseHas('user_shifts', [
            'user_id' => $this->employee->id,
            'shift_id' => $this->shiftA->id,
            'start_date' => '2026-06-05',
            'end_date' => '2026-06-09',
        ]);

        $this->assertDatabaseHas('user_shifts', [
            'user_id' => $this->employee->id,
            'shift_id' => $this->shiftB->id,
            'start_date' => '2026-06-10',
            'end_date' => '2026-06-20',
        ]);
    }
}
