'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/common/ToastContext';

// ── Types ──────────────────────────────────────────────────────────────────────

interface PTAT { id: string; name: string; code: string; }
interface LPP  { id: string; ptatId: string; name: string; code: string; }

interface TiebreakerRule {
  order: number;
  criterionId: 'entrance' | 'academic' | 'interview';
  criterionName: string;
  direction: 'DESC' | 'ASC';
}

interface ProgramWeights { entrance: number; academic: number; interview: number; }
interface ProgramConfig  { programId: string; programName: string; weights: ProgramWeights; scoresGenerated: boolean; }

const ACADEMIC_YEARS = ['2024-2025', '2025-2026', '2026-2027', '2027-2028'];
const CRITERION_OPTIONS: { id: 'entrance' | 'academic' | 'interview'; label: string }[] = [
  { id: 'entrance',  label: 'Entrance Score' },
  { id: 'academic',  label: 'Academic Score' },
  { id: 'interview', label: 'Interview Score' },
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function CreateCyclePage() {
  const router = useRouter();
  const { showToast } = useToast();

  // Step state
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 5;

  // Step 1 — Academic Year
  const [academicYear, setAcademicYear] = useState('');

  // Step 2 — Program Group
  const [ptats, setPtats]                     = useState<PTAT[]>([]);
  const [lpps,  setLpps]                      = useState<LPP[]>([]);
  const [selectedPtatId, setSelectedPtatId]   = useState('');
  const [cycleNumber, setCycleNumber]         = useState<number | null>(null);
  const [loadingPtats, setLoadingPtats]       = useState(false);
  const [loadingCycleNum, setLoadingCycleNum] = useState(false);

  // Step 3 — Timelines
  const [timeline, setTimeline] = useState({
    startDate: '', offerReleaseDate: '', acceptanceDeadline: '',
    paymentDeadline: '', closingDate: '',
  });

  // Step 4 — Strategy
  const [strategy, setStrategy] = useState<'single' | 'program-wise' | null>(null);

  // Step 5 — Criteria & Tiebreakers
  const [programConfigs, setProgramConfigs] = useState<ProgramConfig[]>([]);
  const [tiebreakerRules, setTiebreakerRules] = useState<TiebreakerRule[]>([
    { order: 0, criterionId: 'entrance', criterionName: 'Entrance Score', direction: 'DESC' },
  ]);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  // Load PTATs once
  useEffect(() => {
    setLoadingPtats(true);
    fetch('/api/ptats')
      .then((r) => r.json())
      .then((data) => setPtats(Array.isArray(data) ? data : []))
      .finally(() => setLoadingPtats(false));
  }, []);

  // Load LPPs and cycle number when PTAT + year selected
  useEffect(() => {
    if (!selectedPtatId || !academicYear) return;
    setLoadingCycleNum(true);
    Promise.all([
      fetch(`/api/lpps?ptatId=${selectedPtatId}`).then((r) => r.json()),
      fetch(`/api/cycles?ptatId=${selectedPtatId}&academicYear=${academicYear}`).then((r) => r.json()),
    ]).then(([lppData, cycleData]) => {
      const lppList: LPP[] = Array.isArray(lppData) ? lppData : [];
      setLpps(lppList);
      const count = Array.isArray(cycleData) ? cycleData.length : 0;
      setCycleNumber(count + 1);
    }).finally(() => setLoadingCycleNum(false));
  }, [selectedPtatId, academicYear]);

  // Build programConfigs when strategy or PTAT/LPPs change (Step 5)
  useEffect(() => {
    if (!strategy) return;
    if (strategy === 'single') {
      setProgramConfigs([{
        programId: 'all',
        programName: 'All Programs',
        weights: { entrance: 50, academic: 30, interview: 20 },
        scoresGenerated: false,
      }]);
    } else {
      const ptatLpps = lpps.filter((l) => l.ptatId === selectedPtatId);
      setProgramConfigs(
        ptatLpps.map((lpp) => ({
          programId: lpp.id,
          programName: lpp.name,
          weights: { entrance: 50, academic: 30, interview: 20 },
          scoresGenerated: false,
        }))
      );
    }
  }, [strategy, selectedPtatId, lpps]);

  // ── Validation helpers ───────────────────────────────────────────────────────

  function step1Valid() { return !!academicYear; }
  function step2Valid() { return !!selectedPtatId && cycleNumber !== null; }
  function step3Valid() {
    const { startDate, offerReleaseDate, acceptanceDeadline, paymentDeadline, closingDate } = timeline;
    if (!startDate || !offerReleaseDate || !acceptanceDeadline || !paymentDeadline || !closingDate) return false;
    return (
      startDate <= offerReleaseDate &&
      offerReleaseDate <= acceptanceDeadline &&
      acceptanceDeadline <= paymentDeadline &&
      paymentDeadline <= closingDate
    );
  }
  function step4Valid() { return strategy !== null; }
  function step5Valid() {
    if (tiebreakerRules.length === 0) return false;
    return programConfigs.every(({ weights: w }) => Math.abs(w.entrance + w.academic + w.interview - 100) < 0.5);
  }

  // ── Tiebreaker helpers ───────────────────────────────────────────────────────

  function addTiebreakerRule() {
    const used = new Set(tiebreakerRules.map((r) => r.criterionId));
    const next = CRITERION_OPTIONS.find((c) => !used.has(c.id));
    if (!next) return;
    setTiebreakerRules((prev) => [
      ...prev,
      { order: prev.length, criterionId: next.id, criterionName: next.label, direction: 'DESC' },
    ]);
  }

  function removeTiebreakerRule(idx: number) {
    setTiebreakerRules((prev) =>
      prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, order: i }))
    );
  }

  function moveTiebreakerRule(idx: number, dir: -1 | 1) {
    const next = idx + dir;
    if (next < 0 || next >= tiebreakerRules.length) return;
    setTiebreakerRules((prev) => {
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr.map((r, i) => ({ ...r, order: i }));
    });
  }

  function updateTiebreakerRule(idx: number, field: 'criterionId' | 'direction', value: string) {
    setTiebreakerRules((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        if (field === 'criterionId') {
          const opt = CRITERION_OPTIONS.find((c) => c.id === value);
          return { ...r, criterionId: value as TiebreakerRule['criterionId'], criterionName: opt?.label ?? value };
        }
        return { ...r, direction: value as 'DESC' | 'ASC' };
      })
    );
  }

  // ── Weight helpers ───────────────────────────────────────────────────────────

  function updateWeight(programId: string, field: keyof ProgramWeights, value: number) {
    setProgramConfigs((prev) =>
      prev.map((pc) =>
        pc.programId === programId ? { ...pc, weights: { ...pc.weights, [field]: value } } : pc
      )
    );
  }

  function weightsSum(w: ProgramWeights) { return w.entrance + w.academic + w.interview; }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      const ptat = ptats.find((p) => p.id === selectedPtatId);
      const lppIds = lpps.filter((l) => l.ptatId === selectedPtatId).map((l) => l.id);

      const res = await fetch('/api/cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academicYear,
          ptatId: selectedPtatId,
          ptatName: ptat?.name ?? selectedPtatId,
          lppIds,
          timeline,
          evaluationStrategy: strategy,
          programConfigs,
          tiebreakerRules,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        const errMsg = data.error ?? 'Failed to create cycle';
        setError(errMsg);
        showToast(errMsg, 'error');
        return;
      }

      const { cycle, evaluation } = await res.json();
      const selectedPtatObj = ptats.find((p) => p.id === selectedPtatId) ?? null;
      const ptatLpps = lpps.filter((l) => l.ptatId === selectedPtatId);
      sessionStorage.setItem(`cycle-${cycle.id}`, JSON.stringify({ cycle, evaluation, ptat: selectedPtatObj, lpps: ptatLpps }));
      showToast(`${cycle.name} created`, 'success');
      router.push(`/cycle/${cycle.id}/evaluation`);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Step renderers ───────────────────────────────────────────────────────────

  const selectedPtat = ptats.find((p) => p.id === selectedPtatId);

  function renderStep1() {
    return (
      <div className="wizard-step">
        <h2 className="step-title">Select Academic Year</h2>
        <p className="step-subtitle">Choose the academic year for this admissions cycle.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
          {ACADEMIC_YEARS.map((y) => (
            <label key={y} className={`strategy-card${academicYear === y ? ' selected' : ''}`}
              style={{ cursor: 'pointer' }} onClick={() => setAcademicYear(y)}>
              <input type="radio" name="year" value={y} checked={academicYear === y}
                onChange={() => setAcademicYear(y)} style={{ marginRight: '10px' }} />
              <span style={{ fontSize: '16px', fontWeight: 600 }}>{y}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className="wizard-step">
        <h2 className="step-title">Program Group</h2>
        <p className="step-subtitle">Select the program group. The cycle number is auto-assigned.</p>

        {loadingPtats ? (
          <div style={{ color: 'var(--color-text-muted)' }}>Loading programs…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {ptats.map((ptat) => (
              <label key={ptat.id} className={`strategy-card${selectedPtatId === ptat.id ? ' selected' : ''}`}
                style={{ cursor: 'pointer', alignItems: 'flex-start' }}
                onClick={() => setSelectedPtatId(ptat.id)}>
                <input type="radio" name="ptat" value={ptat.id} checked={selectedPtatId === ptat.id}
                  onChange={() => setSelectedPtatId(ptat.id)}
                  style={{ marginTop: '3px', marginRight: '10px' }} />
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700 }}>{ptat.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{ptat.code}</div>
                </div>
              </label>
            ))}
          </div>
        )}

        {selectedPtatId && (
          <div style={{ marginTop: '20px', padding: '14px 18px', background: 'var(--color-primary-bg)', borderRadius: '10px', border: '1px solid var(--color-primary)' }}>
            {loadingCycleNum ? (
              <span style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Fetching cycle number…</span>
            ) : (
              <>
                <div style={{ fontSize: '14px', color: 'var(--color-primary)', fontWeight: 700, marginBottom: '4px' }}>
                  Auto-assigned: Cycle #{cycleNumber}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  This will be <strong>Cycle #{cycleNumber}</strong> for{' '}
                  <strong>{selectedPtat?.name}</strong> in <strong>{academicYear}</strong>
                </div>
                {lpps.filter((l) => l.ptatId === selectedPtatId).length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                      Programs under this group:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {lpps.filter((l) => l.ptatId === selectedPtatId).map((lpp) => (
                        <span key={lpp.id} className="badge badge-default" style={{ fontSize: '12px' }}>
                          {lpp.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderStep3() {
    const fields: { key: keyof typeof timeline; label: string }[] = [
      { key: 'startDate',          label: 'Cycle Start Date' },
      { key: 'offerReleaseDate',   label: 'Offer Release Date' },
      { key: 'acceptanceDeadline', label: 'Offer Acceptance Deadline' },
      { key: 'paymentDeadline',    label: 'Payment Deadline' },
      { key: 'closingDate',        label: 'Cycle Closing Date' },
    ];
    return (
      <div className="wizard-step">
        <h2 className="step-title">Cycle Timelines</h2>
        <p className="step-subtitle">Set key dates for this admissions cycle. Dates must be in chronological order.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '420px' }}>
          {fields.map(({ key, label }) => (
            <div key={key}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '5px' }}>
                {label}
              </label>
              <input
                type="date"
                className="form-input"
                value={timeline[key]}
                onChange={(e) => setTimeline((t) => ({ ...t, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        {timeline.startDate && timeline.closingDate && !step3Valid() && (
          <div style={{ marginTop: '12px', color: '#e53e3e', fontSize: '13px' }}>
            Dates must be in chronological order.
          </div>
        )}
      </div>
    );
  }

  function renderStep4() {
    return (
      <div className="wizard-step">
        <h2 className="step-title">Evaluation Strategy</h2>
        <p className="step-subtitle">Choose how scores and rankings will be calculated.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <label className={`strategy-card${strategy === 'single' ? ' selected' : ''}`}
            style={{ cursor: 'pointer', alignItems: 'flex-start' }}
            onClick={() => setStrategy('single')}>
            <input type="radio" name="strategy" value="single" checked={strategy === 'single'}
              onChange={() => setStrategy('single')} style={{ marginTop: '3px', marginRight: '12px' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>Single Evaluation</div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                One unified set of weights applied to all applicants across all programs.
              </div>
            </div>
          </label>
          <label className={`strategy-card${strategy === 'program-wise' ? ' selected' : ''}`}
            style={{ cursor: 'pointer', alignItems: 'flex-start' }}
            onClick={() => setStrategy('program-wise')}>
            <input type="radio" name="strategy" value="program-wise" checked={strategy === 'program-wise'}
              onChange={() => setStrategy('program-wise')} style={{ marginTop: '3px', marginRight: '12px' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>Program-wise Evaluation</div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                Each program gets its own score weights and separate rankings.
              </div>
            </div>
          </label>
        </div>
      </div>
    );
  }

  function renderStep5() {
    return (
      <div className="wizard-step">
        <h2 className="step-title">Criteria &amp; Tiebreakers</h2>
        <p className="step-subtitle">Set evaluation weights and ranking tiebreaker priority rules.</p>

        {/* ── A) Weights ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            A — Evaluation Weights
          </h3>
          {programConfigs.map((pc) => {
            const sum = weightsSum(pc.weights);
            const sumOk = Math.abs(sum - 100) < 0.5;
            return (
              <div key={pc.programId} style={{ marginBottom: '16px', padding: '16px', border: '1px solid var(--color-border)', borderRadius: '10px', background: 'white' }}>
                {strategy === 'program-wise' && (
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '12px' }}>
                    {pc.programName}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  {(['entrance', 'academic', 'interview'] as const).map((field) => (
                    <div key={field}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                        {field === 'entrance' ? 'Entrance (%)' : field === 'academic' ? 'Academic (%)' : 'Interview (%)'}
                      </label>
                      <input type="number" min={0} max={100} step={1}
                        className="form-input"
                        value={pc.weights[field]}
                        onChange={(e) => updateWeight(pc.programId, field, Number(e.target.value))}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1, height: '6px', background: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(sum, 100)}%`, background: sumOk ? 'var(--color-primary)' : '#e53e3e', borderRadius: '3px', transition: 'width 0.2s' }} />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: sumOk ? 'var(--color-primary)' : '#e53e3e', minWidth: '58px' }}>
                    {sum}% {sumOk ? '✓' : '≠ 100'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── B) Tiebreakers ─────────────────────────────────────────── */}
        <div>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            B — Tiebreaker Rules
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
            Applied in priority order when composite scores are equal. Use ↑↓ to reorder.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tiebreakerRules.map((rule, idx) => {
              const usedIds = tiebreakerRules.filter((_, i) => i !== idx).map((r) => r.criterionId);
              return (
                <div key={idx} className="tiebreaker-row">
                  <span className="tiebreaker-priority">#{idx + 1}</span>
                  <select className="form-input" style={{ flex: 1, fontSize: '13px' }}
                    value={rule.criterionId}
                    onChange={(e) => updateTiebreakerRule(idx, 'criterionId', e.target.value)}>
                    {CRITERION_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id} disabled={usedIds.includes(opt.id)}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <select className="form-input" style={{ width: '130px', fontSize: '13px' }}
                    value={rule.direction}
                    onChange={(e) => updateTiebreakerRule(idx, 'direction', e.target.value)}>
                    <option value="DESC">High → Low</option>
                    <option value="ASC">Low → High</option>
                  </select>
                  <button className="icon-btn" onClick={() => moveTiebreakerRule(idx, -1)}
                    disabled={idx === 0} title="Move up">↑</button>
                  <button className="icon-btn" onClick={() => moveTiebreakerRule(idx, 1)}
                    disabled={idx === tiebreakerRules.length - 1} title="Move down">↓</button>
                  <button className="icon-btn danger" onClick={() => removeTiebreakerRule(idx)}
                    disabled={tiebreakerRules.length === 1} title="Remove">✕</button>
                </div>
              );
            })}
          </div>
          {tiebreakerRules.length < CRITERION_OPTIONS.length && (
            <button className="btn-secondary" style={{ marginTop: '12px', fontSize: '13px' }}
              onClick={addTiebreakerRule}>
              + Add Tiebreaker Rule
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Navigation ────────────────────────────────────────────────────────────────

  function stepValid() {
    if (step === 1) return step1Valid();
    if (step === 2) return step2Valid();
    if (step === 3) return step3Valid();
    if (step === 4) return step4Valid();
    if (step === 5) return step5Valid();
    return false;
  }

  const stepLabels = ['Academic Year', 'Program Group', 'Timelines', 'Strategy', 'Criteria & Tiebreakers'];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Create New Cycle</h1>
        <button className="btn-secondary" onClick={() => router.push('/')}>Cancel</button>
      </div>

      {/* Progress indicator */}
      <div className="wizard-progress">
        {stepLabels.map((label, i) => {
          const n = i + 1;
          const state = n < step ? 'done' : n === step ? 'active' : 'pending';
          return (
            <React.Fragment key={n}>
              <div className={`wizard-step-indicator ${state}`}>
                <div className="step-circle">{n < step ? '✓' : n}</div>
                <div className="step-label">{label}</div>
              </div>
              {i < stepLabels.length - 1 && <div className={`step-connector${n < step ? ' done' : ''}`} />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Content */}
      <div className="wizard-card">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}

        {error && (
          <div style={{ marginTop: '16px', padding: '12px 16px', background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '8px', color: '#c53030', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
          <button className="btn-secondary" onClick={() => setStep((s) => s - 1)} disabled={step === 1}>
            ← Back
          </button>
          {step < TOTAL_STEPS ? (
            <button className="btn-primary" onClick={() => setStep((s) => s + 1)} disabled={!stepValid()}>
              Next →
            </button>
          ) : (
            <button className="btn-primary" onClick={handleSubmit} disabled={!stepValid() || submitting}>
              {submitting ? 'Creating…' : 'Create Cycle'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
