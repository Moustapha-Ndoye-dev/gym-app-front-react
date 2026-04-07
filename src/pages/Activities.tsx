import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Dumbbell, Search, Activity, X, ChevronRight } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { getApiErrorMessage } from '../lib/getApiErrorMessage';
import { STRING_LIMITS } from '../lib/stringLimits';
import { useConfirm } from '../context/ConfirmContext';
import { useNotification } from '../context/NotificationContext';

type ActivityType = {
  id: number;
  name: string;
  description: string;
};

export const Activities: React.FC = () => {
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<Partial<ActivityType>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [formError, setFormError] = useState('');

  const { confirm } = useConfirm();
  const { showNotification } = useNotification();

  useEffect(() => { fetchActivities(); }, []);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/api/activities');
      setActivities(res.data || []);
    } catch (error: unknown) {
      showNotification(
        getApiErrorMessage(error, 'Chargement des activités'),
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const name = String(currentActivity.name ?? '').trim();
    const description = String(currentActivity.description ?? '').trim();
    if (name.length < STRING_LIMITS.labelName.min) {
      const msg = "Indiquez le nom de l'activité (au moins 2 caractères).";
      setFormError(msg);
      showNotification(msg, 'error', 8000);
      return;
    }
    if (name.length > STRING_LIMITS.labelName.max) {
      const msg = `Le nom ne peut pas dépasser ${STRING_LIMITS.labelName.max} caractères.`;
      setFormError(msg);
      showNotification(msg, 'error', 8000);
      return;
    }
    if (description.length > STRING_LIMITS.description.max) {
      const msg = `La description ne peut pas dépasser ${STRING_LIMITS.description.max} caractères.`;
      setFormError(msg);
      showNotification(msg, 'error', 8000);
      return;
    }
    const method = currentActivity.id ? 'put' : 'post';
    const url = currentActivity.id ? `/api/activities/${currentActivity.id}` : '/api/activities';
    try {
      await axiosInstance[method.toLowerCase() as 'put' | 'post'](url, {
        name,
        description,
      });
      setIsModalOpen(false);
      setFormError('');
      fetchActivities();
      showNotification('Succès', 'success');
    } catch (error: unknown) {
      const msg = getApiErrorMessage(error, 'Enregistrement de l’activité');
      setFormError(msg);
      showNotification(msg, 'error', 8000);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    confirm({
      title: 'Supprimer',
      message: `Retirer "${name}" ?`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await axiosInstance.delete(`/api/activities/${id}`);
          fetchActivities();
          showNotification('Supprimée', 'success');
        } catch (error: unknown) {
          showNotification(
            getApiErrorMessage(error, 'Suppression de l’activité'),
            'error'
          );
        }
      }
    });
  };

  const filtered = activities.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 text-slate-900">
      {/* Header Compact */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 text-white">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-black uppercase tracking-tight leading-none">Activités</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Catalogue des disciplines</p>
          </div>
        </div>
        <button 
          onClick={() => {
            setCurrentActivity({ name: '', description: '' });
            setFormError('');
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl shadow-md transition-all font-black uppercase tracking-widest text-[9px] flex items-center gap-2"
        >
          <Plus className="h-3.5 w-3.5" /> Nouvelle
        </button>
      </div>

      {/* Main Grid */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-4 border-b border-slate-50 bg-slate-50/30">
          <div className="relative w-full max-w-xs group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-indigo-600" />
            <input type="text" placeholder="Filtrer..." value={searchTerm} onChange={e => {setSearchTerm(e.target.value); setCurrentPage(1);}} className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" />
          </div>
        </div>

        {loading ? (
          <div className="p-20 text-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
        ) : (
          <div className="p-6">
            {filtered.length === 0 ? (
              <div className="py-20 text-center space-y-4 px-4">
                <Dumbbell className="h-16 w-16 text-slate-200 mx-auto" />
                <p className="text-sm font-black uppercase tracking-widest text-slate-500">
                  {activities.length === 0 ? 'Aucune activité pour le moment' : 'Aucun résultat pour ce filtre'}
                </p>
                <p className="text-[11px] font-bold text-slate-400 max-w-sm mx-auto leading-relaxed">
                  {activities.length === 0
                    ? 'Ajoutez votre première discipline avec le bouton « Nouvelle ».'
                    : 'Modifiez ou effacez le texte de recherche pour voir toute la liste.'}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {paginated.map(activity => (
                    <div key={activity.id} className="group bg-slate-50 border border-slate-100 p-4 rounded-2xl hover:bg-white hover:shadow-xl hover:border-indigo-200 transition-all duration-300 border-l-4 border-l-indigo-500 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <h3 className="text-[13px] font-black text-slate-900 leading-tight group-hover:text-indigo-600 truncate">{activity.name}</h3>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setCurrentActivity(activity); setFormError(''); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit className="h-3.5 w-3.5" /></button>
                            <button onClick={() => handleDelete(activity.id, activity.name)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 leading-relaxed line-clamp-2">
                          {activity.description || 'Aucune description disponible.'}
                        </p>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">Opérationnel</span>
                        <ChevronRight className="h-3 w-3 text-slate-300 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-center gap-1 mt-8">
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-7 h-7 rounded-lg text-[9px] font-black transition-all ${currentPage === i + 1 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>{i + 1}</button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] p-8 max-w-xs w-full shadow-2xl relative text-slate-900">
            <h2 className="text-base font-black uppercase mb-6 tracking-tight">{currentActivity.id ? 'Modifier' : 'Nouvelle'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              {formError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[11px] font-semibold leading-snug text-rose-800"
                >
                  {formError}
                </div>
              )}
              <input
                placeholder="Nom de l'activité"
                minLength={STRING_LIMITS.labelName.min}
                maxLength={STRING_LIMITS.labelName.max}
                required
                value={currentActivity.name || ''}
                onChange={(e) => {
                  setFormError('');
                  setCurrentActivity({ ...currentActivity, name: e.target.value });
                }}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-bold outline-none focus:border-indigo-600"
              />
              <textarea
                placeholder="Description"
                maxLength={STRING_LIMITS.description.max}
                value={currentActivity.description || ''}
                onChange={(e) => {
                  setFormError('');
                  setCurrentActivity({ ...currentActivity, description: e.target.value });
                }}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-bold outline-none resize-none h-24"
              />
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormError('');
                    setIsModalOpen(false);
                  }}
                  className="flex-1 py-2 text-[10px] font-black uppercase text-slate-400"
                >
                  Annuler
                </button>
                <button type="submit" className="flex-[2] py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-indigo-600 shadow-lg">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};