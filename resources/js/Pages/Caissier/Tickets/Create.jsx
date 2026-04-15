import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import { useState, useMemo, useEffect } from 'react';
import { Car, User, X, UserCog, ChevronRight, Package } from 'lucide-react';
import clsx from 'clsx';

import VehicleOverlay from './components/VehicleOverlay';
import ClientDrawer from './components/ClientDrawer';
import WasherOverlay from './components/WasherOverlay';
import ServiceGrid from './components/ServiceGrid';
import ProductGrid from './components/ProductGrid';
import TicketRecap from './components/TicketRecap';
import ErrorBoundary from '@/Components/ErrorBoundary';

/**
 * Page caissier — Création d'un nouveau ticket (POS)
 *
 * Props Inertia :
 *   services          — { [category]: [svc…] }
 *   priceGrid         — { [serviceId]: { [vehicleTypeId]: priceCents } }
 *   vehicleTypes      — [{id, name}]
 *   brands            — [{id, name, slug, logo_url, models:[{id,name,suggested_vehicle_type_id}]}]
 *   washers           — [{id, name, avatar}]
 *   sellableProducts  — [{id, name, barcode, selling_price_cents, current_stock, unit}]
 *   atelierClientId   — int (ID of the Atelier client)
 *   atelierClient     — {id, name, phone, is_company} (Atelier client object for quick-select)
 */
