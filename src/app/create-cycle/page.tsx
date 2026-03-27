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
interface Application { id: string; category: string; lppPreference: string; }

interface TiebreakerRule {
  order: number;
  criterionId: 'entrance' | 'academic' | 'interview';
  criterionName: string;
  direction: 'DESC' | 'ASC';
}

interface ProgramWeights { entrance: number; academic: number; interview: number; }
interface ProgramConfig  { programId: string; programName: string; weights: ProgramWeights; scoresGenerated: boolean; }

const ACADEMIC_YEARS = ['2024-2025', '2025-2026', '2026-2027', '2027-2028'];
const CATEGORIES     = ['General', 'OBC', 'SC', 'ST', 'EWS'];
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

  // Step 1 — Academic Year + Program Group
  const [academicYear, setAcademicYear]       = useState('');
  const [ptats, setPtats]                     = useState<PTAT[]>([]);
  const [lpps,  setLpps]                      = useState<LPP[]>([]);
  const [selectedPtatId, setSelectedPtatId]   = useState('');
  const [cycleNumber, setCycleNumber]         = useState<number | null>(null);
  const [loadingPtats, setLoadingPtats]       = useState(false);
  const [loadingCycleNum, setLoadingCycleNum] = useState(false);

  // Step 2 — Seat Matrix
  const [allApplications, setAllApplications] = useState<Application[]>([]);

  // Step 3 — Timelines
  const [timeline, setTimeline] = useState({
    startDate: '', offerReleaseDate: '', acceptanceDeadline: '',
    paymentDeadline: '', closingDate: '',
  });

  // Step 4 — Strategy + Generation Mode
  const [strategy, setStrategy] = useState<'single' | 'program-wise' | null>(null);
  const [generationMode, setGenerationMode] = useState<'fresh' | 'previous'>('fresh');
  const totalSteps = generationMode === 'previous' ? 4 : 5;

  // Step 5 — Criteria & Tiebreakers (sub-stepped)
  const [subStep5, setSubStep5] = useState<'weights' | 'tiebreakers'>('weights');
  const [programConfigs, setProgramConfigs] = useState<ProgramConfig[]>([]);
  const [tiebreakerRules, setTiebreakerRules] = useState<TiebreakerRule[]>([
    { order: 0, criterionId: 'entrance', criterionName: 'Entrance Score', direction: 'DESC' },
  ]);

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

  // Load applications for seat matrix (once on mount)
  useEffect(() => {
    fetch('/api/applications')
      .then((r) => r.json())
      .then((data) => setAllApplications(Array.isArray(data) ? data : []));
  }, []);

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

  function step1Valid() { return !!academicYear && !!selectedPtatId && cycleNumber !== null; }
  function step2Valid() { return true; } // read-only step
  function step3Valid() {
    const { startDate, offerReleaseDate, acceptanceDeadline, paymentDeadline, closingDate } = timeline;
    if (!startDate || !offerReleaseDate || !acceptanceDeadline || !paymentDeadline || !closingDate) return false;
    return startDate <= offerReleaseDate && offerReleaseDate <= acceptanceDeadline &&
      acceptanceDeadline <= paymentDeadline && paymentDeadline <= closingDate;
  }
  function step4Valid() { return strategy !== null; }
  function step5Valid() {
    if (subStep5 === 'weights') {
      return programConfigs.every(({ weights: w }) => Math.abs(w.entrance + w.academic + w.interview - 100) < 0.5);
    }
    return tiebreakerRules.length > 0;
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

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleSubmit() {
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
          lppIds, timeline,
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
          ? allApps
          : allApps.filter((app: { lppPreferences?: { lppId: string }[]; lppPreference: string }) =>
              app.lppPreferences?.some((p: { lppId: string }) => p.lppId === pc.programId) ?? app.lppPreference === pc.programId
            );

        const scoreRes = await fetch(`/api/evaluations/${evaluation.id}/generate-scores`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ programId: pc.programId, weights: pc.weights, applications: programApps }),
        });
        if (!scoreRes.ok) throw new Error('Score generation failed');
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
        if (!rankRes.ok) throw new Error('Ranking generation failed');
        const rankings = await rankRes.json();
        allRankRecords.push(...(Array.isArray(rankings) ? rankings : []));
      }

      // Persist ranks to sessionStorage so evaluation page loads them directly
      const updatedEval = { ...evaluation, ranksGenerated: true, status: 'Ranked' };
      sessionStorage.setItem(`cycle-${cycle.id}`, JSON.stringify({
        cycle, evaluation: updatedEval, ptat: selectedPtatObj, lpps: ptatLpps, generationMode, rankRecords: allRankRecords,
      }));
      showToast(generationMode === 'previous' ? 'Rankings imported successfully' : 'Rankings generated successfully', 'success');
      router.push(`/cycle/${cycle.id}/evaluation`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
      setGenerating(false);
    }
  }

  // ── Step renderers ───────────────────────────────────────────────────────────

  const selectedPtat = ptats.find((p) => p.id === selectedPtatId);
  const ptatLpps     = lpps.filter((l) => l.ptatId === selectedPtatId);

  function renderStep1() {
    return (
      <div className="wizard-step">
        <h2 className="step-title">Academic Year &amp; Program Group</h2>
        <p className="step-subtitle">Select the academic year and program group for this admissions cycle.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '6px' }}>
              Academic Year
            </label>
            <select className="form-input" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
              <option value="">— Select year —</option>
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
      </div>
    );
  }

  function getOfferFigures(baseSeats: number, cn: number | null) {
    if (!cn || cn <= 1) return { released: 0, accepted: 0, withdrawn: 0, pending: 0 };
    const released  = Math.round(baseSeats * 0.85);
    const accepted  = Math.round(released * 0.70);
    const withdrawn = Math.round(released * 0.05);
    const pending   = released - accepted - withdrawn;
    return { released, accepted, withdrawn, pending };
  }

  function renderStep2() {
    const isFirstCycle = cycleNumber === 1;

    const STAT_ROWS: { key: string; label: string; color?: string; bold?: boolean }[] = [
      { key: 'seats',        label: 'Seats',       bold: true },
      { key: 'applications', label: 'Applicants',  bold: true },
      { key: 'released',     label: 'Released',    color: 'var(--color-text-muted)' },
      { key: 'accepted',     label: 'Accepted',    color: '#276749', bold: true },
      { key: 'withdrawn',    label: 'Withdrawn',   color: '#92400e', bold: true },
      { key: 'pending',      label: 'Pending',     color: '#1d4ed8', bold: true },
    ];

    // Get all values for one (lpp, category)
    function getCellData(lpp: LPP, cat: string) {
      const seats = lpp.categoryWiseSeats?.[cat] ?? 0;
      const { released, accepted, withdrawn, pending } = getOfferFigures(seats, cycleNumber);
      const apps = allApplications.filter((a) => a.lppPreference === lpp.id && a.category === cat).length;
      return { seats, released, accepted, withdrawn, pending, applications: apps };
    }

    return (
      <div className="wizard-step">
        <h2 className="step-title">Seat Matrix</h2>
        <p className="step-subtitle">
          Review seat allocation and offer status.
          {isFirstCycle ? ' Cycle 1 — no prior offers exist.' : ` Cycle ${cycleNumber} — offer figures from previous cycle.`}
        </p>

        {/* Legend — above table */}
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '12px', color: '#374151' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '4px 16px' }}>
            <b>Seats</b>                                            <span>Total seats available per category</span>
            <b>Applicants</b>                                       <span>Total applications received for this program &amp; category</span>
            <b style={{ color: 'var(--color-text-muted)' }}>Released</b>  <span>Offers sent out to applicants</span>
            <b style={{ color: '#276749' }}>Accepted</b>           <span>Applicants who confirmed their seat</span>
            <b style={{ color: '#92400e' }}>Withdrawn</b>          <span>Applicants who declined or exited</span>
            <b style={{ color: '#1d4ed8' }}>Pending</b>            <span>Offers awaiting applicant response</span>
          </div>
          {isFirstCycle && <div style={{ marginTop: '6px', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>Offer columns show 0 for Cycle 1</div>}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ fontSize: '13px', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', minWidth: '130px' }}>Program</th>
                <th style={{ textAlign: 'left', minWidth: '90px' }}></th>
                {CATEGORIES.map((cat) => (
                  <th key={cat} style={{ textAlign: 'center', minWidth: '70px' }}>{cat}</th>
                ))}
                <th style={{ textAlign: 'center', minWidth: '65px' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {ptatLpps.map((lpp, lppIdx) => {
                const catData = CATEGORIES.map((cat) => getCellData(lpp, cat));
                return STAT_ROWS.map((stat, statIdx) => {
                  const isFirst = statIdx === 0;
                  const isLast  = statIdx === STAT_ROWS.length - 1;
                  const total   = catData.reduce((s, d) => s + (d[stat.key as keyof typeof d] as number), 0);
                  return (
                    <tr
                      key={`${lpp.id}-${stat.key}`}
                      style={{
                        borderTop: isFirst && lppIdx > 0 ? '2px solid var(--color-border)' : undefined,
                        background: isFirst ? 'var(--color-bg)' : undefined,
                      }}
                    >
                      {/* Program name — only on first sub-row */}
                      <td style={{ fontWeight: 700, color: 'var(--color-primary)', verticalAlign: 'middle' }}>
                        {isFirst ? lpp.name : ''}
                      </td>
                      {/* Stat label */}
                      <td style={{ color: stat.color ?? 'var(--color-text-muted)', fontSize: '12px', paddingLeft: isFirst ? undefined : '16px' }}>
                        {stat.label}
                      </td>
                      {/* Per-category values */}
                      {catData.map((d, ci) => (
                        <td key={CATEGORIES[ci]} style={{ textAlign: 'center', color: stat.color, fontWeight: stat.bold ? 600 : 400 }}>
                          {d[stat.key as keyof typeof d]}
                        </td>
                      ))}
                      {/* Total */}
                      <td style={{ textAlign: 'center', fontWeight: 700, color: stat.color }}>{total}</td>
                    </tr>
                  );
                });
              })}

              {/* Grand totals */}
              {STAT_ROWS.map((stat, statIdx) => {
                const isFirst = statIdx === 0;
                const catTotals = CATEGORIES.map((cat) =>
                  ptatLpps.reduce((s, lpp) => s + (getCellData(lpp, cat)[stat.key as keyof ReturnType<typeof getCellData>] as number), 0)
                );
                const grandTotal = catTotals.reduce((s, v) => s + v, 0);
                return (
                  <tr
                    key={`total-${stat.key}`}
                    style={{
                      borderTop: isFirst ? '2px solid var(--color-border)' : undefined,
                      background: 'var(--color-primary-bg)',
                    }}
                  >
                    <td style={{ fontWeight: 700 }}>{isFirst ? 'Total' : ''}</td>
                    <td style={{ color: stat.color ?? 'var(--color-text-muted)', fontSize: '12px', paddingLeft: isFirst ? undefined : '16px' }}>{stat.label}</td>
                    {catTotals.map((v, ci) => (
                      <td key={CATEGORIES[ci]} style={{ textAlign: 'center', color: stat.color, fontWeight: stat.bold ? 600 : 400 }}>{v}</td>
                    ))}
                    <td style={{ textAlign: 'center', fontWeight: 700, color: stat.color }}>{grandTotal}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

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
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '5px' }}>{label}</label>
              <input type="date" className="form-input" value={timeline[key]}
                onChange={(e) => setTimeline((t) => ({ ...t, [key]: e.target.value }))} />
            </div>
          ))}
        </div>
        {timeline.startDate && timeline.closingDate && !step3Valid() && (
          <div style={{ marginTop: '12px', color: '#e53e3e', fontSize: '13px' }}>Dates must be in chronological order.</div>
        )}
      </div>
    );
  }

  function renderStep4() {
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

  function renderStep5() {
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

  // ── Navigation ────────────────────────────────────────────────────────────────

  function stepValid() {
    if (step === 1) return step1Valid();
    if (step === 2) return step2Valid();
    if (step === 3) return step3Valid();
    if (step === 4) return step4Valid();
    if (step === 5) return step5Valid();
    return false;
  }

  const stepLabels = generationMode === 'previous'
    ? ['Year & Group', 'Seat Matrix', 'Timelines', 'Strategy', 'Scores & Merit', 'Bulk Offers', 'Approval']
    : ['Year & Group', 'Seat Matrix', 'Timelines', 'Strategy', 'Criteria & TB', 'Scores & Merit', 'Bulk Offers', 'Approval'];

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
      <div className="wizard-card" style={step === 2 ? { maxWidth: '980px' } : undefined}>
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
          <button
            className="btn-secondary"
            disabled={step === 1 || submitting || generating}
            onClick={() => {
              if (step === 5 && subStep5 === 'tiebreakers') {
                setSubStep5('weights');
              } else {
                if (step === 5) setSubStep5('weights');
                setStep((s) => s - 1);
              }
            }}
          >
            ← Back
          </button>
          {step === 5 && subStep5 === 'weights' ? (
            <button className="btn-primary" onClick={() => setSubStep5('tiebreakers')} disabled={!step5Valid()}>
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
