const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');

const BTECH_LPPS = ['lpp_001', 'lpp_002', 'lpp_003', 'lpp_004', 'lpp_015'];
const MTECH_LPPS = ['lpp_005', 'lpp_006', 'lpp_007'];
const categories = ['General', 'OBC', 'SC/ST', 'NRI-American', 'NRI-Arab'];

const catMap = {
  'General': { cat: 'Resident Indian', sub: 'General' },
  'OBC': { cat: 'Resident Indian', sub: 'OBC' },
  'SC/ST': { cat: 'Resident Indian', sub: 'SC/ST' },
  'NRI-American': { cat: 'NRI', sub: 'American' },
  'NRI-Arab': { cat: 'NRI', sub: 'Arab' }
};

function generateApplicants(prefix, startId, count, lppIds) {
  const apps = [];
  const FIRST_NAMES = ['Aarav','Aditi','Arjun','Bhavna','Chetan','Deepak','Ekta','Gaurav','Ishaan','Meera'];
  const LAST_NAMES = ['Sharma','Patel','Singh','Gupta','Verma','Kumar','Yadav','Jain','Mehta','Shah'];
  
  for (let i = 0; i < count; i++) {
    const id = startId + i;
    const rawCat = categories[id % categories.length];
    const mapped = catMap[rawCat];
    
    // Rotate preferences so they are distributed across all programs
    const rotated = [...lppIds.slice(id % lppIds.length), ...lppIds.slice(0, id % lppIds.length)];
    // Enforce 3 to 5 preference rules (if the program group has that many)
    const prefCount = Math.min(lppIds.length, 3 + (id % 3));
    const pickedLpps = rotated.slice(0, prefCount);
    
    apps.push({
      id: `app_${prefix}_${id}`,
      studentName: `${FIRST_NAMES[id % 10]} ${LAST_NAMES[Math.floor(id / 10) % 10]}`,
      category: mapped.cat,
      subcategory: mapped.sub,
      lppPreference: pickedLpps[0], // Primary preference
      lppPreferences: pickedLpps.map((lppId, j) => ({ 
        lppId, 
        preferenceOrder: j + 1 
      })),
      entranceScore: 180 + (id * 17) % 101, // 180-280 range
      academicScore: 70 + (id * 13) % 26,   // 70-95 range
      interviewScore: 60 + (id * 11) % 31,  // 60-90 range
      applicationDate: '2026-02-15',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  return apps;
}

// B.Tech: app_b_100 to app_b_599 (500 limit)
const btechApps = generateApplicants('b', 100, 500, BTECH_LPPS);
// M.Tech: app_m_600 to app_m_799 (200 limit to prevent sessionStorage crash)
const mtechApps = generateApplicants('m', 600, 200, MTECH_LPPS);
const allApps = [...mtechApps, ...btechApps];

// ── CYCLES ───────────────────────────────────────────────────────────────────

const cycles = [
  { 
    id: 'btech-c1', name: 'B.Tech – 2026-2027 – Cycle 1', ptatId: 'ptat_001', academicYear: '2026-2027', 
    number: 1, status: 'Released', lppIds: BTECH_LPPS, evaluationStrategy: 'program-wise',
    createdAt: new Date().toISOString() 
  }
];

// ── RANK RECORDS (Seed B.Tech Cycle 1 History) ──────────────────────────────
const rankRecords = [];
btechApps.slice(0, 200).forEach((app, i) => {
  app.lppPreferences.forEach((pref) => {
    rankRecords.push({
      id: `rank_${app.id}_${pref.lppId}`,
      evaluationId: 'eval_btech_c1',
      cycleId: 'btech-c1',
      applicationId: app.id,
      programId: pref.lppId,
      compositeScore: Math.round((app.entranceScore/300*100*0.6 + app.academicScore*0.3 + app.interviewScore*0.1)*100)/100,
      globalRank: i + 1,
      programRank: i + 1,
      categoryRank: Math.floor(i / 5) + 1,
      category: app.category,
      tieBreakerValues: { entrance: app.entranceScore, academic: app.academicScore },
      tieBreakerApplied: false,
      preferenceOrder: pref.preferenceOrder
    });
  });
});

// ── OFFER RELEASES ───────────────────────────────────────────────────────────

const btechC1Results = btechApps.slice(0, 100).map((app, i) => {
  const awardedPref = (i < 60 || app.lppPreferences.length === 1) ? app.lppPreferences[0] : app.lppPreferences[1];
  return {
    applicationId: app.id,
    studentName: app.studentName,
    category: app.category,
    subcategory: app.subcategory,
    awardedProgramId: awardedPref.lppId,
    awardedPreferenceOrder: awardedPref.preferenceOrder,
    acceptanceStatus: i % 10 === 0 ? 'Withdrawn' : 'Accepted',
    cycleAllotmentType: 'Fresh',
    compositeScore: 85 - (i * 0.1)
  };
});

const btechC1Waitlisted = btechApps.slice(100, 150).map((app, i) => ({
  applicationId: app.id,
  studentName: app.studentName,
  category: app.category,
  subcategory: app.subcategory,
  awardedProgramId: null,
  awardedPreferenceOrder: null,
  acceptanceStatus: 'Pending',
  cycleAllotmentType: 'Waitlisted',
  compositeScore: 75 - (i * 0.1)
}));

const offerReleases = [
  { 
    id: 'off_btech_c1',
    cycleId: 'btech-c1', 
    studentResults: [...btechC1Results, ...btechC1Waitlisted], 
    summary: { released: 150, pending: 50, accepted: 90, withdrawn: 10 },
    createdAt: new Date().toISOString()
  }
];

function seed() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
  
  // Clear everything then write
  fs.writeFileSync(path.join(DATA_DIR, 'cycles.json'), JSON.stringify(cycles, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'offer-releases.json'), JSON.stringify(offerReleases, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'applications.json'), JSON.stringify(allApps, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'rank-records.json'), JSON.stringify(rankRecords, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'evaluations.json'), JSON.stringify([], null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'evaluation-scores.json'), JSON.stringify([], null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'fee-configs.json'), JSON.stringify([], null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'tiebreaker-configs.json'), JSON.stringify([], null, 2));
  
  console.log('Demo universe seeded: 700 students with strict 3-5 multi-preferences. B.Tech 2026-27 C1 history restored.');
}

seed();
