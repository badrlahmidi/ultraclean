/**
 * SkeletonLoader — États de chargement animés réutilisables.
 *
 * @example
 * // Skeleton de tableau (lignes)
 * <SkeletonLoader.Table rows={5} cols={4} />
 *
 * // Skeleton de cards (grille)
 * <SkeletonLoader.Cards count={4} />
 *
 * // Skeleton de stat cards
 * <SkeletonLoader.Stats count={4} />
 *
 * // Bloc de texte générique
 * <SkeletonLoader.Block lines={3} />
 */

/* ── Brique de base pulsante ── */
function Pulse({ className = '' }) {
    return (
        <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
    );
}

/* ── Tableau ── */
function TableSkeleton({ rows = 5, cols = 4 }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex gap-4">
                {Array.from({ length: cols }).map((_, i) => (
                    <Pulse key={i} className="h-3 flex-1" style={{ maxWidth: i === 0 ? '120px' : undefined }} />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="px-4 py-3.5 border-b border-gray-100 last:border-0 flex gap-4 items-center">
                    {Array.from({ length: cols }).map((_, c) => (
                        <Pulse
                            key={c}
                            className={`h-3 ${c === 0 ? 'w-32' : c === cols - 1 ? 'w-16 ml-auto' : 'flex-1'}`}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

/* ── Cards grille ── */
function CardsSkeleton({ count = 4, className = '' }) {
    return (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                    <div className="flex items-center gap-3">
                        <Pulse className="w-11 h-11 rounded-xl flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Pulse className="h-3 w-3/4" />
                            <Pulse className="h-5 w-1/2" />
                        </div>
                    </div>
                    <Pulse className="h-2 w-full" />
                </div>
            ))}
        </div>
    );
}

/* ── Stat cards ── */
function StatsSkeleton({ count = 4 }) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-start gap-4">
                        <Pulse className="w-11 h-11 rounded-xl flex-shrink-0" />
                        <div className="flex-1 space-y-2 pt-1">
                            <Pulse className="h-3 w-2/3" />
                            <Pulse className="h-7 w-1/2" />
                            <Pulse className="h-2 w-3/4" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ── Bloc de texte ── */
function BlockSkeleton({ lines = 3, className = '' }) {
    const widths = ['w-full', 'w-5/6', 'w-4/6', 'w-3/4', 'w-full', 'w-2/3'];
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <Pulse key={i} className={`h-3 ${widths[i % widths.length]}`} />
            ))}
        </div>
    );
}

/* ── Page Header ── */
function PageHeaderSkeleton() {
    return (
        <div className="flex items-center justify-between mb-5">
            <div className="space-y-2">
                <Pulse className="h-2.5 w-32" />
                <Pulse className="h-6 w-48" />
                <Pulse className="h-3 w-24" />
            </div>
            <Pulse className="h-11 w-36 rounded-xl" />
        </div>
    );
}

const SkeletonLoader = {
    Table: TableSkeleton,
    Cards: CardsSkeleton,
    Stats: StatsSkeleton,
    Block: BlockSkeleton,
    PageHeader: PageHeaderSkeleton,
    Pulse,
};

export default SkeletonLoader;
