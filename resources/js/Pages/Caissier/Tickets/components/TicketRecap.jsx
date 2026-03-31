import { Car, User, Trash2, Clock, Edit3, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
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
 *   washers         — [{id, name, avatar}]
 *   duration        — {auto: bool, minutes: number}
 *   washer          — id ou null
 *   notes           — string
 *   processing      — bool
 *   errors          — {}
 *   onOpenVehicle   — fn()
 *   onOpenClient    — fn()
 *   onRemoveLine    — fn(service_id)
 *   onSetDuration   — fn(minutes | null)  null = retour auto
 *   onSetWasher     — fn(id)
 *   onSetNotes      — fn(string)
 *   onSubmit        — fn()
 */
export default function TicketRecap({
    vehicle, client, lines, washers, duration, washer,
    notes, processing, errors,
    onOpenVehicle, onOpenClient, onRemoveLine,
    onSetDuration, onSetWasher, onSetNotes, onSubmit,
}) {
    const [editDuration, setEditDuration] = useState(false);
    const [draftMin, setDraftMin] = useState('');

    const total = lines.reduce((s, l) => s + l.unit_price_cents * l.quantity, 0);
    const hasLines = lines.length > 0;

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
            <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">Récap ticket</h2>
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
                </Section>

                {/* ── Lignes services ── */}
                <Section label={`Prestations${hasLines ? ` (${lines.length})` : ''}`}>
                    {!hasLines && (
                        <p className="text-xs text-gray-300 py-2 text-center">
                            Sélectionnez des prestations à gauche
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
                                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-red-400 transition-opacity">
                                        <Trash2 size={11} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {errors?.services && <Err>{errors.services}</Err>}
                </Section>

                {/* ── Durée ── */}
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

                {/* ── Opérateur ── */}
                {washers.length > 0 && (
                    <Section label="Opérateur">
                        <div className="flex flex-wrap gap-2">
                            {washers.map(w => (
                                <button key={w.id} onClick={() => onSetWasher(w.id === washer ? null : w.id)}
                                    title={w.name}
                                    className={clsx(
                                        'w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all',
                                        w.id === washer
                                            ? 'border-blue-500 bg-blue-100 text-blue-700'
                                            : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-blue-300'
                                    )}>
                                    {w.avatar
                                        ? <img src={w.avatar} alt={w.name} className="w-full h-full rounded-full object-cover" />
                                        : w.name.slice(0, 2).toUpperCase()
                                    }
                                </button>
                            ))}
                        </div>
                        {washer && (
                            <p className="text-xs text-gray-400 mt-1">
                                {washers.find(w => w.id === washer)?.name}
                            </p>
                        )}
                    </Section>
                )}

                {/* ── Notes ── */}
                <Section label="Notes">
                    <textarea value={notes} onChange={e => onSetNotes(e.target.value)}
                        rows={2} placeholder="Remarques…"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs resize-none
                                   focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </Section>
            </div>

            {/* ── Total + Submit ── */}
            <div className="px-4 py-4 border-t border-gray-100 bg-gray-50 space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Total</span>
                    <span className="text-xl font-bold text-gray-900">{fmt(total)}</span>
                </div>

                {Object.keys(errors).length > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-red-50 rounded-xl border border-red-100">
                        <AlertCircle size={14} className="text-red-500 shrink-0" />
                        <p className="text-xs text-red-600">Veuillez corriger les erreurs ci-dessus.</p>
                    </div>
                )}

                <button onClick={onSubmit} disabled={processing || !hasLines}
                    className={clsx(
                        'w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2',
                        hasLines && !processing
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    )}>
                    {processing && <Loader2 size={15} className="animate-spin" />}
                    {processing ? 'Création…' : 'Créer le ticket'}
                </button>
            </div>
        </div>
    );
}

function Section({ label, children }) {
    return (
        <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{label}</p>
            {children}
        </div>
    );
}

function Err({ children }) {
    return <p className="text-xs text-red-500 mt-0.5">{children}</p>;
}
