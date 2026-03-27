'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Cycle {
  id: string; name: string; number: number; academicYear: string;
  ptatId: string; lppIds: string[];
  status: 'Planned' | 'Active' | 'Closed' | 'Approved';
}

interface PTAT { id: string; name: string; }

interface OfferConfigRow {
  programId: string; programName: string;
  categoryName: string; subcategoryName: string;
  approvedIntake: number; committed: number; availableSeats: number;
  applicants: number; eligiblePool: number; offersToRelease: number;
}

interface ReviewComment {
  author: string;
  timestamp: string;
  text: string;
}

type DisplayStatus = 'Draft' | 'Approval Pending' | 'Review Needed' | 'Approved' | 'Released';

function getDisplayStatus(status: string, hasOffers: boolean): DisplayStatus {
  if (hasOffers) return 'Released';
  switch (status) {
    case 'Planned':  return 'Draft';
    case 'Active':   return 'Approval Pending';
    case 'Closed':   return 'Review Needed';
    case 'Approved': return 'Approved';
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
  const [loaded, setLoaded]         = useState(false);

  useEffect(() => {
    async function load() {
      // 1. Try sessionStorage first
      let foundInSession = false;
      try {
        const stored = sessionStorage.getItem(`cycle-${id}`);
        if (stored) {
          foundInSession = true;
          const parsed = JSON.parse(stored);
          setCycle(parsed.cycle ?? null);
          setPtat(parsed.ptat ?? null);
        }
        const rowsRaw = sessionStorage.getItem(`cycle-${id}-configRows`);
        if (rowsRaw) setConfigRows(JSON.parse(rowsRaw));
        const offersRaw = sessionStorage.getItem(`cycle-${id}-offers`);
        setHasOffers(!!offersRaw);
        const commentsRaw = sessionStorage.getItem(`cycle-${id}-comments`);
        if (commentsRaw) setComments(JSON.parse(commentsRaw));
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
      try { sessionStorage.setItem(`cycle-${id}-comments`, JSON.stringify(seeded)); } catch { /* ignore */ }
    }
  }, [loaded, cycle, hasOffers, comments.length, id]);

  function addComment() {
    if (!newComment.trim()) return;
    const comment: ReviewComment = {
      author: 'You',
      timestamp: new Date().toISOString(),
      text: newComment.trim(),
    };
    const updated = [...comments, comment];
    setComments(updated);
    try { sessionStorage.setItem(`cycle-${id}-comments`, JSON.stringify(updated)); } catch { /* ignore */ }
    setNewComment('');
    setShowCommentBox(false);
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

          {/* Add comment */}
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
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
          Offer Configuration (read-only)
        </div>

        {/* Definitions */}
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '12px', color: '#374151' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '4px 16px' }}>
            <b>Approved Intake</b>          <span>Total sanctioned seats for this subcategory</span>
            <b>Committed</b>                <span>Students who have paid the commitment fee</span>
            <b>Available Seats</b>          <span>Approved Intake minus Committed seats</span>
            <b>Applicants</b>               <span>Total applications for this program</span>
            <b>Eligible Pool</b>            <span>Applicants meeting minimum eligibility criteria and previous cycle waitlisted</span>
            <b>Pending Acceptance</b>       <span>Offers awaiting confirmation</span>
            <b>Withdrawn</b>                <span>Applicants who have exited the process</span>
            <b>Waitlisted for Next Cycle</b> <span>Eligible Pool minus Offers to Release</span>
          </div>
        </div>

        {configRows && configRows.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', minWidth: '130px' }}>Program Plan</th>
                  <th style={{ textAlign: 'left', minWidth: '120px' }}>Category</th>
                  <th style={{ textAlign: 'left', minWidth: '140px' }}>Subcategory</th>
                  <th style={{ textAlign: 'center' }}>Approved Intake</th>
                  <th style={{ textAlign: 'center' }}>Committed</th>
                  <th style={{ textAlign: 'center' }}>Available Seats</th>
                  <th style={{ textAlign: 'center' }}>Applicants</th>
                  <th style={{ textAlign: 'center' }}>Eligible Pool</th>
                  <th style={{ textAlign: 'center' }}>Pending Acceptance</th>
                  <th style={{ textAlign: 'center' }}>Withdrawn</th>
                  <th style={{ textAlign: 'center' }}>Offers to Release</th>
                  <th style={{ textAlign: 'center', minWidth: '130px' }}>Waitlisted for Next Cycle</th>
                </tr>
              </thead>
              <tbody>
                {configRows.map((row, i) => {
                  const prevRow = configRows[i - 1];
                  const isNewProgram  = !prevRow || prevRow.programId !== row.programId;
                  const isNewCategory = !prevRow || prevRow.programId !== row.programId || prevRow.categoryName !== row.categoryName;
                  const pending    = Math.round(row.offersToRelease * 0.3);
                  const withdrawn  = Math.round(row.offersToRelease * 0.05);
                  const waitlisted = Math.max(0, row.eligiblePool - row.offersToRelease);
                  return (
                    <tr key={`${row.programId}-${row.subcategoryName}`}
                      style={{ borderTop: isNewProgram && i > 0 ? '2px solid var(--color-border)' : undefined }}>
                      <td style={{ fontWeight: isNewProgram ? 700 : 400, color: isNewProgram ? 'var(--color-primary)' : 'transparent', fontSize: '13px' }}>
                        {isNewProgram ? row.programName : ''}
                      </td>
                      <td style={{ color: isNewCategory ? 'var(--color-text)' : 'transparent', fontWeight: 500 }}>
                        {isNewCategory ? row.categoryName : ''}
                      </td>
                      <td>{row.subcategoryName}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{row.approvedIntake}</td>
                      <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>{row.committed}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{row.availableSeats}</td>
                      <td style={{ textAlign: 'center' }}>{row.applicants}</td>
                      <td style={{ textAlign: 'center' }}>{row.eligiblePool}</td>
                      <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>{pending}</td>
                      <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>{withdrawn}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{row.offersToRelease}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: waitlisted > 0 ? '#b45309' : 'var(--color-text-muted)' }}>
                        {waitlisted}
                      </td>
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
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-primary" onClick={() => router.push(`/cycle/${id}/evaluation`)}>
          {configRows && configRows.length > 0 ? 'Open Evaluation →' : 'Release Offers →'}
        </button>
      </div>
    </div>
  );
}
