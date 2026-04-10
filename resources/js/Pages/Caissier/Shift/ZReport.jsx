/**
 * ZReport.jsx
 * ─────────────────────────────────────────────────────────────────
 * Rapport Z de fin de shift — page imprimable.
 *
 * Accessible via GET /caisse/shift/{shift}/rapport
 * Rendu Inertia : Caissier/Shift/ZReport
 * ─────────────────────────────────────────────────────────────────
 */
import { Head, Link } from '@inertiajs/react';
import { formatMAD, formatDateTime, formatDate } from '@/utils/format';
import { ArrowLeft, Printer } from 'lucide-react';
import clsx from 'clsx';

/* ─── Ligne de tableau simple ─── */
function Row({ label, value, bold, highlight }) {
    return (
        <tr className={clsx(
            'border-b border-gray-100 last:border-0',
            highlight && 'bg-gray-50 font-semibold'
        )}>
            <td className={clsx('py-1.5 pr-4 text-sm text-gray-600', bold && 'font-semibold text-gray-800')}>{label}</td>
            <td className={clsx('py-1.5 text-right text-sm tabular-nums', bold && 'font-bold text-gray-900')}>{value}</td>
        </tr>
    );
}

/* ─── Section titre ─── */
function Section({ title, children }) {
    return (
        <div className="mt-5">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-1 mb-2">
                {title}
            </h3>
            {children}
        </div>
    );
}

