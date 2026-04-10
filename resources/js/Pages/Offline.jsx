import { WifiOff, RefreshCw, Ticket, Users, ClipboardList } from 'lucide-react';
import { useEffect, useState } from 'react';

const CACHED_INFO = [
    { icon: Ticket, label: 'Tickets du jour', desc: 'Les données de votre session restent accessibles.' },
    { icon: Users, label: 'Clients', desc: 'Consultez les fiches clients récemment ouvertes.' },
    { icon: ClipboardList, label: 'Services & tarifs', desc: 'La grille tarifaire chargée au démarrage reste disponible.' },
];

export default function Offline() {
    const [checking, setChecking] = useState(false);
    const [lastCheck, setLastCheck] = useState(null);

    function retry() {
        setChecking(true);
        fetch('/ping', { cache: 'no-store' })
            .then(() => window.location.reload())
            .catch(() => {
                setChecking(false);
                setLastCheck(new Date().toLocaleTimeString('fr-FR'));
            });
    }

    // Auto-retry every 30 s
    useEffect(() => {
        const id = setInterval(retry, 30_000);
        return () => clearInterval(id);
    }, []);

    // Reconnect when tab regains focus / network comes back
    useEffect(() => {
        const reload = () => window.location.reload();
        window.addEventListener('online', reload);
        return () => window.removeEventListener('online', reload);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-6">
            <div className="w-full max-w-md text-center">
                {/* Icon */}
                <div className="mx-auto w-20 h-20 rounded-full bg-orange-500/20 border-2 border-orange-500/40 flex items-center justify-center mb-6">
                    <WifiOff size={36} className="text-orange-400" />
                </div>

                <h1 className="text-2xl font-bold text-white mb-2">Mode hors-ligne</h1>
                <p className="text-slate-400 text-sm mb-8">
                    Votre connexion internet a été perdue. UltraClean fonctionne en mode hors-ligne.
                    Les données récentes de la session restent accessibles.
                </p>

                {/* Retry */}
                <button
                    onClick={retry}
                    disabled={checking}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
                >
                    <RefreshCw size={16} className={checking ? 'animate-spin' : ''} />
                    {checking ? 'Vérification…' : 'Réessayer la connexion'}
                </button>
                {lastCheck && (
                    <p className="text-xs text-slate-500 mt-2">Dernière tentative : {lastCheck}</p>
                )}

                {/* What's available */}
                <div className="mt-10 text-left space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
                        Disponible hors-ligne
                    </p>
                    {CACHED_INFO.map(({ icon: Icon, label, desc }) => (
                        <div key={label} className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
                            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                                <Icon size={16} className="text-white/70" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">{label}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <p className="mt-10 text-xs text-slate-600">UltraClean — Centre de lavage automobile</p>
            </div>
        </div>
    );
}
