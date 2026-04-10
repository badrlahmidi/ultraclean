<?php

namespace App\Console\Commands;

use App\Models\ActivityLog;
use App\Models\Ticket;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * ArchiveOldRecords — Sprint 6.2
 *
 * Purges old activity logs and soft-deletes ancient tickets
 * to keep the database lean. Run monthly via scheduler.
 *
 * Usage:
 *   php artisan app:archive --months=6 --dry-run
 *   php artisan app:archive --months=12
 */
class ArchiveOldRecords extends Command
{
    protected $signature = 'app:archive
                            {--months=6 : Archive records older than N months}
                            {--dry-run : Show what would be archived without making changes}';

    protected $description = 'Archive old activity logs and soft-delete ancient paid/cancelled tickets';

    public function handle(): int
    {
        $months = (int) $this->option('months');
        $dryRun = (bool) $this->option('dry-run');
        $cutoff = Carbon::now()->subMonths($months);

        $this->info("Archiving records older than {$months} months (before {$cutoff->toDateString()})");

        if ($dryRun) {
            $this->warn('DRY RUN — no changes will be made');
        }

        // 1. Activity Logs
        $logCount = ActivityLog::where('created_at', '<', $cutoff)->count();
        $this->line("  Activity logs to purge: {$logCount}");

        if (! $dryRun && $logCount > 0) {
            $deleted = 0;
            do {
                $batch = ActivityLog::where('created_at', '<', $cutoff)
                    ->limit(1000)
                    ->delete();
                $deleted += $batch;
            } while ($batch > 0);
            $this->line("  Deleted {$deleted} activity logs.");
        }

        // 2. Old Tickets (soft-delete paid/cancelled)
        $ticketQuery = Ticket::withoutTrashed()
            ->whereIn('status', [Ticket::STATUS_PAID, Ticket::STATUS_CANCELLED])
            ->where('created_at', '<', $cutoff);

        $ticketCount = $ticketQuery->count();
        $this->line("  Tickets to soft-delete: {$ticketCount}");

        if (! $dryRun && $ticketCount > 0) {
            $archived = 0;
            Ticket::withoutTrashed()
                ->whereIn('status', [Ticket::STATUS_PAID, Ticket::STATUS_CANCELLED])
                ->where('created_at', '<', $cutoff)
                ->chunkById(500, function ($tickets) use (&$archived) {
                    foreach ($tickets as $ticket) {
                        $ticket->delete();
                        $archived++;
                    }
                });
            $this->line("  Archived {$archived} tickets.");
        }

        // 3. Purge soft-deleted tickets older than 2x retention
        $hardCutoff = Carbon::now()->subMonths($months * 2);
        $hardDeleteCount = Ticket::onlyTrashed()
            ->where('deleted_at', '<', $hardCutoff)
            ->count();

        $this->line("  Soft-deleted tickets to hard-delete (>" . ($months * 2) . "mo): {$hardDeleteCount}");

        if (! $dryRun && $hardDeleteCount > 0) {
            Ticket::onlyTrashed()
                ->where('deleted_at', '<', $hardCutoff)
                ->forceDelete();
        }

        // Summary
        if ($dryRun) {
            $this->info('Dry run complete. Re-run without --dry-run to apply changes.');
        } else {
            $summary = "Archived: {$logCount} logs purged, {$ticketCount} tickets soft-deleted, {$hardDeleteCount} tickets hard-deleted";
            $this->info($summary);
            Log::info("[Archive] {$summary}");
        }

        return self::SUCCESS;
    }
}
