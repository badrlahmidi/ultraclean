import { useState, useEffect, useRef } from 'react';
import { X, Search, Plus, User, Building2, Phone, Check, Loader2, Wrench } from 'lucide-react';
import clsx from 'clsx';
import axios from 'axios';

/**
 * Drawer latéral — recherche client + quick-add
 * Props :
 *   selected     — client actif ({id, name, phone, is_company}) ou null
 *   atelierClient — {id, name, phone, is_company} (client Atelier, accès rapide)
 *   onSelect     — fn(client)
 *   onClose      — fn()
 */
export default function ClientDrawer({ selected, atelierClient, onSelect, onClose }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAdd, setShowAdd] = useState(false);
    const searchRef = useRef();
    const timerRef = useRef(null);

    /* ── Debounce search ── */
    useEffect(() => {
        clearTimeout(timerRef.current);
        if (query.trim().length < 2) { setResults([]); return; }
        setLoading(true);
        timerRef.current = setTimeout(async () => {
            try {
                const res = await axios.get(route('caissier.clients.search'), { params: { q: query } });
                setResults(res.data);
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => clearTimeout(timerRef.current);
    }, [query]);

    useEffect(() => { searchRef.current?.focus(); }, []);

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40 bg-black/40" role="button" tabIndex={-1} aria-label="Fermer" onClick={onClose} onKeyDown={e => { if (e.key === 'Escape') onClose(); }} />

            {/* Drawer */}
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="client-drawer-title"
                className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col"
            >

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h2 id="client-drawer-title" className="font-semibold text-gray-800 text-sm">Client</h2>
                    <button onClick={onClose} aria-label="Fermer" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                        <X size={16} />
                    </button>
                </div>

                {/* Search */}
                <div className="px-4 py-3 border-b border-gray-100">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input ref={searchRef} type="text" value={query}
                            onChange={e => { setQuery(e.target.value); setShowAdd(false); }}
                            placeholder="Nom ou téléphone…"
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl
                                       focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
                    </div>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto">
                    {/* Client actuellement sélectionné */}
                    {selected && !query && (
                        <div className="px-4 py-3 border-b border-blue-100 bg-blue-50">
                            <p className="text-xs font-medium text-blue-500 mb-1">Client sélectionné</p>
                            <ClientRow client={selected} isActive onSelect={onSelect} />
                        </div>
                    )}

                    {/* Accès rapide Atelier */}
                    {atelierClient && !query && selected?.id !== atelierClient.id && (
                        <div className="px-4 py-3 border-b border-purple-100 bg-purple-50">
                            <p className="text-xs font-medium text-purple-500 mb-1 flex items-center gap-1">
                                <Wrench size={11} /> Accès rapide
                            </p>
                            <button
                                onClick={() => { onSelect(atelierClient); onClose(); }}
                                className="w-full flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-purple-100 transition-colors"
                            >
                                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-purple-100">
                                    <Wrench size={16} className="text-purple-600" />
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                    <p className="text-sm font-semibold text-purple-800">{atelierClient.name}</p>
                                    <p className="text-xs text-purple-500">Usage interne — produits gratuits</p>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* Liste résultats */}
                    {results.map(c => (
                        <ClientRow key={c.id} client={c}
                            isActive={selected?.id === c.id}
                            onSelect={(cl) => { onSelect(cl); onClose(); }}
                        />
                    ))}

                    {/* Prompt quick-add */}
                    {query.trim().length >= 2 && !loading && results.length === 0 && !showAdd && (
                        <div className="px-4 py-6 text-center">
                            <p className="text-sm text-gray-400 mb-3">Aucun client trouvé pour « {query} »</p>
                            <button onClick={() => setShowAdd(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white
                                           text-sm rounded-xl hover:bg-blue-700">
                                <Plus size={14} /> Créer ce client
                            </button>
                        </div>
                    )}

                    {/* Formulaire quick-add */}
                    {showAdd && (
                        <QuickAddForm initialName={query} onSaved={(c) => { onSelect(c); onClose(); }} onCancel={() => setShowAdd(false)} />
                    )}
                </div>

                {/* Footer — bouton nouveau client vide */}
                {!showAdd && (
                    <div className="px-4 py-3 border-t border-gray-100">
                        <button onClick={() => { setQuery(''); setShowAdd(true); setResults([]); }}
                            className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed
                                       border-gray-200 rounded-xl text-sm text-gray-400 hover:border-blue-300
                                       hover:text-blue-500 transition-colors">
                            <Plus size={14} /> Nouveau client
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}

/* ── Ligne client ── */
function ClientRow({ client, isActive, onSelect }) {
    return (
        <button onClick={() => onSelect(client)}
            className={clsx(
                'w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50',
                isActive && 'bg-blue-50'
            )}>
            <div className={clsx('w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                client.is_company ? 'bg-amber-100' : 'bg-blue-100')}>
                {client.is_company
                    ? <Building2 size={16} className="text-amber-600" />
                    : <User size={16} className="text-blue-600" />
                }
            </div>
            <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{client.name}</p>
                {client.phone && <p className="text-xs text-gray-400 flex items-center gap-1"><Phone size={10} />{client.phone}</p>}
            </div>
            {isActive && <Check size={16} className="text-blue-500 shrink-0" />}
        </button>
    );
}

/* ── Formulaire quick-add ── */
function QuickAddForm({ initialName, onSaved, onCancel }) {
    const [form, setForm] = useState({ name: initialName ?? '', phone: '', is_company: false, ice: '' });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            const res = await axios.post(route('caissier.clients.quick'), form);
            onSaved(res.data);
        } catch (err) {
            if (err.response?.status === 422) setErrors(err.response.data.errors ?? {});
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="px-4 py-4 space-y-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-600">Nouveau client</p>

            {/* Type */}
            <div className="flex gap-2">
                {[{ v: false, label: 'Particulier', icon: User }, { v: true, label: 'Entreprise', icon: Building2 }].map(o => (
                    <button key={String(o.v)} type="button" onClick={() => set('is_company', o.v)}
                        className={clsx('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium border transition-all',
                            form.is_company === o.v
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300')}>
                        <o.icon size={12} /> {o.label}
                    </button>
                ))}
            </div>

            {/* Nom */}
            <div>
                <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                    placeholder="Nom *"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name[0]}</p>}
            </div>

            {/* Téléphone */}
            <div>
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                    placeholder="Téléphone"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* ICE si entreprise */}
            {form.is_company && (
                <div>
                    <input type="text" value={form.ice} onChange={e => set('ice', e.target.value)}
                        placeholder="ICE (optionnel)"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
            )}

            <div className="flex gap-2 pt-1">
                <button type="button" onClick={onCancel}
                    className="flex-1 py-2 text-sm text-gray-500 hover:text-gray-700">
                    Annuler
                </button>
                <button type="submit" disabled={saving}
                    className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl
                               hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
                    {saving && <Loader2 size={13} className="animate-spin" />}
                    Créer
                </button>
            </div>
        </form>
    );
}
