import fs from 'fs/promises';
import path from 'path';

// Use Upstash Redis when env vars are present
const isVercel = !!process.env.UPSTASH_REDIS_REST_URL;

// ── Seed data ─────────────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
const SEED: Record<string, any[]> = {
  'ptats.json': [
    { id: 'ptat_001', name: 'B.Tech', code: 'BTECH', description: 'Bachelor of Technology programs', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 'ptat_002', name: 'M.Tech', code: 'MTECH', description: 'Master of Technology programs', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  ],
  'lpps.json': [
    { id: 'lpp_001', ptatId: 'ptat_001', name: 'B.Tech CSE',        code: 'BTECH_CSE',  duration: 4, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 'lpp_002', ptatId: 'ptat_001', name: 'B.Tech Mechanical', code: 'BTECH_MECH', duration: 4, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 'lpp_003', ptatId: 'ptat_001', name: 'B.Tech ECE',        code: 'BTECH_ECE',  duration: 4, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 'lpp_004', ptatId: 'ptat_002', name: 'M.Tech AI',         code: 'MTECH_AI',   duration: 2, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  ],
  'applications.json': [
    { id: 'app_001', studentName: 'Arjun Sharma',      rollNumber: 'JEE24001', dateOfBirth: '2003-05-12', category: 'General', entranceScore: 285, academicScore: 92.5, interviewScore: 88, applicationDate: '2024-01-15', createdAt: '2024-01-15T00:00:00Z', updatedAt: '2024-01-15T00:00:00Z' },
    { id: 'app_002', studentName: 'Priya Patel',       rollNumber: 'JEE24002', dateOfBirth: '2003-08-22', category: 'General', entranceScore: 278, academicScore: 89.3, interviewScore: 82, applicationDate: '2024-01-18', createdAt: '2024-01-18T00:00:00Z', updatedAt: '2024-01-18T00:00:00Z' },
    { id: 'app_003', studentName: 'Rahul Verma',       rollNumber: 'JEE24003', dateOfBirth: '2003-03-07', category: 'General', entranceScore: 265, academicScore: 85.0, interviewScore: 75, applicationDate: '2024-01-20', createdAt: '2024-01-20T00:00:00Z', updatedAt: '2024-01-20T00:00:00Z' },
    { id: 'app_004', studentName: 'Sneha Iyer',        rollNumber: 'JEE24004', dateOfBirth: '2003-11-14', category: 'General', entranceScore: 292, academicScore: 95.2, interviewScore: 93, applicationDate: '2024-01-22', createdAt: '2024-01-22T00:00:00Z', updatedAt: '2024-01-22T00:00:00Z' },
    { id: 'app_005', studentName: 'Vikram Nair',       rollNumber: 'JEE24005', dateOfBirth: '2003-06-30', category: 'General', entranceScore: 255, academicScore: 80.5, interviewScore: 70, applicationDate: '2024-01-25', createdAt: '2024-01-25T00:00:00Z', updatedAt: '2024-01-25T00:00:00Z' },
    { id: 'app_006', studentName: 'Ananya Singh',      rollNumber: 'JEE24006', dateOfBirth: '2003-09-18', category: 'General', entranceScore: 270, academicScore: 87.8, interviewScore: 79, applicationDate: '2024-02-01', createdAt: '2024-02-01T00:00:00Z', updatedAt: '2024-02-01T00:00:00Z' },
    { id: 'app_007', studentName: 'Rohan Gupta',       rollNumber: 'JEE24007', dateOfBirth: '2003-02-25', category: 'General', entranceScore: 248, academicScore: 78.2, interviewScore: 65, applicationDate: '2024-02-05', createdAt: '2024-02-05T00:00:00Z', updatedAt: '2024-02-05T00:00:00Z' },
    { id: 'app_008', studentName: 'Kavya Reddy',       rollNumber: 'JEE24008', dateOfBirth: '2003-12-03', category: 'General', entranceScore: 281, academicScore: 91.0, interviewScore: 86, applicationDate: '2024-02-08', createdAt: '2024-02-08T00:00:00Z', updatedAt: '2024-02-08T00:00:00Z' },
    { id: 'app_009', studentName: 'Aditya Kumar',      rollNumber: 'JEE24009', dateOfBirth: '2003-07-19', category: 'General', entranceScore: 260, academicScore: 83.5, interviewScore: 72, applicationDate: '2024-02-12', createdAt: '2024-02-12T00:00:00Z', updatedAt: '2024-02-12T00:00:00Z' },
    { id: 'app_010', studentName: 'Meera Krishnan',    rollNumber: 'JEE24010', dateOfBirth: '2003-04-08', category: 'General', entranceScore: 295, academicScore: 97.0, interviewScore: 95, applicationDate: '2024-02-15', createdAt: '2024-02-15T00:00:00Z', updatedAt: '2024-02-15T00:00:00Z' },
    { id: 'app_011', studentName: 'Suresh Yadav',      rollNumber: 'JEE24011', dateOfBirth: '2003-01-27', category: 'OBC',     entranceScore: 242, academicScore: 76.5, interviewScore: 62, applicationDate: '2024-02-20', createdAt: '2024-02-20T00:00:00Z', updatedAt: '2024-02-20T00:00:00Z' },
    { id: 'app_012', studentName: 'Pooja Mishra',      rollNumber: 'JEE24012', dateOfBirth: '2003-10-15', category: 'OBC',     entranceScore: 258, academicScore: 82.0, interviewScore: 74, applicationDate: '2024-02-22', createdAt: '2024-02-22T00:00:00Z', updatedAt: '2024-02-22T00:00:00Z' },
    { id: 'app_013', studentName: 'Deepak Chaudhary',  rollNumber: 'JEE24013', dateOfBirth: '2003-05-04', category: 'OBC',     entranceScore: 235, academicScore: 73.8, interviewScore: 58, applicationDate: '2024-02-25', createdAt: '2024-02-25T00:00:00Z', updatedAt: '2024-02-25T00:00:00Z' },
    { id: 'app_014', studentName: 'Neha Tiwari',       rollNumber: 'JEE24014', dateOfBirth: '2003-08-11', category: 'OBC',     entranceScore: 267, academicScore: 86.2, interviewScore: 77, applicationDate: '2024-03-01', createdAt: '2024-03-01T00:00:00Z', updatedAt: '2024-03-01T00:00:00Z' },
    { id: 'app_015', studentName: 'Manish Pandey',     rollNumber: 'JEE24015', dateOfBirth: '2003-03-21', category: 'OBC',     entranceScore: 228, academicScore: 70.5, interviewScore: 55, applicationDate: '2024-03-05', createdAt: '2024-03-05T00:00:00Z', updatedAt: '2024-03-05T00:00:00Z' },
    { id: 'app_016', studentName: 'Geeta Maurya',      rollNumber: 'JEE24016', dateOfBirth: '2003-11-09', category: 'OBC',     entranceScore: 245, academicScore: 77.9, interviewScore: 64, applicationDate: '2024-03-08', createdAt: '2024-03-08T00:00:00Z', updatedAt: '2024-03-08T00:00:00Z' },
    { id: 'app_017', studentName: 'Santosh Bind',      rollNumber: 'JEE24017', dateOfBirth: '2003-06-17', category: 'OBC',     entranceScore: 220, academicScore: 67.5, interviewScore: 50, applicationDate: '2024-03-12', createdAt: '2024-03-12T00:00:00Z', updatedAt: '2024-03-12T00:00:00Z' },
    { id: 'app_018', studentName: 'Kiran Jatav',       rollNumber: 'JEE24018', dateOfBirth: '2003-02-03', category: 'OBC',     entranceScore: 252, academicScore: 80.0, interviewScore: 68, applicationDate: '2024-03-15', createdAt: '2024-03-15T00:00:00Z', updatedAt: '2024-03-15T00:00:00Z' },
    { id: 'app_019', studentName: 'Ramesh Balmiki',    rollNumber: 'JEE24019', dateOfBirth: '2003-09-24', category: 'SC',      entranceScore: 210, academicScore: 64.5, interviewScore: 48, applicationDate: '2024-03-20', createdAt: '2024-03-20T00:00:00Z', updatedAt: '2024-03-20T00:00:00Z' },
    { id: 'app_020', studentName: 'Sunita Dhobi',      rollNumber: 'JEE24020', dateOfBirth: '2003-12-30', category: 'SC',      entranceScore: 198, academicScore: 61.0, interviewScore: 42, applicationDate: '2024-03-25', createdAt: '2024-03-25T00:00:00Z', updatedAt: '2024-03-25T00:00:00Z' },
    { id: 'app_021', studentName: 'Ajay Paswan',       rollNumber: 'JEE24021', dateOfBirth: '2003-04-16', category: 'SC',      entranceScore: 218, academicScore: 68.0, interviewScore: 52, applicationDate: '2024-04-01', createdAt: '2024-04-01T00:00:00Z', updatedAt: '2024-04-01T00:00:00Z' },
    { id: 'app_022', studentName: 'Rekha Chamar',      rollNumber: 'JEE24022', dateOfBirth: '2003-07-28', category: 'SC',      entranceScore: 205, academicScore: 63.5, interviewScore: 45, applicationDate: '2024-04-05', createdAt: '2024-04-05T00:00:00Z', updatedAt: '2024-04-05T00:00:00Z' },
    { id: 'app_023', studentName: 'Vinod Valmiki',     rollNumber: 'JEE24023', dateOfBirth: '2003-01-13', category: 'SC',      entranceScore: 225, academicScore: 71.2, interviewScore: 57, applicationDate: '2024-04-10', createdAt: '2024-04-10T00:00:00Z', updatedAt: '2024-04-10T00:00:00Z' },
    { id: 'app_024', studentName: 'Laxmi Kori',        rollNumber: 'JEE24024', dateOfBirth: '2003-10-01', category: 'SC',      entranceScore: 195, academicScore: 60.0, interviewScore: 40, applicationDate: '2024-04-15', createdAt: '2024-04-15T00:00:00Z', updatedAt: '2024-04-15T00:00:00Z' },
    { id: 'app_025', studentName: 'Birsa Munda',       rollNumber: 'JEE24025', dateOfBirth: '2003-05-20', category: 'ST',      entranceScore: 185, academicScore: 62.0, interviewScore: 43, applicationDate: '2024-04-20', createdAt: '2024-04-20T00:00:00Z', updatedAt: '2024-04-20T00:00:00Z' },
    { id: 'app_026', studentName: 'Savitri Oraon',     rollNumber: 'JEE24026', dateOfBirth: '2003-08-06', category: 'ST',      entranceScore: 175, academicScore: 60.5, interviewScore: 40, applicationDate: '2024-05-01', createdAt: '2024-05-01T00:00:00Z', updatedAt: '2024-05-01T00:00:00Z' },
    { id: 'app_027', studentName: 'Nagesh Gond',       rollNumber: 'JEE24027', dateOfBirth: '2003-03-14', category: 'ST',      entranceScore: 192, academicScore: 65.0, interviewScore: 46, applicationDate: '2024-05-10', createdAt: '2024-05-10T00:00:00Z', updatedAt: '2024-05-10T00:00:00Z' },
    { id: 'app_028', studentName: 'Kamla Bhil',        rollNumber: 'JEE24028', dateOfBirth: '2003-11-22', category: 'ST',      entranceScore: 168, academicScore: 61.5, interviewScore: 41, applicationDate: '2024-05-20', createdAt: '2024-05-20T00:00:00Z', updatedAt: '2024-05-20T00:00:00Z' },
    { id: 'app_029', studentName: 'Rahul Srivastava',  rollNumber: 'JEE24029', dateOfBirth: '2003-06-09', category: 'EWS',     entranceScore: 272, academicScore: 88.0, interviewScore: 80, applicationDate: '2024-06-01', createdAt: '2024-06-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z' },
    { id: 'app_030', studentName: 'Priti Bajpai',      rollNumber: 'JEE24030', dateOfBirth: '2003-02-18', category: 'EWS',     entranceScore: 263, academicScore: 84.5, interviewScore: 76, applicationDate: '2024-06-20', createdAt: '2024-06-20T00:00:00Z', updatedAt: '2024-06-20T00:00:00Z' },
  ],
  'criteria-sets.json': [
    { id: 'cs_001', name: 'Standard Engineering Criteria', description: '60% Entrance + 30% Academic + 10% Interview', isCustom: false, criteria: [{ id: 'crit_001', name: 'Entrance Score', weightage: 60, sourceField: 'entranceScore' }, { id: 'crit_002', name: 'Past Academic Record', weightage: 30, sourceField: 'academicScore' }, { id: 'crit_003', name: 'Interview Score', weightage: 10, sourceField: null }], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 'cs_002', name: 'Research Track Criteria', description: '50% Entrance + 30% Research Aptitude + 20% Academic', isCustom: false, criteria: [{ id: 'crit_004', name: 'Entrance Score', weightage: 50, sourceField: 'entranceScore' }, { id: 'crit_005', name: 'Research Aptitude', weightage: 30, sourceField: null }, { id: 'crit_006', name: 'Academic Score', weightage: 20, sourceField: 'academicScore' }], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  ],
  'cycles.json':             [],
  'evaluations.json':        [],
  'evaluation-scores.json':  [],
  'tiebreaker-configs.json': [],
  'rank-records.json':       [],
};

// ── Upstash Redis ─────────────────────────────────────────────────────────────

function getRedis() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Redis } = require('@upstash/redis');
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

async function kvRead<T>(filename: string): Promise<T[]> {
  const redis = getRedis();
  const data = await redis.get<T[]>(filename);
  if (data !== null && data !== undefined) return data as T[];
  // First access — seed the key with initial data
  const seed = (SEED[filename] ?? []) as T[];
  await redis.set(filename, seed);
  return seed;
}

async function kvWrite<T>(filename: string, data: T[]): Promise<void> {
  const redis = getRedis();
  await redis.set(filename, data);
}

// ── Local file I/O (dev) ──────────────────────────────────────────────────────

const seedDir = path.join(process.cwd(), 'data');

async function localRead<T>(filename: string): Promise<T[]> {
  try {
    const content = await fs.readFile(path.join(seedDir, filename), 'utf-8');
    return JSON.parse(content) as T[];
  } catch {
    return (SEED[filename] ?? []) as T[];
  }
}

async function localWrite<T>(filename: string, data: T[]): Promise<void> {
  await fs.writeFile(path.join(seedDir, filename), JSON.stringify(data, null, 2), 'utf-8');
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function readJson<T>(filename: string): Promise<T[]> {
  return isVercel ? kvRead<T>(filename) : localRead<T>(filename);
}

export async function writeJson<T>(filename: string, data: T[]): Promise<void> {
  return isVercel ? kvWrite<T>(filename, data) : localWrite<T>(filename, data);
}
