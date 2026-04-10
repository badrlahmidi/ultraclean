import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Users, ChevronLeft, Save } from 'lucide-react';
import clsx from 'clsx';

const inputCls = 'w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none';
const labelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1';

export default function ClientsCreate() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        phone: '',
        email: '',
        vehicle_plate: '',
        is_company: false,
        ice: '',
        notes: '',
        is_active: true,
    });

    function submit(e) {
        e.preventDefault();
        // Use caissier store route which already exists and handles creation
        router.post(route('caissier.clients.store'), data, {
            onSuccess: () => window.location.href = route('admin.clients.index'),
        });
    }

    return (
        <AppLayout title="Ajouter un client">
            <Head title="Ajouter un client" />
            <div className="max-w-2xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link href={route('admin.clients.index')}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition">
                        <ChevronLeft size={18} />
                    </Link>
                    <Users size={20} className="text-blue-600" />
                    <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">Ajouter un client</h1>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
                        <h2 className="font-semibold text-gray-800 dark:text-gray-100">Informations client</h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label className={labelCls}>Nom complet *</label>
                                <input className={clsx(inputCls, errors.name && 'border-red-500')}
                                    value={data.name} onChange={e => setData('name', e.target.value)}
                                    placeholder="Prénom Nom ou Raison sociale" />
                                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                            </div>
                            <div>
                                <label className={labelCls}>Téléphone *</label>
                                <input className={clsx(inputCls, errors.phone && 'border-red-500')}
                                    value={data.phone} onChange={e => setData('phone', e.target.value)}
                                    placeholder="0600000000" />
                                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                            </div>
                            <div>
                                <label className={labelCls}>Email</label>
                                <input type="email" className={inputCls} value={data.email}
                                    onChange={e => setData('email', e.target.value)}
                                    placeholder="client@email.com" />
                            </div>
                            <div>
                                <label className={labelCls}>Immatriculation véhicule</label>
                                <input className={inputCls} value={data.vehicle_plate}
                                    onChange={e => setData('vehicle_plate', e.target.value.toUpperCase())}
                                    placeholder="A-12345-B" />
                            </div>
                            <div className="flex items-center gap-3 pt-1">
                                <input type="checkbox" id="is_company" checked={data.is_company}
                                    onChange={e => setData('is_company', e.target.checked)}
                                    className="rounded border-gray-300" />
                                <label htmlFor="is_company" className="text-sm text-gray-700 dark:text-gray-300">Entreprise / Société</label>
                            </div>
                            {data.is_company && (
                                <div>
                                    <label className={labelCls}>ICE</label>
                                    <input className={inputCls} value={data.ice}
                                        onChange={e => setData('ice', e.target.value)}
                                        placeholder="Identifiant commun entreprise" />
                                </div>
                            )}
                            <div className="sm:col-span-2">
                                <label className={labelCls}>Notes</label>
                                <textarea className={inputCls} rows={3} value={data.notes}
                                    onChange={e => setData('notes', e.target.value)}
                                    placeholder="Préférences, remarques…" />
                            </div>
                            <div className="flex items-center gap-3">
                                <input type="checkbox" id="is_active" checked={data.is_active}
                                    onChange={e => setData('is_active', e.target.checked)}
                                    className="rounded border-gray-300" />
                                <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">Client actif</label>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Link href={route('admin.clients.index')}
                            className="px-5 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition">
                            Annuler
                        </Link>
                        <button type="submit" disabled={processing}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">
                            <Save size={15} />
                            {processing ? 'Enregistrement…' : 'Ajouter le client'}
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
