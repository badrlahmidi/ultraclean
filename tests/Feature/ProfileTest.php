<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * User role & access tests (replaces stale Breeze /profile scaffolding tests).
 */
class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_helper_returns_true_for_admin(): void
    {
        $admin = User::factory()->admin()->create();
        $this->assertTrue($admin->isAdmin());
        $this->assertFalse($admin->isCaissier());
    }

    public function test_caissier_helper_returns_true_for_caissier(): void
    {
        $caissier = User::factory()->caissier()->create();
        $this->assertTrue($caissier->isCaissier());
        $this->assertFalse($caissier->isAdmin());
    }

    public function test_laveur_helper_returns_true_for_laveur(): void
    {
        $laveur = User::factory()->laveur()->create();
        $this->assertTrue($laveur->isLaveur());
        $this->assertFalse($laveur->isAdmin());
    }

    public function test_unauthenticated_user_redirected_from_caisse(): void
    {
        $response = $this->get('/caisse');
        $response->assertRedirect(route('login'));
    }

    public function test_laveur_cannot_access_caissier_area(): void
    {
        $laveur = User::factory()->laveur()->create();
        $response = $this->actingAs($laveur)->get('/caisse');
        $response->assertStatus(403);
    }

    public function test_admin_can_access_admin_area(): void
    {
        $admin = User::factory()->admin()->create();
        $response = $this->actingAs($admin)->get('/admin');
        $response->assertStatus(200);
    }

    public function test_caissier_cannot_access_admin_area(): void
    {
        $caissier = User::factory()->caissier()->create();
        $response = $this->actingAs($caissier)->get('/admin');
        $response->assertStatus(403);
    }

    // ─── kept for reference — old stale test replaced ──────────────────
}

