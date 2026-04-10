import { useState, useMemo } from 'react';
import { X, Search, UserCheck } from 'lucide-react';
import clsx from 'clsx';

/**
 * Overlay plein-écran sélection laveur
 * Props :
 *   washers    — [{id, name, avatar}]
 *   selected   — id sélectionné ou null
 *   onSelect   — fn(id)   — appelée avec l'id choisi (null = désélection)
 *   onClose    — fn()
 */
export default function WasherOverlay({ washers, selected, onSelect, onClose }) {
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return washers;
        return washers.filter(w => w.name.toLowerCase().includes(q));
    }, [washers, search]);

    function pick(w) {
        onSelect(w.id === selected ? null : w.id);
        onClose();
    }

    return (
        <div className="fixed inset-0 z-50 bg-gray-950/80 flex items-stretch justify-center">
            <div className="w-full max-w-xl bg-white flex flex-col">

                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50 shrink-0">
                    <div className="flex-1 relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            autoFocus
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Rechercher un laveur…"
                            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl
                                       focus:outline-none focus:ring-2 focus:ring-orange-400"
                        />
                    </div>
                    <button onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 shrink-0">
                        <X size={20} />
                    </button>
                </div>

                {/* Sub-header */}
                <div className="px-5 pt-4 pb-2 shrink-0">
                    <h2 className="text-base font-semibold text-gray-800">Choisir un laveur</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {selected
                            ? `Laveur actuel : ${washers.find(w => w.id === selected)?.name}`
                            : 'Aucun laveur sélectionné — cliquez pour assigner'
                        }
                    </p>
                </div>

                {/* Grille laveurs */}
                <div className="flex-1 overflow-y-auto px-5 pb-5">
                    {filtered.length === 0 && (
                        <p className="text-center text-gray-300 py-16 text-sm">Aucun laveur trouvé</p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                        {filtered.map(w => {
                            const isSelected = w.id === selected;
                            return (
                                <button
                                    key={w.id}
                                    onClick={() => pick(w)}
                                    className={clsx(
                                        'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center',
                                        isSelected
                                            ? 'border-orange-500 bg-orange-50 shadow-md'
                                            : 'border-gray-200 bg-white hover:border-orange-300 hover:shadow-sm hover:bg-orange-50/30'
                                    )}
                                >
                                    {/* Avatar */}
                                    <div className={clsx(
                                        'w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold overflow-hidden shrink-0',
                                        isSelected ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'
                                    )}>
                                        {w.avatar
                                            ? <img src={w.avatar} alt={w.name} className="w-full h-full object-cover" />
                                            : w.name.slice(0, 2).toUpperCase()
                                        }
                                    </div>

                                    {/* Nom */}
                                    <span className={clsx(
                                        'text-sm font-semibold leading-tight',
                                        isSelected ? 'text-orange-700' : 'text-gray-800'
                                    )}>
                                        {w.name}
                                    </span>

                                    {isSelected && (
                                        <span className="flex items-center gap-1 text-[11px] text-orange-600 font-medium">
                                            <UserCheck size={12} /> Sélectionné
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                {selected && (
                    <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 shrink-0 flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                            Laveur : <strong>{washers.find(w => w.id === selected)?.name}</strong>
                        </span>
                        <button
                            onClick={() => { onSelect(null); onClose(); }}
                            className="text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                            Désassigner
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
