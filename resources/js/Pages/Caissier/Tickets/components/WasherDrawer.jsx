import { useState, useEffect, useCallback, useRef, memo } from 'react';
import clsx from 'clsx';
import axios from 'axios';

/**
 * Drawer lateral - selection multi-operateur (1 lead + N assistants).
 *
 * Props :
 *   washers      - [{id, name, avatar, queue_count, queue_minutes, available_at, due_at, overflow}]
 *   leadId       - id du laveur lead ou null
 *   assistantIds - [id, ...] laveurs assistants (max 5)
 *   onSelect     - fn({ lead: id|null, assistants: [id,...] })
 *   onClose      - fn()
 *   newDuration  - duree (minutes) du nouveau ticket
 */
const WasherDrawer = memo(function WasherDrawer({
    washers: initialWashers,
    leadId,
    assistantIds = [],
    onSelect,
    onClose,
    newDuration = 0,
}) {
    const [washers, setWashers] = useState(initialWashers ?? []);
    const [loading, setLoading] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const mountedRef = useRef(true);

    // Etat local - pas de commit avant "Confirmer"
    const [localLead, setLocalLead] = useState(leadId ?? null);
    const [localAssistants, setLocalAssistants] = useState(assistantIds ?? []);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(route('caissier.tickets.washerQueue'), {
                params: newDuration > 0 ? { duration: newDuration } : {},
            });
            if (mountedRef.current) {
                setWashers(res.data.washers);
                setLastRefresh(new Date());
            }
        } catch { /* silently fail */ }
        finally { if (mountedRef.current) setLoading(false); }
    }, [newDuration]);

    useEffect(() => {
        const id = setInterval(refresh, 30_000);
        return () => clearInterval(id);
    }, [refresh]);

    useEffect(() => {
        if (newDuration > 0) refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* Helpers */
    const fmtTime = (isoStr) =>
        isoStr ? new Date(isoStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null;

    const fmtDur = (min) => {
        if (!min) return null;
        return min >= 60
            ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`
            : `${min} min`;
    };

    const endTimeFor = (w) => {
        if (w.due_at) return fmtTime(w.due_at);
        if (!newDuration) return null;
        const endMs = Date.now() + ((w.queue_minutes ?? 0) + newDuration) * 60_000;
        return new Date(endMs).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    const sortedWashers = [...washers].sort((a, b) => (a.queue_minutes ?? 0) - (b.queue_minutes ?? 0));

    /* Toggles */
    const toggleLead = (id) => {
        setLocalLead(prev => prev === id ? null : id);
        setLocalAssistants(prev => prev.filter(aid => aid !== id));
    };
    const toggleAssistant = (id) => {
        if (id === localLead) return;
        setLocalAssistants(prev =>
            prev.includes(id)
                ? prev.filter(aid => aid !== id)
                : prev.length < 5 ? [...prev, id] : prev
        );
    };

    const handleConfirm = () => { onSelect({ lead: localLead, assistants: localAssistants }); onClose(); };
    const handleClear = () => { setLocalLead(null); setLocalAssistants([]); };

    const leadName = washers.find(w => w.id === localLead)?.name;
    const hasSelection = localLead !== null || localAssistants.length > 0;

    return (
        <Dialog open onClose={onClose} className="relative z-50" aria-label="Selectionner les operateurs">
            <DialogBackdrop transition className="fixed inset-0 bg-black/40 transition-opacity data-[closed]:opacity-0" />

            <div className="fixed inset-0 flex justify-end">
                <DialogPanel className="relative flex w-full max-w-sm flex-col bg-white shadow-2xl">

                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                        <div>
                            <h2 className="font-semibold text-gray-800 text-sm flex items-center gap-1.5">
                                <Users size={14} className="text-purple-500" />
                                {`Equipe operateurs`}
                            </h2>
                            <p className="text-[11px] text-gray-400 mt-0.5">{`1 lead + jusqu\u2019\u00e0 5 assistants`}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={refresh} disabled={loading} aria-label="Actualiser"
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                            </button>
                            <button onClick={onClose} aria-label="Fermer"
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Legende duree */}
                    {newDuration > 0 && (
                        <div className="mx-4 mt-3 px-3 py-2 bg-blue-50 rounded-xl border border-blue-100">
                            <p className="text-[11px] text-blue-600">
                                <span className="font-semibold">Duree du ticket :</span> {fmtDur(newDuration)}
                                {` \u2014 les heures de fin sont calculees en ajoutant cette duree a la file.`}
                            </p>
                        </div>
                    )}

                    {/* En-tete colonnes */}
                    <div className="flex items-center gap-3 px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        <span className="w-5 text-center">Asst</span>
                        <span className="flex-1">{`Operateur / File`}</span>
                        <span className="w-14 text-center">Lead</span>
                    </div>

                    {/* Liste operateurs */}
                    <div className="flex-1 overflow-y-auto py-1">
                        {/* Skeleton while loading for the first time (no data yet) */}
                        {loading && sortedWashers.length === 0 && (
                            <div className="space-y-0" aria-busy="true" aria-label="Chargement des opérateurs">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 animate-pulse">
                                        <div className="w-5 h-5 rounded bg-gray-200 flex-shrink-0" />
                                        <div className="flex-1 space-y-1.5">
                                            <div className="h-3 bg-gray-200 rounded w-3/5" />
                                            <div className="h-2.5 bg-gray-100 rounded w-2/5" />
                                        </div>
                                        <div className="w-14 h-7 bg-gray-100 rounded-lg" />
                                    </div>
                                ))}
                            </div>
                        )}
                        {!loading && sortedWashers.length === 0 && (
                            <p className="text-center text-sm text-gray-400 mt-12">{`Aucun operateur actif`}</p>
                        )}
                        {sortedWashers.map(w => {
                            const isLead = w.id === localLead;
                            const isAsst = localAssistants.includes(w.id);
                            const isFree = w.queue_count === 0;
                            const overflow = w.overflow === true;
                            const endT = endTimeFor(w);

                            return (
                                <div key={w.id} className={clsx(
                                    'flex items-center gap-3 px-4 py-3 border-b border-gray-50 transition-colors',
                                    isLead ? 'bg-blue-50' : isAsst ? 'bg-purple-50' : 'hover:bg-gray-50'
                                )}>
                                    {/* Checkbox assistant */}
                                    <button onClick={() => toggleAssistant(w.id)} disabled={isLead}
                                        aria-label={`${isAsst ? 'Retirer' : 'Ajouter'} ${w.name} comme assistant`}
                                        className={clsx(
                                            'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                                            isLead ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-40'
                                                : isAsst ? 'border-purple-500 bg-purple-500 text-white'
                                                    : 'border-gray-300 hover:border-purple-400'
                                        )}>
                                        {isAsst && <CheckCircle2 size={11} />}
                                    </button>

                                    {/* Info laveur */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <div className={clsx(
                                                'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 flex-shrink-0',
                                                isLead ? 'border-blue-500 bg-blue-100 text-blue-700'
                                                    : isAsst ? 'border-purple-400 bg-purple-100 text-purple-700'
                                                        : isFree ? 'border-green-400 bg-green-50 text-green-700'
                                                            : overflow ? 'border-red-300 bg-red-50 text-red-700'
                                                                : 'border-orange-300 bg-orange-50 text-orange-700'
                                            )}>
                                                {w.avatar
                                                    ? <img src={w.avatar} alt={w.name} className="w-full h-full rounded-full object-cover" />
                                                    : w.name.slice(0, 2).toUpperCase()}
                                            </div>
                                            <p className="text-xs font-semibold text-gray-800 truncate">{w.name}</p>
                                            {overflow && (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                                                    <AlertTriangle size={8} /> Demain
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            {isFree
                                                ? <span className="text-[10px] font-medium text-green-700">{`\u25cf Disponible`}</span>
                                                : <span className="text-[10px] font-medium text-orange-600 flex items-center gap-1">
                                                    <Clock size={9} />{w.queue_count} ticket{w.queue_count > 1 ? 's' : ''}
                                                </span>
                                            }
                                            {endT && (
                                                <span className={clsx('text-[10px]', overflow ? 'text-red-500' : 'text-gray-400')}>
                                                    fin ~{endT}{overflow ? ' (J+1)' : ''}
                                                </span>
                                            )}
                                        </div>
                                        {w.warning && overflow && (
                                            <p className="text-[10px] text-red-500 leading-tight mt-0.5">{`\u26a0 ${w.warning}`}</p>
                                        )}
                                    </div>

                                    {/* Bouton Lead */}
                                    <button onClick={() => toggleLead(w.id)}
                                        aria-label={`${isLead ? 'Retirer' : 'Definir'} ${w.name} comme lead`}
                                        className={clsx(
                                            'w-14 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold border transition-colors flex-shrink-0',
                                            isLead ? 'bg-blue-600 text-white border-blue-600'
                                                : 'border-gray-200 text-gray-400 hover:border-blue-400 hover:text-blue-600'
                                        )}>
                                        <Crown size={9} />
                                        Lead
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 border-t border-gray-100 shrink-0 space-y-2">
                        {hasSelection && (
                            <div className="text-[11px] text-gray-500 bg-gray-50 rounded-xl px-3 py-2 space-y-0.5">
                                {localLead && <p><span className="font-semibold text-blue-700">Lead :</span> {leadName}</p>}
                                {localAssistants.length > 0 && (
                                    <p><span className="font-semibold text-purple-700">Assistants :</span>{' '}
                                        {localAssistants.map(id => washers.find(w => w.id === id)?.name).filter(Boolean).join(', ')}
                                    </p>
                                )}
                            </div>
                        )}
                        <div className="flex gap-2">
                            {hasSelection && (
                                <button onClick={handleClear}
                                    className="flex-1 py-2 text-sm text-gray-400 hover:text-red-500 border border-gray-200 rounded-xl transition-colors">
                                    Effacer
                                </button>
                            )}
                            <button onClick={handleConfirm}
                                className="flex-1 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                Confirmer
                            </button>
                        </div>
                    </div>

                    <p className="text-center text-[10px] text-gray-300 pb-2">
                        {`Mis a jour a `}{lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>

                </DialogPanel>
            </div>
        </Dialog>
    );
});

export default WasherDrawer;
