import React from 'react';
import { useUiStore } from '@/store/uiStore';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUiStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => {
        const variantClasses = {
          default: 'bg-ink text-base border-ink/40',
          success: 'bg-ink text-base border-success/40',
          danger: 'bg-danger text-base border-danger/40',
          info: 'bg-ink text-base border-info/40',
        }[toast.variant || 'default'];

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-card border shadow-xl transition-all duration-200 animate-in fade-in slide-in-from-bottom-3 ${variantClasses}`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.variant === 'success' && <CheckCircle2 className="w-4 h-4 text-success" />}
              {toast.variant === 'danger' && <AlertTriangle className="w-4 h-4 text-base" />}
              {toast.variant === 'info' && <Info className="w-4 h-4 text-info" />}
              {(!toast.variant || toast.variant === 'default') && <Info className="w-4 h-4 text-accent" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">{toast.title}</div>
              {toast.description && (
                <div className="text-xs text-base/80 mt-0.5 leading-relaxed">{toast.description}</div>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-base/60 hover:text-base cursor-pointer p-0.5"
              aria-label="Dismiss toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
