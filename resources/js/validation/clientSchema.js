/**
 * clientSchema.js
 * Zod v4 schemas for client creation and editing.
 *
 * Used by: Admin/Clients/Create.jsx, Caissier/Clients forms
 */
import { z } from 'zod';

/* ── Phone validation (Moroccan format, flexible) ─────────────────── */
const phoneRegex = /^(?:\+?212|0)[5-7]\d{8}$/;

export const clientCreateSchema = z.object({
    name: z.string()
        .min(2, 'Le nom doit comporter au moins 2 caractères')
        .max(100, 'Le nom ne peut pas dépasser 100 caractères')
        .trim(),

    phone: z.string()
        .regex(phoneRegex, 'Numéro de téléphone invalide (ex: 0612345678)')
        .optional()
        .or(z.literal('')),

    email: z.string()
        .email('Adresse email invalide')
        .max(150)
        .optional()
        .or(z.literal('')), vehicle_plate: z.string()
            .max(20, 'Plaque trop longue')
            .regex(/^[A-Z0-9\s-]*$/i, 'Format de plaque invalide')
            .optional()
            .or(z.literal('')),

    is_company: z.boolean().default(false),

    ice: z.string()
        .regex(/^\d{15}$/, 'L\'ICE doit comporter exactement 15 chiffres')
        .optional()
        .or(z.literal('')),

    notes: z.string().max(1000).optional().or(z.literal('')),

    is_active: z.boolean().default(true),
}).refine(
    (data) => !data.is_company || (data.ice && data.ice.length === 15),
    { message: 'L\'ICE est obligatoire pour une entreprise', path: ['ice'] }
);

export const clientEditSchema = clientCreateSchema;

/* ── Minimal search / quick-add schema ───────────────────────────── */
export const clientQuickSchema = z.object({
    name: z.string().min(2).max(100).trim(),
    phone: z.string().regex(phoneRegex, 'Numéro invalide').optional().or(z.literal('')),
});
