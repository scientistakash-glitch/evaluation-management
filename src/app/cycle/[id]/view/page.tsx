'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Cycle {
  id: string; name: string; number: number; academicYear: string;
  ptatId: string; lppIds: string[];
  status: 'Planned' | 'Active' | 'Closed' | 'Approved' | 'Released';
}

interface PTAT { id: string; name: string; }

interface OfferConfigRow {
  programId: string; programName: string;
  categoryName: string; subcategoryName: string;
  approvedIntake: number; committed: number; availableSeats: number;
  applicants: number; eligiblePool: number; offersToRelease: number;
}

interface StudentOfferResult {
  applicationId: string;
  studentName: string;
  rollNumber: string;
  category: string;
  compositeScore: number;
  awardedProgramId: string | null;
  awardedPreferenceOrder: number | null;
  acceptanceStatus?: 'Pending' | 'Accepted' | 'Withdrawn';
  cycleAllotmentType?: 'Fresh' | 'Upgraded' | 'StatusQuo' | 'Waitlisted';
  upgradedFromProgramId?: string;
}

interface ReviewComment {
  author: string;
  timestamp: string;
  text: string;
}

type DisplayStatus = 'Draft' | 'Approval Pending' | 'Review Needed' | 'Approved' | 'Released';

function getDisplayStatus(status: string, hasOffers: boolean): DisplayStatus {
  switch (status) {
    case 'Released': return 'Released';
    case 'Active':   return 'Approval Pending';
    case 'Closed':   return 'Review Needed';
    case 'Approved': return 'Approved';
    case 'Planned':  return hasOffers ? 'Released' : 'Draft';
    default:         return 'Draft';
  }
}

const STATUS_BADGE: Record<DisplayStatus, string> = {
  'Draft':            'badge-warning',
  'Approval Pending': 'badge-default',
  'Review Needed':    'badge-warning',
  'Approved':         'badge-maroon',
  'Released':         'badge-success',
};

const SEEDED_COMMENT: ReviewComment = {
  author: 'Dean of Admissions',
  timestamp: new Date().toISOString(),
  text: 'Please review the General category seat allocation — the approved intake appears higher than the sanctioned limit. Kindly verify before proceeding to approval.',
};

