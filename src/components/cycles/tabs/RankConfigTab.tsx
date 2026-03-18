'use client';

import React from 'react';
import { Cycle } from '@/types';

interface RankConfigTabProps {
  cycle: Cycle;
}

// This component is no longer used. The new EvaluationWorkflow replaces it.
export default function RankConfigTab({ cycle }: RankConfigTabProps) {
  return (
    <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
      Rank configuration for cycle {cycle.name}.
    </div>
  );
}
