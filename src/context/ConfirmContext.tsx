import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => void;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const confirm = (opts: ConfirmOptions) => {
    setOptions({
      confirmText: 'Confirmer',
      cancelText: 'Annuler',
      variant: 'danger',
      ...opts
    });
    setIsOpen(true);
  };

  const handleConfirm = async () => {
    if (!options) return;
    setIsProcessing(true);
    try {
      await options.onConfirm();
    } finally {
      setIsProcessing(false);
      setIsOpen(false);
      setTimeout(() => setOptions(null), 200);
    }
  };

  const handleCancel = () => {
    if (options?.onCancel) {
      options.onCancel();
    }
    setIsOpen(false);
    setTimeout(() => setOptions(null), 200);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AnimatePresence>
        {isOpen && options && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={handleCancel}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 border border-slate-100"
            >
              <button 
                onClick={handleCancel}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                  options.variant === 'danger' ? 'bg-red-50 text-red-500' :
                  options.variant === 'warning' ? 'bg-amber-50 text-amber-500' :
                  'bg-indigo-50 text-indigo-500'
                }`}>
                  <AlertTriangle className="h-6 w-6" />
                </div>
                
                <h3 className="text-lg font-extrabold text-slate-900 mb-2">{options.title}</h3>
                <p className="text-[13px] font-medium text-slate-500 mb-6">{options.message}</p>
                
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={handleCancel} 
                    disabled={isProcessing}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[13px] py-2.5 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {options.cancelText}
                  </button>
                  <button 
                    onClick={handleConfirm}
                    disabled={isProcessing}
                    className={`flex-1 font-bold text-[13px] py-2.5 rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center ${
                      options.variant === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-200' :
                      options.variant === 'warning' ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200' :
                      'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                    }`}
                  >
                    {isProcessing ? 'En cours...' : options.confirmText}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};
