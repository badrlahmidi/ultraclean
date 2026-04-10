import { AlertTriangle, Info, Trash2 } from 'lucide-react';
import Modal from '@/Components/Modal';

const VARIANTS = {
    danger: {
        icon: Trash2,
        iconClass: 'text-red-500 bg-red-50',
        confirmClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
        confirmLabel: 'Supprimer',
    },
    warning: {
        icon: AlertTriangle,
        iconClass: 'text-amber-500 bg-amber-50',
        confirmClass: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-400',
        confirmLabel: 'Confirmer',
    },
    info: {
        icon: Info,
        iconClass: 'text-blue-500 bg-blue-50',
        confirmClass: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
        confirmLabel: 'Confirmer',
    },
};

/**
 * ConfirmDialog — remplace window.confirm() natif
 *
 * Props :
 *  open         {bool}      visibilité
 *  onConfirm    {fn}        callback quand l'utilisateur confirme
 *  onCancel     {fn}        callback quand l'utilisateur annule / ferme
 *  title        {string}    titre de la boîte (défaut : "Confirmation")
 *  message      {string}    corps du message
 *  confirmLabel {string}    surcharge le libellé du bouton de confirmation
 *  cancelLabel  {string}    libellé du bouton d'annulation (défaut : "Annuler")
 *  variant      {string}    "danger" | "warning" | "info"  (défaut : "danger")
 *  processing   {bool}      désactive le bouton pendant une action async
 */
export default function ConfirmDialog({
    open = false,
    onConfirm,
    onCancel,
    title = 'Confirmation',
    message,
    confirmLabel,
    cancelLabel = 'Annuler',
    variant = 'danger',
    processing = false,
}) {
    const cfg = VARIANTS[variant] ?? VARIANTS.danger;
    const Icon = cfg.icon;
    const label = confirmLabel ?? cfg.confirmLabel;

    return (
        <Modal show={open} onClose={onCancel} maxWidth="sm" closeable={!processing}>
            <div className="p-6">
                <div className="flex items-start gap-4">
                    <span className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full ${cfg.iconClass}`}>
                        <Icon size={20} />
                    </span>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
                        {message && (
                            <p className="mt-1 text-sm text-gray-500 break-words">{message}</p>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={processing}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 disabled:opacity-50 transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={processing}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors ${cfg.confirmClass}`}
                    >
                        {processing ? 'En cours…' : label}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
