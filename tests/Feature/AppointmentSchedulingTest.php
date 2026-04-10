<?php
namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;
use App\Models\Setting;
use App\Services\WasherScheduler;

class AppointmentSchedulingTest extends TestCase
{
    use RefreshDatabase;

    public function test_washer_scheduler_overflows_correctly_to_next_business_day()
    {        // 1. Seed DB settings using the canonical keys that WasherScheduler reads.
        //    Mon-Sat open (1-6), Sunday closed (0), closes at 20:00, opens at 08:00.
        Setting::set('opening_time',  '08:00');
        Setting::set('closing_time',  '20:00');
        Setting::set('business_days', [1, 2, 3, 4, 5, 6]);

        // 2. Pin "now" to Saturday April 11, 2026, at 7:50 PM (10 minutes before close)
        $saturdayNight = Carbon::parse('2026-04-11 19:50:00');
        Carbon::setTestNow($saturdayNight);

        // 3. A 30-minute job: 10 min remain on Saturday → 20 min overflow.
        //    Sunday is closed → overflow must land on Monday 08:20.
        $rawEnd     = $saturdayNight->copy()->addMinutes(30);
        $finalDueAt = WasherScheduler::applyBusinessHours($rawEnd);

        // 4. Assert: Monday April 13, 2026 at 08:20
        $this->assertEquals('2026-04-13 08:20:00', $finalDueAt->format('Y-m-d H:i:s'));
        $this->assertTrue($finalDueAt->isMonday());

        Carbon::setTestNow(); // reset
    }
}
