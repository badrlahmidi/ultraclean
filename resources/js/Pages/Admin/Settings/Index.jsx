import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { Store, Globe, FileText, Save, Check } from 'lucide-react';

export default function SettingsIndex({ settings }) {
    const [form, setForm] = useState({
        center_name: settings?.center_name ?? '',
        center_address: settings?.center_address ?? '',
        center_phone: settings?.center_phone ?? '',
        receipt_footer: settings?.receipt_footer ?? '',
        currency_symbol: settings?.currency_symbol ?? 'MAD',
        ticket_prefix: settings?.ticket_prefix ?? 'TK',
    });
    const [processing, setProcessing] = useState(false);
    const [saved, setSaved] = useState(false);
    const [errors, setErrors] = useState({});

    const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setSaved(false); };

    const submit = (e) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});
        router.post(route('admin.settings.update'), form, {
            onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 3000); },
            onError: (errs) => setErrors(errs),
            onFinish: () => setProcessing(false),
        });
    };

    const Field = ({ label, name, type = 'text', placeholder, disabled, hint }) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
                type={type}
                value={form[name] ?? ''}
                onChange={e => set(name, e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
            {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
            {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]}</p>}
        </div>
    );

    return (
        <AppLayout title="Parametres">
            <Head title="Parametres" />

            <form onSubmit={submit} className="max-w-2xl space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Parametres</h1>
                        <p className="text-sm text-gray-500 mt-1">Configuration generale de RitajPOS Lavage.</p>
                    </div>
                    <button type="submit" disabled={processing}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
                        {saved
                            ? <><Check size={15} /> Enregistre</>
                            : <><Save size={15} /> {processing ? 'Enregistrement...' : 'Enregistrer'}</>
                        }
                    </button>
                </div>

                {/* Centre */}
                <div className="bg-white rounded-2xl border p-6 space-y-4">
                    <h2 className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wider">
                        <Store size={15} className="text-gray-400" /> Informations du centre
                    </h2>
                    <Field name="center_name" label="Nom du centre" placeholder="Ultra Clean Lavage" />
                    <Field name="center_phone" label="Telephone" placeholder="+212 6XX XXX XXX" type="tel" />
                    <Field name="center_address" label="Adresse" placeholder="Casablanca, Maroc" />
                </div>

                {/* Tickets & caisse */}
                <div className="bg-white rounded-2xl border p-6 space-y-4">
                    <h2 className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wider">
                        <FileText size={15} className="text-gray-400" /> Tickets & caisse
                    </h2>
                    <Field
                        name="ticket_prefix"
                        label="Prefixe des numeros de ticket"
                        placeholder="TK"
                        hint="Lettres majuscules et chiffres uniquement. Ex: TK -> TK-20260328-001"
                    />
                    <Field
                        name="receipt_footer"
                        label="Message pied de recu"
                        placeholder="Merci de votre visite !"
                    />
                </div>

                {/* Localisation */}
                <div className="bg-white rounded-2xl border p-6 space-y-4">
                    <h2 className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wider">
                        <Globe size={15} className="text-gray-400" /> Localisation
                    </h2>
                    <Field name="currency_symbol" label="Symbole devise" placeholder="MAD" />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fuseau horaire</label>
                        <input disabled value="Africa/Casablanca"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Langue</label>
                        <input disabled value="Francais (fr)"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400" />
                    </div>
                </div>
            </form>
        </AppLayout>
    );
}
