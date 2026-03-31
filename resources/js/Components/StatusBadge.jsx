import clsx from 'clsx';

const STATUS_CONFIG = {
    pending: { label: 'En attente', bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-400' },
    in_progress: { label: 'En cours', bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500', pulse: true },
    completed: { label: 'Terminé', bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
    paid: { label: 'Payé', bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-600' },
    cancelled: { label: 'Annulé', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-400' },
};

export default function StatusBadge({ status, size = 'sm' }) {
    const cfg = STATUS_CONFIG[status] ?? { label: status, bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' };

    return (
        <span className={clsx(
            'inline-flex items-center gap-1.5 font-medium rounded-full',
            cfg.bg, cfg.text,
            size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
        )}>
            <span className={clsx('rounded-full', cfg.dot, cfg.pulse && 'animate-pulse',
                size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'
            )} />
            {cfg.label}
        </span>
    );
}
