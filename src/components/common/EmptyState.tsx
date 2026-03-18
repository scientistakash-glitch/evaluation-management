'use client';

import React from 'react';

interface EmptyStateProps {
  heading: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ heading, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: '#999' }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
      <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#3e3e3c', marginBottom: '8px' }}>{heading}</h3>
      {message && <p style={{ fontSize: '15px' }}>{message}</p>}
      {actionLabel && onAction && (
        <button className="btn-secondary" style={{ marginTop: '16px' }} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
