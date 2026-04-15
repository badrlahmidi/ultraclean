/**
 * navConfig.js
 * ─────────────────────────────────────────────────────────────────
 * Source unique de vérité pour :
 *   - La configuration de navigation par rôle (ROLE_NAV) — rôles système
 *   - La navigation unifiée par permission (PERMISSION_NAV) — rôles personnalisés
 *   - Les labels, couleurs et routes de dashboard par rôle
 *   - Les helpers de routing et de détection de route active
 * ─────────────────────────────────────────────────────────────────
 */

import {
    LayoutDashboard, Ticket, Users, Settings,
    Wrench, ClipboardList, Car, BarChart3, ShieldCheck, Tag, CarFront, CalendarDays, CalendarRange,
    UserCheck, History, Search, Percent, Package, Gift, FileText, Receipt, RefreshCw,
    ScrollText, CreditCard, FilePlus, ShoppingCart, Truck, PlusSquare, ReceiptText,
    Wallet, Gauge, ListOrdered, Banknote,
} from 'lucide-react';

/* ─── Helper : route Ziggy safe (ne throw pas si route inconnue) ─── */
export function safeRoute(name, params = {}) {
    try {
        return route(name, params);
    } catch {
        return '#';
    }
}

/* ─── Helper : détection de route active (robuste, par segment de nom) ─── */
export function isRouteActive(currentRoute, itemHref) {
    // On retire les suffixes terminaux pour obtenir la racine du groupe
    const base = itemHref.replace(
        /\.(index|show|edit|history|search|stats|queue)$/,
        ''
    );
    const baseParts = base.split('.');
    const currentParts = currentRoute.split('.');
    // La route courante doit matcher EXACTEMENT tous les segments de base
    // Exemple : base = 'admin.settings', current = 'admin.settings.index' → ✅
    //           base = 'admin.settings', current = 'admin.settings-other'  → ❌
    return (
        currentParts.length >= baseParts.length &&
        baseParts.every((part, i) => currentParts[i] === part)
    );
}

/* ─── Routes de dashboard par rôle ─── */
export const ROLE_DASHBOARD = {
    admin: 'admin.dashboard',
    caissier: 'caissier.dashboard',
    laveur: 'laveur.queue',
};

/* ─── Labels et couleurs d'avatar par rôle ─── */
export const ROLE_LABELS = {
    admin: 'Administrateur',
    caissier: 'Caissier',
    laveur: 'Laveur',
};

export const ROLE_COLORS = {
    admin: 'bg-purple-600',
    caissier: 'bg-blue-600',
    laveur: 'bg-green-600',
};

/* ─── Configuration de navigation par rôle (rôles système existants) ──────
 *
 * Structure d'un item :
 *   { label, href, icon, accent?, alertKey? }
 *
 * Structure d'un groupe :
 *   { type: 'group', label, icon, key, activeRoutes: string[], children: item[] }
 *
 * Séparateur :
 *   { type: 'divider' }
 * ─────────────────────────────────────────────────────────────────── */
