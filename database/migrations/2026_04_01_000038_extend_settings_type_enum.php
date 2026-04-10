<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // MySQL/MariaDB only — SQLite (tests) ne supporte pas MODIFY COLUMN
        // SQLite stocke tout en TEXT, l'ENUM est donc inutile en test
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE settings MODIFY COLUMN `type` ENUM('string','integer','boolean','json','float') NOT NULL DEFAULT 'string'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE settings MODIFY COLUMN `type` ENUM('string','integer','boolean','json') NOT NULL DEFAULT 'string'");
        }
    }
};
