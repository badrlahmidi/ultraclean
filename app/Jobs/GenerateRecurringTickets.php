<?php

namespace App\Jobs;

use App\Models\TicketTemplate;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * GenerateRecurringTickets
 *
 * Tournée quotidienne (ou plus fréquente) : lit tous les TicketTemplate
 * dont next_run_at <= now() et is_active = true,
 * crée les tickets correspondants, puis met à jour next_run_at.
 */
class GenerateRecurringTickets implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 120;

    public function handle(): void
    {
        $templates = TicketTemplate::due()->with('client')->get();

        if ($templates->isEmpty()) {
            return;
        }

        $created = 0;
        $failed  = 0;

        foreach ($templates as $template) {
            try {
                $ticket = $template->createFromTemplate();

                if ($ticket) {
                    $created++;
                    Log::info('recurring_ticket.created', [
                        'template_id' => $template->id,
                        'ticket_id'   => $ticket->id,
                        'client_id'   => $template->client_id,
                    ]);
                } else {
                    Log::warning('recurring_ticket.skipped', [
                        'template_id' => $template->id,
                        'reason'      => 'client_missing',
                    ]);
                    $failed++;
                }

                // Mettre à jour next_run_at même si le ticket n'a pas pu être créé
                // (évite une boucle infinie si le client est supprimé)
                $template->updateNextRun();

            } catch (\Throwable $e) {
                $failed++;
                Log::error('recurring_ticket.error', [
                    'template_id' => $template->id,
                    'error'       => $e->getMessage(),
                ]);

                // On met quand même à jour next_run_at pour ne pas re-déclencher
                // dans les 5 prochaines minutes
                $template->updateNextRun();
            }
        }

        Log::info('recurring_tickets.summary', [
            'created' => $created,
            'failed'  => $failed,
            'total'   => $templates->count(),
        ]);
    }
}
