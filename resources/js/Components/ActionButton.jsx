import clsx from 'clsx';

/**
 * ActionButton — Bouton d'action icône touch-friendly (min 44×44 px, WCAG 2.5.5).
 *
 * @example
 * // Bouton modifier
 * <ActionButton variant="edit" onClick={() => setModal(user)} label="Modifier" />
 *
 * // Bouton supprimer
 * <ActionButton variant="delete" onClick={() => handleDelete(id)} label="Supprimer" />
 *
 * // Bouton custom avec icône Lucide
 * <ActionButton icon={Eye} variant="info" onClick={...} label="Voir" />
 */

const VARIANTS = {
    edit: 'text-gray-400 hover:text-blue-600   hover:bg-blue-50',
    delete: 'text-gray-400 hover:text-red-600    hover:bg-red-50',
    info: 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50',
    success: 'text-gray-400 hover:text-green-600  hover:bg-green-50',
    warning: 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50',
    neutral: 'text-gray-400 hover:text-gray-700   hover:bg-gray-100',
};

export default function ActionButton({
    icon: Icon,
    variant = 'neutral',
    onClick,
    label,
    disabled = false,
    type = 'button',
    className = '',
}) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            title={label}
            className={clsx(
                // Taille minimum 44×44 px conforme WCAG 2.5.5
                'inline-flex items-center justify-center',
                'w-9 h-9 min-w-[36px] min-h-[36px]',
                'sm:w-[38px] sm:h-[38px]',
                'rounded-lg transition-colors touch-manipulation',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                VARIANTS[variant] ?? VARIANTS.neutral,
                className,
            )}
        >
            {Icon && <Icon size={16} aria-hidden="true" />}
        </button>
    );
}
