import AppLayout from '@/Layouts/AppLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useState, useRef } from 'react';
import {
    Store, Clock, Wallet, ClipboardList, FileText, CreditCard, Gift,
    Bell, Printer, Save, Check, ImagePlus, Trash2, ChevronRight,
} from 'lucide-react';

const TABS = [
    { id: 'centre', label: 'Centre', icon: Store },
    { id: 'horaires', label: 'Horaires', icon: Clock },
    { id: 'caisse', label: 'Caisse & Shifts', icon: Wallet },
    { id: 'tickets', label: 'Tickets', icon: ClipboardList },
    { id: 'facturation', label: 'Facturation', icon: FileText },
    { id: 'paiement', label: 'Paiement', icon: CreditCard },
    { id: 'fidelite', label: 'Fidélité', icon: Gift },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'impression', label: 'Impression', icon: Printer },
];

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export default function SettingsIndex({ settings }) {
    const [activeTab, setActiveTab] = useState('centre');

    const [form, setForm] = useState({        /* Centre */
        center_name: settings?.center_name ?? '',
        center_subtitle: settings?.center_subtitle ?? '',
        center_address: settings?.center_address ?? '',
        center_phone: settings?.center_phone ?? '',
        center_city: settings?.center_city ?? '',
        currency_symbol: settings?.currency_symbol ?? 'MAD',
        portal_show_team: !!settings?.portal_show_team,
        portal_show_price: settings?.portal_show_price !== undefined
            ? !!settings.portal_show_price : true,
        /* Horaires */
        business_open_hour: settings?.business_open_hour ?? '8',
        business_open_minute: settings?.business_open_minute ?? '0',
        business_close_hour: settings?.business_close_hour ?? '21',
        business_close_minute: settings?.business_close_minute ?? '0',
        business_days: Array.isArray(settings?.business_days)
            ? settings.business_days : [1, 2, 3, 4, 5, 6],
        /* Caisse & Shifts */
        'shift.require_opening_cash': settings?.['shift.require_opening_cash'] !== false,
        'shift.alert_difference_cents': settings?.['shift.alert_difference_cents'] ?? '5000',
        /* Tickets */
        ticket_prefix: settings?.ticket_prefix ?? 'TK',
        'ticket.pending_alert_minutes': settings?.['ticket.pending_alert_minutes'] ?? '20',
        'ticket.auto_assign': !!settings?.['ticket.auto_assign'],
        /* Facturation */
        tax_rate: settings?.tax_rate ?? '20',
        invoice_prefix: settings?.invoice_prefix ?? 'FA',
        invoice_footer: settings?.invoice_footer ?? '',
        invoice_due_days: settings?.invoice_due_days ?? '30',
        quote_validity_days: settings?.quote_validity_days ?? '30',
        /* Paiement */
        enabled_payment_methods: Array.isArray(settings?.enabled_payment_methods)
            ? settings.enabled_payment_methods
            : ['cash', 'card', 'mobile', 'wire', 'mixed', 'advance', 'credit'],
        auto_print_receipt: !!settings?.auto_print_receipt,
        /* Fidélité */
        'loyalty.enabled': !!settings?.['loyalty.enabled'],
        'loyalty.points_per_mad': settings?.['loyalty.points_per_mad'] ?? '1',
        'loyalty.silver_threshold': settings?.['loyalty.silver_threshold'] ?? '1000',
        'loyalty.gold_threshold': settings?.['loyalty.gold_threshold'] ?? '5000',
        'loyalty.silver_discount_percent': settings?.['loyalty.silver_discount_percent'] ?? '5',
        'loyalty.gold_discount_percent': settings?.['loyalty.gold_discount_percent'] ?? '10',
        /* Notifications */
        'notif.email_new_ticket': !!settings?.['notif.email_new_ticket'],
        'notif.email_daily_summary': !!settings?.['notif.email_daily_summary'],
        'notif.alert_email': settings?.['notif.alert_email'] ?? '',        /* Impression */
        receipt_footer: settings?.receipt_footer ?? '',
        receipt_paper_width: settings?.receipt_paper_width ?? '80mm',
        receipt_show_logo: settings?.receipt_show_logo !== false,
        receipt_show_qr: !!settings?.receipt_show_qr,
        receipt_template: settings?.receipt_template ?? 'minimal',
        receipt_show_client_phone: settings?.receipt_show_client_phone !== false,
        receipt_show_operator: settings?.receipt_show_operator !== false,
        receipt_show_payment_detail: settings?.receipt_show_payment_detail !== false,
        receipt_show_dates: settings?.receipt_show_dates !== false,
    });

    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(settings?.center_logo ?? '');
    const [removeLogoFlag, setRemoveLogoFlag] = useState(false);
    const logoInputRef = useRef(null);
    const [processing, setProcessing] = useState(false);
    const [saved, setSaved] = useState(false);
    const [errors, setErrors] = useState({});

    const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setSaved(false); };

    function handleLogoChange(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
        setSaved(false);
    }

    function handleRemoveLogo() {
        setLogoFile(null);
        setLogoPreview('');
        setRemoveLogoFlag(true);
        if (logoInputRef.current) logoInputRef.current.value = '';
        setSaved(false);
    }

    const submit = (e) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});
        router.post(route('admin.settings.update'), {
            ...form,
            logo: logoFile ?? undefined,
            remove_logo: removeLogoFlag ? '1' : undefined,
        }, {
            forceFormData: true,
            onSuccess: () => {
                setSaved(true);
                setLogoFile(null);
                setRemoveLogoFlag(false);
                setTimeout(() => setSaved(false), 3000);
            },
            onError: (errs) => setErrors(errs),
            onFinish: () => setProcessing(false),
        });
    };

    /* ── Primitives ───────────────────────────────────── */
    const SectionTitle = ({ children }) => (
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 mt-1">
            {children}
        </h3>
    );

    const Field = ({ label, name, type = 'text', placeholder, disabled, hint, min, max, step }) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
                type={type} value={form[name] ?? ''}
                onChange={e => set(name, e.target.value)}
                placeholder={placeholder} disabled={disabled}
                min={min} max={max} step={step}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none
                           focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
            {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
            {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]}</p>}
        </div>
    );

    const Toggle = ({ label, name, hint }) => (
        <div className="flex items-center justify-between gap-4 py-0.5">
            <div>
                <p className="text-sm font-medium text-gray-700">{label}</p>
                {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
            </div>
            <button type="button" onClick={() => set(name, !form[name])}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full
                            transition-colors ${form[name] ? 'bg-blue-600' : 'bg-gray-200'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                  ${form[name] ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
        </div>
    );

    /* ── Tab: Centre ──────────────────────────────────── */
    function TabCentre() {
        return (
            <div className="space-y-8">
                <div>
                    <SectionTitle>Informations du centre</SectionTitle>                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field name="center_name" label="Nom du centre" placeholder="Ultra Clean Lavage" />
                        <Field name="center_phone" label="Téléphone" placeholder="+212 6XX XXX XXX" type="tel" />
                        <Field name="center_address" label="Adresse" placeholder="Casablanca, Maroc" />
                        <Field name="center_city" label="Ville" placeholder="Casablanca" />
                        <div className="md:col-span-2">
                            <Field name="center_subtitle"
                                label="Slogan / Description"
                                placeholder="Centre de lavage automobile"
                                hint="Affiché sous le nom sur les reçus imprimés (optionnel)" />
                        </div>
                        <Field name="currency_symbol" label="Symbole devise" placeholder="MAD" />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fuseau horaire</label>
                            <input disabled value="Africa/Casablanca"
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400" />
                        </div>
                    </div>
                </div>

                <div>
                    <SectionTitle>Logo du centre</SectionTitle>
                    <div className="flex items-start gap-4 flex-wrap">
                        <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50
                                        flex items-center justify-center overflow-hidden flex-shrink-0">
                            {logoPreview
                                ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
                                : <span className="text-xs text-gray-400 text-center px-2">Aucun logo</span>
                            }
                        </div>
                        <div className="flex-1 space-y-2 min-w-[200px]">
                            <p className="text-xs text-gray-500">
                                Affiché dans la sidebar et sur la page de connexion.<br />
                                PNG, JPG, WebP — max 1 Mo.
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                                <label className="flex items-center gap-1.5 cursor-pointer px-3 py-2 rounded-lg
                                                  border border-gray-300 hover:border-blue-400 hover:bg-blue-50
                                                  text-sm text-gray-700 transition-colors">
                                    <ImagePlus size={14} />
                                    {logoPreview ? 'Changer' : 'Choisir un logo'}
                                    <input ref={logoInputRef} type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        className="hidden" onChange={handleLogoChange} />
                                </label>
                                {logoPreview && (
                                    <button type="button" onClick={handleRemoveLogo}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200
                                                   hover:bg-red-50 text-sm text-red-600 transition-colors">
                                        <Trash2 size={14} /> Supprimer
                                    </button>
                                )}
                            </div>
                            {logoFile && (
                                <p className="text-xs text-blue-600 font-medium">
                                    ✓ {logoFile.name} — sera enregistré
                                </p>
                            )}
                            {errors.logo && <p className="text-red-500 text-xs">{errors.logo}</p>}
                        </div>
                    </div>
                </div>

                <div>
                    <SectionTitle>Portail client</SectionTitle>
                    <div className="bg-gray-50 rounded-xl p-4 md:max-w-lg space-y-3 divide-y divide-gray-200">
                        <Toggle name="portal_show_team" label="Afficher l'équipe"
                            hint="Montrer les noms des laveurs sur le suivi client" />
                        <div className="pt-3">
                            <Toggle name="portal_show_price" label="Afficher les prix"
                                hint="Montrer les prix sur le suivi client" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Tab: Horaires ────────────────────────────────── */
    function TabHoraires() {
        const toggleDay = (day) => {
            const days = form.business_days;
            const next = days.includes(day)
                ? days.filter(d => d !== day)
                : [...days, day].sort((a, b) => a - b);
            set('business_days', next);
        };

        return (
            <div className="space-y-8">
                <div>
                    <SectionTitle>Heures d'ouverture</SectionTitle>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Ouverture</label>
                            <div className="flex items-center gap-2">
                                <input type="number" min="0" max="23" value={form.business_open_hour}
                                    onChange={e => set('business_open_hour', e.target.value)}
                                    className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm
                                               focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                <span className="text-gray-500 font-semibold">h</span>
                                <input type="number" min="0" max="59" step="15" value={form.business_open_minute}
                                    onChange={e => set('business_open_minute', e.target.value)}
                                    className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm
                                               focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                <span className="text-xs text-gray-400">min</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Fermeture</label>
                            <div className="flex items-center gap-2">
                                <input type="number" min="0" max="23" value={form.business_close_hour}
                                    onChange={e => set('business_close_hour', e.target.value)}
                                    className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm
                                               focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                <span className="text-gray-500 font-semibold">h</span>
                                <input type="number" min="0" max="59" step="15" value={form.business_close_minute}
                                    onChange={e => set('business_close_minute', e.target.value)}
                                    className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm
                                               focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                <span className="text-xs text-gray-400">min</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <SectionTitle>Jours ouvrés</SectionTitle>
                    <p className="text-xs text-gray-400 mb-4">
                        Cliquez sur un jour pour l'activer ou le désactiver. (0 = Dim … 6 = Sam)
                    </p>
                    <div className="flex gap-2 flex-wrap">
                        {DAYS_FR.map((label, idx) => {
                            const active = form.business_days.includes(idx);
                            return (
                                <button key={idx} type="button" onClick={() => toggleDay(idx)}
                                    className={`w-14 h-14 rounded-xl text-sm font-semibold transition-all border-2
                                        ${active
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'
                                        }`}>
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                    {errors.business_days && (
                        <p className="text-red-500 text-xs mt-2">{errors.business_days}</p>
                    )}
                </div>
            </div>
        );
    }

    /* ── Tab: Caisse & Shifts ─────────────────────────── */
    function TabCaisse() {
        return (
            <div className="space-y-8">
                <div>
                    <SectionTitle>Paramètres de caisse</SectionTitle>
                    <div className="space-y-4">
                        <div className="bg-gray-50 rounded-xl p-4 md:max-w-lg">
                            <Toggle name="shift.require_opening_cash"
                                label="Fond de caisse obligatoire à l'ouverture"
                                hint="Le caissier doit saisir le montant initial avant d'ouvrir la caisse" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field name="shift.alert_difference_cents"
                                label="Seuil alerte écart de caisse (centimes)"
                                type="number" min="0" placeholder="5000"
                                hint="5000 = 50,00 MAD — alerte si l'écart dépasse ce seuil" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Tab: Tickets ─────────────────────────────────── */
    function TabTickets() {
        return (
            <div className="space-y-8">
                <div>
                    <SectionTitle>Numérotation</SectionTitle>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field name="ticket_prefix" label="Préfixe des numéros de ticket"
                            placeholder="TK"
                            hint="Lettres majuscules et chiffres uniquement. Ex : TK → TK-20260328-001" />
                    </div>
                </div>
                <div>
                    <SectionTitle>Alertes & automatisation</SectionTitle>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field name="ticket.pending_alert_minutes"
                            label="Alerte ticket en attente (minutes)"
                            type="number" min="1" max="1440" placeholder="20"
                            hint="Délai avant qu'un ticket 'pending' déclenche une alerte visuelle" />
                        <div className="bg-gray-50 rounded-xl p-4">
                            <Toggle name="ticket.auto_assign"
                                label="Assignation automatique du laveur"
                                hint="Assigner automatiquement un laveur disponible à la création" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Tab: Facturation ─────────────────────────────── */
    function TabFacturation() {
        return (
            <div className="space-y-8">
                <div>
                    <SectionTitle>Taxes</SectionTitle>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field name="tax_rate" label="Taux de TVA (%)" placeholder="20"
                            type="number" min="0" max="100"
                            hint="Pourcentage appliqué aux factures. Ex : 20 pour 20 %" />
                    </div>
                </div>
                <div>
                    <SectionTitle>Factures</SectionTitle>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field name="invoice_prefix" label="Préfixe factures" placeholder="FA"
                            hint="Lettres majuscules. Ex : FA → FA-20260401-001" />
                        <Field name="invoice_due_days" label="Délai d'échéance (jours)"
                            type="number" min="0" max="365" placeholder="30"
                            hint="Nombre de jours avant échéance de la facture" />
                        <div className="md:col-span-2">
                            <Field name="invoice_footer" label="Pied de page facture"
                                placeholder="Merci pour votre confiance." />
                        </div>
                    </div>
                </div>
                <div>
                    <SectionTitle>Devis</SectionTitle>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field name="quote_validity_days" label="Durée de validité devis (jours)"
                            type="number" min="0" max="365" placeholder="30"
                            hint="Nombre de jours avant expiration d'un devis" />
                    </div>
                </div>
            </div>
        );
    }

    /* ── Tab: Paiement ────────────────────────────────── */
    function TabPaiement() {
        const METHODS = [
            { id: 'cash', label: 'Espèces', hint: 'Paiement en liquide' },
            { id: 'card', label: 'Carte bancaire', hint: 'TPE / visa / mastercard' },
            { id: 'mobile', label: 'Mobile', hint: 'CashPlus, Wafacash…' },
            { id: 'wire', label: 'Virement', hint: 'Virement bancaire' },
            { id: 'mixed', label: 'Mixte', hint: 'Combinaison de méthodes' },
            { id: 'advance', label: 'Avance', hint: 'Acompte partiel' },
            { id: 'credit', label: 'Crédit (différé)', hint: 'Paiement à date ultérieure' },
        ];

        return (
            <div className="space-y-8">
                <div>
                    <SectionTitle>Modes de paiement acceptés</SectionTitle>
                    <p className="text-xs text-gray-400 mb-4">
                        Cochez les modes disponibles dans la modal d'encaissement.
                        Au moins un mode doit être sélectionné.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {METHODS.map(m => {
                            const enabled = form.enabled_payment_methods.includes(m.id);
                            return (
                                <label key={m.id}
                                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer
                                                transition-all select-none
                                                ${enabled ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                    <input type="checkbox" checked={enabled}
                                        onChange={() => {
                                            const cur = form.enabled_payment_methods;
                                            const next = enabled
                                                ? cur.filter(x => x !== m.id)
                                                : [...cur, m.id];
                                            if (next.length > 0) set('enabled_payment_methods', next);
                                        }}
                                        className="mt-0.5 rounded accent-blue-600" />
                                    <div>
                                        <p className={`text-sm font-semibold ${enabled ? 'text-blue-700' : 'text-gray-700'}`}>
                                            {m.label}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">{m.hint}</p>
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                    {errors.enabled_payment_methods && (
                        <p className="text-red-500 text-xs mt-2">{errors.enabled_payment_methods}</p>
                    )}
                </div>                <div className="border-t pt-6">
                    <SectionTitle>Options d'impression</SectionTitle>
                    <div className="bg-gray-50 rounded-xl p-4 md:max-w-lg">
                        <p className="text-xs text-gray-400">Voir l'onglet <strong>Impression</strong> pour les options d'impression automatique et de format de reçu.</p>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Tab: Fidélité ────────────────────────────────── */
    function TabFidelite() {
        const loyaltyEnabled = form['loyalty.enabled'];
        return (
            <div className="space-y-8">
                <div className="bg-gray-50 rounded-xl p-4 md:max-w-lg">
                    <Toggle name="loyalty.enabled"
                        label="Activer le programme de fidélité"
                        hint="Permet aux clients de cumuler des points et d'obtenir des remises" />
                </div>

                {loyaltyEnabled ? (
                    <>
                        <div>
                            <SectionTitle>Accumulation de points</SectionTitle>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field name="loyalty.points_per_mad"
                                    label="Points par MAD dépensé"
                                    type="number" min="0" placeholder="1"
                                    hint="Nombre de points attribués pour chaque dirham dépensé" />
                            </div>
                        </div>
                        <div>
                            <SectionTitle>Paliers & remises</SectionTitle>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Niveau Silver 🥈</p>
                                    <Field name="loyalty.silver_threshold"
                                        label="Seuil (points)" type="number" min="0" placeholder="1000"
                                        hint="Points requis pour atteindre Silver" />
                                    <Field name="loyalty.silver_discount_percent"
                                        label="Remise (%)" type="number" min="0" max="100" placeholder="5" />
                                </div>
                                <div className="p-4 bg-yellow-50 rounded-xl space-y-3">
                                    <p className="text-xs font-bold text-yellow-600 uppercase tracking-wide">Niveau Gold 🥇</p>
                                    <Field name="loyalty.gold_threshold"
                                        label="Seuil (points)" type="number" min="0" placeholder="5000"
                                        hint="Points requis pour atteindre Gold" />
                                    <Field name="loyalty.gold_discount_percent"
                                        label="Remise (%)" type="number" min="0" max="100" placeholder="10" />
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="rounded-xl border-2 border-dashed border-gray-200 p-10 text-center">
                        <Gift size={28} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-sm text-gray-400">
                            Activez le programme ci-dessus pour configurer les paliers et remises.
                        </p>
                    </div>
                )}
            </div>
        );
    }

    /* ── Tab: Notifications ───────────────────────────── */
    function TabNotifications() {
        return (
            <div className="space-y-8">
                <div>
                    <SectionTitle>Alertes email</SectionTitle>
                    <div className="bg-gray-50 rounded-xl p-4 md:max-w-lg space-y-3 divide-y divide-gray-200">
                        <Toggle name="notif.email_new_ticket"
                            label="Email à chaque nouveau ticket"
                            hint="Envoie un email dès qu'un nouveau ticket est créé" />
                        <div className="pt-3">
                            <Toggle name="notif.email_daily_summary"
                                label="Résumé journalier"
                                hint="Envoie un récapitulatif quotidien de l'activité du centre" />
                        </div>
                    </div>
                </div>
                <div>
                    <SectionTitle>Destinataire</SectionTitle>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field name="notif.alert_email"
                            label="Email destinataire des alertes"
                            type="email" placeholder="admin@ultraclean.ma"
                            hint="Adresse email qui recevra toutes les notifications système" />
                    </div>
                </div>
            </div>
        );
    }    /* ── Tab: Impression ──────────────────────────────── */    function TabImpression() {
        const logoPreviewUrl = logoPreview || settings?.center_logo || null;
        const paperWidth = form.receipt_paper_width === '58mm' ? '200px' : '270px';
        const isDetailed = form.receipt_template === 'detailed';

        return (
            <div className="space-y-8">
                {/* ── Modèle de reçu ── */}
                <div>
                    <SectionTitle>Modèle de reçu</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:max-w-xl">
                        {[
                            {
                                id: 'minimal',
                                label: 'Minimal',
                                desc: 'Compact, rapide à imprimer. Sections simples séparées par des tirets.',
                            },
                            {
                                id: 'detailed',
                                label: 'Détaillé',
                                desc: 'En-têtes de section, tél. client, opérateur, Reçu/Dû. Correspond au modèle UltraClean.',
                            },
                        ].map(t => (
                            <label key={t.id}
                                className={`flex flex-col gap-1.5 p-4 rounded-xl border-2 cursor-pointer transition-all
                                    ${form.receipt_template === t.id
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                                <input type="radio" name="receipt_template" value={t.id}
                                    checked={form.receipt_template === t.id}
                                    onChange={() => set('receipt_template', t.id)}
                                    className="sr-only" />
                                <span className={`text-sm font-bold ${form.receipt_template === t.id ? 'text-blue-700' : 'text-gray-700'}`}>
                                    {t.label}
                                </span>
                                <span className="text-xs text-gray-500">{t.desc}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* ── Format papier ── */}
                <div>
                    <SectionTitle>Format papier</SectionTitle>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Largeur papier reçu</label>
                            <div className="flex gap-3">
                                {['58mm', '80mm'].map(w => (
                                    <label key={w}
                                        className={`flex-1 flex items-center justify-center p-3 rounded-xl border-2
                                                    cursor-pointer transition-all text-sm font-semibold
                                                    ${form.receipt_paper_width === w
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                                        <input type="radio" name="receipt_paper_width" value={w}
                                            checked={form.receipt_paper_width === w}
                                            onChange={() => set('receipt_paper_width', w)}
                                            className="sr-only" />
                                        {w}
                                    </label>
                                ))}
                            </div>
                            <p className="text-xs text-gray-400 mt-1.5">58 mm = petit ticket · 80 mm = standard</p>
                        </div>
                    </div>
                </div>

                {/* ── Contenu + Prévisualisation côte à côte ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {/* Options */}
                    <div className="space-y-6">
                        <div>
                            <SectionTitle>Contenu du reçu</SectionTitle>
                            <div className="bg-gray-50 rounded-xl p-4 space-y-3 divide-y divide-gray-200">
                                <Toggle name="receipt_show_logo"
                                    label="Afficher le logo"
                                    hint="Imprime le logo du centre en haut du ticket" />
                                <div className="pt-3">
                                    <Toggle name="receipt_show_qr"
                                        label="Afficher le QR code de suivi"
                                        hint="Permet au client de suivre son ticket en scannant" />
                                </div>
                                <div className="pt-3">
                                    <Toggle name="receipt_show_client_phone"
                                        label="Afficher le téléphone client"
                                        hint="Imprime le numéro de téléphone du client" />
                                </div>
                                <div className="pt-3">
                                    <Toggle name="receipt_show_operator"
                                        label="Afficher l'opérateur (laveur)"
                                        hint="Imprime le nom du laveur assigné" />
                                </div>
                                <div className="pt-3">
                                    <Toggle name="receipt_show_payment_detail"
                                        label="Détailler Reçu / Dû"
                                        hint="Affiche les montants Reçu et Dû si paiement encaissé ou partiel (sinon : En attente)" />
                                </div>
                                <div className="pt-3">
                                    <Toggle name="receipt_show_dates"
                                        label="Afficher Déposé / Livraison estimée"
                                        hint="Imprime les dates de dépôt et de livraison prévue" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <SectionTitle>Message de fin de reçu</SectionTitle>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Texte pied de reçu</label>
                                <textarea
                                    rows={3}
                                    value={form.receipt_footer}
                                    onChange={e => set('receipt_footer', e.target.value)}
                                    placeholder="Merci de votre visite !"
                                    maxLength={300}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                                               focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    {form.receipt_footer.length}/300 caractères · Affiché en bas de chaque reçu imprimé
                                </p>
                                {errors.receipt_footer && <p className="text-red-500 text-xs mt-1">{errors.receipt_footer}</p>}
                            </div>
                        </div>

                        <div>
                            <SectionTitle>Impression automatique</SectionTitle>
                            <div className="bg-gray-50 rounded-xl p-4">
                                <Toggle name="auto_print_receipt"
                                    label="Imprimer automatiquement à la validation"
                                    hint="Déclenche l'impression dès qu'un ticket passe au statut Payé" />
                            </div>
                        </div>
                    </div>

                    {/* Live preview */}
                    <div>
                        <SectionTitle>Aperçu en temps réel</SectionTitle>
                        <div className="flex justify-center">
                            <div style={{
                                width: paperWidth,
                                fontFamily: 'monospace',
                                fontSize: '11px',
                                color: '#000',
                                background: '#fff',
                                border: '1px dashed #ccc',
                                borderRadius: '6px',
                                padding: '10px 8px',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
                                transition: 'width .2s ease',
                            }}>
                                {/* ── Header centre ── */}
                                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                                    {form.receipt_show_logo && logoPreviewUrl && (
                                        <img src={logoPreviewUrl} alt="Logo"
                                            style={{ height: '36px', objectFit: 'contain', margin: '0 auto 4px', display: 'block' }} />
                                    )}
                                    <div style={{ fontSize: '15px', fontWeight: 'bold' }}>
                                        {form.center_name || 'Nom du centre'}
                                    </div>
                                    {form.center_subtitle && (
                                        <div style={{ fontSize: '9px', color: '#555' }}>{form.center_subtitle}</div>
                                    )}
                                    {(form.center_address || form.center_city) && (
                                        <div style={{ fontSize: '9px', color: '#666' }}>
                                            {form.center_address}{form.center_address && form.center_city ? ' – ' : ''}{form.center_city}
                                        </div>
                                    )}
                                    {form.center_phone && (
                                        <div style={{ fontSize: '9px', color: '#666' }}>Tél : {form.center_phone}</div>
                                    )}
                                </div>

                                <div style={{ borderTop: '1px dashed #999', margin: '5px 0' }} />

                                {/* ── Ticket number ── */}
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '10px', fontWeight: 'bold' }}>TICKET N° : TK-000001</div>
                                    <div style={{ fontSize: '9px', color: '#777' }}>08/04/2026 à 09:30</div>
                                </div>

                                {/* ── Client section ── */}
                                {isDetailed ? (
                                    <>
                                        <div style={{ borderTop: '1px dashed #999', margin: '5px 0', textAlign: 'center' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '9px' }}>--- Informations client : ---</span>
                                        </div>
                                        <div style={{ fontSize: '9px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Client : Mohammed A.</span>
                                                {form.receipt_show_client_phone && <span>Tél: 06XXXXXXXX</span>}
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Véhicule : Dacia Logan</span>
                                                <span>Plaque : AB-123-CD</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ borderTop: '1px dashed #999', margin: '5px 0' }} />
                                        <div style={{ fontSize: '9px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: '#555' }}>Plaque</span><strong>AB-123-CD</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: '#555' }}>Client</span><span>Mohammed A.</span>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* ── Services section ── */}
                                {isDetailed ? (
                                    <>
                                        <div style={{ borderTop: '1px dashed #999', margin: '5px 0', textAlign: 'center' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '9px' }}>--- Détails préstations : ---</span>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ borderTop: '1px dashed #999', margin: '5px 0' }} />
                                )}
                                <div style={{ fontSize: '9px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555', marginBottom: '2px' }}>
                                        <span>Service</span><span>Qté</span><span>Total</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                                        <span>Lavage extérieur</span><span>1</span><span>80.00 MAD</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Aspirateur</span><span>1</span><span>30.00 MAD</span>
                                    </div>
                                </div>

                                {/* ── Total ── */}
                                <div style={{ borderTop: '1px dashed #999', margin: '5px 0' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px' }}>
                                    <span>TOTAL :</span><span>110.00 MAD</span>
                                </div>

                                {/* ── Payment section ── */}
                                {isDetailed ? (
                                    <>
                                        <div style={{ borderTop: '1px dashed #999', margin: '5px 0', textAlign: 'center' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '9px' }}>--- Paiement : Espèces ---</span>
                                        </div>
                                        {form.receipt_show_payment_detail && (
                                            <div style={{ fontSize: '9px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>Reçu</span><span>110.00 MAD</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>Dû :</span><span>0.00 MAD</span>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div style={{ fontSize: '9px', display: 'flex', justifyContent: 'space-between', marginTop: '2px', color: '#555' }}>
                                        <span>Mode</span><span>Espèces</span>
                                    </div>
                                )}

                                {/* ── Operator + dates (detailed only) ── */}
                                {isDetailed && (form.receipt_show_operator || form.receipt_show_dates) && (
                                    <>
                                        <div style={{ borderTop: '1px dashed #999', margin: '5px 0' }} />
                                        <div style={{ fontSize: '9px' }}>
                                            {form.receipt_show_operator && (
                                                <div style={{ textAlign: 'center', fontWeight: 'bold' }}>Opérateur : Laveur X</div>
                                            )}
                                            {form.receipt_show_dates && (
                                                <>
                                                    <div style={{ textAlign: 'center' }}>Déposé : 08/04/2026 à 09:30</div>
                                                    <div style={{ textAlign: 'center' }}>Livraison estimé : 08/04/2026 à 11:30</div>
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}

                                {/* ── QR ── */}
                                {form.receipt_show_qr && (
                                    <>
                                        <div style={{ borderTop: '1px dashed #999', margin: '6px 0 4px' }} />
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{
                                                width: '52px', height: '52px', margin: '0 auto',
                                                background: '#f0f0f0',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '8px', color: '#999', border: '1px solid #ddd',
                                            }}>QR</div>
                                            <div style={{ fontSize: '8px', color: '#777', marginTop: '2px' }}>
                                                Scannez pour suivre votre véhicule
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* ── Footer ── */}
                                <div style={{ borderTop: '1px dashed #999', margin: '6px 0 3px' }} />
                                <div style={{ textAlign: 'center', fontSize: '9px', color: '#777' }}>
                                    <div>{form.receipt_footer || 'Merci de votre confiance !'}</div>
                                    <div style={{ color: '#aaa', marginTop: '1px' }}>
                                        {form.center_name || 'Centre'} – À bientôt 🚗
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 text-center mt-3">
                            L'aperçu se met à jour en temps réel
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Router ───────────────────────────────────────── */
    function renderTab() {
        switch (activeTab) {
            case 'centre': return <TabCentre />;
            case 'horaires': return <TabHoraires />;
            case 'caisse': return <TabCaisse />;
            case 'tickets': return <TabTickets />;
            case 'facturation': return <TabFacturation />;
            case 'paiement': return <TabPaiement />;
            case 'fidelite': return <TabFidelite />;
            case 'notifications': return <TabNotifications />;
            case 'impression': return <TabImpression />;
            default: return null;
        }
    }

    /* ── Render ───────────────────────────────────────── */
    return (
        <AppLayout title="Paramètres">
            <Head title="Paramètres" />

            <form onSubmit={submit} encType="multipart/form-data">

                {/* Sticky header */}
                <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200
                                px-4 sm:px-6 py-3 flex items-center justify-between -mx-4 sm:-mx-6 mb-6">
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">Paramètres</h1>
                        <p className="text-xs text-gray-500 hidden sm:block">
                            Configuration générale de RitajPOS Lavage
                        </p>
                    </div>
                    <button type="submit" disabled={processing}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700
                                   disabled:opacity-50 text-white rounded-xl text-sm font-semibold
                                   transition-colors shadow-sm">
                        {saved
                            ? <><Check size={15} /> Enregistré</>
                            : <><Save size={15} /> {processing ? 'Enregistrement…' : 'Enregistrer'}</>
                        }
                    </button>
                </div>

                {/* Main layout */}
                <div className="flex flex-col md:flex-row gap-6 items-start">

                    {/* Sidebar nav */}
                    <nav className="w-full md:w-52 lg:w-56 flex-shrink-0">
                        <div className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
                            {TABS.map(tab => {
                                const Icon = tab.icon;
                                const active = activeTab === tab.id;
                                return (
                                    <button key={tab.id} type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm
                                                    font-medium transition-all whitespace-nowrap flex-shrink-0
                                                    ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
                                        <Icon size={16} className={active ? 'text-white' : 'text-gray-400'} />
                                        <span>{tab.label}</span>
                                        {active && (
                                            <ChevronRight size={14}
                                                className="ml-auto hidden md:block opacity-70" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </nav>

                    {/* Content panel */}
                    <div className="flex-1 min-w-0">
                        <div className="bg-white rounded-2xl border border-gray-200 p-6">
                            {renderTab()}
                        </div>
                    </div>

                </div>
            </form>
        </AppLayout>
    );
}
