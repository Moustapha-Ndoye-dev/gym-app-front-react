import React, { createContext, useContext, useState } from 'react';

type User = {
  id: number;
  username: string;
  role: 'admin' | 'cashier' | 'controller' | 'member' | 'superadmin';
  gymId: number;
  /** Nom de la salle (renvoyé par l’API à la connexion, hors superadmin). */
  gymName?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (userData: User, authToken: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isValidStoredUser = (value: unknown): value is User => {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Record<string, unknown>;
  const validRoles = ['admin', 'cashier', 'controller', 'member', 'superadmin'];

  const gymNameOk =
    candidate.gymName === undefined ||
    candidate.gymName === null ||
    typeof candidate.gymName === 'string';

  return (
    typeof candidate.id === 'number' &&
    typeof candidate.username === 'string' &&
    typeof candidate.role === 'string' &&
    validRoles.includes(candidate.role) &&
    typeof candidate.gymId === 'number' &&
    gymNameOk
  );
};

const readStoredUser = (): User | null => {
  const storedUser = localStorage.getItem('user');
  if (!storedUser) return null;

  try {
    const parsed = JSON.parse(storedUser);
    if (isValidStoredUser(parsed)) {
      return parsed;
    }
  } catch {}

  localStorage.removeItem('user');
  localStorage.removeItem('token');
  return null;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    return readStoredUser();
  });
  
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token') || null;
  });

  const login = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
