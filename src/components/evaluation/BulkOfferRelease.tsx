'use client';

import React, { useState, useMemo } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface LPPSubcategory { name: string; category: string; approvedIntake: number; }
interface FullLPP {
  id: string; name: string; totalSeats: number;
  categoryWiseSeats: Record<string, number>;
  subcategories?: LPPSubcategory[];
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

// UI-facing config row (subcategory-based)
interface OfferConfigRow {
  programId: string;
  programName: string;
  categoryName: string;    // parent category group, e.g. "Resident Indian"
  subcategoryName: string; // e.g. "Resident Indian", "Gujarati Minority"
  approvedIntake: number;
  committed: number;
  availableSeats: number;
  applicants: number;
  eligiblePool: number;
  offersToRelease: number;
}

// Internal row used by the release algorithm (reservation-category-based)
interface AlgoRow {
  programId: string;
  programName: string;
  category: string;
  availableSeats: number;
  offersToRelease: number;
}

type OfferStatus = 'Offered' | 'Waitlisted' | 'None';

interface ProgramOfferResult { status: OfferStatus; waitlistNumber?: number; categoryRank: number; }

interface StudentOfferResult {
  applicationId: string;
  studentName: string;
  rollNumber: string;
  category: string;
  compositeScore: number;
  programResults: Record<string, ProgramOfferResult>;
  awardedProgramId: string | null;
  awardedPreferenceOrder: number | null;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const RESERVATION_CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS'];

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  cycleId: string;
  strategy: 'single' | 'program-wise' | null;
  fullLpps: FullLPP[];
  rankRecords: RankRecord[];
  applications: Application[];
  studentRankMap: Map<string, Map<string, RankRecord>>;
  uniqueProgramIds: string[];
  lppMap: Map<string, string>;
  appMap: Map<string, Application>;
  hasPreviousCycle?: boolean;
  onProceed?: () => void;
}

// ── Offer Release Algorithm ────────────────────────────────────────────────────

function releaseOffers(
  algoRows: AlgoRow[],
  rankRecords: RankRecord[],
  appMap: Map<string, Application>,
): StudentOfferResult[] {
  const remaining = new Map<string, number>();
  for (const row of algoRows) {
    remaining.set(`${row.programId}::${row.category}`, row.offersToRelease);
  }

  const rankedLists = new Map<string, RankRecord[]>();
  for (const r of rankRecords) {
    const key = `${r.programId}::${r.category}`;
    if (!rankedLists.has(key)) rankedLists.set(key, []);
    rankedLists.get(key)!.push(r);
  }
  for (const list of Array.from(rankedLists.values())) {
    list.sort((a, b) => a.categoryRank - b.categoryRank);
  }

  const allStudentIds = Array.from(new Set(rankRecords.map((r) => r.applicationId)));
  allStudentIds.sort((a, b) => {
    const rA = rankRecords.find((r) => r.applicationId === a);
    const rB = rankRecords.find((r) => r.applicationId === b);
    if ((rB?.compositeScore ?? 0) !== (rA?.compositeScore ?? 0))
      return (rB?.compositeScore ?? 0) - (rA?.compositeScore ?? 0);
    return (rA?.globalRank ?? 0) - (rB?.globalRank ?? 0);
  });

  const awardedProgram = new Map<string, string>();
  const awardedPrefOrder = new Map<string, number>();

  for (const appId of allStudentIds) {
    const app = appMap.get(appId);
    if (!app) continue;
    const prefs = (app.lppPreferences ?? [{ lppId: app.lppPreference, preferenceOrder: 1 }])
      .slice().sort((a, b) => a.preferenceOrder - b.preferenceOrder);

    for (const pref of prefs) {
      const key = `${pref.lppId}::${app.category}`;
      const seats = remaining.get(key) ?? 0;
      if (seats > 0) {
        awardedProgram.set(appId, pref.lppId);
        awardedPrefOrder.set(appId, pref.preferenceOrder);
        remaining.set(key, seats - 1);
        break;
      }
    }
  }

  const programIds = Array.from(new Set(rankRecords.map((r) => r.programId)));
  const results: StudentOfferResult[] = [];

  for (const appId of allStudentIds) {
    const app = appMap.get(appId);
    const offeredPid = awardedProgram.get(appId) ?? null;
    const offeredPref = awardedPrefOrder.get(appId) ?? null;
    const programResults: Record<string, ProgramOfferResult> = {};

    for (const pid of programIds) {
      const rec = rankRecords.find((r) => r.applicationId === appId && r.programId === pid);
      if (!rec) { programResults[pid] = { status: 'None', categoryRank: 0 }; continue; }
      if (pid === offeredPid) {
        programResults[pid] = { status: 'Offered', categoryRank: rec.categoryRank };
      } else {
        const key = `${pid}::${rec.category}`;
        const list = rankedLists.get(key) ?? [];
        let wlNum = 0;
        for (const entry of list) {
          if (awardedProgram.get(entry.applicationId) === pid) continue;
          wlNum++;
          if (entry.applicationId === appId) break;
        }
        programResults[pid] = { status: 'Waitlisted', waitlistNumber: wlNum, categoryRank: rec.categoryRank };
      }
    }

    results.push({
      applicationId: appId,
      studentName: app?.studentName ?? appId,
      rollNumber: app?.rollNumber ?? '',
      category: app?.category ?? '',
      compositeScore: rankRecords.find((r) => r.applicationId === appId)?.compositeScore ?? 0,
      programResults,
      awardedProgramId: offeredPid,
      awardedPreferenceOrder: offeredPref,
    });
  }

  results.sort((a, b) => b.compositeScore - a.compositeScore);
  return results;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function BulkOfferRelease({
  cycleId, strategy, fullLpps, rankRecords, applications,
  studentRankMap, uniqueProgramIds, lppMap, appMap, hasPreviousCycle, onProceed,
}: Props) {
  const isSingle = strategy === 'single';
  const programIds = uniqueProgramIds.length > 0 ? uniqueProgramIds : (isSingle ? ['all'] : []);

  // ── Build subcategory-based UI config rows ────────────────────────────────────
  const defaultConfig = useMemo<OfferConfigRow[]>(() => {
    const rows: OfferConfigRow[] = [];
    for (const pid of programIds) {
      const lpp = fullLpps.find((l) => l.id === pid);
      if (!lpp) continue;
      const subs = lpp.subcategories ?? [];
      const applicants = rankRecords.filter((r) => r.programId === pid).length;
      const eligiblePool = Math.round(applicants * 0.75);
      for (const sub of subs) {
        const committed = Math.round(sub.approvedIntake * 0.08);
        const availableSeats = sub.approvedIntake - committed;
        rows.push({
          programId: pid,
          programName: lpp.name,
          categoryName: sub.category,
          subcategoryName: sub.name,
          approvedIntake: sub.approvedIntake,
          committed,
          availableSeats,
          applicants,
          eligiblePool,
          offersToRelease: availableSeats,
        });
      }
      // Fallback: if no subcategories defined, show one row per program
      if (subs.length === 0) {
        const availableSeats = lpp.totalSeats;
        const committed = Math.round(availableSeats * 0.08);
        rows.push({
          programId: pid,
          programName: lpp.name,
          categoryName: '—',
          subcategoryName: '—',
          approvedIntake: availableSeats,
          committed,
          availableSeats: availableSeats - committed,
          applicants,
          eligiblePool,
          offersToRelease: availableSeats - committed,
        });
      }
    }
    return rows;
  }, [programIds, fullLpps, rankRecords]);

  const [configRows, setConfigRows] = useState<OfferConfigRow[]>(defaultConfig);
  const [results, setResults] = useState<StudentOfferResult[] | null>(null);
  const [prevCycleOfferCount, setPrevCycleOfferCount] = useState<number | null>(null);

  function updateOffers(programId: string, subcategoryName: string, value: number) {
    setConfigRows((prev) =>
      prev.map((r) =>
        r.programId === programId && r.subcategoryName === subcategoryName
          ? { ...r, offersToRelease: Math.max(0, Math.min(value, r.eligiblePool)) }
          : r
      )
    );
  }

  function handleRelease() {
    const prevCount = hasPreviousCycle
      ? configRows.reduce((sum, r) => sum + Math.ceil(r.availableSeats * 0.9), 0)
      : null;
    setPrevCycleOfferCount(prevCount);

    // Build algo rows from reservation categories (for internal allocation algorithm)
    const algoRows: AlgoRow[] = [];
    for (const pid of programIds) {
      const lpp = fullLpps.find((l) => l.id === pid);
      if (!lpp) continue;
      for (const cat of RESERVATION_CATEGORIES) {
        algoRows.push({
          programId: pid,
          programName: lpp.name,
          category: cat,
          availableSeats: lpp.categoryWiseSeats[cat] ?? 0,
          offersToRelease: lpp.categoryWiseSeats[cat] ?? 0,
        });
      }
    }

    const offerResults = releaseOffers(algoRows, rankRecords, appMap);
    setResults(offerResults);

    const totalOffered = offerResults.filter((r) => r.awardedProgramId !== null).length;
    const totalWaitlisted = offerResults.filter((r) => r.awardedProgramId === null).length;
    try {
      sessionStorage.setItem(`cycle-${cycleId}-offers`, JSON.stringify({
        released: totalOffered, pending: totalWaitlisted, accepted: 0, withdrawn: 0,
      }));
    } catch { /* ignore */ }
  }

  // ── CSV download ─────────────────────────────────────────────────────────────

  function handleDownloadCSV() {
    const rows = configRows;
    const header = ['Program Plan', 'Category', 'Subcategory', 'Approved Intake', 'Committed', 'Available Seats', 'Applicants', 'Eligible Pool', 'Pending Acceptance', 'Withdrawn', 'Offers to Release', 'Waitlisted for Next Cycle'];
    const lines = [header.join(',')];
    for (const r of rows) {
      const pending = Math.round(r.offersToRelease * 0.3);
      const withdrawn = Math.round(r.offersToRelease * 0.05);
      const waitlisted = Math.max(0, r.eligiblePool - r.offersToRelease);
      lines.push([r.programName, r.categoryName, r.subcategoryName, r.approvedIntake, r.committed, r.availableSeats, r.applicants, r.eligiblePool, pending, withdrawn, r.offersToRelease, waitlisted].join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'offer-release.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (fullLpps.length === 0 && !isSingle) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', background: 'white', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
        <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>No program data available</div>
        <div style={{ fontSize: '13px' }}>Seat allocation data could not be loaded. Please go back and recreate the cycle.</div>
      </div>
    );
  }

  return (
    <div>
      {/* Config Table */}
      {!results && (
        <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
            Configure Offers per Program &amp; Category
          </div>

          {/* Definitions block — above table */}
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '12px', color: '#374151' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '4px 16px' }}>
              <b>Approved Intake</b>        <span>Total sanctioned seats for this subcategory</span>
              <b>Committed</b>              <span>Indicative — students who have paid the program fee (approx. 8%)</span>
              <b>Available Seats</b>        <span>Approved Intake minus Committed seats</span>
              <b>Applicants</b>             <span>Total ranked applicants for this program</span>
              <b>Eligible Pool</b>          <span>Indicative — applicants meeting minimum eligibility criteria (approx. 75%)</span>
              <b>Pending Acceptance</b>     <span>Indicative — offers awaiting confirmation (approx. 30% of Offers to Release)</span>
              <b>Withdrawn</b>              <span>Indicative — applicants who have exited the process (approx. 5% of Offers to Release)</span>
              <b>Waitlisted for Next Cycle</b><span>Eligible Pool minus Offers to Release — auto-calculated</span>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', minWidth: '130px' }}>Program Plan</th>
                  <th style={{ textAlign: 'left', minWidth: '120px' }}>Category</th>
                  <th style={{ textAlign: 'left', minWidth: '140px' }}>Subcategory</th>
                  <th style={{ textAlign: 'center' }}>Approved Intake</th>
                  <th style={{ textAlign: 'center' }}>Committed (Fee Paid)</th>
                  <th style={{ textAlign: 'center' }}>Available Seats</th>
                  <th style={{ textAlign: 'center' }}>Applicants</th>
                  <th style={{ textAlign: 'center' }}>Eligible Pool</th>
                  <th style={{ textAlign: 'center' }}>Pending Acceptance</th>
                  <th style={{ textAlign: 'center' }}>Withdrawn</th>
                  <th style={{ textAlign: 'center', minWidth: '120px' }}>Offers to Release</th>
                  <th style={{ textAlign: 'center', minWidth: '130px' }}>Waitlisted for Next Cycle</th>
                </tr>
              </thead>
              <tbody>
                {configRows.map((row, i) => {
                  const prevRow = configRows[i - 1];
                  const isNewProgram = !prevRow || prevRow.programId !== row.programId;
                  const isNewCategory = !prevRow || prevRow.programId !== row.programId || prevRow.categoryName !== row.categoryName;
                  const pending   = Math.round(row.offersToRelease * 0.3);
                  const withdrawn = Math.round(row.offersToRelease * 0.05);
                  const waitlisted = Math.max(0, row.eligiblePool - row.offersToRelease);
                  return (
                    <tr
                      key={`${row.programId}-${row.subcategoryName}`}
                      style={{ borderTop: isNewProgram && i > 0 ? '2px solid var(--color-border)' : undefined }}
                    >
                      <td style={{ fontWeight: isNewProgram ? 700 : 400, color: isNewProgram ? 'var(--color-primary)' : 'transparent', fontSize: '13px' }}>
                        {isNewProgram ? row.programName : ''}
                      </td>
                      <td style={{ color: isNewCategory ? 'var(--color-text)' : 'transparent', fontWeight: 500 }}>
                        {isNewCategory ? row.categoryName : ''}
                      </td>
                      <td style={{ color: 'var(--color-text)' }}>{row.subcategoryName}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{row.approvedIntake}</td>
                      <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>{row.committed}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{row.availableSeats}</td>
                      <td style={{ textAlign: 'center' }}>{row.applicants}</td>
                      <td style={{ textAlign: 'center' }}>{row.eligiblePool}</td>
                      <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>{pending}</td>
                      <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>{withdrawn}</td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="number"
                          className="form-input"
                          style={{ width: '80px', textAlign: 'center', padding: '4px 8px', fontSize: '13px' }}
                          value={row.offersToRelease}
                          min={0}
                          max={row.eligiblePool}
                          onChange={(e) => updateOffers(row.programId, row.subcategoryName, parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: waitlisted > 0 ? '#b45309' : 'var(--color-text-muted)' }}>
                        {waitlisted}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button className="btn-primary" onClick={handleRelease} style={{ padding: '10px 28px', fontSize: '14px' }}>
              Release Offers
            </button>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Total: {configRows.reduce((s, r) => s + r.offersToRelease, 0)} offers across {programIds.length} program{programIds.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            <SummaryCard label="Prev. Cycle Offers" value={prevCycleOfferCount !== null ? String(prevCycleOfferCount) : '–'} color="var(--color-text-muted)" />
            <SummaryCard label="Curr. Cycle Offers" value={String(results.filter((r) => r.awardedProgramId !== null).length)} color="#276749" />
            <SummaryCard label="Waitlisted"         value={String(results.filter((r) => r.awardedProgramId === null).length)} color="#b45309" />
            <SummaryCard label="Programs"           value={String(programIds.length)} />
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '24px' }}>
            <button className="btn-secondary" style={{ fontSize: '13px' }} onClick={() => setResults(null)}>Reconfigure</button>
            <button className="btn-secondary" style={{ fontSize: '13px' }} onClick={handleDownloadCSV}>↓ Download CSV</button>
            {onProceed && (
              <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={onProceed}>Proceed to Approval →</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '14px 18px' }}>
      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: 700, color: color ?? 'var(--color-text)' }}>{value}</div>
    </div>
  );
}
