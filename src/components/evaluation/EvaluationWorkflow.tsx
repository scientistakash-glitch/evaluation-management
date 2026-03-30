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
  status: 'Planned' | 'Active' | 'Closed' | 'Approved' | 'Released';
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

  const [evalStep, setEvalStep]     = useState<'scores' | 'offers' | 'approval'>('scores');

  // ── Load from sessionStorage ──────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      // 1. Try sessionStorage first
      let foundInSession = false;
      try {
        const stored = sessionStorage.getItem(`cycle-${cycleId}`);
        if (stored) {
          foundInSession = true;
          const parsed = JSON.parse(stored);
          setCycle(parsed.cycle);
          setEvaluation(parsed.evaluation);
          setPtat(parsed.ptat ?? null);
          setLpps(parsed.lpps ?? []);
          setFullLpps(parsed.lpps ?? []);
          setGenerationMode(parsed.generationMode ?? 'fresh');
          setApproved(parsed.evaluation?.status === 'Approved');
          if (parsed.evaluation?.status === 'Approved') setEvalStep('approval');
          if (Array.isArray(parsed.rankRecords)) setRankRecords(parsed.rankRecords);
        }
      } catch { /* ignore */ }

      // 2. If not in sessionStorage, fetch from API
      if (!foundInSession) {
        try {
          const cycleRes = await fetch(`/api/cycles/${cycleId}`);
          if (!cycleRes.ok) { setLoadError('Cycle not found.'); setLoaded(true); return; }
          const cycleData = await cycleRes.json();
          setCycle(cycleData);

          const [ptatsRes, lppsRes, evalsRes] = await Promise.all([
            fetch('/api/ptats'),
            fetch(`/api/lpps?ptatId=${cycleData.ptatId}`),
            fetch(`/api/evaluations?cycleId=${cycleId}`),
          ]);
          if (ptatsRes.ok) {
            const ptats = await ptatsRes.json();
            setPtat((ptats as { id: string; name: string }[]).find((p) => p.id === cycleData.ptatId) ?? null);
          }
          if (lppsRes.ok) {
            const lppsData = await lppsRes.json();
            setLpps(lppsData);
            setFullLpps(lppsData);
          }
          if (evalsRes.ok) {
            const evals = await evalsRes.json();
            const ev = Array.isArray(evals) && evals.length > 0 ? evals[0] : null;
            if (ev) {
              setEvaluation(ev);
              setApproved(ev.status === 'Approved');
              if (ev.status === 'Approved') setEvalStep('approval');
              const rankRes = await fetch(`/api/rank-records?evaluationId=${ev.id}`);
              if (rankRes.ok) {
                const records = await rankRes.json();
                setRankRecords(Array.isArray(records) ? records : []);
              }
            }
          }
        } catch {
          setLoadError('Failed to load cycle data.');
          setLoaded(true);
          return;
        }
      }

      // Always fetch applications from API
      try {
        const appsRes = await fetch('/api/applications');
        const appsData = appsRes.ok ? await appsRes.json() : [];
        setApplications(Array.isArray(appsData) ? appsData : []);
      } catch { /* ignore */ }

      setLoaded(true);
    }
    load();
  }, [cycleId]);

  const appMap = new Map(applications.map((a) => [a.id, a]));
  const lppMap = new Map(lpps.map((l) => [l.id, l.name]));

  // ── Approve ───────────────────────────────────────────────────────────────

  async function handleApprove() {
    if (!evaluation) return;
    setApproving(true);
    try {
      // Persist approval to server (updates both evaluation and cycle status)
      const res = await fetch(`/api/evaluations/${evaluation.id}/approve`, { method: 'POST' });
      if (!res.ok) throw new Error('Approval failed');

      setApproved(true);
      setEvaluation((prev) => prev ? { ...prev, status: 'Approved' } : prev);
      if (cycle) {
        // Update sessionStorage cache to match server state
        try {
          const raw = sessionStorage.getItem(`cycle-${cycle.id}`);
          if (raw) {
            const data = JSON.parse(raw);
            data.cycle = { ...data.cycle, status: 'Approved' };
            data.evaluation = { ...data.evaluation, status: 'Approved' };
            sessionStorage.setItem(`cycle-${cycle.id}`, JSON.stringify(data));
          }
        } catch { /* ignore */ }
      }
      showToast('Sent for approval successfully', 'success');
    } catch {
      showToast('Failed to send for approval', 'error');
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

  // Sorted student list for CSV export
  const allStudentIds = Array.from(studentRankMap.keys()).sort((a, b) => {
    const scoreA = Array.from(studentRankMap.get(a)?.values() ?? [])[0]?.compositeScore ?? 0;
    const scoreB = Array.from(studentRankMap.get(b)?.values() ?? [])[0]?.compositeScore ?? 0;
    return scoreB - scoreA;
  });

  // ── CSV ───────────────────────────────────────────────────────────────────

  function handleDownloadCSV() {
    downloadCSV(allStudentIds, appMap, lppMap, studentRankMap, uniqueProgramIds, evaluation?.strategy ?? null);
    showToast('CSV downloaded', 'info');
  }

  const totalStudents = new Set(rankRecords.map((r) => r.applicationId)).size;
  const programCount  = uniqueProgramIds.length || 1;

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

  const tiedCount = new Set(rankRecords.filter((r) => r.tieBreakerApplied).map((r) => r.applicationId)).size;

  // Compute active stepper step: scores=scoreStep, offers=scoreStep+1, approval=scoreStep+2
  const totalSteps = generationMode === 'previous' ? 7 : 8;
  const activeStepNum = approved
    ? totalSteps + 1   // all steps show as "done"
    : evalStep === 'scores' ? scoreStep
    : evalStep === 'offers' ? scoreStep + 1
    : scoreStep + 2;

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
          <strong>Imported from previous cycle</strong> — Rankings based on the most recent completed cycle.
        </div>
      )}

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '32px' }}>
        <SummaryCard label="Total Students"      value={String(totalStudents)} />
        <SummaryCard label="Programs Ranked"     value={String(programCount)} />
        <SummaryCard label="Strategy"            value={evaluation.strategy === 'single' ? 'Single' : 'Program-wise'} />
        <SummaryCard label="Tiebreakers Applied" value={String(tiedCount)} />
      </div>

      {/* Rankings generated block */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '36px 48px', textAlign: 'center', maxWidth: '480px', width: '100%' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '8px' }}>Rankings Generated</div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '28px' }}>
            All {totalStudents} students across {programCount} program{programCount !== 1 ? 's' : ''} have been scored and ranked.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            <button className="btn-secondary" style={{ fontSize: '13px', width: '240px' }} onClick={handleDownloadCSV}>
              ↓ Download Merit List CSV
            </button>
            <button className="btn-primary" style={{ width: '240px' }} onClick={() => setEvalStep('offers')}>
              Next: Bulk Offer Release →
            </button>
          </div>
        </div>
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
          hasPreviousCycle={cycle.hasPreviousCycle}
          onProceed={generationMode === 'fresh' ? () => setEvalStep('approval') : undefined}
        />
        <div style={{ marginTop: '24px' }}>
          <button className="btn-secondary" onClick={() => setEvalStep('scores')}>← Back to Merit List</button>
        </div>
      </>}

      {/* ════════════ STEP 8: Approval ════════════ */}
      {evalStep === 'approval' && generationMode === 'fresh' && <>
        <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '16px' }}>Send for Approval</div>
          {approved ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#276749', fontSize: '14px' }}>
                <span style={{ fontSize: '18px' }}>✓</span>
                <strong>Submitted for approval</strong>
              </div>
              <button className="btn-primary" style={{ width: 'fit-content' }} onClick={() => router.push(`/cycle/${cycleId}/view`)}>
                Back to Cycle Overview →
              </button>
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
