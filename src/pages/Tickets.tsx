import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { Plus, Trash2, Ticket as TicketIcon, QrCode, Printer, X, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import axiosInstance from '../api/axiosInstance';
import { getApiErrorMessage } from '../lib/getApiErrorMessage';
import { useConfirm } from '../context/ConfirmContext';
import { useNotification } from '../context/NotificationContext';

type Ticket = {
  id: number;
  type: string;
  price: number;
  status: 'valid' | 'used' | 'expired';
  createdAt: string;
};

function waitForPreviewRender(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export const Tickets: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({ type: 'Séance Unique', price: 1000 });
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticketFormError, setTicketFormError] = useState('');

  const { confirm } = useConfirm();
  const { showNotification } = useNotification();

  useEffect(() => {
    void fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get<Ticket[]>('/api/tickets');
      setTickets(res.data || []);
    } catch (error: unknown) {
      setTickets([]);
      showNotification(getApiErrorMessage(error, 'Chargement des tickets'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setTicketFormError('');
    try {
      const res = await axiosInstance.post<Record<string, unknown> | { ticket: Ticket }>('/api/tickets', newTicket);
      const data = res.data;
      const payload =
        data && typeof data === 'object' && data !== null && 'ticket' in data
          ? (data as { ticket: Record<string, unknown> }).ticket
          : (data as Record<string, unknown>);
      const created = payload && typeof payload === 'object' ? payload : {};

      setIsModalOpen(false);
      void fetchTickets();
      showNotification('Vente validée', 'success');

      setCurrentTicket({
        id: Number(created.id ?? 0),
        type: String(created.type ?? newTicket.type),
        price: Number(created.price ?? newTicket.price),
        status: (created.status as Ticket['status']) ?? 'valid',
        createdAt: String(created.createdAt ?? new Date().toISOString()),
      });
      setIsViewModalOpen(true);
    } catch (error: unknown) {
      const msg = getApiErrorMessage(error, 'Vente de ticket');
      setTicketFormError(msg);
      showNotification(msg, 'error');
    }
  };

  const openViewModal = (ticket: Ticket) => {
    setCurrentTicket(ticket);
    setIsViewModalOpen(true);
  };

  const handlePrint = () => {
    globalThis.print();
  };

  const handleDownload = async (ticket: Ticket) => {
    flushSync(() => {
      setCurrentTicket(ticket);
      setIsViewModalOpen(true);
    });
    await waitForPreviewRender();
    handlePrint();
  };

  const handleDelete = (id: number) => {
    confirm({
      title: 'Supprimer',
      message: 'Supprimer cet enregistrement ?',
      confirmText: 'Supprimer',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await axiosInstance.delete(`/api/tickets/${id}`);
          void fetchTickets();
          showNotification('Supprimé', 'success');
        } catch (error: unknown) {
          showNotification(getApiErrorMessage(error, 'Suppression du ticket'), 'error');
        }
      },
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return (
          <span className="px-2 py-0.5 inline-flex text-[9px] font-black uppercase tracking-tighter rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100">
            Valide
          </span>
        );
      case 'used':
        return (
          <span className="px-2 py-0.5 inline-flex text-[9px] font-black uppercase tracking-tighter rounded-md bg-rose-50 text-rose-600 border border-rose-100">
            Utilisé
          </span>
        );
      case 'expired':
        return (
          <span className="px-2 py-0.5 inline-flex text-[9px] font-black uppercase tracking-tighter rounded-md bg-amber-50 text-amber-600 border border-amber-100">
            Expiré
          </span>
        );
      default:
        return null;
    }
  };

  const headerMuted = currentTicket?.status === 'used' || currentTicket?.status === 'expired';
  const qrMuted = headerMuted;

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-500 text-slate-900">
      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.95fr]">
        <div className="rounded-[28px] border border-slate-300/70 bg-white p-5 sm:p-6 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
          <p className="text-[10px] font-black uppercase tracking-[0.34em] text-slate-400">Tickets</p>
          <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight">Ventes tickets</h1>
          <p className="mt-3 max-w-2xl text-[12px] sm:text-[13px] font-medium leading-relaxed text-slate-500">
            Vendez des tickets, consultez leur statut et retrouvez les ventes du jour. Séance Unique : 1 scan en 24h. Pass
            Journée : 2 scans sur la journée.
          </p>
        </div>
        <div className="rounded-[28px] bg-slate-950 p-5 text-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.95)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/35">Aujourd&apos;hui</p>
              <p className="mt-2 text-3xl font-black tracking-tight">{tickets.length}</p>
              <p className="mt-2 text-[11px] font-medium text-white/55">Tickets affichés dans la liste.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(true);
                setTicketFormError('');
              }}
              className="rounded-2xl bg-cyan-300 px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-950 transition hover:bg-cyan-200"
            >
              <span className="flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" />
                Vente
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[28px] border border-slate-300/60 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)] overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-[#fcfaf5] px-4 py-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Liste</p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">Liste des tickets du jour</p>
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            {tickets.length} ligne{tickets.length > 1 ? 's' : ''}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[11px] font-bold text-slate-400 uppercase">Chargement...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Désignation
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Prix</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Date & Heure
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-50">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <TicketIcon className="h-10 w-10 text-slate-100 mx-auto mb-3" />
                      <p className="text-[13px] font-bold text-slate-400">Aucune vente enregistrée</p>
                    </td>
                  </tr>
                ) : (
                  tickets.map((ticket) => (
                    <tr key={ticket.id} className="transition-colors group hover:bg-[#fcfaf5]">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-slate-950 text-white flex items-center justify-center">
                            <TicketIcon className="h-4 w-4" />
                          </div>
                          <span className="text-[13px] font-bold text-slate-900">{ticket.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-[13px] font-black text-slate-900">{ticket.price.toLocaleString()} FCFA</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[12px] font-medium text-slate-500">
                        {formatDate(ticket.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(ticket.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openViewModal(ticket)}
                            className="p-2.5 text-slate-400 hover:text-slate-950 hover:bg-amber-50 rounded-xl transition-all border border-transparent hover:border-amber-100"
                            title="Voir QR"
                          >
                            <QrCode className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDownload(ticket)}
                            className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100"
                            title="Télécharger"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(ticket.id)}
                            className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-slate-900">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[16px] font-extrabold uppercase tracking-tight">Nouvelle Vente Ticket</h2>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setTicketFormError('');
                }}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleGenerate} className="space-y-4">
              {ticketFormError ? (
                <div
                  role="alert"
                  className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-[11px] font-semibold text-rose-800 leading-snug"
                >
                  {ticketFormError}
                </div>
              ) : null}
              <div className="space-y-1.5">
                <label htmlFor="ticket-type" className="block text-[10px] font-bold text-slate-500 uppercase ml-1">
                  Type d&apos;accès
                </label>
                <select
                  id="ticket-type"
                  value={newTicket.type}
                  onChange={(e) => setNewTicket({ ...newTicket, type: e.target.value })}
                  className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-bold outline-none focus:bg-white focus:border-emerald-600 transition-all"
                >
                  <option value="Séance Unique">Séance Unique</option>
                  <option value="Pass Journée">Pass Journée</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="ticket-price" className="block text-[10px] font-bold text-slate-500 uppercase ml-1">
                  Prix Encaissé (FCFA)
                </label>
                <input
                  id="ticket-price"
                  type="number"
                  required
                  min={0}
                  value={newTicket.price}
                  onChange={(e) => setNewTicket({ ...newTicket, price: Number(e.target.value) })}
                  className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-bold outline-none focus:bg-white focus:border-emerald-600 transition-all"
                />
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 text-[11px]"
                >
                  Encaisser & Valider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isViewModalOpen && currentTicket && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 z-50 text-slate-900">
          <div className="bg-white rounded-[2rem] p-0 max-w-[260px] w-full shadow-2xl relative overflow-hidden border border-slate-100 animate-in zoom-in duration-300 print-content">
            <div
              className={`p-6 pb-8 text-center relative ${headerMuted ? 'bg-slate-800' : 'bg-slate-900'}`}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600 opacity-20 rounded-full -mr-12 -mt-12" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-purple-600 opacity-20 rounded-full -ml-10 -mb-10" />

              <div className="w-16 h-16 mx-auto mb-3 rounded-full border-2 border-slate-700 p-0.5 relative z-10 shadow-lg overflow-hidden bg-slate-800">
                <div className="w-full h-full rounded-full flex items-center justify-center text-xl font-black text-indigo-400 uppercase">
                  <TicketIcon className="h-7 w-7" />
                </div>
              </div>

              <h3 className="text-[7px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-1 relative z-10">Ticket Pass</h3>
              <div className="text-white text-lg font-black tracking-tighter relative z-10 mb-1 leading-tight">
                {currentTicket.type}
              </div>
              <div className="text-slate-400 text-[8px] font-bold relative z-10 uppercase tracking-widest">
                {currentTicket.status === 'used'
                  ? 'Ticket utilisé'
                  : currentTicket.status === 'expired'
                    ? 'Ticket expiré'
                    : 'Ticket valide'}
              </div>
            </div>

            <div className="bg-white px-6 pb-6 relative z-10">
              <div className="flex justify-center -mt-4 mb-5 relative">
                <div
                  className={`bg-white p-2 rounded-2xl shadow-xl border border-slate-50 ${qrMuted ? 'opacity-30 grayscale' : ''}`}
                >
                  <QRCodeSVG value={`TICKET-${currentTicket.id}`} size={120} level="H" />
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                  <span className="text-[7px] font-black text-slate-400 uppercase">Vendu le</span>
                  <span className="text-[9px] font-bold text-slate-900">{formatDate(currentTicket.createdAt)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                  <span className="text-[7px] font-black text-slate-400 uppercase">Statut</span>
                  <span
                    className={`text-[9px] font-black uppercase ${
                      currentTicket.status === 'used'
                        ? 'text-rose-600'
                        : currentTicket.status === 'expired'
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                    }`}
                  >
                    {currentTicket.status === 'used'
                      ? 'Utilisé'
                      : currentTicket.status === 'expired'
                        ? 'Expiré'
                        : 'Valide'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                  <span className="text-[7px] font-black text-slate-400 uppercase">Prix</span>
                  <span className="text-[9px] font-bold text-slate-900">{currentTicket.price.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                  <span className="text-[7px] font-black text-slate-400 uppercase">Validité</span>
                  <span className="text-[9px] font-bold text-slate-900">
                    {currentTicket.type === 'Pass Journée'
                      ? 'Jusqu’à la fin de la journée / 2 séances'
                      : '24 heures / 1 séance'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 no-print">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex-1 bg-slate-900 text-white p-2.5 rounded-xl flex items-center justify-center hover:bg-slate-800 transition-all shadow-lg"
                >
                  <Printer className="h-3.5 w-3.5 mr-2" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Imprimer</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleDownload(currentTicket)}
                  className="px-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
                  title="Télécharger le ticket"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-4 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-4 text-[7px] text-slate-400 text-center font-bold uppercase tracking-widest leading-relaxed">
                Présenter ce badge au contrôle
              </p>
            </div>

            <div className="absolute top-[45%] left-0 w-3 h-6 bg-slate-900/10 rounded-r-full -ml-1.5" />
            <div className="absolute top-[45%] right-0 w-3 h-6 bg-slate-900/10 rounded-l-full -mr-1.5" />
          </div>
        </div>
      )}
    </div>
  );
};
