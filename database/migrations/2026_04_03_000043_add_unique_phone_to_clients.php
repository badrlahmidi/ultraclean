<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $duplicates = DB::table('clients')
            ->select('phone', DB::raw('MIN(id) as keep_id'))
            ->whereNotNull('phone')
            ->where('phone', '!=', '')
            ->groupBy('phone')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($duplicates as $dup) {
            $dupes = DB::table('clients')
                ->where('phone', $dup->phone)
                ->where('id', '!=', $dup->keep_id)
                ->pluck('id');

            foreach ($dupes as $i => $dupeId) {
                DB::table('clients')
                    ->where('id', $dupeId)
                    ->update(['phone' => $dup->phone . '_dup' . ($i + 1)]);
            }
        }

        // Only add the constraint if it doesn't already exist (schema dump may include it)
        $indexes = Schema::getIndexes('clients');
        $hasUnique = collect($indexes)->contains(fn ($idx) => $idx['name'] === 'clients_phone_unique');

        if (! $hasUnique) {
            Schema::table('clients', function (Blueprint $table) {
                $table->unique('phone');
            });
        }
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropUnique(['phone']);
        });
    }
};
