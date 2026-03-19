'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Cycle {
  id: string; name: string; number: number; academicYear: string;
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

function downloadCSV(rows: RankRecord[], appMap: Map<string, Application>, lppMap: Map<string, string>, tiebreakerRules: TiebreakerRule[]) {
  const tbHeaders = tiebreakerRules.map((r) => r.criterionName);
  const header = ['Global Rank', 'Program Rank', 'Category Rank', 'Student Name', 'Roll No', 'Category', 'Program', 'Composite Score', ...tbHeaders, 'Tiebreaker Applied'];
  const lines = [header.join(',')];
  for (const r of rows) {
    const app = appMap.get(r.applicationId);
    const programName = r.programId === 'all' ? 'All Programs' : (lppMap.get(r.programId) ?? r.programId);
    const tbValues = tiebreakerRules.map((rule) =>
      r.tieBreakerApplied ? (r.tieBreakerValues[rule.criterionId] ?? '').toString() : ''
    );
    lines.push([
      r.globalRank, r.programRank, r.categoryRank,
      `"${app?.studentName ?? r.applicationId}"`,
      app?.rollNumber ?? '',
      r.category,
      `"${programName}"`,
      r.compositeScore,
      ...tbValues,
      r.tieBreakerApplied ? 'Yes' : 'No',
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
  cycle: Cycle;
  ptat: PTAT | null;
  lpps: LPP[];
  initialEvaluation: Evaluation | null;
}

export default function EvaluationWorkflow({ cycle, ptat, lpps, initialEvaluation }: Props) {
  const router = useRouter();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(initialEvaluation);
  const [rankRecords, setRankRecords]   = useState<RankRecord[]>([]);
  const [applications, setApplications] = useState<Map<string, Application>>(new Map());
  const [generating, setGenerating]     = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [approving, setApproving]       = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approved, setApproved]         = useState(initialEvaluation?.status === 'Approved');

  // Pagination + filter
  const [page, setPage]           = useState(1);
  const [programFilter, setProgramFilter]   = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const lppMap = new Map(lpps.map((l) => [l.id, l.name]));

  // Load rank records + applications if already generated
  const loadRankData = useCallback(async (evalId: string) => {
    const [rankRes, appRes] = await Promise.all([
      fetch(`/api/rank-records?evaluationId=${evalId}`).then((r) => r.json()),
      fetch('/api/applications').then((r) => r.json()),
    ]);
    const records: RankRecord[] = Array.isArray(rankRes) ? rankRes : [];
    const apps: Application[]   = Array.isArray(appRes)  ? appRes  : [];
    setRankRecords(records);
    setApplications(new Map(apps.map((a) => [a.id, a])));
  }, []);

  useEffect(() => {
    if (initialEvaluation?.ranksGenerated && initialEvaluation.id) {
      loadRankData(initialEvaluation.id);
    }
  }, [initialEvaluation, loadRankData]);

  // ── Generate ──────────────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!evaluation) return;
    setGenerating(true);
    setGenerateError('');
    try {
      // Run for each programConfig sequentially
      for (const pc of evaluation.programConfigs) {
        // Generate scores
        const scoreRes = await fetch(`/api/evaluations/${evaluation.id}/generate-scores`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ programId: pc.programId }),
        });
        if (!scoreRes.ok) {
          const d = await scoreRes.json();
          throw new Error(d.error ?? 'Score generation failed');
        }

        // Generate rankings
        const rankRes = await fetch(`/api/evaluations/${evaluation.id}/generate-rankings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ programId: pc.programId }),
        });
        if (!rankRes.ok) {
          const d = await rankRes.json();
          throw new Error(d.error ?? 'Ranking generation failed');
        }
      }

      // Reload evaluation status
      const evalRes = await fetch(`/api/evaluations/${evaluation.id}`).then((r) => r.json());
      setEvaluation(evalRes);
      await loadRankData(evaluation.id);
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : 'Failed to generate');
    } finally {
      setGenerating(false);
    }
  }

  // ── Approve ───────────────────────────────────────────────────────────────────

  async function handleApprove() {
    if (!evaluation) return;
    setApproving(true);
    try {
      await fetch(`/api/evaluations/${evaluation.id}/approve`, { method: 'POST' });
      setApproved(true);
      setShowApprovalModal(false);
    } finally {
      setApproving(false);
    }
  }

  // ── Filtered records ──────────────────────────────────────────────────────────

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

  // ── Render: Not Generated ─────────────────────────────────────────────────────

  if (!evaluation?.ranksGenerated) {
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

        {/* Cycle summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          <SummaryCard label="Strategy" value={evaluation?.strategy === 'single' ? 'Single Evaluation' : evaluation?.strategy === 'program-wise' ? 'Program-wise' : '—'} />
          <SummaryCard label="Start Date"   value={formatDate(cycle.timeline.startDate)} />
          <SummaryCard label="Closing Date" value={formatDate(cycle.timeline.closingDate)} />
          <SummaryCard label="Programs"     value={String(lpps.length)} />
        </div>

        {/* Config preview */}
        {evaluation && (
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
        )}

        {generateError && (
          <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '8px', color: '#c53030', fontSize: '14px' }}>
            {generateError}
          </div>
        )}

        <div style={{ textAlign: 'center', padding: '32px', background: 'white', borderRadius: '14px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🚀</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '8px' }}>
            Ready to Generate Rankings
          </div>
          <div style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
            This will compute composite scores and generate all rankings in one go.
          </div>
          <button
            className="btn-primary"
            onClick={handleGenerate}
            disabled={generating || !evaluation}
            style={{ padding: '12px 32px', fontSize: '16px' }}
          >
            {generating ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                Generating…
              </span>
            ) : 'Generate Scores & Rankings'}
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Rankings Ready ────────────────────────────────────────────────────

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

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <SummaryCard label="Total Applicants" value={String(rankRecords.filter((r, i, a) => a.findIndex((x) => x.applicationId === r.applicationId) === i).length)} />
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
        <button className="btn-secondary" style={{ fontSize: '13px' }}
          onClick={() => downloadCSV(filtered, applications, lppMap, tiebreakerRules)}>
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
                {tiebreakerRules.length > 0 && <th>Tiebreaker</th>}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '32px' }}>No results</td></tr>
              ) : pageRows.map((r) => {
                const app = applications.get(r.applicationId);
                const programName = r.programId === 'all' ? 'All Programs' : (lppMap.get(r.programId) ?? r.programId);
                return (
                  <tr key={r.id}>
                    <td><strong style={{ color: 'var(--color-primary)' }}>#{r.globalRank}</strong></td>
                    <td>{r.programRank}</td>
                    <td>{r.categoryRank}</td>
                    <td style={{ fontWeight: 600 }}>{app?.studentName ?? r.applicationId}</td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>{app?.rollNumber ?? '—'}</td>
                    <td><CategoryBadge category={r.category} /></td>
                    {programs.length > 1 && <td style={{ fontSize: '12px' }}>{programName}</td>}
                    <td><strong>{r.compositeScore.toFixed(2)}</strong></td>
                    {tiebreakerRules.length > 0 && (
                      <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        {r.tieBreakerApplied ? (
                          <span style={{ color: '#b45309' }}>
                            {tiebreakerRules.filter((rule) => r.tieBreakerValues[rule.criterionId] !== undefined).map((rule, i) => (
                              <span key={i}>
                                {i > 0 && ', '}
                                {rule.criterionName}: {(r.tieBreakerValues[rule.criterionId] ?? 0).toFixed(1)}
                              </span>
                            ))}
                          </span>
                        ) : '—'}
                      </td>
                    )}
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
