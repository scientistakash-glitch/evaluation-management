'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/common/ToastContext';

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
}

interface Application {
  id: string; studentName: string; rollNumber: string; category: string;
  entranceScore: number; academicScore: number; interviewScore: number;
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

function downloadCSV(rows: RankRecord[], appMap: Map<string, Application>, lppMap: Map<string, string>, tiebreakerRules: TiebreakerRule[]) {
  const header = ['Global Rank', 'Global TB', 'Program Rank', 'Program TB', 'Category Rank', 'Category TB', 'Student Name', 'Roll No', 'Category', 'Program', 'Composite Score'];
  const lines = [header.join(',')];
  for (const r of rows) {
    const app = appMap.get(r.applicationId);
    const programName = r.programId === 'all' ? 'All Programs' : (lppMap.get(r.programId) ?? r.programId);
    const tb = tbString(r, tiebreakerRules);
    lines.push([
      r.globalRank, `"${tb}"`,
      r.programRank, `"${tb}"`,
      r.categoryRank, `"${tb}"`,
      `"${app?.studentName ?? r.applicationId}"`,
      app?.rollNumber ?? '',
      r.category,
      `"${programName}"`,
      r.compositeScore,
    ].join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'rankings.csv'; a.click();
  URL.revokeObjectURL(url);
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  cycleId: string;
}

export default function EvaluationWorkflow({ cycleId }: Props) {
  const router = useRouter();
  const { showToast } = useToast();

  // Data loaded from sessionStorage
  const [cycle, setCycle]           = useState<Cycle | null>(null);
  const [ptat, setPtat]             = useState<PTAT | null>(null);
  const [lpps, setLpps]             = useState<LPP[]>([]);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loaded, setLoaded]         = useState(false);
  const [loadError, setLoadError]   = useState('');

  // Generation choice
  const [generationMode, setGenerationMode] = useState<'fresh' | 'previous'>('fresh');
  const [importedFromPrevious, setImportedFromPrevious] = useState(false);

  // Rankings
  const [rankRecords, setRankRecords] = useState<RankRecord[]>([]);
  const [generating, setGenerating]   = useState(false);
  const [generateError, setGenerateError] = useState('');

  // Approval
  const [approved, setApproved]           = useState(false);
  const [approving, setApproving]         = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  // Pagination + filter
  const [page, setPage]                   = useState(1);
  const [programFilter, setProgramFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // ── Load from sessionStorage ───────────────────────────────────────────────

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
      setApproved(parsed.evaluation?.status === 'Approved');
    } catch {
      setLoadError('Failed to load cycle data.');
      setLoaded(true);
      return;
    }

    // Fetch applications (always available from seed)
    fetch('/api/applications')
      .then((r) => r.json())
      .then((data) => setApplications(Array.isArray(data) ? data : []))
      .catch(() => setApplications([]))
      .finally(() => setLoaded(true));
  }, [cycleId]);

  const appMap = new Map(applications.map((a) => [a.id, a]));
  const lppMap = new Map(lpps.map((l) => [l.id, l.name]));

  // ── Generate ──────────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!evaluation || !cycle) return;
    setGenerating(true);
    setGenerateError('');

    // For "previous cycle": use default weights (60/30/10) to simulate importing
    const isPrevious = generationMode === 'previous';
    showToast(isPrevious ? 'Importing previous cycle rankings…' : 'Generating scores and rankings…', 'info');

