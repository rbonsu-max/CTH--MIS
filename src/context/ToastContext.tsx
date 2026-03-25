import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 4000); // 4 second duration
  }, [removeToast]);

  const success = useCallback((msg: string) => toast(msg, 'success'), [toast]);
  const error = useCallback((msg: string) => toast(msg, 'error'), [toast]);
  const info = useCallback((msg: string) => toast(msg, 'info'), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className={`
                pointer-events-auto flex items-center gap-3 p-4 pr-10 min-w-[300px] max-w-sm rounded-xl shadow-lg border relative overflow-hidden backdrop-blur-md
                ${t.type === 'success' ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800' : ''}
                ${t.type === 'error' ? 'bg-red-50/90 border-red-200 text-red-800' : ''}
                ${t.type === 'info' ? 'bg-blue-50/90 border-blue-200 text-blue-800' : ''}
              `}
            >
              {/* Icon */}
              <div className="shrink-0 flex items-center justify-center p-1 rounded-full bg-white/50 backdrop-blur-sm">
                {t.type === 'success' && <CheckCircle className="text-emerald-500 w-5 h-5" />}
                {t.type === 'error' && <AlertCircle className="text-red-500 w-5 h-5" />}
                {t.type === 'info' && <Info className="text-blue-500 w-5 h-5" />}
              </div>

              {/* Message */}
              <p className="text-sm font-medium leading-tight">
                {t.message}
              </p>

              {/* Close Button */}
              <button
                onClick={() => removeToast(t.id)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg mt-0.5 opacity-60 hover:opacity-100 hover:bg-black/5 active:bg-black/10 transition-all focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
