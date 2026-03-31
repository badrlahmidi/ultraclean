import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';
import {
    Plus, Pencil, Trash2, ChevronDown, ChevronRight,
    Upload, Download, Car, X, Check, AlertTriangle, Search
} from 'lucide-react';
import clsx from 'clsx';

/* ─────────────────────────────────────────────────────────────────
   Logo — gère SVG + raster sans transformation GD
───────────────────────────────────────────────────────────────── */
function BrandLogo({ url, name, size = 'md' }) {
    const [err, setErr] = useState(false);
    const dim = size === 'sm' ? 'w-8 h-8' : 'w-14 h-14';
    return (
        <div className={clsx(dim, 'rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0')}>
            {url && !err
                ? <img src={url} alt={name} className="w-full h-full object-contain p-1" onError={() => setErr(true)} />
                : <Car size={size === 'sm' ? 14 : 22} className="text-gray-300" />
            }
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   BrandModal — logo + nom uniquement
───────────────────────────────────────────────────────────────── */
function BrandModal({ brand, onClose }) {
    const isEdit = !!brand;
    const [name, setName] = useState(brand?.name ?? ''); const [logoFile, setLogoFile] = useState(null);
    const [preview, setPreview] = useState(brand?.logo_url ?? null);
    const [previewErr, setPreviewErr] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState({});
    const fileRef = useRef();
    const nameRef = useRef();

    useEffect(() => { nameRef.current?.focus(); }, []); const handleFile = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        setLogoFile(f);
        setPreview(URL.createObjectURL(f));
        setPreviewErr(false);
    };

    const submit = (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setProcessing(true);
        setErrors({});
        const fd = new FormData();
        fd.append('name', name.trim());
        if (logoFile) fd.append('logo', logoFile);
        if (isEdit) fd.append('_method', 'PUT');
        router.post(
            isEdit ? route('admin.vehicles.update', brand.id) : route('admin.vehicles.store'),
            fd,
            {
                forceFormData: true,
                onError: (errs) => { setErrors(errs); setProcessing(false); },
                onSuccess: () => onClose(),
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-800">
                        {isEdit ? `Modifier « ${brand.name} »` : 'Nouvelle marque'}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
                </div>

                <form onSubmit={submit} className="p-5 space-y-5">
                    {/* Zone logo cliquable */}
                    <div className="flex flex-col items-center gap-2 cursor-pointer select-none" onClick={() => fileRef.current.click()}>
                        <div className={clsx(
                            'w-28 h-28 rounded-2xl border-2 border-dashed flex items-center justify-center bg-gray-50 overflow-hidden transition-colors',
                            'hover:border-blue-400 hover:bg-blue-50',
                            preview ? 'border-gray-200' : 'border-gray-300'
                        )}>                            {preview && !previewErr
                            ? <img src={preview} alt="logo" className="w-full h-full object-contain p-2"
                                onError={() => setPreviewErr(true)} />
                            : <Upload size={30} className="text-gray-300" />
                            }
                        </div>
                        <span className="text-xs text-blue-600 font-medium hover:underline">
                            {preview ? 'Changer le logo' : 'Ajouter un logo'}
                        </span>
                        <span className="text-xs text-gray-400">SVG · PNG · WebP · JPG</span>
                    </div>
                    <input ref={fileRef} type="file" accept=".svg,.png,.webp,.jpg,.jpeg" className="hidden" onChange={handleFile} />

                    {/* Nom */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Nom *</label>
                        <input ref={nameRef} type="text" value={name} onChange={e => setName(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="ex. Dacia" />
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                    </div>

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">
                            Annuler
                        </button>
                        <button type="submit" disabled={processing || !name.trim()}
                            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                            {processing ? 'Enregistrement…' : isEdit ? 'Mettre à jour' : 'Créer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   ConfirmDelete
───────────────────────────────────────────────────────────────── */
function ConfirmDelete({ label, onConfirm, onCancel, processing }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6 text-center">
                <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle size={20} className="text-red-500" />
                </div>
                <p className="text-sm text-gray-600 mb-5">
                    Supprimer <span className="font-semibold text-gray-800">« {label} »</span> ?
                </p>
                <div className="flex gap-2 justify-center">
                    <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">Annuler</button>
                    <button onClick={onConfirm} disabled={processing}
                        className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                        {processing ? '…' : 'Supprimer'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   ModelItem — renommage inline (clic sur l'icône crayon)
───────────────────────────────────────────────────────────────── */
function ModelItem({ model, brand, onDelete }) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(model.name);
    const [saving, setSaving] = useState(false);
    const inputRef = useRef();

    useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

    const save = () => {
        const v = value.trim();
        if (!v || v === model.name) { cancel(); return; }
        setSaving(true);
        router.put(
            route('admin.vehicles.models.update', { brand: brand.id, model: model.id }),
            { name: v },
            {
                onSuccess: () => { setSaving(false); setEditing(false); },
                onError: () => setSaving(false),
            }
        );
    };

    const cancel = () => { setEditing(false); setValue(model.name); };
    const onKey = (e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); };

    return (
        <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-gray-50 group min-w-0">
            {editing ? (
                <>
                    <input ref={inputRef} value={value} onChange={e => setValue(e.target.value)} onKeyDown={onKey}
                        className="flex-1 min-w-0 text-sm border border-blue-400 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <button onClick={save} disabled={saving} className="p-1 rounded text-green-600 hover:bg-green-50 disabled:opacity-40 flex-shrink-0"><Check size={12} /></button>
                    <button onClick={cancel} className="p-1 rounded text-gray-400 hover:bg-gray-100 flex-shrink-0"><X size={12} /></button>
                </>
            ) : (
                <>
                    <span className="flex-1 min-w-0 text-sm text-gray-700 truncate">{model.name}</span>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button onClick={() => setEditing(true)} className="p-1 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50"><Pencil size={11} /></button>
                        <button onClick={() => onDelete(model)} className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={11} /></button>
                    </div>
                </>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   AddModelRow — saisie inline sous la liste
───────────────────────────────────────────────────────────────── */
function AddModelRow({ brand, onDone }) {
    const [value, setValue] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const inputRef = useRef();

    useEffect(() => { inputRef.current?.focus(); }, []);

    const save = () => {
        const v = value.trim();
        if (!v) { onDone(); return; }
        setSaving(true); setError('');
        router.post(
            route('admin.vehicles.models.store', { brand: brand.id }),
            { name: v },
            {
                onSuccess: () => { setSaving(false); setValue(''); onDone(); },
                onError: (errs) => { setSaving(false); setError(errs.name ?? 'Erreur'); },
            }
        );
    };

    const onKey = (e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onDone(); };

    return (
        <div className="mt-2 px-2">
            <div className="flex items-center gap-1">
                <input ref={inputRef} value={value} onChange={e => { setValue(e.target.value); setError(''); }}
                    onKeyDown={onKey} placeholder="Nom du modèle…"
                    className={clsx(
                        'flex-1 min-w-0 text-sm border rounded-lg px-2 py-1 focus:outline-none focus:ring-1',
                        error ? 'border-red-400 focus:ring-red-400' : 'border-blue-400 focus:ring-blue-500'
                    )} />
                <button onClick={save} disabled={saving || !value.trim()} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-40"><Check size={13} /></button>
                <button onClick={onDone} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={13} /></button>
            </div>
            {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   BrandRow — accordéon
───────────────────────────────────────────────────────────────── */
function BrandRow({ brand, onEdit, onDelete }) {
    const [open, setOpen] = useState(false);
    const [adding, setAdding] = useState(false);
    const [deleteModel, setDeleteModel] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const confirmDeleteModel = () => {
        setDeleting(true);
        router.delete(
            route('admin.vehicles.models.destroy', { brand: brand.id, model: deleteModel.id }),
            { onFinish: () => { setDeleting(false); setDeleteModel(null); } }
        );
    };

    const count = brand.all_models?.length ?? 0;

    return (
        <>
            <div className={clsx('bg-white rounded-xl border transition-all', open ? 'shadow-md border-blue-200' : 'shadow-sm border-gray-200')}>

                {/* Header marque */}
                <div className="flex items-center gap-3 px-3 py-2.5">
                    <button onClick={() => setOpen(o => !o)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 flex-shrink-0">
                        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </button>

                    <BrandLogo url={brand.logo_url} name={brand.name} size="sm" />

                    <div className="flex-1 min-w-0">
                        <span className="font-semibold text-gray-800 text-sm">{brand.name}</span>
                        <span className="ml-2 text-xs text-gray-400">{count} modèle{count !== 1 ? 's' : ''}</span>
                    </div>

                    <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button onClick={() => { setOpen(true); setAdding(true); }}
                            className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50" title="Ajouter un modèle">
                            <Plus size={14} />
                        </button>
                        <button onClick={() => onEdit(brand)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" title="Modifier"><Pencil size={14} /></button>
                        <button onClick={() => onDelete(brand)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50" title="Supprimer"><Trash2 size={14} /></button>
                    </div>
                </div>

                {/* Panel modèles */}
                {open && (
                    <div className="border-t border-gray-100 px-2 pb-3 pt-1">
                        {count === 0 && !adding ? (
                            <p className="text-xs text-gray-400 py-2 text-center">
                                Aucun modèle.{' '}
                                <button className="text-blue-500 hover:underline" onClick={() => setAdding(true)}>Ajouter</button>
                            </p>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                                {brand.all_models?.map(m => (
                                    <ModelItem key={m.id} model={m} brand={brand} onDelete={setDeleteModel} />
                                ))}
                            </div>
                        )}

                        {adding && <AddModelRow brand={brand} onDone={() => setAdding(false)} />}

                        {!adding && count > 0 && (
                            <button onClick={() => setAdding(true)}
                                className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium px-2">
                                <Plus size={11} /> Ajouter un modèle
                            </button>
                        )}
                    </div>
                )}
            </div>

            {deleteModel && (
                <ConfirmDelete label={deleteModel.name} processing={deleting}
                    onConfirm={confirmDeleteModel} onCancel={() => setDeleteModel(null)} />
            )}
        </>
    );
}

/* ─────────────────────────────────────────────────────────────────
   Import CSV Modal
───────────────────────────────────────────────────────────────── */
function ImportModal({ onClose }) {
    const [file, setFile] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');
    const fileRef = useRef();

    const submit = (e) => {
        e.preventDefault();
        if (!file) return;
        setProcessing(true);
        const fd = new FormData();
        fd.append('csv_file', file);
        router.post(route('admin.vehicles.import'), fd, {
            forceFormData: true,
            onError: (errs) => { setError(errs.csv_file ?? 'Erreur'); setProcessing(false); },
            onSuccess: () => onClose(),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-800">Importer CSV</h2>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
                </div>
                <form onSubmit={submit} className="p-5 space-y-3">
                    <p className="text-xs text-gray-400 font-mono bg-gray-50 rounded-lg p-2 border border-gray-200">
                        brand_name, model_name, model_name, …
                    </p>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
                        onClick={() => fileRef.current.click()}>
                        {file
                            ? <div className="flex items-center justify-center gap-2 text-green-600"><Check size={15} /><span className="text-sm">{file.name}</span></div>
                            : <><Upload size={22} className="mx-auto text-gray-300 mb-1" /><p className="text-sm text-gray-400">Choisir un fichier CSV</p></>
                        }
                    </div>
                    <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden"
                        onChange={e => { setFile(e.target.files[0] ?? null); setError(''); }} />
                    {error && <p className="text-xs text-red-500">{error}</p>}
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">Annuler</button>
                        <button type="submit" disabled={!file || processing}
                            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                            {processing ? 'Import…' : 'Importer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   Page principale
───────────────────────────────────────────────────────────────── */
export default function VehiclesIndex({ brands }) {
    const [brandModal, setBrandModal] = useState(null);
    const [deleteBrand, setDeleteBrand] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [importModal, setImportModal] = useState(false);
    const [search, setSearch] = useState('');

    const filtered = brands.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));
    const totalModels = brands.reduce((acc, b) => acc + (b.all_models?.length ?? 0), 0);

    const confirmDeleteBrand = () => {
        setDeleting(true);
        router.delete(route('admin.vehicles.destroy', deleteBrand.id), {
            onFinish: () => { setDeleting(false); setDeleteBrand(null); },
        });
    };

    return (
        <AppLayout title="Marques & Modèles">
            <Head title="Marques & Modèles" />

            {/* Header */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
                <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-bold text-gray-900">Marques & Modèles</h1>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {brands.length} marque{brands.length !== 1 ? 's' : ''} · {totalModels} modèle{totalModels !== 1 ? 's' : ''}
                    </p>
                </div>
                <a href={route('admin.vehicles.export')}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">
                    <Download size={14} /> Export CSV
                </a>
                <button onClick={() => setImportModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100">
                    <Upload size={14} /> Import CSV
                </button>
                <button onClick={() => setBrandModal('create')}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm">
                    <Plus size={14} /> Nouvelle marque
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-4 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Rechercher une marque…" value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Liste des marques */}
            <div className="space-y-1.5">
                {filtered.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <Car size={36} className="mx-auto mb-3 opacity-25" />
                        <p className="text-sm">{search ? 'Aucune marque trouvée.' : 'Aucune marque.'}</p>
                        {!search && (
                            <button onClick={() => setBrandModal('create')} className="mt-2 text-blue-600 text-sm hover:underline">
                                Créer la première marque
                            </button>
                        )}
                    </div>
                ) : filtered.map(brand => (
                    <BrandRow key={brand.id} brand={brand}
                        onEdit={b => setBrandModal(b)}
                        onDelete={b => setDeleteBrand(b)} />
                ))}
            </div>

            {/* Modals */}
            {brandModal && (
                <BrandModal brand={brandModal === 'create' ? null : brandModal} onClose={() => setBrandModal(null)} />
            )}
            {deleteBrand && (
                <ConfirmDelete label={deleteBrand.name} processing={deleting}
                    onConfirm={confirmDeleteBrand} onCancel={() => setDeleteBrand(null)} />
            )}
            {importModal && <ImportModal onClose={() => setImportModal(false)} />}
        </AppLayout>
    );
}
