/**
 * ticketSchema.js
 * Zod v4 schemas for ticket creation and editing.
 *
 * Used by: Caissier/Tickets/Create.jsx, Caissier/Tickets/Edit.jsx
 */
import { z } from 'zod';

/* ── Sub-schemas ──────────────────────────────────────────────────── */

export const ticketLineSchema = z.object({
    service_id: z.number().int().positive(),
    unit_price_cents: z.number().int().min(0),
    quantity: z.number().int().min(1).max(10),
    discount_cents: z.number().int().min(0).default(0),
    price_variant_id: z.number().int().positive().nullable().optional(),
});

export const ticketVehicleSchema = z.object({
    vehicle_brand_id: z.number().int().positive().nullable().optional(),
    vehicle_model_id: z.number().int().positive().nullable().optional(), vehicle_plate: z.string()
        .max(20, 'Plaque trop longue (max 20 caractères)')
        .regex(/^[A-Z0-9\s-]*$/i, 'Plaque invalide')
        .nullable()
        .optional(),
});

/* ── Main ticket create schema ────────────────────────────────────── */

export const ticketCreateSchema = ticketVehicleSchema.extend({
    client_id: z.number().int().positive().nullable().optional(),
    assigned_to: z.number().int().positive().nullable().optional(),
    estimated_duration: z.number().int().min(1).max(480).nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
    services: z.array(ticketLineSchema).min(1, 'Ajoutez au moins un service'),
}).refine(
    (data) => data.services.length > 0,
    { message: 'Ajoutez au moins un service', path: ['services'] }
);

/* ── Ticket status transition schema ─────────────────────────────── */

export const ticketStatusSchema = z.object({
    status: z.enum(['in_progress', 'paused', 'blocked', 'completed', 'payment_pending', 'cancelled']),
    cancelled_reason: z.string().min(3, 'Précisez la raison (min 3 caractères)').max(255).optional(),
    pause_reason: z.string().max(255).optional(),
    payment_provider: z.string().max(50).optional(),
}).refine(
    (data) => data.status !== 'cancelled' || !!data.cancelled_reason,
    { message: 'La raison d\'annulation est requise', path: ['cancelled_reason'] }
);

/* ── Ticket edit schema (subset of createSchema) ─────────────────── */

export const ticketEditSchema = z.object({
    vehicle_plate: z.string().max(20).regex(/^[A-Z0-9\s-]*$/i, 'Plaque invalide').nullable().optional(),
    vehicle_brand_id: z.number().int().positive().nullable().optional(),
    vehicle_model_id: z.number().int().positive().nullable().optional(),
    assigned_to: z.number().int().positive().nullable().optional(),
    estimated_duration: z.number().int().min(1).max(480).nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
    services: z.array(ticketLineSchema).min(1, 'Ajoutez au moins un service'),
});