export default function Create({ services, priceGrid, vehicleTypes, brands, washers = [], sellableProducts = [], atelierClientId, atelierClient }) {

    /* ── État principal ── */
    const [vehicle, setVehicle] = useState({ brand: null, model: null, plate: '' });
    const [client, setClient] = useState(null);
    // service line shape: {service_id, name, unit_price_cents, quantity, price_variant_id, duration_minutes, variantLabel}
    const [lines, setLines] = useState([]);
    // product line shape: {sellable_product_id, name, unit_price_cents, quantity, is_free}
    const [productLines, setProductLines] = useState([]);
    const [washerId, setWasherId] = useState(null);
    const [notes, setNotes] = useState('');
    const [durationOverride, setDurationOverride] = useState(null); // null = calculé auto

    /* ── Discount (Remise) ── */
    const [discountType, setDiscountType] = useState(null); // 'percent' | 'fixed' | null
    const [discountValue, setDiscountValue] = useState(0);

    /* ── Onglet gauche ('services' | 'produits') — desktop et mobile ── */
    const [leftTab, setLeftTab] = useState('services');

    /* ── Mobile : onglet actif ('services' | 'recap') ── */
    const [mobileView, setMobileView] = useState('services');

    /* ── Modales ── */
    const [showVehicle, setShowVehicle] = useState(false);
    const [showClient, setShowClient] = useState(false);
    const [showWasher, setShowWasher] = useState(false);

    /* ── Soumission ── */
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState({});

    /* ── Client est Atelier? ── */
    const isAtelierClient = client?.id === atelierClientId;

    /* ── Auto-free: when Atelier is selected, mark all product lines as free ── */
    useEffect(() => {
        if (isAtelierClient) {
            setProductLines(prev => prev.map(l => ({ ...l, is_free: true })));
        }
    }, [isAtelierClient]);

    /* ── Durée auto (somme des lignes) ── */
    const autoDuration = useMemo(
        () => lines.reduce((s, l) => s + (l.duration_minutes ?? 0) * l.quantity, 0),
        [lines]
    );

    /* ── Totaux ── */
    const servicesSubtotal = useMemo(
        () => lines.reduce((s, l) => s + l.unit_price_cents * l.quantity, 0),
        [lines]
    );
    const productsSubtotal = useMemo(
        () => productLines.reduce((s, l) => l.is_free ? s : s + l.unit_price_cents * l.quantity, 0),
        [productLines]
    );
    const subtotal = servicesSubtotal + productsSubtotal;

    // Calculate discount
    const discountCents = useMemo(() => {
        if (!discountType || discountValue <= 0) return 0;
        if (discountType === 'percent') return Math.round(subtotal * discountValue / 100);
        return Math.round(discountValue * 100); // fixed amount in MAD → cents
    }, [subtotal, discountType, discountValue]);

    const mobileTotal = subtotal - discountCents;
    const mobileTotalFmt = `${(mobileTotal / 100).toFixed(0)} MAD`;

    const duration = {
        auto: durationOverride === null,
        minutes: durationOverride ?? autoDuration,
    };

    /* ── Type véhicule suggéré (pré-sélection tarif) ── */
    const suggestedTypeId = vehicle.model?.suggested_vehicle_type_id ?? null;

    /* ───────────────────────────── Lignes ticket ─────────────────────────── */

    /** Ajout ou incrément — appelé par ServiceGrid */
    function handleAddLine(line) {
        const variantLabel = line.price_variant_id
            ? (vehicleTypes.find(vt => vt.id === line.price_variant_id)?.name ?? null)
            : null;

        setLines(prev => {
            const idx = prev.findIndex(l => l.service_id === line.service_id);
            if (idx !== -1) {
                return prev.map((l, i) => i === idx ? { ...l, quantity: l.quantity + 1 } : l);
            }
            return [...prev, { ...line, quantity: 1, variantLabel }];
        });
    }

    /** Décrément ou suppression — appelé par ServiceGrid et TicketRecap */
    function handleRemoveLine(service_id) {
        setLines(prev => {
            const idx = prev.findIndex(l => l.service_id === service_id);
            if (idx === -1) return prev;
            if (prev[idx].quantity <= 1) return prev.filter((_, i) => i !== idx);
            return prev.map((l, i) => i === idx ? { ...l, quantity: l.quantity - 1 } : l);
        });
    }

    /* ───────────────────────────── Produits ─────────────────────────────── */

    /** Ajout ou incrément d'un produit */
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
                is_free: isAtelierClient, // auto-free for Atelier (100% discount)
            }];
        });
    }

    /** Décrément ou suppression d'un produit */
    function handleRemoveProduct(productId) {
        setProductLines(prev => {
            const idx = prev.findIndex(l => l.sellable_product_id === productId);
            if (idx === -1) return prev;
            if (prev[idx].quantity <= 1) return prev.filter((_, i) => i !== idx);
            return prev.map((l, i) => i === idx ? { ...l, quantity: l.quantity - 1 } : l);
        });
    }

    /** Toggle gratuit pour un produit (Atelier only) */
    function handleToggleFree(productId) {
        if (!isAtelierClient) return;
        setProductLines(prev =>
            prev.map(l => l.sellable_product_id === productId ? { ...l, is_free: !l.is_free } : l)
        );
    }

    /* ───────────────────────────── Véhicule ─────────────────────────────── */

    /**
     * Dual-use (appelé par TicketRecap) :
     *   onOpenVehicle()              → ouvre l'overlay marque/modèle
     *   onOpenVehicle('plate', val)  → met à jour la plaque depuis le champ recap
     */
    function handleOpenVehicle(...args) {
        if (args[0] === 'plate') {
            setVehicle(v => ({ ...v, plate: String(args[1]).toUpperCase() }));
        } else {
            setShowVehicle(true);
        }
    }

    /* ───────────────────────────── Soumission ───────────────────────────── */

    function submit() {
        setProcessing(true);
        setErrors({});

        const effectiveDur = duration.minutes > 0 ? duration.minutes : null;

        router.post(route('caissier.tickets.store'), {
            vehicle_brand_id: vehicle.brand?.id ?? null,
            vehicle_model_id: vehicle.model?.id ?? null,
            vehicle_plate: vehicle.plate || null,
            client_id: client?.id ?? null,
            assigned_to: washerId ?? null,
            estimated_duration: effectiveDur,
            notes: notes || null,
            discount_type: discountType,
            discount_value: discountValue > 0 ? discountValue : null,
            services: lines.map(l => ({
                service_id: l.service_id,
                unit_price_cents: l.unit_price_cents,
                quantity: l.quantity,
                discount_cents: 0,
                price_variant_id: l.price_variant_id ?? null,
            })),
            products: productLines.map(l => ({
                sellable_product_id: l.sellable_product_id,
                unit_price_cents: l.unit_price_cents,
                quantity: l.quantity,
                discount_cents: 0,
                is_free: l.is_free,
            })),
        }, {
            onError: errs => { setErrors(errs); setProcessing(false); },
            onSuccess: () => setProcessing(false),
        });
    }

    /* ───────────────────────────── Rendu ────────────────────────────────── */

    return (
        <AppLayout>
            <Head title="Nouveau ticket" />

            {/* Overlay plein-écran sélection véhicule */}
            {showVehicle && (
                <VehicleOverlay
                    brands={brands}
                    onSelect={({ brand, model }) => {
                        setVehicle(v => ({ ...v, brand, model }));
                        setShowVehicle(false);
                    }}
                    onClose={() => setShowVehicle(false)}
                />
            )}

            {/* Tiroir client */}
            {showClient && (
                <ClientDrawer
                    selected={client}
                    atelierClient={atelierClient}
                    onSelect={c => { setClient(c); setShowClient(false); }}
                    onClose={() => setShowClient(false)}
                />
            )}

            {/* Overlay laveur */}
            {showWasher && (
                <WasherOverlay
                    washers={washers}
                    selected={washerId}
                    onSelect={setWasherId}
                    onClose={() => setShowWasher(false)}
                />
            )}

            {/* Products Overlay — kept for any external onOpenProducts triggers */}

            {/* Layout POS deux colonnes (desktop) / onglets (mobile) */}
            <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden">

                {/* ── Onglets mobiles (< lg uniquement) ── */}
                <div className="flex shrink-0 border-b border-gray-200 bg-white lg:hidden">
                    <button
                        onClick={() => { setMobileView('services'); setLeftTab('services'); }}
                        className={clsx(
                            'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors',
                            mobileView === 'services' && leftTab === 'services'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        )}
                    >
                        Services
                        {lines.length > 0 && (
                            <span className="text-[11px] bg-blue-100 text-blue-600 font-bold rounded-full px-1.5 py-0.5 leading-none">
                                {lines.length}
                            </span>
                        )}
                    </button>
                    {sellableProducts.length > 0 && (
                        <button
                            onClick={() => { setMobileView('services'); setLeftTab('produits'); }}
                            className={clsx(
                                'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors',
                                mobileView === 'services' && leftTab === 'produits'
                                    ? 'border-green-600 text-green-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            )}
                        >
                            <Package size={14} />
                            Produits
                            {productLines.length > 0 && (
                                <span className="text-[11px] bg-green-100 text-green-600 font-bold rounded-full px-1.5 py-0.5 leading-none">
                                    {productLines.length}
                                </span>
                            )}
                        </button>
                    )}
                    <button
                        onClick={() => setMobileView('recap')}
                        className={clsx(
                            'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors',
                            mobileView === 'recap'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        )}
                    >
                        Récap
                        {mobileTotal > 0 && (
                            <span className="text-[11px] font-bold text-gray-700">{mobileTotalFmt}</span>
                        )}
                    </button>
                </div>

                {/* ══ Gauche : barre de contexte + grille prestations ══ */}
                <div className={clsx(
                    'flex-1 flex flex-col min-w-0 border-r border-gray-200 bg-white overflow-hidden',
                    mobileView !== 'services' ? 'hidden lg:flex' : 'flex'
                )}>

                    {/* Barre véhicule / plaque / client — 2 lignes */}
                    <div className="px-4 py-3 border-b border-gray-200 shrink-0 space-y-2">

                        {/* Ligne 1 : Marque + modèle  •  Immatriculation */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowVehicle(true)}
                                className={clsx(
                                    'flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all touch-manipulation',
                                    vehicle.brand
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300'
                                )}>
                                {vehicle.brand?.logo_url
                                    ? <img src={vehicle.brand.logo_url} alt="" className="w-5 h-5 object-contain" />
                                    : <Car size={15} />
                                }
                                <span className="max-w-[140px] truncate">
                                    {vehicle.brand
                                        ? `${vehicle.brand.name} ${vehicle.model?.name ?? ''}`
                                        : 'Véhicule'}
                                </span>
                                {vehicle.brand && (
                                    <span
                                        role="button"
                                        tabIndex={0}
                                        onClick={e => {
                                            e.stopPropagation();
                                            setVehicle(v => ({ ...v, brand: null, model: null }));
                                        }}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault(); e.stopPropagation();
                                                setVehicle(v => ({ ...v, brand: null, model: null }));
                                            }
                                        }}
                                        className="ml-1 text-blue-400 hover:text-blue-700 cursor-pointer">
                                        <X size={12} />
                                    </span>
                                )}
                            </button>

                            <input
                                value={vehicle.plate}
                                onChange={e => setVehicle(v => ({ ...v, plate: e.target.value.toUpperCase() }))}
                                placeholder="AB-123-CD"
                                maxLength={20}
                                className="w-28 px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-mono
                                           focus:outline-none focus:border-blue-500 text-gray-700 bg-white
                                           placeholder:text-gray-300 uppercase touch-manipulation"
                            />
                        </div>

                        {/* Ligne 2 : Client  •  Laveur */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowClient(true)}
                                className={clsx(
                                    'flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all touch-manipulation',
                                    client
                                        ? 'border-green-500 bg-green-50 text-green-700'
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-green-300'
                                )}>
                                <User size={15} />
                                <span className="max-w-[120px] truncate">
                                    {client ? client.name : 'Client'}
                                </span>
                                {client && (
                                    <span
                                        role="button"
                                        tabIndex={0}
                                        onClick={e => { e.stopPropagation(); setClient(null); }}
                                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setClient(null); } }}
                                        className="ml-1 text-green-400 hover:text-green-700 cursor-pointer">
                                        <X size={12} />
                                    </span>
                                )}
                            </button>

                            {washers.length > 0 && (
                                <button
                                    onClick={() => setShowWasher(true)}
                                    className={clsx(
                                        'flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all touch-manipulation',
                                        washerId
                                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-orange-300'
                                    )}>
                                    <UserCog size={15} />
                                    <span className="max-w-[120px] truncate">
                                        {washerId
                                            ? washers.find(w => w.id === washerId)?.name ?? 'Laveur'
                                            : 'Laveur'}
                                    </span>
                                    {washerId && (
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            onClick={e => { e.stopPropagation(); setWasherId(null); }}
                                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setWasherId(null); } }}
                                            className="ml-1 text-orange-400 hover:text-orange-700 cursor-pointer">
                                            <X size={12} />
                                        </span>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ── Onglets desktop Services / Produits ── */}
                    {sellableProducts.length > 0 && (
                        <div className="flex shrink-0 border-b border-gray-200 bg-white px-2">
                            <button
                                onClick={() => setLeftTab('services')}
                                className={clsx(
                                    'flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 -mb-px transition-colors',
                                    leftTab === 'services'
                                        ? 'border-blue-600 text-blue-700'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                )}
                            >
                                Services
                                {lines.length > 0 && (
                                    <span className={clsx(
                                        'text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none',
                                        leftTab === 'services' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                                    )}>
                                        {lines.reduce((s, l) => s + l.quantity, 0)}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setLeftTab('produits')}
                                className={clsx(
                                    'flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 -mb-px transition-colors',
                                    leftTab === 'produits'
                                        ? 'border-green-600 text-green-700'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                )}
                            >
                                <Package size={12} />
                                Produits
                                {productLines.length > 0 && (
                                    <span className={clsx(
                                        'text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none',
                                        leftTab === 'produits' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                    )}>
                                        {productLines.reduce((s, l) => s + l.quantity, 0)}
                                    </span>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Grille des prestations / produits */}
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <ErrorBoundary inline>
                            {leftTab === 'produits' ? (
                                <ProductGrid
                                    products={sellableProducts}
                                    productLines={productLines}
                                    isAtelierClient={isAtelierClient}
                                    isActive={leftTab === 'produits'}
                                    onAdd={handleAddProduct}
                                    onRemove={handleRemoveProduct}
                                    onToggleFree={handleToggleFree}
                                />
                            ) : (
                                <ServiceGrid
                                    services={services}
                                    priceGrid={priceGrid}
                                    vehicleTypes={vehicleTypes}
                                    suggestedTypeId={suggestedTypeId}
                                    lines={lines}
                                    onAdd={handleAddLine}
                                    onRemove={handleRemoveLine}
                                />
                            )}
                        </ErrorBoundary>
                    </div>

                    {/* ── Barre total mobile (pinned bottom, < lg uniquement) ── */}
                    <div className="lg:hidden shrink-0 border-t border-gray-200 bg-white px-4 py-3 flex items-center gap-3">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm font-semibold text-gray-700">
                                {lines.length > 0
                                    ? `${lines.length} prestation${lines.length > 1 ? 's' : ''}`
                                    : 'Aucune prestation'}
                            </span>
                            {mobileTotal > 0 && (
                                <span className="text-sm text-gray-500 truncate">— {mobileTotalFmt}</span>
                            )}
                        </div>
                        <div className="flex-1" />
                        <button
                            onClick={() => setMobileView('recap')}
                            disabled={lines.length === 0 && productLines.length === 0}
                            className={clsx(
                                'flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all touch-manipulation',
                                (lines.length > 0 || productLines.length > 0)
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            )}>
                            Récap
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>

                {/* ══ Droite : récap + soumission ══ */}
                <div className={clsx(
                    'w-full lg:w-80 xl:w-96 shrink-0 flex flex-col overflow-hidden',
                    mobileView !== 'recap' ? 'hidden lg:flex' : 'flex'
                )}>
                    <ErrorBoundary inline>
                    <TicketRecap
                        vehicle={vehicle}
                        client={client}
                        lines={lines}
                        washers={washers}
                        duration={duration}
                        washer={washerId}
                        notes={notes}
                        processing={processing}
                        errors={errors}
                        discountType={discountType}
                        discountValue={discountValue}
                        discountCents={discountCents}
                        onOpenVehicle={handleOpenVehicle}
                        onOpenClient={() => setShowClient(true)}
                        onOpenProducts={() => { setLeftTab('produits'); setMobileView('services'); }}
                        onRemoveLine={handleRemoveLine}
                        onRemoveProduct={handleRemoveProduct}
                        onToggleFree={handleToggleFree}
                        onSetDuration={setDurationOverride}
                        onSetWasher={setWasherId}
                        onSetNotes={setNotes}
                        onSetDiscountType={setDiscountType}
                        onSetDiscountValue={setDiscountValue}
                        onSubmit={submit}
                        productLines={productLines}
                        isAtelierClient={isAtelierClient}
                        sellableProducts={sellableProducts}
                    />
                    </ErrorBoundary>
                </div>
            </div>
        </AppLayout>
    );
}

