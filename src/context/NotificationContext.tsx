import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (message: string, type?: NotificationType, duration?: number) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  const showNotification = useCallback(
    (message: string, type: NotificationType = 'info', duration?: number) => {
      const id = Math.random().toString(36).substring(2, 9);
      const resolvedDuration =
        duration ?? (type === 'error' ? 8000 : 4000);
      const newNotification: Notification = { id, type, message, duration: resolvedDuration };
      
      setNotifications((prev) => [...prev, newNotification]);

      if (resolvedDuration > 0) {
        setTimeout(() => removeNotification(id), resolvedDuration);
      }
    },
    [removeNotification]
  );

  return (
    <NotificationContext.Provider value={{ notifications, showNotification, removeNotification }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none px-4 sm:px-0">
      <AnimatePresence>
        {notifications.map((notification) => (
          <NotificationItem 
            key={notification.id} 
            notification={notification} 
            onClose={() => removeNotification(notification.id)} 
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

const NotificationItem: React.FC<{ notification: Notification; onClose: () => void }> = ({ notification, onClose }) => {
  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    error: <XCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertCircle className="h-5 w-5 text-amber-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />
  };

  const backgrounds = {
    success: 'bg-emerald-50 border-emerald-100',
    error: 'bg-red-50 border-red-100',
    warning: 'bg-amber-50 border-amber-100',
    info: 'bg-blue-50 border-blue-100'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className={`pointer-events-auto flex items-start gap-3 p-3 rounded-xl shadow-lg border ${backgrounds[notification.type]}`}
    >
      <div className="shrink-0 mt-0.5">{icons[notification.type]}</div>
      <div className="flex-1 text-[13px] font-bold text-slate-800 leading-snug">
        {notification.message}
      </div>
      <button 
        onClick={onClose}
        className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors rounded-full p-1 hover:bg-slate-200/50"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
};
