import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import { Car, User, X } from 'lucide-react';
import clsx from 'clsx';

import VehicleOverlay from './components/VehicleOverlay';
import ClientDrawer from './components/ClientDrawer';
import ServiceGrid from './components/ServiceGrid';
import TicketRecap from './components/TicketRecap';

/**
 * Page caissier — Création d'un nouveau ticket (POS)
 *
 * Props Inertia :
 *   services      — { [category]: [svc…] }
 *   priceGrid     — { [serviceId]: { [vehicleTypeId]: priceCents } }
 *   vehicleTypes  — [{id, name}]
 *   brands        — [{id, name, slug, logo_url, models:[{id,name,suggested_vehicle_type_id}]}]
 *   washers       — [{id, name, avatar}]
 */
export default function Create({ services, priceGrid, vehicleTypes, brands, washers = [] }) {

    /* ── État principal ── */
    const [vehicle, setVehicle] = useState({ brand: null, model: null, plate: '' });
    const [client, setClient] = useState(null);
    // line shape: {service_id, name, unit_price_cents, quantity, price_variant_id, duration_minutes, variantLabel}
    const [lines, setLines] = useState([]);
    const [washerId, setWasherId] = useState(null);
    const [notes, setNotes] = useState('');
    const [durationOverride, setDurationOverride] = useState(null); // null = calculé auto

    /* ── Modales ── */
    const [showVehicle, setShowVehicle] = useState(false);
    const [showClient, setShowClient] = useState(false);

    /* ── Soumission ── */
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState({});

    /* ── Durée auto (somme des lignes) ── */
    const autoDuration = useMemo(
        () => lines.reduce((s, l) => s + (l.duration_minutes ?? 0) * l.quantity, 0),
        [lines]
    );
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
            services: lines.map(l => ({
                service_id: l.service_id,
                unit_price_cents: l.unit_price_cents,
                quantity: l.quantity,
                discount_cents: 0,
                price_variant_id: l.price_variant_id ?? null,
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
                    onSelect={c => { setClient(c); setShowClient(false); }}
                    onClose={() => setShowClient(false)}
                />
            )}

            {/* Layout POS deux colonnes */}
            <div className="flex h-[calc(100vh-4rem)] bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden">

                {/* ══ Gauche : barre de contexte + grille prestations ══ */}
                <div className="flex-1 flex flex-col min-w-0 border-r border-gray-200 bg-white overflow-hidden">

                    {/* Barre véhicule / plaque / client */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 shrink-0 flex-wrap">

                        {/* Marque + modèle */}
                        <button
                            onClick={() => setShowVehicle(true)}
                            className={clsx(
                                'flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all',
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
                                    className="ml-1 text-blue-400 hover:text-blue-700 cursor-pointer">
                                    <X size={12} />
                                </span>
                            )}
                        </button>

                        {/* Immatriculation rapide */}
                        <input
                            value={vehicle.plate}
                            onChange={e => setVehicle(v => ({ ...v, plate: e.target.value.toUpperCase() }))}
                            placeholder="AB-123-CD"
                            maxLength={20}
                            className="w-28 px-3 py-2 border-2 border-gray-200 rounded-xl text-sm font-mono
                                       focus:outline-none focus:border-blue-500 text-gray-700 bg-white
                                       placeholder:text-gray-300 uppercase"
                        />

                        {/* Client */}
                        <button
                            onClick={() => setShowClient(true)}
                            className={clsx(
                                'flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all',
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
                                    className="ml-1 text-green-400 hover:text-green-700 cursor-pointer">
                                    <X size={12} />
                                </span>
                            )}
                        </button>

                        <div className="flex-1" />

                        <span className="text-xs text-gray-400 hidden sm:block select-none">
                            {new Date().toLocaleDateString('fr-MA', {
                                weekday: 'short', day: 'numeric', month: 'short',
                            })}
                        </span>
                    </div>

                    {/* Grille des prestations */}
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <ServiceGrid
                            services={services}
                            priceGrid={priceGrid}
                            vehicleTypes={vehicleTypes}
                            suggestedTypeId={suggestedTypeId}
                            lines={lines}
                            onAdd={handleAddLine}
                            onRemove={handleRemoveLine}
                        />
                    </div>
                </div>

                {/* ══ Droite : récap + soumission ══ */}
                <div className="w-72 xl:w-80 shrink-0 flex flex-col overflow-hidden">
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
                        onOpenVehicle={handleOpenVehicle}
                        onOpenClient={() => setShowClient(true)}
                        onRemoveLine={handleRemoveLine}
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
