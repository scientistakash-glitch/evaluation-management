'use client';

import React from 'react';
import { Cycle, PTAT, LPP } from '@/types';
import StatusBadge from '../../common/StatusBadge';

interface OverviewTabProps {
  cycle: Cycle;
  ptat: PTAT | null;
  lpp: LPP | null;
}

export default function OverviewTab({ cycle, ptat, lpp }: OverviewTabProps) {
  const fields = [
    { label: 'Cycle Name', value: cycle.name },
    { label: 'Academic Year', value: cycle.academicYear },
    { label: 'Cycle Number', value: cycle.number },
    { label: 'Status', value: <StatusBadge status={cycle.status} /> },
    { label: 'PTAT', value: ptat ? `${ptat.name} (${ptat.code})` : cycle.ptatId },
    {
      label: 'Programs',
      value: lpp ? `${lpp.name} (${lpp.code})` : cycle.lppIds.join(', '),
    },
    { label: 'Start Date', value: cycle.timeline?.startDate ?? '' },
    { label: 'Closing Date', value: cycle.timeline?.closingDate ?? '' },
    { label: 'Created At', value: new Date(cycle.createdAt).toLocaleDateString() },
  ];

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {fields.map((field) => (
          <div key={field.label}>
            <div style={{ color: '#706e6b', fontSize: '12px', marginBottom: '4px' }}>{field.label}</div>
            <div style={{ fontWeight: 500 }}>{field.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
