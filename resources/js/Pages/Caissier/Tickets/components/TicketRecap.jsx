import { Car, User, Trash2, Clock, Edit3, Check, AlertCircle, Loader2, Package, Percent, Gift } from 'lucide-react';
import { useState, memo } from 'react';
import clsx from 'clsx';

const fmt = (cents) => `${(cents / 100).toFixed(2)} MAD`;
const fmtM = (min) => min >= 60
    ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`
    : `${min} min`;

/**
 * Panneau récap ticket (colonne droite)
 * Props :
 *   vehicle         — {brand, model, plate} ou null
 *   client          — objet client ou null
 *   lines           — [{service_id, name, unit_price_cents, quantity, price_variant_id}]
 *   productLines    — [{sellable_product_id, name, unit_price_cents, quantity, is_free}]
 *   isAtelierClient — bool
 *   washers         — [{id, name, avatar}]
 *   duration        — {auto: bool, minutes: number}
 *   washer          — id ou null
 *   notes           — string
 *   processing      — bool
 *   errors          — {}
 *   discountType    — 'percent' | 'fixed' | null
 *   discountValue   — number
 *   discountCents   — number (calculated)
 *   onOpenVehicle   — fn()
 *   onOpenClient    — fn()
 *   onOpenProducts  — fn()
 *   onRemoveLine    — fn(service_id)
 *   onRemoveProduct — fn(product_id)
 *   onToggleFree    — fn(product_id)
 *   onSetDuration   — fn(minutes | null)  null = retour auto
 *   onSetWasher     — fn(id)
 *   onSetNotes      — fn(string)
 *   onSetDiscountType  — fn(type)
 *   onSetDiscountValue — fn(value)
 *   onSubmit        — fn()
 *   sellableProducts — [] (for opening products panel)
 */
const TicketRecap = memo(function TicketRecap({
    vehicle, client, lines, productLines = [], isAtelierClient, washers, duration, washer,
    notes, processing, errors,
    submitLabel,
    discountType, discountValue, discountCents,
    onOpenVehicle, onOpenClient, onOpenProducts, onRemoveLine, onRemoveProduct, onToggleFree,
    onSetDuration, onSetWasher, onSetNotes,
    onSetDiscountType, onSetDiscountValue,
    onSubmit,
    sellableProducts = [],
    isProductOnly = false,
}) {
    const [editDuration, setEditDuration] = useState(false);
    const [draftMin, setDraftMin] = useState('');

    const servicesTotal = lines.reduce((s, l) => s + l.unit_price_cents * l.quantity, 0);
    const productsTotal = productLines.reduce((s, l) => l.is_free ? s : s + l.unit_price_cents * l.quantity, 0);
    const subtotal = servicesTotal + productsTotal;
    const total = Math.max(0, subtotal - (discountCents || 0));

    const hasItems = lines.length > 0 || productLines.length > 0;

    /* Heure de fin prévue */
    const dueTime = duration.minutes > 0
        ? new Date(Date.now() + duration.minutes * 60000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : null;

    const applyDuration = () => {
        const v = parseInt(draftMin);
        if (v > 0) onSetDuration(v);
        setEditDuration(false);
    };

    const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

    return (
        <div className="flex flex-col h-full bg-white border-l border-gray-100">

            {/* ── Titre ── */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">Récap ticket</h2>
                {washer && washers.length > 0 && (
                    <span className="flex items-center gap-1.5 text-xs text-orange-600 font-medium">
                        <span className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-bold">
                            {washers.find(w => w.id === washer)?.name.slice(0, 2).toUpperCase()}
                        </span>
                        {washers.find(w => w.id === washer)?.name}
                    </span>
                )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">

                {/* ── Véhicule ── */}
                <Section label="Véhicule">
                    <button onClick={onOpenVehicle}
                        className={clsx(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left',
                            vehicle?.brand
                                ? 'border-gray-200 hover:border-blue-300 bg-gray-50'
                                : 'border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                        )}>
                        <Car size={16} className={vehicle?.brand ? 'text-gray-500' : 'text-gray-300'} />
                        {vehicle?.brand
                            ? <span className="text-sm text-gray-800 font-medium">
                                {vehicle.brand.name} {vehicle.model?.name}
                            </span>
                            : <span className="text-sm text-gray-400">Choisir le véhicule…</span>
                        }
                    </button>

                    {/* Immatriculation */}
                    <input
                        type="text"
                        value={vehicle?.plate ?? ''}
                        onChange={e => onOpenVehicle('plate', e.target.value)}
                        placeholder="Immatriculation"
                        className="mt-2 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-center
                                   font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {errors?.vehicle_plate && <Err>{errors.vehicle_plate}</Err>}
                    {errors?.vehicle_brand_id && <Err>{errors.vehicle_brand_id}</Err>}
                </Section>

                {/* ── Client ── */}
                <Section label="Client">
                    <button onClick={onOpenClient}
                        className={clsx(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left',
                            client
                                ? 'border-gray-200 hover:border-blue-300 bg-gray-50'
                                : 'border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                        )}>
                        <User size={16} className={client ? 'text-gray-500' : 'text-gray-300'} />
                        {client
                            ? <div>
                                <p className="text-sm font-medium text-gray-800">{client.name}</p>
                                {client.phone && <p className="text-xs text-gray-400">{client.phone}</p>}
                            </div>
                            : <span className="text-sm text-gray-400">Associer un client…</span>
                        }
                    </button>
                    {isAtelierClient && (
                        <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                            <Gift size={12} /> Client Atelier — option gratuit disponible
                        </p>
                    )}
                </Section>

                {/* ── Lignes services ── */}
                <Section label={`Services${lines.length > 0 ? ` (${lines.length})` : ''}`}>
                    {lines.length === 0 && (
                        <p className="text-xs text-gray-300 py-2 text-center">
                            Aucun service ajouté
                        </p>
                    )}
                    <div className="space-y-1">
                        {lines.map((line) => (
                            <div key={line.service_id}
                                className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 group">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-700 truncate">{line.name}</p>
                                    {line.price_variant_id && (
                                        <p className="text-[10px] text-gray-400">{line.variantLabel}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                    <span className="text-xs text-gray-500">×{line.quantity}</span>
                                    <span className="text-xs font-semibold text-gray-800">
                                        {fmt(line.unit_price_cents * line.quantity)}
                                    </span>
                                    <button onClick={() => onRemoveLine(line.service_id)}
                                        className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-red-400 transition-opacity">
                                        <Trash2 size={11} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {errors?.services && <Err>{errors.services}</Err>}
                </Section>

                {/* ── Lignes produits ── */}
                {sellableProducts.length > 0 && (
                    <Section label={`Produits${productLines.length > 0 ? ` (${productLines.length})` : ''}`}>
                        <button onClick={onOpenProducts}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-dashed border-gray-300 hover:border-green-400 hover:bg-green-50 transition-all text-left mb-2">
                            <Package size={16} className="text-gray-400" />
                            <span className="text-sm text-gray-400">Ajouter des produits…</span>
                        </button>
                        <div className="space-y-1">
                            {productLines.map((line) => (
                                <div key={line.sellable_product_id}
                                    className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 group">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-700 truncate flex items-center gap-1">
                                            {line.name}
                                            {line.is_free && (
                                                <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 rounded-full">Gratuit</span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                        <span className="text-xs text-gray-500">×{line.quantity}</span>
                                        <span className={clsx(
                                            'text-xs font-semibold',
                                            line.is_free ? 'text-purple-600 line-through' : 'text-gray-800'
                                        )}>
                                            {fmt(line.unit_price_cents * line.quantity)}
                                        </span>
                                        {isAtelierClient && (
                                            <button onClick={() => onToggleFree(line.sellable_product_id)}
                                                className={clsx(
                                                    'p-1 rounded transition-colors',
                                                    line.is_free ? 'bg-purple-100 text-purple-600' : 'hover:bg-purple-50 text-gray-400'
                                                )}
                                                title={line.is_free ? 'Retirer gratuit' : 'Marquer gratuit'}>
                                                <Gift size={11} />
                                            </button>
                                        )}
                                        <button onClick={() => onRemoveProduct(line.sellable_product_id)}
                                            className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-red-400 transition-opacity">
                                            <Trash2 size={11} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Section>
                )}

                {/* ── Remise (Discount) ── */}
                <Section label="Remise">
                    {/* Présets rapides % */}
                    <div className="flex gap-1.5 mb-2">
                        {[5, 10, 15, 20].map(pct => (
                            <button
                                key={pct}
                                onClick={() => { onSetDiscountType('percent'); onSetDiscountValue(pct); }}
                                className={clsx(
                                    'flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                                    discountType === 'percent' && discountValue === pct
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-blue-300'
                                )}
                            >
                                {pct}%
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2 mb-2">
                        <button
                            onClick={() => onSetDiscountType(discountType === 'percent' ? null : 'percent')}
                            className={clsx(
                                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all',
                                discountType === 'percent'
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'border-gray-200 text-gray-600 hover:border-blue-300'
                            )}
                        >
                            <Percent size={12} /> %
                        </button>
                        <button
                            onClick={() => onSetDiscountType(discountType === 'fixed' ? null : 'fixed')}
                            className={clsx(
                                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all',
                                discountType === 'fixed'
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'border-gray-200 text-gray-600 hover:border-blue-300'
                            )}
                        >
                            MAD
                        </button>
                    </div>
                    {discountType && (
                        <input
                            type="number"
                            min="0"
                            step={discountType === 'percent' ? '1' : '0.01'}
                            max={discountType === 'percent' ? '100' : undefined}
                            value={discountValue || ''}
                            onChange={e => onSetDiscountValue(parseFloat(e.target.value) || 0)}
                            placeholder={discountType === 'percent' ? 'Ex: 10' : 'Ex: 50'}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm
                                       focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    )}
                    {discountCents > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                            Remise appliquée: -{fmt(discountCents)}
                        </p>
                    )}
                </Section>

                {/* ── Durée ── (masquée en mode vente produits uniquement) */}
                {!isProductOnly && (
                <Section label="Durée estimée">
                    <div className="flex items-center gap-2">
                        <Clock size={14} className="text-gray-400 shrink-0" />
                        {!editDuration
                            ? <>
                                <span className={clsx('text-sm font-semibold',
                                    duration.minutes > 0 ? 'text-gray-800' : 'text-gray-300')}>
                                    {duration.minutes > 0 ? fmtM(duration.minutes) : '—'}
                                </span>
                                {!duration.auto && (
                                    <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 rounded-full">Manuel</span>
                                )}
                                {dueTime && (
                                    <span className="text-xs text-gray-400 ml-auto">→ {dueTime}</span>
                                )}
                                <button onClick={() => { setDraftMin(duration.minutes || ''); setEditDuration(true); }}
                                    className="ml-auto p-1 rounded hover:bg-gray-100 text-gray-400">
                                    <Edit3 size={12} />
                                </button>
                            </>
                            : <div className="flex-1 space-y-2">
                                <div className="flex flex-wrap gap-1">
                                    {DURATION_PRESETS.map(p => (
                                        <button key={p} onClick={() => { onSetDuration(p); setEditDuration(false); }}
                                            className={clsx('px-2.5 py-1 rounded-lg text-xs border transition-all',
                                                duration.minutes === p
                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                    : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300')}>
                                            {fmtM(p)}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="number" min="1" max="480" value={draftMin}
                                        onChange={e => setDraftMin(e.target.value)}
                                        placeholder="min"
                                        className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-xs
                                                     focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    <button onClick={applyDuration}
                                        className="p-1.5 bg-blue-600 text-white rounded-lg">
                                        <Check size={12} />
                                    </button>
                                    {duration.auto === false && (
                                        <button onClick={() => { onSetDuration(null); setEditDuration(false); }}
                                            className="text-xs text-gray-400 hover:text-gray-600">Auto</button>
                                    )}
                                </div>
                            </div>
                        }
                    </div>
                </Section>
                )}

                {/* ── Notes ── */}
                <Section label="Notes">
                    <textarea value={notes} onChange={e => onSetNotes(e.target.value)}
                        rows={3} placeholder="Remarques…"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs resize-none
                                   focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </Section>
            </div>

            {/* ── Total + Submit ── */}
            <div className="px-4 py-4 border-t border-gray-100 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.06)] space-y-3 shrink-0">
                {discountCents > 0 && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Sous-total</span>
                        <span className="text-gray-600">{fmt(subtotal)}</span>
                    </div>
                )}
                {discountCents > 0 && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-green-600">Remise</span>
                        <span className="text-green-600">-{fmt(discountCents)}</span>
                    </div>
                )}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Total</span>
                    <span className="text-xl font-bold text-gray-900">{fmt(total)}</span>
                </div>

                {Object.keys(errors).length > 0 && (
                    <div className="flex items-start gap-2 p-2 bg-red-50 rounded-xl border border-red-100">
                        <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-600">
                            {errors.ticket ?? 'Veuillez corriger les erreurs ci-dessus.'}
                        </p>
                    </div>
                )}

                <button onClick={onSubmit} disabled={processing || !hasItems}
                    className={clsx(
                        'w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2',
                        hasItems && !processing
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    )}>
                    {processing && <Loader2 size={15} className="animate-spin" />}
                    {processing ? 'Enregistrement…' : (submitLabel ?? 'Créer le ticket')}
                </button>
                {!hasItems && (
                    <p className="text-center text-xs text-gray-400">
                        Ajoutez une prestation ou un produit pour continuer
                    </p>
                )}
            </div>
        </div>
    );
});

export default TicketRecap;

function Section({ label, children }) {
    return (
        <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{label}</p>
            {children}
        </div>
    );
}

function Err({ children }) {
    return <p className="text-xs text-red-500 mt-0.5">{children}</p>;
}
