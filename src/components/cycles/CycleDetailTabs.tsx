'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Cycle, PTAT, LPP } from '@/types';
import EvaluationTab from './tabs/EvaluationTab';
import RankConfigTab from './tabs/RankConfigTab';
import RankOutputTab from './tabs/RankOutputTab';

interface CycleDetailTabsProps {
  cycle: Cycle;
  ptat: PTAT | null;
  lpp: LPP | null;
}

const STEPS = [
  { number: 1, label: 'Step 1' },
  { number: 2, label: 'Step 2' },
  { number: 3, label: 'Step 3' },
];

const STEP_TITLES = [
  'Step 1: Define the fields and the scores associated for the Evaluation/profile sheet',
  'Step 2: Rank Configuration',
  'Step 3: Rank Output',
];

export default function CycleDetailTabs({ cycle, ptat, lpp }: CycleDetailTabsProps) {
  const [activeStep, setActiveStep] = useState(1);

  const handleContinue = () => {
    if (activeStep < 3) setActiveStep(activeStep + 1);
  };

  return (
    <div className="page-container">
      {/* Step Progress Indicator */}
      <div className="step-progress">
        {STEPS.map((step, idx) => (
          <React.Fragment key={step.number}>
            <div className="step-item">
              <div
                className={`step-circle${activeStep === step.number ? ' active' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveStep(step.number)}
              >
                {step.number}
              </div>
              <span className={`step-label${activeStep === step.number ? ' active' : ''}`}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && <div className="step-connector" />}
          </React.Fragment>
        ))}
      </div>

      {/* Content Card */}
      <div className="card">
        {/* Top bar */}
        <div className="step-content-topbar">
          <Link href="/" className="home-link">
            Home
          </Link>
          <span className="center-title">Applications Evaluation Matrix</span>
          <button
            className="btn-primary"
            onClick={handleContinue}
            disabled={activeStep === 3}
            style={{ opacity: activeStep === 3 ? 0.5 : 1 }}
          >
            Continue
          </button>
        </div>

        {/* Section header */}
        <div className="step-section-title">
          <span style={{ cursor: 'pointer' }} onClick={() => activeStep > 1 && setActiveStep(activeStep - 1)}>
            {activeStep > 1 ? '← ' : ''}
          </span>
          <span>{STEP_TITLES[activeStep - 1]}</span>
        </div>

        {/* Program chip */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-text)' }}>Program:</span>
          <span className="chip">{lpp?.name ?? cycle.lppId}</span>
        </div>

        {/* Tab Content */}
        {activeStep === 1 && (
          <EvaluationTab cycle={cycle} onGoToRankConfig={() => setActiveStep(2)} lpp={lpp} />
        )}
        {activeStep === 2 && (
          <RankConfigTab cycle={cycle} />
        )}
        {activeStep === 3 && (
          <RankOutputTab cycle={cycle} />
        )}
      </div>
    </div>
  );
}
