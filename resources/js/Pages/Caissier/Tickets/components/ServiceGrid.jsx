import { useState } from 'react';
import { Plus, Minus, Tag } from 'lucide-react';
import clsx from 'clsx';
import PricePicker from './PricePicker';

const CATEGORY_COLORS = {
    'Lavage': 'bg-blue-50 border-blue-200 text-blue-700',
    'Pressing': 'bg-purple-50 border-purple-200 text-purple-700',
    'Détailing': 'bg-amber-50 border-amber-200 text-amber-700',
    'Autre': 'bg-gray-50 border-gray-200 text-gray-600',
};

const fmt = (cents) => `${(cents / 100).toFixed(0)} MAD`;

/**
 * Grille POS des services groupés par catégorie
 * Props :
 *   services      — objet { [category]: [service, …] }
 *   priceGrid     — { [serviceId]: { [vehicleTypeId]: priceCents } }
 *   vehicleTypes  — [{id, name}]
 *   suggestedTypeId — id du type de véhicule détecté (pour pré-sélection prix)
 *   lines         — tableau lignes ticket actuel [{service_id, unit_price_cents, quantity, price_variant_id}]
 *   onAdd         — fn(line) — ajoute ou incrémente
 *   onRemove      — fn(service_id) — décrémente ou retire
 */
export default function ServiceGrid({ services, priceGrid, vehicleTypes, suggestedTypeId, lines, onAdd, onRemove }) {
    const categories = Object.keys(services);
    const [activeCategory, setActiveCategory] = useState(categories[0] ?? null);
    const [pickerService, setPickerService] = useState(null);

    const qtyOf = (id) => lines.find(l => l.service_id === id)?.quantity ?? 0;

    const handleServiceClick = (svc) => {
        const prices = priceGrid[svc.id] ?? {};
        const priceCount = Object.keys(prices).length;

        if (svc.price_type === 'fixed' || priceCount === 0) {
            // Prix unique — ajout direct
            onAdd({
                service_id: svc.id,
                unit_price_cents: svc.base_price_cents ?? 0,
                quantity: 1,
                price_variant_id: null,
                duration_minutes: svc.duration_minutes ?? 0,
                name: svc.name,
            });
        } else if (priceCount === 1) {
            // Un seul tarif — ajout direct sans modal
            const [vtId, price] = Object.entries(prices)[0];
            onAdd({
                service_id: svc.id,
                unit_price_cents: price,
                quantity: 1,
                price_variant_id: parseInt(vtId),
                duration_minutes: svc.duration_minutes ?? 0,
                name: svc.name,
            });
        } else {
            // Prix variable — ouvrir le picker
            setPickerService(svc);
        }
    };

    const handlePickerConfirm = ({ unit_price_cents, price_variant_id }) => {
        if (!pickerService) return;
        onAdd({
            service_id: pickerService.id,
            unit_price_cents,
            quantity: 1,
            price_variant_id,
            duration_minutes: pickerService.duration_minutes ?? 0,
            name: pickerService.name,
        });
        setPickerService(null);
    };

    return (
        <>
            {/* Tabs catégories */}
            <div className="flex gap-1 px-4 py-3 border-b border-gray-100 bg-white overflow-x-auto shrink-0">
                {categories.map(cat => (
                    <button key={cat} onClick={() => setActiveCategory(cat)}
                        className={clsx(
                            'px-4 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-all',
                            activeCategory === cat
                                ? (CATEGORY_COLORS[cat] ?? CATEGORY_COLORS['Autre'])
                                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                        )}>
                        {cat}
                        <span className="ml-1.5 text-[10px] opacity-60">({services[cat]?.length ?? 0})</span>
                    </button>
                ))}
            </div>

            {/* Grille prestations */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {(services[activeCategory] ?? []).map(svc => {
                        const qty = qtyOf(svc.id);
                        const prices = priceGrid[svc.id] ?? {};
                        const isFixed = svc.price_type === 'fixed' || Object.keys(prices).length === 0;
                        const displayPrice = isFixed
                            ? (svc.base_price_cents ? fmt(svc.base_price_cents) : '—')
                            : `${Math.min(...Object.values(prices).map(Number)) / 100 | 0}–${Math.max(...Object.values(prices).map(Number)) / 100 | 0} MAD`;

                        return (
                            <div key={svc.id}
                                className={clsx(
                                    'relative flex flex-col rounded-2xl border p-3 transition-all cursor-pointer select-none',
                                    qty > 0
                                        ? 'border-blue-400 bg-blue-50 shadow-sm'
                                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                                )}
                                onClick={() => handleServiceClick(svc)}>

                                {/* Badge quantité */}
                                {qty > 0 && (
                                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-blue-600 text-white
                                                     text-[10px] font-bold rounded-full flex items-center justify-center shadow">
                                        {qty}
                                    </span>
                                )}

                                {/* Couleur / icône */}
                                <div className="w-8 h-8 rounded-xl mb-2 flex items-center justify-center"
                                    style={{ backgroundColor: svc.color ? `${svc.color}22` : '#eff6ff' }}>
                                    <Tag size={14} style={{ color: svc.color ?? '#3b82f6' }} />
                                </div>

                                <p className="text-xs font-semibold text-gray-800 leading-tight flex-1">{svc.name}</p>

                                <div className="flex items-center justify-between mt-2">
                                    <span className={clsx('text-xs font-bold',
                                        isFixed ? 'text-gray-700' : 'text-amber-600')}>
                                        {displayPrice}
                                    </span>
                                    {!isFixed && (
                                        <span className="text-[9px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">
                                            variable
                                        </span>
                                    )}
                                </div>

                                {/* Contrôle +/- si déjà dans le ticket */}
                                {qty > 0 && (
                                    <div className="flex items-center gap-1 mt-2"
                                        onClick={e => e.stopPropagation()}>
                                        <button onClick={() => onRemove(svc.id)}
                                            className="w-6 h-6 rounded-lg bg-white border border-blue-200 flex items-center justify-center
                                                       text-blue-600 hover:bg-blue-100">
                                            <Minus size={12} />
                                        </button>
                                        <span className="flex-1 text-center text-xs font-bold text-blue-700">{qty}</span>
                                        <button onClick={() => handleServiceClick(svc)}
                                            className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center
                                                       text-white hover:bg-blue-700">
                                            <Plus size={12} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {(services[activeCategory] ?? []).length === 0 && (
                    <p className="text-center text-gray-300 text-sm mt-16">Aucune prestation dans cette catégorie</p>
                )}
            </div>

            {/* Modal prix variable */}
            {pickerService && (
                <PricePicker
                    service={pickerService}
                    priceGrid={priceGrid}
                    vehicleTypes={vehicleTypes}
                    suggestedTypeId={suggestedTypeId}
                    onConfirm={handlePickerConfirm}
                    onClose={() => setPickerService(null)}
                />
            )}
        </>
    );
}
