import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, TrendingUp, ShieldCheck, ArrowRight, Zap, Activity, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axiosInstance from '../api/axiosInstance';
import { getApiErrorMessage } from '../lib/getApiErrorMessage';
import { useNotification } from '../context/NotificationContext';

export const SuperDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ 
    totalGyms: 0, 
    totalMembers: 0, 
    saasRevenue: 0, 
    revenueHistory: [] as any[] 
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchStats();
  }, [selectedPeriod]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/api/super/stats?period=${selectedPeriod}`);
      if (res.data && res.data.stats) {
        setStats(res.data.stats);
      }
    } catch (e: unknown) {
      console.error(e);
      showNotification(
        getApiErrorMessage(e, 'Chargement des statistiques plateforme'),
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Salles', value: stats.totalGyms, color: 'text-indigo-600', bg: 'bg-indigo-50', icon: Building2 },
    { label: 'Membres', value: stats.totalMembers, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { 
      label: selectedPeriod === 'annuel' ? 'CA Annuel' : (selectedPeriod === 'semestriel' ? 'CA Semestriel' : 'CA Mensuel'), 
      value: `${stats.saasRevenue.toLocaleString()} CFA`, 
      icon: TrendingUp, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50' 
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-700">
      {/* Header Overview */}
      <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 space-y-1 text-center md:text-left text-white">
          <h1 className="text-xl font-black uppercase tracking-tight">Vue d'ensemble <span className="text-indigo-500">SaaS</span></h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-60">État de santé global de la plateforme</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchStats} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all mr-2 text-slate-400">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] font-black uppercase text-slate-300">Système Opérationnel</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6 text-slate-900">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-900">
            {statCards.map((s, i) => (
              <div key={i} className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4 text-slate-900">
                <div className={`p-3 rounded-2xl ${s.bg} ${s.color}`}><s.icon className="h-5 w-5" /></div>
                <div className="text-slate-900">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                  <p className="text-lg font-black text-slate-900 leading-none">{loading ? '...' : s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* RECHARTS AREA WITH FIXED HEIGHT */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col text-slate-900">
            <div className="flex justify-between items-center mb-8 text-slate-900">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-widest">Évolution des Revenus</h3>
                <div className="flex items-center gap-2 mt-2">
                  {['monthly', 'semestriel', 'annuel'].map((p) => (
                    <button 
                      key={p}
                      onClick={() => setSelectedPeriod(p)}
                      className={`px-3 py-1 text-[8px] font-black uppercase rounded-lg border transition-all ${
                        selectedPeriod === p ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <span className="px-3 py-1 text-[9px] font-black text-emerald-600 bg-emerald-50 rounded-lg border border-emerald-100">Live Data</span>
            </div>
            
            <div className="w-full h-[300px] -ml-4 text-slate-900">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.revenueHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} 
                    dy={15}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}}
                    tickFormatter={(value) => `${value / 1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '12px 16px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: '900', color: '#1e293b' }}
                    labelStyle={{ fontSize: '10px', fontWeight: '800', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}
                    formatter={(value: any) => [`${value.toLocaleString()} CFA`, 'Revenu']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#6366f1" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                    dot={{ r: 4, fill: '#fff', stroke: '#6366f1', strokeWidth: 3 }}
                    activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-4 text-slate-900">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm h-full text-slate-900">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-widest mb-6 flex items-center gap-2">
              <Zap className="h-4 w-4 text-indigo-500" /> Raccourcis
            </h3>
            <div className="space-y-2 text-slate-900">
              {[
                { title: 'Salles', path: '/super/gyms', desc: 'Gestion technique', icon: Building2 },
                { title: 'Abonnements', path: '/super/subscriptions', desc: 'Finance & Accès', icon: TrendingUp },
                { title: 'Sécurité Root', path: '/super/admins', desc: 'Comptes maîtres', icon: ShieldCheck },
              ].map((link, i) => (
                <button key={i} onClick={() => navigate(link.path)} className="w-full p-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all text-left flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-900 rounded-xl text-white group-hover:bg-indigo-600 transition-colors"><link.icon className="h-4 w-4" /></div>
                    <div>
                      <p className="text-[12px] font-black text-slate-900 leading-none">{link.title}</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-1">{link.desc}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
