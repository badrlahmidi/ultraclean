<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\StockProduct;
use App\Models\StockMovement;
use App\Models\User;

class DemoStockSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('role', 'admin')->first();
        $adminId = $admin?->id;

        $products = [
            // Produits chimiques
            [
                'name'             => 'Shampoing carrosserie',
                'description'      => 'Shampoing mousse haute densité, pH neutre',
                'category'         => 'produit_chimique',
                'unit'             => 'L',
                'current_quantity' => 18.5,
                'min_quantity'     => 5.0,
                'cost_price_cents' => 8000,
                'supplier'         => 'ChimPro Maroc',
                'sku'              => 'SHAM-001',
            ],
            [
                'name'             => 'Cire carnauba liquide',
                'description'      => 'Protection brillance longue durée',
                'category'         => 'produit_chimique',
                'unit'             => 'L',
                'current_quantity' => 3.2,
                'min_quantity'     => 4.0,   // ← stock bas intentionnel
                'cost_price_cents' => 22000,
                'supplier'         => 'AutoShine Casa',
                'sku'              => 'CIRE-001',
            ],
            [
                'name'             => 'Dégraissant moteur',
                'description'      => 'Nettoyant haute performance compartiment moteur',
                'category'         => 'produit_chimique',
                'unit'             => 'L',
                'current_quantity' => 8.0,
                'min_quantity'     => 3.0,
                'cost_price_cents' => 12000,
                'supplier'         => 'ChimPro Maroc',
                'sku'              => 'DEGR-001',
            ],
            [
                'name'             => 'Nettoyant vitres',
                'description'      => 'Antibuée et antistatique',
                'category'         => 'produit_chimique',
                'unit'             => 'L',
                'current_quantity' => 6.5,
                'min_quantity'     => 2.0,
                'cost_price_cents' => 7000,
                'supplier'         => 'AutoShine Casa',
                'sku'              => 'VITR-001',
            ],
            [
                'name'             => 'Polish abrasif fin',
                'description'      => 'Élimination micro-rayures',
                'category'         => 'produit_chimique',
                'unit'             => 'kg',
                'current_quantity' => 1.8,
                'min_quantity'     => 2.0,   // ← stock bas
                'cost_price_cents' => 35000,
                'supplier'         => 'DetailPro',
                'sku'              => 'POLI-001',
            ],
            // Consommables
            [
                'name'             => 'Chiffons microfibre',
                'description'      => 'Chiffons 40×40cm, 350g/m²',
                'category'         => 'consommable',
                'unit'             => 'unité',
                'current_quantity' => 120,
                'min_quantity'     => 30,
                'cost_price_cents' => 500,
                'supplier'         => 'CleanSupply',
                'sku'              => 'MICR-001',
            ],
            [
                'name'             => 'Éponges lavage',
                'description'      => 'Éponges haute densité anti-rayures',
                'category'         => 'consommable',
                'unit'             => 'unité',
                'current_quantity' => 45,
                'min_quantity'     => 20,
                'cost_price_cents' => 300,
                'supplier'         => 'CleanSupply',
                'sku'              => 'EPON-001',
            ],
            [
                'name'             => 'Sacs poubelle',
                'description'      => 'Sacs 30L pour déchets véhicule',
                'category'         => 'consommable',
                'unit'             => 'carton',
                'current_quantity' => 4,
                'min_quantity'     => 2,
                'cost_price_cents' => 4500,
                'supplier'         => 'Grossiste local',
                'sku'              => null,
            ],
            // Outils
            [
                'name'             => 'Aspirateur industriel',
                'description'      => 'Aspirateur 1400W eau et poussière',
                'category'         => 'outil',
                'unit'             => 'unité',
                'current_quantity' => 2,
                'min_quantity'     => 1,
                'cost_price_cents' => 450000,
                'supplier'         => 'ElectroTools MA',
                'sku'              => 'ASPI-IND-001',
            ],
            [
                'name'             => 'Lance haute pression',
                'description'      => 'Lance Karcher compatible K5',
                'category'         => 'outil',
                'unit'             => 'unité',
                'current_quantity' => 3,
                'min_quantity'     => 2,
                'cost_price_cents' => 85000,
                'supplier'         => 'ElectroTools MA',
                'sku'              => 'LANC-001',
            ],
        ];

        foreach ($products as $data) {
            $qty = $data['current_quantity'];
            $data['current_quantity'] = 0; // On part de 0 puis on crée le mouvement initial
            $data['is_active'] = true;

            $product = StockProduct::updateOrCreate(
                ['sku' => $data['sku'] ?? null, 'name' => $data['name']],
                $data
            );

            // Mouvement d'entrée initial
            StockMovement::create([
                'stock_product_id' => $product->id,
                'type'             => 'in',
                'quantity'         => $qty,
                'note'             => 'Stock initial — Inventaire d\'ouverture',
                'user_id'          => $adminId,
                'created_at'       => now()->subDays(30),
                'updated_at'       => now()->subDays(30),
            ]);

            // Mise à jour de la quantité directement
            $product->update(['current_quantity' => $qty]);
        }

        $this->command->info('✅  ' . count($products) . ' produits de stock créés');
        $this->command->info('   ⚠️  3 produits en stock bas (cire, polish, aspirateur)');
    }
}
