/**
 * Admin/Roles/Index.jsx
 * ─────────────────────────────────────────────────────────────────
 * Matrice des rôles × permissions.
 *
 * Fonctionnalités :
 *   - Liste des rôles (système + personnalisés)
 *   - Créer un nouveau rôle personnalisé
 *   - Modifier display_name + couleur d'un rôle
 *   - Cocher/décocher des permissions par rôle (avec sauvegarde colonne par colonne)
 *   - Supprimer un rôle non-système sans utilisateurs
 * ─────────────────────────────────────────────────────────────────
 */
import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, Save, Trash2, Shield, CheckCircle2, XCircle, Info } from 'lucide-react';
import clsx from 'clsx';
import PageHeader from '@/Components/PageHeader';

/* ── Couleurs Tailwind disponibles pour les rôles ── */
const COLOR_OPTIONS = [
    { value: 'purple-600', label: 'Violet' },
    { value: 'blue-600',   label: 'Bleu' },
    { value: 'green-600',  label: 'Vert' },
    { value: 'orange-500', label: 'Orange' },
    { value: 'red-600',    label: 'Rouge' },
    { value: 'pink-600',   label: 'Rose' },
    { value: 'indigo-600', label: 'Indigo' },
    { value: 'yellow-500', label: 'Jaune' },
    { value: 'teal-600',   label: 'Teal' },
    { value: 'gray-600',   label: 'Gris' },
];

/* ── Badge rôle ── */
function RoleBadge({ role }) {
    return (
        <span className={clsx(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white',
            `bg-${role.color}`
        )}>
            <Shield size={11} />
            {role.display_name}
        </span>
    );
}

