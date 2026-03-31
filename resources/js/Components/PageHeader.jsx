import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';

/**
 * PageHeader — En-tête de page réutilisable avec breadcrumbs et slot d'actions.
 *
 * @example
 * <PageHeader
 *   title="Utilisateurs"
 *   breadcrumbs={[
 *     { label: 'Admin', href: 'admin.dashboard' },
 *     { label: 'Utilisateurs' },
 *   ]}
 * >
 *   <button>Nouvel utilisateur</button>
 * </PageHeader>
 */
export default function PageHeader({ title, subtitle, breadcrumbs = [], children }) {
    return (
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-5">
            <div className="min-w-0">
                {/* Breadcrumbs */}
                {breadcrumbs.length > 0 && (
                    <nav aria-label="Breadcrumb" className="flex items-center gap-1 mb-1 flex-wrap">
                        {breadcrumbs.map((crumb, i) => {
                            const isLast = i === breadcrumbs.length - 1;
                            return (
                                <span key={i} className="flex items-center gap-1">
                                    {i > 0 && (
                                        <ChevronRight size={12} className="text-gray-400 flex-shrink-0" />
                                    )}
                                    {!isLast && crumb.href ? (
                                        <Link
                                            href={route(crumb.href)}
                                            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            {crumb.label}
                                        </Link>
                                    ) : (
                                        <span className={`text-xs ${isLast ? 'text-gray-600 font-medium' : 'text-gray-400'}`}>
                                            {crumb.label}
                                        </span>
                                    )}
                                </span>
                            );
                        })}
                    </nav>
                )}

                {/* Titre principal */}
                <h1 className="text-xl font-bold text-gray-800 truncate">{title}</h1>
                {subtitle && (
                    <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
                )}
            </div>

            {/* Actions slot */}
            {children && (
                <div className="flex items-center gap-2 flex-wrap mt-2 sm:mt-0 flex-shrink-0">
                    {children}
                </div>
            )}
        </div>
    );
}
