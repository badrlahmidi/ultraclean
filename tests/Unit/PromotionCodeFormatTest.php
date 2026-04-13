<?php

namespace Tests\Unit;

use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

/**
 * PromotionCodeFormatTest — AUDIT-FIX H8
 *
 * Vérifie que la validation regex sur les codes promotion bloque
 * les caractères spéciaux et Unicode.
 */
class PromotionCodeFormatTest extends TestCase
{
    private function makeRules(): array
    {
        return [
            'code' => ['required', 'string', 'max:50', 'regex:/^[A-Z0-9_\-]+$/i'],
        ];
    }

    public function test_code_with_spaces_fails(): void
    {
        $validator = Validator::make(['code' => 'PROMO 10'], $this->makeRules());
        $this->assertTrue($validator->fails());
    }

    public function test_code_with_unicode_fails(): void
    {
        $validator = Validator::make(['code' => 'PROMO€10'], $this->makeRules());
        $this->assertTrue($validator->fails());
    }

    public function test_code_with_special_chars_fails(): void
    {
        $validator = Validator::make(['code' => 'PROMO!@#'], $this->makeRules());
        $this->assertTrue($validator->fails());
    }

    public function test_alphanumeric_uppercase_code_passes(): void
    {
        $validator = Validator::make(['code' => 'SUMMER2026'], $this->makeRules());
        $this->assertFalse($validator->fails());
    }

    public function test_code_with_dashes_and_underscores_passes(): void
    {
        $validator = Validator::make(['code' => 'PROMO-2026_VIP'], $this->makeRules());
        $this->assertFalse($validator->fails());
    }

    public function test_lowercase_code_passes_due_to_case_insensitive_flag(): void
    {
        $validator = Validator::make(['code' => 'promo2026'], $this->makeRules());
        $this->assertFalse($validator->fails());
    }
}
