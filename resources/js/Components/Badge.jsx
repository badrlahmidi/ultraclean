import clsx from 'clsx';

/**
 * Palette de couleurs nommées → { bg, text, dot }
 * Couvre tous les cas rencontrés dans l'app.
 */
const PALETTE = {
    gray: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
    slate: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-800', dot: 'bg-indigo-500' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
    violet: { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
    green: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-400' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-400' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-400' },
    red: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-400' },
    pink: { bg: 'bg-pink-100', text: 'text-pink-700', dot: 'bg-pink-400' },
};

/**
 * Badge — composant générique partagé
 *
 * Props :
 *  color      {string}           Couleur nommée : "gray"|"blue"|"green"|"red"|"yellow"|
 *                                "amber"|"orange"|"purple"|"violet"|"indigo"|"emerald"|
 *                                "slate"|"pink"  (défaut : "gray")
 *  size       {"sm"|"md"}        Taille (défaut : "sm")
 *  dot        {boolean}          Affiche un point coloré à gauche
 *  dotPulse   {boolean}          Anime le point (animate-pulse) — ex. "En cours"
 *  icon       {Component}        Icône Lucide (rendue avant le texte)
 *  className  {string}           Classes supplémentaires
 *  children   {ReactNode}        Contenu du badge
 *
 * Exemple :
 *   <Badge color="green" dot>Actif</Badge>
 *   <Badge color="red" icon={Trash2} size="md">Supprimé</Badge>
 *   <Badge color="blue">En cours</Badge>
 */
export default function Badge({
    children,
    color = 'gray',
    size = 'sm',
    dot = false,
    dotPulse = false,
    icon: Icon,
    className = '',
}) {
    const p = PALETTE[color] ?? PALETTE.gray;

    return (
        <span className={clsx(
            'inline-flex items-center gap-1.5 font-medium rounded-full whitespace-nowrap',
            p.bg, p.text,
            size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
            className,
        )}>
            {dot && (
                <span className={clsx(
                    'flex-shrink-0 rounded-full',
                    p.dot,
                    dotPulse && 'animate-pulse',
                    size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
                )} />
            )}
            {Icon && <Icon size={size === 'sm' ? 12 : 14} className="flex-shrink-0" />}
            {children}
        </span>
    );
}
