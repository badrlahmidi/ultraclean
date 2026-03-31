import { TableProperties } from 'lucide-react';

/**
 * DataTable — Wrapper de tableau responsive et accessible.
 * Gère automatiquement : overflow-x-auto, empty state, et la structure card.
 *
 * @example
 * <DataTable
 *   columns={['Nom', 'Email', 'Rôle', '']}
 *   isEmpty={users.length === 0}
 *   emptyMessage="Aucun utilisateur trouvé"
 * >
 *   {users.map(u => <tr key={u.id}>...</tr>)}
 * </DataTable>
 */
export default function DataTable({
    columns = [],
    children,
    isEmpty = false,
    emptyMessage = 'Aucun résultat trouvé',
    emptyIcon: EmptyIcon = TableProperties,
    footer,
    className = '',
}) {
    return (
        <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}>
            <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                    {columns.length > 0 && (
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                {columns.map((col, i) => (
                                    <th
                                        key={i}
                                        className={`px-4 py-3 font-medium text-gray-600 whitespace-nowrap ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}
                                        style={col.width ? { width: col.width } : undefined}
                                    >
                                        {col.label ?? col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                    )}
                    <tbody className="divide-y divide-gray-100">
                        {isEmpty ? (
                            <tr>
                                <td
                                    colSpan={columns.length || 1}
                                    className="px-4 py-16 text-center"
                                >
                                    <div className="flex flex-col items-center gap-2 text-gray-400">
                                        <EmptyIcon size={32} strokeWidth={1.5} />
                                        <p className="text-sm">{emptyMessage}</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            children
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer slot (pagination, totaux…) */}
            {footer && !isEmpty && (
                <div className="border-t border-gray-100">
                    {footer}
                </div>
            )}
        </div>
    );
}
