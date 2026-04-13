import AppLayout from '@/Layouts/AppLayout';
import { router, Link } from '@inertiajs/react';
import { useState } from 'react';
import DOMPurify from 'dompurify';
import { Users, Search, ChevronRight, Pencil, Trash2, X } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const TIER_CONFIG = {
    standard: { label: 'Standard', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300', dot: 'bg-gray-400' },
    silver: { label: 'Silver', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200', dot: 'bg-slate-400' },
    gold: { label: 'Gold', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-400' },
    platinum: { label: 'Platinum', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400', dot: 'bg-violet-500' },
};

function TierBadge({ tier }) {
    const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG.standard;
    return (
        <span className={clsx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold', cfg.color)}>
            <span className={clsx('w-1.5 h-1.5 rounded-full', cfg.dot)} />
            {cfg.label}
        </span>
    );
}

function EditModal({ client, onClose }) {
    const [form, setForm] = useState({
        name: client.name,
        phone: client.phone ?? '',
        email: client.email ?? '',
        vehicle_plate: client.vehicle_plate ?? '',
        notes: client.notes ?? '',
    });
    const [saving, setSaving] = useState(false);

    function save(e) {
        e.preventDefault();
        setSaving(true);
        router.put(route('caissier.clients.update', client.id), form, {
            onSuccess: () => { toast.success('Client mis à jour'); onClose(); },
            onError: () => toast.error('Erreur de mise à jour'),
            onFinish: () => setSaving(false),
        });
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="button" tabIndex={-1} aria-label="Fermer" onClick={onClose} onKeyDown={e => { if (e.key === 'Escape') onClose(); }}>
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h3 className="font-bold text-gray-900 dark:text-white">Modifier le client</h3>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><X size={18} /></button>
                </div>
                <form onSubmit={save} className="space-y-3">
                    {[
                        { key: 'name', label: 'Nom complet', required: true },
                        { key: 'phone', label: 'Téléphone' },
                        { key: 'email', label: 'Email', type: 'email' },
                        { key: 'vehicle_plate', label: 'Plaque véhicule' },
                        { key: 'notes', label: 'Notes' },
                    ].map(f => (
                        <div key={f.key}>
                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{f.label}</label>
                            <input
                                type={f.type ?? 'text'}
                                value={form[f.key]}
                                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                                required={f.required}
                                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                        </div>
                    ))}
                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2 text-sm font-semibold border border-gray-200 dark:border-slate-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50">
                            Annuler
                        </button>
                        <button type="submit" disabled={saving} className="flex-1 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">
                            {saving ? 'Sauvegarde…' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function ClientsIndex({ clients, filters, tiers }) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [tierFilter, setTierFilter] = useState(filters.tier ?? '');
    const [editClient, setEditClient] = useState(null);

    function applyFilters(params) {
        router.get(route('caissier.clients.index'), params, { preserveState: true, replace: true });
    }

    function onSearch(e) {
        e.preventDefault();
        applyFilters({ search, tier: tierFilter });
    }

    function onTierChange(val) {
        setTierFilter(val);
        applyFilters({ search, tier: val });
    }

    function deleteClient(client) {
        if (!confirm(`Supprimer ${client.name} ?`)) return;
        router.delete(route('caissier.clients.destroy', client.id), {
            onSuccess: () => toast.success('Client supprimé'),
        });
    }

    return (
        <AppLayout title="Clients">
            {editClient && <EditModal client={editClient} onClose={() => setEditClient(null)} />}

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Users size={22} className="text-blue-500" /> Clients
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{clients.total} client{clients.total > 1 ? 's' : ''} enregistré{clients.total > 1 ? 's' : ''}</p>
                    </div>
                </div>

                {/* Tier filter pills */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => onTierChange('')}
                        className={clsx('px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                            tierFilter === '' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-slate-600 text-gray-500'
                        )}>Tous</button>
                    {Object.entries(tiers).map(([key, t]) => (
                        <button key={key} onClick={() => onTierChange(tierFilter === key ? '' : key)}
                            className={clsx('px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                                tierFilter === key ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-slate-600 text-gray-500'
                            )}>{t.label}</button>
                    ))}
                </div>

                {/* Search */}
                <form onSubmit={onSearch} className="flex gap-2">
                    <div className="relative flex-1 max-w-sm">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom, téléphone, plaque…"
                            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700">Chercher</button>
                </form>

                {/* Table */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Client</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Palier</th>
                                    <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Points</th>
                                    <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Visites</th>
                                    <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Dernière visite</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                                {clients.data.length === 0 && (
                                    <tr><td colSpan={6} className="text-center py-12 text-gray-400">Aucun client trouvé</td></tr>
                                )}
                                {clients.data.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors">
                                        <td className="px-4 py-3">
                                            <Link href={route('caissier.clients.show', c.id)} className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                                                {c.name}
                                            </Link>
                                            <div className="text-xs text-gray-400">{c.phone ?? '—'} {c.vehicle_plate ? `· ${c.vehicle_plate}` : ''}</div>
                                        </td>
                                        <td className="px-4 py-3"><TierBadge tier={c.loyalty_tier} /></td>
                                        <td className="px-4 py-3 text-right font-bold text-amber-600 dark:text-amber-400">{c.loyalty_points}</td>
                                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{c.total_visits}</td>
                                        <td className="px-4 py-3 text-right text-xs text-gray-400">
                                            {c.last_visit_date ? new Date(c.last_visit_date).toLocaleDateString('fr-FR') : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link href={route('caissier.clients.show', c.id)}
                                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 hover:text-blue-600" title="Voir">
                                                    <ChevronRight size={15} />
                                                </Link>
                                                <button onClick={() => setEditClient(c)}
                                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 hover:text-blue-600" title="Modifier">
                                                    <Pencil size={15} />
                                                </button>
                                                <button onClick={() => deleteClient(c)}
                                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 hover:text-rose-500" title="Supprimer">
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {clients.last_page > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-slate-700">
                            <p className="text-xs text-gray-500">{clients.from}–{clients.to} sur {clients.total}</p>
                            <div className="flex gap-1">
                                {clients.links.map((link, i) => (
                                    <button key={i} disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                        className={clsx('px-2.5 py-1 rounded-lg text-xs font-semibold',
                                            link.active ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700',
                                            !link.url && 'opacity-30 cursor-not-allowed')}
                                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(link.label) }} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
