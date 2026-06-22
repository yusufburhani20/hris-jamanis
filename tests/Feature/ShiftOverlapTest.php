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
     * Test single assignment overlap rejection.
     */
    public function test_cannot_assign_overlapping_shift()
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

        // Should redirect back with session validation errors
        $response->assertStatus(302);
        $response->assertSessionHasErrors(['start_date']);
        
        // Assert no new shift B was added
        $this->assertDatabaseMissing('user_shifts', [
            'shift_id' => $this->shiftB->id,
        ]);
    }

    /**
     * Test bulk assignment overlap rejection.
     */
    public function test_cannot_assign_bulk_overlapping_shift()
    {
        UserShift::create([
            'user_id' => $this->employee->id,
            'shift_id' => $this->shiftA->id,
            'start_date' => '2026-06-05',
            'end_date' => '2026-06-15',
        ]);

        $response = $this->actingAs($this->admin)->post(route('admin.shifts.assignBulk'), [
            'user_ids' => [$this->employee->id],
            'shift_id' => $this->shiftB->id,
            'start_date' => '2026-06-10',
            'end_date' => '2026-06-12',
        ]);

        $response->assertStatus(302);
        $response->assertSessionHasErrors(['start_date']);
    }

    /**
     * Test update assignment overlap rejection.
     */
    public function test_cannot_update_assignment_to_overlap_other_shifts()
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
        $response->assertSessionHasErrors(['start_date']);
    }

    /**
     * Test valid non-overlapping assignment.
     */
    public function test_can_assign_non_overlapping_shift()
    {
        UserShift::create([
            'user_id' => $this->employee->id,
            'shift_id' => $this->shiftA->id,
            'start_date' => '2026-06-01',
            'end_date' => '2026-06-05',
        ]);

        $response = $this->actingAs($this->admin)->post(route('admin.shifts.assign'), [
            'user_id' => $this->employee->id,
            'shift_id' => $this->shiftB->id,
            'start_date' => '2026-06-06',
            'end_date' => '2026-06-10',
        ]);

        $response->assertStatus(302);
        
        $this->assertDatabaseHas('user_shifts', [
            'user_id' => $this->employee->id,
            'shift_id' => $this->shiftB->id,
            'start_date' => '2026-06-06',
            'end_date' => '2026-06-10',
        ]);
    }
}
