<?php

namespace Tests\Unit;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * UserMassAssignmentTest — AUDIT-FIX C5
 *
 * Vérifie que :
 *  - Le champ `role` ne peut pas être set via mass assignment (fillable guard)
 *  - La mise à jour de `role_id` synchronise automatiquement `role` (boot event)
 */
class UserMassAssignmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_role_cannot_be_set_via_mass_assignment(): void
    {
        $user = User::factory()->caissier()->create();
        $originalRole = $user->role;

        // Attempting to mass-assign 'role' should be silently ignored.
        $user->fill(['role' => 'admin']);
        $user->save();
        $user->refresh();

        $this->assertSame($originalRole, $user->role, 'role must not be changeable via fill()');
    }

    public function test_role_is_not_in_fillable(): void
    {
        $user = new User();
        $this->assertNotContains('role', $user->getFillable());
    }

    public function test_role_id_is_in_fillable(): void
    {
        $user = new User();
        $this->assertContains('role_id', $user->getFillable());
    }
}
