import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Ticket, TrendingUp, ArrowUpRight, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axiosInstance from '../api/axiosInstance';
import { getApiErrorMessage } from '../lib/getApiErrorMessage';
import dashboardHero from '../../assets/dashboard-hero.svg';

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const WEEKDAY_BY_GETDAY: Record<number, string> = {
  0: 'Dim',
  1: 'Lun',
  2: 'Mar',
  3: 'Mer',
  4: 'Jeu',
  5: 'Ven',
  6: 'Sam',
};

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    members: 0,
    activeSubscriptions: 0,
    ticketsSold: 0,
    dailyRevenue: 0,
  });
  const [trends, setTrends] = useState({
    members: '—',
    activeSubscriptions: '—',
    ticketsSold: '—',
    revenue: '—',
  });
  const [recentMembers, setRecentMembers] = useState<any[]>([]);
  const [chartData, setChartData] = useState<Array<{ name: string; revenus: number }>>([]);
  const [hasRevenueData, setHasRevenueData] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch Real Stats from the new endpoint
        const statsRes = await axiosInstance.get('/api/stats');
        if (statsRes.data) {
          const s = statsRes.data;
          setStats({
            members: s.members.value,
            activeSubscriptions: s.subscriptions.value,
            ticketsSold: s.tickets.value,
            dailyRevenue: s.revenue.value,
          });
          setTrends({
            members: s.members.trend,
            activeSubscriptions: s.subscriptions.trend,
            ticketsSold: s.tickets.trend,
            revenue: s.revenue.trend,
          });
        }

        // 2. Fetch Members and Transactions for deeper charts/lists
        const [membersRes, transRes] = await Promise.all([
          axiosInstance.get('/api/members').catch(() => ({ data: [] })),
          axiosInstance.get('/api/transactions').catch(() => ({ data: [] })),
        ]);

        const members = membersRes?.data ?? [];
        const transactions = transRes?.data ?? [];

        // Build weekly revenue chart from real transactions
        const DAYS_MAP = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        const revenueByDay: Record<string, number> = WEEKDAY_LABELS.reduce((acc, label) => {
          acc[label] = 0;
          return acc;
        }, {} as Record<string, number>);

        transactions
          .filter((t: any) => t.date && t.type === 'income')
          .forEach((t: any) => {
            const d = new Date(t.date);
            const label = DAYS_MAP[d.getDay()];
            if (label && label in revenueByDay) {
              revenueByDay[label] += t.amount || 0;
            }
          });

        const computedChartData = WEEKDAY_LABELS.map((name) => ({
          name,
          revenus: revenueByDay[name] || 0,
        }));

        setChartData(computedChartData);
        setHasRevenueData(computedChartData.some((p) => p.revenus > 0));

        // Populate recent members from statsRes if available, otherwise from membersRes
        if (statsRes.data?.recentMembers) {
          setRecentMembers(statsRes.data.recentMembers);
        } else if (members.length > 0) {
          setRecentMembers(
            members.slice(0, 5).map((m: any) => ({
              id: m.id,
              firstName: m.firstName || m.first_name,
              lastName: m.lastName || m.last_name,
              registrationDate: m.registrationDate || m.registration_date || m.createdAt,
              subscriptionName: m.subscription?.name || 'Standard'
            })),
          );
        } else {
          setRecentMembers([]);
        }
      } catch (error: unknown) {
        console.error('Error fetching dashboard data:', error);
        setError(
          getApiErrorMessage(error, 'Chargement du tableau de bord')
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { title: 'Adhérents', value: stats.members, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', trend: trends.members },
    { title: 'Abonnements', value: stats.activeSubscriptions, icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', trend: trends.activeSubscriptions },
    { title: 'Tickets', value: stats.ticketsSold, icon: Ticket, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', trend: trends.ticketsSold },
    { title: 'Revenus', value: `${stats.dailyRevenue} FCFA`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', trend: trends.revenue },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      {error && (
        <div className="p-3 bg-red-50 border border-red-100/50 text-red-600 rounded-xl text-[11px] font-bold">
          {error}
        </div>
      )}
      {/* En-tête avec illustration SVG */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center">
          <div className="flex-1 p-4 sm:p-6 min-w-0">
            <h1 className="text-lg sm:text-xl font-extrabold mb-1 tracking-tight text-slate-900">Bonjour, {user?.username} 👋</h1>
            <p className="text-slate-600 text-[11px] sm:text-[12px] font-medium max-w-xl leading-relaxed">
              Voici un résumé de l'activité de votre salle de sport aujourd'hui.
            </p>
          </div>
          <div className="shrink-0 flex justify-center sm:justify-end px-4 pb-4 sm:pb-0 sm:pr-6 sm:pl-2">
            <img
              src={dashboardHero}
              alt=""
              className="w-full max-w-[min(100%,280px)] h-auto object-contain"
            />
          </div>
        </div>
      </div>

      {/* Stats Grid - Mobile First (2 columns) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className={`bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-200/60 hover:shadow-md hover:border-slate-300 transition-all group flex flex-col justify-between`}>
              <div className="flex justify-between items-start mb-2 sm:mb-3">
                <div className={`p-1.5 sm:p-2 rounded-lg ${stat.bg} border ${stat.border} group-hover:scale-110 transition-transform`}>
                  <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${stat.color}`} />
                </div>
                <div className="flex items-center text-emerald-600 text-[9px] sm:text-[10px] font-bold bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md">
                  {stat.trend}
                  <ArrowUpRight className="h-2.5 w-2.5 ml-0.5" />
                </div>
              </div>
              <div>
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 mb-0.5">{stat.title}</p>
                <p className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts / Lists area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <div className="lg:col-span-2 bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-200/60">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-[13px] sm:text-[14px] font-extrabold text-slate-900 tracking-tight">Revenus de la semaine</h2>
            </div>
            <select className="bg-slate-50 border border-slate-200/60 text-slate-700 text-[10px] sm:text-[11px] font-bold rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-100">
              <option>Cette semaine</option>
              <option>Semaine dernière</option>
            </select>
          </div>
          <div className="h-[180px] sm:h-[220px] w-full -ml-4 sm:ml-0 flex items-center justify-center">
            {loading ? (
              <p className="text-[11px] sm:text-[12px] text-slate-500 font-medium">Chargement...</p>
            ) : hasRevenueData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenus" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748B', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748B', fontWeight: 600 }} tickFormatter={(value) => `${value}FCFA`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '8px' }}
                    labelStyle={{ fontWeight: 'bold', color: '#0F172A', marginBottom: '2px', fontSize: '11px' }}
                    itemStyle={{ fontWeight: 600, fontSize: '11px' }}
                    formatter={(value: any) => [`${value} FCFA`, 'Revenus']}
                  />
                  <Area type="monotone" dataKey="revenus" stroke="#4F46E5" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenus)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-[11px] sm:text-[12px] text-slate-500 font-medium text-center">
                Aucune donnée de revenus disponible pour le moment.
              </p>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-200/60 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[13px] sm:text-[14px] font-extrabold text-slate-900 tracking-tight">Derniers Adhérents</h2>
            <button onClick={() => window.location.href='/members'} className="text-[10px] sm:text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md transition-colors">Voir tout</button>
          </div>
          <div className="space-y-2 flex-1">
            {loading ? (
              <div className="text-[11px] sm:text-[12px] text-slate-500 font-medium text-center py-4 rounded-lg">
                Chargement...
              </div>
            ) : recentMembers.length === 0 ? (
              <div className="text-[11px] sm:text-[12px] text-slate-500 font-medium text-center py-4 border border-dashed border-slate-200 rounded-lg bg-slate-50/60">
                Aucun adhérent récent pour le moment.
              </div>
            ) : (
              recentMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-lg transition-all cursor-pointer group">
                  <div className="flex items-center">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-[10px] sm:text-[11px] font-bold mr-2.5 shadow-sm group-hover:shadow-md transition-shadow uppercase">
                      {(member.firstName || member.first_name)?.[0]}{(member.lastName || member.last_name)?.[0]}
                    </div>
                    <div>
                      <p className="text-[11px] sm:text-[12px] font-bold text-slate-900">{member.firstName || member.first_name} {member.lastName || member.last_name}</p>
                      <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 mt-0.5">
                        {member.subscriptionName || 'Membre'} • {(() => {
                          const v = member.registrationDate || member.registration_date || member.createdAt;
                          const d = new Date(v);
                          return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('fr-FR');
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="text-[8px] sm:text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                    Actif
                  </div>
                </div>
              ))
            )}
          </div>
          <button onClick={() => window.location.href='/members'} className="w-full mt-3 py-2 bg-slate-900 text-white rounded-lg text-[11px] sm:text-[12px] font-bold hover:bg-indigo-600 transition-colors shadow-sm shadow-slate-200">
            Nouveau membre
          </button>
        </div>
      </div>
    </div>
  );
};
