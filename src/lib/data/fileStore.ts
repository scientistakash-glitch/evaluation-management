import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

// ── Seed data ─────────────────────────────────────────────────────────────────

// Helper: compute category-wise seats from total
function catSeats(total: number): Record<string, number> {
  return {
    General:          Math.round(total * 0.38),
    OBC:              Math.round(total * 0.27),
    'SC/ST':          Math.round(total * 0.225),
    'NRI-American':   Math.round(total * 0.07),
    'NRI-Arab':       Math.round(total * 0.055),
  };
}

// ── Generated B.Tech applicants (500 students, app_101–app_600) ───────────────

const BTECH_GEN_FIRST = ['Aarav','Aditi','Arjun','Bhavna','Chetan','Deepak','Ekta','Gaurav','Hari','Ishaan'];
const BTECH_GEN_LAST  = ['Sharma','Patel','Singh','Gupta','Verma','Kumar','Yadav','Jain','Mehta','Shah'];

function generateBTechApplicants(): any[] {
  const DIST: [string, number][] = [
    ['General',       400],
    ['OBC',           270],
    ['SC/ST',         220],
    ['NRI-American',   70],
    ['NRI-Arab',       40],
  ];  // Total: 1000
  const LPPS = ['lpp_001', 'lpp_002', 'lpp_003', 'lpp_004', 'lpp_015'];
  const apps: any[] = [];
  let n = 101;
  for (const [cat, count] of DIST) {
    for (let i = 0; i < count; i++, n++) {
      const rotated = [...LPPS.slice(n % 5), ...LPPS.slice(0, n % 5)];
      apps.push({
        id: `app_${n}`,
        studentName: `${BTECH_GEN_FIRST[n % 10]} ${BTECH_GEN_LAST[Math.floor(n / 10) % 10]}`,
        rollNumber: `JEE25${String(n).padStart(4, '0')}`,
        dateOfBirth: '2004-06-01',
        category: cat,
        lppPreference: rotated[0],
        entranceScore: 150 + (n * 37 + i * 13) % 151,
        academicScore:  Math.round((55 + (n * 17 + i * 7) % 44) * 10) / 10,
        interviewScore: 50 + (n * 23 + i * 11) % 51,
        applicationDate: '2025-01-20',
        createdAt: '2025-01-20T00:00:00Z',
        updatedAt: '2025-01-20T00:00:00Z',
      });
    }
  }
  return apps;
}

