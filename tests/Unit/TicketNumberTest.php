<?php

namespace Tests\Unit;

use App\Models\Ticket;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Unit tests for Ticket::generateTicketNumber() — AUDIT-FIX regression.
 *
 * Verifies that the atomic counter in ticket_daily_counters correctly
 * assigns sequential, non-colliding ticket numbers within a day.
 */
class TicketNumberTest extends TestCase
{
    use RefreshDatabase;

    // ── Format validation ────────────────────────────────────────────────

    public function test_ticket_number_has_correct_format(): void
    {
        $number = $this->callGenerateTicketNumber();

        $this->assertMatchesRegularExpression(
            '/^TK-\d{8}-\d{4}$/',
            $number,
            'Ticket number must match TK-YYYYMMDD-NNNN'
        );
    }

    public function test_ticket_number_date_segment_is_today(): void
    {
        $number = $this->callGenerateTicketNumber();
        $today  = now()->format('Ymd');

        $this->assertStringContainsString("TK-{$today}-", $number);
    }

    // ── Sequence monotonicity ────────────────────────────────────────────

    public function test_two_consecutive_numbers_are_sequential(): void
    {
        $first  = $this->callGenerateTicketNumber();
        $second = $this->callGenerateTicketNumber();

        $seq1 = (int) substr($first,  -4);
        $seq2 = (int) substr($second, -4);

        $this->assertSame($seq1 + 1, $seq2, 'Each call must increment the sequence by 1');
    }

    public function test_first_ticket_of_the_day_starts_at_0001(): void
    {
        // Ensure the counters table is empty (RefreshDatabase handles this).
        $number = $this->callGenerateTicketNumber();
        $seq    = (int) substr($number, -4);

        $this->assertSame(1, $seq);
    }

    public function test_ten_sequential_numbers_have_no_duplicates(): void
    {
        $numbers = [];
        for ($i = 0; $i < 10; $i++) {
            $numbers[] = $this->callGenerateTicketNumber();
        }

        $this->assertCount(10, array_unique($numbers), 'All generated ticket numbers must be unique');
    }

    // ── Counter persists ─────────────────────────────────────────────────

    public function test_counter_persists_across_multiple_calls(): void
    {
        $this->callGenerateTicketNumber(); // 0001
        $this->callGenerateTicketNumber(); // 0002
        $third = $this->callGenerateTicketNumber(); // 0003

        $seq = (int) substr($third, -4);
        $this->assertSame(3, $seq);
    }

    // ── Helper ──────────────────────────────────────────────────────────

    /**
     * Invoke the protected static generateTicketNumber() method via reflection.
     */
    private function callGenerateTicketNumber(): string
    {
        $method = new \ReflectionMethod(Ticket::class, 'generateTicketNumber');

        return $method->invoke(null);
    }
}
