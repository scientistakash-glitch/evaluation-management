# Handoff — Active Bug Fix Required

**Date:** 2026-03-31
**Repo:** https://github.com/scientistakash-glitch/evaluation-management
**Live app:** https://evaluation-management-taupe.vercel.app
**Branch:** main (latest commit: `203010e`)

---

## Bug: "Cycle not found" after Generate Rankings

### Symptom
After completing the create-cycle wizard and being redirected to `/cycle/[id]/evaluation`, the page shows "Cycle not found" with a "Go to Cycles" button. This was working before commit `203010e`.

### Root Cause — Two layered issues

#### Issue 1 (primary): `fileStore.ts` re-reads stale disk on every `readJson` call

File: `src/lib/data/fileStore.ts`

`readJson()` currently reads `data/*.json` from disk every time it is called:
```ts
export async function readJson<T>(filename: string): Promise<T[]> {
  if (WRITABLE_KEYS.includes(filename)) {
    const filePath = path.join(DATA_DIR, filename);
    if (fs.existsSync(filePath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        store[filename] = parsed;   // ← overwrites in-memory with disk
        return parsed as T[];
      } catch { }
    }
  }
  return (store[filename] ?? []) as T[];
}
```

On Vercel, `data/evaluations.json` on disk is `[]` (the committed file is empty). So when `readJson('evaluations.json')` is called after `writeJson` wrote to in-memory, it wipes out the in-memory data by re-reading the empty disk file. `writeJson` tries to write disk too but Vercel's filesystem is read-only in `/var/task`, so `fs.writeFileSync` silently fails — the disk file stays `[]` forever.

**Fix:** Only read from disk on the first call per key (cold start). After that, trust in-memory.

```ts
const storeInitialized: Record<string, boolean> = {};

export async function readJson<T>(filename: string): Promise<T[]> {
  if (WRITABLE_KEYS.includes(filename)) {
    if (!storeInitialized[filename]) {
      storeInitialized[filename] = true;
      const filePath = path.join(DATA_DIR, filename);
      if (fs.existsSync(filePath)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          store[filename] = parsed;
          return parsed as T[];
        } catch { }
      }
    }
    return store[filename] as T[];
  }
  return (store[filename] ?? []) as T[];
}
```

#### Issue 2 (secondary): `EvaluationWorkflow.tsx` always fetches evaluation from server and clears session on empty response

File: `src/components/evaluation/EvaluationWorkflow.tsx` — around lines 215–236

In commit `203010e`, the evaluation fetch was moved outside the `if (!sessionData?.cycle)` guard so it always runs. When the server returns `[]` (due to Issue 1), this branch fires:

```ts
} else {
  // Server has no evaluation for this cycle — clear stale session entry
  setEvaluation(null);                                       // ← nukes state
  try { sessionStorage.removeItem(`cycle-${cycleId}`); }    // ← nukes session
}
```

This clears the sessionStorage that was correctly populated by the create-cycle wizard, causing `evaluation = null` → "Cycle not found".

**Fix:** Only clear if session also has no evaluation:

```ts
} else {
  if (!sessionData?.evaluation) {
    setEvaluation(null);
    try { sessionStorage.removeItem(`cycle-${cycleId}`); } catch { /* ignore */ }
  }
  // If session has the evaluation, keep it — server empty may be ephemeral instance
}
```

### Why this regressed in `203010e`

The previous commit `25a7aac` only fetched evaluation from server when the cycle itself wasn't in session. The new commit moved evaluation fetch to always run (to fix a different bug: stale session → 404 on approval). That was the right idea, but it exposed the fileStore disk-read issue.

### What was working before
Commit `25a7aac` (and earlier) had evaluation fetch inside the `if (!sessionData?.cycle)` guard. If session had the cycle, it skipped the server eval fetch entirely and used session data directly.

---

## Files to Change

| File | Change |
|------|--------|
| `src/lib/data/fileStore.ts` | Add `storeInitialized` map; only read disk once per key per process |
| `src/components/evaluation/EvaluationWorkflow.tsx` | Guard the `setEvaluation(null)` + `sessionStorage.removeItem` behind `!sessionData?.evaluation` check |

---

## What was built before this bug (context for the session)

Three features were added in the last session (all in `203010e`):

1. **Fee Config step** — moved fee installment configuration from create-cycle wizard (Step 3, never persisted) into a new EvaluationWorkflow step after Bulk Offers. New files:
   - `src/components/evaluation/FeeConfig.tsx` — plan selector (INSTA 1/2/3) + due dates table
   - `src/lib/data/feeConfigs.ts` — `getFeeConfigByCycleId`, `upsertFeeConfig`
   - `src/app/api/cycles/[id]/fee-config/route.ts` — GET + POST
   - `data/fee-configs.json` — seeded `[]`
   - `src/types/feeConfig.ts` — `InstallmentRow`, `CycleFeeConfig`

2. **Full 8-step wizard stepper from Step 1** — both create-cycle and EvaluationWorkflow now use the same combined step labels (7 for previous-cycle mode, 8 for fresh mode). Previously create-cycle only showed 4 steps.

3. **Upgrade/refund fee delta** — added `fee: number` to LPP type (different fees per program: CSE ₹7.8L, Mech ₹7L, ECE ₹7.4L, AI ₹8.5L). `feeDelta = newProgramFee - previousProgramFee` computed in `BulkOfferRelease.tsx` for upgraded students. Results table has two layouts: Cycle 1 = 5 columns, Cycle 2+ = 7 columns with Remarks + Fee Adjustment badge.

---

## Architecture Notes

- **Data store:** `src/lib/data/fileStore.ts` — in-memory store seeded with static data. Writable keys persist to `data/*.json`. On Vercel, disk writes silently fail; in-memory is the only truth within a single serverless instance lifetime.
- **Session strategy:** create-cycle wizard writes to `sessionStorage[cycle-{id}]` after creating. EvaluationWorkflow reads it on load for fast initial render, then always re-fetches evaluation from server to avoid stale IDs.
- **Stepper:** `WizardStepper` in `EvaluationWorkflow.tsx` (line ~119). Labels array switches based on `generationMode` ('fresh' = 8 steps, 'previous' = 7 steps). `activeStepNum` computed from `evalStep` state.
- **EvalStep flow:** `scores → offers → feeConfig → approval`

---

## TypeScript
Run `npx tsc --noEmit` to verify — was passing clean as of last session.
