'use client';

import React, { useState, useMemo, useEffect } from 'react';
import ProcessingOverlay from '@/components/common/ProcessingOverlay';

// ── Types ──────────────────────────────────────────────────────────────────────

interface LPPSubcategory { name: string; category: string; approvedIntake: number; }
interface FullLPP {
  id: string; name: string; totalSeats: number; fee: number;
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

interface OfferConfigRow {
  programId: string;
  programName: string;
  categoryName: string;
  subcategoryName: string;
  approvedIntake: number;
  committed: number;
  availableSeats: number;
  applicants: number;
  eligiblePool: number;
  offersToRelease: number;
}

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
  acceptanceStatus?: 'Pending' | 'Accepted' | 'Withdrawn';
  cycleAllotmentType?: 'Fresh' | 'Upgraded' | 'StatusQuo' | 'Waitlisted';
  upgradedFromProgramId?: string;
  upgradedFromCycleId?: string;
  previousProgramFee?: number;
  newProgramFee?: number;
  feeDelta?: number;
}

interface PrevAcceptedDetail {
  applicationId: string;
  awardedProgramId: string;
  awardedPreferenceOrder: number;
}

interface PrevCycleData {
  prevCycleId: string | null;
  acceptedIds: string[];
  pendingIds: string[];
  withdrawnIds: string[];
  waitlistedIds: string[];
  acceptedDetails: PrevAcceptedDetail[];
  totals: { accepted: number; pending: number; withdrawn: number; waitlisted: number; outOfPool: number };
}

interface UpgradePreviewRow {
  applicationId: string;
  studentName: string;
  category: string;
  currentProgramId: string;
  currentProgramName: string;
  currentPrefOrder: number;
  bestHigherPrefProgramId: string | null;
  bestHigherPrefProgramName: string | null;
  canUpgrade: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const RESERVATION_CATEGORIES = ['General', 'OBC', 'SC/ST', 'NRI-American', 'NRI-Arab'];

function ordinal(n: number) {
  return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
}

function getRemark(r: StudentOfferResult, prevWaitlistedIds: string[], hasPrev: boolean): string {
  if (r.awardedProgramId === null) return '—';
  if (r.cycleAllotmentType === 'Upgraded') return '🔼 Upgraded';
  if (r.cycleAllotmentType === 'StatusQuo') return '═ Status Quo';
  if (r.cycleAllotmentType === 'Fresh' || !hasPrev) {
    return prevWaitlistedIds.includes(r.applicationId) ? '★ Waitlist Improvement' : '✦ Fresh Allotment';
  }
  return '✦ Fresh Allotment';
}

// ── Category helpers ─────────────────────────────────────────────────────────

function getCategoryInfo(raw: string): { category: string; subcategory: string } {
  if (raw === 'NRI-American') return { category: 'NRI', subcategory: 'American' };
  if (raw === 'NRI-Arab')     return { category: 'NRI', subcategory: 'Arab' };
  if (raw === 'General' || raw === 'OBC' || raw === 'SC/ST')
    return { category: 'Resident Indian', subcategory: raw };
  return { category: raw, subcategory: raw };
}

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
  prevCycleData: PrevCycleData | null,
  prevCycleId: string | null,
  fullLpps: FullLPP[],
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

  const results: StudentOfferResult[] = [];
  const awardedProgram = new Map<string, string | null>();

