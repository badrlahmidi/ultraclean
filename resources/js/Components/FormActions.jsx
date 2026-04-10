
import { Loader2 } from 'lucide-react';

/**
 * FormActions — paire de boutons Annuler / Submit partagée dans tous les modals/formulaires.
 *
 * Props :
 *  onCancel      {Function}   Handler du bouton Annuler (si absent, le bouton est masqué)
 *  cancelLabel   {string}     Libellé annulation (défaut : "Annuler")
 *  submitLabel   {string}     Libellé soumission (défaut : "Enregistrer")
 *  processingLabel {string}   Libellé pendant traitement (défaut : "Enregistrement…")
 *  processing    {boolean}    État chargement — désactive + spinner
 *  disabled      {boolean}    Désactive le bouton submit (ex. champ requis vide)
 *  variant       {"blue"|"purple"|"indigo"|"green"|"red"}  Couleur du bouton submit (défaut : "blue")
 *  align         {"end"|"stretch"}  Alignement (défaut : "stretch" = flex-1)
 *  className     {string}     Classes supplémentaires sur le wrapper
 */
export default function FormActions({
    onCancel,
    cancelLabel = 'Annuler',
    submitLabel = 'Enregistrer',
    processingLabel = 'Enregistrement…',
    processing = false,
    disabled = false,
    variant = 'blue',
    align = 'stretch',
    className = '',
}) {
    const VARIANT = {
        blue: 'bg-blue-600   hover:bg-blue-700   focus-visible:ring-blue-500',
        purple: 'bg-purple-600 hover:bg-purple-700 focus-visible:ring-purple-500',
        indigo: 'bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-500',
        green: 'bg-green-600  hover:bg-green-700  focus-visible:ring-green-500',
        red: 'bg-red-600    hover:bg-red-700    focus-visible:ring-red-500',
    };

    const submitCls = `${VARIANT[variant] ?? VARIANT.blue} text-white rounded-xl text-sm font-semibold
        disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-offset-1 flex items-center justify-center gap-2`;

    const cancelCls = `border border-gray-300 rounded-xl text-sm font-medium text-gray-700
        hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-gray-400 focus-visible:ring-offset-1`;

    const sizeCls = align === 'stretch' ? 'flex-1 py-2.5' : 'px-5 py-2.5';

    return (
        <div className={`flex gap-3 pt-3 ${className}`}>
            {onCancel && (
                <button
                    type="button"
                    onClick={onCancel}
                    className={`${cancelCls} ${sizeCls}`}
                >
                    {cancelLabel}
                </button>
            )}
            <button
                type="submit"
                disabled={processing || disabled}
                className={`${submitCls} ${sizeCls}`}
            >
                {processing && <Loader2 size={14} className="animate-spin flex-shrink-0" />}
                {processing ? processingLabel : submitLabel}
            </button>
        </div>
    );
}
