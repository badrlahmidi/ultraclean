<?php

namespace Tests\Unit;

use App\Models\TicketTemplate;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * TicketTemplateTest — Valide computeNextRunAt() et le cycle de vie du template.
 *
 * Couvre :
 *  - Expressions cron standards (hebdo, quotidien, mensuel)
 *  - Fallback sur expression invalide → +7 jours
 *  - next_run_at > from (jamais dans le passé)
 *  - updateNextRun() avance la prochaine exécution
 *  - Paramètre $from personnalisé
 */
class TicketTemplateTest extends TestCase
{
    use RefreshDatabase;

    private function makeTemplate(string $cron = '0 8 * * 1'): TicketTemplate
    {
        return new TicketTemplate(['recurrence_rule' => $cron]);
    }

    // ── computeNextRunAt — expressions valides ────────────────────────────

    public function test_weekly_monday_returns_next_monday_8h(): void
    {
        $template = $this->makeTemplate('0 8 * * 1'); // Chaque lundi à 8h

        // On fixe "from" à un mardi
        $from = Carbon::parse('2025-06-03 10:00:00'); // mardi
        $next = $template->computeNextRunAt($from);

        $this->assertEquals(1, $next->dayOfWeek); // lundi
        $this->assertEquals(8,  $next->hour);
        $this->assertEquals(0,  $next->minute);
        $this->assertTrue($next->gt($from));
    }

    public function test_daily_8h_returns_next_day_if_past(): void
    {
        $template = $this->makeTemplate('0 8 * * *'); // Tous les jours à 8h

        // On fixe "from" à aujourd'hui à 9h (8h passé)
        $from = Carbon::parse('2025-06-03 09:00:00');
        $next = $template->computeNextRunAt($from);

        // Doit retourner le lendemain à 8h
        $this->assertEquals('2025-06-04', $next->toDateString());
        $this->assertEquals(8, $next->hour);
        $this->assertTrue($next->gt($from));
    }

    public function test_daily_8h_returns_today_if_before_8h(): void
    {
        $template = $this->makeTemplate('0 8 * * *');

        $from = Carbon::parse('2025-06-03 07:00:00');
        $next = $template->computeNextRunAt($from);

        $this->assertEquals('2025-06-03', $next->toDateString());
        $this->assertEquals(8, $next->hour);
    }

    public function test_monthly_first_day_returns_first_of_next_month(): void
    {
        $template = $this->makeTemplate('0 8 1 * *'); // 1er du mois à 8h

        $from = Carbon::parse('2025-06-15 10:00:00'); // milieu de mois
        $next = $template->computeNextRunAt($from);

        $this->assertEquals(1, $next->day);
        $this->assertEquals(8, $next->hour);
        $this->assertEquals('2025-07-01', $next->toDateString());
    }

    public function test_weekdays_only_skips_weekend(): void
    {
        $template = $this->makeTemplate('0 8 * * 1-5'); // Lun-Ven à 8h

        // Vendredi soir → prochaine occurrence = lundi
        $from = Carbon::parse('2025-06-06 20:00:00'); // vendredi
        $next = $template->computeNextRunAt($from);

        $this->assertEquals(1, $next->dayOfWeek); // lundi
        $this->assertEquals('2025-06-09', $next->toDateString());
    }

    // ── Fallback expression invalide ─────────────────────────────────────

    public function test_invalid_cron_falls_back_to_plus_seven_days(): void
    {
        $template = $this->makeTemplate('not-a-cron');

        $from = Carbon::parse('2025-06-03 10:00:00');
        $next = $template->computeNextRunAt($from);

        $expected = $from->copy()->addWeek();
        $this->assertEquals($expected->toDateString(), $next->toDateString());
    }

    public function test_null_cron_falls_back_to_plus_seven_days(): void
    {
        $template = new TicketTemplate(['recurrence_rule' => null]);

        $from = Carbon::parse('2025-06-03 10:00:00');
        $next = $template->computeNextRunAt($from);

        // null → utilise fallback '0 8 * * 1' (lundi à 8h)
        $this->assertInstanceOf(Carbon::class, $next);
        $this->assertTrue($next->gt($from));
    }

    // ── next_run_at toujours > from ───────────────────────────────────────

    public function test_next_run_at_always_in_future(): void
    {
        $expressions = [
            '0 8 * * 1',
            '0 8 * * *',
            '0 8 1 * *',
            '0 8 * * 1-5',
            '30 12 * * 5',
        ];

        $from = now();

        foreach ($expressions as $cron) {
            $template = $this->makeTemplate($cron);
            $next     = $template->computeNextRunAt($from);

            $this->assertTrue(
                $next->gt($from),
                "computeNextRunAt pour '{$cron}' devrait être dans le futur."
            );
        }
    }

    // ── updateNextRun ─────────────────────────────────────────────────────

    public function test_update_next_run_advances_schedule(): void
    {
        // Créer un vrai template en base
        $template = TicketTemplate::factory()->create([
            'recurrence_rule' => '0 8 * * 1', // Lundi à 8h
            'is_active'       => true,
        ]);

        $originalNextRun = $template->next_run_at;

        $template->updateNextRun();

        $fresh = $template->fresh();

        // last_run_at est maintenant défini
        $this->assertNotNull($fresh->last_run_at);

        // next_run_at a avancé (≥ original)
        $this->assertTrue($fresh->next_run_at->gte($originalNextRun));
    }

    // ── computeNextRunAt avec $from personnalisé ──────────────────────────

    public function test_compute_next_run_with_custom_from(): void
    {
        $template = $this->makeTemplate('0 8 * * 1'); // lundi

        $specificFrom = Carbon::parse('2025-01-06 10:00:00'); // lundi 6 janvier
        $next         = $template->computeNextRunAt($specificFrom);

        // Prochain lundi = 13 janvier
        $this->assertEquals('2025-01-13', $next->toDateString());
        $this->assertEquals(8, $next->hour);
    }

    // ── recurrenceLabel ───────────────────────────────────────────────────

    public function test_recurrence_label_known_expressions(): void
    {
        $cases = [
            '0 8 * * 1'   => 'Chaque lundi à 8h',
            '0 8 * * *'   => 'Tous les jours à 8h',
            '0 8 1 * *'   => 'Le 1er du mois à 8h',
            '0 8 * * 1-5' => 'Chaque jour ouvré à 8h',
        ];

        foreach ($cases as $cron => $expected) {
            $template = $this->makeTemplate($cron);
            $this->assertEquals($expected, $template->recurrenceLabel());
        }
    }

    public function test_recurrence_label_unknown_returns_raw_cron(): void
    {
        $template = $this->makeTemplate('30 14 * * 3');

        $this->assertEquals('30 14 * * 3', $template->recurrenceLabel());
    }
}