export const ROLE_NAV = {
    admin: [
        /* ── 1. Tableau de bord ── */
        { label: 'Tableau de bord', href: 'admin.dashboard', icon: LayoutDashboard },
        { type: 'divider' },

        /* ── 2. Rendez-vous ── */
        {
            type: 'group', icon: CalendarDays, key: 'appointments',
            label: 'Rendez-vous',
            activeRoutes: ['admin.appointments'],
            children: [
                { label: 'Liste', href: 'admin.appointments.index', icon: CalendarDays },
                { label: 'Calendrier', href: 'admin.appointments.calendar', icon: CalendarRange },
            ],
        },
        { type: 'divider' },        /* ── 3. Tickets / Caisse ── */
        {
            type: 'group', icon: Ticket, key: 'caisse',
            label: 'Tickets / Caisse',
            activeRoutes: ['caissier', 'admin.payments', 'laveur', 'caissier.planning'],
            children: [
                { label: 'Accès Caisse', href: 'caissier.dashboard', icon: ShieldCheck },
                { label: 'Tickets en cours', href: 'caissier.tickets.index', icon: ListOrdered },
                { label: 'Nouveau ticket', href: 'caissier.tickets.create', icon: FilePlus, accent: true },
                { label: 'Point de Vente', href: 'caissier.pos.create', icon: ShoppingCart, accent: true },
                { label: 'Ventes POS', href: 'caissier.pos.index', icon: ReceiptText },
                { label: 'Historique paiements', href: 'admin.payments.index', icon: CreditCard },
                { label: 'Shifts / Caisse', href: 'caissier.shift.index', icon: ShieldCheck },
                { label: 'Dépenses', href: 'caissier.depenses.index', icon: Banknote },
                { label: "File d'attente", href: 'laveur.queue', icon: Car },
                { label: 'Planning du jour', href: 'caissier.planning', icon: CalendarRange },
            ],
        },
        { type: 'divider' },

        /* ── 4. Gestion commerciale ── */
        {
            type: 'group', icon: ReceiptText, key: 'commercial',
            label: 'Gestion commerciale',
            activeRoutes: ['admin.quotes', 'admin.invoices', 'admin.ticket-templates'],
            children: [
                { label: 'Liste Devis', href: 'admin.quotes.index', icon: FileText },
                { label: 'Créer Devis', href: 'admin.quotes.create', icon: FilePlus },
                { label: 'Liste Factures', href: 'admin.invoices.index', icon: Receipt },
                { label: 'Créer Facture', href: 'admin.invoices.create', icon: FilePlus },
                { label: 'Templates récurrents', href: 'admin.ticket-templates.index', icon: RefreshCw },
            ],
        },
        { type: 'divider' },

        /* ── 5. Clients ── */
        {
            type: 'group', icon: Users, key: 'clients',
            label: 'Clients',
            activeRoutes: ['admin.clients', 'admin.promotions', 'admin.loyalty'],
            children: [
                { label: 'Liste clients', href: 'admin.clients.index', icon: Users },
                { label: 'Ajouter client', href: 'admin.clients.create', icon: PlusSquare },
                { label: 'Promotions & codes', href: 'admin.promotions.index', icon: Percent },
                { label: 'Fidélité clients', href: 'admin.loyalty.index', icon: Gift },
            ],
        },
        { type: 'divider' },

        /* ── 6. Gestion du stock ── */
        {
            type: 'group', icon: Package, key: 'stock',
            label: 'Gestion du stock',
            activeRoutes: ['admin.stock', 'admin.suppliers', 'admin.purchases', 'admin.sellable-products'],
            children: [
                { label: 'Liste produits', href: 'admin.stock.index', icon: Package, alertKey: 'stockAlerts' },
                { label: 'Nouveau produit', href: 'admin.stock.create', icon: PlusSquare },
                { label: 'Produits vendables', href: 'admin.sellable-products.index', icon: Tag },
                { label: 'Fournisseurs', href: 'admin.suppliers.index', icon: Truck },
                { label: 'Nouvel Achat', href: 'admin.purchases.create', icon: ShoppingCart },
            ],
        },
        { type: 'divider' },

        /* ── 7. Rapports & exports ── */
        {
            type: 'group', icon: BarChart3, key: 'reports',
            label: 'Rapports & exports',
            activeRoutes: ['admin.reports', 'admin.payments', 'admin.employees'],
            children: [
                { label: 'Rapport Tickets', href: 'admin.reports.tickets', icon: ClipboardList },
                { label: 'Rapport Caisse', href: 'admin.reports.caisse', icon: Wallet },
                { label: 'Rapport paiements', href: 'admin.payments.index', icon: CreditCard },
                { label: 'Rapport véhicules', href: 'admin.reports.vehicles', icon: Car },
                { label: 'Rapport shifts', href: 'admin.reports.shifts', icon: Gauge },
                { label: 'Performance laveurs', href: 'admin.employees.index', icon: UserCheck },
            ],
        },
        { type: 'divider' },

        /* ── 8. Configuration ── */
        {
            type: 'group', icon: Settings, key: 'config',
            label: 'Configuration',
            activeRoutes: [
                'admin.settings', 'admin.users', 'admin.services',
                'admin.price-categories', 'admin.vehicles', 'admin.activity-log',
                'admin.roles',
            ],
            children: [
                { label: 'Paramètres', href: 'admin.settings.index', icon: Settings },
                { label: 'Utilisateurs', href: 'admin.users.index', icon: Users },
                { label: 'Rôles & Permissions', href: 'admin.roles.index', icon: ShieldCheck },
                { label: 'Services & tarifs', href: 'admin.services.index', icon: Wrench },
                { label: 'Catégories de prix', href: 'admin.price-categories.index', icon: Tag },
                { label: 'Marques & Modèles', href: 'admin.vehicles.index', icon: CarFront },
                { label: "Journal d'audit", href: 'admin.activity-log.index', icon: ScrollText },
            ],
        },
    ],

    caissier: [
        { label: 'Tableau de bord', href: 'caissier.dashboard', icon: LayoutDashboard },
        { type: 'divider' },
        { label: 'Nouveau ticket', href: 'caissier.tickets.create', icon: Ticket, accent: true },
        { type: 'divider' },

        { label: 'Tickets du jour', href: 'caissier.tickets.index', icon: ClipboardList },
        { label: 'Recherche tickets', href: 'caissier.tickets.search', icon: Search },

        { type: 'divider' },
        /* ── Point de Vente ── */
        { label: 'Point de Vente', href: 'caissier.pos.create', icon: ShoppingCart, accent: true },
        { label: 'Ventes du jour', href: 'caissier.pos.index', icon: ReceiptText },
        { type: 'divider' },

        /* ── Rendez-vous (sous-menu) ── */
        {
            type: 'group', icon: CalendarDays, key: 'caissier-appointments',
            label: 'Rendez-vous',
            activeRoutes: ['caissier.appointments'],
            children: [
                { label: 'Liste', href: 'caissier.appointments.index', icon: CalendarDays },
                { label: 'Calendrier', href: 'caissier.appointments.calendar', icon: CalendarRange },
            ],
        },
        { label: 'Planning', href: 'caissier.planning', icon: CalendarRange },
        { label: 'Clients', href: 'caissier.clients.index', icon: Users },

        { type: 'divider' },        /* ── Caisse (sous-menu) ── */
        {
            type: 'group', icon: ShieldCheck, key: 'caisse',
            label: 'Caisse',
            activeRoutes: ['caissier.shift', 'caissier.depenses'],
            children: [
                { label: 'Shift courant', href: 'caissier.shift.index', icon: ShieldCheck },
                { label: 'Historique', href: 'caissier.shift.history', icon: History },
                { label: 'Dépenses', href: 'caissier.depenses.index', icon: Banknote },
            ],
        },
        { label: 'Promotions', href: 'caissier.promotions.index', icon: Percent },
        { type: 'divider' },
        { label: "File d'attente", href: 'laveur.queue', icon: Car },
    ],

    laveur: [
        { label: "File d'attente", href: 'laveur.queue', icon: Car },
        { label: 'Mes stats', href: 'laveur.stats', icon: BarChart3 },
    ],
};

