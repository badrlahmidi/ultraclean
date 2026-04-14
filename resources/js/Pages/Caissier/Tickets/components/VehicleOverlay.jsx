import { useState, useMemo, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Car, Check, Search } from 'lucide-react';
import clsx from 'clsx';

/* Logo marque avec fallback */
function BrandLogo({ url, name, size = 'lg' }) {
    const [err, setErr] = useState(false);
    const dim = size === 'lg' ? 'w-14 h-14' : 'w-8 h-8';
    return (
        <div className={clsx(dim, 'flex items-center justify-center overflow-hidden')}>
            {url && !err
                ? <img src={url} alt={name} className="w-full h-full object-contain"
                    onError={() => setErr(true)} />
                : <Car size={size === 'lg' ? 24 : 14} className="text-gray-300" />
            }
        </div>
    );
}

/**
 * Overlay plein-écran sélection Marque → Modèle
 * Props :
 *   brands      — tableau [{id, name, slug, logo_url, models:[{id,name}]}]
 *   onSelect    — fn({brand, model}) appelée à la validation
 *   onClose     — fn() pour annuler
 */
export default function VehicleOverlay({ brands, onSelect, onClose }) {
    const [step, setStep] = useState('brands');   // 'brands' | 'models'
    const [activeBrand, setActiveBrand] = useState(null);
    const [activeModel, setActiveModel] = useState(null);
    const [search, setSearch] = useState('');

    /* Close on Escape */
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    /* ── Recherche marques ── */
    const filteredBrands = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return brands;
        return brands.filter(b => b.name.toLowerCase().includes(q));
    }, [brands, search]);

    /* ── Recherche modèles ── */
    const filteredModels = useMemo(() => {
        if (!activeBrand) return [];
        const q = search.trim().toLowerCase();
        const models = activeBrand.models ?? [];
        if (!q) return models;
        return models.filter(m => m.name.toLowerCase().includes(q));
    }, [activeBrand, search]);

    const selectBrand = (brand) => {
        setActiveBrand(brand);
        setActiveModel(null);
        setSearch('');
        setStep('models');
    };

    const goBack = () => {
        setStep('brands');
        setSearch('');
        setActiveModel(null);
    };

    const validate = () => {
        if (!activeBrand || !activeModel) return;
        onSelect({ brand: activeBrand, model: activeModel });
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="vehicle-overlay-title"
            className="fixed inset-0 z-50 bg-gray-950/80 flex items-stretch justify-center"
        >
            <div className="w-full max-w-3xl bg-white flex flex-col">

                {/* ── Header ── */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50 shrink-0">
                    {step === 'models' && (
                        <button onClick={goBack}
                            className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 shrink-0">
                            <ChevronLeft size={20} />
                        </button>
                    )}
                    <div className="flex-1 relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            autoFocus
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={step === 'brands' ? 'Rechercher une marque…' : `Modèles ${activeBrand?.name}…`}
                            aria-label={step === 'brands' ? 'Rechercher une marque' : `Rechercher un modèle ${activeBrand?.name}`}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl
                                       focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button onClick={onClose} aria-label="Fermer"
                        className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 shrink-0">
                        <X size={18} />
                    </button>
                </div>

                {/* ── Indicateur d'étapes ── */}
                <div className="px-5 py-2.5 border-b border-gray-100 bg-white shrink-0 flex items-center gap-2">
                    <h2 id="vehicle-overlay-title" className="sr-only">
                        {step === 'brands' ? 'Sélectionner une marque' : `Sélectionner un modèle ${activeBrand?.name}`}
                    </h2>
                    <span className={clsx(
                        'text-xs font-semibold px-2.5 py-1 rounded-full transition-all',
                        step === 'brands' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                    )}>
                        1 · Marque
                    </span>
                    <ChevronRight size={12} className="text-gray-300 shrink-0" />
                    <span className={clsx(
                        'text-xs font-semibold px-2.5 py-1 rounded-full transition-all',
                        step === 'models' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                    )}>
                        2 · Modèle
                    </span>
                    {step === 'models' && activeBrand && (
                        <span className="ml-1 text-xs text-gray-500 truncate">— {activeBrand.name}</span>
                    )}
                    {step === 'models' && activeModel && (
                        <span className="ml-auto flex items-center gap-1 text-xs text-green-600 font-medium shrink-0">
                            <Check size={11} />
                            {activeModel.name}
                        </span>
                    )}
                </div>

                {/* ── Grille marques ── */}
                {step === 'brands' && (
                    <div className="flex-1 overflow-y-auto p-5">
                        {filteredBrands.length === 0
                            ? <p className="text-center text-gray-400 text-sm mt-10">Aucune marque trouvée</p>
                            : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                    {filteredBrands.map(brand => (
                                        <button key={brand.id} onClick={() => selectBrand(brand)}
                                            className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-gray-200
                                                       bg-white hover:border-blue-400 hover:bg-blue-50
                                                       transition-all group">
                                            <BrandLogo url={brand.logo_url} name={brand.name} />
                                            <span className="text-xs font-medium text-gray-700 group-hover:text-blue-700
                                                             text-center leading-tight">{brand.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )
                        }
                    </div>
                )}

                {/* ── Liste modèles ── */}
                {step === 'models' && (
                    <div className="flex-1 overflow-y-auto p-5">
                        {filteredModels.length === 0
                            ? <p className="text-center text-gray-400 text-sm mt-10">Aucun modèle trouvé</p>
                            : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {filteredModels.map(model => (
                                        <button key={model.id} onClick={() => setActiveModel(model)}
                                            className={clsx(
                                                'flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all',
                                                activeModel?.id === model.id
                                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                                            )}>
                                            <span>{model.name}</span>
                                            {activeModel?.id === model.id && <Check size={15} className="text-blue-500" />}
                                        </button>
                                    ))}
                                </div>
                            )
                        }
                    </div>
                )}

                {/* ── Footer ── */}
                <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
                        Annuler
                    </button>
                    {step === 'models' && (
                        <button onClick={validate} disabled={!activeModel}
                            className={clsx(
                                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
                                activeModel
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            )}>
                            <Check size={15} />
                            Valider
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
