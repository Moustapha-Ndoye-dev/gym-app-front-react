/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type ReactNode, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
NProgress.configure({ showSpinner: false, speed: 400, minimum: 0.15 });

const RouteChangeTracker = () => {
  const location = useLocation();

  useEffect(() => {
    NProgress.start();
    const timer = setTimeout(() => NProgress.done(), 300);
    return () => { clearTimeout(timer); NProgress.done(); };
  }, [location.pathname]);

  return null;
};
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { NotificationProvider } from './context/NotificationContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { PwaPrompt } from './components/PwaPrompt';
import { Login } from './pages/Login';
import { SuperLogin } from './pages/SuperLogin';
import { Dashboard } from './pages/Dashboard';
import { Activities } from './pages/Activities';
import { Subscriptions } from './pages/Subscriptions';
import { Members } from './pages/Members';
import { Tickets } from './pages/Tickets';
import { AccessControl } from './pages/AccessControl';
import { CashRegister } from './pages/CashRegister';
import { Users } from './pages/Users';
import { Shop } from './pages/Shop';
import { SuperDashboard } from './pages/SuperDashboard';
import { SuperGyms } from './pages/SuperGyms';
import { SuperSubscriptions } from './pages/SuperSubscriptions';
import { SuperAdmins } from './pages/SuperAdmins';

const SuperAdminRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (user?.role !== 'superadmin') {
    return <SuperLogin />;
  }
  return <>{children}</>;
};

const ProtectedRoute: React.FC<{ children: ReactNode; roles?: string[] }> = ({ children, roles }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles) {
    const allowedRoles = roles.map(r => r.toLowerCase());
    const userRole = String(user.role).toLowerCase();
    if (!allowedRoles.includes(userRole)) {
      if (userRole === 'controller') {
        return <Navigate to="/access" replace />;
      }
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <NotificationProvider>
      <ConfirmProvider>
        <AuthProvider>
          <BrowserRouter>
            <RouteChangeTracker />
            <PwaPrompt />
            <Routes>
              <Route path="/login" element={<Login />} />
              
              {/* Super Admin Routes */}
              <Route path="/super" element={<SuperAdminRoute><Layout /></SuperAdminRoute>}>
                <Route index element={<SuperDashboard />} />
                <Route path="gyms" element={<SuperGyms />} />
                <Route path="subscriptions" element={<SuperSubscriptions />} />
                <Route path="admins" element={<SuperAdmins />} />
              </Route>

              {/* Standard Admin/Staff Routes */}
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<ProtectedRoute roles={['admin', 'cashier', 'member']}><Dashboard /></ProtectedRoute>} />
                <Route path="activities" element={<ProtectedRoute roles={['admin', 'member']}><Activities /></ProtectedRoute>} />
                <Route path="shop" element={<ProtectedRoute roles={['admin', 'cashier', 'member']}><Shop /></ProtectedRoute>} />
                <Route path="subscriptions" element={<ProtectedRoute roles={['admin', 'cashier', 'member']}><Subscriptions /></ProtectedRoute>} />
                <Route path="members" element={<ProtectedRoute roles={['admin', 'cashier', 'member']}><Members /></ProtectedRoute>} />
                <Route path="tickets" element={<ProtectedRoute roles={['admin', 'cashier', 'member']}><Tickets /></ProtectedRoute>} />
                <Route path="access" element={<ProtectedRoute roles={['admin', 'controller', 'member']}><AccessControl /></ProtectedRoute>} />
                <Route path="cash-register" element={<ProtectedRoute roles={['admin', 'cashier', 'member']}><CashRegister /></ProtectedRoute>} />
                <Route path="users" element={<ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ConfirmProvider>
    </NotificationProvider>
  );
}
