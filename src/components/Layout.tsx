import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Dumbbell, Users, CreditCard, Ticket, QrCode, Settings, LogOut, LayoutDashboard, Search, Menu, X, ShoppingBag, ShieldCheck, Building2, TrendingUp
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type SidebarContentProps = {
  isSuperAdmin: boolean;
  filteredNavItems: {
    name: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
  pathname: string;
  onCloseMobileMenu: () => void;
};

const getNavItemClassName = (isActive: boolean, isSuperAdmin: boolean) => {
  if (isActive) {
    return isSuperAdmin
      ? 'bg-rose-600 text-white shadow-sm shadow-rose-200/50'
      : 'bg-indigo-600 text-white shadow-sm shadow-indigo-200/50';
  }

  return isSuperAdmin
    ? 'text-slate-500 hover:bg-rose-50 hover:text-rose-600'
    : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600';
};

const getNavIconClassName = (isActive: boolean, isSuperAdmin: boolean) => {
  if (isActive) {
    return 'text-white';
  }

  return isSuperAdmin
    ? 'text-slate-400 group-hover:text-rose-600'
    : 'text-slate-400 group-hover:text-indigo-600';
};

const getUserRoleLabel = (role?: string) => {
  if (role === 'superadmin') {
    return 'Super Administrateur';
  }
  if (role === 'admin') {
    return 'Gérant Salle';
  }
  if (role === 'controller') {
    return 'Contrôleur';
  }
  if (role === 'cashier') {
    return 'Caissier';
  }
  return 'Staff';
};

const SidebarContent: React.FC<SidebarContentProps> = ({
  isSuperAdmin,
  filteredNavItems,
  pathname,
  onCloseMobileMenu,
}) => (
  <>
    <div className="h-14 flex items-center justify-between px-5 border-b border-slate-100/50 shrink-0">
      <div className="flex items-center">
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shadow-md mr-2.5", isSuperAdmin ? "bg-rose-600 shadow-rose-200" : "bg-indigo-600 shadow-indigo-200")}>
          {isSuperAdmin ? <ShieldCheck className="h-3.5 w-3.5 text-white" /> : <Dumbbell className="h-3.5 w-3.5 text-white" />}
        </div>
        <span className="text-lg font-extrabold tracking-tight text-slate-900">
          {isSuperAdmin ? <span className="text-rose-600">SUPER</span> : "GYM"} <span className={isSuperAdmin ? "text-slate-900" : "text-indigo-600"}>{isSuperAdmin ? "ADMIN" : "PRO"}</span>
        </span>
      </div>
      <button className="lg:hidden text-slate-400 hover:text-slate-600 p-1.5" onClick={onCloseMobileMenu}>
        <X className="h-4 w-4" />
      </button>
    </div>
    
    <nav className="flex-1 overflow-y-auto py-4 px-3">
      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">
        {isSuperAdmin ? 'Gestion Plateforme' : 'Menu Principal'}
      </div>
      <ul className="space-y-1">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          return (
            <li key={item.path}>
              <Link
                to={item.path}
                onClick={onCloseMobileMenu}
                className={cn(
                  "flex items-center px-3 py-2.5 lg:py-2 rounded-lg text-[12px] font-bold transition-all duration-200 group",
                  getNavItemClassName(isActive, isSuperAdmin)
                )}
              >
                <Icon className={cn("h-4 w-4 lg:h-3.5 lg:w-3.5 mr-2.5 transition-colors", getNavIconClassName(isActive, isSuperAdmin))} />
                {item.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  </>
);

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    const isSuper = user?.role === 'superadmin';
    logout();
    navigate(isSuper ? '/super' : '/login');
  };

  const navItems = [
    { name: 'Tableau de bord', path: '/', icon: LayoutDashboard, roles: ['admin', 'cashier', 'member'] },
    { name: 'Activités', path: '/activities', icon: Dumbbell, roles: ['admin', 'member'] },
    { name: 'Boutique', path: '/shop', icon: ShoppingBag, roles: ['admin', 'cashier', 'member'] },
    { name: 'Abonnements', path: '/subscriptions', icon: CreditCard, roles: ['admin', 'cashier', 'member'] },
    { name: 'Adhérents', path: '/members', icon: Users, roles: ['admin', 'cashier', 'member'] },
    { name: 'Tickets', path: '/tickets', icon: Ticket, roles: ['admin', 'cashier', 'member'] },
    { name: 'Contrôle d\'accès', path: '/access', icon: QrCode, roles: ['admin', 'controller', 'member'] },
    { name: 'Caisse', path: '/cash-register', icon: CreditCard, roles: ['admin', 'cashier', 'member'] },
    { name: 'Utilisateurs', path: '/users', icon: Settings, roles: ['admin'] },
  ];

  const superAdminItems = [
    { name: 'Vue d\'ensemble', path: '/super', icon: LayoutDashboard, roles: ['superadmin'] },
    { name: 'Gestion des Salles', path: '/super/gyms', icon: Building2, roles: ['superadmin'] },
    { name: 'Abonnements SaaS', path: '/super/subscriptions', icon: TrendingUp, roles: ['superadmin'] },
    { name: 'Utilisateurs Système', path: '/super/admins', icon: Users, roles: ['superadmin'] },
  ];

  const userRole = user ? String(user.role).toLowerCase().trim() : '';
  const isSuperAdmin = userRole === 'superadmin';

  const filteredNavItems = isSuperAdmin 
    ? superAdminItems 
    : navItems.filter((item) => item.roles.includes(userRole as any));
  const userRoleLabel = getUserRoleLabel(user?.role);

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-[#0F172A] overflow-hidden font-sans">
      
      {/* Mobile Slide-over Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-[240px] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
            <SidebarContent
              isSuperAdmin={isSuperAdmin}
              filteredNavItems={filteredNavItems}
              pathname={location.pathname}
              onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[220px] bg-white border-r border-slate-200/60 z-40 shrink-0">
        <SidebarContent
          isSuperAdmin={isSuperAdmin}
          filteredNavItems={filteredNavItems}
          pathname={location.pathname}
          onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
        />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Navbar */}
        <header className="min-h-14 px-3 lg:px-6 py-2 flex items-center justify-between gap-3 z-10 backdrop-blur-md bg-white/70 border-b border-slate-200/50 sticky top-0 shrink-0">
          <div className="flex items-center flex-1 min-w-0">
            <div className="flex items-center lg:hidden mr-2">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm shadow-indigo-200">
                <Dumbbell className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="ml-2 text-sm font-black text-slate-900 tracking-tighter uppercase italic">GYM <span className="text-indigo-600">PRO</span></span>
            </div>
            <div className="hidden sm:flex items-center bg-slate-100/50 rounded-full px-3 py-1.5 border border-slate-200/60 w-56 focus-within:bg-white focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
              <Search className="h-3.5 w-3.5 text-slate-400 mr-2 shrink-0" />
              <input 
                type="text" 
                placeholder="Rechercher..." 
                className="bg-transparent border-none outline-none text-[11px] w-full text-slate-700 placeholder-slate-400 font-medium"
              />
            </div>
          </div>

          <div className="flex items-center shrink-0 space-x-2 sm:space-x-4">
            <div
              className="flex items-center bg-white rounded-full p-1 pr-1 sm:pr-2.5 shadow-sm border border-slate-200/60 cursor-default hover:shadow-md transition-all max-w-[min(100%,20rem)] sm:max-w-[min(100%,22rem)]"
              title={
                user?.role === 'controller' && user.gymName
                  ? `${user.username} — ${user.gymName}`
                  : user?.username
              }
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold uppercase shadow-sm shrink-0">
                {user?.username.charAt(0)}
              </div>
              <div className="ml-2 mr-2 hidden sm:block text-left min-w-0 flex-1">
                <p
                  className="text-[11px] font-bold text-slate-700 leading-snug break-words [overflow-wrap:anywhere]"
                  title={user?.username}
                >
                  {user?.username}
                </p>
                {user?.role === 'controller' && user.gymName ? (
                  <p
                    className="text-[8px] font-bold text-slate-500 leading-snug mt-0.5 break-words [overflow-wrap:anywhere]"
                    title={user.gymName}
                  >
                    {user.gymName}
                  </p>
                ) : (
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-tight mt-0.5">
                    {userRoleLabel}
                  </p>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 ml-1 sm:ml-0"
                title="Déconnexion"
              >
                <LogOut className="h-3 w-3" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-3 pb-20 lg:p-6 lg:pb-6">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/60 flex justify-around items-center h-14 z-40 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <Link to="/" className={cn("flex flex-col items-center justify-center w-full h-full transition-colors", location.pathname === '/' ? "text-indigo-600" : "text-slate-400 hover:text-slate-600")}>
            <LayoutDashboard className="h-4 w-4 mb-0.5" />
            <span className="text-[9px] font-bold">Accueil</span>
          </Link>
          <Link to="/members" className={cn("flex flex-col items-center justify-center w-full h-full transition-colors", location.pathname === '/members' ? "text-indigo-600" : "text-slate-400 hover:text-slate-600")}>
            <Users className="h-4 w-4 mb-0.5" />
            <span className="text-[9px] font-bold">Membres</span>
          </Link>
          <Link to="/access" className={cn("flex flex-col items-center justify-center w-full h-full transition-colors", location.pathname === '/access' ? "text-indigo-600" : "text-slate-400 hover:text-slate-600")}>
            <QrCode className="h-4 w-4 mb-0.5" />
            <span className="text-[9px] font-bold">Scan</span>
          </Link>
          <button onClick={() => setIsMobileMenuOpen(true)} className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-slate-600 transition-colors">
            <Menu className="h-4 w-4 mb-0.5" />
            <span className="text-[9px] font-bold">Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