  // Pass 1: Upgrade pass for C1 accepted students
  if (prevCycleData && prevCycleData.acceptedDetails.length > 0) {
    const acceptedDetailsSorted = [...prevCycleData.acceptedDetails].sort((a, b) => {
      const score1 = rankRecords.find((r) => r.applicationId === a.applicationId)?.compositeScore ?? 0;
      const score2 = rankRecords.find((r) => r.applicationId === b.applicationId)?.compositeScore ?? 0;
      return score2 - score1;
    });

    for (const detail of acceptedDetailsSorted) {
      const app = appMap.get(detail.applicationId);
      if (!app) continue;
      const prefs = (app.lppPreferences ?? [{ lppId: app.lppPreference, preferenceOrder: 1 }])
        .slice().sort((a, b) => a.preferenceOrder - b.preferenceOrder);
      const higherPrefs = prefs.filter((p) => p.preferenceOrder < detail.awardedPreferenceOrder);

      let upgraded = false;
      for (const pref of higherPrefs) {
        const key = `${pref.lppId}::${app.category}`;
        const seats = remaining.get(key) ?? 0;
        if (seats > 0) {
          remaining.set(key, seats - 1);
          const oldKey = `${detail.awardedProgramId}::${app.category}`;
          remaining.set(oldKey, (remaining.get(oldKey) ?? 0) + 1);
          awardedProgram.set(detail.applicationId, pref.lppId);
          const prevFee = fullLpps.find((l) => l.id === detail.awardedProgramId)?.fee ?? 0;
          const newFee  = fullLpps.find((l) => l.id === pref.lppId)?.fee ?? 0;
          results.push({
            applicationId: detail.applicationId,
            studentName: app.studentName,
            rollNumber: app.rollNumber,
            category: app.category,
            compositeScore: rankRecords.find((r) => r.applicationId === detail.applicationId)?.compositeScore ?? 0,
            programResults: {},
            awardedProgramId: pref.lppId,
            awardedPreferenceOrder: pref.preferenceOrder,
            acceptanceStatus: 'Pending',
            cycleAllotmentType: 'Upgraded',
            upgradedFromProgramId: detail.awardedProgramId,
            upgradedFromCycleId: prevCycleId ?? undefined,
            previousProgramFee: prevFee,
            newProgramFee: newFee,
            feeDelta: newFee - prevFee,
          });
          upgraded = true;
          break;
        }
      }

      if (!upgraded) {
        const oldKey = `${detail.awardedProgramId}::${app.category}`;
        remaining.set(oldKey, Math.max(0, (remaining.get(oldKey) ?? 0) - 1));
        awardedProgram.set(detail.applicationId, detail.awardedProgramId);
        results.push({
          applicationId: detail.applicationId,
          studentName: app.studentName,
          rollNumber: app.rollNumber,
          category: app.category,
          compositeScore: rankRecords.find((r) => r.applicationId === detail.applicationId)?.compositeScore ?? 0,
          programResults: {},
          awardedProgramId: detail.awardedProgramId,
          awardedPreferenceOrder: detail.awardedPreferenceOrder,
          acceptanceStatus: 'Pending',
          cycleAllotmentType: 'StatusQuo',
        });
      }
    }
  }

  // Pass 2: Fresh allocation for new/waitlisted students
  const allStudentIds = Array.from(new Set(rankRecords.map((r) => r.applicationId)))
    .filter((id) => !awardedProgram.has(id));

  allStudentIds.sort((a, b) => {
    const rA = rankRecords.find((r) => r.applicationId === a);
    const rB = rankRecords.find((r) => r.applicationId === b);
    if ((rB?.compositeScore ?? 0) !== (rA?.compositeScore ?? 0))
      return (rB?.compositeScore ?? 0) - (rA?.compositeScore ?? 0);
    return (rA?.globalRank ?? 0) - (rB?.globalRank ?? 0);
  });

  const freshAwardedProgram = new Map<string, string>();
  const freshAwardedPrefOrder = new Map<string, number>();

  for (const appId of allStudentIds) {
    const app = appMap.get(appId);
    if (!app) continue;
    const prefs = (app.lppPreferences ?? [{ lppId: app.lppPreference, preferenceOrder: 1 }])
      .slice().sort((a, b) => a.preferenceOrder - b.preferenceOrder);
    for (const pref of prefs) {
      const key = `${pref.lppId}::${app.category}`;
      const seats = remaining.get(key) ?? 0;
      if (seats > 0) {
        freshAwardedProgram.set(appId, pref.lppId);
        freshAwardedPrefOrder.set(appId, pref.preferenceOrder);
        remaining.set(key, seats - 1);
        break;
      }
    }
  }

