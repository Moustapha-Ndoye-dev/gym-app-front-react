import React, { useState, useEffect } from 'react';
import { Building2, Edit, Trash2, RotateCcw } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { getApiErrorMessage } from '../lib/getApiErrorMessage';
import { useConfirm } from '../context/ConfirmContext';
import { useNotification } from '../context/NotificationContext';

type Gym = {
  id: number;
  name: string;
  email: string;
  status: 'ACTIVE' | 'BLOCKED';
  saasFee: number;
  subscriptionEnd: string;
};

export const SuperGyms: React.FC = () => {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentGym, setCurrentGym] = useState<Partial<Gym>>({});
  const { confirm } = useConfirm();
  const { showNotification } = useNotification();

  useEffect(() => { fetchGyms(); }, []);

  const fetchGyms = async () => {
    try {
      const res = await axiosInstance.get('/api/super/gyms');
      setGyms(res.data);
    } catch (e: unknown) {
      showNotification(getApiErrorMessage(e, 'Chargement des salles'), 'error');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axiosInstance.put(`/api/super/gyms/${currentGym.id}`, currentGym);
      setIsModalOpen(false);
      fetchGyms();
      showNotification('Configuration mise à jour', 'success');
    } catch (e: unknown) {
      showNotification(
        getApiErrorMessage(e, 'Mise à jour de la salle'),
        'error'
      );
    }
  };

  const handleDelete = async (id: number) => {
    confirm({
      title: 'Supprimer la salle',
      message: 'Attention: Cette action supprimera définitivement la salle et toutes ses données.',
      confirmText: 'Supprimer',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await axiosInstance.delete(`/api/super/gyms/${id}`);
          fetchGyms();
          showNotification('Salle supprimée', 'success');
        } catch (e: unknown) {
          showNotification(
            getApiErrorMessage(e, 'Suppression de la salle'),
            'error'
          );
        }
      }
    });
  };

  const resetTrial = async (gym: Gym) => {
    const newEnd = new Date();
    newEnd.setDate(newEnd.getDate() + 15);
    confirm({
      title: 'Réactiver l\'essai',
      message: `Offrir 15 jours d'essai à ${gym.name} ?`,
      confirmText: 'Réactiver (15j)',
      onConfirm: async () => {
        try {
          await axiosInstance.put(`/api/super/gyms/${gym.id}`, { subscriptionEnd: newEnd.toISOString(), status: 'ACTIVE' });
          fetchGyms();
          showNotification('Essai réactivé', 'success');
        } catch (e: unknown) {
          showNotification(
            getApiErrorMessage(e, 'Réactivation de l’essai gratuit'),
            'error'
          );
        }
      }
    });
  };

  const getRemainingDays = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-slate-900">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase">Gestion des Enseignes</h1>
          <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mt-1">Répertoire technique des salles du réseau</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden text-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-slate-900">
            <thead className="bg-slate-50/50 text-slate-400">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">Enseigne</th>
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">Compte à Rebours</th>
                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-900">
              {gyms.map((gym) => {
                const days = getRemainingDays(gym.subscriptionEnd);
                const isExpired = days === 0;
                return (
                  <tr key={gym.id} className="hover:bg-slate-50/50 transition-all group text-slate-900">
                    <td className="px-6 py-4 text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${gym.status === 'ACTIVE' ? 'bg-slate-900' : 'bg-rose-500'}`}>
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[13px] font-black text-slate-900 leading-tight">{gym.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5">{gym.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-900">
                      <div className="flex flex-col">
                        <span className={`text-[13px] font-black ${isExpired ? 'text-rose-600' : 'text-slate-900'}`}>
                          {days} jours restants
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase italic">Expire le {new Date(gym.subscriptionEnd).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {isExpired && (
                          <button onClick={() => resetTrial(gym)} className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-all" title="Réactiver 15 jours d'essai">
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => handleDelete(gym.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-all" title="Supprimer">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-slate-900">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-xl font-black mb-6 uppercase tracking-tight text-slate-900">Paramètres Salle</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5 text-slate-900">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nom Enseigne</label>
                <input type="text" value={currentGym.name || ''} onChange={e => setCurrentGym({...currentGym, name: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold focus:bg-white focus:ring-4 focus:ring-rose-500/10 outline-none transition-all text-slate-900" />
              </div>
              <div className="space-y-1.5 text-slate-900">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Email contact</label>
                <input type="email" value={currentGym.email || ''} onChange={e => setCurrentGym({...currentGym, email: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold focus:bg-white focus:ring-4 focus:ring-rose-500/10 outline-none transition-all text-slate-900" />
              </div>
              <div className="pt-4 flex gap-3 text-slate-900">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-50 rounded-2xl text-[11px] font-black uppercase text-slate-400 hover:bg-slate-100 transition-all">Annuler</button>
                <button type="submit" className="flex-[2] py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] hover:bg-rose-600 transition-all shadow-xl">Valider</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