const SEED_READONLY: Record<string, any[]> = {
  // ── PTATs ──────────────────────────────────────────────────────────────────
  'ptats.json': [
    { id: 'ptat_001', name: 'B.Tech', code: 'BTECH', description: 'Bachelor of Technology programs', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 'ptat_002', name: 'M.Tech', code: 'MTECH', description: 'Master of Technology programs', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 'ptat_003', name: 'MBA',    code: 'MBA',   description: 'Master of Business Administration', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 'ptat_004', name: 'M.Sc',   code: 'MSC',   description: 'Master of Science programs', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  ],

  // ── LPPs ───────────────────────────────────────────────────────────────────
  'lpps.json': [
    // B.Tech (5 programs)
    { id: 'lpp_001', ptatId: 'ptat_001', name: 'B.Tech CSE',                      code: 'BTECH_CSE',   duration: 4, fee: 780000,  totalSeats: 120, categoryWiseSeats: catSeats(120), subcategories: [{ name: 'General', category: 'Resident Indian', approvedIntake: 46 }, { name: 'OBC', category: 'Resident Indian', approvedIntake: 32 }, { name: 'SC/ST', category: 'Resident Indian', approvedIntake: 27 }, { name: 'American', category: 'NRI', approvedIntake: 8 }, { name: 'Arab', category: 'NRI', approvedIntake: 7 }], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 'lpp_002', ptatId: 'ptat_001', name: 'B.Tech Mechanical',               code: 'BTECH_MECH',  duration: 4, fee: 700000,  totalSeats:  60, categoryWiseSeats: catSeats(60),  subcategories: [{ name: 'General', category: 'Resident Indian', approvedIntake: 23 }, { name: 'OBC', category: 'Resident Indian', approvedIntake: 16 }, { name: 'SC/ST', category: 'Resident Indian', approvedIntake: 14 }, { name: 'American', category: 'NRI', approvedIntake: 4 }, { name: 'Arab', category: 'NRI', approvedIntake: 3 }], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 'lpp_003', ptatId: 'ptat_001', name: 'B.Tech ECE',                      code: 'BTECH_ECE',   duration: 4, fee: 740000,  totalSeats:  90, categoryWiseSeats: catSeats(90),  subcategories: [{ name: 'General', category: 'Resident Indian', approvedIntake: 34 }, { name: 'OBC', category: 'Resident Indian', approvedIntake: 24 }, { name: 'SC/ST', category: 'Resident Indian', approvedIntake: 21 }, { name: 'American', category: 'NRI', approvedIntake: 6 }, { name: 'Arab', category: 'NRI', approvedIntake: 5 }], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 'lpp_004', ptatId: 'ptat_001', name: 'B.Tech Civil',                    code: 'BTECH_CIVIL', duration: 4, fee: 680000,  totalSeats:  60, categoryWiseSeats: catSeats(60),  subcategories: [{ name: 'General', category: 'Resident Indian', approvedIntake: 23 }, { name: 'OBC', category: 'Resident Indian', approvedIntake: 16 }, { name: 'SC/ST', category: 'Resident Indian', approvedIntake: 14 }, { name: 'American', category: 'NRI', approvedIntake: 4 }, { name: 'Arab', category: 'NRI', approvedIntake: 3 }], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 'lpp_015', ptatId: 'ptat_001', name: 'B.Tech Information Technology',   code: 'BTECH_IT',    duration: 4, fee: 720000,  totalSeats:  60, categoryWiseSeats: catSeats(60),  subcategories: [{ name: 'General', category: 'Resident Indian', approvedIntake: 23 }, { name: 'OBC', category: 'Resident Indian', approvedIntake: 16 }, { name: 'SC/ST', category: 'Resident Indian', approvedIntake: 14 }, { name: 'American', category: 'NRI', approvedIntake: 4 }, { name: 'Arab', category: 'NRI', approvedIntake: 3 }], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    // M.Tech (3 programs)
    { id: 'lpp_005', ptatId: 'ptat_002', name: 'M.Tech AI & ML',          code: 'MTECH_AI',    duration: 2, totalSeats:  40, categoryWiseSeats: catSeats(40),  subcategories: [{ name: 'General', category: 'Resident Indian', approvedIntake: 15 }, { name: 'OBC', category: 'Resident Indian', approvedIntake: 11 }, { name: 'SC/ST', category: 'Resident Indian', approvedIntake: 9 }, { name: 'American', category: 'NRI', approvedIntake: 3 }, { name: 'Arab', category: 'NRI', approvedIntake: 2 }], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 'lpp_006', ptatId: 'ptat_002', name: 'M.Tech VLSI Design',      code: 'MTECH_VLSI',  duration: 2, totalSeats:  30, categoryWiseSeats: catSeats(30),  subcategories: [{ name: 'General', category: 'Resident Indian', approvedIntake: 11 }, { name: 'OBC', category: 'Resident Indian', approvedIntake: 8 }, { name: 'SC/ST', category: 'Resident Indian', approvedIntake: 7 }, { name: 'American', category: 'NRI', approvedIntake: 2 }, { name: 'Arab', category: 'NRI', approvedIntake: 2 }], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 'lpp_007', ptatId: 'ptat_002', name: 'M.Tech Structural Engg',  code: 'MTECH_STR',   duration: 2, totalSeats:  25, categoryWiseSeats: catSeats(25),  subcategories: [{ name: 'General', category: 'Resident Indian', approvedIntake: 10 }, { name: 'OBC', category: 'Resident Indian', approvedIntake: 6 }, { name: 'SC/ST', category: 'Resident Indian', approvedIntake: 5 }, { name: 'American', category: 'NRI', approvedIntake: 2 }, { name: 'Arab', category: 'NRI', approvedIntake: 2 }], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    // MBA (4 programs)
    { id: 'lpp_008', ptatId: 'ptat_003', name: 'MBA Finance',             code: 'MBA_FIN',     duration: 2, totalSeats:  80, categoryWiseSeats: catSeats(80),  createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 'lpp_009', ptatId: 'ptat_003', name: 'MBA Human Resources',     code: 'MBA_HR',      duration: 2, totalSeats:  60, categoryWiseSeats: catSeats(60),  createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 'lpp_010', ptatId: 'ptat_003', name: 'MBA Marketing',           code: 'MBA_MKT',     duration: 2, totalSeats:  60, categoryWiseSeats: catSeats(60),  createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 'lpp_011', ptatId: 'ptat_003', name: 'MBA Operations',          code: 'MBA_OPS',     duration: 2, totalSeats:  40, categoryWiseSeats: catSeats(40),  createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    // M.Sc (3 programs)
    { id: 'lpp_012', ptatId: 'ptat_004', name: 'M.Sc Physics',            code: 'MSC_PHY',     duration: 2, totalSeats:  50, categoryWiseSeats: catSeats(50),  createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 'lpp_013', ptatId: 'ptat_004', name: 'M.Sc Chemistry',          code: 'MSC_CHE',     duration: 2, totalSeats:  50, categoryWiseSeats: catSeats(50),  createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 'lpp_014', ptatId: 'ptat_004', name: 'M.Sc Mathematics',        code: 'MSC_MAT',     duration: 2, totalSeats:  50, categoryWiseSeats: catSeats(50),  createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  ],

  // ── Applications (80 total) ────────────────────────────────────────────────
  'applications.json': [
    // ── B.Tech CSE (lpp_001) applicants ───────────────────────────────────
    { id: 'app_001', studentName: 'Arjun Sharma',      rollNumber: 'JEE24001', dateOfBirth: '2003-05-12', category: 'General', lppPreference: 'lpp_001', entranceScore: 285, academicScore: 92.5, interviewScore: 88, applicationDate: '2024-01-15', createdAt: '2024-01-15T00:00:00Z', updatedAt: '2024-01-15T00:00:00Z' },
    { id: 'app_002', studentName: 'Priya Patel',       rollNumber: 'JEE24002', dateOfBirth: '2003-08-22', category: 'General', lppPreference: 'lpp_001', entranceScore: 278, academicScore: 89.3, interviewScore: 82, applicationDate: '2024-01-18', createdAt: '2024-01-18T00:00:00Z', updatedAt: '2024-01-18T00:00:00Z' },
    { id: 'app_003', studentName: 'Rahul Verma',       rollNumber: 'JEE24003', dateOfBirth: '2003-03-07', category: 'General', lppPreference: 'lpp_001', entranceScore: 265, academicScore: 85.0, interviewScore: 75, applicationDate: '2024-01-20', createdAt: '2024-01-20T00:00:00Z', updatedAt: '2024-01-20T00:00:00Z' },
    { id: 'app_004', studentName: 'Sneha Iyer',        rollNumber: 'JEE24004', dateOfBirth: '2003-11-14', category: 'General', lppPreference: 'lpp_001', entranceScore: 292, academicScore: 95.2, interviewScore: 93, applicationDate: '2024-01-22', createdAt: '2024-01-22T00:00:00Z', updatedAt: '2024-01-22T00:00:00Z' },
    { id: 'app_005', studentName: 'Vikram Nair',       rollNumber: 'JEE24005', dateOfBirth: '2003-06-30', category: 'General', lppPreference: 'lpp_001', entranceScore: 255, academicScore: 80.5, interviewScore: 70, applicationDate: '2024-01-25', createdAt: '2024-01-25T00:00:00Z', updatedAt: '2024-01-25T00:00:00Z' },
    { id: 'app_006', studentName: 'Ananya Singh',      rollNumber: 'JEE24006', dateOfBirth: '2003-09-18', category: 'OBC',     lppPreference: 'lpp_001', entranceScore: 270, academicScore: 87.8, interviewScore: 79, applicationDate: '2024-02-01', createdAt: '2024-02-01T00:00:00Z', updatedAt: '2024-02-01T00:00:00Z' },
    { id: 'app_007', studentName: 'Rohan Gupta',       rollNumber: 'JEE24007', dateOfBirth: '2003-02-25', category: 'OBC',     lppPreference: 'lpp_001', entranceScore: 248, academicScore: 78.2, interviewScore: 65, applicationDate: '2024-02-05', createdAt: '2024-02-05T00:00:00Z', updatedAt: '2024-02-05T00:00:00Z' },
    { id: 'app_008', studentName: 'Kavya Reddy',       rollNumber: 'JEE24008', dateOfBirth: '2003-12-03', category: 'SC/ST',      lppPreference: 'lpp_001', entranceScore: 281, academicScore: 91.0, interviewScore: 86, applicationDate: '2024-02-08', createdAt: '2024-02-08T00:00:00Z', updatedAt: '2024-02-08T00:00:00Z' },
    { id: 'app_009', studentName: 'Aditya Kumar',      rollNumber: 'JEE24009', dateOfBirth: '2003-07-19', category: 'SC/ST',      lppPreference: 'lpp_001', entranceScore: 260, academicScore: 83.5, interviewScore: 72, applicationDate: '2024-02-12', createdAt: '2024-02-12T00:00:00Z', updatedAt: '2024-02-12T00:00:00Z' },
    { id: 'app_010', studentName: 'Meera Krishnan',    rollNumber: 'JEE24010', dateOfBirth: '2003-04-08', category: 'SC/ST',      lppPreference: 'lpp_001', entranceScore: 295, academicScore: 97.0, interviewScore: 95, applicationDate: '2024-02-15', createdAt: '2024-02-15T00:00:00Z', updatedAt: '2024-02-15T00:00:00Z' },
    { id: 'app_011', studentName: 'Karan Mehta',       rollNumber: 'JEE24011', dateOfBirth: '2003-01-20', category: 'General',     lppPreference: 'lpp_001', entranceScore: 272, academicScore: 88.0, interviewScore: 80, applicationDate: '2024-02-20', createdAt: '2024-02-20T00:00:00Z', updatedAt: '2024-02-20T00:00:00Z' },

    // ── B.Tech Mechanical (lpp_002) applicants ─────────────────────────────
    { id: 'app_012', studentName: 'Suresh Yadav',      rollNumber: 'JEE24012', dateOfBirth: '2003-03-11', category: 'General', lppPreference: 'lpp_002', entranceScore: 242, academicScore: 76.5, interviewScore: 62, applicationDate: '2024-02-22', createdAt: '2024-02-22T00:00:00Z', updatedAt: '2024-02-22T00:00:00Z' },
    { id: 'app_013', studentName: 'Pooja Mishra',      rollNumber: 'JEE24013', dateOfBirth: '2003-10-15', category: 'General', lppPreference: 'lpp_002', entranceScore: 258, academicScore: 82.0, interviewScore: 74, applicationDate: '2024-02-24', createdAt: '2024-02-24T00:00:00Z', updatedAt: '2024-02-24T00:00:00Z' },
    { id: 'app_014', studentName: 'Deepak Chaudhary',  rollNumber: 'JEE24014', dateOfBirth: '2003-05-04', category: 'OBC',     lppPreference: 'lpp_002', entranceScore: 235, academicScore: 73.8, interviewScore: 58, applicationDate: '2024-02-25', createdAt: '2024-02-25T00:00:00Z', updatedAt: '2024-02-25T00:00:00Z' },
    { id: 'app_015', studentName: 'Neha Tiwari',       rollNumber: 'JEE24015', dateOfBirth: '2003-08-11', category: 'OBC',     lppPreference: 'lpp_002', entranceScore: 267, academicScore: 86.2, interviewScore: 77, applicationDate: '2024-03-01', createdAt: '2024-03-01T00:00:00Z', updatedAt: '2024-03-01T00:00:00Z' },
    { id: 'app_016', studentName: 'Manish Pandey',     rollNumber: 'JEE24016', dateOfBirth: '2003-03-21', category: 'SC/ST',      lppPreference: 'lpp_002', entranceScore: 228, academicScore: 70.5, interviewScore: 55, applicationDate: '2024-03-05', createdAt: '2024-03-05T00:00:00Z', updatedAt: '2024-03-05T00:00:00Z' },
    { id: 'app_017', studentName: 'Geeta Maurya',      rollNumber: 'JEE24017', dateOfBirth: '2003-11-09', category: 'SC/ST',      lppPreference: 'lpp_002', entranceScore: 245, academicScore: 77.9, interviewScore: 64, applicationDate: '2024-03-08', createdAt: '2024-03-08T00:00:00Z', updatedAt: '2024-03-08T00:00:00Z' },
    { id: 'app_018', studentName: 'Santosh Bind',      rollNumber: 'JEE24018', dateOfBirth: '2003-06-17', category: 'General',     lppPreference: 'lpp_002', entranceScore: 220, academicScore: 67.5, interviewScore: 50, applicationDate: '2024-03-12', createdAt: '2024-03-12T00:00:00Z', updatedAt: '2024-03-12T00:00:00Z' },

    // ── B.Tech ECE (lpp_003) applicants ───────────────────────────────────
    { id: 'app_019', studentName: 'Kiran Jatav',       rollNumber: 'JEE24019', dateOfBirth: '2003-02-03', category: 'General', lppPreference: 'lpp_003', entranceScore: 252, academicScore: 80.0, interviewScore: 68, applicationDate: '2024-03-15', createdAt: '2024-03-15T00:00:00Z', updatedAt: '2024-03-15T00:00:00Z' },
    { id: 'app_020', studentName: 'Ramesh Balmiki',    rollNumber: 'JEE24020', dateOfBirth: '2003-09-24', category: 'General', lppPreference: 'lpp_003', entranceScore: 210, academicScore: 64.5, interviewScore: 48, applicationDate: '2024-03-20', createdAt: '2024-03-20T00:00:00Z', updatedAt: '2024-03-20T00:00:00Z' },
    { id: 'app_021', studentName: 'Sunita Dhobi',      rollNumber: 'JEE24021', dateOfBirth: '2003-12-30', category: 'OBC',     lppPreference: 'lpp_003', entranceScore: 198, academicScore: 61.0, interviewScore: 42, applicationDate: '2024-03-25', createdAt: '2024-03-25T00:00:00Z', updatedAt: '2024-03-25T00:00:00Z' },
    { id: 'app_022', studentName: 'Ajay Paswan',       rollNumber: 'JEE24022', dateOfBirth: '2003-04-16', category: 'SC/ST',      lppPreference: 'lpp_003', entranceScore: 218, academicScore: 68.0, interviewScore: 52, applicationDate: '2024-04-01', createdAt: '2024-04-01T00:00:00Z', updatedAt: '2024-04-01T00:00:00Z' },
    { id: 'app_023', studentName: 'Rekha Chamar',      rollNumber: 'JEE24023', dateOfBirth: '2003-07-28', category: 'SC/ST',      lppPreference: 'lpp_003', entranceScore: 205, academicScore: 63.5, interviewScore: 45, applicationDate: '2024-04-05', createdAt: '2024-04-05T00:00:00Z', updatedAt: '2024-04-05T00:00:00Z' },
    { id: 'app_024', studentName: 'Vinod Valmiki',     rollNumber: 'JEE24024', dateOfBirth: '2003-01-13', category: 'General',     lppPreference: 'lpp_003', entranceScore: 225, academicScore: 71.2, interviewScore: 57, applicationDate: '2024-04-10', createdAt: '2024-04-10T00:00:00Z', updatedAt: '2024-04-10T00:00:00Z' },

    // ── B.Tech Civil (lpp_004) applicants ─────────────────────────────────
    { id: 'app_025', studentName: 'Laxmi Kori',        rollNumber: 'JEE24025', dateOfBirth: '2003-10-01', category: 'General', lppPreference: 'lpp_004', entranceScore: 195, academicScore: 60.0, interviewScore: 40, applicationDate: '2024-04-15', createdAt: '2024-04-15T00:00:00Z', updatedAt: '2024-04-15T00:00:00Z' },
    { id: 'app_026', studentName: 'Birsa Munda',        rollNumber: 'JEE24026', dateOfBirth: '2003-05-20', category: 'General', lppPreference: 'lpp_004', entranceScore: 185, academicScore: 62.0, interviewScore: 43, applicationDate: '2024-04-20', createdAt: '2024-04-20T00:00:00Z', updatedAt: '2024-04-20T00:00:00Z' },
    { id: 'app_027', studentName: 'Savitri Oraon',      rollNumber: 'JEE24027', dateOfBirth: '2003-08-06', category: 'OBC',     lppPreference: 'lpp_004', entranceScore: 175, academicScore: 60.5, interviewScore: 40, applicationDate: '2024-05-01', createdAt: '2024-05-01T00:00:00Z', updatedAt: '2024-05-01T00:00:00Z' },
    { id: 'app_028', studentName: 'Nagesh Gond',        rollNumber: 'JEE24028', dateOfBirth: '2003-03-14', category: 'SC/ST',      lppPreference: 'lpp_004', entranceScore: 192, academicScore: 65.0, interviewScore: 46, applicationDate: '2024-05-10', createdAt: '2024-05-10T00:00:00Z', updatedAt: '2024-05-10T00:00:00Z' },
    { id: 'app_029', studentName: 'Kamla Bhil',         rollNumber: 'JEE24029', dateOfBirth: '2003-11-22', category: 'SC/ST',      lppPreference: 'lpp_004', entranceScore: 168, academicScore: 61.5, interviewScore: 41, applicationDate: '2024-05-20', createdAt: '2024-05-20T00:00:00Z', updatedAt: '2024-05-20T00:00:00Z' },
    { id: 'app_030', studentName: 'Rahul Srivastava',   rollNumber: 'JEE24030', dateOfBirth: '2003-06-09', category: 'General',     lppPreference: 'lpp_004', entranceScore: 272, academicScore: 88.0, interviewScore: 80, applicationDate: '2024-06-01', createdAt: '2024-06-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z' },

    // ── M.Tech AI & ML (lpp_005) applicants ───────────────────────────────
    { id: 'app_031', studentName: 'Priti Bajpai',       rollNumber: 'GATE24001', dateOfBirth: '2001-02-18', category: 'General', lppPreference: 'lpp_005', entranceScore: 263, academicScore: 84.5, interviewScore: 76, applicationDate: '2024-06-20', createdAt: '2024-06-20T00:00:00Z', updatedAt: '2024-06-20T00:00:00Z' },
    { id: 'app_032', studentName: 'Siddharth Rao',      rollNumber: 'GATE24002', dateOfBirth: '2001-05-14', category: 'General', lppPreference: 'lpp_005', entranceScore: 289, academicScore: 93.0, interviewScore: 90, applicationDate: '2024-06-22', createdAt: '2024-06-22T00:00:00Z', updatedAt: '2024-06-22T00:00:00Z' },
    { id: 'app_033', studentName: 'Nandini Pillai',     rollNumber: 'GATE24003', dateOfBirth: '2001-08-30', category: 'OBC',     lppPreference: 'lpp_005', entranceScore: 275, academicScore: 88.5, interviewScore: 83, applicationDate: '2024-06-25', createdAt: '2024-06-25T00:00:00Z', updatedAt: '2024-06-25T00:00:00Z' },
    { id: 'app_034', studentName: 'Sunil Desai',        rollNumber: 'GATE24004', dateOfBirth: '2001-11-03', category: 'SC/ST',      lppPreference: 'lpp_005', entranceScore: 248, academicScore: 79.0, interviewScore: 67, applicationDate: '2024-07-01', createdAt: '2024-07-01T00:00:00Z', updatedAt: '2024-07-01T00:00:00Z' },
    { id: 'app_035', studentName: 'Kavitha Nair',       rollNumber: 'GATE24005', dateOfBirth: '2001-04-17', category: 'SC/ST',      lppPreference: 'lpp_005', entranceScore: 232, academicScore: 74.5, interviewScore: 60, applicationDate: '2024-07-05', createdAt: '2024-07-05T00:00:00Z', updatedAt: '2024-07-05T00:00:00Z' },

    // ── M.Tech VLSI (lpp_006) applicants ──────────────────────────────────
    { id: 'app_036', studentName: 'Arun Krishnamurthy', rollNumber: 'GATE24006', dateOfBirth: '2001-07-22', category: 'General', lppPreference: 'lpp_006', entranceScore: 278, academicScore: 91.2, interviewScore: 87, applicationDate: '2024-07-10', createdAt: '2024-07-10T00:00:00Z', updatedAt: '2024-07-10T00:00:00Z' },
    { id: 'app_037', studentName: 'Divya Shetty',       rollNumber: 'GATE24007', dateOfBirth: '2001-09-08', category: 'OBC',     lppPreference: 'lpp_006', entranceScore: 261, academicScore: 83.0, interviewScore: 72, applicationDate: '2024-07-15', createdAt: '2024-07-15T00:00:00Z', updatedAt: '2024-07-15T00:00:00Z' },
    { id: 'app_038', studentName: 'Prakash Nadar',      rollNumber: 'GATE24008', dateOfBirth: '2001-12-11', category: 'SC/ST',      lppPreference: 'lpp_006', entranceScore: 240, academicScore: 75.5, interviewScore: 61, applicationDate: '2024-07-20', createdAt: '2024-07-20T00:00:00Z', updatedAt: '2024-07-20T00:00:00Z' },
    { id: 'app_039', studentName: 'Indira Gowda',       rollNumber: 'GATE24009', dateOfBirth: '2001-03-25', category: 'General',     lppPreference: 'lpp_006', entranceScore: 255, academicScore: 81.0, interviewScore: 70, applicationDate: '2024-07-25', createdAt: '2024-07-25T00:00:00Z', updatedAt: '2024-07-25T00:00:00Z' },

    // ── M.Tech Structural (lpp_007) applicants ─────────────────────────────
    { id: 'app_040', studentName: 'Vijay Kulkarni',     rollNumber: 'GATE24010', dateOfBirth: '2001-06-19', category: 'General', lppPreference: 'lpp_007', entranceScore: 244, academicScore: 77.0, interviewScore: 63, applicationDate: '2024-08-01', createdAt: '2024-08-01T00:00:00Z', updatedAt: '2024-08-01T00:00:00Z' },
    { id: 'app_041', studentName: 'Mamta Rao',          rollNumber: 'GATE24011', dateOfBirth: '2001-01-07', category: 'OBC',     lppPreference: 'lpp_007', entranceScore: 231, academicScore: 73.5, interviewScore: 57, applicationDate: '2024-08-05', createdAt: '2024-08-05T00:00:00Z', updatedAt: '2024-08-05T00:00:00Z' },
    { id: 'app_042', studentName: 'Ravi Bhatt',         rollNumber: 'GATE24012', dateOfBirth: '2001-04-28', category: 'SC/ST',      lppPreference: 'lpp_007', entranceScore: 218, academicScore: 68.5, interviewScore: 52, applicationDate: '2024-08-10', createdAt: '2024-08-10T00:00:00Z', updatedAt: '2024-08-10T00:00:00Z' },

    // ── MBA Finance (lpp_008) applicants ──────────────────────────────────
    { id: 'app_043', studentName: 'Shweta Agarwal',     rollNumber: 'CAT24001', dateOfBirth: '1999-03-14', category: 'General', lppPreference: 'lpp_008', entranceScore: 290, academicScore: 94.0, interviewScore: 92, applicationDate: '2024-08-15', createdAt: '2024-08-15T00:00:00Z', updatedAt: '2024-08-15T00:00:00Z' },
    { id: 'app_044', studentName: 'Nitin Kapoor',       rollNumber: 'CAT24002', dateOfBirth: '1999-07-22', category: 'General', lppPreference: 'lpp_008', entranceScore: 275, academicScore: 89.0, interviewScore: 85, applicationDate: '2024-08-18', createdAt: '2024-08-18T00:00:00Z', updatedAt: '2024-08-18T00:00:00Z' },
    { id: 'app_045', studentName: 'Poornima Hegde',     rollNumber: 'CAT24003', dateOfBirth: '1999-11-05', category: 'OBC',     lppPreference: 'lpp_008', entranceScore: 260, academicScore: 83.5, interviewScore: 74, applicationDate: '2024-08-22', createdAt: '2024-08-22T00:00:00Z', updatedAt: '2024-08-22T00:00:00Z' },
    { id: 'app_046', studentName: 'Rajesh Murugan',     rollNumber: 'CAT24004', dateOfBirth: '1999-04-30', category: 'OBC',     lppPreference: 'lpp_008', entranceScore: 248, academicScore: 79.5, interviewScore: 68, applicationDate: '2024-08-25', createdAt: '2024-08-25T00:00:00Z', updatedAt: '2024-08-25T00:00:00Z' },
    { id: 'app_047', studentName: 'Sundar Rajan',       rollNumber: 'CAT24005', dateOfBirth: '1999-09-16', category: 'SC/ST',      lppPreference: 'lpp_008', entranceScore: 235, academicScore: 74.0, interviewScore: 60, applicationDate: '2024-09-01', createdAt: '2024-09-01T00:00:00Z', updatedAt: '2024-09-01T00:00:00Z' },
    { id: 'app_048', studentName: 'Usha Pillai',        rollNumber: 'CAT24006', dateOfBirth: '1999-12-28', category: 'SC/ST',      lppPreference: 'lpp_008', entranceScore: 222, academicScore: 70.0, interviewScore: 54, applicationDate: '2024-09-05', createdAt: '2024-09-05T00:00:00Z', updatedAt: '2024-09-05T00:00:00Z' },
    { id: 'app_049', studentName: 'Vivek Menon',        rollNumber: 'CAT24007', dateOfBirth: '1999-06-11', category: 'General',     lppPreference: 'lpp_008', entranceScore: 268, academicScore: 86.0, interviewScore: 78, applicationDate: '2024-09-10', createdAt: '2024-09-10T00:00:00Z', updatedAt: '2024-09-10T00:00:00Z' },

    // ── MBA HR (lpp_009) applicants ────────────────────────────────────────
    { id: 'app_050', studentName: 'Anjali Misra',       rollNumber: 'CAT24008', dateOfBirth: '2000-02-04', category: 'General', lppPreference: 'lpp_009', entranceScore: 252, academicScore: 81.5, interviewScore: 69, applicationDate: '2024-09-15', createdAt: '2024-09-15T00:00:00Z', updatedAt: '2024-09-15T00:00:00Z' },
    { id: 'app_051', studentName: 'Chirag Shah',        rollNumber: 'CAT24009', dateOfBirth: '2000-05-19', category: 'General', lppPreference: 'lpp_009', entranceScore: 264, academicScore: 85.0, interviewScore: 76, applicationDate: '2024-09-18', createdAt: '2024-09-18T00:00:00Z', updatedAt: '2024-09-18T00:00:00Z' },
    { id: 'app_052', studentName: 'Dhanya Nambiar',     rollNumber: 'CAT24010', dateOfBirth: '2000-08-27', category: 'OBC',     lppPreference: 'lpp_009', entranceScore: 239, academicScore: 76.0, interviewScore: 62, applicationDate: '2024-09-22', createdAt: '2024-09-22T00:00:00Z', updatedAt: '2024-09-22T00:00:00Z' },
    { id: 'app_053', studentName: 'Esha Tripathi',      rollNumber: 'CAT24011', dateOfBirth: '2000-12-10', category: 'SC/ST',      lppPreference: 'lpp_009', entranceScore: 225, academicScore: 71.5, interviewScore: 55, applicationDate: '2024-09-25', createdAt: '2024-09-25T00:00:00Z', updatedAt: '2024-09-25T00:00:00Z' },
    { id: 'app_054', studentName: 'Farhan Siddiqui',    rollNumber: 'CAT24012', dateOfBirth: '2000-03-22', category: 'General',     lppPreference: 'lpp_009', entranceScore: 258, academicScore: 82.0, interviewScore: 72, applicationDate: '2024-10-01', createdAt: '2024-10-01T00:00:00Z', updatedAt: '2024-10-01T00:00:00Z' },

    // ── MBA Marketing (lpp_010) applicants ────────────────────────────────
    { id: 'app_055', studentName: 'Gaurav Thakur',      rollNumber: 'CAT24013', dateOfBirth: '2000-07-08', category: 'General', lppPreference: 'lpp_010', entranceScore: 271, academicScore: 87.5, interviewScore: 81, applicationDate: '2024-10-05', createdAt: '2024-10-05T00:00:00Z', updatedAt: '2024-10-05T00:00:00Z' },
    { id: 'app_056', studentName: 'Hema Subramaniam',   rollNumber: 'CAT24014', dateOfBirth: '2000-10-15', category: 'OBC',     lppPreference: 'lpp_010', entranceScore: 256, academicScore: 81.0, interviewScore: 70, applicationDate: '2024-10-10', createdAt: '2024-10-10T00:00:00Z', updatedAt: '2024-10-10T00:00:00Z' },
    { id: 'app_057', studentName: 'Ishaan Bose',        rollNumber: 'CAT24015', dateOfBirth: '2000-01-27', category: 'SC/ST',      lppPreference: 'lpp_010', entranceScore: 242, academicScore: 77.0, interviewScore: 63, applicationDate: '2024-10-15', createdAt: '2024-10-15T00:00:00Z', updatedAt: '2024-10-15T00:00:00Z' },
    { id: 'app_058', studentName: 'Jyoti Kureel',       rollNumber: 'CAT24016', dateOfBirth: '2000-04-09', category: 'SC/ST',      lppPreference: 'lpp_010', entranceScore: 228, academicScore: 72.5, interviewScore: 56, applicationDate: '2024-10-20', createdAt: '2024-10-20T00:00:00Z', updatedAt: '2024-10-20T00:00:00Z' },

    // ── MBA Operations (lpp_011) applicants ───────────────────────────────
    { id: 'app_059', studentName: 'Karthik Balaji',     rollNumber: 'CAT24017', dateOfBirth: '2000-06-14', category: 'General', lppPreference: 'lpp_011', entranceScore: 265, academicScore: 85.5, interviewScore: 77, applicationDate: '2024-10-25', createdAt: '2024-10-25T00:00:00Z', updatedAt: '2024-10-25T00:00:00Z' },
    { id: 'app_060', studentName: 'Lakshmi Venkat',     rollNumber: 'CAT24018', dateOfBirth: '2000-09-28', category: 'OBC',     lppPreference: 'lpp_011', entranceScore: 250, academicScore: 80.5, interviewScore: 68, applicationDate: '2024-11-01', createdAt: '2024-11-01T00:00:00Z', updatedAt: '2024-11-01T00:00:00Z' },
    { id: 'app_061', studentName: 'Mohan Bairwa',       rollNumber: 'CAT24019', dateOfBirth: '2000-12-05', category: 'SC/ST',      lppPreference: 'lpp_011', entranceScore: 237, academicScore: 75.0, interviewScore: 60, applicationDate: '2024-11-05', createdAt: '2024-11-05T00:00:00Z', updatedAt: '2024-11-05T00:00:00Z' },
    { id: 'app_062', studentName: 'Nisha Meena',        rollNumber: 'CAT24020', dateOfBirth: '2000-03-17', category: 'General',     lppPreference: 'lpp_011', entranceScore: 245, academicScore: 78.0, interviewScore: 65, applicationDate: '2024-11-10', createdAt: '2024-11-10T00:00:00Z', updatedAt: '2024-11-10T00:00:00Z' },

    // ── M.Sc Physics (lpp_012) applicants ─────────────────────────────────
    { id: 'app_063', studentName: 'Omkar Patil',        rollNumber: 'IIT24001', dateOfBirth: '2001-01-23', category: 'General', lppPreference: 'lpp_012', entranceScore: 282, academicScore: 92.0, interviewScore: 88, applicationDate: '2024-11-15', createdAt: '2024-11-15T00:00:00Z', updatedAt: '2024-11-15T00:00:00Z' },
    { id: 'app_064', studentName: 'Prerna Chavan',      rollNumber: 'IIT24002', dateOfBirth: '2001-04-30', category: 'General', lppPreference: 'lpp_012', entranceScore: 269, academicScore: 87.0, interviewScore: 80, applicationDate: '2024-11-18', createdAt: '2024-11-18T00:00:00Z', updatedAt: '2024-11-18T00:00:00Z' },
    { id: 'app_065', studentName: 'Qasim Ansari',       rollNumber: 'IIT24003', dateOfBirth: '2001-08-15', category: 'OBC',     lppPreference: 'lpp_012', entranceScore: 254, academicScore: 81.5, interviewScore: 70, applicationDate: '2024-11-22', createdAt: '2024-11-22T00:00:00Z', updatedAt: '2024-11-22T00:00:00Z' },
    { id: 'app_066', studentName: 'Rani Devi',          rollNumber: 'IIT24004', dateOfBirth: '2001-11-28', category: 'SC/ST',      lppPreference: 'lpp_012', entranceScore: 240, academicScore: 76.5, interviewScore: 62, applicationDate: '2024-11-25', createdAt: '2024-11-25T00:00:00Z', updatedAt: '2024-11-25T00:00:00Z' },
    { id: 'app_067', studentName: 'Santanu Munda',      rollNumber: 'IIT24005', dateOfBirth: '2001-05-10', category: 'SC/ST',      lppPreference: 'lpp_012', entranceScore: 226, academicScore: 72.0, interviewScore: 55, applicationDate: '2024-12-01', createdAt: '2024-12-01T00:00:00Z', updatedAt: '2024-12-01T00:00:00Z' },

    // ── M.Sc Chemistry (lpp_013) applicants ───────────────────────────────
    { id: 'app_068', studentName: 'Tanuja Sharma',      rollNumber: 'IIT24006', dateOfBirth: '2001-02-17', category: 'General', lppPreference: 'lpp_013', entranceScore: 276, academicScore: 90.0, interviewScore: 86, applicationDate: '2024-12-05', createdAt: '2024-12-05T00:00:00Z', updatedAt: '2024-12-05T00:00:00Z' },
    { id: 'app_069', studentName: 'Umesh Thakre',       rollNumber: 'IIT24007', dateOfBirth: '2001-06-04', category: 'OBC',     lppPreference: 'lpp_013', entranceScore: 261, academicScore: 83.5, interviewScore: 73, applicationDate: '2024-12-08', createdAt: '2024-12-08T00:00:00Z', updatedAt: '2024-12-08T00:00:00Z' },
    { id: 'app_070', studentName: 'Vandana Jadhav',     rollNumber: 'IIT24008', dateOfBirth: '2001-09-21', category: 'SC/ST',      lppPreference: 'lpp_013', entranceScore: 247, academicScore: 79.0, interviewScore: 65, applicationDate: '2024-12-12', createdAt: '2024-12-12T00:00:00Z', updatedAt: '2024-12-12T00:00:00Z' },
    { id: 'app_071', studentName: 'Wasim Khan',         rollNumber: 'IIT24009', dateOfBirth: '2001-12-31', category: 'General',     lppPreference: 'lpp_013', entranceScore: 263, academicScore: 84.0, interviewScore: 75, applicationDate: '2024-12-15', createdAt: '2024-12-15T00:00:00Z', updatedAt: '2024-12-15T00:00:00Z' },

    // ── M.Sc Mathematics (lpp_014) applicants ─────────────────────────────
    { id: 'app_072', studentName: 'Xavier Pereira',     rollNumber: 'IIT24010', dateOfBirth: '2001-03-12', category: 'General', lppPreference: 'lpp_014', entranceScore: 285, academicScore: 94.5, interviewScore: 91, applicationDate: '2024-12-20', createdAt: '2024-12-20T00:00:00Z', updatedAt: '2024-12-20T00:00:00Z' },
    { id: 'app_073', studentName: 'Yamini Srinivasan',  rollNumber: 'IIT24011', dateOfBirth: '2001-07-25', category: 'General', lppPreference: 'lpp_014', entranceScore: 271, academicScore: 88.0, interviewScore: 82, applicationDate: '2024-12-22', createdAt: '2024-12-22T00:00:00Z', updatedAt: '2024-12-22T00:00:00Z' },
    { id: 'app_074', studentName: 'Zara Baig',          rollNumber: 'IIT24012', dateOfBirth: '2001-10-08', category: 'OBC',     lppPreference: 'lpp_014', entranceScore: 257, academicScore: 82.5, interviewScore: 71, applicationDate: '2024-12-25', createdAt: '2024-12-25T00:00:00Z', updatedAt: '2024-12-25T00:00:00Z' },
    { id: 'app_075', studentName: 'Abhishek Pandey',    rollNumber: 'IIT24013', dateOfBirth: '2001-01-15', category: 'SC/ST',      lppPreference: 'lpp_014', entranceScore: 243, academicScore: 77.5, interviewScore: 62, applicationDate: '2024-12-28', createdAt: '2024-12-28T00:00:00Z', updatedAt: '2024-12-28T00:00:00Z' },
    { id: 'app_076', studentName: 'Bhawana Bhagat',     rollNumber: 'IIT24014', dateOfBirth: '2001-04-22', category: 'SC/ST',      lppPreference: 'lpp_014', entranceScore: 230, academicScore: 73.0, interviewScore: 57, applicationDate: '2024-12-30', createdAt: '2024-12-30T00:00:00Z', updatedAt: '2024-12-30T00:00:00Z' },

    // ── Extra General/OBC applicants spread across B.Tech programs ─────────
    { id: 'app_077', studentName: 'Chetan Solanki',     rollNumber: 'JEE24031', dateOfBirth: '2003-02-06', category: 'General', lppPreference: 'lpp_001', entranceScore: 288, academicScore: 93.0, interviewScore: 89, applicationDate: '2025-01-05', createdAt: '2025-01-05T00:00:00Z', updatedAt: '2025-01-05T00:00:00Z' },
    { id: 'app_078', studentName: 'Deepika Rathore',    rollNumber: 'JEE24032', dateOfBirth: '2003-06-18', category: 'OBC',     lppPreference: 'lpp_003', entranceScore: 266, academicScore: 86.0, interviewScore: 78, applicationDate: '2025-01-08', createdAt: '2025-01-08T00:00:00Z', updatedAt: '2025-01-08T00:00:00Z' },
    { id: 'app_079', studentName: 'Elan Senthil',       rollNumber: 'JEE24033', dateOfBirth: '2003-09-30', category: 'General', lppPreference: 'lpp_002', entranceScore: 274, academicScore: 89.5, interviewScore: 84, applicationDate: '2025-01-12', createdAt: '2025-01-12T00:00:00Z', updatedAt: '2025-01-12T00:00:00Z' },
    { id: 'app_080', studentName: 'Fatima Shaikh',      rollNumber: 'JEE24034', dateOfBirth: '2003-12-14', category: 'OBC',     lppPreference: 'lpp_004', entranceScore: 255, academicScore: 81.0, interviewScore: 70, applicationDate: '2025-01-15', createdAt: '2025-01-15T00:00:00Z', updatedAt: '2025-01-15T00:00:00Z' },
    // ── 500 generated B.Tech applicants (app_101–app_600) ──────────────────
    ...generateBTechApplicants(),
  ],

  'criteria-sets.json': [
    { id: 'cs_001', name: 'Standard Engineering Criteria', description: '60% Entrance + 30% Academic + 10% Interview', isCustom: false, criteria: [{ id: 'crit_001', name: 'Entrance Score', weightage: 60, sourceField: 'entranceScore' }, { id: 'crit_002', name: 'Past Academic Record', weightage: 30, sourceField: 'academicScore' }, { id: 'crit_003', name: 'Interview Score', weightage: 10, sourceField: null }], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  ],
};

// ── B.Tech multi-program preferences ──────────────────────────────────────────
// B.Tech has 4 LPPs: CSE=lpp_001, Mechanical=lpp_002, ECE=lpp_003, Civil=lpp_004
// Every B.Tech student ranks ALL 4 programs with preference orders 1-4.
type Pref = { lppId: string; preferenceOrder: number };
const BTECH_PREFS: Record<string, Pref[]> = {
  // CSE-first students
  'app_001': [{ lppId: 'lpp_001', preferenceOrder: 1 }, { lppId: 'lpp_003', preferenceOrder: 2 }, { lppId: 'lpp_002', preferenceOrder: 3 }, { lppId: 'lpp_004', preferenceOrder: 4 }],
  'app_002': [{ lppId: 'lpp_001', preferenceOrder: 1 }, { lppId: 'lpp_003', preferenceOrder: 2 }, { lppId: 'lpp_004', preferenceOrder: 3 }, { lppId: 'lpp_002', preferenceOrder: 4 }],
  'app_003': [{ lppId: 'lpp_001', preferenceOrder: 1 }, { lppId: 'lpp_002', preferenceOrder: 2 }, { lppId: 'lpp_003', preferenceOrder: 3 }, { lppId: 'lpp_004', preferenceOrder: 4 }],
  'app_004': [{ lppId: 'lpp_001', preferenceOrder: 1 }, { lppId: 'lpp_003', preferenceOrder: 2 }, { lppId: 'lpp_002', preferenceOrder: 3 }, { lppId: 'lpp_004', preferenceOrder: 4 }],
  'app_005': [{ lppId: 'lpp_001', preferenceOrder: 1 }, { lppId: 'lpp_002', preferenceOrder: 2 }, { lppId: 'lpp_004', preferenceOrder: 3 }, { lppId: 'lpp_003', preferenceOrder: 4 }],
  'app_006': [{ lppId: 'lpp_001', preferenceOrder: 1 }, { lppId: 'lpp_003', preferenceOrder: 2 }, { lppId: 'lpp_002', preferenceOrder: 3 }, { lppId: 'lpp_004', preferenceOrder: 4 }],
  'app_007': [{ lppId: 'lpp_001', preferenceOrder: 1 }, { lppId: 'lpp_002', preferenceOrder: 2 }, { lppId: 'lpp_003', preferenceOrder: 3 }, { lppId: 'lpp_004', preferenceOrder: 4 }],
  'app_008': [{ lppId: 'lpp_001', preferenceOrder: 1 }, { lppId: 'lpp_003', preferenceOrder: 2 }, { lppId: 'lpp_004', preferenceOrder: 3 }, { lppId: 'lpp_002', preferenceOrder: 4 }],
  'app_009': [{ lppId: 'lpp_001', preferenceOrder: 1 }, { lppId: 'lpp_002', preferenceOrder: 2 }, { lppId: 'lpp_003', preferenceOrder: 3 }, { lppId: 'lpp_004', preferenceOrder: 4 }],
  'app_010': [{ lppId: 'lpp_001', preferenceOrder: 1 }, { lppId: 'lpp_003', preferenceOrder: 2 }, { lppId: 'lpp_002', preferenceOrder: 3 }, { lppId: 'lpp_004', preferenceOrder: 4 }],
  'app_011': [{ lppId: 'lpp_001', preferenceOrder: 1 }, { lppId: 'lpp_004', preferenceOrder: 2 }, { lppId: 'lpp_002', preferenceOrder: 3 }, { lppId: 'lpp_003', preferenceOrder: 4 }],
  // Mechanical-first students
  'app_012': [{ lppId: 'lpp_002', preferenceOrder: 1 }, { lppId: 'lpp_001', preferenceOrder: 2 }, { lppId: 'lpp_004', preferenceOrder: 3 }, { lppId: 'lpp_003', preferenceOrder: 4 }],
  'app_013': [{ lppId: 'lpp_002', preferenceOrder: 1 }, { lppId: 'lpp_004', preferenceOrder: 2 }, { lppId: 'lpp_003', preferenceOrder: 3 }, { lppId: 'lpp_001', preferenceOrder: 4 }],
  'app_014': [{ lppId: 'lpp_002', preferenceOrder: 1 }, { lppId: 'lpp_003', preferenceOrder: 2 }, { lppId: 'lpp_004', preferenceOrder: 3 }, { lppId: 'lpp_001', preferenceOrder: 4 }],
  'app_015': [{ lppId: 'lpp_002', preferenceOrder: 1 }, { lppId: 'lpp_001', preferenceOrder: 2 }, { lppId: 'lpp_003', preferenceOrder: 3 }, { lppId: 'lpp_004', preferenceOrder: 4 }],
  'app_016': [{ lppId: 'lpp_002', preferenceOrder: 1 }, { lppId: 'lpp_004', preferenceOrder: 2 }, { lppId: 'lpp_001', preferenceOrder: 3 }, { lppId: 'lpp_003', preferenceOrder: 4 }],
  'app_017': [{ lppId: 'lpp_002', preferenceOrder: 1 }, { lppId: 'lpp_003', preferenceOrder: 2 }, { lppId: 'lpp_001', preferenceOrder: 3 }, { lppId: 'lpp_004', preferenceOrder: 4 }],
  'app_018': [{ lppId: 'lpp_002', preferenceOrder: 1 }, { lppId: 'lpp_004', preferenceOrder: 2 }, { lppId: 'lpp_003', preferenceOrder: 3 }, { lppId: 'lpp_001', preferenceOrder: 4 }],
  // ECE-first students
  'app_019': [{ lppId: 'lpp_003', preferenceOrder: 1 }, { lppId: 'lpp_001', preferenceOrder: 2 }, { lppId: 'lpp_002', preferenceOrder: 3 }, { lppId: 'lpp_004', preferenceOrder: 4 }],
  'app_020': [{ lppId: 'lpp_003', preferenceOrder: 1 }, { lppId: 'lpp_002', preferenceOrder: 2 }, { lppId: 'lpp_004', preferenceOrder: 3 }, { lppId: 'lpp_001', preferenceOrder: 4 }],
  'app_021': [{ lppId: 'lpp_003', preferenceOrder: 1 }, { lppId: 'lpp_004', preferenceOrder: 2 }, { lppId: 'lpp_002', preferenceOrder: 3 }, { lppId: 'lpp_001', preferenceOrder: 4 }],
  'app_022': [{ lppId: 'lpp_003', preferenceOrder: 1 }, { lppId: 'lpp_001', preferenceOrder: 2 }, { lppId: 'lpp_004', preferenceOrder: 3 }, { lppId: 'lpp_002', preferenceOrder: 4 }],
  'app_023': [{ lppId: 'lpp_003', preferenceOrder: 1 }, { lppId: 'lpp_002', preferenceOrder: 2 }, { lppId: 'lpp_001', preferenceOrder: 3 }, { lppId: 'lpp_004', preferenceOrder: 4 }],
  'app_024': [{ lppId: 'lpp_003', preferenceOrder: 1 }, { lppId: 'lpp_004', preferenceOrder: 2 }, { lppId: 'lpp_001', preferenceOrder: 3 }, { lppId: 'lpp_002', preferenceOrder: 4 }],
  // Civil-first students
  'app_025': [{ lppId: 'lpp_004', preferenceOrder: 1 }, { lppId: 'lpp_002', preferenceOrder: 2 }, { lppId: 'lpp_003', preferenceOrder: 3 }, { lppId: 'lpp_001', preferenceOrder: 4 }],
  'app_026': [{ lppId: 'lpp_004', preferenceOrder: 1 }, { lppId: 'lpp_003', preferenceOrder: 2 }, { lppId: 'lpp_001', preferenceOrder: 3 }, { lppId: 'lpp_002', preferenceOrder: 4 }],
  'app_027': [{ lppId: 'lpp_004', preferenceOrder: 1 }, { lppId: 'lpp_002', preferenceOrder: 2 }, { lppId: 'lpp_003', preferenceOrder: 3 }, { lppId: 'lpp_001', preferenceOrder: 4 }],
  'app_028': [{ lppId: 'lpp_004', preferenceOrder: 1 }, { lppId: 'lpp_003', preferenceOrder: 2 }, { lppId: 'lpp_001', preferenceOrder: 3 }, { lppId: 'lpp_002', preferenceOrder: 4 }],
  'app_029': [{ lppId: 'lpp_004', preferenceOrder: 1 }, { lppId: 'lpp_002', preferenceOrder: 2 }, { lppId: 'lpp_003', preferenceOrder: 3 }, { lppId: 'lpp_001', preferenceOrder: 4 }],
  'app_030': [{ lppId: 'lpp_004', preferenceOrder: 1 }, { lppId: 'lpp_001', preferenceOrder: 2 }, { lppId: 'lpp_003', preferenceOrder: 3 }, { lppId: 'lpp_002', preferenceOrder: 4 }],
  // Extra B.Tech students (app_077–app_080)
  'app_077': [{ lppId: 'lpp_001', preferenceOrder: 1 }, { lppId: 'lpp_003', preferenceOrder: 2 }, { lppId: 'lpp_002', preferenceOrder: 3 }, { lppId: 'lpp_004', preferenceOrder: 4 }],
  'app_078': [{ lppId: 'lpp_003', preferenceOrder: 1 }, { lppId: 'lpp_001', preferenceOrder: 2 }, { lppId: 'lpp_004', preferenceOrder: 3 }, { lppId: 'lpp_002', preferenceOrder: 4 }],
  'app_079': [{ lppId: 'lpp_002', preferenceOrder: 1 }, { lppId: 'lpp_001', preferenceOrder: 2 }, { lppId: 'lpp_003', preferenceOrder: 3 }, { lppId: 'lpp_004', preferenceOrder: 4 }],
  'app_080': [{ lppId: 'lpp_004', preferenceOrder: 1 }, { lppId: 'lpp_002', preferenceOrder: 2 }, { lppId: 'lpp_001', preferenceOrder: 3 }, { lppId: 'lpp_003', preferenceOrder: 4 }],
};

// Generate preferences for app_101–app_1100 (matches generateBTechApplicants rotation logic)
// numPrefs cycles 3 → 4 → 5 → 3 → ... (min 3, max 5 with 5 programs)
{
  const LPPS = ['lpp_001', 'lpp_002', 'lpp_003', 'lpp_004', 'lpp_015'];
  for (let n = 101; n <= 1100; n++) {
    const rotated = [...LPPS.slice(n % 5), ...LPPS.slice(0, n % 5)];
    const numPrefs = n % 3 === 0 ? 3 : n % 3 === 1 ? 4 : 5;
    BTECH_PREFS[`app_${n}`] = rotated.slice(0, numPrefs).map((lppId, j) => ({ lppId, preferenceOrder: j + 1 }));
  }
}

// Attach lppPreferences to all applications (B.Tech: multi-preference; others: single)
for (const app of SEED_READONLY['applications.json']) {
  (app as any).lppPreferences = BTECH_PREFS[app.id] ?? [{ lppId: app.lppPreference, preferenceOrder: 1 }];
}

const WRITABLE_KEYS = [
  'cycles.json',
  'evaluations.json',
  'evaluation-scores.json',
  'tiebreaker-configs.json',
  'rank-records.json',
  'offer-releases.json',
  'cycle-comments.json',
  'fee-configs.json',
  'applications.json',
];

const DATA_DIR = path.join(process.cwd(), 'data');

// ── In-memory store ────────────────────────────────────────────────────────────

const store: Record<string, any[]> = {
  ...SEED_READONLY,
  'cycles.json':             [],
  'evaluations.json':        [],
  'evaluation-scores.json':  [],
  'tiebreaker-configs.json': [],
  'rank-records.json':       [],
  'offer-releases.json':     [],
  'cycle-comments.json':     [],
  'fee-configs.json':        [],
};

export function resetStore(): void {
  console.log('RESETTING STORE: Clearing all session-based data…');
  for (const key of WRITABLE_KEYS) {
    store[key] = [];
    storeInitialized[key] = true; // Mark as initialized so it doesn't re-read old disk data
    try {
      fs.writeFileSync(path.join(DATA_DIR, key), '[]', 'utf-8');
    } catch { /* ignore */ }
  }
  // NEW: Trigger the demo seeding after reset
  try {
    execSync('node seed-demo.js', { cwd: process.cwd() });
    console.log('RE-SEEDED demo data successfully. Syncing memory…');
    // Important: Re-read the files into memory so that store is updated
    for (const key of WRITABLE_KEYS) {
      const filePath = path.join(DATA_DIR, key);
      if (fs.existsSync(filePath)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          store[key] = parsed;
          storeInitialized[key] = true;
        } catch { /* ignore parse errors */ }
      }
    }
  } catch (err) {
    console.error('Error re-seeding demo data:', err);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

const storeInitialized: Record<string, boolean> = {};

export async function readJson<T>(filename: string): Promise<T[]> {
  if (WRITABLE_KEYS.includes(filename)) {
    // Only read from disk on the first call per key (cold start).
    // After that, trust in-memory — disk writes silently fail on Vercel.
    if (!storeInitialized[filename]) {
      storeInitialized[filename] = true;
      const filePath = path.join(DATA_DIR, filename);
      if (fs.existsSync(filePath)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          store[filename] = parsed;
          return parsed as T[];
        } catch { /* fall through to in-memory */ }
      }
    }
    return (store[filename] ?? []) as T[];
  }
  return (store[filename] ?? []) as T[];
}

export async function writeJson<T>(filename: string, data: T[]): Promise<void> {
  store[filename] = data;
  if (WRITABLE_KEYS.includes(filename)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf-8');
    } catch { /* ignore write errors */ }
  }
}
