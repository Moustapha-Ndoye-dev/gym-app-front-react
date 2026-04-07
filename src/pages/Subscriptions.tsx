import React, { useEffect, useState } from 'react';
import { CreditCard, Edit, Plus, Trash2 } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { getApiErrorMessage } from '../lib/getApiErrorMessage';
import { STRING_LIMITS } from '../lib/stringLimits';
import { useConfirm } from '../context/ConfirmContext';
import { useNotification } from '../context/NotificationContext';

type ActivityLite = { id: number; name: string };

type Subscription = {
  id: number;
  name: string;
  features: string;
  price: number;
  activities?: ActivityLite[];
};

type SubscriptionForm = Partial<Subscription> & { activityIds?: number[] };

export const Subscriptions: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [activitiesList, setActivitiesList] = useState<ActivityLite[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSub, setCurrentSub] = useState<SubscriptionForm>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');

  const { confirm } = useConfirm();
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchData();
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const res = await axiosInstance.get<ActivityLite[]>('/api/activities');
      setActivitiesList(Array.isArray(res.data) ? res.data : []);
    } catch {
      setActivitiesList([]);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setLoadError('');

    try {
      const res = await axiosInstance.get('/api/subscriptions');
      setSubscriptions(res.data || []);
    } catch (error: unknown) {
      console.error('Error fetching data:', error);
      const message = getApiErrorMessage(error, 'Chargement des abonnements');
      setSubscriptions([]);
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleActivity = (id: number) => {
    const cur = currentSub.activityIds ?? [];
    if (cur.includes(id)) {
      setCurrentSub({ ...currentSub, activityIds: cur.filter((x) => x !== id) });
    } else {
      setCurrentSub({ ...currentSub, activityIds: [...cur, id] });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    const ids = currentSub.activityIds ?? [];
    const name = String(currentSub.name ?? '').trim();
    const priceNum = Number(currentSub.price);
    const price = Number.isFinite(priceNum) ? priceNum : 0;

    const features = String(currentSub.features ?? '').trim();
    if (name.length < STRING_LIMITS.labelName.min) {
      const msg = "Indiquez un nom d'abonnement (au moins 2 caractères).";
      setSaveError(msg);
      showNotification(msg, 'error');
      return;
    }
    if (name.length > STRING_LIMITS.labelName.max) {
      const msg = `Le nom ne peut pas dépasser ${STRING_LIMITS.labelName.max} caractères.`;
      setSaveError(msg);
      showNotification(msg, 'error');
      return;
    }
    if (features.length > STRING_LIMITS.description.max) {
      const msg = `La description ne peut pas dépasser ${STRING_LIMITS.description.max} caractères.`;
      setSaveError(msg);
      showNotification(msg, 'error');
      return;
    }
    if (price <= 0) {
      const msg = 'Indiquez un prix valide supérieur à 0.';
      setSaveError(msg);
      showNotification(msg, 'error');
      return;
    }

    const method = currentSub.id ? 'put' : 'post';
    const url = currentSub.id
      ? `/api/subscriptions/${currentSub.id}`
      : '/api/subscriptions';

    try {
      await axiosInstance[method](url, {
        name,
        price,
        features,
        activityIds: ids,
      });
      setIsModalOpen(false);
      setCurrentSub({});
      setSaveError('');
      await fetchData();
      showNotification('Abonnement enregistre avec succes', 'success');
    } catch (error: unknown) {
      console.error('Error saving subscription:', error);
      showNotification(
        getApiErrorMessage(error, 'Enregistrement de l’abonnement'),
        'error'
      );
    }
  };

  const handleDelete = async (id: number) => {
    confirm({
      title: "Supprimer l'abonnement",
      message:
        'Voulez-vous vraiment supprimer cet abonnement ? Cette action est irreversible.',
      confirmText: 'Supprimer',
      onConfirm: async () => {
        try {
          await axiosInstance.delete(`/api/subscriptions/${id}`);
          await fetchData();
          showNotification('Abonnement supprime avec succes', 'success');
        } catch (error: unknown) {
          console.error('Error deleting subscription:', error);
          showNotification(
            getApiErrorMessage(error, 'Suppression de l’abonnement'),
            'error'
          );
        }
      },
    });
  };

  const renderEmptyState = () => (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200/60 text-center">
      <CreditCard className="h-10 w-10 text-slate-300 mx-auto mb-3" />
      <p className="text-[13px] font-bold text-slate-900 leading-tight">
        Aucun abonnement trouve
      </p>
      <p className="text-[11px] text-slate-500 mt-1">
        Commencez par ajouter votre premier abonnement.
      </p>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Abonnements
          </h1>
          <p className="text-slate-500 text-[11px] sm:text-[12px] font-medium mt-0.5">
            Gere les formules d&apos;abonnement de la salle.
          </p>
        </div>
        <button
          onClick={() => {
            setSaveError('');
            setCurrentSub({
              name: '',
              features: '',
              price: 0,
              activityIds: [],
            });
            setIsModalOpen(true);
          }}
          className="bg-indigo-600 text-white px-3 py-2 rounded-lg flex items-center justify-center shadow-sm shadow-indigo-200 hover:bg-indigo-700 transition-all text-[11px] font-bold w-full sm:w-auto"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Nouvel Abonnement
        </button>
      </div>

      {loadError && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[12px] font-bold text-rose-700">
              Chargement impossible
            </p>
            <p className="text-[11px] text-rose-600 mt-0.5">{loadError}</p>
          </div>
          <button
            onClick={fetchData}
            className="shrink-0 px-3 py-2 rounded-lg bg-white border border-rose-200 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition-colors"
          >
            Reessayer
          </button>
        </div>
      )}

      <div className="lg:hidden space-y-2.5">
        {loading ? (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200/60 text-center">
            <p className="text-[12px] font-bold text-slate-500">
              Chargement des abonnements...
            </p>
          </div>
        ) : subscriptions.length === 0 ? (
          renderEmptyState()
        ) : (
          subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="bg-white p-3 rounded-xl shadow-sm border border-slate-200/60 flex flex-col gap-2.5"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-sm shrink-0">
                    <CreditCard className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-slate-900 leading-tight mb-0.5">
                      {sub.name}
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 line-clamp-1">
                      {sub.features || 'Sans description'}
                    </div>
                    {sub.activities && sub.activities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {sub.activities.map((a) => (
                          <span
                            key={a.id}
                            className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100"
                          >
                            {a.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="pt-2.5 border-t border-slate-100 mt-1">
                <div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    Prix
                  </div>
                  <div className="text-[13px] font-extrabold text-emerald-600">
                    {sub.price.toLocaleString()} FCFA
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2.5 border-t border-slate-100 mt-1">
                <button
                  onClick={() => {
                    setSaveError('');
                    setCurrentSub({
                      ...sub,
                      activityIds: sub.activities?.map((a) => a.id) ?? [],
                    });
                    setIsModalOpen(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[11px] font-bold hover:bg-indigo-100 transition-colors border border-indigo-100"
                >
                  <Edit className="h-3.5 w-3.5" /> Modifier
                </button>
                <button
                  onClick={() => handleDelete(sub.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-red-50 text-red-600 rounded-lg text-[11px] font-bold hover:bg-red-100 transition-colors border border-red-100"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Supprimer
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Abonnement
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Prix
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Activités
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100/80">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <p className="text-[12px] font-bold text-slate-500">
                      Chargement des abonnements...
                    </p>
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <CreditCard className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-[13px] font-bold text-slate-900 leading-tight">
                      Aucun abonnement trouve
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Commencez par ajouter votre premier abonnement.
                    </p>
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr
                    key={sub.id}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center mr-2.5 shadow-sm">
                          <CreditCard className="h-4 w-4 text-indigo-500" />
                        </div>
                        <div className="text-[12px] font-bold text-slate-900">
                          {sub.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-[12px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                        {sub.price.toLocaleString()} FCFA
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {sub.activities && sub.activities.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {sub.activities.map((a) => (
                            <span
                              key={a.id}
                              className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100 whitespace-nowrap"
                            >
                              {a.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[10px] font-medium text-slate-500 line-clamp-1 max-w-xs">
                        {sub.features || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-[11px] font-medium">
                      <button
                        onClick={() => {
                          setSaveError('');
                          setCurrentSub({
                            ...sub,
                            activityIds: sub.activities?.map((a) => a.id) ?? [],
                          });
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors mr-1"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(sub.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 z-50">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-extrabold text-slate-900 mb-4 tracking-tight">
              {currentSub.id ? 'Modifier' : 'Ajouter'} un abonnement
            </h2>
            <form onSubmit={handleSave} className="space-y-3">
              {saveError ? (
                <div
                  role="alert"
                  className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-[11px] font-semibold text-rose-800"
                >
                  {saveError}
                </div>
              ) : null}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nom de l&apos;abonnement
                </label>
                <input
                  type="text"
                  required
                  minLength={STRING_LIMITS.labelName.min}
                  maxLength={STRING_LIMITS.labelName.max}
                  value={currentSub.name || ''}
                  onChange={(e) =>
                    setCurrentSub({ ...currentSub, name: e.target.value })
                  }
                  className="block w-full px-2.5 py-2 bg-slate-50 border border-slate-200/60 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-[11px] font-medium text-slate-900 transition-all outline-none"
                  placeholder="Ex: Pass Premium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Prix (FCFA)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  value={currentSub.price || ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setCurrentSub({
                      ...currentSub,
                      price: raw === '' ? 0 : parseFloat(raw),
                    });
                  }}
                  className="block w-full px-2.5 py-2 bg-slate-50 border border-slate-200/60 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-[11px] font-medium text-slate-900 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={currentSub.features || ''}
                  maxLength={STRING_LIMITS.description.max}
                  onChange={(e) =>
                    setCurrentSub({ ...currentSub, features: e.target.value })
                  }
                  className="block w-full px-2.5 py-2 bg-slate-50 border border-slate-200/60 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-[11px] font-medium text-slate-900 transition-all outline-none resize-none h-24"
                  placeholder="Details de l'abonnement..."
                />
              </div>

              <div>
                <p className="block text-[11px] font-bold text-slate-700 mb-1">
                  Activités incluses{' '}
                  <span className="text-slate-400 font-medium normal-case">
                    (optionnel)
                  </span>
                </p>
                <p className="text-[10px] text-slate-500 mb-2">
                  Ces disciplines apparaîtront sur la fiche des adhérents ayant cette formule.
                </p>
                {activitiesList.length === 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] font-semibold text-amber-900">
                    Aucune activité enregistrée. Créez-en dans le menu « Activités » avant de lier un abonnement.
                  </div>
                ) : (
                  <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-200/80 bg-slate-50/80 p-2 space-y-2">
                    {activitiesList.map((a) => (
                      <label
                        key={a.id}
                        className="flex items-center gap-2 text-[11px] font-medium text-slate-800 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={(currentSub.activityIds ?? []).includes(a.id)}
                          onChange={() => toggleActivity(a.id)}
                        />
                        <span>{a.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 mt-6 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSaveError('');
                    setIsModalOpen(false);
                  }}
                  className="px-3 py-2 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-[11px] font-bold shadow-sm shadow-indigo-200 hover:bg-indigo-700 transition-all"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
