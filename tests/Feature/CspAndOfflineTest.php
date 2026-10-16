<?php

namespace Tests\Feature;

use App\Http\Middleware\SecurityHeaders;
use Illuminate\Http\Request;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;
use Tighten\Ziggy\BladeRouteGenerator;

class CspAndOfflineTest extends TestCase
{
    public function test_login_inline_scripts_use_the_production_csp_nonce(): void
    {
        $this->app['env'] = 'production';
        BladeRouteGenerator::$generated = false;

        // Exercise the real root template and CSP middleware without requiring
        // application data or running database migrations.
        $response = TestResponse::fromBaseResponse((new SecurityHeaders)->handle(
            Request::create('/login'),
            fn () => response()->view('app', ['page' => [
                'component' => 'Auth/Login',
                'props' => [],
                'url' => '/login',
                'version' => null,
            ]]),
        ));
        $response->assertOk();

        $policy = $response->headers->get('Content-Security-Policy');
        $this->assertMatchesRegularExpression("/script-src[^;]*'nonce-([^']+)'/", $policy);
        preg_match("/script-src[^;]*'nonce-([^']+)'/", $policy, $matches);
        $nonce = $matches[1];
        $this->assertStringNotContainsString("'unsafe-inline'", explode(';', explode('script-src ', $policy)[1])[0]);

        $document = new \DOMDocument;
        @$document->loadHTML($response->getContent());
        $foundZiggy = false;

        foreach ($document->getElementsByTagName('script') as $script) {
            if ($script->hasAttribute('src') || trim($script->textContent) === '') {
                continue;
            }

            $this->assertSame($nonce, $script->getAttribute('nonce'), 'Inline script would be blocked by the production CSP.');
            $foundZiggy = $foundZiggy || str_contains($script->textContent, 'const Ziggy');
        }

        $this->assertTrue($foundZiggy, 'The login page must load Ziggy before calling route().');
    }

    public function test_offline_fallback_is_public_and_has_no_network_dependencies(): void
    {
        $response = $this->get('/offline');

        $response->assertOk()
            ->assertHeader('Content-Type', 'text/html; charset=utf-8')
            ->assertSee('Connexion indisponible');

        $document = new \DOMDocument;
        @$document->loadHTML($response->getContent());
        $this->assertCount(0, $document->getElementsByTagName('script'));
        $this->assertCount(0, $document->getElementsByTagName('link'));
        $this->assertCount(0, $document->getElementsByTagName('img'));
        $this->assertGuest();
    }
}
