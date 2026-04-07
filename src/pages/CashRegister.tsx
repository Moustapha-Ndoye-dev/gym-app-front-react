import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, CreditCard, DollarSign, TrendingUp, Search, Calendar, Filter, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { getApiErrorMessage } from '../lib/getApiErrorMessage';
import { useConfirm } from '../context/ConfirmContext';
import { useNotification } from '../context/NotificationContext';

type Transaction = {
  id: number;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  date: string;
  user_id: number;
};

export const CashRegister: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({ type: 'income' });
  const [dailyTotal, setDailyTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [dateFilter, setDateFilter] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const { confirm } = useConfirm();
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/api/transactions');
      const data = res.data;
      if (data) {
        setTransactions(data);
        calculateDailyTotal(data);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDailyTotal = (trans: Transaction[]) => {
    const today = new Date().toISOString().split('T')[0];
    const total = trans
      .filter(t => t.date && t.date.startsWith(today))
      .reduce((acc, curr) => curr.type === 'income' ? acc + curr.amount : acc - curr.amount, 0);
    setDailyTotal(total);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axiosInstance.post('/api/transactions', newTransaction);
      setIsModalOpen(false);
      fetchTransactions();
      showNotification('Transaction enregistrée', 'success');
    } catch (error: unknown) {
      showNotification(
        getApiErrorMessage(error, 'Enregistrement de la transaction'),
        'error'
      );
    }
  };

  const handleDelete = async (id: number) => {
    confirm({
      title: 'Supprimer la transaction',
      message: 'Voulez-vous vraiment supprimer cette opération ?',
      onConfirm: async () => {
        try {
          await axiosInstance.delete(`/api/transactions/${id}`);
          fetchTransactions();
          showNotification('Supprimé avec succès', 'success');
        } catch (error: unknown) {
          showNotification(
            getApiErrorMessage(error, 'Suppression de la transaction'),
            'error'
          );
        }
      }
    });
  };

  // Filtered Logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || t.type === typeFilter;
      const matchesDate = !dateFilter || (t.date && t.date.startsWith(dateFilter));
      return matchesSearch && matchesType && matchesDate;
    });
  }, [transactions, searchTerm, typeFilter, dateFilter]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);
  }, [filteredTransactions, currentPage]);

  const stats = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Journal de Caisse</h1>
          <p className="text-slate-500 text-[12px] font-medium">Suivi des flux financiers en temps réel.</p>
        </div>
        <button
          onClick={() => { setNewTransaction({ type: 'income' }); setIsModalOpen(true); }}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all text-[11px] font-black uppercase tracking-widest w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" /> Nouvelle Opération
        </button>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><ArrowUpRight className="h-6 w-6" /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase">Recettes</p>
            <p className="text-lg font-black text-slate-900">{stats.income.toLocaleString()} FCFA</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center"><ArrowDownRight className="h-6 w-6" /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase">Dépenses</p>
            <p className="text-lg font-black text-slate-900">{stats.expense.toLocaleString()} FCFA</p>
          </div>
        </div>
        <div className="bg-slate-900 p-5 rounded-[2rem] shadow-xl flex items-center gap-4 text-white">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white"><TrendingUp className="h-6 w-6" /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase">Balance</p>
            <p className="text-lg font-black text-white">{stats.balance.toLocaleString()} FCFA</p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Rechercher une opération..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
          />
        </div>
        <select 
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as any)}
          className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/10"
        >
          <option value="all">Tous les types</option>
          <option value="income">Encaissements</option>
          <option value="expense">Décaissements</option>
        </select>
        <input 
          type="date" 
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/10"
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/50">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Montant</th>
              <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-bold uppercase text-[10px]">Chargement...</td></tr>
            ) : currentItems.length === 0 ? (
              <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-bold uppercase text-[10px]">Aucune transaction trouvée</td></tr>
            ) : (
              currentItems.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-[12px] font-bold text-slate-500">
                    {new Date(t.date).toLocaleDateString('fr-FR')} <span className="opacity-50 ml-1">{new Date(t.date).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}</span>
                  </td>
                  <td className="px-6 py-4 text-[13px] font-bold text-slate-900">{t.description}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-[9px] font-black rounded-lg uppercase border ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                      {t.type === 'income' ? 'Encaissement' : 'Décaissement'}
                    </span>
                  </td>
                  <td className={`px-6 py-4 font-black text-[14px] ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()} FCFA
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-all"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Page {currentPage} sur {totalPages}</p>
          <div className="flex gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-2 rounded-xl bg-slate-50 text-slate-600 disabled:opacity-30 hover:bg-slate-100 transition-all"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="p-2 rounded-xl bg-slate-50 text-slate-600 disabled:opacity-30 hover:bg-slate-100 transition-all"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Modal: New Transaction */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Opération Caisse</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-all"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-5">
              <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                <button type="button" onClick={() => setNewTransaction({...newTransaction, type:'income'})} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${newTransaction.type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Recette (+)</button>
                <button type="button" onClick={() => setNewTransaction({...newTransaction, type:'expense'})} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${newTransaction.type === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>Dépense (-)</button>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Montant (FCFA)</label>
                <input type="number" required step="0.01" min="0.01" value={newTransaction.amount || ''} onChange={e => setNewTransaction({...newTransaction, amount: parseFloat(e.target.value)})} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Motif / Description</label>
                <input type="text" required value={newTransaction.description || ''} onChange={e => setNewTransaction({...newTransaction, description: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" placeholder="Désignation..." />
              </div>
              <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-indigo-600 transition-all active:scale-95 text-xs">Valider l'opération</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const X: React.FC<{className?: string}> = ({className}) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
);
