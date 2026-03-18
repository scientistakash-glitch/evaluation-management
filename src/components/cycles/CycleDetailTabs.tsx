'use client';

import React from 'react';
import { Cycle, PTAT, LPP } from '@/types';

interface CycleDetailTabsProps {
  cycle: Cycle;
  ptat: PTAT | null;
  lpp: LPP | null;
}

// This component is no longer used. The new EvaluationWorkflow replaces it.
export default function CycleDetailTabs({ cycle, ptat }: CycleDetailTabsProps) {
  return (
    <div className="page-container">
      <h1 className="page-title">{cycle.name}</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>
        {ptat?.name} · {cycle.academicYear}
      </p>
    </div>
  );
}
