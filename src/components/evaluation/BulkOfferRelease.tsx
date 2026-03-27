'use client';

import React, { useState, useMemo } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface FullLPP { id: string; name: string; totalSeats: number; categoryWiseSeats: Record<string, number>; }

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

interface OfferConfigRow {
  programId: string;
  programName: string;
  category: string;
  availableSeats: number;
  offersToRelease: number;
}

type OfferStatus = 'Offered' | 'Waitlisted' | 'NotConsidered' | 'None';

interface ProgramOfferResult {
  status: OfferStatus;
  waitlistNumber?: number;
  categoryRank: number;
}

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

const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS'];

const CATEGORY_COLORS: Record<string, string> = {
  General: 'badge-default', OBC: 'badge-warning', SC: 'badge-success', ST: 'badge-gray', EWS: 'badge-maroon',
};

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
  configRows: OfferConfigRow[],
  rankRecords: RankRecord[],
  applications: Application[],
  appMap: Map<string, Application>,
): StudentOfferResult[] {
  // Build remaining seats per (programId::category)
  const remaining = new Map<string, number>();
  for (const row of configRows) {
    remaining.set(`${row.programId}::${row.category}`, row.offersToRelease);
  }

  // Build ranked list per (programId::category) for WL calculation later
  const rankedLists = new Map<string, RankRecord[]>();
  for (const r of rankRecords) {
    const key = `${r.programId}::${r.category}`;
    if (!rankedLists.has(key)) rankedLists.set(key, []);
    rankedLists.get(key)!.push(r);
  }
  for (const list of Array.from(rankedLists.values())) {
    list.sort((a, b) => a.categoryRank - b.categoryRank);
  }

  // Collect all unique students and sort by compositeScore DESC (globalRank ASC as tiebreak)
  const allStudentIds = Array.from(new Set(rankRecords.map((r) => r.applicationId)));
  allStudentIds.sort((a, b) => {
    const rA = rankRecords.find((r) => r.applicationId === a);
    const rB = rankRecords.find((r) => r.applicationId === b);
    if ((rB?.compositeScore ?? 0) !== (rA?.compositeScore ?? 0))
      return (rB?.compositeScore ?? 0) - (rA?.compositeScore ?? 0);
    return (rA?.globalRank ?? 0) - (rB?.globalRank ?? 0);
  });

  // Preference-sequential merit-order allocation:
  // For each student (best score first), try preferences in order and assign to first available seat
  const awardedProgram = new Map<string, string>();    // appId -> programId
  const awardedPrefOrder = new Map<string, number>();  // appId -> preferenceOrder

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

  // Build results
  const programIds = Array.from(new Set(rankRecords.map((r) => r.programId)));

  const results: StudentOfferResult[] = [];
  for (const appId of allStudentIds) {
    const app = appMap.get(appId);
    const offeredPid = awardedProgram.get(appId) ?? null;
    const offeredPref = awardedPrefOrder.get(appId) ?? null;

    const programResults: Record<string, ProgramOfferResult> = {};

    for (const pid of programIds) {
      const rec = rankRecords.find((r) => r.applicationId === appId && r.programId === pid);
      if (!rec) {
        programResults[pid] = { status: 'None', categoryRank: 0 };
        continue;
      }

      if (pid === offeredPid) {
        programResults[pid] = { status: 'Offered', categoryRank: rec.categoryRank };
      } else {
        // WL position = count of students in same (program, category) who are NOT offered
        // this program and have a better or equal categoryRank
        const key = `${pid}::${rec.category}`;
        const list = rankedLists.get(key) ?? [];
        let wlNum = 0;
        for (const entry of list) {
          if (awardedProgram.get(entry.applicationId) === pid) continue; // offered here → skip
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

export default function BulkOfferRelease({ cycleId, strategy, fullLpps, rankRecords, applications, studentRankMap, uniqueProgramIds, lppMap, appMap, hasPreviousCycle, onProceed }: Props) {
  const isSingle = strategy === 'single';
  // After per-program generation, uniqueProgramIds always has actual program IDs
  const programIds = uniqueProgramIds.length > 0 ? uniqueProgramIds : (isSingle ? ['all'] : []);

  // Build initial config rows
  const defaultConfig = useMemo(() => {
    const rows: OfferConfigRow[] = [];
    for (const pid of programIds) {
      const lpp = fullLpps.find((l) => l.id === pid);
      for (const cat of CATEGORIES) {
        const seats = pid === 'all'
          ? fullLpps.reduce((sum, l) => sum + (l.categoryWiseSeats[cat] ?? 0), 0)
          : (lpp?.categoryWiseSeats[cat] ?? 0);
        rows.push({
          programId: pid,
          programName: pid === 'all' ? 'All Programs' : (lppMap.get(pid) ?? pid),
          category: cat,
          availableSeats: seats,
          offersToRelease: seats,
        });
      }
    }
    return rows;
  }, [programIds, fullLpps, lppMap]);

  const [configRows, setConfigRows] = useState<OfferConfigRow[]>(defaultConfig);
  const [results, setResults] = useState<StudentOfferResult[] | null>(null);
  const [prevCycleOfferCount, setPrevCycleOfferCount] = useState<number | null>(null);

  function updateOffers(programId: string, category: string, value: number) {
    setConfigRows((prev) =>
      prev.map((r) =>
        r.programId === programId && r.category === category
          ? { ...r, offersToRelease: Math.max(0, Math.min(value, r.availableSeats)) }
          : r
      )
    );
  }

  function resetDefaults() {
    setConfigRows(defaultConfig);
  }

  function handleRelease() {
    const prevCount = hasPreviousCycle
      ? configRows.reduce((sum, r) => sum + Math.ceil(r.availableSeats * 0.9), 0)
      : null;
    setPrevCycleOfferCount(prevCount);
    const offerResults = releaseOffers(configRows, rankRecords, applications, appMap);
    setResults(offerResults);

    // Persist to sessionStorage for home page
    const totalOffered = offerResults.filter((r) => r.awardedProgramId !== null).length;
    const totalWaitlisted = offerResults.filter((r) => r.awardedProgramId === null).length;
    try {
      sessionStorage.setItem(`cycle-${cycleId}-offers`, JSON.stringify({
        released: totalOffered,
        pending: totalWaitlisted,
        accepted: 0,
        withdrawn: 0,
      }));
    } catch { /* ignore */ }
  }

  // ── CSV download ─────────────────────────────────────────────────────────────

  function handleDownloadCSV() {
    if (!results) return;
    const progHeaders = programIds.map((p) => p === 'all' ? 'Status' : (lppMap.get(p) ?? p));
    const extraHeaders = programIds[0] !== 'all' ? ['Program Offered', 'Preference #'] : [];
    const header = ['Student Name', 'Roll No', 'Category', 'Score', ...extraHeaders, ...progHeaders];
    const lines = [header.join(',')];
    for (const r of results) {
      const cells = programIds.map((pid) => {
        const pr = r.programResults[pid];
        if (!pr || pr.status === 'None') return '—';
        if (pr.status === 'Offered') return 'Offered';
        return `WL #${pr.waitlistNumber}`;
      });
      const extraCells = programIds[0] !== 'all' ? [
        r.awardedProgramId ? `"${lppMap.get(r.awardedProgramId) ?? r.awardedProgramId}"` : 'Waitlisted',
        r.awardedPreferenceOrder ? `P${r.awardedPreferenceOrder}` : '—',
      ] : [];
      lines.push([
        `"${r.studentName}"`,
        r.rollNumber,
        r.category,
        r.compositeScore.toFixed(2),
        ...extraCells,
        ...cells,
      ].join(','));
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
              <b>Previous Cycle Last Rank</b><span>Category rank of the last student offered a seat in this program &amp; category in the previous cycle</span>
              <b>Current Cycle Last Rank</b><span>Updates live — rank of the last student to receive an offer at the current Offers to Release number</span>
              <b>Waitlisted</b><span>Applicants ranked beyond the current offer cutoff</span>
              <b>Pending Acceptance</b><span>Indicative — offers awaiting confirmation (approx. 30%)</span>
              <b>Withdrawn</b><span>Indicative — students who have exited the process (approx. 5%)</span>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Program</th>
                  <th>Category</th>
                  <th>Applicants</th>
                  <th>Previous Cycle Last Rank</th>
                  <th>Current Cycle Last Rank</th>
                  <th>Avail. Seats</th>
                  <th>Offers to Release</th>
                  <th>Waitlisted</th>
                  <th>Pending Acceptance</th>
                  <th>Withdrawn</th>
                </tr>
              </thead>
              <tbody>
                {configRows.map((row, i) => {
                  const prevRow = configRows[i - 1];
                  const isNewProgram = !prevRow || prevRow.programId !== row.programId;
                  const applicants = rankRecords.filter((r) => r.programId === row.programId && r.category === row.category).length;
                  const prevLastRank = hasPreviousCycle ? Math.ceil(row.availableSeats * 0.9) : null;
                  const currList = rankRecords
                    .filter((r) => r.programId === row.programId && r.category === row.category)
                    .sort((a, b) => a.categoryRank - b.categoryRank);
                  const currLastRank = row.offersToRelease > 0 ? (currList[row.offersToRelease - 1]?.categoryRank ?? null) : null;
                  const waitlisted = Math.max(0, applicants - row.offersToRelease);
                  const pending = Math.round(row.offersToRelease * 0.3);
                  const withdrawn = Math.round(row.offersToRelease * 0.05);
                  return (
                    <tr key={`${row.programId}-${row.category}`} style={{ background: isNewProgram && i > 0 ? 'var(--color-bg)' : undefined }}>
                      <td style={{ fontWeight: isNewProgram ? 700 : 400, color: isNewProgram ? 'var(--color-primary)' : 'var(--color-text-muted)', fontSize: isNewProgram ? '13px' : '12px' }}>
                        {isNewProgram ? row.programName : ''}
                      </td>
                      <td><span className={`badge ${CATEGORY_COLORS[row.category] ?? 'badge-default'}`} style={{ fontSize: '11px' }}>{row.category}</span></td>
                      <td style={{ textAlign: 'center' }}>{applicants}</td>
                      <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>{prevLastRank ?? '–'}</td>
                      <td style={{ textAlign: 'center', fontWeight: currLastRank !== null ? 600 : 400, color: currLastRank !== null ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>{currLastRank ?? '–'}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{row.availableSeats}</td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="number"
                          className="form-input"
                          style={{ width: '80px', textAlign: 'center', padding: '4px 8px', fontSize: '13px' }}
                          value={row.offersToRelease}
                          min={0}
                          max={row.availableSeats}
                          onChange={(e) => updateOffers(row.programId, row.category, parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td style={{ textAlign: 'center', color: waitlisted > 0 ? '#b45309' : 'var(--color-text-muted)' }}>{waitlisted}</td>
                      <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>{pending}</td>
                      <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>{withdrawn}</td>
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
          {/* 4 summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            <SummaryCard label="Prev. Cycle Offers"  value={prevCycleOfferCount !== null ? String(prevCycleOfferCount) : '–'} color="var(--color-text-muted)" />
            <SummaryCard label="Curr. Cycle Offers"  value={String(results.filter((r) => r.awardedProgramId !== null).length)} color="#276749" />
            <SummaryCard label="Waitlisted"          value={String(results.filter((r) => r.awardedProgramId === null).length)} color="#b45309" />
            <SummaryCard label="Programs"            value={String(programIds.length)} />
          </div>

          {/* Action row */}
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
