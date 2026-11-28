'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  const style =
    toast.type === 'success'
      ? 'bg-emerald-900 border-emerald-700'
      : toast.type === 'warning'
        ? 'bg-amber-900 border-amber-700'
        : toast.type === 'error'
          ? 'bg-rose-900 border-rose-700'
          : 'bg-slate-900 border-slate-700';
  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-center justify-between gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-xs font-medium text-white transition-all ${style}`}
    >
      <div className="flex items-center gap-2">
        {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />}
        {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />}
        {toast.type === 'error' && <XCircle className="w-4 h-4 text-rose-300 shrink-0" />}
        {toast.type === 'info' && <Info className="w-4 h-4 text-sky-300 shrink-0" />}
        <span>{toast.message}</span>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="text-white/70 hover:text-white min-w-[44px] min-h-[44px] inline-flex items-center justify-center -mr-2"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/** Toast provider. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3800);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <aside
        aria-live="polite"
        aria-atomic="true"
        className="fixed top-4 right-4 left-4 sm:left-auto z-[70] flex flex-col gap-2 pointer-events-none max-w-sm ml-auto"
      >
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            toast={t}
            onDismiss={(id) => setToasts((prev) => prev.filter((x) => x.id !== id))}
          />
        ))}
      </aside>
    </ToastContext.Provider>
  );
}
