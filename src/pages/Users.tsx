import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Shield, User as UserIcon } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { getApiErrorMessage } from '../lib/getApiErrorMessage';
import { STRING_LIMITS } from '../lib/stringLimits';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { useNotification } from '../context/NotificationContext';

type User = {
  id: number;
  username: string;
  role: string;
  createdAt: string;
  gymId?: number;
};

export const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<User>>({ role: 'cashier' });
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  const { user: authUser } = useAuth();
  const { confirm } = useConfirm();
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axiosInstance.get('/api/users');
      setUsers(res.data || []);
    } catch (error: unknown) {
      setUsers([]);
      showNotification(
        getApiErrorMessage(error, 'Chargement des utilisateurs'),
        'error'
      );
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = String(currentUser.username || '').trim();
    if (
      username.length < STRING_LIMITS.username.min ||
      username.length > STRING_LIMITS.username.max
    ) {
      const msg = `Nom d'utilisateur : entre ${STRING_LIMITS.username.min} et ${STRING_LIMITS.username.max} caractères.`;
      setFormError(msg);
      showNotification(msg, 'error');
      return;
    }
    if (!currentUser.id) {
      if (
        password.length < STRING_LIMITS.password.min ||
        password.length > STRING_LIMITS.password.max
      ) {
        const msg = `Mot de passe : entre ${STRING_LIMITS.password.min} et ${STRING_LIMITS.password.max} caractères.`;
        setFormError(msg);
        showNotification(msg, 'error');
        return;
      }
    } else if (password) {
      if (
        password.length < STRING_LIMITS.password.min ||
        password.length > STRING_LIMITS.password.max
      ) {
        const msg = `Mot de passe : entre ${STRING_LIMITS.password.min} et ${STRING_LIMITS.password.max} caractères.`;
        setFormError(msg);
        showNotification(msg, 'error');
        return;
      }
    }

    const method = currentUser.id ? 'PUT' : 'POST';
    const url = currentUser.id ? `/api/users/${currentUser.id}` : '/api/users';

    const dataToSave = {
      ...currentUser,
      username,
      password: password || undefined,
      gymId: currentUser.gymId || authUser?.gymId,
    };
    try {
      await axiosInstance[method.toLowerCase() as 'put' | 'post'](url, dataToSave);
      setFormError('');
      setIsModalOpen(false);
      setPassword('');
      fetchUsers();
      showNotification('Utilisateur enregistré avec succès', 'success');
    } catch (error: unknown) {
      const msg = getApiErrorMessage(error, 'Enregistrement de l’utilisateur');
      setFormError(msg);
      showNotification(msg, 'error');
    }
  };

  const handleDelete = async (id: number) => {
    confirm({
      title: 'Supprimer l\'utilisateur',
      message: 'Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.',
      confirmText: 'Supprimer',
      onConfirm: async () => {
        try {
          await axiosInstance.delete(`/api/users/${id}`);
          fetchUsers();
          showNotification('Utilisateur supprimé', 'success');
        } catch (error: unknown) {
          console.error('Error deleting user:', error);
          showNotification(
            getApiErrorMessage(error, 'Suppression de l’utilisateur'),
            'error'
          );
        }
      }
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('fr-FR');
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Utilisateurs</h1>
          <p className="text-slate-500 text-[11px] sm:text-[12px] font-medium mt-0.5">Gérez les accès au système.</p>
        </div>
        <button
          onClick={() => { setFormError(''); setCurrentUser({ role: 'cashier' }); setPassword(''); setIsModalOpen(true); }}
          className="bg-indigo-600 text-white px-3 py-2 rounded-lg flex items-center justify-center shadow-sm shadow-indigo-200 hover:bg-indigo-700 transition-all text-[11px] font-bold w-full sm:w-auto"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Nouvel Utilisateur
        </button>
      </div>

      {/* Mobile View (Cards) */}
      <div className="lg:hidden space-y-2.5">
        {users.length === 0 ? (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200/60 text-center">
            <UserIcon className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-[13px] font-bold text-slate-900 leading-tight">Aucun utilisateur trouvé</p>
            <p className="text-[11px] text-slate-500 mt-1">Commencez par ajouter votre premier utilisateur.</p>
          </div>
        ) : (
          users.map((user) => (
            <div key={user.id} className="bg-white p-3 rounded-xl shadow-sm border border-slate-200/60 flex flex-col gap-2.5">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-sm shrink-0">
                    <UserIcon className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-slate-900 leading-tight mb-0.5">{user.username}</div>
                    
                  </div>
                </div>
                <span className={`px-2 py-0.5 inline-flex text-[9px] font-bold rounded border items-center shrink-0
                  ${user.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-100' : user.role === 'controller' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                  {user.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                  {user.role === 'admin' ? 'Admin' : user.role === 'controller' ? 'Contrôleur' : 'Caissier'}
                </span>
              </div>
              <div className="pt-2.5 border-t border-slate-100 mt-1">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Créé le</div>
                <div className="text-[11px] font-bold text-slate-700">{formatDate(user.createdAt)}</div>
              </div>
              <div className="flex gap-2 pt-2.5 border-t border-slate-100 mt-1">
                <button onClick={() => { setFormError(''); setCurrentUser(user); setPassword(''); setIsModalOpen(true); }} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[11px] font-bold hover:bg-indigo-100 transition-colors border border-indigo-100">
                  <Edit className="h-3.5 w-3.5" /> Modifier
                </button>
                <button 
                  onClick={() => handleDelete(user.id)} 
                  disabled={user.username === 'admin'}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors border 
                    ${user.username === 'admin' ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'}`}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Supprimer
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop View (Table) */}
      <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Utilisateur</th>
                <th className="px-4 py-3 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Rôle</th>
                <th className="px-4 py-3 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Date de création</th>
                <th className="px-4 py-3 text-right text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100/80">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <UserIcon className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-[13px] font-bold text-slate-900 leading-tight">Aucun utilisateur trouvé</p>
                    <p className="text-[11px] text-slate-500 mt-1">Commencez par ajouter votre premier utilisateur.</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center mr-2.5 shadow-sm">
                          <UserIcon className="h-4 w-4 text-indigo-500" />
                        </div>
                        <div>
                          <div className="text-[12px] font-bold text-slate-900">{user.username}</div>
                          
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-[9px] font-bold rounded-md border items-center
                        ${user.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-100' : user.role === 'controller' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                        {user.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                        {user.role === 'admin' ? 'Administrateur' : user.role === 'controller' ? 'Contrôleur' : 'Caissier'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[11px] font-bold text-slate-700">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-[11px] font-medium">
                      <button onClick={() => { setFormError(''); setCurrentUser(user); setPassword(''); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors mr-1">
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" disabled={user.username === 'admin'}>
                        <Trash2 className={`h-3.5 w-3.5 ${user.username === 'admin' ? 'opacity-50 cursor-not-allowed' : ''}`} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 z-50 text-slate-900">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl border border-slate-100">
            <h2 className="text-lg font-extrabold text-slate-900 mb-4 tracking-tight">{currentUser.id ? 'Modifier' : 'Ajouter'} un utilisateur</h2>
            <form onSubmit={handleSave} className="space-y-3">
              {formError ? (
                <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-[11px] font-semibold text-rose-800 leading-snug">
                  {formError}
                </div>
              ) : null}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nom d'utilisateur</label>
                <input type="text" required minLength={STRING_LIMITS.username.min} maxLength={STRING_LIMITS.username.max} value={currentUser.username || ''} onChange={e => setCurrentUser({...currentUser, username: e.target.value})} className="block w-full px-2.5 py-2 bg-slate-50 border border-slate-200/60 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-[11px] font-medium text-slate-900 transition-all outline-none" disabled={currentUser.username === 'admin'} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Mot de passe {currentUser.id ? '(laisser vide pour ne pas changer)' : ''}</label>
                <input type="password" required={!currentUser.id} maxLength={STRING_LIMITS.password.max} value={password} onChange={e => setPassword(e.target.value)} className="block w-full px-2.5 py-2 bg-slate-50 border border-slate-200/60 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-[11px] font-medium text-slate-900 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Rôle</label>
                <select required value={currentUser.role || 'cashier'} onChange={e => setCurrentUser({...currentUser, role: e.target.value})} className="block w-full px-2.5 py-2 bg-slate-50 border border-slate-200/60 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-[11px] font-medium text-slate-900 transition-all outline-none" disabled={currentUser.username === 'admin'}>
                  <option value="cashier">Caissier</option>
                  <option value="controller">Contrôleur</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2 mt-6 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => { setFormError(''); setIsModalOpen(false); }} className="px-3 py-2 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-100 transition-colors">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-[11px] font-bold shadow-sm shadow-indigo-200 hover:bg-indigo-700 transition-all">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
