'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/common/ToastContext';

// ── Types ──────────────────────────────────────────────────────────────────────

interface PTAT { id: string; name: string; code: string; }
interface LPP  {
  id: string; ptatId: string; name: string; code: string;
  totalSeats: number;
  categoryWiseSeats: Record<string, number>;
}

interface TiebreakerRule {
  order: number;
  criterionId: 'entrance' | 'academic' | 'interview';
  criterionName: string;
  direction: 'DESC' | 'ASC';
}

interface ProgramWeights { entrance: number; academic: number; interview: number; }
interface ProgramConfig  { programId: string; programName: string; weights: ProgramWeights; scoresGenerated: boolean; }

const ACADEMIC_YEARS = ['2024-2025', '2025-2026', '2026-2027', '2027-2028', '2028-2029'];
const CRITERION_OPTIONS: { id: 'entrance' | 'academic' | 'interview'; label: string }[] = [
  { id: 'entrance',  label: 'Entrance Score' },
  { id: 'academic',  label: 'Academic Score' },
  { id: 'interview', label: 'Interview Score' },
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function CreateCyclePage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [step, setStep] = useState(1);

  // Step 1a — Academic Year + Program Group
  const [academicYear, setAcademicYear] = useState(() => {
    const yr = new Date().getFullYear();
    return `${yr}-${yr + 1}`;
  });
  const [ptats, setPtats]                     = useState<PTAT[]>([]);
  const [lpps,  setLpps]                      = useState<LPP[]>([]);
  const [selectedPtatId, setSelectedPtatId]   = useState('');
  const [cycleNumber, setCycleNumber]         = useState<number | null>(null);
  const [loadingPtats, setLoadingPtats]       = useState(false);
  const [loadingCycleNum, setLoadingCycleNum] = useState(false);

  // Step 1b — Cycle Date Definition
  const [cycleCreatedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [withdrawalWithRefund,    setWithdrawalWithRefund]    = useState('');
  const [withdrawalWithoutRefund, setWithdrawalWithoutRefund] = useState('');

  // Step 3 — Strategy + Generation Mode
  const [strategy, setStrategy] = useState<'single' | 'program-wise' | null>(null);
  const [generationMode, setGenerationMode] = useState<'fresh' | 'previous'>('fresh');
  // create-cycle wizard steps (1=Year & Group, 2=Cycle Dates, 3=Strategy, 4=Criteria & TB)
  const totalSteps = generationMode === 'previous' ? 3 : 4;

  // Step 4 — Criteria & Tiebreakers (sub-stepped; only in fresh mode)
  const [subStep5, setSubStep5] = useState<'weights' | 'tiebreakers'>('weights');
  const [programConfigs, setProgramConfigs] = useState<ProgramConfig[]>([]);
  const [tiebreakerRules, setTiebreakerRules] = useState<TiebreakerRule[]>([
    { order: 0, criterionId: 'entrance', criterionName: 'Entrance Score', direction: 'DESC' },
  ]);

  // Submission Lock
  const submitLockRef = React.useRef(false);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError]           = useState('');

  // Load PTATs once
  useEffect(() => {
    setLoadingPtats(true);
    fetch('/api/ptats')
      .then((r) => r.json())
      .then((data) => setPtats(Array.isArray(data) ? data : []))
      .finally(() => setLoadingPtats(false));
  }, []);

  // Load LPPs + cycle number when PTAT + year both selected
  useEffect(() => {
    if (!selectedPtatId || !academicYear) { setLpps([]); setCycleNumber(null); return; }
    setLoadingCycleNum(true);
    Promise.all([
      fetch(`/api/lpps?ptatId=${selectedPtatId}`).then((r) => r.json()),
      fetch(`/api/cycles?ptatId=${selectedPtatId}&academicYear=${academicYear}`).then((r) => r.json()),
    ]).then(([lppData, cycleData]) => {
      setLpps(Array.isArray(lppData) ? lppData : []);
      setCycleNumber((Array.isArray(cycleData) ? cycleData.length : 0) + 1);
    }).finally(() => setLoadingCycleNum(false));
  }, [selectedPtatId, academicYear]);

  // Restore draft from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('create-cycle-draft');
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.step)                    setStep(d.step);
      if (d.academicYear)            setAcademicYear(d.academicYear);
      if (d.selectedPtatId)          setSelectedPtatId(d.selectedPtatId);
      if (d.withdrawalWithRefund)    setWithdrawalWithRefund(d.withdrawalWithRefund);
      if (d.withdrawalWithoutRefund) setWithdrawalWithoutRefund(d.withdrawalWithoutRefund);
      if (d.strategy)                setStrategy(d.strategy);
      if (d.generationMode)          setGenerationMode(d.generationMode);
      if (d.tiebreakerRules?.length) setTiebreakerRules(d.tiebreakerRules);
    } catch { /* ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Build programConfigs when strategy or LPPs change
  useEffect(() => {
    if (!strategy) return;
    const ptatLpps = lpps.filter((l) => l.ptatId === selectedPtatId);
    if (strategy === 'single') {
      setProgramConfigs([{ programId: 'all', programName: 'All Programs', weights: { entrance: 50, academic: 30, interview: 20 }, scoresGenerated: false }]);
    } else {
      setProgramConfigs(ptatLpps.map((lpp) => ({ programId: lpp.id, programName: lpp.name, weights: { entrance: 50, academic: 30, interview: 20 }, scoresGenerated: false })));
    }
  }, [strategy, selectedPtatId, lpps]);

  // ── Validation helpers ───────────────────────────────────────────────────────

  function step1GroupValid() { return !!academicYear && !!selectedPtatId && cycleNumber !== null; }

  function cycleDatesValid() {
    return !!withdrawalWithRefund && !!withdrawalWithoutRefund
      && withdrawalWithoutRefund >= withdrawalWithRefund;
  }
  function step3Valid() { return strategy !== null; }
  function step4Valid() {
    if (subStep5 === 'weights') {
      return programConfigs.every(({ weights: w }) => Math.abs(w.entrance + w.academic + w.interview - 100) < 0.5);
    }
    return tiebreakerRules.length > 0;
  }

  function stepValid() {
    if (step === 1) return step1GroupValid();
    if (step === 2) return cycleDatesValid();
    if (step === 3) return step3Valid();
    if (step === 4) return step4Valid();
    return false;
  }

  // ── Tiebreaker helpers ───────────────────────────────────────────────────────

  function addTiebreakerRule() {
    const used = new Set(tiebreakerRules.map((r) => r.criterionId));
    const next = CRITERION_OPTIONS.find((c) => !used.has(c.id));
    if (!next) return;
    setTiebreakerRules((prev) => [...prev, { order: prev.length, criterionId: next.id, criterionName: next.label, direction: 'DESC' }]);
  }
  function removeTiebreakerRule(idx: number) {
    setTiebreakerRules((prev) => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, order: i })));
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
    setTiebreakerRules((prev) => prev.map((r, i) => {
      if (i !== idx) return r;
      if (field === 'criterionId') {
        const opt = CRITERION_OPTIONS.find((c) => c.id === value);
        return { ...r, criterionId: value as TiebreakerRule['criterionId'], criterionName: opt?.label ?? value };
      }
      return { ...r, direction: value as 'DESC' | 'ASC' };
    }));
  }

  // ── Weight helpers ───────────────────────────────────────────────────────────

  function updateWeight(programId: string, field: keyof ProgramWeights, value: number) {
    setProgramConfigs((prev) => prev.map((pc) => pc.programId === programId ? { ...pc, weights: { ...pc.weights, [field]: value } } : pc));
  }
  function weightsSum(w: ProgramWeights) { return w.entrance + w.academic + w.interview; }

  // ── Draft ─────────────────────────────────────────────────────────────────────

  function saveDraft() {
    try {
      localStorage.setItem('create-cycle-draft', JSON.stringify({
        step, academicYear, selectedPtatId,
        withdrawalWithRefund, withdrawalWithoutRefund,
        strategy, generationMode, tiebreakerRules,
      }));
      showToast('Draft saved', 'success');
    } catch { /* ignore */ }
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    setError('');
    try {
      const selectedPtatObj = ptats.find((p) => p.id === selectedPtatId) ?? null;
      const ptatLpps = lpps.filter((l) => l.ptatId === selectedPtatId);
      const lppIds = ptatLpps.map((l) => l.id);

      const res = await fetch('/api/cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academicYear, ptatId: selectedPtatId,
          ptatName: selectedPtatObj?.name ?? selectedPtatId,
          lppIds,
          timeline: { applicationPeriod: { start: '', end: '' }, scoringPeriod: { start: '', end: '' }, offerReleasePeriod: { start: '', end: '' }, acceptancePeriod: { start: '', end: '' }, paymentPeriod: { start: '', end: '' } },
          evaluationStrategy: strategy,
          programConfigs: generationMode === 'previous'
            ? (strategy === 'single'
                ? [{ programId: 'all', programName: 'All Programs', weights: { entrance: 60, academic: 30, interview: 10 }, scoresGenerated: false }]
                : lpps.filter((l) => l.ptatId === selectedPtatId).map((l) => ({ programId: l.id, programName: l.name, weights: { entrance: 60, academic: 30, interview: 10 }, scoresGenerated: false })))
            : programConfigs,
          tiebreakerRules: generationMode === 'previous'
            ? [{ order: 0, criterionId: 'entrance', criterionName: 'Entrance Score', direction: 'DESC' }]
            : tiebreakerRules,
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
      sessionStorage.setItem(`cycle-${cycle.id}`, JSON.stringify({ cycle, evaluation, ptat: selectedPtatObj, lpps: ptatLpps, generationMode }));
      showToast(`${cycle.name} created`, 'success');

      // Phase 2 — Generate rankings inline
      setSubmitting(false);
      setGenerating(true);
      showToast(generationMode === 'previous' ? 'Importing previous cycle rankings…' : 'Generating scores and rankings…', 'info');

      const appsRes = await fetch('/api/applications');
      const allApps = appsRes.ok ? await appsRes.json() : [];

      // In "previous" mode, filter out students already offered in the previous cycle
      let filteredApps = allApps;
      if (generationMode === 'previous') {
        try {
          const prevRes = await fetch(`/api/cycles/${cycle.id}/previous-offer-results`);
          if (prevRes.ok) {
            const prevData = await prevRes.json();
            if (prevData.offeredIds && prevData.offeredIds.length > 0) {
              const offeredSet = new Set<string>(prevData.offeredIds as string[]);
              filteredApps = allApps.filter((app: { id: string }) => !offeredSet.has(app.id));
              showToast(`Waitlist carryover: ${filteredApps.length} students from previous cycle waitlist`, 'info');
            }
          }
        } catch { /* ignore, use full pool */ }
      }

      let configsToRun = evaluation.programConfigs.map((pc: ProgramConfig) =>
        generationMode === 'previous' ? { ...pc, weights: { entrance: 60, academic: 30, interview: 10 } } : pc
      );

      // Expand single-strategy 'all' config into per-LPP configs
      if (configsToRun.length === 1 && configsToRun[0].programId === 'all' && ptatLpps.length > 1) {
        const w = configsToRun[0].weights;
        configsToRun = ptatLpps.map((l: LPP) => ({
          programId: l.id, programName: l.name, weights: { ...w }, scoresGenerated: false,
        }));
      }

      const allRankRecords: unknown[] = [];
      for (const pc of configsToRun) {
        const programApps = pc.programId === 'all'
          ? filteredApps
          : filteredApps.filter((app: { lppPreferences?: { lppId: string }[]; lppPreference: string }) =>
              app.lppPreferences?.some((p: { lppId: string }) => p.lppId === pc.programId) ?? app.lppPreference === pc.programId
            );

        const scoreRes = await fetch(`/api/evaluations/${evaluation.id}/generate-scores`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ programId: pc.programId, weights: pc.weights, applications: programApps }),
        });
        if (!scoreRes.ok) {
          const txt = await scoreRes.text().catch(() => 'unknown');
          throw new Error(`Score generation failed: ${scoreRes.status} ${txt}`);
        }
        const scores = await scoreRes.json();

        const rankRes = await fetch(`/api/evaluations/${evaluation.id}/generate-rankings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            programId: pc.programId, cycleId: cycle.id,
            tiebreakerRules: evaluation.tiebreakerRules,
            evaluationScores: scores, applications: programApps,
          }),
        });
        if (!rankRes.ok) {
          const txt = await rankRes.text().catch(() => 'unknown');
          throw new Error(`Ranking generation failed: ${rankRes.status} ${txt}`);
        }
        const rankings = await rankRes.json();
        allRankRecords.push(...(Array.isArray(rankings) ? rankings : []));
      }

      // Persist evaluation 'Ranked' status to server
      const updatedEval = { ...evaluation, ranksGenerated: true, status: 'Ranked' };
      await fetch(`/api/evaluations/${evaluation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ranksGenerated: true, status: 'Ranked' }),
      }).catch(() => { /* ignore */ });

      // Cache in sessionStorage for fast navigation
      sessionStorage.setItem(`cycle-${cycle.id}`, JSON.stringify({
        cycle, evaluation: updatedEval, ptat: selectedPtatObj, lpps: ptatLpps, generationMode, rankRecords: allRankRecords,
      }));
      showToast(generationMode === 'previous' ? 'Rankings imported successfully' : 'Rankings generated successfully', 'success');
      localStorage.removeItem('create-cycle-draft');
      router.push(`/cycle/${cycle.id}/evaluation`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
      setGenerating(false);
      submitLockRef.current = false;
    }
  }

  // ── Step renderers ───────────────────────────────────────────────────────────

  const selectedPtat = ptats.find((p) => p.id === selectedPtatId);
  const ptatLpps     = lpps.filter((l) => l.ptatId === selectedPtatId);

  function renderGroupSubStep() {
    return (
      <>
        <h2 className="step-title">Academic Year &amp; Program Group</h2>
        <p className="step-subtitle">Select the academic year and program group for this admissions cycle.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '6px' }}>
              Academic Year
            </label>
            <select className="form-input" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
              {ACADEMIC_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '6px' }}>
              Program Group
            </label>
            {loadingPtats ? (
              <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', padding: '10px 0' }}>Loading…</div>
            ) : (
              <select className="form-input" value={selectedPtatId} onChange={(e) => setSelectedPtatId(e.target.value)}>
                <option value="">— Select program group —</option>
                {ptats.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
              </select>
            )}
          </div>
        </div>

        {selectedPtatId && academicYear && (
          <div style={{ padding: '16px 18px', background: 'var(--color-primary-bg)', borderRadius: '10px', border: '1px solid var(--color-primary)' }}>
            {loadingCycleNum ? (
              <span style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Fetching cycle number…</span>
            ) : (
              <>
                <div style={{ fontSize: '14px', color: 'var(--color-primary)', fontWeight: 700, marginBottom: '4px' }}>
                  Auto-assigned: Cycle #{cycleNumber}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: ptatLpps.length > 0 ? '10px' : 0 }}>
                  This will be <strong>Cycle #{cycleNumber}</strong> for <strong>{selectedPtat?.name}</strong> in <strong>{academicYear}</strong>
                </div>
                {ptatLpps.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {ptatLpps.map((lpp) => (
                      <span key={lpp.id} className="badge badge-default" style={{ fontSize: '12px' }}>{lpp.name}</span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </>
    );
  }

  function renderCycleDatesSubStep() {
    const refundErr = withdrawalWithRefund && withdrawalWithoutRefund && withdrawalWithoutRefund < withdrawalWithRefund;
    return (
      <>
        <h2 className="step-title">Cycle Date Definition</h2>
        <p className="step-subtitle">Set key administrative dates for this admissions cycle.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ maxWidth: '480px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '6px' }}>
              Cycle Created Date
            </label>
            <input
              type="date"
              className="form-input"
              value={cycleCreatedDate}
              readOnly
              style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)', cursor: 'default' }}
            />
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Auto-generated</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '6px' }}>
                Withdrawal Due Date <span style={{ fontWeight: 400 }}>(with Refund)</span>
              </label>
              <input
                type="datetime-local"
                className="form-input"
                value={withdrawalWithRefund}
                onChange={(e) => setWithdrawalWithRefund(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '6px' }}>
                Withdrawal Due Date <span style={{ fontWeight: 400 }}>(without Refund)</span>
              </label>
              <input
                type="datetime-local"
                className="form-input"
                value={withdrawalWithoutRefund}
                style={{ borderColor: refundErr ? '#e53e3e' : undefined }}
                onChange={(e) => setWithdrawalWithoutRefund(e.target.value)}
              />
              {refundErr && (
                <div style={{ fontSize: '12px', color: '#e53e3e', marginTop: '4px' }}>
                  Must be on or after the &quot;with Refund&quot; date.
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  function renderStep1() {
    return <div className="wizard-step">{renderGroupSubStep()}</div>;
  }

  function renderStep2() {
    return <div className="wizard-step">{renderCycleDatesSubStep()}</div>;
  }

  function renderStep3() {
    const hasPrev = cycleNumber !== null && cycleNumber > 1;
    return (
      <div className="wizard-step">
        <h2 className="step-title">Evaluation Strategy</h2>
        <p className="step-subtitle">Choose how scores and rankings will be calculated.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
          {[
            { value: 'single',       title: 'Single Evaluation',       desc: 'One unified set of weights applied to all applicants across all programs.' },
            { value: 'program-wise', title: 'Program-wise Evaluation', desc: 'Each program gets its own score weights and separate rankings.' },
          ].map(({ value, title, desc }) => (
            <label key={value} className={`strategy-card${strategy === value ? ' selected' : ''}`}
              style={{ cursor: 'pointer', alignItems: 'flex-start' }}
              onClick={() => setStrategy(value as 'single' | 'program-wise')}>
              <input type="radio" name="strategy" value={value} checked={strategy === value}
                onChange={() => setStrategy(value as 'single' | 'program-wise')}
                style={{ marginTop: '3px', marginRight: '12px' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>{title}</div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{desc}</div>
              </div>
            </label>
          ))}
        </div>

        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>Score &amp; Rank Source</h3>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
          Generate fresh scores or import from the previous approved cycle.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[
            { value: 'fresh',    title: 'Generate Fresh Scores & Rankings', desc: 'Compute new composite scores from current applicant data using configured weights and tiebreaker rules.' },
            { value: 'previous', title: 'Use Previous Approved Rankings',   desc: 'Import the ranked list from the most recent approved cycle. Criteria and tiebreaker configuration will be skipped.' },
          ].map(({ value, title, desc }) => {
            const disabled = value === 'previous' && !hasPrev;
            return (
              <label key={value} className={`strategy-card${generationMode === value ? ' selected' : ''}`}
                style={{ cursor: disabled ? 'not-allowed' : 'pointer', alignItems: 'flex-start', opacity: disabled ? 0.55 : 1 }}
                onClick={() => !disabled && setGenerationMode(value as 'fresh' | 'previous')}>
                <input type="radio" name="genMode" value={value} checked={generationMode === value}
                  onChange={() => !disabled && setGenerationMode(value as 'fresh' | 'previous')}
                  disabled={disabled}
                  style={{ marginTop: '3px', marginRight: '12px' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>
                    {title}
                    {disabled && (
                      <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: 500, color: 'var(--color-text-muted)', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '1px 6px' }}>
                        No previous cycle
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{desc}</div>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  function renderStep4() {
    return (
      <div className="wizard-step">
        <h2 className="step-title">Criteria &amp; Tiebreakers</h2>
        <p className="step-subtitle">Set evaluation weights and ranking tiebreaker priority rules.</p>

        {/* Mini sub-stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '24px', padding: '12px 16px', background: 'var(--color-bg)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
          {(['weights', 'tiebreakers'] as const).map((sub, i) => {
            const isDone   = sub === 'weights' && subStep5 === 'tiebreakers';
            const isActive = sub === subStep5;
            const label    = sub === 'weights' ? 'A — Evaluation Weights' : 'B — Tiebreaker Rules';
            return (
              <React.Fragment key={sub}>
                {i > 0 && (
                  <div style={{ flex: 1, height: '2px', background: isDone || subStep5 === 'tiebreakers' ? 'var(--color-primary)' : 'var(--color-border)', margin: '0 8px' }} />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 700, flexShrink: 0,
                    background: isDone ? 'var(--color-primary)' : isActive ? 'var(--color-primary)' : 'var(--color-border)',
                    color: isDone || isActive ? 'white' : 'var(--color-text-muted)',
                  }}>
                    {isDone ? '✓' : (i + 1)}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--color-primary)' : isDone ? 'var(--color-text)' : 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    {label}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {subStep5 === 'weights' && (
          <div>
            {programConfigs.map((pc) => {
              const sum = weightsSum(pc.weights);
              const sumOk = Math.abs(sum - 100) < 0.5;
              return (
                <div key={pc.programId} style={{ marginBottom: '16px', padding: '16px', border: '1px solid var(--color-border)', borderRadius: '10px', background: 'white' }}>
                  {strategy === 'program-wise' && (
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '12px' }}>{pc.programName}</div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    {(['entrance', 'academic', 'interview'] as const).map((field) => (
                      <div key={field}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                          {field === 'entrance' ? 'Entrance (%)' : field === 'academic' ? 'Academic (%)' : 'Interview (%)'}
                        </label>
                        <input type="number" min={0} max={100} step={1} className="form-input"
                          value={pc.weights[field]}
                          onChange={(e) => updateWeight(pc.programId, field, Number(e.target.value))} />
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
        )}

        {subStep5 === 'tiebreakers' && (
          <div>
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
                        <option key={opt.id} value={opt.id} disabled={usedIds.includes(opt.id)}>{opt.label}</option>
                      ))}
                    </select>
                    <select className="form-input" style={{ width: '130px', fontSize: '13px' }}
                      value={rule.direction}
                      onChange={(e) => updateTiebreakerRule(idx, 'direction', e.target.value)}>
                      <option value="DESC">High → Low</option>
                      <option value="ASC">Low → High</option>
                    </select>
                    <button className="icon-btn" onClick={() => moveTiebreakerRule(idx, -1)} disabled={idx === 0} title="Move up">↑</button>
                    <button className="icon-btn" onClick={() => moveTiebreakerRule(idx, 1)} disabled={idx === tiebreakerRules.length - 1} title="Move down">↓</button>
                    <button className="icon-btn danger" onClick={() => removeTiebreakerRule(idx)} disabled={tiebreakerRules.length === 1} title="Remove">✕</button>
                  </div>
                );
              })}
            </div>
            {tiebreakerRules.length < CRITERION_OPTIONS.length && (
              <button className="btn-secondary" style={{ marginTop: '12px', fontSize: '13px' }} onClick={addTiebreakerRule}>
                + Add Tiebreaker Rule
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Progress bar labels ───────────────────────────────────────────────────────

  // Full combined labels (create-cycle + evaluation) — all visible from step 1
  const wizardStepLabels = generationMode === 'previous'
    ? ['Year & Group', 'Cycle Dates', 'Strategy', 'Scores & Merit', 'Bulk Offers', 'Fee Config', 'Approval']
    : ['Year & Group', 'Cycle Dates', 'Strategy', 'Criteria & TB', 'Scores & Merit', 'Bulk Offers', 'Fee Config', 'Approval'];

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Create New Cycle</h1>
        <button className="btn-secondary" onClick={() => router.push('/')}>Cancel</button>
      </div>

      {/* Progress indicator */}
      <div className="wizard-progress">
        {wizardStepLabels.map((label, i) => {
          const n = i + 1;
          const state = n < step ? 'done' : n === step ? 'active' : 'pending';
          return (
            <React.Fragment key={n}>
              <div className={`wizard-step-indicator ${state}`}>
                <div className="step-circle">{n < step ? '✓' : n}</div>
                <div className="step-label">{label}</div>
              </div>
              {i < wizardStepLabels.length - 1 && <div className={`step-connector${n < step ? ' done' : ''}`} />}
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

        {error && (
          <div style={{ marginTop: '16px', padding: '12px 16px', background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '8px', color: '#c53030', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
          {/* Left: Back + Save as Draft */}
          <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn-secondary"
            disabled={step === 1 || submitting || generating}
            onClick={() => {
              if (step === 4 && subStep5 === 'tiebreakers') { setSubStep5('weights'); return; }
              setStep((s) => s - 1);
            }}
          >
            ← Back
          </button>
          <button
            className="btn-secondary"
            disabled={submitting || generating}
            onClick={saveDraft}
            style={{ fontSize: '13px' }}
          >
            Save as Draft
          </button>
          </div>

          {/* Next / Submit */}
          {step === 4 && subStep5 === 'weights' ? (
            <button className="btn-primary" onClick={() => setSubStep5('tiebreakers')} disabled={!programConfigs.every(({ weights: w }) => Math.abs(w.entrance + w.academic + w.interview - 100) < 0.5)}>
              Next: Tiebreakers →
            </button>
          ) : step < totalSteps ? (
            <button className="btn-primary" onClick={() => setStep((s) => s + 1)} disabled={!stepValid()}>
              Next →
            </button>
          ) : (
            <button className="btn-primary" onClick={handleSubmit} disabled={!stepValid() || submitting || generating}>
              {submitting ? 'Creating…' : generating ? 'Generating rankings…' : 'Create Cycle & Generate Rankings →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