/* ─── Navigation unifiée par permission (pour les rôles personnalisés) ──────
 *
 * Chaque item a un champ `permission` (string) ou est sans restriction.
 * `getVisibleNav(permissions)` filtre cette liste selon les permissions
 * de l'utilisateur connecté.
 * ─────────────────────────────────────────────────────────────────── */
export const PERMISSION_NAV = [
    /* ── Tableau de bord ── */
    { label: 'Tableau de bord',       href: 'admin.dashboard',    icon: LayoutDashboard, permission: 'admin.dashboard' },
    { label: 'Tableau de bord',       href: 'caissier.dashboard', icon: LayoutDashboard, permission: 'caissier.dashboard' },
    { type: 'divider' },

    /* ── Tickets ── */
    { label: 'Nouveau ticket',        href: 'caissier.tickets.create', icon: Ticket, accent: true, permission: 'tickets.create' },
    { label: 'Tickets du jour',       href: 'caissier.tickets.index',  icon: ClipboardList,         permission: 'tickets.view' },
    { label: 'Recherche tickets',     href: 'caissier.tickets.search', icon: Search,                permission: 'tickets.view' },
    { type: 'divider' },

    /* ── Point de Vente ── */
    { label: 'Point de Vente', href: 'caissier.pos.create', icon: ShoppingCart, accent: true, permission: 'pos.access' },
    { label: 'Ventes du jour', href: 'caissier.pos.index',  icon: ReceiptText,                permission: 'pos.access' },
    { type: 'divider' },

    /* ── Rendez-vous admin ── */
    {
        type: 'group', key: 'admin-appointments', icon: CalendarDays,
        label: 'Rendez-vous', permission: 'admin.appointments',
        activeRoutes: ['admin.appointments'],
        children: [
            { label: 'Liste',      href: 'admin.appointments.index',    icon: CalendarDays },
            { label: 'Calendrier', href: 'admin.appointments.calendar', icon: CalendarRange },
        ],
    },

    /* ── Rendez-vous caissier ── */
    {
        type: 'group', key: 'caissier-appointments', icon: CalendarDays,
        label: 'Rendez-vous', permission: 'caissier.appointments',
        activeRoutes: ['caissier.appointments'],
        children: [
            { label: 'Liste',      href: 'caissier.appointments.index',    icon: CalendarDays },
            { label: 'Calendrier', href: 'caissier.appointments.calendar', icon: CalendarRange },
        ],
    },

    /* ── Planning ── */
    { label: 'Planning',   href: 'caissier.planning',      icon: CalendarRange, permission: 'planning.view' },

    /* ── Clients (caissier) ── */
    { label: 'Clients',    href: 'caissier.clients.index', icon: Users,         permission: 'clients.view' },
    { type: 'divider' },

    /* ── Caisse / Shifts ── */
    {
        type: 'group', key: 'caisse', icon: ShieldCheck,
        label: 'Caisse', permission: 'shifts.manage',
        activeRoutes: ['caissier.shift', 'caissier.depenses'],
        children: [
            { label: 'Shift courant', href: 'caissier.shift.index',    icon: ShieldCheck },
            { label: 'Historique',    href: 'caissier.shift.history',  icon: History },
            { label: 'Dépenses',      href: 'caissier.depenses.index', icon: Banknote },
        ],
    },

    /* ── Promotions (lecture) ── */
    { label: 'Promotions', href: 'caissier.promotions.index', icon: Percent, permission: 'promotions.view' },
    { type: 'divider' },

    /* ── File d'attente ── */
    { label: "File d'attente", href: 'laveur.queue', icon: Car,      permission: 'queue.view' },
    { label: 'Mes stats',      href: 'laveur.stats', icon: BarChart3, permission: 'laveur.stats' },
    { type: 'divider' },

    /* ── Gestion commerciale ── */
    {
        type: 'group', key: 'commercial', icon: ReceiptText,
        label: 'Gestion commerciale', permission: 'quotes.manage',
        activeRoutes: ['admin.quotes', 'admin.invoices', 'admin.ticket-templates'],
        children: [
            { label: 'Liste Devis',          href: 'admin.quotes.index',            icon: FileText },
            { label: 'Créer Devis',          href: 'admin.quotes.create',           icon: FilePlus },
            { label: 'Liste Factures',       href: 'admin.invoices.index',          icon: Receipt },
            { label: 'Créer Facture',        href: 'admin.invoices.create',         icon: FilePlus },
            { label: 'Templates récurrents', href: 'admin.ticket-templates.index',  icon: RefreshCw },
        ],
    },
    { type: 'divider' },

    /* ── Clients admin (gestion complète) ── */
    {
        type: 'group', key: 'admin-clients', icon: Users,
        label: 'Clients', permission: 'clients.manage',
        activeRoutes: ['admin.clients', 'admin.promotions', 'admin.loyalty'],
        children: [
            { label: 'Liste clients',     href: 'admin.clients.index',    icon: Users },
            { label: 'Ajouter client',    href: 'admin.clients.create',   icon: PlusSquare },
            { label: 'Promotions & codes',href: 'admin.promotions.index', icon: Percent },
            { label: 'Fidélité clients',  href: 'admin.loyalty.index',    icon: Gift },
        ],
    },
    { type: 'divider' },

    /* ── Stock ── */
    {
        type: 'group', key: 'stock', icon: Package,
        label: 'Gestion du stock', permission: 'stock.manage',
        activeRoutes: ['admin.stock', 'admin.suppliers', 'admin.purchases', 'admin.sellable-products'],
        children: [
            { label: 'Liste produits',     href: 'admin.stock.index',              icon: Package, alertKey: 'stockAlerts' },
            { label: 'Nouveau produit',    href: 'admin.stock.create',             icon: PlusSquare },
            { label: 'Produits vendables', href: 'admin.sellable-products.index',  icon: Tag },
            { label: 'Fournisseurs',       href: 'admin.suppliers.index',          icon: Truck },
            { label: 'Nouvel Achat',       href: 'admin.purchases.create',         icon: ShoppingCart },
        ],
    },
    { type: 'divider' },

    /* ── Rapports ── */
    {
        type: 'group', key: 'reports', icon: BarChart3,
        label: 'Rapports & exports', permission: 'reports.view',
        activeRoutes: ['admin.reports', 'admin.payments', 'admin.employees'],
        children: [
            { label: 'Rapport Tickets',    href: 'admin.reports.tickets',  icon: ClipboardList },
            { label: 'Rapport Caisse',     href: 'admin.reports.caisse',   icon: Wallet },
            { label: 'Rapport paiements',  href: 'admin.payments.index',   icon: CreditCard },
            { label: 'Rapport véhicules',  href: 'admin.reports.vehicles', icon: Car },
            { label: 'Rapport shifts',     href: 'admin.reports.shifts',   icon: Gauge },
            { label: 'Performance laveurs',href: 'admin.employees.index',  icon: UserCheck },
        ],
    },
    { type: 'divider' },

    /* ── Configuration ── */
    {
        type: 'group', key: 'config', icon: Settings,
        label: 'Configuration', permission: 'settings.manage',
        activeRoutes: [
            'admin.settings', 'admin.users', 'admin.services',
            'admin.price-categories', 'admin.vehicles', 'admin.activity-log',
            'admin.roles',
        ],
        children: [
            { label: 'Paramètres',         href: 'admin.settings.index',       icon: Settings },
            { label: 'Utilisateurs',       href: 'admin.users.index',           icon: Users },
            { label: 'Rôles & Permissions',href: 'admin.roles.index',           icon: ShieldCheck },
            { label: 'Services & tarifs',  href: 'admin.services.index',        icon: Wrench },
            { label: 'Catégories de prix', href: 'admin.price-categories.index',icon: Tag },
            { label: 'Marques & Modèles',  href: 'admin.vehicles.index',        icon: CarFront },
            { label: "Journal d'audit",    href: 'admin.activity-log.index',    icon: ScrollText },
        ],
    },
];

