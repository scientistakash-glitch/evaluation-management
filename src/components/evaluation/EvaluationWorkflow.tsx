'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/common/ToastContext';
import BulkOfferRelease from './BulkOfferRelease';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Cycle {
  id: string; name: string; number: number; academicYear: string;
  hasPreviousCycle: boolean;
  ptatId: string; lppIds: string[];
  timeline: { startDate: string; offerReleaseDate: string; acceptanceDeadline: string; paymentDeadline: string; closingDate: string; };
  evaluationStrategy: 'single' | 'program-wise' | null;
  status: 'Planned' | 'Active' | 'Closed' | 'Approved';
}

interface PTAT { id: string; name: string; }
interface LPP  { id: string; name: string; }
interface FullLPP { id: string; name: string; totalSeats: number; categoryWiseSeats: Record<string, number>; }

interface TiebreakerRule { order: number; criterionId: string; criterionName: string; direction: 'DESC' | 'ASC'; }
interface ProgramWeights { entrance: number; academic: number; interview: number; }
interface ProgramConfig  { programId: string; programName: string; weights: ProgramWeights; scoresGenerated: boolean; }

interface Evaluation {
  id: string; cycleId: string;
  strategy: 'single' | 'program-wise' | null;
  programConfigs: ProgramConfig[];
  tiebreakerRules: TiebreakerRule[];
  ranksGenerated: boolean;
  status: 'Draft' | 'Scored' | 'Ranked' | 'Approved';
  approvedAt?: string;
}

interface RankRecord {
  id: string; applicationId: string; programId: string;
  compositeScore: number;
  globalRank: number; programRank: number; categoryRank: number;
  category: string;
  tieBreakerValues: Record<string, number>;
  tieBreakerApplied: boolean;
  preferenceOrder: number;
}

interface Application {
  id: string; studentName: string; rollNumber: string; category: string;
  entranceScore: number; academicScore: number; interviewScore: number;
  lppPreference: string;
  lppPreferences?: { lppId: string; preferenceOrder: number }[];
}

const PAGE_SIZE = 15;