/* ── Modal créer / modifier rôle ── */
function RoleModal({ role, onClose }) {
    const isEdit = !!role;
    const [form, setForm] = useState({
        name:         role?.name ?? '',
        display_name: role?.display_name ?? '',
        color:        role?.color ?? 'blue-600',
    });
    const [errors, setErrors] = useState({});

    const submit = (e) => {
        e.preventDefault();
        if (isEdit) {
            router.put(route('admin.roles.update', role.id), form, {
                onError: setErrors,
                onSuccess: onClose,
            });
        } else {
            router.post(route('admin.roles.store'), form, {
                onError: setErrors,
                onSuccess: onClose,
            });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between p-5 border-b">
                    <h2 className="font-semibold text-gray-800">
                        {isEdit ? 'Modifier le rôle' : 'Nouveau rôle'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                </div>

                <form onSubmit={submit} className="p-5 space-y-4">
                    {/* Nom technique — non modifiable en édition */}
                    {!isEdit && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nom technique <span className="text-gray-400 text-xs">(lettres, chiffres, _ uniquement)</span>
                            </label>
                            <input
                                type="text"
                                value={form.name}
                                placeholder="ex: superviseur"
                                onChange={e => setForm(f => ({ ...f, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nom affiché *</label>
                        <input
                            type="text"
                            value={form.display_name}
                            placeholder="ex: Superviseur"
                            onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {errors.display_name && <p className="text-red-500 text-xs mt-1">{errors.display_name}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Couleur</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {COLOR_OPTIONS.map(c => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, color: c.value }))}
                                    className={clsx(
                                        'w-7 h-7 rounded-full border-2 transition-all',
                                        `bg-${c.value}`,
                                        form.color === c.value ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-105'
                                    )}
                                    title={c.label}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Aperçu */}
                    <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                        <span className="text-xs text-gray-500">Aperçu :</span>
                        <RoleBadge role={{ display_name: form.display_name || 'Nouveau rôle', color: form.color }} />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
                        >
                            {isEdit ? 'Enregistrer' : 'Créer le rôle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─── Composant principal ─────────────────────────────────────── */
export default function RolesIndex({ roles, permissionsByGroup }) {
    const [modal, setModal] = useState(null); // null | 'create' | role_object
    // État local des permissions par rôle (pour la modification en temps réel)
    const [pendingPermissions, setPendingPermissions] = useState(() => {
        const init = {};
        roles.forEach(r => { init[r.id] = new Set(r.permissions); });
        return init;
    });
    const [savingRoleId, setSavingRoleId] = useState(null);

    const groupLabels = {
        dashboard:    'Tableau de bord',
        tickets:      'Tickets',
        clients:      'Clients',
        laveur:       'File d\'attente (Laveur)',
        shifts:       'Caisse / Shifts',
        appointments: 'Rendez-vous',
        planning:     'Planning',
        promotions:   'Promotions',
        commercial:   'Gestion commerciale',
        stock:        'Stock',
        reports:      'Rapports',
        settings:     'Configuration',
    };

    const togglePermission = (roleId, permissionId) => {
        setPendingPermissions(prev => {
            const set = new Set(prev[roleId]);
            if (set.has(permissionId)) {
                set.delete(permissionId);
            } else {
                set.add(permissionId);
            }
            return { ...prev, [roleId]: set };
        });
    };

    const saveRole = (role) => {
        setSavingRoleId(role.id);
        router.put(route('admin.roles.update', role.id), {
            display_name:   role.display_name,
            color:          role.color,
            permission_ids: [...pendingPermissions[role.id]],
        }, {
            onSuccess: () => setSavingRoleId(null),
            onError:   () => setSavingRoleId(null),
            preserveScroll: true,
        });
    };

    const deleteRole = (role) => {
        if (!confirm(`Supprimer le rôle « ${role.display_name} » ?`)) return;
        router.delete(route('admin.roles.destroy', role.id));
    };

    const hasChanges = (role) => {
        const original = new Set(role.permissions);
        const pending  = pendingPermissions[role.id] ?? new Set();
        if (original.size !== pending.size) return true;
        for (const p of original) if (!pending.has(p)) return true;
        return false;
    };

    return (
        <AppLayout title="Rôles & Permissions">
            <Head title="Rôles & Permissions" />

            {modal && (
                <RoleModal
                    role={modal === 'create' ? null : modal}
                    onClose={() => setModal(null)}
                />
            )}

            <PageHeader
                title="Rôles & Permissions"
                subtitle={`${roles.length} rôle(s) configuré(s)`}
                breadcrumbs={[
                    { label: 'Admin', href: 'admin.dashboard' },
                    { label: 'Configuration', href: 'admin.settings.index' },
                    { label: 'Rôles & Permissions' },
                ]}
            >
                <button
                    onClick={() => setModal('create')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold"
                >
                    <Plus size={16} /> Nouveau rôle
                </button>
            </PageHeader>

            {/* ── Légende ── */}
            <div className="mx-6 mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2.5 text-sm text-blue-700">
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <span>
                    Cochez les permissions pour chaque rôle, puis cliquez sur <strong>Enregistrer</strong> dans la colonne correspondante.
                    Les rôles <strong>système</strong> (Admin, Caissier, Laveur) ne peuvent pas être supprimés.
                </span>
            </div>

            {/* ── Matrice permissions × rôles ── */}
            <div className="mx-6 mb-8 overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left px-4 py-3 font-semibold text-gray-600 min-w-[220px] sticky left-0 bg-gray-50 z-10">
                                Permission
                            </th>
                            {roles.map(role => (
                                <th key={role.id} className="px-3 py-3 text-center min-w-[140px]">
                                    <div className="flex flex-col items-center gap-1.5">
                                        <RoleBadge role={role} />
                                        {role.is_system && (
                                            <span className="text-[10px] text-gray-400 font-normal">Système</span>
                                        )}
                                        {!role.is_system && (
                                            <span className="text-[10px] text-gray-400 font-normal">
                                                {role.user_count} utilisateur{role.user_count !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {Object.entries(permissionsByGroup).map(([group, permissions]) => (
                            <>
                                {/* ── En-tête de groupe ── */}
                                <tr key={`group-${group}`} className="bg-gray-50/70 border-y border-gray-100">
                                    <td
                                        colSpan={roles.length + 1}
                                        className="px-4 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-widest sticky left-0"
                                    >
                                        {groupLabels[group] ?? group}
                                    </td>
                                </tr>

                                {/* ── Lignes de permissions ── */}
                                {permissions.map(perm => (
                                    <tr
                                        key={perm.id}
                                        className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                                    >
                                        <td className="px-4 py-2.5 sticky left-0 bg-white z-10">
                                            <div>
                                                <p className="font-medium text-gray-700">{perm.display_name}</p>
                                                <p className="text-[11px] text-gray-400 font-mono">{perm.name}</p>
                                            </div>
                                        </td>

                                        {roles.map(role => {
                                            const checked = pendingPermissions[role.id]?.has(perm.id) ?? false;
                                            return (
                                                <td key={role.id} className="px-3 py-2.5 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => togglePermission(role.id, perm.id)}
                                                        className={clsx(
                                                            'w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all',
                                                            checked
                                                                ? 'text-green-600 hover:text-green-700'
                                                                : 'text-gray-300 hover:text-gray-400'
                                                        )}
                                                        title={checked ? 'Retirer la permission' : 'Accorder la permission'}
                                                        aria-label={`${checked ? 'Retirer' : 'Accorder'} ${perm.name} à ${role.display_name}`}
                                                        aria-pressed={checked}
                                                    >
                                                        {checked
                                                            ? <CheckCircle2 size={18} />
                                                            : <XCircle size={18} />
                                                        }
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </>
                        ))}
                    </tbody>

                    {/* ── Footer : boutons Enregistrer par rôle ── */}
                    <tfoot>
                        <tr className="bg-gray-50 border-t border-gray-200">
                            <td className="px-4 py-3 text-xs text-gray-400 italic sticky left-0 bg-gray-50 z-10">
                                Sauvegarder les modifications
                            </td>
                            {roles.map(role => (
                                <td key={role.id} className="px-3 py-3 text-center">
                                    <div className="flex flex-col items-center gap-1.5">
                                        <button
                                            onClick={() => saveRole(role)}
                                            disabled={savingRoleId === role.id || !hasChanges(role)}
                                            className={clsx(
                                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                                                hasChanges(role)
                                                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                                    : 'bg-gray-100 text-gray-400 cursor-default'
                                            )}
                                        >
                                            <Save size={12} />
                                            {savingRoleId === role.id ? 'Sauvegarde…' : 'Enregistrer'}
                                        </button>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => setModal(role)}
                                                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                title="Modifier le rôle"
                                            >
                                                ✏️
                                            </button>
                                            {!role.is_system && (
                                                <button
                                                    onClick={() => deleteRole(role)}
                                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                    title="Supprimer le rôle"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </td>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </div>
        </AppLayout>
    );
}
