import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { formatDateTime } from '@/utils/format';
import clsx from 'clsx';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import ActionButton from '@/Components/ActionButton';

const ROLE_CONFIG = {
    admin: { label: 'Admin', color: 'bg-purple-100 text-purple-700' },
    caissier: { label: 'Caissier', color: 'bg-blue-100 text-blue-700' },
    laveur: { label: 'Laveur', color: 'bg-green-100 text-green-700' },
};

function UserModal({ user, roles, onClose }) {
    const isEdit = !!user;
    const [form, setForm] = useState({
        name: user?.name ?? '',
        email: user?.email ?? '',
        role: user?.role ?? 'laveur',
        phone: user?.phone ?? '',
        pin: '',
        password: '',
        is_active: user?.is_active ?? true,
    });
    const [showPwd, setShowPwd] = useState(false);
    const [errors, setErrors] = useState({});

    const submit = (e) => {
        e.preventDefault();
        const action = isEdit
            ? router.put(route('admin.users.update', user.id), form, {
                onError: setErrors, onSuccess: onClose,
            })
            : router.post(route('admin.users.store'), form, {
                onError: setErrors, onSuccess: onClose,
            });
    }; const field = (label, key, type = 'text', opts = {}) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input type={type} value={form[key]} placeholder={opts.placeholder}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {errors[key] && <p className="text-red-500 text-xs mt-1">{errors[key]}</p>}
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b">
                    <h2 className="font-semibold text-gray-800">{isEdit ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                </div>
                <form onSubmit={submit} className="p-5 space-y-4">
                    {field('Nom complet *', 'name', 'text', { placeholder: 'Ex: Ahmed Bennani' })}
                    {field('Email *', 'email', 'email', { placeholder: 'user@ritajpos.ma' })}
                    {field('Téléphone', 'phone', 'tel', { placeholder: '0600000000' })}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Rôle *</label>
                        <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            {roles.map(r => (
                                <option key={r} value={r}>{ROLE_CONFIG[r]?.label ?? r}</option>
                            ))}
                        </select>
                    </div>

                    <div>                        <label className="block text-sm font-medium text-gray-700 mb-1">
                        Code PIN (4 chiffres){isEdit && ' — laisser vide pour ne pas changer'}
                    </label>
                        <input type="text" inputMode="numeric" maxLength={4} value={form.pin}
                            placeholder="••••"
                            onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-widest" />
                        {errors.pin && <p className="text-red-500 text-xs mt-1">{errors.pin}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mot de passe{isEdit && ' — laisser vide pour ne pas changer'}
                        </label>
                        <div className="relative">                            <input type={showPwd ? 'text' : 'password'} value={form.password}
                            placeholder={isEdit ? '••••••••' : 'Min. 8 caractères'}
                            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            <button type="button" onClick={() => setShowPwd(s => !s)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>
                        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                    </div>

                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="u_active" checked={form.is_active}
                            onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                            className="rounded border-gray-300 text-blue-600" />
                        <label htmlFor="u_active" className="text-sm text-gray-700">Compte actif</label>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                            Annuler
                        </button>
                        <button type="submit"
                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold">
                            {isEdit ? 'Mettre à jour' : 'Créer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function UsersIndex({ users, roles }) {
    const [modal, setModal] = useState(null);

    const deleteUser = (user) => {
        if (!confirm(`Supprimer « ${user.name} » ?`)) return;
        router.delete(route('admin.users.destroy', user.id));
    };

    return (
        <AppLayout title="Utilisateurs">            <Head title="Utilisateurs" />
            {modal && <UserModal user={modal === 'create' ? null : modal} roles={roles} onClose={() => setModal(null)} />}

            <PageHeader
                title="Utilisateurs"
                subtitle={`${users.length} compte(s)`}
                breadcrumbs={[
                    { label: 'Admin', href: 'admin.dashboard' },
                    { label: 'Utilisateurs' },
                ]}
            >
                <button
                    onClick={() => setModal('create')}
                    className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold touch-manipulation"
                >
                    <Plus size={16} /> Nouvel utilisateur
                </button>
            </PageHeader>

            <DataTable
                columns={[
                    { label: 'Nom' },
                    { label: 'Email' },
                    { label: 'Rôle', align: 'center' },
                    { label: 'Statut', align: 'center' },
                    { label: 'Dernière connexion' },
                    { label: '', width: '80px' },
                ]}
                isEmpty={users.length === 0}
                emptyMessage="Aucun utilisateur trouvé"
            >
                {users.map(u => (
                    <tr key={u.id} className={clsx('hover:bg-gray-50', u.deleted_at && 'opacity-50')}>
                        <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                                <div className={clsx(
                                    'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0',
                                    'bg-gray-400'
                                )}>
                                    {u.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium text-gray-800">{u.name}</span>
                            </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{u.email}</td>
                        <td className="px-3 py-3 text-center">
                            <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', ROLE_CONFIG[u.role]?.color)}>
                                {ROLE_CONFIG[u.role]?.label}
                            </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                            <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium',
                                u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                                {u.is_active ? 'Actif' : 'Inactif'}
                            </span>
                        </td>
                        <td className="px-3 py-3 text-gray-500 text-xs">{formatDateTime(u.last_login_at)}</td>
                        <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                                <ActionButton icon={Pencil} variant="edit" onClick={() => setModal(u)} label="Modifier" />
                                <ActionButton icon={Trash2} variant="delete" onClick={() => deleteUser(u)} label="Supprimer" />
                            </div>
                        </td>
                    </tr>
                ))}
            </DataTable>
        </AppLayout>
    );
}
