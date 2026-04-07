import React, { useState, useEffect, useMemo } from 'react';
import { Edit, Trash2, Check, Key, Ban, Building2, ChevronLeft, ChevronRight, DollarSign, Tag, Clock, Calendar } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { getApiErrorMessage } from '../lib/getApiErrorMessage';
import { useConfirm } from '../context/ConfirmContext';
import { useNotification } from '../context/NotificationContext';

type Gym = { id: number; name: string; email: string; status: 'ACTIVE' | 'BLOCKED'; saasFee: number; subscriptionEnd: string; };

export const SuperSubscriptions: React.FC = () => {
  const [gyms, setGyms] = useState<Gym[]>([]); 
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [isDurationModalOpen, setIsDurationModalOpen] = useState(false);
  const [currentGym, setCurrentGym] = useState<Partial<Gym>>({});
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const { confirm } = useConfirm();
  const { showNotification } = useNotification();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const gymsRes = await axiosInstance.get('/api/super/gyms');
      setGyms(gymsRes.data);
    } catch (e: unknown) {
      setGyms([]);
      showNotification(
        getApiErrorMessage(e, 'Chargement des salles (super)'),
        'error'
      );
    }
    finally { setLoading(false); }
  };

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axiosInstance.put(`/api/super/gyms/${currentGym.id}`, { saasFee: currentGym.saasFee });
      setIsPriceModalOpen(false);
      fetchData();
      showNotification('Prix de redevance mis à jour', 'success');
    } catch (e: unknown) {
      showNotification(
        getApiErrorMessage(e, 'Mise à jour de la redevance'),
        'error'
      );
    }
  };

  const startActivation = (gym: Gym) => {
    setCurrentGym(gym);
    setIsDurationModalOpen(true);
  };

  const handleActivateWithDuration = async (months: number) => {
    if (!currentGym.id) return;
    
    const newEnd = new Date();
    newEnd.setMonth(newEnd.getMonth() + months);
    
    try {
      await axiosInstance.put(`/api/super/gyms/${currentGym.id}`, { 
        subscriptionEnd: newEnd.toISOString(), 
        status: 'ACTIVE' 
      });
      setIsDurationModalOpen(false);
      fetchData();
      showNotification(`Accès activé pour ${months} mois`, 'success');
    } catch (e: unknown) {
      showNotification(
        getApiErrorMessage(e, 'Activation de la salle'),
        'error'
      );
    }
  };

  const toggleBlockGym = async (gym: Gym) => {
    const isBlocking = gym.status === 'ACTIVE';
    confirm({
      title: isBlocking ? 'Bloquer' : 'Débloquer',
      message: `Changer le statut de ${gym.name} ?`,
      confirmText: isBlocking ? 'Bloquer (🚫)' : 'Autoriser',
      variant: isBlocking ? 'danger' : undefined,
      onConfirm: async () => {
        try {
          await axiosInstance.put(`/api/super/gyms/${gym.id}`, { status: isBlocking ? 'BLOCKED' : 'ACTIVE' });
          fetchData();
          showNotification(`Statut mis à jour`, 'success');
        } catch (e: unknown) {
          showNotification(
            getApiErrorMessage(e, 'Changement de statut de la salle'),
            'error'
          );
        }
      }
    });
  };

  const totalPages = Math.ceil(gyms.length / itemsPerPage);
  const currentGyms = useMemo(() => gyms.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [gyms, currentPage]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* SUIVI DES ACTIVATIONS */}
      <section className="space-y-4">
        <div className="px-2">
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Suivi des Activations</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Gestion financière des salles</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Salle</th>
                  <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Échéance</th>
                  <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Redevance</th>
                  <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">État</th>
                  <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {currentGyms.map((gym) => {
                  const isExpired = new Date(gym.subscriptionEnd) < new Date();
                  return (
                    <tr key={gym.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${gym.status === 'ACTIVE' ? 'bg-slate-900' : 'bg-rose-500'}`}>
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-bold text-slate-900 leading-tight truncate">{gym.name}</p>
                            <p className="text-[9px] font-medium text-slate-400 truncate">{gym.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className={`text-[11px] font-black ${isExpired ? 'text-rose-600' : 'text-slate-900'}`}>
                            {new Date(gym.subscriptionEnd).toLocaleDateString('fr-FR')}
                          </span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase">{isExpired ? 'Expiré' : 'Valide'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 group">
                          <span className="text-[11px] font-black text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
                            {gym.saasFee.toLocaleString()} CFA
                          </span>
                          <button onClick={() => { setCurrentGym(gym); setIsPriceModalOpen(true); }} className="p-1 hover:bg-slate-200 rounded text-slate-400">
                            <Tag className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black border uppercase tracking-tighter ${gym.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                          {gym.status === 'ACTIVE' ? 'Actif' : 'Bloqué'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5 text-slate-900">
                          <button onClick={() => { setCurrentGym(gym); setIsPriceModalOpen(true); }} className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Modifier Redevance">
                            <DollarSign className="h-3.5 w-3.5" />
                          </button>
                          {(isExpired || gym.status === 'BLOCKED') && (
                            <button onClick={() => startActivation(gym)} className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all" title="Activer (🔑 Choice)">
                              <Key className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => toggleBlockGym(gym)} className={`p-2 rounded-xl transition-all ${gym.status === 'ACTIVE' ? 'bg-rose-50 text-rose-400 hover:bg-rose-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`} title={gym.status === 'ACTIVE' ? 'Bloquer (🚫)' : 'Débloquer'}>
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Page {currentPage} / {totalPages}</span>
              <div className="flex gap-2">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-30"><ChevronLeft className="h-3.5 w-3.5" /></button>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-30"><ChevronRight className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* MODAL DURÉE ACTIVATION */}
      {isDurationModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in duration-200 border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600"><Key className="h-6 w-6" /></div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Activer l'accès</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Choisir la durée pour {currentGym.name}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-8">
              {[
                { label: '1 Mois', val: 1, desc: 'Standard' },
                { label: '3 Mois', val: 3, desc: 'Trimestriel' },
                { label: '6 Mois', val: 6, desc: 'Semestriel' },
                { label: '12 Mois', val: 12, desc: 'Annuel' },
              ].map((d) => (
                <button key={d.val} onClick={() => handleActivateWithDuration(d.val)} className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-3xl border border-slate-100 transition-all group">
                  <span className="text-[13px] font-black">{d.label}</span>
                  <span className="text-[8px] font-bold uppercase opacity-50 group-hover:opacity-100">{d.desc}</span>
                </button>
              ))}
            </div>

            <button onClick={() => setIsDurationModalOpen(false)} className="w-full py-3 text-[11px] font-black uppercase text-slate-400 hover:text-rose-600 transition-colors tracking-widest">Annuler</button>
          </div>
        </div>
      )}

      {/* MODAL PRIX REDEVANCE */}
      {isPriceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-slate-900">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-lg font-black mb-5 uppercase tracking-tight">Modifier Redevance</h2>
            <form onSubmit={handleUpdatePrice} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 text-slate-900">Nouveau Tarif Mensuel (CFA)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input required type="number" value={currentGym.saasFee || ''} onChange={e => setCurrentGym({...currentGym, saasFee: parseFloat(e.target.value)})} className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all text-slate-900" />
                </div>
              </div>
              <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] hover:bg-indigo-600 transition-all shadow-xl">Appliquer le tarif</button>
              <button type="button" onClick={() => setIsPriceModalOpen(false)} className="w-full py-2 text-[10px] font-bold text-slate-400 uppercase">Annuler</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
