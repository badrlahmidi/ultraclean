<?php

namespace Tests\Unit;

use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * Tests du Setting model — Sprint 3 (batch loading + cache).
 */
class SettingTest extends TestCase
{
    use RefreshDatabase;

    public function test_get_returns_default_when_key_missing(): void
    {
        $this->assertEquals('fallback', Setting::get('nonexistent', 'fallback'));
    }

    public function test_get_returns_stored_value(): void
    {
        Setting::create(['key' => 'center_name', 'value' => 'UltraClean']);

        $this->assertEquals('UltraClean', Setting::get('center_name'));
    }

    public function test_get_caches_value(): void
    {
        Setting::create(['key' => 'center_name', 'value' => 'UltraClean']);

        // First call populates cache
        Setting::get('center_name');

        // Delete from DB — cached value should still be returned
        Setting::where('key', 'center_name')->delete();

        $this->assertEquals('UltraClean', Setting::get('center_name'));
    }

    public function test_set_invalidates_cache(): void
    {
        Setting::create(['key' => 'center_name', 'value' => 'OldName']);
        Setting::get('center_name'); // populate cache

        Setting::set('center_name', 'NewName');

        $this->assertEquals('NewName', Setting::get('center_name'));
    }

    public function test_get_many_returns_all_keys(): void
    {
        Setting::create(['key' => 'center_name', 'value' => 'UltraClean']);
        Setting::create(['key' => 'center_phone', 'value' => '0612345678']);

        $result = Setting::getMany(['center_name', 'center_phone', 'missing_key']);

        $this->assertEquals('UltraClean', $result['center_name']);
        $this->assertEquals('0612345678', $result['center_phone']);
        $this->assertEquals('', $result['missing_key']); // default
    }

    public function test_get_many_uses_cache_for_already_cached_keys(): void
    {
        Setting::create(['key' => 'center_name', 'value' => 'UltraClean']);
        Setting::create(['key' => 'center_phone', 'value' => '0612345678']);

        // Pre-cache one key
        Setting::get('center_name');

        // Delete it from DB
        Setting::where('key', 'center_name')->delete();

        // getMany should still find it from cache
        $result = Setting::getMany(['center_name', 'center_phone']);

        $this->assertEquals('UltraClean', $result['center_name']);
        $this->assertEquals('0612345678', $result['center_phone']);
    }

    public function test_get_many_with_custom_default(): void
    {
        $result = Setting::getMany(['nonexistent'], 'N/A');

        $this->assertEquals('N/A', $result['nonexistent']);
    }

    public function test_get_many_caches_fetched_values(): void
    {
        Setting::create(['key' => 'center_name', 'value' => 'UltraClean']);

        Setting::getMany(['center_name']);

        // Now delete from DB — should still be cached
        Setting::where('key', 'center_name')->delete();

        $this->assertEquals('UltraClean', Setting::get('center_name'));
    }

    public function test_cast_value_boolean(): void
    {
        Setting::create(['key' => 'portal_show_team', 'value' => '1', 'type' => 'boolean']);

        $this->assertTrue(Setting::get('portal_show_team'));
    }

    public function test_cast_value_integer(): void
    {
        Setting::create(['key' => 'business_open_hour', 'value' => '8', 'type' => 'integer']);

        $this->assertSame(8, Setting::get('business_open_hour'));
    }
}
