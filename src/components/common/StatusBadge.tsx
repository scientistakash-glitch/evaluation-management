'use client';

import React from 'react';

const CATEGORY_COLOR: Record<string, string> = {
  General: '#0070d2',
  OBC: '#2e844a',
  SC: '#9e5cc5',
  ST: '#dd7a01',
  EWS: '#ba0517',
};

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  Active: { bg: '#2e844a', color: '#fff' },
  Planned: { bg: '#dd7a01', color: '#fff' },
  Closed: { bg: '#706e6b', color: '#fff' },
  Scored: { bg: '#0070d2', color: '#fff' },
  Ranked: { bg: '#2e844a', color: '#fff' },
  Draft: { bg: '#dd7a01', color: '#fff' },
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const categoryColor = CATEGORY_COLOR[status];
  const statusStyle = STATUS_COLOR[status];

  const bg = categoryColor || (statusStyle?.bg ?? '#706e6b');
  const textColor = statusStyle?.color ?? '#fff';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        height: '22px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 700,
        color: textColor,
        background: bg,
        letterSpacing: '0.3px',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </span>
  );
}
