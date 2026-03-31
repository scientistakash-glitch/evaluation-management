const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');

function generateApplicants(prefix, startId, count, lppIds) {
  const apps = [];
  const cats = ['General', 'OBC', 'SC/ST', 'NRI-American', 'NRI-Arab'];
  const FIRST_NAMES = ['Aarav','Aditi','Arjun','Bhavna','Chetan','Deepak','Ekta','Gaurav','Ishaan','Meera'];
  const LAST_NAMES = ['Sharma','Patel','Singh','Gupta','Verma','Kumar','Yadav','Jain','Mehta','Shah'];
  for (let i = 0; i < count; i++) {
    const id = startId + i;
    const cat = cats[id % 5];
    const rotated = [...lppIds.slice(id % lppIds.length), ...lppIds.slice(0, id % lppIds.length)];
    apps.push({
      id: `app_${prefix}_${id}`,
      studentName: `${FIRST_NAMES[id % 10]} ${LAST_NAMES[Math.floor(id / 10) % 10]}`,
      rollNumber: `${prefix.toUpperCase()}${id}`,
      category: cat,
      lppPreference: rotated[0],
      lppPreferences: rotated.map((lppId, j) => ({ lppId, preferenceOrder: j + 1 })),
      entranceScore: 70 + (id * 13) % 30,
      academicScore: 80 + (id * 7) % 20,
      interviewScore: 75 + (id * 11) % 25,
      applicationDate: '2025-01-20',
    });
  }
  return apps;
}

const BTECH_LPPS = ['lpp_001', 'lpp_002', 'lpp_003', 'lpp_004', 'lpp_015'];
const MTECH_LPPS = ['lpp_005', 'lpp_006', 'lpp_007'];

const btechApps = generateApplicants('b', 100, 500, BTECH_LPPS);
const mtechApps = generateApplicants('m', 100, 500, MTECH_LPPS);

const cycles = [
  { 
    id: 'btech-c1', name: 'B.Tech Cycle 1', ptatId: 'ptat_001', academicYear: '2026-2027', 
    number: 1, status: 'Released', lppIds: BTECH_LPPS, evaluationStrategy: 'program-wise',
    createdAt: new Date().toISOString() 
  }
];

// Generate rank records for B.Tech cycles
const rankRecords = [];
[...btechApps].forEach((app, i) => {
  BTECH_LPPS.forEach((lppId, j) => {
    rankRecords.push({
      id: `rank_${app.id}_${lppId}`, applicationId: app.id, programId: lppId,
      compositeScore: (app.entranceScore * 0.6 + app.academicScore * 0.3 + app.interviewScore * 0.1),
      globalRank: i + 1, programRank: i + 1, categoryRank: Math.floor(i / 5) + 1,
      category: app.category, tieBreakerValues: {}, tieBreakerApplied: false,
      preferenceOrder: app.lppPreferences.find(p => p.lppId === lppId)?.preferenceOrder ?? 99
    });
  });
});

// Seed B.Tech Cycle 1 Offer Results (accepted students for upgrade demo)
const btechC1Results = btechApps.slice(0, 100).map((app, i) => {
  const awardedId = i < 40 ? app.lppPreferences[0].lppId : app.lppPreferences[1].lppId;
  const awardOrder = i < 40 ? 1 : 2;
  return {
    applicationId: app.id, studentName: app.studentName, category: app.category,
    awardedProgramId: awardedId, awardedPreferenceOrder: awardOrder,
    acceptanceStatus: i % 10 === 0 ? 'Withdrawn' : 'Accepted',
    cycleAllotmentType: 'Fresh'
  };
});

const btechC1Waitlisted = btechApps.slice(100, 150).map(app => ({
  applicationId: app.id, studentName: app.studentName, category: app.category,
  awardedProgramId: null, awardedPreferenceOrder: null, acceptanceStatus: 'Pending', cycleAllotmentType: 'Waitlisted'
}));

const offerReleases = [
  { 
    cycleId: 'btech-c1', 
    studentResults: [...btechC1Results, ...btechC1Waitlisted], 
    summary: { released: 150, pending: 50, accepted: 90, withdrawn: 10 } 
  }
];

function seed() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
  fs.writeFileSync(path.join(DATA_DIR, 'cycles.json'), JSON.stringify(cycles, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'offer-releases.json'), JSON.stringify(offerReleases, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'applications.json'), JSON.stringify([...mtechApps, ...btechApps], null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'rank-records.json'), JSON.stringify(rankRecords, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'fee-configs.json'), JSON.stringify([], null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'evaluations.json'), JSON.stringify([], null, 2));
  console.log('Demo universe seeded: 1000 students, M.Tech clean, B.Tech historical.');
}

seed();