  const programIds = Array.from(new Set(rankRecords.map((r) => r.programId)));
  for (const appId of allStudentIds) {
    const app = appMap.get(appId);
    const offeredPid = freshAwardedProgram.get(appId) ?? null;
    const offeredPref = freshAwardedPrefOrder.get(appId) ?? null;
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
          if (freshAwardedProgram.get(entry.applicationId) === pid) continue;
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
      acceptanceStatus: 'Pending',
      cycleAllotmentType: offeredPid !== null ? 'Fresh' : 'Waitlisted',
    });
  }

  for (const res of results) {
    if (res.cycleAllotmentType !== 'Upgraded' && res.cycleAllotmentType !== 'StatusQuo') continue;
    if (Object.keys(res.programResults).length > 0) continue;
    const programResults: Record<string, ProgramOfferResult> = {};
    for (const pid of programIds) {
      const rec = rankRecords.find((r) => r.applicationId === res.applicationId && r.programId === pid);
      if (!rec) { programResults[pid] = { status: 'None', categoryRank: 0 }; continue; }
      programResults[pid] = pid === res.awardedProgramId
        ? { status: 'Offered', categoryRank: rec.categoryRank }
        : { status: 'Waitlisted', waitlistNumber: 0, categoryRank: rec.categoryRank };
    }
    res.programResults = programResults;
  }

  results.sort((a, b) => b.compositeScore - a.compositeScore);
  return results;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function BulkOfferRelease({
  cycleId, strategy, fullLpps, rankRecords,
  uniqueProgramIds, lppMap, appMap, hasPreviousCycle, onProceed,
}: Props) {
  const isSingle = strategy === 'single';
  const programIds = uniqueProgramIds.length > 0 ? uniqueProgramIds : (isSingle ? ['all'] : []);

  const defaultConfig = useMemo<OfferConfigRow[]>(() => {
    const rows: OfferConfigRow[] = [];
    for (const pid of programIds) {
      const lpp = fullLpps.find((l) => l.id === pid);
      if (!lpp) continue;
      const subs = lpp.subcategories ?? [];
      const applicants = rankRecords.filter((r) => r.programId === pid).length;
      const eligiblePool = Math.round(applicants * 0.75);
      for (const sub of subs) {
        rows.push({
          programId: pid, programName: lpp.name,
          categoryName: sub.category, subcategoryName: sub.name,
          approvedIntake: sub.approvedIntake, committed: 0, availableSeats: sub.approvedIntake,
          applicants, eligiblePool, offersToRelease: sub.approvedIntake,
        });
      }
      if (subs.length === 0) {
        rows.push({
          programId: pid, programName: lpp.name,
          categoryName: '—', subcategoryName: '—',
          approvedIntake: lpp.totalSeats, committed: 0, availableSeats: lpp.totalSeats,
          applicants, eligiblePool, offersToRelease: lpp.totalSeats,
        });
      }
    }
    return rows;
  }, [programIds, fullLpps, rankRecords]);

  const [configRows, setConfigRows] = useState<OfferConfigRow[]>(defaultConfig);
  const [results, setResults] = useState<StudentOfferResult[] | null>(null);
  const [releasing, setReleasing] = useState(false);
  const [prevCycleData, setPrevCycleData] = useState<PrevCycleData | null>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [waitlistedExpanded, setWaitlistedExpanded] = useState(false);

  // Load previous cycle data
  useEffect(() => {
    if (!hasPreviousCycle) return;
    fetch(`/api/cycles/${cycleId}/previous-offer-results`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: PrevCycleData | null) => { if (data) setPrevCycleData(data); })
      .catch(() => {});
  }, [cycleId, hasPreviousCycle]);

  // When prevCycleData loads, update committed/available from real C1 data
  useEffect(() => {
    if (!hasPreviousCycle || !prevCycleData) return;
    setConfigRows((prev) =>
      prev.map((row) => {
        const c1Stay = prevCycleData.acceptedDetails.filter((d) => {
          const app = appMap.get(d.applicationId);
          return d.awardedProgramId === row.programId && app?.category === row.subcategoryName;
        }).length;
        const committed = c1Stay;
        const availableSeats = row.approvedIntake - committed;
        return { ...row, committed, availableSeats };
      })
    );
  }, [prevCycleData, hasPreviousCycle, appMap]);

  // Upgrade preview: read-only list of who can be upgraded
  const upgradePreview = useMemo<UpgradePreviewRow[]>(() => {
    if (!prevCycleData || prevCycleData.acceptedDetails.length === 0) return [];
    return prevCycleData.acceptedDetails.map((detail) => {
      const app = appMap.get(detail.applicationId);
      const prefs = (app?.lppPreferences ?? (app ? [{ lppId: app.lppPreference, preferenceOrder: 1 }] : []))
        .slice().sort((a, b) => a.preferenceOrder - b.preferenceOrder);
      const higherPrefs = prefs.filter((p) => p.preferenceOrder < detail.awardedPreferenceOrder);
      const currentProgramName = lppMap.get(detail.awardedProgramId) ?? detail.awardedProgramId;
      const bestHigher = higherPrefs[0] ?? null;
      const bestHigherProgramId = bestHigher?.lppId ?? null;
      const bestHigherProgramName = bestHigherProgramId ? (lppMap.get(bestHigherProgramId) ?? bestHigherProgramId) : null;
      return {
        applicationId: detail.applicationId,
        studentName: app?.studentName ?? detail.applicationId,
        category: app?.category ?? '',
        currentProgramId: detail.awardedProgramId, currentProgramName,
        currentPrefOrder: detail.awardedPreferenceOrder,
        bestHigherPrefProgramId: bestHigherProgramId,
        bestHigherPrefProgramName: bestHigherProgramName,
        canUpgrade: higherPrefs.length > 0,
      };
    });
  }, [prevCycleData, appMap, lppMap]);

  // Dynamic "Eligible for Upgrade" simulation — reruns whenever offersToRelease changes
  const simulatedUpgrades = useMemo(() => {
    if (!hasPreviousCycle || !prevCycleData) return new Map<string, number>();

    // Build remaining from current configRows
    const remaining = new Map<string, number>();
    for (const row of configRows) {
      remaining.set(`${row.programId}::${row.subcategoryName}`, row.offersToRelease);
    }

    const sorted = [...prevCycleData.acceptedDetails].sort((a, b) => {
      const sa = rankRecords.find((r) => r.applicationId === a.applicationId)?.compositeScore ?? 0;
      const sb = rankRecords.find((r) => r.applicationId === b.applicationId)?.compositeScore ?? 0;
      return sb - sa;
    });

    const upgradedInto = new Map<string, number>();
    for (const detail of sorted) {
      const app = appMap.get(detail.applicationId);
      if (!app) continue;
      const prefs = (app.lppPreferences ?? [{ lppId: app.lppPreference, preferenceOrder: 1 }])
        .slice().sort((a, b) => a.preferenceOrder - b.preferenceOrder);
      const higherPrefs = prefs.filter((p) => p.preferenceOrder < detail.awardedPreferenceOrder);
      for (const pref of higherPrefs) {
        const key = `${pref.lppId}::${app.category}`;
        const seats = remaining.get(key) ?? 0;
        if (seats > 0) {
          remaining.set(key, seats - 1);
          const oldKey = `${detail.awardedProgramId}::${app.category}`;
          remaining.set(oldKey, (remaining.get(oldKey) ?? 0) + 1);
          upgradedInto.set(key, (upgradedInto.get(key) ?? 0) + 1);
          break;
        }
      }
    }
    return upgradedInto;
  }, [configRows, prevCycleData, appMap, rankRecords, hasPreviousCycle]);

  function updateOffers(programId: string, subcategoryName: string, value: number) {
    setConfigRows((prev) =>
      prev.map((r) =>
        r.programId === programId && r.subcategoryName === subcategoryName
          ? { ...r, offersToRelease: Math.max(0, Math.min(value, r.eligiblePool)) }
          : r
      )
    );
  }

  // Maps LPP subcategoryName to the application.category value used in rank records
  function subcategoryToAppCategory(sub: string): string {
    if (sub === 'American') return 'NRI-American';
    if (sub === 'Arab')     return 'NRI-Arab';
    return sub; // General, OBC, SC/ST are identical
  }

  async function handleRelease() {
    setReleasing(true);
    // Yield to React so the overlay renders before heavy computation
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      // Build algoRows from configRows so user-entered offersToRelease values are respected
      const algoRows: AlgoRow[] = configRows.map((row) => ({
        programId: row.programId,
        programName: row.programName,
        // subcategoryName ('American','Arab') must map to app.category ('NRI-American','NRI-Arab')
        category: subcategoryToAppCategory(row.subcategoryName),
        availableSeats: hasPreviousCycle ? row.availableSeats : row.approvedIntake,
        offersToRelease: row.offersToRelease,
      }));

      const offerResults = releaseOffers(algoRows, rankRecords, appMap, prevCycleData, prevCycleData?.prevCycleId ?? null, fullLpps);

      const totalOffered = offerResults.filter((r) => r.awardedProgramId !== null).length;
      const summary = { released: totalOffered, pending: totalOffered, accepted: 0, withdrawn: 0 };

      try {
        await fetch(`/api/cycles/${cycleId}/offer-release`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ configRows, summary, studentResults: offerResults }),
        });
      } catch { /* ignore */ }

      try {
        sessionStorage.setItem(`cycle-${cycleId}-offers`, JSON.stringify(summary));
        sessionStorage.setItem(`cycle-${cycleId}-configRows`, JSON.stringify(configRows));
      } catch { /* ignore */ }

      setResults(offerResults);
    } finally {
      setReleasing(false);
    }
  }

  function handleDownloadUpgradeCSV() {
    const candidates = upgradePreview.filter((r) => r.canUpgrade);
    const header = ['Student Name', 'Application ID', 'Category', 'C1 Program', 'C1 Preference Order', 'Upgrade To Program', 'Upgrade Preference Order'];
    const lines = [header.join(',')];
    for (const r of candidates) {
      lines.push([
        `"${r.studentName}"`, r.applicationId, r.category,
        `"${r.currentProgramName}"`, r.currentPrefOrder,
        `"${r.bestHigherPrefProgramName ?? '—'}"`,
        r.bestHigherPrefProgramId ? (upgradePreview.find((u) => u.applicationId === r.applicationId)?.currentPrefOrder ?? '') : '',
      ].join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'upgrade-candidates.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadResultsCSV() {
    if (!results) return;
    const waitlistedIds = prevCycleData?.waitlistedIds ?? [];
    const header = ['Student Name', 'Application ID', 'Category', 'Program Offered', 'Preference Order', 'Composite Score', 'Remarks'];
    const lines = [header.join(',')];
    for (const r of results) {
      const programName = r.awardedProgramId ? (lppMap.get(r.awardedProgramId) ?? r.awardedProgramId) : '—';
      const remark = getRemark(r, waitlistedIds, hasPreviousCycle ?? false);
      lines.push([
        `"${r.studentName}"`, r.applicationId, r.category,
        `"${programName}"`, r.awardedPreferenceOrder ?? '—', r.compositeScore,
        `"${remark}"`,
      ].join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'offer-results.csv'; a.click();
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

  const upgradedCount   = results?.filter((r) => r.cycleAllotmentType === 'Upgraded').length ?? 0;
  const freshCount      = results?.filter((r) => r.cycleAllotmentType === 'Fresh').length ?? 0;
  const statusQuoCount  = results?.filter((r) => r.cycleAllotmentType === 'StatusQuo').length ?? 0;
  const offeredResults  = results?.filter((r) => r.awardedProgramId !== null) ?? [];
  const waitlistedResults = results?.filter((r) => r.awardedProgramId === null) ?? [];

  const upgradeEligibleCount = upgradePreview.filter((r) => r.canUpgrade).length;

  if (releasing) {
    return (
      <ProcessingOverlay
        title="Releasing Offers"
        subtitle="Allocating seats based on merit, category quotas, and preferences."
        steps={[
          'Analysing seat availability',
          'Processing upgrades',
          'Allocating fresh offers',
          'Updating waitlist',
          'Saving results',
        ]}
      />
    );
  }

  return (
    <div>
      {/* ── Upgrade Preview Modal ───────────────────────────────────────────── */}
      {upgradeModalOpen && hasPreviousCycle && (
        <div className="modal-overlay" onClick={() => setUpgradeModalOpen(false)}>
          <div className="modal-box" style={{ maxWidth: '760px', width: '90vw' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 700 }}>
                Eligible for Upgrade — {upgradeEligibleCount} student{upgradeEligibleCount !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => setUpgradeModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--color-text-muted)', lineHeight: 1 }}
              >×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  Showing {Math.min(10, upgradeEligibleCount)} of {upgradeEligibleCount} eligible students
                </span>
                <button className="btn-secondary" style={{ fontSize: '12px', padding: '4px 12px' }} onClick={handleDownloadUpgradeCSV}>
                  ↓ Download CSV — All
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ fontSize: '12px', whiteSpace: 'nowrap', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Student Name</th>
                      <th style={{ textAlign: 'left' }}>Application ID</th>
                      <th style={{ textAlign: 'left' }}>Category</th>
                      <th style={{ textAlign: 'left' }}>C1 Program</th>
                      <th style={{ textAlign: 'left' }}>Upgrade To</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upgradePreview.filter((r) => r.canUpgrade).slice(0, 10).map((row) => (
                      <tr key={row.applicationId}>
                        <td style={{ fontWeight: 500 }}>{row.studentName}</td>
                        <td style={{ color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{row.applicationId}</td>
                        <td>{row.category}</td>
                        <td>
                          {row.currentProgramName}
                          <span style={{ marginLeft: '4px', fontSize: '11px', color: 'var(--color-text-muted)' }}>({ordinal(row.currentPrefOrder)} pref)</span>
                        </td>
                        <td style={{ color: '#15803d', fontWeight: 500 }}>
                          {row.bestHigherPrefProgramName ?? '—'}
                          {row.bestHigherPrefProgramId && (
                            <span style={{ marginLeft: '4px', fontSize: '11px', color: '#4ade80' }}>
                              ({ordinal(upgradePreview.find((u) => u.applicationId === row.applicationId)?.currentPrefOrder ? 1 : 1)} pref)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setUpgradeModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Previous Cycle Context Card ─────────────────────────────────────── */}
      {hasPreviousCycle && prevCycleData && !results && (
        <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
            Cycle Carry-Over Summary
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 14px' }}>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#15803d' }}>{prevCycleData.totals.accepted}</div>
              <div style={{ fontSize: '12px', color: '#166534', marginTop: '2px' }}>Accepted (paid)</div>
              <div style={{ fontSize: '11px', color: '#86efac', marginTop: '4px' }}>Eligible for upgrade or status quo</div>
            </div>
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 14px' }}>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#b45309' }}>{prevCycleData.totals.waitlisted}</div>
              <div style={{ fontSize: '12px', color: '#92400e', marginTop: '2px' }}>Waitlisted</div>
              <div style={{ fontSize: '11px', color: '#fcd34d', marginTop: '4px' }}>Re-entering fresh pool</div>
            </div>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 14px' }}>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#b91c1c' }}>{prevCycleData.totals.outOfPool}</div>
              <div style={{ fontSize: '12px', color: '#991b1b', marginTop: '2px' }}>Out of Pool</div>
              <div style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px' }}>{prevCycleData.totals.pending} pending · {prevCycleData.totals.withdrawn} withdrawn</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Config / Seat Matrix Table ──────────────────────────────────────── */}
      {!results && (
        <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
            {hasPreviousCycle ? 'Offer Configuration — Cycle 2+' : 'Configure Offers per Program & Category'}
          </div>

          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '12px', color: '#374151' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '4px 16px' }}>
              <b>Approved Intake</b>           <span>Total sanctioned seats for this subcategory</span>
              {hasPreviousCycle && <><b>Committed (Fee Paid)</b>    <span>C1 accepted students remaining in this program (StatusQuo)</span></>}
              {hasPreviousCycle && <><b>Available Seats</b>         <span>Approved Intake minus Committed seats</span></>}
              <b>Applicants</b>                 <span>Total applications for this program</span>
              <b>Eligible Pool</b>              <span>Applicants meeting minimum eligibility criteria</span>
              <b>Offers to Release</b>          <span>Number of offers to send out this cycle</span>
              {hasPreviousCycle && <><b>Eligible for Upgrade</b>    <span>C1 accepted students who can move to a higher preference — updates live as you change offers</span></>}
              <b>Waitlisted for Next Cycle</b>  <span>Eligible Pool minus Offers to Release</span>
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
                  {hasPreviousCycle && <th style={{ textAlign: 'center' }}>Committed</th>}
                  {hasPreviousCycle && <th style={{ textAlign: 'center' }}>Available Seats</th>}
                  <th style={{ textAlign: 'center' }}>Applicants</th>
                  <th style={{ textAlign: 'center' }}>Eligible Pool</th>
                  <th style={{ textAlign: 'center', minWidth: '120px' }}>Offers to Release</th>
                  {hasPreviousCycle && <th style={{ textAlign: 'center', minWidth: '140px' }}>Eligible for Upgrade</th>}
                  <th style={{ textAlign: 'center', minWidth: '130px' }}>Waitlisted for Next Cycle</th>
                </tr>
              </thead>
              <tbody>
                {configRows.map((row, i) => {
                  const prevRow = configRows[i - 1];
                  const isNewProgram = !prevRow || prevRow.programId !== row.programId;
                  const isNewCategory = !prevRow || prevRow.programId !== row.programId || prevRow.categoryName !== row.categoryName;
                  const waitlisted = Math.max(0, row.eligiblePool - row.offersToRelease);
                  const eligibleForUpgrade = hasPreviousCycle
                    ? (simulatedUpgrades.get(`${row.programId}::${row.subcategoryName}`) ?? 0)
                    : 0;

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
                      <td>{row.subcategoryName}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{row.approvedIntake}</td>
                      {hasPreviousCycle && <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>{row.committed}</td>}
                      {hasPreviousCycle && <td style={{ textAlign: 'center', fontWeight: 600 }}>{row.availableSeats}</td>}
                      <td style={{ textAlign: 'center' }}>{row.applicants}</td>
                      <td style={{ textAlign: 'center' }}>{row.eligiblePool}</td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="number" className="form-input"
                          style={{ width: '80px', textAlign: 'center', padding: '4px 8px', fontSize: '13px' }}
                          value={row.offersToRelease} min={0} max={row.eligiblePool}
                          onChange={(e) => updateOffers(row.programId, row.subcategoryName, parseInt(e.target.value) || 0)}
                        />
                      </td>
                      {hasPreviousCycle && (
                        <td style={{ textAlign: 'center', fontWeight: eligibleForUpgrade > 0 ? 600 : 400, color: eligibleForUpgrade > 0 ? '#15803d' : 'var(--color-text-muted)' }}>
                          {eligibleForUpgrade > 0 ? (
                            <button
                              onClick={() => setUpgradeModalOpen(true)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, color: '#15803d', fontSize: '12px', textDecoration: 'underline', padding: 0 }}
                            >
                              {eligibleForUpgrade}
                            </button>
                          ) : '—'}
                        </td>
                      )}
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
            <button className="btn-primary" onClick={handleRelease} disabled={releasing} style={{ padding: '10px 28px', fontSize: '14px' }}>
              Release Offers
            </button>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Total: {configRows.reduce((s, r) => s + r.offersToRelease, 0)} offers across {programIds.length} program{programIds.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────────────────── */}
      {results && (
        <>
          {/* 3-section summary */}
          {hasPreviousCycle ? (
            <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                Cycle Offer Release Summary
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[
                  { icon: '🔼', label: 'Upgrades', count: upgradedCount, desc: 'Cycle 1 accepted → moved to higher preference', color: '#15803d' },
                  { icon: '✦', label: 'Fresh Allotment', count: freshCount, desc: 'Waitlisted from Cycle 1 + new applicants', color: '#1d4ed8' },
                  { icon: '═', label: 'Status Quo', count: statusQuoCount, desc: 'Cycle 1 accepted, no higher pref available', color: 'var(--color-text-muted)' },
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: '18px', width: '28px' }}>{item.icon}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, flex: 1 }}>{item.label}</span>
                    <span style={{ fontSize: '22px', fontWeight: 700, color: item.color, minWidth: '40px', textAlign: 'right' }}>{item.count}</span>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', minWidth: '280px' }}>{item.desc}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '24px', paddingTop: '12px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  <span><b style={{ color: 'var(--color-text)' }}>Total Offers Released:</b> {upgradedCount + freshCount}</span>
                  <span><b style={{ color: 'var(--color-text)' }}>Still Waitlisted:</b> {waitlistedResults.length}</span>
                  {prevCycleData && <span><b style={{ color: 'var(--color-text)' }}>Out of Pool:</b> {prevCycleData.totals.outOfPool}</span>}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              <SummaryCard label="Curr. Cycle Offers" value={String(offeredResults.length)} color="#276749" />
              <SummaryCard label="Waitlisted" value={String(waitlistedResults.length)} color="#b45309" />
              <SummaryCard label="Programs" value={String(programIds.length)} />
            </div>
          )}

          {/* Confirmation-only results table */}
          <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Offer Release Results — For Confirmation Only
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                  Showing {Math.min(10, offeredResults.length)} of {offeredResults.length} offered students. Download the full dataset to review all records.
                </div>
              </div>
              <button className="btn-secondary" style={{ fontSize: '12px', padding: '5px 14px', flexShrink: 0 }} onClick={handleDownloadResultsCSV}>
                ↓ Download CSV
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', minWidth: '160px' }}>Student Name</th>
                    <th style={{ textAlign: 'left', minWidth: '130px' }}>Application ID</th>
                    <th style={{ textAlign: 'left', minWidth: '130px' }}>Category</th>
                    <th style={{ textAlign: 'left', minWidth: '90px'  }}>Subcategory</th>
                    <th style={{ textAlign: 'left', minWidth: '160px' }}>Program Offered</th>
                    <th style={{ textAlign: 'center' }}>Score</th>
                    {hasPreviousCycle && <>
                      <th style={{ textAlign: 'left', minWidth: '180px' }}>Remarks</th>
                      <th style={{ textAlign: 'left', minWidth: '160px' }}>Fee Adjustment</th>
                    </>}
                  </tr>
                </thead>
                <tbody>
                  {offeredResults.slice(0, 10).map((r) => {
                    const programName = r.awardedProgramId ? (lppMap.get(r.awardedProgramId) ?? r.awardedProgramId) : '—';
                    const remark = getRemark(r, prevCycleData?.waitlistedIds ?? [], hasPreviousCycle ?? false);
                    const remarkColor = remark.includes('Upgraded') ? '#15803d' : remark.includes('Waitlist') ? '#b45309' : remark.includes('Fresh') ? '#1d4ed8' : 'var(--color-text-muted)';
                    let feeAdjCell: React.ReactNode = '—';
                    if (hasPreviousCycle && r.cycleAllotmentType === 'Upgraded' && r.feeDelta !== undefined) {
                      if (r.feeDelta > 0) {
                        feeAdjCell = <span style={{ color: '#c53030', fontWeight: 600 }}>Pay ₹{r.feeDelta.toLocaleString('en-IN')} more</span>;
                      } else if (r.feeDelta < 0) {
                        feeAdjCell = <span style={{ color: '#15803d', fontWeight: 600 }}>Refund ₹{Math.abs(r.feeDelta).toLocaleString('en-IN')}</span>;
                      } else {
                        feeAdjCell = <span style={{ color: 'var(--color-text-muted)' }}>No change</span>;
                      }
                    }
                    const catInfo = getCategoryInfo(r.category);
                    return (
                      <tr key={r.applicationId}>
                        <td style={{ fontWeight: 600 }}>{r.studentName}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--color-text-muted)' }}>{r.applicationId}</td>
                        <td style={{ fontWeight: 500 }}>{catInfo.category}</td>
                        <td style={{ color: 'var(--color-text-muted)' }}>{catInfo.subcategory}</td>
                        <td>{programName}</td>
                        <td style={{ textAlign: 'center' }}>{r.compositeScore.toFixed(1)}</td>
                        {hasPreviousCycle && <>
                          <td style={{ color: remarkColor, fontWeight: 500 }}>{remark}</td>
                          <td>{feeAdjCell}</td>
                        </>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Waitlisted section */}
            {waitlistedResults.length > 0 && (
              <div style={{ marginTop: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
                <button
                  onClick={() => setWaitlistedExpanded((v) => !v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {waitlistedExpanded ? '▲' : '▼'} Still Waitlisted ({waitlistedResults.length} students)
                </button>
                {waitlistedExpanded && (
                  <div style={{ overflowX: 'auto', marginTop: '8px' }}>
                    <table className="data-table" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left' }}>Student Name</th>
                          <th style={{ textAlign: 'left' }}>Application ID</th>
                          <th style={{ textAlign: 'left', minWidth: '130px' }}>Category</th>
                          <th style={{ textAlign: 'left', minWidth: '90px'  }}>Subcategory</th>
                          <th style={{ textAlign: 'center' }}>Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {waitlistedResults.map((r) => {
                          const wCatInfo = getCategoryInfo(r.category);
                          return (
                            <tr key={r.applicationId}>
                              <td>{r.studentName}</td>
                              <td style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--color-text-muted)' }}>{r.applicationId}</td>
                              <td style={{ fontWeight: 500 }}>{wCatInfo.category}</td>
                              <td style={{ color: 'var(--color-text-muted)' }}>{wCatInfo.subcategory}</td>
                              <td style={{ textAlign: 'center' }}>{r.compositeScore.toFixed(1)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action bar */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '24px' }}>
            <button className="btn-secondary" style={{ fontSize: '13px' }} onClick={() => setResults(null)}>← Reconfigure</button>
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
