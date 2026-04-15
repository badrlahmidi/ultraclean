import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import { Car, User, X, UserCog, ChevronRight, ArrowLeft, Package } from 'lucide-react';
import clsx from 'clsx';

import VehicleOverlay from './components/VehicleOverlay';
import ClientDrawer from './components/ClientDrawer';
import WasherOverlay from './components/WasherOverlay';
import ServiceGrid from './components/ServiceGrid';
import ProductGrid from './components/ProductGrid';
import TicketRecap from './components/TicketRecap';

/**
 * Page caissier — Modification d'un ticket existant
 *
 * Props Inertia :
 *   ticket           — TicketResource (données actuelles)
 *   services         — { [category]: [svc…] }
 *   priceGrid        — { [serviceId]: { [vehicleTypeId]: priceCents } }
 *   vehicleTypes     — [{id, name}]
 *   brands           — [{id, name, slug, logo_url, models:[…]}]
 *   washers          — [{id, name, avatar}]
 *   sellableProducts — [{id, name, barcode, selling_price_cents, current_stock, unit}]
 *   atelierClientId  — int
 */
export default function Edit({ ticket, services, priceGrid, vehicleTypes, brands, washers = [], sellableProducts = [], atelierClientId }) {

    /* ── Initialisation depuis le ticket existant ── */
    const initBrand = ticket.vehicle_brand_id
        ? brands.find(b => b.id === ticket.vehicle_brand_id) ?? null
        : null;

    const initModel = initBrand && ticket.vehicle_model_id
        ? initBrand.models?.find(m => m.id === ticket.vehicle_model_id) ?? null
        : null;

    const initLines = (ticket.services ?? []).map(s => ({
        service_id: s.service_id ?? s.id,
        service_name: s.service_name,
        unit_price_cents: s.unit_price_cents,
        quantity: s.quantity,
        price_variant_id: s.price_variant_id ?? null,
        duration_minutes: s.service?.duration_minutes ?? 0,
        variantLabel: null,
    }));

    const initProductLines = (ticket.products ?? []).map(p => ({
        sellable_product_id: p.sellable_product_id,
        name: p.product_name,
        unit_price_cents: p.unit_price_cents,
        quantity: p.quantity,
        is_free: p.is_free ?? false,
    }));

    /* ── État principal ── */
    const [vehicle, setVehicle] = useState({
        brand: initBrand,
        model: initModel,
        plate: ticket.vehicle_plate ?? '',
    });
    const [client, setClient] = useState(ticket.client ?? null);
    const [lines, setLines] = useState(initLines);
    const [productLines, setProductLines] = useState(initProductLines);
    const [washerId, setWasherId] = useState(ticket.assigned_to ?? null);
    const [notes, setNotes] = useState(ticket.notes ?? '');
    const [durationOverride, setDurationOverride] = useState(ticket.estimated_duration ?? null);

    /* ── Onglet gauche ── */
    const [leftTab, setLeftTab] = useState('services');

    /* ── Mobile ── */
    const [mobileView, setMobileView] = useState('services');

    /* ── Modales ── */
    const [showVehicle, setShowVehicle] = useState(false);
    const [showClient, setShowClient] = useState(false);
    const [showWasher, setShowWasher] = useState(false);

    /* ── Traitement ── */
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState({});

    /* ── Client Atelier? ── */
    const isAtelierClient = client?.id === atelierClientId;

    const autoDuration = useMemo(
        () => lines.reduce((s, l) => s + (l.duration_minutes ?? 0) * l.quantity, 0),
        [lines]
    );
    const servicesSubtotal = useMemo(
        () => lines.reduce((s, l) => s + l.unit_price_cents * l.quantity, 0),
        [lines]
    );
    const productsSubtotal = useMemo(
        () => productLines.reduce((s, l) => l.is_free ? s : s + l.unit_price_cents * l.quantity, 0),
        [productLines]
    );
    const mobileTotal = servicesSubtotal + productsSubtotal;
    const mobileTotalFmt = `${(mobileTotal / 100).toFixed(0)} MAD`;
    const duration = { auto: durationOverride === null, minutes: durationOverride ?? autoDuration };
    const suggestedTypeId = vehicle.model?.suggested_vehicle_type_id ?? null;

    /* ── Gestion des lignes services ── */
    function handleAddLine(line) {
        const variantLabel = line.price_variant_id
            ? (vehicleTypes.find(vt => vt.id === line.price_variant_id)?.name ?? null)
            : null;
        setLines(prev => {
            const idx = prev.findIndex(l => l.service_id === line.service_id);
            if (idx !== -1) return prev.map((l, i) => i === idx ? { ...l, quantity: l.quantity + 1 } : l);
            return [...prev, { ...line, quantity: 1, variantLabel }];
        });
    }

    function handleRemoveLine(service_id) {
        setLines(prev => {
            const idx = prev.findIndex(l => l.service_id === service_id);
            if (idx === -1) return prev;
            if (prev[idx].quantity <= 1) return prev.filter((_, i) => i !== idx);
            return prev.map((l, i) => i === idx ? { ...l, quantity: l.quantity - 1 } : l);
        });
    }

    /* ── Gestion des lignes produits ── */
    function handleAddProduct(product) {
        setProductLines(prev => {
            const idx = prev.findIndex(l => l.sellable_product_id === product.id);
            if (idx !== -1) return prev.map((l, i) => i === idx ? { ...l, quantity: l.quantity + 1 } : l);
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

    function handleToggleFree(productId) {
        setProductLines(prev =>
            prev.map(l => l.sellable_product_id === productId ? { ...l, is_free: !l.is_free } : l)
        );
    }

    function handleOpenVehicle(...args) {
        if (args[0] === 'plate') {
            setVehicle(v => ({ ...v, plate: String(args[1]).toUpperCase() }));
        } else {
            setShowVehicle(true);
        }
    }

    /* ── Soumission (PUT) ── */
    function submit() {
        setProcessing(true);
        setErrors({});
        const effectiveDur = duration.minutes > 0 ? duration.minutes : null;

        router.put(route('caissier.tickets.update', ticket.ulid), {
            vehicle_brand_id: vehicle.brand?.id ?? null,
            vehicle_model_id: vehicle.model?.id ?? null,
            vehicle_plate: vehicle.plate || null,
            client_id: client?.id ?? null,
            assigned_to: washerId ?? null,
            estimated_duration: effectiveDur,
            notes: notes || null,
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

    return (
        <AppLayout>
            <Head title={`Modifier ${ticket.ticket_number}`} />

            {showVehicle && (
                <VehicleOverlay brands={brands}
                    onSelect={({ brand, model }) => { setVehicle(v => ({ ...v, brand, model })); setShowVehicle(false); }}
                    onClose={() => setShowVehicle(false)}
                />
            )}
            {showClient && (
                <ClientDrawer selected={client}
                    onSelect={c => { setClient(c); setShowClient(false); }}
                    onClose={() => setShowClient(false)}
                />
            )}
            {showWasher && (
                <WasherOverlay washers={washers} selected={washerId}
                    onSelect={setWasherId} onClose={() => setShowWasher(false)}
                />
            )}

            {/* Bannière contexte */}
            <div className="px-4 py-2 border-b border-amber-200 bg-amber-50 flex items-center gap-3 text-sm -mx-4 sm:-mx-6 lg:-mx-8 mb-0">
                <Link href={route('caissier.tickets.show', ticket.ulid)}
                    className="flex items-center gap-1 text-amber-700 hover:text-amber-900 font-medium">
                    <ArrowLeft size={14} /> {ticket.ticket_number}
                </Link>
                <span className="text-amber-400">·</span>
                <span className="text-amber-700 font-semibold">Modification du ticket</span>
            </div>

            {/* Layout POS identique au Create */}
            <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden">

                {/* Onglets mobiles — "services" mobileView shows the left panel (ServiceGrid or ProductGrid
                     depending on leftTab); "recap" shows the right recap panel. */}
                <div className="flex shrink-0 border-b border-gray-200 bg-white lg:hidden">
                    <button onClick={() => { setMobileView('services'); setLeftTab('services'); }}
                        className={clsx('flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors',
                            mobileView === 'services' && leftTab === 'services' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
                        Prestations
                        {lines.length > 0 && (
                            <span className="text-[11px] bg-blue-100 text-blue-600 font-bold rounded-full px-1.5 py-0.5 leading-none">{lines.length}</span>
                        )}
                    </button>
                    {sellableProducts.length > 0 && (
                        <button onClick={() => { setMobileView('services'); setLeftTab('produits'); }}
                            className={clsx('flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors',
                                mobileView === 'services' && leftTab === 'produits' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
                            <Package size={14} />
                            Produits
                            {productLines.length > 0 && (
                                <span className="text-[11px] bg-green-100 text-green-600 font-bold rounded-full px-1.5 py-0.5 leading-none">{productLines.length}</span>
                            )}
                        </button>
                    )}
                    <button onClick={() => setMobileView('recap')}
                        className={clsx('flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors',
                            mobileView === 'recap' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
                        Récap
                        {mobileTotal > 0 && <span className="text-[11px] font-bold text-gray-700">{mobileTotalFmt}</span>}
                    </button>
                </div>

                {/* Gauche : contexte + grille */}
                <div className={clsx('flex-1 flex flex-col min-w-0 border-r border-gray-200 bg-white overflow-hidden',
                    mobileView !== 'services' ? 'hidden lg:flex' : 'flex')}>

                    <div className="px-4 py-3 border-b border-gray-200 shrink-0 space-y-2">
                        {/* Ligne 1 : Marque + plaque */}
                        <div className="flex items-center gap-2">
                            <button onClick={() => setShowVehicle(true)}
                                className={clsx('flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all',
                                    vehicle.brand ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300')}>
                                {vehicle.brand?.logo_url
                                    ? <img src={vehicle.brand.logo_url} alt="" className="w-5 h-5 object-contain" />
                                    : <Car size={15} />}
                                <span className="max-w-[140px] truncate">
                                    {vehicle.brand ? `${vehicle.brand.name} ${vehicle.model?.name ?? ''}` : 'Véhicule'}
                                </span>
                                {vehicle.brand && (
                                    <span role="button" tabIndex={0}
                                        onClick={e => { e.stopPropagation(); setVehicle(v => ({ ...v, brand: null, model: null })); }}
                                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setVehicle(v => ({ ...v, brand: null, model: null })); } }}
                                        className="ml-1 text-blue-400 hover:text-blue-700 cursor-pointer">
                                        <X size={12} />
                                    </span>
                                )}
                            </button>
                            <input value={vehicle.plate}
                                onChange={e => setVehicle(v => ({ ...v, plate: e.target.value.toUpperCase() }))}
                                placeholder="AB-123-CD" maxLength={20}
                                className="w-28 px-3 py-2 border-2 border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-500 text-gray-700 bg-white placeholder:text-gray-300 uppercase"
                            />
                        </div>

                        {/* Ligne 2 : Client + Laveur */}
                        <div className="flex items-center gap-2">
                            <button onClick={() => setShowClient(true)}
                                className={clsx('flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all',
                                    client ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-600 hover:border-green-300')}>
                                <User size={15} />
                                <span className="max-w-[120px] truncate">{client ? client.name : 'Client'}</span>
                                {client && (
                                    <span role="button" tabIndex={0}
                                        onClick={e => { e.stopPropagation(); setClient(null); }}
                                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setClient(null); } }}
                                        className="ml-1 text-green-400 hover:text-green-700 cursor-pointer">
                                        <X size={12} />
                                    </span>
                                )}
                            </button>
                            {washers.length > 0 && (
                                <button onClick={() => setShowWasher(true)}
                                    className={clsx('flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all',
                                        washerId ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-600 hover:border-orange-300')}>
                                    <UserCog size={15} />
                                    <span className="max-w-[120px] truncate">
                                        {washerId ? (washers.find(w => w.id === washerId)?.name ?? 'Laveur') : 'Laveur'}
                                    </span>
                                    {washerId && (
                                        <span role="button" tabIndex={0}
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

                    {/* Desktop tabs: Prestations | Produits */}
                    {sellableProducts.length > 0 && (
                        <div className="hidden lg:flex shrink-0 border-b border-gray-100 bg-white px-4 gap-2 pt-2">
                            <button
                                onClick={() => setLeftTab('services')}
                                className={clsx(
                                    'flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-t-xl border-b-2 transition-colors',
                                    leftTab === 'services'
                                        ? 'border-blue-600 text-blue-600 bg-blue-50'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                )}>
                                Prestations
                                {lines.length > 0 && (
                                    <span className={clsx('text-[11px] font-bold rounded-full px-1.5 py-0.5 leading-none',
                                        leftTab === 'services' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600')}>
                                        {lines.length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setLeftTab('produits')}
                                className={clsx(
                                    'flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-t-xl border-b-2 transition-colors',
                                    leftTab === 'produits'
                                        ? 'border-green-600 text-green-600 bg-green-50'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                )}>
                                <Package size={13} />
                                Produits
                                {productLines.length > 0 && (
                                    <span className={clsx('text-[11px] font-bold rounded-full px-1.5 py-0.5 leading-none',
                                        leftTab === 'produits' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>
                                        {productLines.reduce((s, l) => s + l.quantity, 0)}
                                    </span>
                                )}
                            </button>
                        </div>
                    )}

                    <div className="flex-1 overflow-hidden flex flex-col">
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
                    </div>

                    {/* Barre bas mobile */}
                    <div className="lg:hidden shrink-0 border-t border-gray-200 bg-white px-4 py-3 flex items-center gap-3">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm font-semibold text-gray-700">
                                {lines.length > 0 ? `${lines.length} prestation${lines.length > 1 ? 's' : ''}` : 'Aucune prestation'}
                            </span>
                            {mobileTotal > 0 && <span className="text-sm text-gray-500 truncate">— {mobileTotalFmt}</span>}
                        </div>
                        <div className="flex-1" />
                        <button onClick={() => setMobileView('recap')} disabled={lines.length === 0 && productLines.length === 0}
                            className={clsx('flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                                (lines.length > 0 || productLines.length > 0) ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' : 'bg-gray-100 text-gray-400 cursor-not-allowed')}>
                            Récap <ChevronRight size={14} />
                        </button>
                    </div>
                </div>

                {/* Droite : récap + soumission */}
                <div className={clsx('w-full lg:w-80 xl:w-96 shrink-0 flex flex-col overflow-hidden',
                    mobileView !== 'recap' ? 'hidden lg:flex' : 'flex')}>
                    <TicketRecap
                        vehicle={vehicle}
                        client={client}
                        lines={lines}
                        productLines={productLines}
                        isAtelierClient={isAtelierClient}
                        sellableProducts={sellableProducts}
                        washers={washers}
                        duration={duration}
                        washer={washerId}
                        notes={notes}
                        processing={processing}
                        errors={errors}
                        submitLabel="Enregistrer les modifications"
                        onOpenVehicle={handleOpenVehicle}
                        onOpenClient={() => setShowClient(true)}
                        onOpenProducts={() => { setLeftTab('produits'); setMobileView('services'); }}
                        onRemoveLine={handleRemoveLine}
                        onRemoveProduct={handleRemoveProduct}
                        onToggleFree={handleToggleFree}
                        onSetDuration={setDurationOverride}
                        onSetWasher={setWasherId}
                        onSetNotes={setNotes}
                        onSubmit={submit}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
