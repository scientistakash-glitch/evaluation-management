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
const PAGE_SIZE = 15;

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

export default function BulkOfferRelease({ cycleId, strategy, fullLpps, rankRecords, applications, studentRankMap, uniqueProgramIds, lppMap, appMap }: Props) {
  const isSingle = strategy === 'single';
  // After per-program generation, uniqueProgramIds always has actual program IDs
  const programIds = uniqueProgramIds.length > 0 ? uniqueProgramIds : (isSingle ? ['all'] : []);

  // Max preferences across all students (for result table columns)
  const maxPrefs = useMemo(() => {
    let max = 1;
    for (const app of applications) {
      const n = app.lppPreferences?.length ?? 1;
      if (n > max) max = n;
    }
    return max;
  }, [applications]);

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
  const [resultPage, setResultPage] = useState(1);
  const [resultCategoryFilter, setResultCategoryFilter] = useState('All');

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
    const offerResults = releaseOffers(configRows, rankRecords, applications, appMap);
    setResults(offerResults);
    setResultPage(1);

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

  // ── Filtered & paginated results ─────────────────────────────────────────────

  const filteredResults = results
    ? results.filter((r) => resultCategoryFilter === 'All' || r.category === resultCategoryFilter)
    : [];
  const totalPages = Math.max(1, Math.ceil(filteredResults.length / PAGE_SIZE));
  const pageResults = filteredResults.slice((resultPage - 1) * PAGE_SIZE, resultPage * PAGE_SIZE);

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Configure Offers per Program &amp; Category
            </div>
            <button
              onClick={resetDefaults}
              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Reset to Defaults
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Program</th>
                  <th>Category</th>
                  <th>Available Seats</th>
                  <th>Offers to Release</th>
                </tr>
              </thead>
              <tbody>
                {configRows.map((row, i) => {
                  const prevRow = configRows[i - 1];
                  const isNewProgram = !prevRow || prevRow.programId !== row.programId;
                  return (
                    <tr key={`${row.programId}-${row.category}`} style={{ background: isNewProgram && i > 0 ? 'var(--color-bg)' : undefined }}>
                      <td style={{ fontWeight: isNewProgram ? 700 : 400, color: isNewProgram ? 'var(--color-primary)' : 'var(--color-text-muted)', fontSize: isNewProgram ? '13px' : '12px' }}>
                        {isNewProgram ? row.programName : ''}
                      </td>
                      <td><span className={`badge ${CATEGORY_COLORS[row.category] ?? 'badge-default'}`} style={{ fontSize: '11px' }}>{row.category}</span></td>
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
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <SummaryCard label="Offers Released" value={String(results.filter((r) => r.awardedProgramId !== null).length)} color="#276749" />
            <SummaryCard label="Waitlisted" value={String(results.filter((r) => r.awardedProgramId === null).length)} color="#b45309" />
            <SummaryCard label="Total Students" value={String(results.length)} />
            <SummaryCard label="Programs" value={String(programIds.length)} />
          </div>

          {/* Filters + actions */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
            <select
              className="form-input"
              style={{ width: 'auto', fontSize: '13px' }}
              value={resultCategoryFilter}
              onChange={(e) => { setResultCategoryFilter(e.target.value); setResultPage(1); }}
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <span style={{ flex: 1 }} />
            <button className="btn-secondary" style={{ fontSize: '13px' }} onClick={() => { setResults(null); }}>
              Reconfigure
            </button>
            <button className="btn-secondary" style={{ fontSize: '13px' }} onClick={handleDownloadCSV}>
              ↓ Download CSV
            </button>
          </div>

          {/* Result table — preference-centric */}
          <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ minWidth: `${500 + maxPrefs * 220}px`, fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>App ID</th>
                    <th>Student Name</th>
                    <th>Category</th>
                    <th>Score</th>
                    {Array.from({ length: maxPrefs }, (_, i) => (
                      <React.Fragment key={i}>
                        <th style={{ textAlign: 'center' }}>Pref {i + 1}</th>
                        <th style={{ textAlign: 'center' }}>Pref {i + 1} Status</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.length === 0 ? (
                    <tr><td colSpan={5 + maxPrefs * 2} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '32px' }}>No results</td></tr>
                  ) : filteredResults.slice(0, 10).map((r, idx) => {
                    const app = appMap.get(r.applicationId);
                    const prefs = app?.lppPreferences ?? (app ? [{ lppId: app.lppPreference, preferenceOrder: 1 }] : []);
                    const sortedPrefs = [...prefs].sort((a, b) => a.preferenceOrder - b.preferenceOrder);
                    // preferenceOrder of the awarded program (null if not offered)
                    const offeredPrefOrder = r.awardedProgramId
                      ? (sortedPrefs.find((p) => p.lppId === r.awardedProgramId)?.preferenceOrder ?? null)
                      : null;
                    return (
                      <tr key={r.applicationId}>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>{idx + 1}</td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>{r.applicationId}</td>
                        <td style={{ fontWeight: 600 }}>{r.studentName}</td>
                        <td><span className={`badge ${CATEGORY_COLORS[r.category] ?? 'badge-default'}`} style={{ fontSize: '11px' }}>{r.category}</span></td>
                        <td><strong>{r.compositeScore.toFixed(2)}</strong></td>
                        {Array.from({ length: maxPrefs }, (_, i) => {
                          const pref = sortedPrefs[i];
                          if (!pref) return <React.Fragment key={i}><td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>—</td><td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>—</td></React.Fragment>;
                          const progName = (lppMap.get(pref.lppId) ?? pref.lppId).replace('B.Tech ', '');

                          let statusEl: React.ReactNode;
                          if (pref.lppId === r.awardedProgramId) {
                            // This preference was awarded
                            statusEl = <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, background: '#f0fdf4', color: '#166534', border: '1px solid #86efac' }}>Offered</span>;
                          } else if (offeredPrefOrder !== null && pref.preferenceOrder > offeredPrefOrder) {
                            // Lower priority than the awarded preference → not considered
                            statusEl = <span style={{ color: 'var(--color-text-muted)', fontSize: '11px', fontStyle: 'italic' }}>Not Considered</span>;
                          } else {
                            // Higher priority than awarded (WL) or not offered anywhere (WL)
                            const pr = r.programResults[pref.lppId];
                            if (!pr || pr.status === 'None') {
                              statusEl = <span style={{ color: 'var(--color-text-muted)' }}>—</span>;
                            } else {
                              statusEl = <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d' }}>WL #{pr.waitlistNumber}</span>;
                            }
                          }
                          return (
                            <React.Fragment key={i}>
                              <td style={{ textAlign: 'center', fontWeight: 600 }}>{progName}</td>
                              <td style={{ textAlign: 'center' }}>{statusEl}</td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sample note */}
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '12px 0' }}>
            Showing top 10 of {filteredResults.length} students. Download CSV for complete data.
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