const HARDCODED_APPROVERS = [
  { name: 'Dean of Admissions',  email: 'dean@university.edu' },
  { name: 'Registrar',           email: 'registrar@university.edu' },
  { name: 'Director Academic',   email: 'director@university.edu' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function tbString(r: RankRecord, tiebreakerRules: TiebreakerRule[]): string {
  if (!r.tieBreakerApplied) return '';
  return tiebreakerRules
    .filter((rule) => r.tieBreakerValues[rule.criterionId] !== undefined)
    .map((rule) => `${rule.criterionName} ${(r.tieBreakerValues[rule.criterionId] ?? 0).toFixed(1)}`)
    .join(' › ');
}

function downloadCSV(
  students: string[],
  appMap: Map<string, Application>,
  lppMap: Map<string, string>,
  studentRankMap: Map<string, Map<string, RankRecord>>,
  programIds: string[],
  strategy: string | null,
) {
  const programHeaders = strategy === 'program-wise' ? programIds.map((p) => lppMap.get(p) ?? p) : ['Global Rank', 'Category Rank'];
  const header = ['Student Name', 'Roll No', 'Category', 'Composite Score', ...programHeaders];
  const lines = [header.join(',')];
  for (const appId of students) {
    const app = appMap.get(appId);
    const ranksByProgram = studentRankMap.get(appId) ?? new Map();
    const firstRecord = Array.from(ranksByProgram.values())[0];
    if (!firstRecord) continue;
    let rankCells: (string | number)[];
    if (strategy === 'program-wise') {
      rankCells = programIds.map((p) => {
        const rec = ranksByProgram.get(p);
        return rec ? rec.programRank : '—';
      });
    } else {
      rankCells = [firstRecord.globalRank, firstRecord.categoryRank];
    }
    lines.push([
      `"${app?.studentName ?? appId}"`,
      app?.rollNumber ?? '',
      firstRecord.category,
      firstRecord.compositeScore,
      ...rankCells,
    ].join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'rankings.csv'; a.click();
  URL.revokeObjectURL(url);
}

// ── Stepper ───────────────────────────────────────────────────────────────────

function WizardStepper({ activeStep, generationMode }: { activeStep: number; generationMode: 'fresh' | 'previous' }) {
  const labels = generationMode === 'previous'
    ? ['Year & Group', 'Seat Matrix', 'Timelines', 'Strategy', 'Scores & Merit', 'Bulk Offers', 'Approval']
    : ['Year & Group', 'Seat Matrix', 'Timelines', 'Strategy', 'Criteria & TB', 'Scores & Merit', 'Bulk Offers', 'Approval'];
  return (
    <div className="wizard-progress">
      {labels.map((label, i) => {
        const n = i + 1;
        const state = n < activeStep ? 'done' : n === activeStep ? 'active' : 'pending';
        return (
          <React.Fragment key={n}>
            <div className={`wizard-step-indicator ${state}`}>
              <div className="step-circle">{n < activeStep ? '✓' : n}</div>
              <div className="step-label">{label}</div>
            </div>
            {i < labels.length - 1 && <div className={`step-connector${n < activeStep ? ' done' : ''}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props { cycleId: string; }

export default function EvaluationWorkflow({ cycleId }: Props) {
  const router = useRouter();
  const { showToast } = useToast();

  const [cycle, setCycle]           = useState<Cycle | null>(null);
  const [ptat, setPtat]             = useState<PTAT | null>(null);
  const [lpps, setLpps]             = useState<LPP[]>([]);
  const [fullLpps, setFullLpps]     = useState<FullLPP[]>([]);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loaded, setLoaded]         = useState(false);
  const [loadError, setLoadError]   = useState('');

  const [generationMode, setGenerationMode] = useState<'fresh' | 'previous'>('fresh');

  const [rankRecords, setRankRecords] = useState<RankRecord[]>([]);

  const [approved, setApproved]     = useState(false);
  const [approving, setApproving]   = useState(false);

  const [page, setPage]             = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [evalStep, setEvalStep]     = useState<'scores' | 'offers' | 'approval'>('scores');

  // ── Load from sessionStorage ──────────────────────────────────────────────

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`cycle-${cycleId}`);
      if (!stored) {
        setLoadError('Cycle data not found. Please go back and create the cycle again.');
        setLoaded(true);
        return;
      }
      const parsed = JSON.parse(stored);
      setCycle(parsed.cycle);
      setEvaluation(parsed.evaluation);
      setPtat(parsed.ptat ?? null);
      setLpps(parsed.lpps ?? []);
      setFullLpps(parsed.lpps ?? []);
      setGenerationMode(parsed.generationMode ?? 'fresh');
      setApproved(parsed.evaluation?.status === 'Approved');
      if (Array.isArray(parsed.rankRecords)) setRankRecords(parsed.rankRecords);
    } catch {
      setLoadError('Failed to load cycle data.');
      setLoaded(true);
      return;
    }

    fetch('/api/applications')
      .then((r) => r.json())
      .then((data) => setApplications(Array.isArray(data) ? data : []))
      .catch(() => setApplications([]))
      .finally(() => setLoaded(true));
  }, [cycleId]);

  const appMap = new Map(applications.map((a) => [a.id, a]));
  const lppMap = new Map(lpps.map((l) => [l.id, l.name]));

  // ── Approve ───────────────────────────────────────────────────────────────

  async function handleApprove() {
    setApproving(true);
    try {
      setApproved(true);
      setEvaluation((prev) => prev ? { ...prev, status: 'Approved' } : prev);
      showToast('Sent for approval successfully', 'success');
    } finally {
      setApproving(false);
    }
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const tiebreakerRules = evaluation?.tiebreakerRules ?? [];

  // Unique programs in rank order
  const uniqueProgramIds = Array.from(new Set(rankRecords.map((r) => r.programId))).filter((p) => p !== 'all');
  const isStudentCentric = uniqueProgramIds.length > 0 && rankRecords.length > 0;

  // Student-centric grouping: Map<applicationId, Map<programId, RankRecord>>
  const studentRankMap = new Map<string, Map<string, RankRecord>>();
  for (const r of rankRecords) {
    if (!studentRankMap.has(r.applicationId)) studentRankMap.set(r.applicationId, new Map());
    studentRankMap.get(r.applicationId)!.set(r.programId, r);
  }

  const categories = ['All', ...Array.from(new Set(rankRecords.map((r) => r.category))).sort()];

  // Sorted student list for student-centric view (sorted by compositeScore of first record)
  const allStudentIds = Array.from(studentRankMap.keys());
  const filteredStudentIds = allStudentIds
    .filter((appId) => {
      if (categoryFilter !== 'All') {
        const firstRec = Array.from(studentRankMap.get(appId)?.values() ?? [])[0];
        return firstRec?.category === categoryFilter;
      }
      return true;
    })
    .sort((a, b) => {
      const scoreA = Array.from(studentRankMap.get(a)?.values() ?? [])[0]?.compositeScore ?? 0;
      const scoreB = Array.from(studentRankMap.get(b)?.values() ?? [])[0]?.compositeScore ?? 0;
      return scoreB - scoreA;
    });

  // For single strategy: flat filtered records
  const filteredSingle = rankRecords
    .filter((r) => categoryFilter === 'All' || r.category === categoryFilter)
    .sort((a, b) => a.globalRank - b.globalRank);

  const totalPages = isStudentCentric
    ? Math.max(1, Math.ceil(filteredStudentIds.length / PAGE_SIZE))
    : Math.max(1, Math.ceil(filteredSingle.length / PAGE_SIZE));
  const pageStudentIds = filteredStudentIds.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageRows       = filteredSingle.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── CSV ───────────────────────────────────────────────────────────────────

  function handleDownloadCSV() {
    downloadCSV(filteredStudentIds, appMap, lppMap, studentRankMap, uniqueProgramIds, evaluation?.strategy ?? null);
    showToast('CSV downloaded', 'info');
  }

  // ── Summary data ──────────────────────────────────────────────────────────

  function buildSummary() {
    // One row per (programId, category) combination
    const rows: { programId: string; programName: string; category: string; count: number; high: number; low: number; avg: number }[] = [];
    type Key = string;
    const groups = new Map<Key, RankRecord[]>();
    for (const r of rankRecords) {
      const key = `${r.programId}::${r.category}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }
    for (const [key, recs] of Array.from(groups.entries())) {
      const [programId, category] = key.split('::');
      const scores = recs.map((r) => r.compositeScore);
      rows.push({
        programId,
        programName: programId === 'all' ? 'All Programs' : (lppMap.get(programId) ?? programId),
        category,
        count: recs.length,
        high: Math.max(...scores),
        low: Math.min(...scores),
        avg: scores.reduce((s, x) => s + x, 0) / scores.length,
      });
    }
    // Sort by programId order then category
    const catOrder = ['General', 'OBC', 'SC', 'ST', 'EWS'];
    rows.sort((a, b) => {
      const pi = uniqueProgramIds.indexOf(a.programId) - uniqueProgramIds.indexOf(b.programId);
      if (pi !== 0) return pi;
      return catOrder.indexOf(a.category) - catOrder.indexOf(b.category);
    });
    return rows;
  }

  // ── Loading / Error ───────────────────────────────────────────────────────

  if (!loaded) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-text-muted)', fontSize: '16px' }}>
          <span className="spinner" style={{ width: '24px', height: '24px', borderWidth: '3px' }} />
          Loading cycle…
        </div>
      </div>
    );
  }

  if (loadError || !cycle || !evaluation) {
    return (
      <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <div style={{ fontSize: '32px' }}>⚠️</div>
        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}>{loadError || 'Cycle not found'}</div>
        <button className="btn-primary" onClick={() => router.push('/')}>Go to Cycles</button>
      </div>
    );
  }

  // ── Render: Not Generated ─────────────────────────────────────────────────

  // Stepper step: pre-gen = Score & Offers step; post-gen depends on approval state
  const scoreStep = generationMode === 'previous' ? 5 : 6;
  const approvalStep = generationMode === 'previous' ? 6 : 7;

  // ── Render: Rankings ─────────────────────────────────────────────────────

  const summaryRows = buildSummary();
  const tiedCount   = new Set(rankRecords.filter((r) => r.tieBreakerApplied).map((r) => r.applicationId)).size;

  // Compute active stepper step: scores=scoreStep, offers=scoreStep+1, approval=scoreStep+2
  const activeStepNum = evalStep === 'scores' ? scoreStep
    : evalStep === 'offers' ? scoreStep + 1
    : approved ? scoreStep + 3 : scoreStep + 2;

  return (
    <div className="page-container">
      <WizardStepper activeStep={activeStepNum} generationMode={generationMode} />
      <div className="page-header">
        <div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>{ptat?.name} › {cycle.academicYear}</div>
          <h1 className="page-title" style={{ margin: 0 }}>{cycle.name}</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span className={`badge ${approved ? 'badge-maroon' : 'badge-success'}`}>{approved ? 'Approved' : 'Ranked'}</span>
          <span className="badge badge-default" style={{ fontSize: '11px' }}>{generationMode === 'previous' ? 'Previous Import' : 'Fresh'}</span>
        </div>
      </div>

      {/* ════════════ STEP 6: Scores & Merit List ════════════ */}
      {evalStep === 'scores' && <>
      {generationMode === 'previous' && (
        <div style={{ marginBottom: '20px', padding: '12px 16px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', fontSize: '13px', color: '#1D4ED8', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>📋</span>
          <strong>Imported from previous cycle</strong> — Rankings based on the most recent completed cycle.
        </div>
      )}

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <SummaryCard label="Total Students" value={String(new Set(rankRecords.map((r) => r.applicationId)).size)} />
        <SummaryCard label="Programs Ranked" value={String(uniqueProgramIds.length || 1)} />
        <SummaryCard label="Strategy"        value={evaluation.strategy === 'single' ? 'Single' : 'Program-wise'} />
        <SummaryCard label="Tiebreakers Applied" value={String(tiedCount)} />
      </div>

      {/* Merit list summary — always program × category */}
      {summaryRows.length > 0 && (
        <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>
            Merit List Summary — by Program &amp; Category
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Program</th>
                  <th>Category</th>
                  <th>Students Ranked</th>
                  <th>Highest Score</th>
                  <th>Lowest Score</th>
                  <th>Avg Score</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((row, i) => {
                  const prevRow = summaryRows[i - 1];
                  const isNewProgram = !prevRow || prevRow.programId !== row.programId;
                  return (
                    <tr key={`${row.programId}-${row.category}`} style={{ background: isNewProgram && i > 0 ? 'var(--color-bg)' : undefined }}>
                      <td style={{ fontWeight: isNewProgram ? 700 : 400, color: isNewProgram ? 'var(--color-primary)' : 'var(--color-text-muted)', fontSize: isNewProgram ? '13px' : '12px' }}>
                        {isNewProgram ? row.programName : ''}
                      </td>
                      <td><CategoryBadge category={row.category} /></td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{row.count}</td>
                      <td style={{ textAlign: 'center', color: '#276749', fontWeight: 600 }}>{row.high.toFixed(2)}</td>
                      <td style={{ textAlign: 'center', color: '#c53030' }}>{row.low.toFixed(2)}</td>
                      <td style={{ textAlign: 'center' }}>{row.avg.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Download */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', justifyContent: 'flex-end' }}>
        <button className="btn-secondary" style={{ fontSize: '13px' }} onClick={handleDownloadCSV}>↓ Download Full CSV</button>
      </div>

      {/* Rank table — student-centric with global, category, and per-program ranks */}
      <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
        <div style={{ overflowX: 'auto' }}>
          {isStudentCentric ? (
            <table className="data-table" style={{ minWidth: `${700 + uniqueProgramIds.length * 180}px` }}>
              <thead>
                <tr>
                  <th>Global Rank</th>
                  <th>App ID</th>
                  <th>Student Name</th>
                  <th>Category</th>
                  <th>Cat. Rank</th>
                  <th>Score</th>
                  {uniqueProgramIds.map((pid) => {
                    const shortName = (lppMap.get(pid) ?? pid).replace('B.Tech ', '');
                    return (
                      <React.Fragment key={pid}>
                        <th style={{ textAlign: 'center' }}>{shortName} Rank</th>
                        <th style={{ textAlign: 'center', fontSize: '11px', color: 'var(--color-text-muted)' }}>{shortName} TB</th>
                      </React.Fragment>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredStudentIds.length === 0 ? (
                  <tr><td colSpan={6 + uniqueProgramIds.length * 2} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '32px' }}>No results</td></tr>
                ) : filteredStudentIds.slice(0, 10).map((appId, rowIdx) => {
                  const app = appMap.get(appId);
                  const ranksByProgram = studentRankMap.get(appId) ?? new Map<string, RankRecord>();
                  const firstRecord = Array.from(ranksByProgram.values())[0];
                  const globalR = firstRecord?.globalRank ?? 0;
                  const catR = firstRecord?.categoryRank ?? 0;
                  const globalTb = firstRecord ? tbString(firstRecord, tiebreakerRules) : '';
                  return (
                    <tr key={appId}>
                      <td><strong style={{ color: 'var(--color-primary)' }}>#{globalR}</strong></td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>{appId}</td>
                      <td style={{ fontWeight: 600 }}>{app?.studentName ?? appId}</td>
                      <td><CategoryBadge category={firstRecord?.category ?? ''} /></td>
                      <td><strong>#{catR}</strong></td>
                      <td><strong>{firstRecord?.compositeScore.toFixed(2) ?? '—'}</strong></td>
                      {uniqueProgramIds.map((pid) => {
                        const rec = ranksByProgram.get(pid);
                        const tb  = rec ? tbString(rec, tiebreakerRules) : '';
                        return (
                          <React.Fragment key={pid}>
                            <td style={{ textAlign: 'center' }}>
                              {rec ? <strong style={{ color: 'var(--color-primary)' }}>#{rec.programRank}</strong> : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                            </td>
                            <td style={{ textAlign: 'center', fontSize: '11px', color: '#b45309' }}>
                              {tb || ''}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="data-table" style={{ minWidth: '700px' }}>
              <thead>
                <tr>
                  <th>Global Rank</th>
                  <th>Category Rank</th>
                  <th>Application ID</th>
                  <th>Student Name</th>
                  <th>Category</th>
                  <th>Composite Score</th>
                </tr>
              </thead>
              <tbody>
                {filteredSingle.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '32px' }}>No results</td></tr>
                ) : filteredSingle.slice(0, 10).map((r) => {
                  const app = appMap.get(r.applicationId);
                  const tb  = tbString(r, tiebreakerRules);
                  const tbBadge = tb ? <div style={{ fontSize: '10px', color: '#b45309', marginTop: '3px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '4px', padding: '1px 5px', display: 'inline-block' }}>TB</div> : null;
                  return (
                    <tr key={r.id}>
                      <td>
                        <strong style={{ color: 'var(--color-primary)' }}>#{r.globalRank}</strong>
                        {tbBadge}
                      </td>
                      <td>
                        <strong>#{r.categoryRank}</strong>
                        {tbBadge}
                      </td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>{r.applicationId}</td>
                      <td style={{ fontWeight: 600 }}>{app?.studentName ?? r.applicationId}</td>
                      <td><CategoryBadge category={r.category} /></td>
                      <td><strong>{r.compositeScore.toFixed(2)}</strong></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Sample note */}
      <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '12px 0' }}>
        Showing top 10 of {isStudentCentric ? filteredStudentIds.length : filteredSingle.length} students. Download CSV for complete data.
      </div>

      {/* Navigation: Next to Bulk Offers */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
        <button className="btn-primary" onClick={() => setEvalStep('offers')}>Next: Bulk Offer Release →</button>
      </div>
      </>}

      {/* ════════════ STEP 7: Bulk Offer Release ════════════ */}
      {evalStep === 'offers' && <>
        <BulkOfferRelease
          cycleId={cycle.id}
          strategy={evaluation.strategy}
          fullLpps={fullLpps}
          rankRecords={rankRecords}
          applications={applications}
          studentRankMap={studentRankMap}
          uniqueProgramIds={uniqueProgramIds}
          lppMap={lppMap}
          appMap={appMap}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
          <button className="btn-secondary" onClick={() => setEvalStep('scores')}>← Back to Merit List</button>
          {generationMode === 'fresh' && <button className="btn-primary" onClick={() => setEvalStep('approval')}>Next: Approval →</button>}
        </div>
      </>}

      {/* ════════════ STEP 8: Approval ════════════ */}
      {evalStep === 'approval' && generationMode === 'fresh' && <>
        <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '16px' }}>Send for Approval</div>
          {approved ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#276749', fontSize: '14px' }}>
              <span style={{ fontSize: '18px' }}>✓</span>
              <strong>Submitted for approval</strong>
            </div>
          ) : (
            <>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                The following stakeholders will be notified to review and approve the rankings and offer allocations for <strong>{cycle.name}</strong>.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {HARDCODED_APPROVERS.map((a) => (
                  <div key={a.email} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-bg)' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>
                      {a.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{a.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{a.email}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn-primary" onClick={handleApprove} disabled={approving}>
                {approving ? 'Sending…' : 'Send for Approval'}
              </button>
            </>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '24px' }}>
          <button className="btn-secondary" onClick={() => setEvalStep('offers')}>← Back to Bulk Offers</button>
        </div>
      </>}

      {/* Modal removed — approval is now inline in step 8 */}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '14px 18px' }}>
      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>{value}</div>
    </div>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  General: 'badge-default', OBC: 'badge-warning', SC: 'badge-success', ST: 'badge-gray', EWS: 'badge-maroon',
};

function CategoryBadge({ category }: { category: string }) {
  return <span className={`badge ${CATEGORY_COLORS[category] ?? 'badge-default'}`} style={{ fontSize: '11px' }}>{category}</span>;
}
