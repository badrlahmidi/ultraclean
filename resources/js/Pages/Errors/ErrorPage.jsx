/**
 * ErrorPage.jsx — Composant de base pour toutes les pages d'erreur Inertia.
 * Rendu sans AppLayout (l'erreur peut survenir hors session).
 */
import { Link } from '@inertiajs/react';
import { Waves, Home, ArrowLeft, AlertTriangle, ShieldOff, ServerCrash } from 'lucide-react';

const ERROR_CONFIG = {
    403: {
        icon: ShieldOff,
        color: 'text-orange-400',
        bg: 'from-orange-950/30 to-slate-900',
        title: 'Accès refusé',
        description: "Vous n'avez pas les droits nécessaires pour accéder à cette page.",
    },
    404: {
        icon: AlertTriangle,
        color: 'text-blue-400',
        bg: 'from-blue-950/30 to-slate-900',
        title: 'Page introuvable',
        description: "La page que vous cherchez n'existe pas ou a été déplacée.",
    },
    419: {
        icon: AlertTriangle,
        color: 'text-yellow-400',
        bg: 'from-yellow-950/30 to-slate-900',
        title: 'Session expirée',
        description: 'Votre session a expiré. Veuillez rafraîchir la page.',
    },
    500: {
        icon: ServerCrash,
        color: 'text-red-400',
        bg: 'from-red-950/30 to-slate-900',
        title: 'Erreur serveur',
        description: 'Une erreur inattendue s\'est produite. Notre équipe a été notifiée.',
    },
    503: {
        icon: ServerCrash,
        color: 'text-purple-400',
        bg: 'from-purple-950/30 to-slate-900',
        title: 'Service indisponible',
        description: 'L\'application est temporairement en maintenance. Revenez dans quelques minutes.',
    },
};

export default function ErrorPage({ status }) {
    const cfg = ERROR_CONFIG[status] ?? ERROR_CONFIG[500];
    const Icon = cfg.icon;

    return (
        <div className={`min-h-screen bg-gradient-to-br ${cfg.bg} via-slate-900 flex items-center justify-center p-6`}>
            <div className="text-center max-w-md w-full">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2.5 mb-10">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                        <Waves size={22} className="text-white" />
                    </div>
                    <span className="text-white font-bold text-lg">UltraClean</span>
                </div>

                {/* Code d'erreur */}
                <div className={`text-8xl font-black leading-none bg-gradient-to-br from-white/20 to-white/5 bg-clip-text text-transparent mb-4 tabular-nums`}>
                    {status}
                </div>

                {/* Icône */}
                <div className="flex justify-center mb-5">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <Icon size={30} className={cfg.color} />
                    </div>
                </div>

                {/* Message */}
                <h1 className="text-2xl font-bold text-white mb-3">{cfg.title}</h1>
                <p className="text-slate-400 leading-relaxed mb-10">{cfg.description}</p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
                    >
                        <ArrowLeft size={16} />
                        Retour
                    </button>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors text-sm font-medium"
                    >
                        <Home size={16} />
                        Tableau de bord
                    </Link>
                </div>

                {/* Footer */}
                <p className="mt-12 text-slate-600 text-xs">
                    Erreur {status} · UltraClean v2
                </p>
            </div>
        </div>
    );
}
