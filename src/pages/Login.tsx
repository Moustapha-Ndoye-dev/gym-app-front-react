import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Dumbbell, Lock, User as UserIcon, ArrowRight, ShieldCheck, CheckCircle2, XCircle, Zap, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getApiErrorMessage } from '../lib/getApiErrorMessage';
import { STRING_LIMITS } from '../lib/stringLimits';

const apiFetch = async (url: string, options: RequestInit = {}) => {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch (error) {
    console.error('Login response parsing error:', error);
  }
  if (!response.ok) {
    const error: any = new Error(data?.message || response.statusText);
    error.response = { data };
    throw error;
  }
  return { data };
};

export const Login: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState({
    gymPhone: '',
    gymName: '',
    adminUsername: '',
    adminPassword: '',
    confirmPassword: ''
  });

  const handleLogin = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const username = loginData.username.trim();
    const password = loginData.password;
    if (
      username.length < STRING_LIMITS.username.min ||
      username.length > STRING_LIMITS.username.max
    ) {
      setError(
        `Identifiant : entre ${STRING_LIMITS.username.min} et ${STRING_LIMITS.username.max} caractères.`
      );
      return;
    }
    if (
      password.length < STRING_LIMITS.password.min ||
      password.length > STRING_LIMITS.password.max
    ) {
      setError(
        `Mot de passe : entre ${STRING_LIMITS.password.min} et ${STRING_LIMITS.password.max} caractères.`
      );
      return;
    }
    setLoading(true);

    const payload = {
      username,
      password,
      requiredRole: 'user'
    };

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const user = res.data.user;
      // Bloquer les superadmins sur ce formulaire
      if (user?.role === 'superadmin') {
        setError('Les super-administrateurs doivent utiliser le portail dédié.');
        return;
      }
      login(user, res.data.token);
      navigate(user?.role === 'controller' ? '/access' : '/');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Connexion'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const gymName = registerData.gymName.trim();
    const gymPhone = registerData.gymPhone.trim();
    const adminUsername = registerData.adminUsername.trim();
    const adminPassword = registerData.adminPassword;
    if (registerData.adminPassword !== registerData.confirmPassword) {
      setError('Mots de passe différents');
      return;
    }
    if (
      gymName.length < STRING_LIMITS.gymName.min ||
      gymName.length > STRING_LIMITS.gymName.max
    ) {
      setError(
        `Nom de la salle : entre ${STRING_LIMITS.gymName.min} et ${STRING_LIMITS.gymName.max} caractères.`
      );
      return;
    }
    if (
      gymPhone.length < STRING_LIMITS.phone.min ||
      gymPhone.length > STRING_LIMITS.phone.max
    ) {
      setError(
        `Téléphone : entre ${STRING_LIMITS.phone.min} et ${STRING_LIMITS.phone.max} caractères.`
      );
      return;
    }
    if (
      adminUsername.length < STRING_LIMITS.username.min ||
      adminUsername.length > STRING_LIMITS.username.max
    ) {
      setError(
        `Nom d'utilisateur : entre ${STRING_LIMITS.username.min} et ${STRING_LIMITS.username.max} caractères.`
      );
      return;
    }
    if (
      adminPassword.length < STRING_LIMITS.password.min ||
      adminPassword.length > STRING_LIMITS.password.max
    ) {
      setError(
        `Mot de passe : entre ${STRING_LIMITS.password.min} et ${STRING_LIMITS.password.max} caractères.`
      );
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/api/auth/register-gym', {
        method: 'POST',
        body: JSON.stringify({
          gymName,
          gymPhone,
          adminUsername,
          adminPassword
        }),
      });
      setSuccess(true);
      setTimeout(() => { setMode('login'); setSuccess(false); }, 2000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Inscription de la salle'));
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Zap, title: "Connexion rapide", desc: "Acces simple a votre espace." },
    { icon: LayoutDashboard, title: "Vue d'ensemble", desc: "Retrouvez les infos principales." },
    { icon: ShieldCheck, title: "Acces securise", desc: "Vos donnees restent protegees." }
  ];

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#020617] relative overflow-hidden font-sans">
      <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: `radial-gradient(#1e293b 1px, transparent 1px)`, backgroundSize: '24px 24px' }}></div>
      <div className="absolute top-[-10%] left-[-5%] w-[35%] h-[35%] bg-indigo-600/20 rounded-full blur-[100px]"></div>
      
      <div className="container max-w-[850px] w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10 p-6">
        
        {/* Left Side */}
        <div className="hidden lg:flex flex-col space-y-6 text-white pr-10 border-r border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg">
              <Dumbbell className="h-4 w-4 text-white" />
            </div>
            <span className="text-md font-black tracking-tight uppercase tracking-widest">GYM <span className="text-indigo-400">PRO</span></span>
          </div>
          
          <div className="space-y-3">
            <h1 className="text-3xl font-black leading-tight tracking-tight">Gerez votre <span className="text-indigo-400">salle simplement.</span></h1>
            <p className="text-[13px] text-slate-400 font-medium max-w-sm">Connexion, suivi et gestion au meme endroit.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-2">
            {features.map((f) => (
              <div key={f.title} className="flex items-center gap-2 text-slate-400">
                <f.icon className="h-3.5 w-3.5 text-indigo-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider">{f.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[320px] mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-6 sm:p-8">
              <div className="text-center mb-6">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">{mode === 'login' ? 'Connexion' : 'Nouvelle salle'}</h2>
                <p className="text-[11px] text-slate-500 font-medium">Gym Pro</p>
              </div>

              <div className="flex p-1 bg-slate-100 rounded-xl mb-6 border border-slate-200/50">
                <button onClick={() => setMode('login')} className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'login' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Connexion</button>
                <button onClick={() => setMode('register')} className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'register' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Inscription</button>
              </div>

              <AnimatePresence mode="wait">
                {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 p-2.5 bg-rose-50 border-l-4 border-rose-500 text-rose-700 rounded-r-lg flex items-center gap-2"><XCircle className="h-3.5 w-3.5 shrink-0" /><p className="text-[10px] font-bold">{error}</p></motion.div>}
                {success && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 p-2.5 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 rounded-r-lg flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 shrink-0" /><p className="text-[10px] font-bold">Salle créée !</p></motion.div>}
              </AnimatePresence>

              {mode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-3.5">
                  <div className="space-y-1">
                    <label htmlFor="login-username" className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Utilisateur</label>
                    <div className="relative group">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input id="login-username" value={loginData.username} onChange={(e) => setLoginData({...loginData, username: e.target.value})} type="text" required minLength={STRING_LIMITS.username.min} maxLength={STRING_LIMITS.username.max} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 text-[12px] font-bold outline-none" placeholder="admin" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center ml-1"><label htmlFor="login-password" className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mot de passe</label><button type="button" className="text-[9px] font-black text-indigo-600">Oublie ?</button></div>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input id="login-password" value={loginData.password} onChange={(e) => setLoginData({...loginData, password: e.target.value})} type="password" required minLength={STRING_LIMITS.password.min} maxLength={STRING_LIMITS.password.max} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 text-[12px] font-bold outline-none" placeholder="••••••••" />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-2.5 flex items-center justify-center bg-slate-900 text-white rounded-xl shadow-xl hover:bg-slate-800 active:scale-[0.98] transition-all text-[11px] font-black uppercase tracking-widest mt-6 group disabled:opacity-70">
                    {loading ? <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>Accéder <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" /></>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-2.5">
                  <input value={registerData.gymName} onChange={(e) => setRegisterData({...registerData, gymName: e.target.value})} type="text" required minLength={STRING_LIMITS.gymName.min} maxLength={STRING_LIMITS.gymName.max} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-600/20 text-[11px] font-bold outline-none" placeholder="Nom de la salle" />
                  <input value={registerData.gymPhone} onChange={(e) => setRegisterData({...registerData, gymPhone: e.target.value})} type="tel" required minLength={STRING_LIMITS.phone.min} maxLength={STRING_LIMITS.phone.max} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-600/20 text-[11px] font-bold outline-none" placeholder="Numéro de téléphone" />
                    <input value={registerData.adminUsername} onChange={(e) => setRegisterData({...registerData, adminUsername: e.target.value})} type="text" required minLength={STRING_LIMITS.username.min} maxLength={STRING_LIMITS.username.max} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-600/20 text-[11px] font-bold outline-none" placeholder="Nom d'utilisateur admin" />
                  <div className="grid grid-cols-2 gap-2">
                    <input value={registerData.adminPassword} onChange={(e) => setRegisterData({...registerData, adminPassword: e.target.value})} type="password" required minLength={STRING_LIMITS.password.min} maxLength={STRING_LIMITS.password.max} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-600/20 text-[11px] font-bold outline-none" placeholder="Mot de passe" />
                    <input value={registerData.confirmPassword} onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})} type="password" required minLength={STRING_LIMITS.password.min} maxLength={STRING_LIMITS.password.max} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-600/20 text-[11px] font-bold outline-none" placeholder="Confirmation" />
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl shadow-xl hover:bg-indigo-700 transition-all text-[11px] font-black uppercase tracking-widest mt-4">Creer la salle</button>
                </form>
              )}
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center"><span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center justify-center gap-1.5"><ShieldCheck className="h-3 w-3 text-emerald-500" /> Acces securise</span></div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
