'use client';
import { useEffect } from 'react';

export default function SessionReset() {
  useEffect(() => {
    if (!sessionStorage.getItem('app-session')) {
      sessionStorage.setItem('app-session', '1');
      fetch('/api/reset', { method: 'POST' });
    }
  }, []);
  return null;
}
