<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use App\Models\VehicleType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class VehicleBrandController extends Controller
{
    /* ────────────────────────────────────────────────────────────
     | INDEX — liste toutes les marques + leurs modèles
     ──────────────────────────────────────────────────────────── */    public function index(): Response
    {
        $brands = VehicleBrand::withCount('allModels')
            ->with(['allModels' => fn ($q) => $q->orderBy('sort_order')->orderBy('name')])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $vehicleTypes = VehicleType::active()->get(['id', 'name', 'slug', 'icon']);

        return Inertia::render('Admin/Vehicles/Index', [
            'brands'       => $brands,
            'vehicleTypes' => $vehicleTypes,
        ]);
    }

    /* ────────────────────────────────────────────────────────────
     | STORE — créer une marque
     ──────────────────────────────────────────────────────────── */
    public function store(Request $request): RedirectResponse
    {        $data = $request->validate([
            'name' => ['required', 'string', 'max:80', 'unique:vehicle_brands,name'],
            'logo' => ['nullable', 'file', 'max:512', 'mimes:svg,png,webp,jpg,jpeg'],
        ]);

        $logoPath = null;
        if ($request->hasFile('logo')) {
            $logoPath = $request->file('logo')->store('brands', 'public');
        }

        VehicleBrand::create([
            'name'       => $data['name'],
            'slug'       => Str::slug($data['name']),
            'sort_order' => (VehicleBrand::max('sort_order') ?? 0) + 1,
            'is_active'  => true,
            'logo_path'  => $logoPath,
        ]);

        return back()->with('success', "Marque « {$data['name']} » créée.");
    }

    /* ────────────────────────────────────────────────────────────
     | UPDATE — modifier une marque
     ──────────────────────────────────────────────────────────── */
    public function update(Request $request, VehicleBrand $brand): RedirectResponse
    {        $data = $request->validate([
            'name' => ['required', 'string', 'max:80', "unique:vehicle_brands,name,{$brand->id}"],
            'logo' => ['nullable', 'file', 'max:512', 'mimes:svg,png,webp,jpg,jpeg'],
        ]);

        if ($request->hasFile('logo')) {
            if ($brand->logo_path) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($brand->logo_path);
            }
            $data['logo_path'] = $request->file('logo')->store('brands', 'public');
        }

        $brand->update([
            'name'      => $data['name'],
            'slug'      => Str::slug($data['name']),
            'logo_path' => $data['logo_path'] ?? $brand->logo_path,
        ]);

        return back()->with('success', "Marque « {$brand->name} » mise à jour.");
    }

    /* ────────────────────────────────────────────────────────────
     | DESTROY — supprimer une marque (si aucun ticket lié)
     ──────────────────────────────────────────────────────────── */
    public function destroy(VehicleBrand $brand): RedirectResponse
    {
        if ($brand->tickets()->exists()) {
            return back()->with('error', "Impossible de supprimer « {$brand->name} » : des tickets y sont liés.");
        }

        if ($brand->logo_path) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($brand->logo_path);
        }

        $brand->allModels()->delete();
        $brand->delete();

        return back()->with('success', "Marque « {$brand->name} » supprimée.");
    }

    /* ────────────────────────────────────────────────────────────
     | STORE MODEL — ajouter un modèle à une marque
     ──────────────────────────────────────────────────────────── */    public function storeModel(Request $request, VehicleBrand $brand): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
        ]);

        $slug = Str::slug($data['name']);

        if ($brand->allModels()->where('slug', $slug)->exists()) {
            return back()->withErrors(['name' => 'Ce modèle existe déjà pour cette marque.']);
        }

        VehicleModel::create([
            'brand_id'  => $brand->id,
            'name'      => $data['name'],
            'slug'      => $slug,
            'sort_order' => ($brand->allModels()->max('sort_order') ?? 0) + 1,
            'is_active' => true,
        ]);

        return back()->with('success', "Modèle « {$data['name']} » ajouté à {$brand->name}.");
    }

    /* ────────────────────────────────────────────────────────────
     | UPDATE MODEL
     ──────────────────────────────────────────────────────────── */
    public function updateModel(Request $request, VehicleBrand $brand, VehicleModel $model): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
        ]);

        $model->update([
            'name' => $data['name'],
            'slug' => Str::slug($data['name']),
        ]);

        return back()->with('success', "Modèle « {$model->name} » mis à jour.");
    }

    /* ────────────────────────────────────────────────────────────
     | DESTROY MODEL
     ──────────────────────────────────────────────────────────── */
    public function destroyModel(VehicleBrand $brand, VehicleModel $model): RedirectResponse
    {
        if ($model->tickets()->exists()) {
            return back()->with('error', "Impossible de supprimer « {$model->name} » : des tickets y sont liés.");
        }

        $model->delete();

        return back()->with('success', "Modèle « {$model->name} » supprimé.");
    }

    /* ────────────────────────────────────────────────────────────
     | EXPORT CSV — marques + modèles
     ──────────────────────────────────────────────────────────── */
    public function exportCsv(): HttpResponse
    {
        $brands = VehicleBrand::with('allModels')->orderBy('sort_order')->orderBy('name')->get();

        $rows   = [];
        $rows[] = ['brand_name', 'brand_country', 'brand_sort_order', 'brand_is_active',
                   'model_name', 'model_sort_order', 'model_is_active', 'suggested_vehicle_type'];

        foreach ($brands as $brand) {
            if ($brand->allModels->isEmpty()) {
                $rows[] = [
                    $brand->name, $brand->country ?? '', $brand->sort_order, $brand->is_active ? '1' : '0',
                    '', '', '', '',
                ];
            } else {
                foreach ($brand->allModels as $model) {
                    $rows[] = [
                        $brand->name, $brand->country ?? '', $brand->sort_order, $brand->is_active ? '1' : '0',
                        $model->name, $model->sort_order, $model->is_active ? '1' : '0',
                        $model->suggestedVehicleType?->name ?? '',
                    ];
                }
            }
        }

        $output  = fopen('php://temp', 'r+');
        foreach ($rows as $row) {
            fputcsv($output, $row);
        }
        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);

        return response($csv, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="vehicle_brands_' . now()->format('Ymd_His') . '.csv"',
        ]);
    }

    /* ────────────────────────────────────────────────────────────
     | IMPORT CSV — création bulk de marques + modèles
     ──────────────────────────────────────────────────────────── */
    public function importCsv(Request $request): RedirectResponse
    {
        $request->validate([
            'csv_file' => ['required', 'file', 'mimes:csv,txt', 'max:2048'],
        ]);

        $file     = $request->file('csv_file');
        $handle   = fopen($file->getPathname(), 'r');
        $header   = fgetcsv($handle); // skip header row
        $created  = ['brands' => 0, 'models' => 0];
        $errors   = [];
        $row      = 1;

        $vehicleTypes = VehicleType::all()->keyBy('name');

        while (($line = fgetcsv($handle)) !== false) {
            $row++;
            if (count($line) < 5) continue;

            [$brandName, $brandCountry, $brandSort, $brandActive, $modelName, $modelSort, $modelActive, $vtName] = array_pad($line, 8, '');

            $brandName = trim($brandName);
            if (empty($brandName)) continue;

            // Upsert brand
            $brand = VehicleBrand::firstOrCreate(
                ['slug' => Str::slug($brandName)],
                [
                    'name'       => $brandName,
                    'country'    => trim($brandCountry) ?: null,
                    'sort_order' => (int) $brandSort,
                    'is_active'  => $brandActive !== '0',
                ]
            );
            if ($brand->wasRecentlyCreated) $created['brands']++;

            // Create model if provided
            $modelName = trim($modelName);
            if (!empty($modelName)) {
                $slug = Str::slug($modelName);
                if (!$brand->allModels()->where('slug', $slug)->exists()) {
                    $vtId = $vehicleTypes[trim($vtName)]?->id ?? null;
                    VehicleModel::create([
                        'brand_id'                  => $brand->id,
                        'name'                      => $modelName,
                        'slug'                      => $slug,
                        'sort_order'                => (int) $modelSort,
                        'is_active'                 => $modelActive !== '0',
                        'suggested_vehicle_type_id' => $vtId,
                    ]);
                    $created['models']++;
                }
            }
        }
        fclose($handle);

        $msg = "Import terminé : {$created['brands']} marque(s) et {$created['models']} modèle(s) créés.";
        return back()->with('success', $msg);
    }
}
