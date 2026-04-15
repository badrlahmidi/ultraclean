import { useState, useEffect, useRef, memo } from 'react';
import { Package, Plus, Minus, Barcode, X } from 'lucide-react';
import clsx from 'clsx';

const fmt = (cents) => `${(cents / 100).toFixed(2)} MAD`;

/**
 * Grille POS des produits vendables avec détection scanner code-barres.
 *
 * Props :
 *   products        — [{id, name, barcode, selling_price_cents, current_stock, unit}]
 *   productLines    — [{sellable_product_id, name, unit_price_cents, quantity, is_free}]
 *   isAtelierClient — bool (affiche le bouton "Gratuit")
 *   isActive        — bool (true quand l'onglet Produits est visible — active le scanner)
 *   onAdd           — fn(product)
 *   onRemove        — fn(productId)
 *   onToggleFree    — fn(productId)
 */
const ProductGrid = memo(function ProductGrid({
    products,
    productLines,
    isAtelierClient,
    isActive,
    onAdd,
    onRemove,
    onToggleFree,
}) {
    const [search, setSearch] = useState('');
    const [scanError, setScanError] = useState(null);

    /* ── Barcode scanner (hardware) ──────────────────────────────────────────
     * Hardware scanners send rapid keystrokes (< 80 ms apart) then press Enter.
     * We intercept global keydown only when no other editable element is focused.
     * ─────────────────────────────────────────────────────────────────────── */
    const barcodeBuffer = useRef('');
    const lastKeyTime = useRef(0);
    const scanErrorTimer = useRef(null);

    useEffect(() => {
        if (!isActive) return;

        function handleKeyDown(e) {
            // Only intercept when no other editable element is focused.
            const active = document.activeElement;
            const isEditable =
                active &&
                (active.tagName === 'INPUT' ||
                    active.tagName === 'TEXTAREA' ||
                    active.contentEditable === 'true');
            if (isEditable) return;

            const now = Date.now();
            const delta = now - lastKeyTime.current;
            lastKeyTime.current = now;

            if (e.key === 'Enter') {
                const barcode = barcodeBuffer.current;
                barcodeBuffer.current = '';
                if (barcode.length < 4) return;

                const product = products.find((p) => p.barcode === barcode);
                if (product) {
                    onAdd(product);
                    setScanError(null);
                } else {
                    if (scanErrorTimer.current) clearTimeout(scanErrorTimer.current);
                    setScanError(`Code-barres introuvable\u00a0: ${barcode}`);
                    scanErrorTimer.current = setTimeout(() => setScanError(null), 3000);
                }
                return;
            }

            if (e.key.length === 1) {
                // Fast = scanner continues; slow = new sequence
                barcodeBuffer.current = delta > 80 ? e.key : barcodeBuffer.current + e.key;
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (scanErrorTimer.current) clearTimeout(scanErrorTimer.current);
        };
    }, [isActive, products, onAdd]);

    /* ── Filtered list ─────────────────────────────────────────────────────── */
    const filtered = search
        ? products.filter(
              (p) =>
                  p.name.toLowerCase().includes(search.toLowerCase()) ||
                  (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
                  (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase())),
          )
        : products;

    /* ── Search input: Enter = lookup by exact barcode/SKU or single result ─── */
    function handleSearchKeyDown(e) {
        if (e.key !== 'Enter' || !search.trim()) return;
        const term = search.trim();

        // Exact barcode match first
        const exact = products.find((p) => p.barcode === term || p.sku === term);
        if (exact) {
            onAdd(exact);
            setSearch('');
            return;
        }
        // Single filtered result
        if (filtered.length === 1) {
            onAdd(filtered[0]);
            setSearch('');
        }
    }

    const getQty = (id) =>
        productLines.find((l) => l.sellable_product_id === id)?.quantity ?? 0;
    const isFree = (id) =>
        productLines.find((l) => l.sellable_product_id === id)?.is_free ?? false;

    /* ── Render ──────────────────────────────────────────────────────────────── */
    return (
        <>
            {/* Search / Barcode input */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
                <div className="relative">
                    <Barcode
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder="Rechercher par SKU, nom ou code-barres\u2026"
                        className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm
                                   focus:outline-none focus:border-green-500 bg-white"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Scanner error banner */}
                {scanError && (
                    <div className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                        <span aria-hidden="true">⚠</span>
                        {scanError}
                    </div>
                )}
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-4">
                {products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 py-16">
                        <Package size={40} className="mb-3 opacity-40" />
                        <p className="text-sm font-medium">Aucun produit configuré</p>
                        <p className="text-xs mt-1">
                            Ajoutez des produits dans{' '}
                            <span className="font-semibold">Gestion du stock → Produits vendables</span>
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {filtered.map((p) => {
                                const qty = getQty(p.id);
                                const free = isFree(p.id);
                                const lowStock = p.current_stock > 0 && p.current_stock <= 2;
                                const outOfStock = p.current_stock <= 0;

                                return (
                                    <div
                                        key={p.id}
                                        className={clsx(
                                            'relative flex flex-col rounded-2xl border p-4 min-h-[80px] transition-all cursor-pointer select-none active:scale-[0.97]',
                                            qty > 0
                                                ? 'border-green-400 bg-green-50 shadow-sm'
                                                : outOfStock
                                                ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                                                : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50',
                                        )}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => !outOfStock && onAdd(p)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                if (!outOfStock) onAdd(p);
                                            }
                                        }}
                                    >
                                        {/* Qty badge */}
                                        {qty > 0 && (
                                            <span
                                                className="absolute -top-2 -right-2 w-5 h-5 bg-green-600 text-white
                                                           text-[10px] font-bold rounded-full flex items-center justify-center shadow"
                                            >
                                                {qty}
                                            </span>
                                        )}

                                        {/* Icon */}
                                        <div className="w-8 h-8 rounded-xl mb-2 flex items-center justify-center bg-green-100">
                                            <Package size={14} className="text-green-600" />
                                        </div>

                                        {/* Name */}
                                        <p className="text-xs font-semibold text-gray-800 leading-tight flex-1">
                                            {p.name}
                                        </p>

                                        {/* Price */}
                                        <div className="mt-2">
                                            <span className="text-xs font-bold text-gray-700">
                                                {fmt(p.selling_price_cents)}
                                            </span>
                                        </div>

                                        {/* Stock indicator */}
                                        <div
                                            className={clsx(
                                                'text-[10px] mt-0.5',
                                                outOfStock
                                                    ? 'text-red-500 font-semibold'
                                                    : lowStock
                                                    ? 'text-orange-500 font-medium'
                                                    : 'text-gray-400',
                                            )}
                                        >
                                            {outOfStock
                                                ? 'Rupture de stock'
                                                : `Stock\u00a0: ${p.current_stock}\u00a0${p.unit}${lowStock ? ' ⚠' : ''}`}
                                        </div>

                                        {/* SKU */}
                                        {p.sku && (
                                            <div className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">
                                                SKU: {p.sku}
                                            </div>
                                        )}

                                        {/* Barcode */}
                                        {p.barcode && (
                                            <div className="text-[10px] text-gray-300 font-mono mt-0.5 truncate">
                                                {p.barcode}
                                            </div>
                                        )}

                                        {/* +/- controls */}
                                        {qty > 0 && (
                                            <div
                                                className="flex items-center gap-1 mt-2"
                                                role="group"
                                                aria-label="Quantité"
                                                onClick={(e) => e.stopPropagation()}
                                                onKeyDown={(e) => e.stopPropagation()}
                                            >
                                                <button
                                                    onClick={() => onRemove(p.id)}
                                                    className="w-8 h-8 rounded-xl bg-white border border-green-200 flex items-center justify-center
                                                               text-green-600 hover:bg-green-100"
                                                >
                                                    <Minus size={12} />
                                                </button>
                                                <span className="flex-1 text-center text-xs font-bold text-green-700">
                                                    {qty}
                                                </span>
                                                <button
                                                    onClick={() => onAdd(p)}
                                                    className="w-8 h-8 rounded-xl bg-green-600 flex items-center justify-center
                                                               text-white hover:bg-green-700"
                                                >
                                                    <Plus size={12} />
                                                </button>
                                            </div>
                                        )}

                                        {/* Atelier free toggle */}
                                        {qty > 0 && isAtelierClient && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onToggleFree(p.id);
                                                }}
                                                className={clsx(
                                                    'mt-1.5 w-full px-2 py-1 text-[10px] rounded-lg font-medium transition-colors',
                                                    free
                                                        ? 'bg-purple-100 text-purple-700'
                                                        : 'bg-gray-100 text-gray-500 hover:bg-purple-50 hover:text-purple-600',
                                                )}
                                            >
                                                {free ? '✓ Gratuit' : 'Marquer gratuit'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {filtered.length === 0 && (
                            <p className="text-center text-gray-400 text-sm mt-16">
                                Aucun produit trouvé pour «\u00a0{search}\u00a0»
                            </p>
                        )}
                    </>
                )}
            </div>
        </>
    );
});

export default ProductGrid;