    try {
      const allRankRecords: RankRecord[] = [];

      // Build program configs — for "previous" mode use default weights regardless of configured ones
      const configsToRun = evaluation.programConfigs.map((pc) =>
        isPrevious ? { ...pc, weights: { entrance: 60, academic: 30, interview: 10 } } : pc
      );

      for (const pc of configsToRun) {
        // Step 1: Generate scores (stateless — all data in request body)
        const scoreRes = await fetch(`/api/evaluations/${evaluation.id}/generate-scores`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ programId: pc.programId, weights: pc.weights, applications }),
        });
        if (!scoreRes.ok) {
          const d = await scoreRes.json();
          throw new Error(d.error ?? 'Score generation failed');
        }
        const scores = await scoreRes.json();

        // Step 2: Generate rankings (stateless — all data in request body)
        const rankRes = await fetch(`/api/evaluations/${evaluation.id}/generate-rankings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            programId: pc.programId,
            cycleId: cycle.id,
            tiebreakerRules: evaluation.tiebreakerRules,
            evaluationScores: scores,
            applications,
          }),
        });
        if (!rankRes.ok) {
          const d = await rankRes.json();
          throw new Error(d.error ?? 'Ranking generation failed');
        }
        const rankings = await rankRes.json();
        allRankRecords.push(...(Array.isArray(rankings) ? rankings : []));
      }

      setEvaluation((prev) => prev ? { ...prev, ranksGenerated: true, status: 'Ranked' } : prev);
      setRankRecords(allRankRecords);
      if (isPrevious) setImportedFromPrevious(true);
      showToast(isPrevious ? 'Previous cycle rankings imported' : 'Rankings generated successfully', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to generate';
      setGenerateError(msg);
      showToast(msg, 'error');
    } finally {
      setGenerating(false);
    }
  }

  // ── Approve ───────────────────────────────────────────────────────────────

  async function handleApprove() {
    setApproving(true);
    try {
      setApproved(true);
      setEvaluation((prev) => prev ? { ...prev, status: 'Approved' } : prev);
      setShowApprovalModal(false);
      showToast('Sent for approval successfully', 'success');
    } finally {
      setApproving(false);
    }
  }

  // ── CSV ───────────────────────────────────────────────────────────────────

  function handleDownloadCSV() {
    downloadCSV(filtered, appMap, lppMap, tiebreakerRules);
    showToast('CSV downloaded', 'info');
  }

  // ── Filtered records ──────────────────────────────────────────────────────

  const filtered = rankRecords.filter((r) => {
    if (programFilter !== 'all' && r.programId !== programFilter) return false;
    if (categoryFilter !== 'All' && r.category !== categoryFilter) return false;
    return true;
  }).sort((a, b) => a.globalRank - b.globalRank);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const categories = ['All', ...Array.from(new Set(rankRecords.map((r) => r.category))).sort()];
  const programs   = ['all', ...Array.from(new Set(rankRecords.map((r) => r.programId))).filter((p) => p !== 'all')];

  const tiebreakerRules = evaluation?.tiebreakerRules ?? [];

  // ── Loading / Error states ────────────────────────────────────────────────

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
        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}>
          {loadError || 'Cycle not found'}
        </div>
        <button className="btn-primary" onClick={() => router.push('/')}>Go to Cycles</button>
      </div>
    );
  }

  // ── Render: Not Generated ─────────────────────────────────────────────────

  if (!evaluation.ranksGenerated) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
              {ptat?.name} › {cycle.academicYear}
            </div>
            <h1 className="page-title" style={{ margin: 0 }}>{cycle.name}</h1>
          </div>
          <span className={`badge ${cycle.status === 'Approved' ? 'badge-maroon' : cycle.status === 'Active' ? 'badge-success' : 'badge-warning'}`}>
            {cycle.status}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          <SummaryCard label="Strategy" value={evaluation.strategy === 'single' ? 'Single Evaluation' : evaluation.strategy === 'program-wise' ? 'Program-wise' : '—'} />
          <SummaryCard label="Start Date"   value={formatDate(cycle.timeline.startDate)} />
          <SummaryCard label="Closing Date" value={formatDate(cycle.timeline.closingDate)} />
          <SummaryCard label="Programs"     value={String(lpps.length)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
          {/* Weights */}
          <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>
              Evaluation Weights
            </div>
            {evaluation.programConfigs.map((pc) => (
              <div key={pc.programId} style={{ marginBottom: '12px' }}>
                {evaluation.strategy === 'program-wise' && (
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '6px' }}>{pc.programName}</div>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <WeightPill label="Entrance" value={pc.weights.entrance} />
                  <WeightPill label="Academic" value={pc.weights.academic} />
                  <WeightPill label="Interview" value={pc.weights.interview} />
                </div>
              </div>
            ))}
          </div>

          {/* Tiebreakers */}
          <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>
              Tiebreaker Rules
            </div>
            {tiebreakerRules.length === 0 ? (
              <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>No rules configured</div>
            ) : (
              tiebreakerRules.map((rule, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ background: 'var(--color-primary)', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                    {i + 1}
                  </span>
                  <span style={{ fontWeight: 600 }}>{rule.criterionName}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>{rule.direction === 'DESC' ? 'High → Low' : 'Low → High'}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {generateError && (
          <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '8px', color: '#c53030', fontSize: '14px' }}>
            {generateError}
          </div>
        )}

        {/* Generation choice */}
        <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '28px', marginBottom: '16px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '18px' }}>
            How would you like to generate rankings?
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {/* Fresh option */}
            <label
              className={`strategy-card${generationMode === 'fresh' ? ' selected' : ''}`}
              style={{ cursor: 'pointer', alignItems: 'flex-start' }}
              onClick={() => setGenerationMode('fresh')}
            >
              <input type="radio" name="genMode" value="fresh" checked={generationMode === 'fresh'}
                onChange={() => setGenerationMode('fresh')} style={{ marginTop: '3px', marginRight: '12px' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '3px' }}>Generate Fresh Scores &amp; Rankings</div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  Compute new composite scores from current applicant data using configured weights and tiebreaker rules.
                </div>
              </div>
            </label>

            {/* Previous cycle option */}
            <label
              className={`strategy-card${generationMode === 'previous' ? ' selected' : ''}`}
              style={{
                cursor: cycle.hasPreviousCycle ? 'pointer' : 'not-allowed',
                alignItems: 'flex-start',
                opacity: cycle.hasPreviousCycle ? 1 : 0.55,
              }}
              onClick={() => cycle.hasPreviousCycle && setGenerationMode('previous')}
            >
              <input type="radio" name="genMode" value="previous" checked={generationMode === 'previous'}
                onChange={() => cycle.hasPreviousCycle && setGenerationMode('previous')}
                disabled={!cycle.hasPreviousCycle}
                style={{ marginTop: '3px', marginRight: '12px' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '3px' }}>
                  Use Previous Cycle Rankings
                  {!cycle.hasPreviousCycle && (
                    <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: 500, color: 'var(--color-text-muted)', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '1px 6px' }}>
                      No previous cycle
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  Import the ranked list from the most recent completed cycle for this program group. Preview and send directly for approval.
                </div>
              </div>
            </label>
          </div>

          <button
            className="btn-primary"
            onClick={handleGenerate}
            disabled={generating}
            style={{ padding: '12px 32px', fontSize: '15px' }}
          >
            {generating ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                {generationMode === 'previous' ? 'Importing…' : 'Generating…'}
              </span>
            ) : (
              generationMode === 'previous' ? 'Import Previous Rankings →' : 'Generate Scores & Rankings →'
            )}
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Rankings Ready ────────────────────────────────────────────────

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
            {ptat?.name} › {cycle.academicYear}
          </div>
          <h1 className="page-title" style={{ margin: 0 }}>{cycle.name}</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span className={`badge ${approved ? 'badge-maroon' : 'badge-success'}`}>
            {approved ? 'Approved' : 'Ranked'}
          </span>
          {!approved && (
            <button className="btn-primary" onClick={() => setShowApprovalModal(true)}>
              Send for Approval
            </button>
          )}
          {approved && (
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              ✓ Submitted for approval
            </span>
          )}
        </div>
      </div>

      {importedFromPrevious && (
        <div style={{ marginBottom: '20px', padding: '12px 16px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', fontSize: '13px', color: '#1D4ED8', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>📋</span>
          <strong>Imported from previous cycle</strong> — Rankings are based on the most recent completed cycle for this program group. Review and send for approval.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <SummaryCard label="Total Applicants" value={String(new Set(rankRecords.map((r) => r.applicationId)).size)} />
        <SummaryCard label="Programs Ranked"  value={String(programs.filter((p) => p !== 'all').length || 1)} />
        <SummaryCard label="Strategy"         value={evaluation.strategy === 'single' ? 'Single' : 'Program-wise'} />
        <SummaryCard label="Tiebreakers"      value={String(tiebreakerRules.length)} />
      </div>

      {/* Filters + download */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        {programs.length > 1 && (
          <select className="form-input" style={{ width: 'auto', fontSize: '13px' }}
            value={programFilter}
            onChange={(e) => { setProgramFilter(e.target.value); setPage(1); }}>
            <option value="all">All Programs</option>
            {programs.filter((p) => p !== 'all').map((p) => (
              <option key={p} value={p}>{lppMap.get(p) ?? p}</option>
            ))}
          </select>
        )}
        <select className="form-input" style={{ width: 'auto', fontSize: '13px' }}
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}>
          {categories.map((c) => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
        </select>
        <span style={{ flex: 1 }} />
        <button className="btn-secondary" style={{ fontSize: '13px' }} onClick={handleDownloadCSV}>
          ↓ Download CSV
        </button>
      </div>

      {/* Rank table */}
      <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ minWidth: '800px' }}>
            <thead>
              <tr>
                <th>Global Rank</th>
                <th>Program Rank</th>
                <th>Category Rank</th>
                <th>Student Name</th>
                <th>Roll No</th>
                <th>Category</th>
                {programs.length > 1 && <th>Program</th>}
                <th>Composite Score</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '32px' }}>No results</td></tr>
              ) : pageRows.map((r) => {
                const app = appMap.get(r.applicationId);
                const programName = r.programId === 'all' ? 'All Programs' : (lppMap.get(r.programId) ?? r.programId);
                const tb = tbString(r, tiebreakerRules);
                const tbBadge = tb ? (
                  <div style={{ fontSize: '10px', color: '#b45309', marginTop: '3px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '4px', padding: '1px 5px', display: 'inline-block' }}>
                    TB: {tb}
                  </div>
                ) : null;
                return (
                  <tr key={r.id}>
                    <td>
                      <strong style={{ color: 'var(--color-primary)' }}>#{r.globalRank}</strong>
                      {tbBadge}
                    </td>
                    <td>
                      <strong>#{r.programRank}</strong>
                      {tbBadge}
                    </td>
                    <td>
                      <strong>#{r.categoryRank}</strong>
                      {tbBadge}
                    </td>
                    <td style={{ fontWeight: 600 }}>{app?.studentName ?? r.applicationId}</td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>{app?.rollNumber ?? '—'}</td>
                    <td><CategoryBadge category={r.category} /></td>
                    {programs.length > 1 && <td style={{ fontSize: '12px' }}>{programName}</td>}
                    <td><strong>{r.compositeScore.toFixed(2)}</strong></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" onClick={() => setPage(1)} disabled={page === 1}>«</button>
          <button className="page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', padding: '0 8px' }}>
            Page {page} of {totalPages} ({filtered.length} records)
          </span>
          <button className="page-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
          <button className="page-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="modal-overlay" onClick={() => setShowApprovalModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '8px' }}>
                Send for Approval
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
                The following stakeholders will be notified to review and approve the rankings for <strong>{cycle.name}</strong>.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
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
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setShowApprovalModal(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleApprove} disabled={approving}>
                  {approving ? 'Sending…' : 'Send for Approval'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small sub-components ───────────────────────────────────────────────────────

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '14px 18px' }}>
      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>{value}</div>
    </div>
  );
}

function WeightPill({ label, value }: { label: string; value: number }) {
  return (
    <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '12px', background: 'var(--color-primary-light)', color: 'var(--color-primary)', fontWeight: 600, border: '1px solid var(--color-primary)' }}>
      {label}: {value}%
    </span>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  General: 'badge-default', OBC: 'badge-warning', SC: 'badge-success', ST: 'badge-gray', EWS: 'badge-maroon',
};

function CategoryBadge({ category }: { category: string }) {
  return <span className={`badge ${CATEGORY_COLORS[category] ?? 'badge-default'}`} style={{ fontSize: '11px' }}>{category}</span>;
}
