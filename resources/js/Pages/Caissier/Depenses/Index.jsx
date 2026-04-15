/**
 * Caissier/Depenses/Index.jsx
 * ─────────────────────────────────────────────────────────────────
 * Saisie rapide et liste des dépenses du caissier.
 * ─────────────────────────────────────────────────────────────────
 */
import AppLayout from '@/Layouts/AppLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { formatMAD, formatDate } from '@/utils/format';
import { Banknote, Trash2, PlusCircle } from 'lucide-react';
import clsx from 'clsx';

const METHOD_LABELS = {
    cash: 'Espèces',
    card: 'Carte',
    mobile: 'Mobile',
    wire: 'Virement',
};

const METHOD_COLORS = {
    cash: 'bg-green-100 text-green-700',
    card: 'bg-blue-100 text-blue-700',
    mobile: 'bg-violet-100 text-violet-700',
    wire: 'bg-cyan-100 text-cyan-700',
};

export default function DepensesIndex({ expenses, activeShift, totals, categories, methods }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        amount_cents: '',
        category: 'autre',
        label: '',
        paid_with: 'cash',
        date: new Date().toISOString().slice(0, 10),
    });

    function handleSubmit(e) {
        e.preventDefault();
        post(route('caissier.depenses.store'), {
            onSuccess: () => reset('amount_cents', 'label'),
        });
    }

    function handleDelete(id) {
        if (!confirm('Supprimer cette dépense ?')) return;
        router.delete(route('caissier.depenses.destroy', id));
    }

    const amountMAD = data.amount_cents ? data.amount_cents / 100 : 0;

    return (
        <AppLayout title="Dépenses">
            <Head title="Dépenses" />

            <div className="max-w-3xl mx-auto space-y-6">

                {/* ── Header ── */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Banknote size={20} className="text-orange-500" />
                            Dépenses
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {activeShift
                                ? 'Les dépenses sont rattachées au shift en cours.'
                                : 'Aucun shift ouvert — les dépenses ne seront pas rattachées à un shift.'}
                        </p>
                    </div>
                </div>

                {/* ── Totaux ── */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <p className="text-xs text-gray-500">Dépenses aujourd'hui</p>
                        <p className="text-xl font-bold text-orange-600 mt-1">{formatMAD(totals.today)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <p className="text-xs text-gray-500">Dépenses du shift</p>
                        <p className="text-xl font-bold text-orange-600 mt-1">
                            {activeShift ? formatMAD(totals.shift) : '—'}
                        </p>
                    </div>
                </div>

                {/* ── Formulaire rapide ── */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h2 className="text-sm font-bold text-gray-700 mb-4">Enregistrer une dépense</h2>
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            {/* Montant */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Montant (centimes)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min={1}
                                        step={1}
                                        placeholder="5000"
                                        value={data.amount_cents}
                                        onChange={e => setData('amount_cents', parseInt(e.target.value) || '')}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-16 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">MAD</span>
                                </div>
                                {data.amount_cents > 0 && (
                                    <p className="text-xs text-gray-400 mt-0.5">= {formatMAD(data.amount_cents)}</p>
                                )}
                                {errors.amount_cents && <p className="text-xs text-red-600 mt-1">{errors.amount_cents}</p>}
                            </div>

                            {/* Date */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                                <input
                                    type="date"
                                    value={data.date}
                                    onChange={e => setData('date', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none"
                                />
                                {errors.date && <p className="text-xs text-red-600 mt-1">{errors.date}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {/* Catégorie */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Catégorie</label>
                                <select
                                    value={data.category}
                                    onChange={e => setData('category', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none bg-white"
                                >
                                    {Object.entries(categories).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Mode de paiement */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Payé avec</label>
                                <select
                                    value={data.paid_with}
                                    onChange={e => setData('paid_with', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none bg-white"
                                >
                                    {Object.entries(methods).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Libellé */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Libellé</label>
                            <input
                                type="text"
                                placeholder="Ex : Achat produits nettoyage"
                                value={data.label}
                                onChange={e => setData('label', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none"
                            />
                            {errors.label && <p className="text-xs text-red-600 mt-1">{errors.label}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                        >
                            <PlusCircle size={15} />
                            {processing ? 'Enregistrement…' : 'Enregistrer la dépense'}
                        </button>
                    </form>
                </div>

                {/* ── Liste des dépenses ── */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100">
                        <h2 className="text-sm font-semibold text-gray-700">
                            Dépenses récentes ({expenses.length})
                        </h2>
                    </div>

                    {expenses.length === 0 ? (
                        <div className="px-4 py-10 text-center text-sm text-gray-400">
                            Aucune dépense enregistrée.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {expenses.map(e => (
                                <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-medium text-gray-800">{e.label}</span>
                                            <span className={clsx(
                                                'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                                                METHOD_COLORS[e.paid_with] ?? 'bg-gray-100 text-gray-600'
                                            )}>
                                                {METHOD_LABELS[e.paid_with] ?? e.paid_with}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {categories[e.category] ?? e.category} · {formatDate(e.date)}
                                            {e.shift_id && <span className="ml-1.5 text-gray-300">· Shift #{e.shift_id}</span>}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <span className="text-sm font-bold text-orange-600">
                                            {formatMAD(e.amount_cents)}
                                        </span>
                                        <button
                                            onClick={() => handleDelete(e.id)}
                                            className="text-gray-300 hover:text-red-500 transition-colors"
                                            title="Supprimer"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
