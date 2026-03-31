import { X, Check } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

/**
 * Mini-modal de sélection du prix variable selon type de véhicule
 * Props :
 *   service       — objet service complet
 *   priceGrid     — { [serviceId]: { [vehicleTypeId]: priceCents } }
 *   vehicleTypes  — [{id, name}]
 *   suggestedTypeId — pré-sélection (type du modèle choisi)
 *   onConfirm     — fn({unit_price_cents, price_variant_id})
 *   onClose       — fn()
 */
export default function PricePicker({ service, priceGrid, vehicleTypes, suggestedTypeId, onConfirm, onClose }) {
    const prices = priceGrid[service.id] ?? {};
    const available = vehicleTypes.filter(vt => prices[vt.id] != null);

    const [selected, setSelected] = useState(
        suggestedTypeId && prices[suggestedTypeId] != null ? suggestedTypeId : null
    );

    const confirm = () => {
        if (!selected) return;
        onConfirm({
            unit_price_cents: prices[selected],
            price_variant_id: selected,
        });
    };

    const fmt = (cents) => `${(cents / 100).toFixed(2)} MAD`;

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div>
                        <p className="text-xs text-gray-400">Choisir le tarif pour</p>
                        <h3 className="text-sm font-semibold text-gray-800">{service.name}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                        <X size={15} />
                    </button>
                </div>

                {/* Options */}
                <div className="p-4 space-y-2">
                    {available.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-4">
                            Aucun tarif configuré pour ce service.
                        </p>
                    )}
                    {available.map(vt => (
                        <button key={vt.id} onClick={() => setSelected(vt.id)}
                            className={clsx(
                                'w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all',
                                selected === vt.id
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                            )}>
                            <span className={clsx('font-medium', selected === vt.id ? 'text-blue-700' : 'text-gray-700')}>
                                {vt.name}
                            </span>
                            <div className="flex items-center gap-2">
                                <span className={clsx('font-semibold', selected === vt.id ? 'text-blue-700' : 'text-gray-800')}>
                                    {fmt(prices[vt.id])}
                                </span>
                                {selected === vt.id && <Check size={15} className="text-blue-500" />}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
                    <button onClick={onClose}
                        className="flex-1 py-2 text-sm text-gray-500 hover:text-gray-700">
                        Annuler
                    </button>
                    <button onClick={confirm} disabled={!selected}
                        className={clsx(
                            'flex-1 py-2 text-sm font-semibold rounded-xl transition-all',
                            selected ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        )}>
                        Ajouter
                    </button>
                </div>
            </div>
        </div>
    );
}
