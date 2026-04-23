import { ShoppingCart, User, Trash2, Percent, AlertCircle, Loader2, Package } from 'lucide-react';
import { useState, memo } from 'react';
import clsx from 'clsx';

const fmt = (cents) => `${(cents / 100).toFixed(2)} MAD`;

/**
 * SaleRecap — Panneau récapitulatif de vente express (colonne droite POS).
 *
 * Props :
 *   client          — objet client ou null
 *   productLines    — [{sellable_product_id, name, unit_price_cents, quantity, is_free}]
 *   discountType    — 'percent' | 'fixed' | null
 *   discountValue   — number
 *   discountCents   — number (calculated)
 *   notes           — string
 *   processing      — bool
 *   errors          — {}
 *   onOpenClient    — fn()
 *   onRemoveProduct — fn(productId)
 *   onSetNotes      — fn(string)
 *   onSetDiscountType  — fn(type)
 *   onSetDiscountValue — fn(value)
 *   onCheckout      — fn()  — ouvre la modal de paiement
 */
const SaleRecap = memo(function SaleRecap({
    client,
    productLines = [],
    discountType,
    discountValue,
    discountCents,
    notes,
    processing,
    errors,
    onOpenClient,
    onRemoveProduct,
    onSetNotes,
    onSetDiscountType,
    onSetDiscountValue,
    onCheckout,
}) {
    const [showNotes, setShowNotes] = useState(false);

    const subtotal = productLines.reduce(
        (s, l) => l.is_free ? s : s + l.unit_price_cents * l.quantity,
        0
    );
    const total = Math.max(0, subtotal - (discountCents || 0));
    const hasItems = productLines.length > 0;

    return (
        <div className="flex flex-col h-full bg-white">

            {/* En-tête */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
                <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <ShoppingCart size={15} className="text-emerald-600" />
                    Panier
                    {productLines.length > 0 && (
                        <span className="text-[11px] bg-emerald-100 text-emerald-700 font-bold rounded-full px-1.5 py-0.5 leading-none">
                            {productLines.length}
                        </span>
                    )}
                </span>

                {/* Client */}
                <button
                    onClick={onOpenClient}
                    className={clsx(
                        'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors',
                        client
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                    )}
                >
                    <User size={12} />
                    {client ? client.name : 'Client'}
                </button>
            </div>

            {/* Liste des produits */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 min-h-0">
                {productLines.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 py-10">
                        <Package size={28} className="opacity-40" />
                        <p className="text-sm">Aucun produit sélectionné</p>
                    </div>
                )}

                {productLines.map((line) => (
                    <div
                        key={line.sellable_product_id}
                        className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 group"
                    >
                        {/* Info produit */}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{line.name}</p>
                            <p className="text-xs text-gray-400">
                                {fmt(line.unit_price_cents)} × {line.quantity}
                                {line.is_free && (
                                    <span className="ml-1 text-emerald-600 font-semibold">(gratuit)</span>
                                )}
                            </p>
                        </div>

                        {/* Total ligne */}
                        <div className="text-right shrink-0">
                            {line.is_free ? (
                                <span className="text-xs text-emerald-600 font-semibold">0.00 MAD</span>
                            ) : (
                                <span className="text-sm font-semibold text-gray-700">
                                    {fmt(line.unit_price_cents * line.quantity)}
                                </span>
                            )}
                        </div>

                        {/* Supprimer */}
                        <button
                            onClick={() => onRemoveProduct(line.sellable_product_id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-50 text-red-400 transition-all"
                            title="Supprimer"
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Section remise + totaux + notes + bouton */}
            <div className="shrink-0 border-t border-gray-100 px-4 py-3 space-y-3">

                {/* Remise */}
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Percent size={13} className="text-gray-400" />
                        <span className="text-xs font-medium text-gray-600">Remise</span>
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={discountType ?? ''}
                            onChange={e => onSetDiscountType(e.target.value || null)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                        >
                            <option value="">Aucune</option>
                            <option value="percent">%</option>
                            <option value="fixed">MAD</option>
                        </select>
                        {discountType && (
                            <input
                                type="number"
                                min="0"
                                max={discountType === 'percent' ? 100 : undefined}
                                step="0.01"
                                value={discountValue || ''}
                                onChange={e => onSetDiscountValue(parseFloat(e.target.value) || 0)}
                                placeholder={discountType === 'percent' ? '0 %' : '0.00 MAD'}
                                className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                            />
                        )}
                    </div>
                </div>

                {/* Notes (optionnel) */}
                <div>
                    <button
                        onClick={() => setShowNotes(!showNotes)}
                        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        {showNotes ? '− Masquer notes' : '+ Ajouter une note'}
                    </button>
                    {showNotes && (
                        <textarea
                            value={notes}
                            onChange={e => onSetNotes(e.target.value)}
                            rows={2}
                            placeholder="Notes internes (optionnel)…"
                            className="mt-1 w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400 resize-none"
                        />
                    )}
                </div>

                {/* Totaux */}
                <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-gray-500">
                        <span>Sous-total</span>
                        <span>{fmt(subtotal)}</span>
                    </div>
                    {discountCents > 0 && (
                        <div className="flex justify-between text-emerald-600">
                            <span>
                                Remise
                                {discountType === 'percent' && discountValue > 0
                                    ? ` (${discountValue}%)`
                                    : ''}
                            </span>
                            <span>−{fmt(discountCents)}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold text-gray-800 text-base pt-1 border-t border-gray-100">
                        <span>Total</span>
                        <span className="text-emerald-700">{fmt(total)}</span>
                    </div>
                </div>

                {/* Erreur globale */}
                {errors?.products && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle size={12} /> {errors.products}
                    </p>
                )}

                {/* Bouton Encaisser */}
                <button
                    onClick={onCheckout}
                    disabled={!hasItems || processing}
                    className={clsx(
                        'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-colors',
                        hasItems && !processing
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    )}
                >
                    {processing
                        ? <><Loader2 size={16} className="animate-spin" /> Enregistrement…</>
                        : <><ShoppingCart size={15} /> Encaisser →</>
                    }
                </button>
            </div>
        </div>
    );
});

export default SaleRecap;
