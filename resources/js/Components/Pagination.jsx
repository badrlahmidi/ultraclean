import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

/**
 * Pagination — Composant de pagination touch-friendly réutilisable.
 * Compatible avec la structure de pagination Laravel (paginate()).
 *
 * @example
 * <Pagination links={tickets} />
 *
 * // Avec les props Laravel paginator :
 * // links.current_page, links.last_page,
 * // links.prev_page_url, links.next_page_url,
 * // links.from, links.to, links.total
 */
export default function Pagination({ links, className = '' }) {
    if (!links || links.last_page <= 1) return null;

    const {
        current_page,
        last_page,
        prev_page_url,
        next_page_url,
        from,
        to,
        total,
    } = links;

    // Génère un tableau de numéros de pages à afficher (avec ellipsis)
    const getPages = () => {
        const pages = [];
        const delta = 1; // pages autour de la page courante
        const left = current_page - delta;
        const right = current_page + delta;

        for (let i = 1; i <= last_page; i++) {
            if (i === 1 || i === last_page || (i >= left && i <= right)) {
                pages.push(i);
            } else if (pages[pages.length - 1] !== '...') {
                pages.push('...');
            }
        }
        return pages;
    };

    // Reconstruit l'URL de la page n à partir de prev/next
    const pageUrl = (page) => {
        const base = prev_page_url || next_page_url || '';
        try {
            const url = new URL(base, window.location.origin);
            url.searchParams.set('page', page);
            return url.pathname + url.search;
        } catch {
            return `?page=${page}`;
        }
    };

    const btnBase = clsx(
        'inline-flex items-center justify-center',
        'min-w-[44px] min-h-[44px] px-2',
        'rounded-lg text-sm font-medium transition-colors touch-manipulation',
    );

    return (
        <div className={clsx('flex items-center justify-between gap-4 px-4 py-3', className)}>
            {/* Résumé texte */}
            <p className="text-xs text-gray-500 hidden sm:block">
                {from}–{to} sur <span className="font-medium text-gray-700">{total}</span>
            </p>
            <p className="text-xs text-gray-500 sm:hidden">
                Page {current_page}/{last_page}
            </p>

            {/* Contrôles */}
            <div className="flex items-center gap-1">
                {/* Précédent */}
                {prev_page_url ? (
                    <Link
                        href={prev_page_url}
                        className={clsx(btnBase, 'text-gray-600 hover:bg-gray-100')}
                        aria-label="Page précédente"
                    >
                        <ChevronLeft size={18} />
                    </Link>
                ) : (
                    <span className={clsx(btnBase, 'text-gray-300 cursor-not-allowed')}>
                        <ChevronLeft size={18} />
                    </span>
                )}

                {/* Numéros de pages */}
                <div className="hidden sm:flex items-center gap-1">
                    {getPages().map((page, i) =>
                        page === '...' ? (
                            <span key={`ellipsis-${i}`} className="w-8 text-center text-gray-400 text-sm">
                                …
                            </span>
                        ) : (
                            <Link
                                key={page}
                                href={pageUrl(page)}
                                className={clsx(
                                    btnBase,
                                    page === current_page
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-gray-600 hover:bg-gray-100',
                                )}
                                aria-label={`Page ${page}`}
                                aria-current={page === current_page ? 'page' : undefined}
                            >
                                {page}
                            </Link>
                        )
                    )}
                </div>

                {/* Suivant */}
                {next_page_url ? (
                    <Link
                        href={next_page_url}
                        className={clsx(btnBase, 'text-gray-600 hover:bg-gray-100')}
                        aria-label="Page suivante"
                    >
                        <ChevronRight size={18} />
                    </Link>
                ) : (
                    <span className={clsx(btnBase, 'text-gray-300 cursor-not-allowed')}>
                        <ChevronRight size={18} />
                    </span>
                )}
            </div>
        </div>
    );
}
