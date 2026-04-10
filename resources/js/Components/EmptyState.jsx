/**
 * EmptyState — état vide partagé (icône + titre + sous-titre + CTA optionnel)
 *
 * Props :
 *  icon        {Component}   Icône Lucide (défaut : aucune)
 *  title       {string}      Titre principal
 *  description {string}      Sous-titre / aide contextuelle
 *  action      {ReactNode}   Bouton / lien CTA (optionnel)
 *  className   {string}      Classes supplémentaires sur le wrapper
 *  compact     {boolean}     Version réduite (padding réduit, icône plus petite)
 */
export default function EmptyState({ icon: Icon, title, description, action, className = '', compact = false }) {
    return (
        <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8 px-4' : 'py-16 px-6'} ${className}`}>
            {Icon && (
                <div className={`rounded-2xl bg-gray-50 flex items-center justify-center mb-4 ${compact ? 'w-10 h-10' : 'w-14 h-14'}`}>
                    <Icon size={compact ? 18 : 26} className="text-gray-300" />
                </div>
            )}
            {title && (
                <p className={`font-semibold text-gray-500 ${compact ? 'text-sm' : 'text-base'}`}>{title}</p>
            )}
            {description && (
                <p className={`text-gray-400 mt-1 max-w-xs ${compact ? 'text-xs' : 'text-sm'}`}>{description}</p>
            )}
            {action && (
                <div className="mt-4">{action}</div>
            )}
        </div>
    );
}
