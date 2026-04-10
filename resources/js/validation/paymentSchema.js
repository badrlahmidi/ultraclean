/**
 * paymentSchema.js
 * Zod v4 schemas for payment processing.
 *
 * Used by: Caissier/Tickets/components/PaymentModal.jsx
 *
 * Note: PAYMENT_METHODS must stay in sync with the backend's
 * ProcessPaymentAction and the `enabledPaymentMethods` setting.
 */
import { z } from 'zod';

export const PAYMENT_METHODS = ['cash', 'card', 'mobile', 'wire', 'mixed', 'advance', 'credit'];

const centsNonNeg = z.number().int('Doit être un entier').min(0, 'Ne peut pas être négatif');

export const paymentSchema = z.object({
    method: z.enum(PAYMENT_METHODS, { error: 'Méthode de paiement invalide' }),
    amount_cash_cents: centsNonNeg.default(0),
    amount_card_cents: centsNonNeg.default(0),
    amount_mobile_cents: centsNonNeg.default(0),
    amount_wire_cents: centsNonNeg.default(0),
    note: z.string().max(255).optional().or(z.literal('')),
}).superRefine((data, ctx) => {
    const { method } = data;

    // Credit & advance: no minimum collected amount required
    if (method === 'credit') return;

    const total =
        method === 'mixed'
            ? data.amount_cash_cents + data.amount_card_cents +
            data.amount_mobile_cents + data.amount_wire_cents
            : method === 'cash' ? data.amount_cash_cents
                : method === 'card' ? data.amount_card_cents
                    : method === 'mobile' ? data.amount_mobile_cents
                        : method === 'wire' ? data.amount_wire_cents
                            : method === 'advance' ? data.amount_cash_cents
                                : 0;

    if (total <= 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Le montant encaissé doit être supérieur à 0',
            path: ['amount_cash_cents'],
        });
    }
});

/** Lightweight schema for quick cash-only payments */
export const quickCashSchema = z.object({
    amount_cash_cents: z.number().int().positive('Montant requis'),
    note: z.string().max(500).optional(),
});
