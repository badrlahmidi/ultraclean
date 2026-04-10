<?php

namespace Tests\Feature;

use App\Jobs\CheckOverdueInvoices;
use App\Jobs\CheckStockLevels;
use App\Jobs\SendAppointmentReminders;
use App\Models\Appointment;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\StockProduct;
use App\Models\User;
use App\Notifications\AppointmentReminder;
use App\Notifications\InvoiceOverdue;
use App\Notifications\NewAppointment;
use App\Notifications\StockLowAlert;
use App\Notifications\TicketReady;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * NotificationTest — Valide les notifications et jobs de notification.
 *
 * Couvre :
 *  - Notification classes (toArray, via)
 *  - Scheduled jobs (SendAppointmentReminders, CheckStockLevels, CheckOverdueInvoices)
 *  - NotificationController endpoints (index, markAllRead, dismiss, clearAll)
 *  - NewAppointment dispatch on appointment creation
 */
class NotificationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $caissier;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin    = User::factory()->admin()->create();
        $this->caissier = User::factory()->caissier()->create();
    }

    // ── Notification classes — toArray structure ──────────────────────────

    public function test_new_appointment_notification_has_correct_structure(): void
    {
        $client = Client::factory()->create(['name' => 'Test Client']);
        $appointment = Appointment::factory()->create([
            'client_id'     => $client->id,
            'scheduled_at'  => now()->addDay(),
            'vehicle_plate' => 'A-12345-B',
        ]);

        $notification = new NewAppointment($appointment);

        $this->assertEquals(['database'], $notification->via($this->admin));

        $data = $notification->toArray($this->admin);
        $this->assertEquals('new_appointment', $data['type']);
        $this->assertArrayHasKey('title', $data);
        $this->assertArrayHasKey('body', $data);
        $this->assertEquals($appointment->id, $data['appointment_id']);
    }

    public function test_appointment_reminder_notification_structure(): void
    {
        $appointment = Appointment::factory()->create([
            'scheduled_at' => now()->addHour(),
        ]);

        $notification = new AppointmentReminder($appointment);

        $this->assertEquals(['database'], $notification->via($this->admin));

        $data = $notification->toArray($this->admin);
        $this->assertEquals('appointment_reminder', $data['type']);
    }

    public function test_stock_low_alert_notification_structure(): void
    {
        $product = StockProduct::factory()->create([
            'name'             => 'Shampoing Auto',
            'current_quantity' => 3,
            'min_quantity'     => 10,
        ]);

        $notification = new StockLowAlert($product);

        $this->assertEquals(['database'], $notification->via($this->admin));

        $data = $notification->toArray($this->admin);
        $this->assertEquals('stock_low', $data['type']);
        $this->assertStringContainsString('Shampoing Auto', $data['title']);
    }

    public function test_invoice_overdue_notification_has_mail_channel(): void
    {
        $invoice = Invoice::factory()->create([
            'status'    => Invoice::STATUS_ISSUED,
            'issued_at' => now()->subDays(10),
            'due_date'  => now()->subDays(3),
        ]);

        $notification = new InvoiceOverdue($invoice);

        $channels = $notification->via($this->admin);
        $this->assertContains('database', $channels);
        $this->assertContains('mail', $channels);

        $data = $notification->toArray($this->admin);
        $this->assertEquals('invoice_overdue', $data['type']);
    }

    // ── NotificationController ────────────────────────────────────────────

    public function test_notification_index_returns_json_with_notifications(): void
    {
        $this->admin->notify(new NewAppointment(
            Appointment::factory()->create(['scheduled_at' => now()->addDay()])
        ));

        $response = $this->actingAs($this->admin)
            ->getJson(route('notifications.index'));

        $response->assertOk();
        $response->assertJsonStructure(['notifications', 'unread_count']);
        $response->assertJsonCount(1, 'notifications');
        $response->assertJson(['unread_count' => 1]);
    }

    public function test_notification_mark_all_read(): void
    {
        $this->admin->notify(new NewAppointment(
            Appointment::factory()->create(['scheduled_at' => now()->addDay()])
        ));

        $this->assertDatabaseHas('notifications', [
            'notifiable_id' => $this->admin->id,
            'read_at'       => null,
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson(route('notifications.read-all'));

        $response->assertOk();

        $this->assertDatabaseMissing('notifications', [
            'notifiable_id' => $this->admin->id,
            'read_at'       => null,
        ]);
    }

    public function test_notification_dismiss_deletes_single(): void
    {
        $this->admin->notify(new NewAppointment(
            Appointment::factory()->create(['scheduled_at' => now()->addDay()])
        ));

        $notifId = $this->admin->notifications()->first()->id;

        $response = $this->actingAs($this->admin)
            ->deleteJson(route('notifications.dismiss', $notifId));

        $response->assertOk();
        $this->assertDatabaseMissing('notifications', ['id' => $notifId]);
    }

    public function test_notification_clear_all_deletes_all(): void
    {
        $this->admin->notify(new NewAppointment(
            Appointment::factory()->create(['scheduled_at' => now()->addDay()])
        ));
        $this->admin->notify(new NewAppointment(
            Appointment::factory()->create(['scheduled_at' => now()->addDays(2)])
        ));

        $this->assertEquals(2, $this->admin->notifications()->count());

        $response = $this->actingAs($this->admin)
            ->deleteJson(route('notifications.clear-all'));

        $response->assertOk();
        $this->assertEquals(0, $this->admin->notifications()->count());
    }

    public function test_unauthenticated_user_cannot_access_notifications(): void
    {
        $this->getJson(route('notifications.index'))->assertUnauthorized();
    }

    // ── SendAppointmentReminders Job ─────────────────────────────────────

    public function test_appointment_reminder_job_sends_notifications(): void
    {
        Notification::fake();
        Cache::flush();

        Appointment::factory()->confirmed()->create([
            'assigned_to'  => $this->caissier->id,
            'scheduled_at' => now()->addMinutes(60),
        ]);

        (new SendAppointmentReminders())->handle();

        Notification::assertSentTo($this->caissier, AppointmentReminder::class);
    }    public function test_appointment_reminder_job_skips_already_notified(): void
    {
        Notification::fake();
        Cache::flush();

        // Use a laveur for assigned_to so they don't overlap with admin/caissier broadcast
        $laveur = User::factory()->laveur()->create();

        Appointment::factory()->confirmed()->create([
            'assigned_to'  => $laveur->id,
            'scheduled_at' => now()->addMinutes(60),
        ]);

        (new SendAppointmentReminders())->handle();
        (new SendAppointmentReminders())->handle();

        // Laveur should only receive 1 notification (cache dedup across runs)
        Notification::assertSentToTimes($laveur, AppointmentReminder::class, 1);
    }

    // ── CheckStockLevels Job ─────────────────────────────────────────────

    public function test_stock_level_job_sends_alert_for_low_stock(): void
    {
        Notification::fake();
        Cache::flush();

        StockProduct::factory()->create([
            'current_quantity' => 2,
            'min_quantity'     => 10,
        ]);

        (new CheckStockLevels())->handle();

        Notification::assertSentTo($this->admin, StockLowAlert::class);
    }

    public function test_stock_level_job_skips_adequate_stock(): void
    {
        Notification::fake();
        Cache::flush();

        StockProduct::factory()->create([
            'current_quantity' => 50,
            'min_quantity'     => 10,
        ]);

        (new CheckStockLevels())->handle();

        Notification::assertNothingSent();
    }

    // ── CheckOverdueInvoices Job ─────────────────────────────────────────

    public function test_overdue_invoice_job_sends_notification(): void
    {
        Notification::fake();
        Cache::flush();

        Invoice::factory()->create([
            'status'    => Invoice::STATUS_ISSUED,
            'issued_at' => now()->subDays(10),
            'due_date'  => now()->subDays(2)->toDateString(),
        ]);

        (new CheckOverdueInvoices())->handle();

        Notification::assertSentTo($this->admin, InvoiceOverdue::class);
    }

    public function test_overdue_invoice_job_skips_paid_invoices(): void
    {
        Notification::fake();
        Cache::flush();

        Invoice::factory()->paid()->create([
            'due_date' => now()->subDays(2)->toDateString(),
        ]);

        (new CheckOverdueInvoices())->handle();

        Notification::assertNothingSent();
    }

    // ── NewAppointment wired in AppointmentController ─────────────────────

    public function test_creating_appointment_dispatches_new_appointment_notification(): void
    {
        Notification::fake();

        $laveur = User::factory()->laveur()->create();

        $response = $this->actingAs($this->admin)->post(route('admin.appointments.store'), [
            'scheduled_at'       => now()->addDays(2)->toDateTimeString(),
            'estimated_duration' => 30,
            'assigned_to'        => $laveur->id,
            'vehicle_plate'      => 'X-99999-Z',
            'source'             => 'phone',
        ]);

        $response->assertRedirect();

        Notification::assertNotSentTo($this->admin, NewAppointment::class);
        Notification::assertSentTo($laveur, NewAppointment::class);
    }
}
