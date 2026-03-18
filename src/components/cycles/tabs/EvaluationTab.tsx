'use client';

import React from 'react';
import { Cycle, LPP } from '@/types';

interface EvaluationTabProps {
  cycle: Cycle;
  onGoToRankConfig?: () => void;
  lpp?: LPP | null;
}

// This component is no longer used. The new EvaluationWorkflow replaces it.
export default function EvaluationTab({ cycle }: EvaluationTabProps) {
  return (
    <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
      Evaluation workflow for cycle {cycle.name}.
    </div>
  );
}
