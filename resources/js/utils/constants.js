/**
 * constants.js
 * Shared UI constants for status labels, colors, and badges.
 *
 * Import only what you need:
 *   import { TICKET_STATUS, APPT_STATUS, PAYMENT_METHOD_LABELS } from '@/utils/constants';
 */

// ─── Ticket statuses ──────────────────────────────────────────────────────────

/**
 * Full config per ticket status: Tailwind badge classes + display label.
 * Dark-mode variants included.
 *
 * Note: Components/StatusBadge.jsx uses a richer shape (separate bg/text/dot/pulse)
 * for its animated dot-indicator design and is intentionally kept self-contained.
 */
export const TICKET_STATUS = {
    pending: { label: 'En attente', cls: 'bg-yellow-100  dark:bg-yellow-900/30  text-yellow-700  dark:text-yellow-400' },
    in_progress: { label: 'En lavage', cls: 'bg-blue-100    dark:bg-blue-900/30    text-blue-700    dark:text-blue-400' },
    completed: { label: 'Terminé', cls: 'bg-green-100   dark:bg-green-900/30   text-green-700   dark:text-green-400' },
    paid: { label: 'Payé', cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
    cancelled: { label: 'Annulé', cls: 'bg-red-100     dark:bg-red-900/30     text-red-700     dark:text-red-400' },
    paused: { label: 'En pause', cls: 'bg-orange-100  dark:bg-orange-900/30  text-orange-700  dark:text-orange-400' },
    blocked: { label: 'Bloqué', cls: 'bg-gray-100    dark:bg-slate-700      text-gray-600    dark:text-gray-300' },
    partial: { label: 'Acompte', cls: 'bg-purple-100  dark:bg-purple-900/30  text-purple-700  dark:text-purple-400' },
};

/** Flat label map — for tables / selects that only need the string. */
export const TICKET_STATUS_LABELS = Object.fromEntries(
    Object.entries(TICKET_STATUS).map(([k, v]) => [k, v.label])
);

/**
 * Hex color map for charts (Recharts / Chart.js).
 * Keys match TICKET_STATUS keys.
 */
export const TICKET_STATUS_COLORS_HEX = {
    pending: '#f59e0b',
    in_progress: '#3b82f6',
    completed: '#10b981',
    paid: '#059669',
    cancelled: '#ef4444',
    paused: '#f97316',
    blocked: '#6b7280',
    partial: '#8b5cf6',
};

// ─── Appointment statuses ─────────────────────────────────────────────────────

/**
 * Appointment status config: Badge component color name + label.
 * `color` is the string accepted by the shared <Badge color="…"> component.
 */
export const APPT_STATUS = {
    pending: { label: 'En attente', color: 'yellow' },
    confirmed: { label: 'Confirmé', color: 'blue' },
    arrived: { label: 'Arrivé', color: 'indigo' },
    in_progress: { label: 'En cours', color: 'purple' },
    completed: { label: 'Terminé', color: 'green' },
    cancelled: { label: 'Annulé', color: 'red' },
    no_show: { label: 'Absent', color: 'gray' },
};

export const APPT_STATUS_LABELS = Object.fromEntries(
    Object.entries(APPT_STATUS).map(([k, v]) => [k, v.label])
);

/**
 * Tailwind CSS classes for appointment blocks in the calendar grid.
 * Keys match APPT_STATUS keys.
 */
export const APPT_STATUS_CALENDAR_CLS = {
    pending: 'bg-yellow-50  border-yellow-300  text-yellow-800',
    confirmed: 'bg-blue-50    border-blue-300    text-blue-800',
    arrived: 'bg-indigo-50  border-indigo-300  text-indigo-800',
    in_progress: 'bg-purple-50  border-purple-300  text-purple-800',
    completed: 'bg-green-50   border-green-300   text-green-800',
    cancelled: 'bg-gray-50    border-gray-200    text-gray-400 opacity-60',
    no_show: 'bg-gray-50    border-gray-200    text-gray-400 opacity-60',
};

// ─── Payment methods ──────────────────────────────────────────────────────────

export const PAYMENT_METHOD_LABELS = {
    cash: 'Espèces',
    card: 'Carte',
    mobile: 'Mobile',
    wire: 'Virement',
    mixed: 'Mixte',
    advance: 'Avance',
    credit: 'Crédit',
};

export const PAYMENT_METHOD_COLORS = {
    cash: 'bg-green-100   text-green-700',
    card: 'bg-blue-100    text-blue-700',
    mobile: 'bg-purple-100  text-purple-700',
    wire: 'bg-indigo-100  text-indigo-700',
    mixed: 'bg-orange-100  text-orange-700',
    advance: 'bg-amber-100   text-amber-700',
    credit: 'bg-red-100     text-red-700',
};
