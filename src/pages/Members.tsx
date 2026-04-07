import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Search, 
  User, 
  QrCode, 
  Trash2, 
  Phone, 
  Calendar, 
  X as XIcon,
  Printer,
  RefreshCw,
  Download
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import axiosInstance from '../api/axiosInstance';
import { getApiErrorMessage } from '../lib/getApiErrorMessage';
import { STRING_LIMITS } from '../lib/stringLimits';
import { useConfirm } from '../context/ConfirmContext';
import { useNotification } from '../context/NotificationContext';

type Subscription = {
  id: number;
  name: string;
  price: number;
  activities?: { id: number; name: string }[];
};

type Member = {
  id: number;
  firstName?: string;
  lastName?: string;
  phone: string;
  email: string;
  registrationDate?: string;
  expiryDate?: string;
  photo?: string;
  subscription?: Subscription;
  subscriptionId?: number;
};

export const Members: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isExpiryModalOpen, setIsExpiryModalOpen] = useState(false);
  const [currentMember, setCurrentMember] = useState<Partial<Member>>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    subscriptionId: undefined
  });
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [memberFormError, setMemberFormError] = useState('');

  const { confirm } = useConfirm();
  const { showNotification } = useNotification();

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPhotoPreview(base64String);
        setCurrentMember(prev => ({ ...prev, photo: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [membersRes, subsRes] = await Promise.all([
        axiosInstance.get('/api/members'),
        axiosInstance.get('/api/subscriptions')
      ]);
      setMembers(membersRes.data || []);
      setSubscriptions(subsRes.data || []);
    } catch (error: unknown) {
      console.error('Error fetching members:', error);
      const message = getApiErrorMessage(
        error,
        'Chargement des adhérents et abonnements'
      );
      setMembers([]);
      setSubscriptions([]);
      setLoadError(message);
      showNotification(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault();
    setMemberFormError('');
    const isEditing = Boolean(currentMember.id);
    const fn = String(currentMember.firstName ?? '').trim();
    const ln = String(currentMember.lastName ?? '').trim();
    const phone = String(currentMember.phone ?? '').trim();

    if (fn.length < STRING_LIMITS.personName.min) {
      const msg = 'Le prénom doit contenir au moins 2 caractères.';
      setMemberFormError(msg);
      showNotification(msg, 'error');
      return;
    }
    if (fn.length > STRING_LIMITS.personName.max) {
      const msg = `Le prénom ne peut pas dépasser ${STRING_LIMITS.personName.max} caractères.`;
      setMemberFormError(msg);
      showNotification(msg, 'error');
      return;
    }
    if (ln.length < STRING_LIMITS.personName.min) {
      const msg = 'Le nom doit contenir au moins 2 caractères.';
      setMemberFormError(msg);
      showNotification(msg, 'error');
      return;
    }
    if (ln.length > STRING_LIMITS.personName.max) {
      const msg = `Le nom ne peut pas dépasser ${STRING_LIMITS.personName.max} caractères.`;
      setMemberFormError(msg);
      showNotification(msg, 'error');
      return;
    }
    if (!phone) {
      const msg = 'Indiquez un numéro de téléphone.';
      setMemberFormError(msg);
      showNotification(msg, 'error');
      return;
    }
    if (phone.length > STRING_LIMITS.memberPhone.max) {
      const msg = `Le téléphone ne peut pas dépasser ${STRING_LIMITS.memberPhone.max} caractères.`;
      setMemberFormError(msg);
      showNotification(msg, 'error');
      return;
    }
    if (
      !isEditing &&
      (!currentMember.subscriptionId || currentMember.subscriptionId < 1)
    ) {
      const msg = "Choisissez une formule d'abonnement.";
      setMemberFormError(msg);
      showNotification(msg, 'error');
      return;
    }

    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing ? `/api/members/${currentMember.id}` : '/api/members';

    const commonMemberData = {
      firstName: fn,
      lastName: ln,
      phone,
      photo: currentMember.photo,
      subscriptionId: currentMember.subscriptionId,
    };

    const dataToSave = isEditing
      ? { ...commonMemberData, expiryDate: currentMember.expiryDate }
      : { ...commonMemberData, durationMonths };

    try {
      await axiosInstance[method.toLowerCase() as 'put' | 'post'](url, dataToSave);
      setIsModalOpen(false);
      setMemberFormError('');
      fetchData();
      showNotification(currentMember.id ? 'Fiche mise a jour' : 'Adherent enregistre', 'success');
    } catch (error: unknown) {
      console.error('Error saving member:', error);
      showNotification(
        getApiErrorMessage(error, 'Enregistrement de l’adhérent'),
        'error'
      );
    }
  };

  const handleUpdateExpiry = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault();
    if (!currentMember.id) return;
    if (!newExpiryDate?.trim()) {
      showNotification('Choisissez une date d’expiration.', 'error');
      return;
    }
    try {
      await axiosInstance.put(`/api/members/${currentMember.id}`, {
        expiryDate: newExpiryDate
      });
      setIsExpiryModalOpen(false);
      fetchData();
      showNotification("Date d'expiration mise a jour", 'success');
    } catch (error: unknown) {
      showNotification(
        getApiErrorMessage(error, 'Mise à jour de la date d’expiration'),
        'error'
      );
    }
  };

  const handleDelete = async (id: number) => {
    confirm({
      title: "Supprimer l'adherent",
      message:
        "Etes-vous sur de vouloir supprimer cet adherent ? Cette action est irreversible.",
      confirmText: 'Supprimer',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await axiosInstance.delete(`/api/members/${id}`);
          fetchData();
          showNotification('Adherent supprime', 'success');
        } catch (error: unknown) {
          showNotification(
            getApiErrorMessage(error, 'Suppression de l’adhérent'),
            'error'
          );
        }
      },
    });
  };

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return true;
    return new Date(expiryDate) < new Date();
  };

  const filteredMembers = members.filter(m => {
    const full = `${m.firstName || ''} ${m.lastName || ''}`.toLowerCase();
    const phone = m.phone || '';
    return full.includes(searchTerm.toLowerCase()) || phone.includes(searchTerm);
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('fr-FR');
  };

  const stats = {
    total: members.length,
    active: members.filter(m => !isExpired(m.expiryDate)).length,
    expired: members.filter(m => isExpired(m.expiryDate)).length
  };

  const openAddModal = () => {
    if (subscriptions.length === 0) {
      showNotification(
        "Creez d'abord un abonnement avant d'ajouter un adherent.",
        'warning'
      );
      return;
    }

    setCurrentMember({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      subscriptionId: undefined,
      photo: undefined
    });
    setDurationMonths(1);
    setPhotoPreview(null);
    setMemberFormError('');
    setIsModalOpen(true);
  };

  const openExpiryModal = (member: Member) => {
    setCurrentMember(member);
    const dateStr = member.expiryDate || new Date().toISOString();
    setNewExpiryDate(new Date(dateStr).toISOString().split('T')[0]);
    setIsExpiryModalOpen(true);
  };

  const handleDownload = (member: Member) => {
    setCurrentMember({ ...member });
    setIsViewModalOpen(true);
    // Slight delay to ensure modal is rendered before print
    setTimeout(() => {
      globalThis.print();
    }, 100);
  };

  const statCards = [
    { key: 'total', label: 'Total', value: stats.total, containerClass: 'bg-slate-50 border-slate-100', labelClass: 'text-slate-600' },
    { key: 'active', label: 'Actifs', value: stats.active, containerClass: 'bg-emerald-50 border-emerald-100', labelClass: 'text-emerald-600' },
    { key: 'expired', label: 'Expirés', value: stats.expired, containerClass: 'bg-rose-50 border-rose-100', labelClass: 'text-rose-600' },
  ] as const;
  const emptyMembersMessage =
    members.length === 0 ? 'Aucun adherent enregistre' : 'Aucun adherent trouve';
  let membersContent: React.ReactNode;

  if (loading) {
    membersContent = (
      <div className="p-12 text-center">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Chargement...</p>
      </div>
    );
  } else if (filteredMembers.length === 0) {
    membersContent = (
      <div className="py-16 text-center space-y-3">
        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
          <User className="h-6 w-6 text-slate-200" />
        </div>
        <p className="text-slate-500 font-bold text-[12px]">{emptyMembersMessage}</p>
        {subscriptions.length === 0 && (
          <p className="text-[11px] text-slate-400">
            Creez d'abord un abonnement pour commencer les adhesions.
          </p>
        )}
      </div>
    );
  } else {
    membersContent = (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/80">
            <tr>
              <th className="px-6 py-3 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Adhérent</th>
              <th className="px-6 py-3 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Contact</th>
              <th className="px-8 py-3 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Abonnement</th>
              <th className="px-6 py-3 text-right text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredMembers.map((m) => {
              const expired = isExpired(m.expiryDate);
              return (
                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden shadow-sm">
                          {m.photo ? (
                            <img src={m.photo} className="w-full h-full object-cover" alt="Avatar" />
                          ) : (
                            <span className="text-xs font-black text-indigo-600 uppercase">{m.firstName?.[0]}{m.lastName?.[0]}</span>
                          )}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${expired ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-[13px]">{m.firstName} {m.lastName}</p>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border uppercase tracking-tighter ${expired ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                          {expired ? 'Expiré' : 'Actif'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5"><Phone className="h-3 w-3 text-slate-400" /> {m.phone}</p>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-bold text-slate-900 uppercase">{m.subscription?.name || 'Standard'}</p>
                      {m.subscription?.activities && m.subscription.activities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {m.subscription.activities.map((a) => (
                            <span key={a.id} className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-100">
                              {a.name}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className={`text-[10px] font-bold ${expired ? 'text-rose-600' : 'text-slate-400'}`}>Expire: {formatDate(m.expiryDate)}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openExpiryModal(m)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-all" title="Renouveler/Date">
                        <Calendar className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDownload(m)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all" title="Télécharger/Imprimer">
                        <Download className="h-4 w-4" />
                      </button>
                      <button onClick={() => { setCurrentMember(m); setIsViewModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all" title="Carte">
                        <QrCode className="h-4 w-4" />
                      </button>
                      <button onClick={() => { setMemberFormError(''); setCurrentMember(m); setPhotoPreview(m.photo || null); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all" title="Editer">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(m.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all" title="Supprimer">
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
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-500">
      {/* Header & Stats Dashboard */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/60 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Répertoire <span className="text-indigo-600">Adhérents</span></h1>
          <p className="text-slate-500 text-[11px] sm:text-[12px] font-medium mt-0.5">Gestion du capital humain de la salle.</p>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          {statCards.map((stat) => (
            <div key={stat.key} className={`px-4 py-2 border rounded-xl min-w-[80px] ${stat.containerClass}`}>
              <p className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 ${stat.labelClass}`}>{stat.label}</p>
              <p className="text-lg font-extrabold text-slate-900">{stat.value}</p>
            </div>
          ))}
          <button 
            onClick={openAddModal}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl shadow-sm shadow-indigo-200 transition-all text-[11px] font-bold"
          >
            <Plus className="h-3.5 w-3.5" /> Nouvel Adhérent
          </button>
        </div>
      </div>

      {loadError && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[12px] font-bold text-rose-700">Chargement impossible</p>
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

      {/* List Container */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all"
            />
          </div>
        </div>

        {membersContent}
      </div>

      {/* Modals */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl animate-in zoom-in duration-200 relative overflow-hidden">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-[15px] font-extrabold text-slate-900 tracking-tight">{currentMember.id ? 'Modifier' : 'Nouvel'} Adhérent</h2>
              <button onClick={() => { setIsModalOpen(false); setMemberFormError(''); }} className="p-1.5 hover:bg-slate-100 text-slate-400 rounded-lg transition-all"><XIcon className="h-4 w-4" /></button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-3">
              {memberFormError ? (
                <div
                  role="alert"
                  className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-[11px] font-semibold text-rose-800 leading-snug"
                >
                  {memberFormError}
                </div>
              ) : null}
              <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                <div className="w-12 h-12 rounded-lg bg-white border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative shrink-0 cursor-pointer hover:border-indigo-400 transition-colors">
                  {photoPreview || currentMember.photo ? (
                    <img src={photoPreview || currentMember.photo} className="w-full h-full object-cover" alt="Aperçu" />
                  ) : (
                    <Plus className="h-4 w-4 text-slate-300" />
                  )}
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-slate-700">Photo de profil</p>
                  <p className="text-[8px] text-slate-400 font-medium">Cliquez pour modifier.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="member-firstname" className="text-[10px] font-bold text-slate-500 ml-1">Prénom</label>
                  <input id="member-firstname" required minLength={STRING_LIMITS.personName.min} maxLength={STRING_LIMITS.personName.max} type="text" value={currentMember.firstName || ''} onChange={e => setCurrentMember({...currentMember, firstName: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[12px] font-bold outline-none focus:bg-white focus:border-indigo-600 transition-all" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="member-lastname" className="text-[10px] font-bold text-slate-500 ml-1">Nom</label>
                  <input id="member-lastname" required minLength={STRING_LIMITS.personName.min} maxLength={STRING_LIMITS.personName.max} type="text" value={currentMember.lastName || ''} onChange={e => setCurrentMember({...currentMember, lastName: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[12px] font-bold outline-none focus:bg-white focus:border-indigo-600 transition-all" />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="member-phone" className="text-[10px] font-bold text-slate-500 ml-1">Téléphone</label>
                <input id="member-phone" required maxLength={STRING_LIMITS.memberPhone.max} type="tel" value={currentMember.phone || ''} onChange={e => setCurrentMember({...currentMember, phone: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[12px] font-bold outline-none focus:bg-white focus:border-indigo-600 transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="member-subscription" className="text-[10px] font-bold text-slate-500 ml-1">Formule</label>
                  <select required id="member-subscription" value={currentMember.subscriptionId || ''} onChange={e => setCurrentMember({...currentMember, subscriptionId: Number.parseInt(e.target.value, 10)})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[12px] font-bold outline-none focus:bg-white focus:border-indigo-600">
                    <option value="">Choisir...</option>
                    {subscriptions.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.activities?.length ? ` — ${s.activities.map((a) => a.name).join(', ')}` : ''}
                      </option>
                    ))}
                  </select>
                  {subscriptions.length === 0 && (
                    <p className="text-[10px] text-rose-500 font-medium">
                      Aucun abonnement disponible.
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label htmlFor="member-duration" className="text-[10px] font-bold text-slate-500 ml-1">Ajouter Mois</label>
                  <select id="member-duration" value={durationMonths} onChange={e => setDurationMonths(Number.parseInt(e.target.value, 10))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[12px] font-bold outline-none focus:bg-white focus:border-indigo-600">
                    <option value={1}>1 Mois</option>
                    <option value={3}>3 Mois</option>
                    <option value={6}>6 Mois</option>
                    <option value={12}>12 Mois</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-indigo-600 transition-all mt-3 active:scale-95 text-[11px] shadow-sm shadow-slate-200">Enregistrer</button>
            </form>
          </div>
        </div>
      )}

      {/* Manual Expiry Update Modal */}
      {isExpiryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[110] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-[300px] w-full shadow-2xl animate-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4 text-emerald-600">
              <RefreshCw className="h-5 w-5 animate-spin-slow" />
              <h2 className="text-[14px] font-black uppercase tracking-tight">Renouvellement</h2>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mb-4 leading-relaxed">
              Modifier la date d'expiration pour <span className="font-bold text-slate-900">{currentMember.firstName}</span>. Cela réactivera son QR Code.
            </p>
            <form onSubmit={handleUpdateExpiry} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="member-expiry" className="text-[9px] font-black text-slate-400 uppercase ml-1">Nouvelle Échéance</label>
                <input 
                  id="member-expiry"
                  type="date" 
                  required
                  value={newExpiryDate} 
                  onChange={e => setNewExpiryDate(e.target.value)} 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-bold outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all" 
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsExpiryModalOpen(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-500 rounded-xl font-bold text-[10px] uppercase hover:bg-slate-200 transition-all">Annuler</button>
                <button type="submit" className="flex-[2] py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-[10px] uppercase hover:bg-emerald-700 shadow-md shadow-emerald-100 transition-all">Confirmer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ID Card Modal (Ticket Design with Circular Photo) */}
      {isViewModalOpen && currentMember.id && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 z-50">
          <div className="bg-white rounded-[2rem] p-0 max-w-[260px] w-full shadow-2xl relative overflow-hidden border border-slate-100 animate-in zoom-in duration-300 print-content">
            {/* Header Section */}
            <div className={`p-6 pb-8 text-center relative ${isExpired(currentMember.expiryDate) ? 'bg-slate-800' : 'bg-slate-900'}`}>
               <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600 opacity-20 rounded-full -mr-12 -mt-12"></div>
               <div className="absolute bottom-0 left-0 w-20 h-20 bg-purple-600 opacity-20 rounded-full -ml-10 -mb-10"></div>
               
               {/* Small Circular Profile Photo */}
               <div className="w-16 h-16 mx-auto mb-3 rounded-full border-2 border-slate-700 p-0.5 relative z-10 shadow-lg overflow-hidden bg-slate-800">
                  {currentMember.photo ? (
                     <img src={currentMember.photo} className="w-full h-full object-cover rounded-full" alt="Avatar" />
                  ) : (
                     <div className="w-full h-full flex items-center justify-center text-xl font-black text-indigo-400 uppercase">
                        {currentMember.firstName?.[0]}{currentMember.lastName?.[0]}
                     </div>
                  )}
               </div>

               <h3 className="text-[7px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-1 relative z-10">Member Pass</h3>
               <div className="text-white text-lg font-black tracking-tighter relative z-10 mb-1 leading-tight">
                  {currentMember.firstName} {currentMember.lastName}
               </div>
               <div className="text-slate-400 text-[8px] font-bold relative z-10 uppercase tracking-widest">{currentMember.subscription?.name || 'Standard'}</div>
               {currentMember.subscription?.activities && currentMember.subscription.activities.length > 0 && (
                 <div className="flex flex-wrap justify-center gap-1 mt-2 relative z-10 px-2">
                   {currentMember.subscription.activities.map((a) => (
                     <span key={a.id} className="text-[7px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/10 text-cyan-200 border border-white/15">
                       {a.name}
                     </span>
                   ))}
                 </div>
               )}
            </div>
            
            {/* Body Section */}
            <div className="bg-white px-6 pb-6 relative z-10">
               <div className="flex justify-center -mt-4 mb-5 relative">
                  <div className="bg-white p-2 rounded-2xl shadow-xl border border-slate-50">
                     <QRCodeSVG value={`MEMBER-${currentMember.id}`} size={120} level="H" />
                  </div>
               </div>

               <div className="space-y-2 mb-6">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                     <span className="text-[7px] font-black text-slate-400 uppercase">Matricule</span>
                     <span className="text-[10px] font-black text-slate-900">#MEM-{currentMember.id}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                     <span className="text-[7px] font-black text-slate-400 uppercase">Statut</span>
                     <span className={`text-[9px] font-black uppercase ${isExpired(currentMember.expiryDate) ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {isExpired(currentMember.expiryDate) ? 'Expiré' : 'Actif'}
                     </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                     <span className="text-[7px] font-black text-slate-400 uppercase">Validité</span>
                     <span className="text-[9px] font-bold text-slate-900">{formatDate(currentMember.expiryDate)}</span>
                  </div>
               </div>

               <div className="flex gap-2 no-print">
                  <button onClick={() => globalThis.print()} className="flex-1 bg-slate-900 text-white p-2.5 rounded-xl flex items-center justify-center hover:bg-slate-800 transition-all shadow-lg">
                     <Printer className="h-3.5 w-3.5 mr-2" />
                     <span className="text-[9px] font-black uppercase tracking-wider">Imprimer</span>
                  </button>
                  <button onClick={() => setIsViewModalOpen(false)} className="px-4 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors">
                     <XIcon className="h-4 w-4" />
                  </button>
               </div>
               
               <p className="mt-4 text-[7px] text-slate-400 text-center font-bold uppercase tracking-widest leading-relaxed">
                  Badge personnel obligatoire
               </p>
            </div>
            
            {/* Decoration */}
            <div className="absolute top-[45%] left-0 w-3 h-6 bg-slate-900/10 rounded-r-full -ml-1.5"></div>
            <div className="absolute top-[45%] right-0 w-3 h-6 bg-slate-900/10 rounded-l-full -mr-1.5"></div>
          </div>
        </div>
      )}
    </div>
  );
};
