<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $fillable = ['key', 'value', 'type', 'group', 'description'];

    /** Récupère une valeur de config avec cache 1h. */
    public static function get(string $key, mixed $default = null): mixed
    {
        return Cache::remember("setting:{$key}", 3600, function () use ($key, $default) {
            $setting = static::where('key', $key)->first();
            return $setting ? $setting->castValue() : $default;
        });
    }    /** Met à jour et invalide le cache. */
    public static function set(string $key, mixed $value): void
    {
        // Sérialise les types non-scalaires pour que castValue() puisse les décoder.
        $type = null;

        if (is_array($value) || is_object($value)) {
            $type  = 'json';
            $value = json_encode($value, JSON_UNESCAPED_UNICODE);
        } elseif (is_bool($value)) {
            $type  = 'boolean';
            $value = $value ? '1' : '0';
        } elseif (is_int($value)) {
            $type  = 'integer';
            $value = (string) $value;
        } elseif (is_float($value)) {
            $type  = 'float';
            $value = (string) $value;
        }

        $data = ['value' => $value];
        if ($type !== null) {
            $data['type'] = $type;
        }

        static::updateOrCreate(['key' => $key], $data);
        Cache::forget("setting:{$key}");
    }

    /**
     * Charge plusieurs settings d'un coup (1 requête SQL pour les clés non cachées).
     *
     * @param  array<string>  $keys
     * @param  mixed  $default  Valeur par défaut pour les clés absentes
     * @return array<string, mixed>
     */
    public static function getMany(array $keys, mixed $default = ''): array
    {
        $result  = [];
        $missing = [];

        // Vérifier le cache d'abord
        foreach ($keys as $key) {
            $cached = Cache::get("setting:{$key}");
            if ($cached !== null) {
                $result[$key] = $cached;
            } else {
                $missing[] = $key;
            }
        }

        // Charger les manquants en une seule requête
        if (! empty($missing)) {
            $rows = static::whereIn('key', $missing)->get()->keyBy('key');

            foreach ($missing as $key) {
                $value = isset($rows[$key]) ? $rows[$key]->castValue() : $default;
                Cache::put("setting:{$key}", $value, 3600);
                $result[$key] = $value;
            }
        }

        return $result;
    }

    /** Caste la valeur selon le type stocké. */
    public function castValue(): mixed
    {
        return match ($this->type) {
            'boolean' => filter_var($this->value, FILTER_VALIDATE_BOOLEAN),
            'integer' => (int) $this->value,
            'float'   => (float) $this->value,
            'json'    => json_decode($this->value, true),
            default   => $this->value,
        };
    }
}