/* ─── getVisibleNav : filtre PERMISSION_NAV selon les permissions utilisateur ──
 *
 * - Les items sans `permission` sont toujours affichés
 * - Les dividers consécutifs ou isolés sont supprimés
 * ─────────────────────────────────────────────────────────────────── */
export function getVisibleNav(permissions) {
    const perms = new Set(permissions);

    const filtered = PERMISSION_NAV.filter(item => {
        if (item.type === 'divider') return true; // Traité après
        if (!item.permission) return true;        // Pas de restriction
        return perms.has(item.permission);
    });

    // Nettoyer les dividers superflus (consécutifs, en tête, en queue)
    return filtered.reduce((acc, item, idx, arr) => {
        if (item.type === 'divider') {
            const prev = acc[acc.length - 1];
            const next = arr.slice(idx + 1).find(x => x.type !== 'divider');
            if (prev && prev.type !== 'divider' && next) {
                acc.push(item);
            }
        } else {
            acc.push(item);
        }
        return acc;
    }, []);
}

/* ─── getNavForUser : choisit la navigation selon le rôle / les permissions ──
 *
 * - Rôles système (admin/caissier/laveur) → ROLE_NAV existant (inchangé)
 * - Rôles personnalisés → PERMISSION_NAV filtré par permissions
 * ─────────────────────────────────────────────────────────────────── */
export function getNavForUser(role, permissions) {
    if (role && ROLE_NAV[role]) {
        return ROLE_NAV[role];
    }
    return getVisibleNav(permissions);
}
