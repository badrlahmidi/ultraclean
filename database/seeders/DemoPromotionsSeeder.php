<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Promotion;

class DemoPromotionsSeeder extends Seeder
{
    public function run(): void
    {
        $promotions = [
            [
                'code'             => 'BIENVENUE',
                'label'            => '10% de réduction bienvenue',
                'type'             => 'percent',
                'value'            => 10,
                'min_amount_cents' => 0,
                'max_uses'         => null,
                'is_active'        => true,
                'valid_from'       => null,
                'valid_until'      => null,
            ],
            [
                'code'             => 'ETE2026',
                'label'            => 'Promo été — 15% sur tout',
                'type'             => 'percent',
                'value'            => 15,
                'min_amount_cents' => 5000,
                'max_uses'         => 100,
                'is_active'        => true,
                'valid_from'       => now()->subDays(5),
                'valid_until'      => now()->addMonths(2),
            ],
            [
                'code'             => 'FIDELITE20',
                'label'            => '20 MAD offerts dès 100 MAD',
                'type'             => 'fixed',
                'value'            => 2000,
                'min_amount_cents' => 10000,
                'max_uses'         => null,
                'is_active'        => true,
                'valid_from'       => null,
                'valid_until'      => null,
            ],
            [
                'code'             => 'EXPIREDTEST',
                'label'            => 'Promo expirée (test)',
                'type'             => 'percent',
                'value'            => 5,
                'min_amount_cents' => 0,
                'max_uses'         => 50,
                'is_active'        => true,
                'valid_from'       => now()->subMonths(3),
                'valid_until'      => now()->subMonth(),
            ],
        ];

        foreach ($promotions as $promo) {
            Promotion::updateOrCreate(['code' => $promo['code']], $promo);
        }

        $this->command->info('✅  ' . count($promotions) . ' promotions créées');
    }
}
