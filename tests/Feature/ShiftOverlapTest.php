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
     * Exists: June 5 - June 15 (Shift A)
     * New: June 1 - June 20 (Shift B)
     * Result: Existing is preserved, and the new shift is split into June 1-4 and June 16-20.
     */
    public function test_new_shift_completely_covers_existing_preserves_existing()
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
        
        // Existing shift is preserved
        $this->assertDatabaseHas('user_shifts', [
            'user_id' => $this->employee->id,
            'shift_id' => $this->shiftA->id,
            'start_date' => '2026-06-05',
            'end_date' => '2026-06-15',
        ]);

        // New shift is split around existing shift
        $this->assertDatabaseHas('user_shifts', [
            'user_id' => $this->employee->id,
            'shift_id' => $this->shiftB->id,
            'start_date' => '2026-06-01',
            'end_date' => '2026-06-04',
        ]);

        $this->assertDatabaseHas('user_shifts', [
            'user_id' => $this->employee->id,
            'shift_id' => $this->shiftB->id,
            'start_date' => '2026-06-16',
            'end_date' => '2026-06-20',
        ]);
    }

    /**
     * Test Case 2: The new shift is strictly inside the existing shift (split).
     * Exists: June 1 - Indefinite (null) (Shift A)
     * New: June 10 - June 20 (Shift B)
     * Result: Existing is preserved, new shift cannot be created (fully covered).
     */
    public function test_new_shift_inside_existing_is_fully_blocked()
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

        // Existing shift remains unchanged
        $this->assertDatabaseHas('user_shifts', [
            'user_id' => $this->employee->id,
            'shift_id' => $this->shiftA->id,
            'start_date' => '2026-06-01',
            'end_date' => null,
        ]);

        // No new shift B was created
        $this->assertDatabaseMissing('user_shifts', [
            'shift_id' => $this->shiftB->id,
        ]);
    }

    /**
     * Test Case 3: The new shift overlaps the start of the existing shift.
     * Exists: June 10 - June 20 (Shift A)
     * New: June 5 - June 15 (Shift B)
     * Result: Existing is preserved, new shift B is pulled to June 5 - June 9.
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

        // Existing is preserved
        $this->assertDatabaseHas('user_shifts', [
            'user_id' => $this->employee->id,
            'shift_id' => $this->shiftA->id,
            'start_date' => '2026-06-10',
            'end_date' => '2026-06-20',
        ]);

        // New shift is truncated to before existing start
        $this->assertDatabaseHas('user_shifts', [
            'user_id' => $this->employee->id,
            'shift_id' => $this->shiftB->id,
            'start_date' => '2026-06-05',
            'end_date' => '2026-06-09',
        ]);
    }

    /**
     * Test Case 4: The new shift overlaps the end of the existing shift.
     * Exists: June 5 - June 15 (Shift A)
     * New: June 10 - June 20 (Shift B)
     * Result: Existing is preserved, new shift B is pushed to June 16 - June 20.
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

        // Existing is preserved
        $this->assertDatabaseHas('user_shifts', [
            'user_id' => $this->employee->id,
            'shift_id' => $this->shiftA->id,
            'start_date' => '2026-06-05',
            'end_date' => '2026-06-15',
        ]);

        // New shift is adjusted to start after existing end
        $this->assertDatabaseHas('user_shifts', [
            'user_id' => $this->employee->id,
            'shift_id' => $this->shiftB->id,
            'start_date' => '2026-06-16',
            'end_date' => '2026-06-20',
        ]);
    }

    /**
     * Test Case 5: Edit an existing shift assignment.
     * Exists: June 1 - June 5 (Shift A, ID 1), June 10 - June 15 (Shift A, ID 2)
     * Edit ID 2: to Shift B, June 3 - June 12
     * Result: Exists ID 1 (June 1-5) is preserved. Edited assignment is adjusted to June 6 - June 12.
     */
    public function test_edit_shift_assignment_adjusts_around_other_existing()
    {
        $existing1 = UserShift::create([
            'user_id' => $this->employee->id,
            'shift_id' => $this->shiftA->id,
            'start_date' => '2026-06-01',
            'end_date' => '2026-06-05',
        ]);

        $existing2 = UserShift::create([
            'user_id' => $this->employee->id,
            'shift_id' => $this->shiftA->id,
            'start_date' => '2026-06-10',
            'end_date' => '2026-06-15',
        ]);

        $response = $this->actingAs($this->admin)->post(route('admin.shifts.update-assignment'), [
            'user_shift_id' => $existing2->id,
            'shift_id' => $this->shiftB->id,
            'start_date' => '2026-06-03',
            'end_date' => '2026-06-12',
        ]);

        $response->assertStatus(302);

        // First existing shift is preserved
        $this->assertDatabaseHas('user_shifts', [
            'id' => $existing1->id,
            'shift_id' => $this->shiftA->id,
            'start_date' => '2026-06-01',
            'end_date' => '2026-06-05',
        ]);

        // Second shift (edited) is adjusted to start from June 6th (after first shift ends)
        $this->assertDatabaseHas('user_shifts', [
            'id' => $existing2->id,
            'shift_id' => $this->shiftB->id,
            'start_date' => '2026-06-06',
            'end_date' => '2026-06-12',
        ]);
    }
}
