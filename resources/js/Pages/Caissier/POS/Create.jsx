import AppLayout from '@/Layouts/AppLayout';
import { Head } from '@inertiajs/react';
import { useState, useMemo, useEffect } from 'react';
import clsx from 'clsx';
import { Package } from 'lucide-react';

import ProductGrid from '@/Pages/Caissier/Tickets/components/ProductGrid';
import ClientDrawer from '@/Pages/Caissier/Tickets/components/ClientDrawer';
import SaleRecap from './components/SaleRecap';
import SalePaymentModal from './components/SalePaymentModal';

/**
 * Page Point de Vente (POS Express)
 *
 * Props Inertia :
 *   sellableProducts — [{id, name, sku, barcode, selling_price_cents, current_stock, unit, is_low_stock}]
 */
export default function POSCreate({ sellableProducts = [] }) {
    /* ── Lignes produit ── */
    // shape: {sellable_product_id, name, unit_price_cents, quantity, is_free}
    const [productLines, setProductLines] = useState([]);

    /* ── Client (optionnel) ── */
    const [client, setClient] = useState(null);

    /* ── Remise ── */
    const [discountType, setDiscountType] = useState(null);
    const [discountValue, setDiscountValue] = useState(0);

    /* ── Notes ── */
    const [notes, setNotes] = useState('');

    /* ── UI ── */
    const [showClient, setShowClient] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [mobileView, setMobileView] = useState('products'); // 'products' | 'recap'

    /* ── Desktop detection — SSR-safe ── */
    const [isDesktop, setIsDesktop] = useState(true);
    useEffect(() => {
        const mql = window.matchMedia('(min-width: 1024px)');
        setIsDesktop(mql.matches);
        const handler = (e) => setIsDesktop(e.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, []);

    /* ── Totaux ── */
    const subtotal = useMemo(
        () => productLines.reduce((s, l) => l.is_free ? s : s + l.unit_price_cents * l.quantity, 0),
        [productLines]
    );

    const discountCents = useMemo(() => {
        if (!discountType || discountValue <= 0) return 0;
        if (discountType === 'percent') return Math.round(subtotal * discountValue / 100);
        return Math.round(discountValue * 100);
    }, [subtotal, discountType, discountValue]);

    const total = Math.max(0, subtotal - discountCents);

    /* ── Handlers produits ── */
    function handleAddProduct(product) {
        setProductLines(prev => {
            const idx = prev.findIndex(l => l.sellable_product_id === product.id);
            if (idx !== -1) {
                return prev.map((l, i) => i === idx ? { ...l, quantity: l.quantity + 1 } : l);
            }
            return [...prev, {
                sellable_product_id: product.id,
                name: product.name,
                unit_price_cents: product.selling_price_cents,
                quantity: 1,
                is_free: false,
            }];
        });
    }

    function handleRemoveProduct(productId) {
        setProductLines(prev => {
            const idx = prev.findIndex(l => l.sellable_product_id === productId);
            if (idx === -1) return prev;
            if (prev[idx].quantity <= 1) return prev.filter((_, i) => i !== idx);
            return prev.map((l, i) => i === idx ? { ...l, quantity: l.quantity - 1 } : l);
        });
    }

    /* ── Données pour la modal ── */
    const saleData = {
        client_id:      client?.id ?? null,
        products:       productLines.map(l => ({
            sellable_product_id: l.sellable_product_id,
            unit_price_cents:    l.unit_price_cents,
            quantity:            l.quantity,
            discount_cents:      0,
            is_free:             l.is_free,
        })),
        discount_type:  discountType,
        discount_value: discountValue > 0 ? discountValue : null,
        notes:          notes || null,
    };

    const mobileTotalFmt = `${(total / 100).toFixed(0)} MAD`;

    return (
        <AppLayout>
            <Head title="Point de Vente" />

            {/* Tiroir client */}
            {showClient && (
                <ClientDrawer
                    selected={client}
                    atelierClient={null}
                    onSelect={c => { setClient(c); setShowClient(false); }}
                    onClose={() => setShowClient(false)}
                />
            )}

            {/* Modal paiement */}
            {showPaymentModal && (
                <SalePaymentModal
                    totalCents={total}
                    saleData={saleData}
                    onClose={() => setShowPaymentModal(false)}
                />
            )}

            {/* Layout POS deux colonnes (desktop) / onglets (mobile) */}
            <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden">

                {/* ── Onglets mobiles ── */}
                <div className="flex shrink-0 border-b border-gray-200 bg-white lg:hidden">
                    <button
                        onClick={() => setMobileView('products')}
                        className={clsx(
                            'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors',
                            mobileView === 'products'
                                ? 'border-emerald-600 text-emerald-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        )}
                    >
                        <Package size={14} />
                        Produits
                        {productLines.length > 0 && (
                            <span className="text-[11px] bg-emerald-100 text-emerald-600 font-bold rounded-full px-1.5 py-0.5 leading-none">
                                {productLines.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setMobileView('recap')}
                        className={clsx(
                            'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors',
                            mobileView === 'recap'
                                ? 'border-emerald-600 text-emerald-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        )}
                    >
                        Panier
                        {total > 0 && (
                            <span className="text-[11px] font-bold text-gray-700">{mobileTotalFmt}</span>
                        )}
                    </button>
                </div>

                {/* ══ Colonne gauche : grille produits ══ */}
                <div className={clsx(
                    'flex-1 flex flex-col min-w-0 border-r border-gray-200 bg-white overflow-hidden',
                    mobileView !== 'products' ? 'hidden lg:flex' : 'flex'
                )}>
                    <div className="px-4 py-3 border-b border-gray-100 shrink-0">
                        <h1 className="text-sm font-semibold text-gray-700">
                            Point de Vente
                        </h1>
                    </div>

                    <ProductGrid
                        products={sellableProducts}
                        productLines={productLines}
                        isAtelierClient={false}
                        isActive={mobileView === 'products' || isDesktop}
                        onAdd={handleAddProduct}
                        onRemove={handleRemoveProduct}
                        onToggleFree={() => {}}
                    />
                </div>

                {/* ══ Colonne droite : récap ══ */}
                <div className={clsx(
                    'w-full lg:w-80 xl:w-96 flex flex-col overflow-hidden',
                    mobileView !== 'recap' ? 'hidden lg:flex' : 'flex'
                )}>
                    <SaleRecap
                        client={client}
                        productLines={productLines}
                        discountType={discountType}
                        discountValue={discountValue}
                        discountCents={discountCents}
                        notes={notes}
                        processing={false}
                        errors={{}}
                        onOpenClient={() => setShowClient(true)}
                        onRemoveProduct={handleRemoveProduct}
                        onSetNotes={setNotes}
                        onSetDiscountType={setDiscountType}
                        onSetDiscountValue={setDiscountValue}
                        onCheckout={() => setShowPaymentModal(true)}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
