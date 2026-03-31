/**
 * Formate un montant en centimes MAD en chaîne lisible.
 * Ex: formatMAD(7000) → "70,00 MAD"
 */
export function formatMAD(cents, opts = {}) {
    if (cents == null) return '—';
    return new Intl.NumberFormat('fr-MA', {
        style: 'currency',
        currency: 'MAD',
        minimumFractionDigits: 2,
        ...opts,
    }).format(cents / 100);
}

/**
 * Formate une date en français (Africa/Casablanca).
 */
export function formatDate(date, fmt = 'short') {
    if (!date) return '—';
    return new Intl.DateTimeFormat('fr-MA', {
        dateStyle: fmt,
        timeZone: 'Africa/Casablanca',
    }).format(new Date(date));
}

export function formatDateTime(date) {
    if (!date) return '—';
    return new Intl.DateTimeFormat('fr-MA', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'Africa/Casablanca',
    }).format(new Date(date));
}
