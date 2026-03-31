import { formatMAD } from '@/utils/format';
import clsx from 'clsx';

export default function PriceTag({ cents, className }) {
    if (cents == null) return <span className={clsx('text-gray-400', className)}>—</span>;
    return (
        <span className={clsx('font-semibold tabular-nums', className)}>
            {formatMAD(cents)}
        </span>
    );
}
