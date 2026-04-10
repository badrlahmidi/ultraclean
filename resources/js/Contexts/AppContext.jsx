/**
 * AppContext.jsx — Sprint 5.3
 *
 * Global React context for stable data shared across the app:
 *  - Current user & role helpers
 *  - Active shift
 *  - App settings (center name, currency, etc.)
 *  - Permission helpers
 *
 * Avoids prop-drilling and repeated `usePage()` calls in deep components.
 */
import { createContext, useContext, useMemo } from 'react';
import { usePage } from '@inertiajs/react';

const AppContext = createContext(null);

/**
 * @returns {{
 *   user: object,
 *   role: string,
 *   isAdmin: boolean,
 *   isCaissier: boolean,
 *   isLaveur: boolean,
 *   activeShift: object|null,
 *   appName: string,
 *   can: (permission: string) => boolean,
 *   settings: object,
 * }}
 */
export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) {
        throw new Error('useApp() must be used within <AppProvider>');
    }
    return ctx;
}

const ROLE_PERMISSIONS = {
    admin: [
        'tickets.create', 'tickets.view', 'tickets.update', 'tickets.delete', 'tickets.pay',
        'clients.create', 'clients.view', 'clients.update', 'clients.delete',
        'shifts.view', 'shifts.create', 'shifts.close',
        'invoices.manage', 'quotes.manage', 'appointments.manage',
        'reports.view', 'settings.manage', 'users.manage', 'stock.manage',
    ],
    caissier: [
        'tickets.create', 'tickets.view', 'tickets.update', 'tickets.pay',
        'clients.create', 'clients.view', 'clients.update',
        'shifts.view', 'shifts.create', 'shifts.close',
        'appointments.view',
    ],
    laveur: [
        'tickets.view', 'tickets.update',
        'clients.view',
    ],
};

export function AppProvider({ children }) {
    const { auth, appName, activeShift, settings } = usePage().props;
    const user = auth?.user;
    const role = user?.role ?? 'guest';

    const value = useMemo(() => {
        const rolePerms = new Set(ROLE_PERMISSIONS[role] ?? []);

        return {
            user,
            role,
            isAdmin: role === 'admin',
            isCaissier: role === 'caissier',
            isLaveur: role === 'laveur',
            activeShift: activeShift ?? null,
            appName: appName ?? 'UltraClean',
            settings: settings ?? {},
            can: (permission) => rolePerms.has(permission),
        };
    }, [user, role, activeShift, appName, settings]);

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
}

export default AppContext;
