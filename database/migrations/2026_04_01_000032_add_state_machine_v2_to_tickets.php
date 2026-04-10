<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            // Élargir l'enum du statut avec les 3 nouveaux statuts v2
            $table->enum('status', [
                'pending',
                'in_progress',
                'paused',
                'blocked',
                'completed',
                'payment_pending',
                'paid',
                'cancelled',
            ])->default('pending')->change();

            // ── Colonnes pause / blocage ──────────────────────────────────────
            $table->timestamp('paused_at')->nullable()->after('paid_at');
            $table->unsignedInteger('total_paused_seconds')->default(0)->after('paused_at');
            $table->string('pause_reason', 255)->nullable()->after('total_paused_seconds');

            // ── Colonnes paiement asynchrone ─────────────────────────────────
            $table->timestamp('payment_initiated_at')->nullable()->after('pause_reason');
            $table->string('payment_reference', 255)->nullable()->after('payment_initiated_at');
            $table->string('payment_provider', 50)->nullable()->after('payment_reference');
            // 'wave' | 'orange_money' | 'cmi_tpe' | 'cash' …
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropColumn([
                'paused_at',
                'total_paused_seconds',
                'pause_reason',
                'payment_initiated_at',
                'payment_reference',
                'payment_provider',
            ]);

            $table->enum('status', ['pending', 'in_progress', 'completed', 'paid', 'cancelled'])
                  ->default('pending')
                  ->change();
        });
    }
};