function formatDatetime(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function CycleViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [cycle, setCycle]           = useState<Cycle | null>(null);
  const [ptat, setPtat]             = useState<PTAT | null>(null);
  const [configRows, setConfigRows] = useState<OfferConfigRow[] | null>(null);
  const [comments, setComments]     = useState<ReviewComment[]>([]);
  const [hasOffers, setHasOffers]   = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [showDefs, setShowDefs]           = useState(false);
  const [loaded, setLoaded]               = useState(false);
  const [releasing, setReleasing]         = useState(false);
  const [studentResults, setStudentResults] = useState<StudentOfferResult[]>([]);
  const [offerSummary, setOfferSummary]   = useState<{ released: number; accepted: number; pending: number; withdrawn: number } | null>(null);

  // True when any config row has committed > 0 (i.e. previous cycle data exists)
  const hasPrevCycle = useMemo(() => (configRows ?? []).some((r) => r.committed > 0), [configRows]);

  // Per-row acceptance tally derived from real studentResults data
  const acceptanceMap = useMemo(() => {
    const map = new Map<string, { committed: number; pending: number; withdrawn: number }>();
    for (const r of studentResults) {
      if (r.awardedProgramId === null) continue;
      const key = `${r.awardedProgramId}::${r.category}`;
      if (!map.has(key)) map.set(key, { committed: 0, pending: 0, withdrawn: 0 });
      const entry = map.get(key)!;
      if (r.acceptanceStatus === 'Accepted') entry.committed++;
      else if (r.acceptanceStatus === 'Withdrawn') entry.withdrawn++;
      else entry.pending++;
    }
    return map;
  }, [studentResults]);

  useEffect(() => {
    async function load() {
      // 1. Try sessionStorage cache first for cycle/ptat
      let foundInSession = false;
      try {
        const stored = sessionStorage.getItem(`cycle-${id}`);
        if (stored) {
          foundInSession = true;
          const parsed = JSON.parse(stored);
          setCycle(parsed.cycle ?? null);
          setPtat(parsed.ptat ?? null);
        }
      } catch { /* ignore */ }

      // 2. If sessionStorage had no cycle, fall back to API
      if (!foundInSession) {
        try {
          const cycleRes = await fetch(`/api/cycles/${id}`);
          if (cycleRes.ok) {
            const cycleData = await cycleRes.json();
            setCycle(cycleData);
            const ptatsRes = await fetch('/api/ptats');
            if (ptatsRes.ok) {
              const ptats: PTAT[] = await ptatsRes.json();
              setPtat(ptats.find((p) => p.id === cycleData.ptatId) ?? null);
            }
          }
        } catch { /* ignore */ }
      }

      // 3. Load offer release data from API (server is source of truth)
      try {
        const offerRes = await fetch(`/api/cycles/${id}/offer-release`);
        if (offerRes.ok) {
          const offerData = await offerRes.json();
          if (offerData) {
            setConfigRows(offerData.configRows);
            setHasOffers(true);
            if (Array.isArray(offerData.studentResults)) {
              setStudentResults(offerData.studentResults);
            }
            if (offerData.summary) {
              setOfferSummary(offerData.summary);
            }
          }
        }
      } catch { /* ignore */ }

      // 4. Load comments from API (server is source of truth)
      try {
        const commentsRes = await fetch(`/api/cycles/${id}/comments`);
        if (commentsRes.ok) {
          const serverComments = await commentsRes.json();
          if (Array.isArray(serverComments) && serverComments.length > 0) {
            setComments(serverComments.map((c: { author: string; createdAt: string; text: string }) => ({
              author: c.author,
              timestamp: c.createdAt,
              text: c.text,
            })));
          }
        }
      } catch { /* ignore */ }

      setLoaded(true);
    }
    load();
  }, [id]);

  // Seed a comment when status is Review Needed and no comments yet
  useEffect(() => {
    if (!loaded || !cycle) return;
    const displayStatus = getDisplayStatus(cycle.status, hasOffers);
    if (displayStatus === 'Review Needed' && comments.length === 0) {
      const seeded = [SEEDED_COMMENT];
      setComments(seeded);
      fetch(`/api/cycles/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: SEEDED_COMMENT.author, text: SEEDED_COMMENT.text }),
      }).catch(() => { /* ignore */ });
    }
  }, [loaded, cycle, hasOffers, comments.length, id]);

  async function addComment() {
    if (!newComment.trim()) return;
    const comment: ReviewComment = {
      author: 'You',
      timestamp: new Date().toISOString(),
      text: newComment.trim(),
    };
    try {
      await fetch(`/api/cycles/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: comment.author, text: comment.text }),
      });
    } catch { /* ignore */ }
    setComments([...comments, comment]);
    setNewComment('');
    setShowCommentBox(false);
  }

  async function handleRelease() {
    setReleasing(true);
    try {
      const res = await fetch(`/api/cycles/${id}/release`, { method: 'POST' });
      if (!res.ok) throw new Error('Release failed');
      const updated = await res.json();
      setCycle(updated);
      try {
        const raw = sessionStorage.getItem(`cycle-${id}`);
        if (raw) {
          const data = JSON.parse(raw);
          data.cycle = { ...data.cycle, status: 'Released' };
          sessionStorage.setItem(`cycle-${id}`, JSON.stringify(data));
        }
      } catch { /* ignore */ }
    } catch {
      alert('Failed to release cycle. Please try again.');
    } finally {
      setReleasing(false);
    }
  }

  if (!loaded) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-text-muted)', fontSize: '16px' }}>
          <span className="spinner" style={{ width: '24px', height: '24px', borderWidth: '3px' }} />
          Loading…
        </div>
      </div>
    );
  }

  if (!cycle) {
    return (
      <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <div style={{ fontSize: '32px' }}>⚠️</div>
        <div style={{ fontSize: '16px', fontWeight: 600 }}>Cycle data not found</div>
        <button className="btn-primary" onClick={() => router.push('/')}>← Back to Cycles</button>
      </div>
    );
  }

  const displayStatus = getDisplayStatus(cycle.status, hasOffers);
  const isReviewNeeded = displayStatus === 'Review Needed';

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '8px' }}>
        <button className="btn-secondary" style={{ fontSize: '13px' }} onClick={() => router.push('/')}>
          ← Back to Cycles
        </button>
      </div>

      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
            {ptat?.name} › {cycle.academicYear}
          </div>
          <h1 className="page-title" style={{ margin: 0 }}>{cycle.name}</h1>
        </div>
        <span className={`badge ${STATUS_BADGE[displayStatus]}`} style={{ fontSize: '13px', padding: '5px 12px' }}>
          {displayStatus}
        </span>
      </div>

      {/* Approved / Released banner */}
      {(displayStatus === 'Approved' || displayStatus === 'Released') && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '14px 20px', marginBottom: '24px',
          background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px',
          fontSize: '14px', color: '#166534',
        }}>
          <span style={{ fontSize: '20px' }}>✓</span>
          <div>
            {displayStatus === 'Approved'
              ? <><strong>Ready to Release</strong> — Evaluation has been approved. Click &ldquo;Release Offers to Students&rdquo; below to publish.</>
              : <><strong>Offers Released</strong> — All offer allocations have been published to students.</>
            }
          </div>
        </div>
      )}

      {/* Review Comments section (only when Review Needed) */}
      {isReviewNeeded && (
        <div style={{ background: 'white', border: '1px solid #fcd34d', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#92400e', marginBottom: '16px' }}>
            Review Comments
          </div>
          {comments.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>No comments yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {comments.map((c, i) => (
                <div key={i} style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: '12px 16px', background: '#fffbeb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>{c.author}</span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{formatDatetime(c.timestamp)}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text)', lineHeight: 1.5 }}>&ldquo;{c.text}&rdquo;</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: '14px' }}>
            {showCommentBox ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Write your comment…"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-primary" style={{ fontSize: '13px' }} onClick={addComment} disabled={!newComment.trim()}>
                    Add Comment
                  </button>
                  <button className="btn-secondary" style={{ fontSize: '13px' }} onClick={() => { setShowCommentBox(false); setNewComment(''); }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button className="btn-secondary" style={{ fontSize: '13px' }} onClick={() => setShowCommentBox(true)}>
                + Add Comment
              </button>
            )}
          </div>
        </div>
      )}

      {/* Offer Configuration table */}
      <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showDefs ? '12px' : '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Offer Configuration (read-only)
          </div>
          <button
            onClick={() => setShowDefs((v) => !v)}
            style={{ fontSize: '12px', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
          >
            {showDefs ? 'Hide definitions ▲' : 'Show definitions ▼'}
          </button>
        </div>

        {/* Definitions — collapsible */}
        {showDefs && (
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '12px', color: '#374151' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '4px 16px' }}>
              <b>Approved Intake</b>           <span>Total sanctioned seats for this subcategory</span>
              <b>Available Seats</b>           <span>Approved Intake minus Committed seats</span>
              <b>Eligible Pool</b>             <span>Applicants meeting minimum eligibility criteria and previous cycle waitlisted</span>
              <b>Offers to Release</b>         <span>Number of offers sent out for this subcategory</span>
              <b>Waitlisted for Next Cycle</b>  <span>Eligible Pool minus Offers to Release</span>
              <b>Pending</b>                    <span>Offers awaiting student confirmation</span>
              <b>Accepted</b>                  <span>Students who accepted this cycle's offer</span>
              <b>Withdrawn</b>                 <span>Students who declined or exited the process</span>
            </div>
          </div>
        )}

        {configRows && configRows.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', minWidth: '140px' }}>Program Plan</th>
                  <th style={{ textAlign: 'left', minWidth: '120px' }}>Category</th>
                  <th style={{ textAlign: 'left', minWidth: '100px' }}>Subcategory</th>
                  <th style={{ textAlign: 'right', minWidth: '110px' }}>Approved Intake</th>
                  {hasPrevCycle && <th style={{ textAlign: 'right', minWidth: '100px' }}>Committed</th>}
                  {hasPrevCycle && <th style={{ textAlign: 'right', minWidth: '110px' }}>Available Seats</th>}
                  <th style={{ textAlign: 'right', minWidth: '100px' }}>Eligible Pool</th>
                  <th style={{ textAlign: 'right', minWidth: '110px' }}>Offers Released</th>
                  <th style={{ textAlign: 'right', minWidth: '150px' }}>Waitlisted for Next Cycle</th>
                  <th style={{ textAlign: 'right', minWidth: '80px' }}>Pending</th>
                  <th style={{ textAlign: 'right', minWidth: '80px' }}>Accepted</th>
                  <th style={{ textAlign: 'right', minWidth: '80px' }}>Withdrawn</th>
                </tr>
              </thead>
              <tbody>
                {configRows.map((row, i) => {
                  const prevRow = configRows[i - 1];
                  const isNewProgram  = !prevRow || prevRow.programId !== row.programId;
                  const isNewCategory = !prevRow || prevRow.programId !== row.programId || prevRow.categoryName !== row.categoryName;
                  const waitlisted = Math.max(0, row.eligiblePool - row.offersToRelease);
                  const accKey = `${row.programId}::${row.subcategoryName}`;
                  const acc = acceptanceMap.get(accKey);
                  const accepted  = acc?.committed ?? 0;
                  const withdrawn = acc?.withdrawn ?? 0;
                  const pending   = acc ? acc.pending : row.offersToRelease;
                  return (
                    <tr key={`${row.programId}-${row.subcategoryName}`}
                      style={{ borderTop: isNewProgram && i > 0 ? '2px solid var(--color-border)' : undefined }}>
                      <td style={{
                        fontWeight: isNewProgram ? 700 : 400,
                        color: isNewProgram ? 'var(--color-primary)' : 'transparent',
                        fontSize: '13px',
                        borderLeft: isNewProgram ? '3px solid var(--color-primary)' : '3px solid transparent',
                        paddingLeft: '10px',
                      }}>
                        {isNewProgram ? row.programName : ''}
                      </td>
                      <td style={{
                        color: isNewCategory ? 'var(--color-text)' : 'transparent',
                        fontWeight: 500,
                        background: isNewCategory ? '#f9fafb' : undefined,
                      }}>
                        {isNewCategory ? row.categoryName : ''}
                      </td>
                      <td>{row.subcategoryName}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{row.approvedIntake}</td>
                      {hasPrevCycle && <td style={{ textAlign: 'right', fontWeight: 600 }}>{row.committed}</td>}
                      {hasPrevCycle && <td style={{ textAlign: 'right', fontWeight: 600 }}>{row.availableSeats}</td>}
                      <td style={{ textAlign: 'right' }}>{row.eligiblePool}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-primary-light)' }}>{row.offersToRelease}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: waitlisted > 0 ? '#b45309' : 'var(--color-text-muted)' }}>
                        {waitlisted}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>{pending}</td>
                      <td style={{ textAlign: 'right', color: accepted > 0 ? '#276749' : 'var(--color-text-muted)', fontWeight: accepted > 0 ? 600 : 400 }}>{accepted}</td>
                      <td style={{ textAlign: 'right', color: withdrawn > 0 ? '#b45309' : 'var(--color-text-muted)' }}>{withdrawn}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px' }}>
            Offer configuration not yet available — complete the Bulk Offer Release step first.
          </div>
        )}
      </div>

      {/* Footer action */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: displayStatus === 'Released' ? '24px' : 0 }}>
        {displayStatus === 'Released' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#276749', fontSize: '14px' }}>
            <span style={{ fontSize: '18px' }}>✓</span>
            <span>Offers released to students.</span>
          </div>
        ) : displayStatus === 'Approved' ? (
          <button className="btn-primary" onClick={handleRelease} disabled={releasing}>
            {releasing ? 'Releasing…' : 'Release Offers to Students →'}
          </button>
        ) : (
          <button className="btn-primary" onClick={() => router.push(`/cycle/${id}/evaluation`)}>
            {configRows && configRows.length > 0 ? 'Open Evaluation →' : 'Release Offers →'}
          </button>
        )}
      </div>

    </div>
  );
}
