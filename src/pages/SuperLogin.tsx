import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Lock, User as UserIcon, ArrowRight, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getApiErrorMessage } from '../lib/getApiErrorMessage';

const apiFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) (headers as any)['Authorization'] = `Bearer ${token}`;
  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) {}
  if (!response.ok) {
    const error: any = new Error(data?.message || response.statusText);
    error.response = { data };
    throw error;
  }
  return { data };
};

export const SuperLogin: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const [loginData, setLoginData] = useState({ username: '', password: '' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ ...loginData, requiredRole: 'superadmin' }),
      });
      
      if (res.data.user.role !== 'superadmin') {
        throw new Error("Accès refusé. Réservé aux SuperAdmins.");
      }

      login(res.data.user, res.data.token);
      navigate('/super');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Connexion super-admin'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0f172a] relative overflow-hidden font-sans">
      <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: `radial-gradient(#334155 1px, transparent 1px)`, backgroundSize: '24px 24px' }}></div>
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-rose-600/10 rounded-full blur-[120px]"></div>
      
      <div className="container max-w-[320px] w-full relative z-10 p-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-rose-500/10 rounded-2xl mb-4 border border-rose-500/20">
              <ShieldAlert className="h-6 w-6 text-rose-500" />
            </div>
            <h2 className="text-lg font-black text-white tracking-tight uppercase tracking-widest">Super <span className="text-rose-500 text-base">Admin</span></h2>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-[0.2em]">Console de Maintenance</p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center gap-3">
                <XCircle className="h-3.5 w-3.5 shrink-0" />
                <p className="text-[10px] font-black">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Identifiant Maître</label>
              <div className="relative group">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input value={loginData.username} onChange={(e) => setLoginData({...loginData, username: e.target.value})} type="text" required className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:bg-white/10 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 text-[12px] font-bold text-white outline-none transition-all placeholder:text-slate-700" placeholder="Utilisateur" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Clé d'Accès</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input value={loginData.password} onChange={(e) => setLoginData({...loginData, password: e.target.value})} type="password" required className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:bg-white/10 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 text-[12px] font-bold text-white outline-none transition-all placeholder:text-slate-700" placeholder="••••••••" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-2.5 flex items-center justify-center bg-rose-600 text-white rounded-xl shadow-xl shadow-rose-900/20 hover:bg-rose-500 active:scale-[0.98] transition-all text-[11px] font-black uppercase tracking-widest mt-6 group disabled:opacity-50">
              {loading ? <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>Authentifier <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" /></>}
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Zone Hautement Sécurisée</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
