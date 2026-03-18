import fs from 'fs/promises';
import path from 'path';

// On Vercel the project root is read-only; use /tmp for writes.
// Reads fall back to the bundled /data seed files if /tmp copy doesn't exist yet.
const isVercel = !!process.env.VERCEL;
const seedDir = path.join(process.cwd(), 'data');
const writeDir = isVercel ? '/tmp/em-data' : seedDir;

async function ensureWriteDir() {
  if (isVercel) {
    await fs.mkdir(writeDir, { recursive: true });
  }
}

export async function readJson<T>(filename: string): Promise<T[]> {
  await ensureWriteDir();
  // On Vercel: check /tmp first (modified data), fall back to seed
  const candidates = isVercel
    ? [path.join(writeDir, filename), path.join(seedDir, filename)]
    : [path.join(seedDir, filename)];

  for (const filePath of candidates) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as T[];
    } catch {
      // try next
    }
  }
  return [];
}

export async function writeJson<T>(filename: string, data: T[]): Promise<void> {
  await ensureWriteDir();
  const filePath = path.join(writeDir, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