/* ─── Durée formatée ─── */
function formatDuration(openedAt, closedAt) {
    if (!openedAt || !closedAt) return '—';
    const mins = Math.round((new Date(closedAt) - new Date(openedAt)) / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`;
}

/* ─── Badge écart caisse ─── */
function DiffBadge({ cents }) {
    if (!cents || cents === 0) return <span className="text-gray-500 text-sm">0,00 MAD ✓</span>;
    if (cents > 0) return <span className="text-blue-600 text-sm font-bold">+{formatMAD(cents)}</span>;
    return <span className="text-red-600 text-sm font-bold">{formatMAD(cents)}</span>;
}

const CATEGORY_LABELS = {
    carburant: 'Carburant',
    fournitures: 'Fournitures',
    entretien: 'Entretien',
    salaires: 'Salaires / avances',
    loyer: 'Loyer / charges',
    taxes: 'Taxes & impôts',
    repas: 'Repas',
    transport: 'Transport',
    autre: 'Autre',
};

export default function ZReport({ shift, breakdown, expenses, expenses_total, net_revenue }) {
    const bd = breakdown ?? {};
    const cash = bd.cash_cents ?? 0;
    const card = bd.card_cents ?? 0;
    const mobile = bd.mobile_cents ?? 0;
    const wire = bd.wire_cents ?? 0;
    const credit = bd.credit_deferred_cents ?? 0;
    const creditCount = bd.credit_count ?? 0;
    const pending = bd.pending_balance_cents ?? 0;
    const totalCollected = cash + card + mobile + wire;

    const diff = shift.difference_cents ?? 0;

    return (
        <>
            <Head title={`Rapport Z — Shift #${shift.id}`} />

            {/* ── Barre d'action (non imprimée) ── */}
            <div className="print:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-10">
                <Link
                    href={route('caissier.shift.history')}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
                >
                    <ArrowLeft size={15} /> Historique
                </Link>
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                    <Printer size={15} /> Imprimer le rapport Z
                </button>
            </div>

            {/* ── Rapport imprimable ── */}
            <div className="max-w-sm mx-auto px-4 py-6 font-mono text-xs print:max-w-none print:px-2 print:py-2">

                {/* En-tête */}
                <div className="text-center mb-4">
                    <p className="text-base font-bold uppercase tracking-widest">RAPPORT Z</p>
                    <p className="text-sm font-semibold mt-0.5">Shift #{shift.id}</p>
                    <p className="text-gray-500 text-xs mt-1">
                        Caissier : {shift.user?.name ?? '—'}
                    </p>
                    <div className="border-t border-dashed border-gray-400 my-3" />
                    <p className="text-xs text-gray-600">
                        Ouverture : {formatDateTime(shift.opened_at)}
                    </p>
                    {shift.closed_at && (
                        <p className="text-xs text-gray-600">
                            Clôture&nbsp;&nbsp;: {formatDateTime(shift.closed_at)}
                        </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                        Durée : {formatDuration(shift.opened_at, shift.closed_at)}
                    </p>
                </div>

                {/* ── Tickets ── */}
                <Section title="Activité tickets">
                    <table className="w-full">
                        <tbody>
                            <Row label="Total tickets" value={bd.ticket_count ?? 0} />
                            <Row label="Tickets payés" value={bd.paid_count ?? 0} />
                            {creditCount > 0 && <Row label="Crédits différés" value={`${creditCount}×`} />}
                            <Row label="CA tickets payés" value={formatMAD(bd.paid_revenue_cents ?? 0)} bold />
                        </tbody>
                    </table>
                </Section>

                {/* ── Encaissements ── */}
                <Section title="Ventilation encaissements">
                    <table className="w-full">
                        <tbody>
                            {cash > 0 && <Row label="Espèces" value={formatMAD(cash)} />}
                            {card > 0 && <Row label="Carte" value={formatMAD(card)} />}
                            {mobile > 0 && <Row label="Mobile" value={formatMAD(mobile)} />}
                            {wire > 0 && <Row label="Virement" value={formatMAD(wire)} />}
                            {credit > 0 && (
                                <Row
                                    label={`Crédit différé (${creditCount}×)`}
                                    value={`${formatMAD(credit)} *`}
                                />
                            )}
                            {pending > 0 && (
                                <Row label="Soldes restants" value={`${formatMAD(pending)} dû`} />
                            )}
                            <Row label="TOTAL ENCAISSÉ" value={formatMAD(totalCollected)} bold highlight />
                        </tbody>
                    </table>
                    {credit > 0 && (
                        <p className="text-[10px] text-gray-400 mt-1">* Non encaissé immédiatement</p>
                    )}
                </Section>

                {/* ── Dépenses ── */}
                {expenses.length > 0 && (
                    <Section title="Dépenses du shift">
                        <table className="w-full">
                            <tbody>
                                {expenses.map(e => (
                                    <Row
                                        key={e.id}
                                        label={`${CATEGORY_LABELS[e.category] ?? e.category} — ${e.label}`}
                                        value={formatMAD(e.amount_cents)}
                                    />
                                ))}
                                <Row label="TOTAL DÉPENSES" value={formatMAD(expenses_total)} bold highlight />
                            </tbody>
                        </table>
                    </Section>
                )}

                {/* ── CA net ── */}
                <Section title="CA net">
                    <table className="w-full">
                        <tbody>
                            <Row label="Total encaissé" value={formatMAD(totalCollected)} />
                            <Row label="Total dépenses" value={`- ${formatMAD(expenses_total)}`} />
                            <Row label="CA NET" value={formatMAD(net_revenue)} bold highlight />
                        </tbody>
                    </table>
                </Section>

                {/* ── Caisse physique ── */}
                <Section title="Contrôle caisse">
                    <table className="w-full">
                        <tbody>
                            <Row label="Fond initial" value={formatMAD(shift.opening_cash_cents ?? 0)} />
                            <Row label="Caisse attendue" value={formatMAD(shift.expected_cash_cents ?? 0)} />
                            <Row label="Caisse comptée" value={formatMAD(shift.closing_cash_cents ?? 0)} />
                            <tr className="border-t border-dashed border-gray-300">
                                <td className="py-1.5 pr-4 text-sm font-semibold text-gray-700">Écart</td>
                                <td className="py-1.5 text-right">
                                    <DiffBadge cents={diff} />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </Section>

                {/* Notes */}
                {shift.notes && (
                    <Section title="Notes">
                        <p className="text-xs text-gray-600 whitespace-pre-wrap">{shift.notes}</p>
                    </Section>
                )}

                {/* Pied de page */}
                <div className="border-t border-dashed border-gray-400 mt-6 pt-3 text-center text-[10px] text-gray-400">
                    <p>Imprimé le {formatDate(new Date(), 'long')}</p>
                    <p className="mt-0.5">UltraClean — Rapport Z automatique</p>
                </div>
            </div>

            {/* ── Print styles ── */}
            <style>{`
                @media print {
                    @page { size: 80mm auto; margin: 4mm 3mm; }
                    body * { visibility: hidden; }
                    .max-w-sm, .max-w-sm * { visibility: visible; }
                    .max-w-sm { position: absolute; left: 0; top: 0; width: 80mm; }
                }
            `}</style>
        </>
    );
}
