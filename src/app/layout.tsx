import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/common/ToastContext';
import AppNavigation from '@/components/layout/AppNavigation';
import SessionReset from '@/components/common/SessionReset';

export const metadata: Metadata = {
  title: 'Evaluation Management',
  description: 'Evaluation Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <SessionReset />
          <AppNavigation />
          <main style={{ minHeight: 'calc(100vh - 56px)', background: 'var(--color-bg)' }}>
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
