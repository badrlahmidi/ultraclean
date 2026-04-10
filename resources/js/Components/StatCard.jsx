/**
 * StatCard — Carte de statistique partagée
 *
 * Props :
 *   label    {string}          Libellé de la statistique
 *   value    {string|number}   Valeur affichée
 *   icon     {Component}       Icône Lucide
 *   color    {string}          variant="icon"   → classe bg Tailwind (ex: "bg-blue-500")
 *                              variant="tinted" → nom court (ex: "blue"|"green"|"red"|"amber"|"slate"|"yellow")
 *   sub      {string}          Texte secondaire optionnel
 *   size     {"sm"|"md"}       Taille (md par défaut)
 *   variant  {"icon"|"tinted"} Style de carte (icon par défaut)
 */

const TINTED = {
    blue: 'bg-blue-50   text-blue-700   border-blue-200',
    green: 'bg-green-50  text-green-700  border-green-200',
    red: 'bg-red-50    text-red-700    border-red-200',
    amber: 'bg-amber-50  text-amber-700  border-amber-200',
    slate: 'bg-slate-50  text-slate-700  border-slate-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
};

export default function StatCard({ label, value, icon: Icon, color, sub, size = 'md', variant = 'icon' }) {
    const isSm = size === 'sm';

    if (variant === 'tinted') {
        return (
            <div className={`rounded-2xl border p-5 ${TINTED[color] ?? TINTED.slate}`}>
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider opacity-60">{label}</p>
                        <p className="text-2xl font-bold mt-1">{value ?? '—'}</p>
                        {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
                    </div>
                    {Icon && <Icon size={22} className="opacity-40 mt-1" />}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-4">
            <div className={`flex-shrink-0 rounded-xl flex items-center justify-center ${color} ${isSm ? 'w-10 h-10' : 'w-11 h-11'}`}>
                <Icon size={isSm ? 18 : 20} className="text-white" />
            </div>
            <div className="min-w-0">
                <p className="text-sm text-gray-500 font-medium truncate">{label}</p>
                <p className={`font-bold text-gray-800 mt-0.5 tabular-nums ${isSm ? 'text-xl' : 'text-2xl'}`}>{value ?? '—'}</p>
                {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}
