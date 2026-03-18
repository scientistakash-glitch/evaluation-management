'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PTAT {
  id: string;
  name: string;
  code: string;
}

interface LPP {
  id: string;
  ptatId: string;
  name: string;
  code: string;
  duration: number;
}

interface CycleTimeline {
  startDate: string;
  offerReleaseDate: string;
  acceptanceDeadline: string;
  paymentDeadline: string;
  closingDate: string;
}

interface WizardState {
  currentStep: 1 | 2 | 3 | 4 | 5;
  step1: { name: string; number: string; academicYear: string; hasPreviousCycle: boolean };
  step2: { ptatId: string; lppIds: string[] };
  step3: { previousCycleId: string | null };
  step4: { timeline: CycleTimeline };
  step5: { evaluationStrategy: 'single' | 'program-wise' | null };
}

const STEP_LABELS = ['Basic Details', 'Program Group', 'Seat Matrix', 'Timelines', 'Evaluation Strategy'];
const ACADEMIC_YEARS = ['2024-2025', '2025-2026', '2026-2027', '2027-2028'];

// ─── Step Progress Indicator ──────────────────────────────────────────────────

function StepProgress({ currentStep }: { currentStep: number }) {
  return (
    <div className="step-progress">
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isDone = stepNum < currentStep;
        return (
          <React.Fragment key={stepNum}>
            <div className="step-item">
              <div className={`step-circle${isActive || isDone ? ' active' : ''}`}>
                {isDone ? '✓' : stepNum}
              </div>
              <span className={`step-label${isActive ? ' active' : ''}`}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && <div className="step-connector" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="toggle-switch" style={{ userSelect: 'none' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
      />
      <div
        className="toggle-track"
        style={{ background: checked ? 'var(--color-primary)' : '#D0C8C8', cursor: 'pointer' }}
        onClick={() => onChange(!checked)}
      >
        <div
          className="toggle-thumb"
          style={{ left: checked ? '23px' : '3px' }}
        />
      </div>
      <span style={{ fontSize: '14px', color: 'var(--color-text)', cursor: 'pointer' }}>
        {label}
      </span>
    </label>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CreateCyclePage() {
  const router = useRouter();

  const [wizard, setWizard] = useState<WizardState>({
    currentStep: 1,
    step1: { name: '', number: '', academicYear: '2025-2026', hasPreviousCycle: false },
    step2: { ptatId: '', lppIds: [] },
    step3: { previousCycleId: null },
    step4: {
      timeline: {
        startDate: '',
        offerReleaseDate: '',
        acceptanceDeadline: '',
        paymentDeadline: '',
        closingDate: '',
      },
    },
    step5: { evaluationStrategy: null },
  });

  const [ptats, setPtats] = useState<PTAT[]>([]);
  const [lpps, setLpps] = useState<LPP[]>([]);
  const [previousStats, setPreviousStats] = useState<
    { lppId: string; lppName: string; intake: number; previousOffers: number; previousAcceptances: number }[]
  >([]);
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});
  const [step4Errors, setStep4Errors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Load PTATs on mount
  useEffect(() => {
    fetch('/api/ptats')
      .then((r) => r.json())
      .then((data) => setPtats(Array.isArray(data) ? data : []));
  }, []);

  // Load LPPs when ptatId changes
  useEffect(() => {
    if (!wizard.step2.ptatId) return;
    fetch(`/api/lpps?ptatId=${wizard.step2.ptatId}`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setLpps(list);
        setWizard((prev) => ({
          ...prev,
          step2: { ...prev.step2, lppIds: list.map((l: LPP) => l.id) },
        }));
      });
  }, [wizard.step2.ptatId]);

  // Load previous stats for seat matrix (step 3)
  const loadPreviousStats = useCallback(async () => {
    if (!wizard.step2.ptatId || !wizard.step1.hasPreviousCycle) {
      // Build from lpps with zeros
      const stats = lpps.map((l) => ({
        lppId: l.id,
        lppName: l.name,
        intake: 60,
        previousOffers: 0,
        previousAcceptances: 0,
      }));
      setPreviousStats(stats);
      return;
    }
    try {
      // Find previous cycles for this ptat
      const cyclesRes = await fetch(`/api/cycles?ptatId=${wizard.step2.ptatId}`).then((r) => r.json());
      const prevCycles = (Array.isArray(cyclesRes) ? cyclesRes : []).filter(
        (c: { status: string }) => c.status === 'Closed' || c.status === 'Approved'
      );
      if (prevCycles.length === 0) {
        const stats = lpps.map((l) => ({
          lppId: l.id,
          lppName: l.name,
          intake: 60,
          previousOffers: 0,
          previousAcceptances: 0,
        }));
        setPreviousStats(stats);
        return;
      }
      // Sort by closingDate desc
      prevCycles.sort(
        (a: { timeline: { closingDate: string } }, b: { timeline: { closingDate: string } }) =>
          b.timeline.closingDate.localeCompare(a.timeline.closingDate)
      );
      const latestPrev = prevCycles[0];
      const statsRes = await fetch(`/api/cycles/${latestPrev.id}/previous-stats`).then((r) => r.json());
      if (statsRes.programs) {
        setPreviousStats(statsRes.programs);
      } else {
        const stats = lpps.map((l) => ({
          lppId: l.id,
          lppName: l.name,
          intake: 60,
          previousOffers: 0,
          previousAcceptances: 0,
        }));
        setPreviousStats(stats);
      }
    } catch {
      const stats = lpps.map((l) => ({
        lppId: l.id,
        lppName: l.name,
        intake: 60,
        previousOffers: 0,
        previousAcceptances: 0,
      }));
      setPreviousStats(stats);
    }
  }, [wizard.step2.ptatId, wizard.step1.hasPreviousCycle, lpps]);

  // ── Step 1 Validation ──
  function validateStep1(): boolean {
    const errors: Record<string, string> = {};
    const { name, number, academicYear } = wizard.step1;
    if (!name.trim() || name.trim().length < 3) {
      errors.name = 'Cycle name must be at least 3 characters';
    }
    const num = parseInt(number);
    if (!number || isNaN(num) || num < 1) {
      errors.number = 'Cycle number must be a positive integer';
    }
    if (!academicYear) {
      errors.academicYear = 'Academic year is required';
    }
    setStep1Errors(errors);
    return Object.keys(errors).length === 0;
  }

  // ── Step 4 Validation ──
  function validateStep4(): boolean {
    const errors: Record<string, string> = {};
    const t = wizard.step4.timeline;
    if (!t.startDate) errors.startDate = 'Start date is required';
    if (!t.offerReleaseDate) errors.offerReleaseDate = 'Offer release date is required';
    if (!t.acceptanceDeadline) errors.acceptanceDeadline = 'Acceptance deadline is required';
    if (!t.paymentDeadline) errors.paymentDeadline = 'Payment deadline is required';
    if (!t.closingDate) errors.closingDate = 'Closing date is required';

    if (
      t.startDate &&
      t.offerReleaseDate &&
      t.offerReleaseDate <= t.startDate
    ) {
      errors.offerReleaseDate = 'Must be after start date';
    }
    if (
      t.offerReleaseDate &&
      t.acceptanceDeadline &&
      t.acceptanceDeadline <= t.offerReleaseDate
    ) {
      errors.acceptanceDeadline = 'Must be after offer release date';
    }
    if (
      t.acceptanceDeadline &&
      t.paymentDeadline &&
      t.paymentDeadline <= t.acceptanceDeadline
    ) {
      errors.paymentDeadline = 'Must be after acceptance deadline';
    }
    if (
      t.paymentDeadline &&
      t.closingDate &&
      t.closingDate <= t.paymentDeadline
    ) {
      errors.closingDate = 'Must be after payment deadline';
    }

    setStep4Errors(errors);
    return Object.keys(errors).length === 0;
  }

  // ── Navigation ──
  async function handleContinue() {
    const { currentStep } = wizard;

    if (currentStep === 1) {
      if (!validateStep1()) return;
    }
    if (currentStep === 2) {
      if (!wizard.step2.ptatId) return;
    }
    if (currentStep === 3) {
      // Proceed; stats are read-only
    }
    if (currentStep === 4) {
      if (!validateStep4()) return;
    }

    if (currentStep === 3) {
      // entering step 3 — load stats
      await loadPreviousStats();
    }

    setWizard((prev) => ({ ...prev, currentStep: (prev.currentStep + 1) as WizardState['currentStep'] }));
  }

  async function handleBack() {
    setWizard((prev) => ({ ...prev, currentStep: (prev.currentStep - 1) as WizardState['currentStep'] }));
  }

  // ── Final Submit ──
  async function handleCreate() {
    if (!wizard.step5.evaluationStrategy) return;
    setIsSaving(true);
    setSaveError('');
    try {
      const body = {
        name: wizard.step1.name.trim(),
        number: parseInt(wizard.step1.number),
        academicYear: wizard.step1.academicYear,
        hasPreviousCycle: wizard.step1.hasPreviousCycle,
        ptatId: wizard.step2.ptatId,
        lppIds: wizard.step2.lppIds,
        timeline: wizard.step4.timeline,
        evaluationStrategy: wizard.step5.evaluationStrategy,
      };

      const res = await fetch('/api/cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.error ?? 'Failed to create cycle');
        return;
      }

      const newCycle = await res.json();
      router.push(`/cycle/${newCycle.id}/evaluation`);
    } finally {
      setIsSaving(false);
    }
  }

  // ─── Render Steps ──────────────────────────────────────────────────────────

  function renderStep1() {
    const { name, number, academicYear, hasPreviousCycle } = wizard.step1;
    const update = (field: string, value: string | boolean) =>
      setWizard((prev) => ({ ...prev, step1: { ...prev.step1, [field]: value } }));

    return (
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '24px' }}>
          Basic Details
        </h2>

        <div className="form-group">
          <label className="form-label">Cycle Name *</label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. B.Tech Admissions 2025"
            value={name}
            onChange={(e) => update('name', e.target.value)}
          />
          {step1Errors.name && <div className="field-error">{step1Errors.name}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">Cycle Number *</label>
          <input
            className="form-input"
            type="number"
            placeholder="e.g. 1"
            min={1}
            value={number}
            onChange={(e) => update('number', e.target.value)}
          />
          {step1Errors.number && <div className="field-error">{step1Errors.number}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">Academic Year *</label>
          <select
            className="form-select"
            value={academicYear}
            onChange={(e) => update('academicYear', e.target.value)}
          >
            {ACADEMIC_YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {step1Errors.academicYear && <div className="field-error">{step1Errors.academicYear}</div>}
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Previous Cycle Exists</label>
          <ToggleSwitch
            checked={hasPreviousCycle}
            onChange={(v) => update('hasPreviousCycle', v)}
            label={hasPreviousCycle ? 'Yes – use previous cycle data' : 'No – this is the first cycle'}
          />
        </div>
      </div>
    );
  }

  function renderStep2() {
    const selectedPtatId = wizard.step2.ptatId;

    return (
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '8px' }}>
          Program Group
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
          Select the program group (PTAT) for this cycle. All programs under it will be included.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
          {ptats.map((ptat) => {
            const ptatLpps = lpps.filter((l) => l.ptatId === ptat.id);
            const isSelected = selectedPtatId === ptat.id;
            return (
              <div
                key={ptat.id}
                className={`ptat-card${isSelected ? ' selected' : ''}`}
                onClick={() =>
                  setWizard((prev) => ({ ...prev, step2: { ptatId: ptat.id, lppIds: [] } }))
                }
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)' }}>
                      {ptat.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      Code: {ptat.code}
                    </div>
                  </div>
                  {isSelected && (
                    <span
                      style={{
                        background: 'var(--color-primary)',
                        color: 'white',
                        borderRadius: '999px',
                        padding: '4px 14px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      Selected
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {selectedPtatId && lpps.length > 0 && (
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '12px', color: 'var(--color-text)' }}>
              Programs included:
            </div>
            <table className="data-table" style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
              <thead>
                <tr>
                  <th>Program</th>
                  <th>Code</th>
                  <th>Duration</th>
                  <th>Intake</th>
                </tr>
              </thead>
              <tbody>
                {lpps
                  .filter((l) => l.ptatId === selectedPtatId)
                  .map((lpp) => (
                    <tr key={lpp.id}>
                      <td style={{ fontWeight: 500 }}>{lpp.name}</td>
                      <td>{lpp.code}</td>
                      <td>{lpp.duration} yr{lpp.duration !== 1 ? 's' : ''}</td>
                      <td>60</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {ptats.length === 0 && (
          <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            No program groups found. Please create PTATs first.
          </div>
        )}
      </div>
    );
  }

  function renderStep3() {
    const hasPrev = wizard.step1.hasPreviousCycle;

    return (
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '8px' }}>
          Seat Matrix Snapshot
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
          Read-only snapshot of intake and previous cycle data.
        </p>

        {!hasPrev ? (
          <div className="info-card" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No previous cycle data available. Offers and acceptances will show as 0.
          </div>
        ) : null}

        {previousStats.length > 0 ? (
          <table
            className="data-table"
            style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}
          >
            <thead>
              <tr>
                <th>Program</th>
                <th>Intake</th>
                <th>Previous Offers</th>
                <th>Previous Acceptances</th>
              </tr>
            </thead>
            <tbody>
              {previousStats.map((row) => (
                <tr key={row.lppId}>
                  <td style={{ fontWeight: 500 }}>{row.lppName}</td>
                  <td>{row.intake}</td>
                  <td>{row.previousOffers}</td>
                  <td>{row.previousAcceptances}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Loading seat data...</div>
        )}
      </div>
    );
  }

  function renderStep4() {
    const t = wizard.step4.timeline;
    const updateTimeline = (field: string, value: string) =>
      setWizard((prev) => ({
        ...prev,
        step4: { timeline: { ...prev.step4.timeline, [field]: value } },
      }));

    const fields: { field: keyof CycleTimeline; label: string }[] = [
      { field: 'startDate', label: 'Cycle Start Date' },
      { field: 'offerReleaseDate', label: 'Offer Release Date' },
      { field: 'acceptanceDeadline', label: 'Offer Acceptance Deadline' },
      { field: 'paymentDeadline', label: 'Payment Deadline' },
      { field: 'closingDate', label: 'Cycle Closing Date' },
    ];

    return (
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '8px' }}>
          Timelines
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
          Set the key dates for this admissions cycle. Dates must be in chronological order.
        </p>

        {fields.map(({ field, label }) => (
          <div className="form-group" key={field}>
            <label className="form-label">{label} *</label>
            <input
              className="form-input"
              type="date"
              value={t[field]}
              onChange={(e) => updateTimeline(field, e.target.value)}
            />
            {step4Errors[field] && <div className="field-error">{step4Errors[field]}</div>}
          </div>
        ))}
      </div>
    );
  }

  function renderStep5() {
    const strategy = wizard.step5.evaluationStrategy;

    return (
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '8px' }}>
          Evaluation Strategy
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
          Choose how applicants will be evaluated in this cycle.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label
            className={`radio-card${strategy === 'single' ? ' selected' : ''}`}
          >
            <input
              type="radio"
              name="strategy"
              value="single"
              checked={strategy === 'single'}
              onChange={() =>
                setWizard((prev) => ({ ...prev, step5: { evaluationStrategy: 'single' } }))
              }
            />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '6px' }}>
                Fresh Evaluation
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                Start from scratch with a single composite score configuration applied to all
                candidates uniformly. Best for new cycles without historical data.
              </div>
            </div>
          </label>

          <label
            className={`radio-card${strategy === 'program-wise' ? ' selected' : ''}`}
          >
            <input
              type="radio"
              name="strategy"
              value="program-wise"
              checked={strategy === 'program-wise'}
              onChange={() =>
                setWizard((prev) => ({ ...prev, step5: { evaluationStrategy: 'program-wise' } }))
              }
            />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '6px' }}>
                Reuse Previous Cycle
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                Configure weights separately per program. If a previous cycle exists for this
                program group, weights will be pre-filled from that cycle&apos;s evaluation config.
              </div>
            </div>
          </label>
        </div>

        {saveError && (
          <div
            style={{
              marginTop: '20px',
              background: '#FEE2E2',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#C41010',
              fontSize: '14px',
            }}
          >
            {saveError}
          </div>
        )}
      </div>
    );
  }

  // ─── Layout ────────────────────────────────────────────────────────────────

  const { currentStep } = wizard;

  const canContinue = () => {
    if (currentStep === 2 && !wizard.step2.ptatId) return false;
    if (currentStep === 5 && !wizard.step5.evaluationStrategy) return false;
    return true;
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: '8px' }}>
        <button
          onClick={() => router.push('/')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-primary)',
            fontSize: '14px',
            cursor: 'pointer',
            padding: 0,
            fontWeight: 500,
          }}
        >
          ← Back to Cycles
        </button>
      </div>

      <h1 className="page-title" style={{ marginBottom: '4px' }}>Create New Cycle</h1>
      <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '0' }}>
        Follow the steps below to set up a new admissions cycle.
      </p>

      <StepProgress currentStep={currentStep} />

      <div className="wizard-card">
        <div className="wizard-body">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
        </div>

        <div className="wizard-footer">
          <div>
            {currentStep > 1 && (
              <button className="btn-secondary" onClick={handleBack}>
                ← Back
              </button>
            )}
          </div>

          <div>
            {currentStep < 5 && (
              <button
                className="btn-primary"
                onClick={currentStep === 3 ? handleContinue : handleContinue}
                disabled={!canContinue()}
              >
                Continue →
              </button>
            )}
            {currentStep === 5 && (
              <button
                className="btn-primary"
                onClick={handleCreate}
                disabled={!wizard.step5.evaluationStrategy || isSaving}
              >
                {isSaving ? 'Creating...' : 'Create Cycle'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
