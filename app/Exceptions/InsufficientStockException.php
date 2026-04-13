<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;

/**
 * InsufficientStockException — Thrown when stock is insufficient for a payment.
 *
 * This exception provides detailed information about which products are lacking
 * and by how much, enabling the operator to make informed decisions.
 *
 * Behavior depends on config('stock.strict_mode'):
 *  - true:  Exception aborts the transaction (rollback)
 *  - false: Exception is not thrown; a warning flag is set on the ticket instead
 */
class InsufficientStockException extends Exception
{
    /**
     * @param  array<int, array{product: string, required: float, available: float}>  $insufficientItems
     */
    public function __construct(
        public readonly array $insufficientItems,
        public readonly ?string $ticketUlid = null,
    ) {
        $count = count($insufficientItems);
        $message = $count === 1
            ? "Stock insuffisant pour 1 produit"
            : "Stock insuffisant pour {$count} produits";

        parent::__construct($message);
    }

    /**
     * Render the exception for HTTP responses.
     */
    public function render(Request $request): JsonResponse|RedirectResponse
    {
        $details = collect($this->insufficientItems)
            ->map(fn ($item) => sprintf(
                '%s : %s requis, %s disponible',
                $item['product'],
                $item['required'],
                $item['available']
            ))
            ->implode('; ');

        if ($request->expectsJson()) {
            return response()->json([
                'error'   => 'insufficient_stock',
                'message' => $this->getMessage(),
                'details' => $details,
                'items'   => $this->insufficientItems,
            ], 422);
        }

        return back()->withErrors([
            'stock' => "{$this->getMessage()} : {$details}",
        ]);
    }

    /**
     * Report the exception to logging/monitoring.
     */
    public function report(): bool
    {
        // Let the default handler log it
        return false;
    }
}
