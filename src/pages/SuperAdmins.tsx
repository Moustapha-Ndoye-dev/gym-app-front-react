import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserPlus, Trash2, X, Key, User, RefreshCw } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { getApiErrorMessage } from '../lib/getApiErrorMessage';
import { useNotification } from '../context/NotificationContext';
import { useConfirm } from '../context/ConfirmContext';

type SuperAdminData = {
  id: number;
  username: string;
  createdAt: string;
};

export const SuperAdmins: React.FC = () => {
  const [admins, setAdmins] = useState<SuperAdminData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', email: '' });

  const { showNotification } = useNotification();
  const { confirm } = useConfirm();

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/api/super/admins');
      setAdmins(res.data);
    } catch (e: unknown) {
      showNotification(
        getApiErrorMessage(e, 'Chargement des super-administrateurs'),
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const openAddModal = () => {
    setNewAdmin({ username: '', password: '', email: '' }); // Force reset
    setIsModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axiosInstance.post('/api/super/admins', newAdmin);
      setIsModalOpen(false);
      setNewAdmin({ username: '', password: '', email: '' });
      fetchAdmins();
      showNotification('Nouveau SuperAdmin créé', 'success');
    } catch (e: unknown) {
      showNotification(
        getApiErrorMessage(e, 'Création du super-administrateur'),
        'error'
      );
    }
  };

  const handleDelete = (id: number) => {
    confirm({
      title: 'Révoquer l\'accès Root',
      message: 'Êtes-vous sûr de vouloir supprimer ce compte SuperAdmin ?',
      confirmText: 'Révoquer',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await axiosInstance.delete(`/api/super/admins/${id}`);
          fetchAdmins();
          showNotification('Accès révoqué', 'success');
        } catch (e: unknown) {
          showNotification(
            getApiErrorMessage(e, 'Révocation du super-administrateur'),
            'error'
          );
        }
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Unified Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-slate-900">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-rose-500 shadow-lg shadow-rose-100">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight uppercase">Utilisateurs Système</h1>
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mt-1 opacity-60">Gestion des privilèges Root</p>
          </div>
        </div>
        <button onClick={openAddModal} className="px-5 py-2.5 bg-slate-900 hover:bg-rose-600 text-white rounded-xl shadow-lg transition-all font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
          <UserPlus className="h-3.5 w-3.5" /> Nouvel Admin Root
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <Key className="h-5 w-5" />
              <p className="text-xs font-black uppercase tracking-widest">Zone Critique</p>
            </div>
            <p className="text-[11px] text-rose-800 font-medium leading-relaxed">
              Les administrateurs Root disposent d'un contrôle total sur l'infrastructure SaaS.
            </p>
            <ul className="space-y-2 text-[10px] font-bold text-rose-700/70 uppercase tracking-wide">
              <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-rose-400"></div> Créer des salles</li>
              <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-rose-400"></div> Tarifs SaaS</li>
              <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-rose-400"></div> Suspensions</li>
            </ul>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden text-slate-900">
            <div className="p-4 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center text-slate-900">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Administrateurs Actifs</span>
              <button onClick={fetchAdmins} className="p-1.5 hover:bg-white rounded-lg text-slate-300 transition-all text-slate-900"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /></button>
            </div>
            
            {loading ? (
              <div className="p-20 text-center"><div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
            ) : (
              <div className="divide-y divide-slate-50 text-slate-900">
                {admins.map(admin => (
                  <div key={admin.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group text-slate-900">
                    <div className="flex items-center gap-4 text-slate-900">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-900 border border-slate-200 uppercase text-xs">{admin.username.charAt(0)}</div>
                      <div className="text-slate-900">
                        <p className="text-[13px] font-black text-slate-900 leading-none mb-1">{admin.username}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Inscrit le {new Date(admin.createdAt).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-900">
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[8px] font-black rounded-lg border border-emerald-100 uppercase">Root</span>
                      {admin.username !== 'superadmin' && (
                        <button onClick={() => handleDelete(admin.id)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200 text-slate-900">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in duration-200 relative overflow-hidden">
            <h2 className="text-lg font-black mb-6 uppercase tracking-tight text-slate-900">Nouvel Admin Root</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Identifiant</label>
                <input required type="text" value={newAdmin.username} onChange={e => setNewAdmin({...newAdmin, username: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:bg-white focus:ring-4 focus:ring-rose-500/10 outline-none transition-all text-slate-900 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Email</label>
                <input required type="email" value={newAdmin.email} onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:bg-white focus:ring-4 focus:ring-rose-500/10 outline-none transition-all text-slate-900 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Mot de passe</label>
                <input required type="password" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:bg-white focus:ring-4 focus:ring-rose-500/10 outline-none transition-all text-slate-900 text-sm" />
              </div>
              <div className="pt-4 flex flex-col gap-2">
                <button type="submit" className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] hover:bg-indigo-600 transition-all shadow-xl tracking-widest">Créer l'accès Root</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full py-2 text-[10px] font-bold text-slate-400 uppercase hover:text-slate-600 transition-colors">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
