'use client';

import React from 'react';
import Button from '@salesforce/design-system-react/components/button';

interface EmptyStateProps {
  heading: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ heading, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: '#f3f3f3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
          fontSize: '36px',
        }}
      >
        📋
      </div>
      <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#3e3e3c', marginBottom: '8px' }}>
        {heading}
      </h3>
      {message && (
        <p style={{ color: '#706e6b', maxWidth: '360px', marginBottom: '20px' }}>{message}</p>
      )}
      {actionLabel && onAction && (
        <Button label={actionLabel} variant="brand" onClick={onAction} />
      )}
    </div>
  );
}
