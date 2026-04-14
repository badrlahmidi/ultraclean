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
 *
 * AUDIT-FIX: The `can()` helper now uses the server-authoritative
 * `auth.permissions` list (shared via HandleInertiaRequests::share()) instead
 * of a client-side ROLE_PERMISSIONS map that could drift from backend policies.
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

export function AppProvider({ children }) {
    const { auth, appName, activeShift, settings } = usePage().props;
    const user = auth?.user;
    const role = user?.role ?? 'guest';

    // Use the server-provided permissions list as the single source of truth.
    // This list is built from the RBAC database (Policies + Gates) in
    // HandleInertiaRequests::share() and is always in sync with backend rules.
    const serverPermissions = auth?.permissions ?? [];

    const value = useMemo(() => {
        const permSet = new Set(serverPermissions);

        return {
            user,
            role,
            isAdmin: role === 'admin',
            isCaissier: role === 'caissier',
            isLaveur: role === 'laveur',
            activeShift: activeShift ?? null,
            appName: appName ?? 'UltraClean',
            settings: settings ?? {},
            can: (permission) => permSet.has(permission),
        };
    }, [user, role, serverPermissions, activeShift, appName, settings]);

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
}

export default AppContext;
