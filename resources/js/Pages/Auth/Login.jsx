import { Head, useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import { Eye, EyeOff, Delete, LogIn, Lock } from 'lucide-react';
import InputError from '@/Components/InputError';
import clsx from 'clsx';

// ── Helpers ─────────────────────────────────────────────────────────────────
function formatMAD(cents) {
    return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(cents / 100);
}

// ── PIN Pad ──────────────────────────────────────────────────────────────────
function PinPad({ pin, onKey, onDelete, onSubmit, processing, error }) {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Affichage du PIN */}
            <div className="flex gap-3 my-2">
                {[0, 1, 2, 3].map(i => (
                    <div key={i} className={clsx(
                        'w-4 h-4 rounded-full border-2 transition-all',
                        pin.length > i
                            ? 'bg-blue-600 border-blue-600'
                            : 'bg-transparent border-gray-400'
                    )} />
                ))}
            </div>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            {/* Grille 3×4 */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-[220px]">
                {keys.map((k, i) => {
                    if (k === '') return <div key={i} />;
                    if (k === '⌫') return (
                        <button key={i} type="button" onClick={onDelete}
                            className="flex items-center justify-center h-14 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-gray-700 font-semibold text-lg">
                            <Delete size={20} />
                        </button>
                    );
                    return (
                        <button key={i} type="button" onClick={() => onKey(k)}
                            disabled={pin.length >= 4}
                            className="flex items-center justify-center h-14 rounded-xl bg-gray-100 hover:bg-blue-50 hover:text-blue-700 active:scale-95 transition-all font-bold text-xl text-gray-800 disabled:opacity-40">
                            {k}
                        </button>
                    );
                })}
            </div>

            <button
                type="button"
                onClick={onSubmit}
                disabled={pin.length !== 4 || processing}
                className="w-full max-w-[220px] mt-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-40 flex items-center justify-center gap-2 transition-all">
                <LogIn size={18} />
                {processing ? 'Connexion…' : 'Valider le PIN'}
            </button>
        </div>
    );
}

// ── User Selector ────────────────────────────────────────────────────────────
const ROLE_LABELS = { admin: 'Admin', caissier: 'Caissier', laveur: 'Laveur' };
const ROLE_COLORS = {
    admin: 'bg-purple-100 text-purple-700 border-purple-300',
    caissier: 'bg-blue-100   text-blue-700   border-blue-300',
    laveur: 'bg-green-100  text-green-700  border-green-300',
};

function UserCard({ user, selected, onSelect }) {
    return (
        <button
            type="button"
            onClick={() => onSelect(user)}
            className={clsx(
                'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all w-full',
                selected
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
            )}>
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-600">
                {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-800 text-center leading-tight">{user.name}</span>
            <span className={clsx('text-xs px-2 py-0.5 rounded-full border font-medium', ROLE_COLORS[user.role])}>
                {ROLE_LABELS[user.role]}
            </span>
        </button>
    );
}

// ── Main Login Page ──────────────────────────────────────────────────────────
export default function Login({ status, users = [] }) {
    const [tab, setTab] = useState(users.length > 0 ? 'pin' : 'email');
    const [selectedUser, setUser] = useState(null);
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [pinLoading, setPinLoading] = useState(false);
    const [showPwd, setShowPwd] = useState(false);

    // Email form
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '', password: '', remember: false,
    });

    const submitEmail = (e) => {
        e.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    // PIN form
    const handlePinKey = (k) => { if (pin.length < 4) setPin(p => p + k); };
    const handlePinDel = () => setPin(p => p.slice(0, -1));

    const submitPin = () => {
        if (!selectedUser || pin.length !== 4) return;
        setPinLoading(true);
        setPinError('');
        router.post(route('login.pin'), { user_id: selectedUser.id, pin }, {
            onError: (e) => { setPinError(e.pin || 'Erreur de connexion.'); setPin(''); },
            onFinish: () => setPinLoading(false),
        });
    };

    const selectUser = (user) => { setUser(user); setPin(''); setPinError(''); };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
            <Head title="Connexion — RitajPOS Lavage" />

            <div className="w-full max-w-sm">
                {/* Logo / titre */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-3">
                        <Lock size={28} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">RitajPOS</h1>
                    <p className="text-blue-300 text-sm mt-0.5">Lavage Ultra Clean</p>
                </div>

                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                    {/* Onglets */}
                    {users.length > 0 && (
                        <div className="flex border-b">
                            <button onClick={() => setTab('pin')}
                                className={clsx('flex-1 py-3 text-sm font-semibold transition-colors',
                                    tab === 'pin'
                                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                        : 'text-gray-500 hover:text-gray-700')}>
                                Connexion rapide (PIN)
                            </button>
                            <button onClick={() => setTab('email')}
                                className={clsx('flex-1 py-3 text-sm font-semibold transition-colors',
                                    tab === 'email'
                                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                        : 'text-gray-500 hover:text-gray-700')}>
                                Email / Mot de passe
                            </button>
                        </div>
                    )}

                    <div className="p-6">
                        {status && (
                            <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm font-medium">
                                {status}
                            </div>
                        )}

                        {/* ─── PIN Tab ─────────────────────────── */}
                        {tab === 'pin' && (
                            <div>
                                <p className="text-xs text-gray-500 text-center mb-3">
                                    Sélectionnez votre profil puis entrez votre PIN
                                </p>

                                {/* Grille utilisateurs */}
                                <div className={clsx(
                                    'grid gap-2 mb-4',
                                    users.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'
                                )}>
                                    {users.map(u => (
                                        <UserCard key={u.id} user={u} selected={selectedUser?.id === u.id} onSelect={selectUser} />
                                    ))}
                                </div>

                                {selectedUser ? (
                                    <PinPad
                                        pin={pin}
                                        onKey={handlePinKey}
                                        onDelete={handlePinDel}
                                        onSubmit={submitPin}
                                        processing={pinLoading}
                                        error={pinError}
                                    />
                                ) : (
                                    <p className="text-center text-sm text-gray-400 py-4">
                                        ↑ Choisissez un utilisateur
                                    </p>
                                )}
                            </div>
                        )}

                        {/* ─── Email Tab ───────────────────────── */}
                        {tab === 'email' && (
                            <form onSubmit={submitEmail} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Adresse e-mail
                                    </label>
                                    <input
                                        type="email"
                                        value={data.email}
                                        onChange={e => setData('email', e.target.value)}
                                        autoFocus
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="admin@ritajpos.ma"
                                    />
                                    <InputError message={errors.email} className="mt-1" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Mot de passe
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPwd ? 'text' : 'password'}
                                            value={data.password}
                                            onChange={e => setData('password', e.target.value)}
                                            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="••••••••"
                                        />
                                        <button type="button" onClick={() => setShowPwd(s => !s)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <InputError message={errors.password} className="mt-1" />
                                </div>

                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                        <input type="checkbox" checked={data.remember}
                                            onChange={e => setData('remember', e.target.checked)}
                                            className="rounded border-gray-300 text-blue-600" />
                                        Se souvenir de moi
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                                    <LogIn size={16} />
                                    {processing ? 'Connexion…' : 'Se connecter'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                <p className="text-center text-xs text-blue-400 mt-4 opacity-60">
                    RitajPOS Lavage © {new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
}

