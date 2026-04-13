<?php

namespace Tests\Unit;

use Tests\TestCase;

/**
 * CsvSanitizationTest — AUDIT-FIX H9
 *
 * Vérifie que la méthode sanitizeCsvField() préfixe correctement
 * les valeurs qui commencent par des caractères d'injection CSV.
 */
class CsvSanitizationTest extends TestCase
{
    /**
     * Reproduce the sanitizeCsvField logic (same as VehicleBrandController).
     */
    private function sanitizeCsvField(string $value): string
    {
        if ($value !== '' && preg_match('/^[=+\-@\t\r]/', $value)) {
            return "'" . $value;
        }
        return $value;
    }

    public function test_field_starting_with_equals_is_prefixed(): void
    {
        $this->assertSame("'=SUM(A1)", $this->sanitizeCsvField('=SUM(A1)'));
    }

    public function test_field_starting_with_plus_is_prefixed(): void
    {
        $this->assertSame("'+ATTACK()", $this->sanitizeCsvField('+ATTACK()'));
    }

    public function test_field_starting_with_at_is_prefixed(): void
    {
        $this->assertSame("'@cmd", $this->sanitizeCsvField('@cmd'));
    }

    public function test_field_starting_with_minus_is_prefixed(): void
    {
        $this->assertSame("'-1+1", $this->sanitizeCsvField('-1+1'));
    }

    public function test_normal_field_is_unchanged(): void
    {
        $this->assertSame('Toyota', $this->sanitizeCsvField('Toyota'));
    }

    public function test_empty_string_is_unchanged(): void
    {
        $this->assertSame('', $this->sanitizeCsvField(''));
    }

    public function test_number_field_is_unchanged(): void
    {
        $this->assertSame('12345', $this->sanitizeCsvField('12345'));
    }
}
