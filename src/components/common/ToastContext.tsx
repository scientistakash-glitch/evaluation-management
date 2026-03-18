'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: string;
  heading: string;
  text?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (heading: string, variant?: ToastVariant, text?: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const VARIANT_STYLES: Record<ToastVariant, { background: string; color: string; border: string }> = {
  success: { background: '#DCFCE7', color: '#166534', border: '#BBF7D0' },
  error: { background: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' },
  warning: { background: '#FEF9C3', color: '#854D0E', border: '#FDE047' },
  info: { background: '#DBEAFE', color: '#1E40AF', border: '#93C5FD' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((heading: string, variant: ToastVariant = 'success', text?: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, heading, text, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 9999,
          }}
        >
          {toasts.map((toast) => {
            const styles = VARIANT_STYLES[toast.variant];
            return (
              <div
                key={toast.id}
                style={{
                  background: styles.background,
                  color: styles.color,
                  border: `1px solid ${styles.border}`,
                  borderRadius: '10px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  minWidth: '280px',
                  maxWidth: '400px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                }}
              >
                <span>{toast.heading}</span>
                <button
                  onClick={() => removeToast(toast.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: styles.color,
                    fontSize: '16px',
                    padding: '0',
                    lineHeight: 1,
                    opacity: 0.7,
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}
