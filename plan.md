# Evaluation Management System — Project Handoff

> Complete reference for any developer or AI picking up this project. Covers architecture, data models, API routes, business logic flows, algorithms, and design system.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Setup](#2-tech-stack--setup)
3. [Directory Structure](#3-directory-structure)
4. [Data Models](#4-data-models)
5. [API Reference](#5-api-reference)
6. [Page Routes](#6-page-routes)
7. [Business Logic Flows](#7-business-logic-flows)
8. [Algorithms](#8-algorithms)
9. [Data Store](#9-data-store)
10. [Session Storage](#10-session-storage)
11. [UI Components](#11-ui-components)
12. [CSS & Design System](#12-css--design-system)
13. [Key Constants](#13-key-constants)
14. [Known Limitations & TODOs](#14-known-limitations--todos)

---

## 1. Project Overview

An admissions evaluation management system for a university. It manages the end-to-end cycle of:

1. **Cycle Creation** — Define an admissions cycle for a program group, configure seat matrix, timelines, evaluation weights, and tiebreaker rules
2. **Score & Rank Generation** — Auto-compute composite scores and merit-order rankings per program and category
3. **Offer Release** — Run a preference-sequential allocation algorithm; each student gets at most one offer at their highest-preference program with available seats
4. **Approval** — Send evaluation + offer list to stakeholders for sign-off

### Key Concepts

| Term | Meaning |
|------|---------|
| **PTAT** | Program Type and Type — a program group (e.g., B.Tech, MBA) |
| **LPP** | Lateral Program/Programme — an individual program within a PTAT (e.g., B.Tech CSE) |
| **Cycle** | One admissions round for a PTAT in a given academic year |
| **Evaluation** | The scoring + ranking configuration attached to a Cycle |
| **Category** | Reservation category: General, OBC, SC, ST, EWS |
| **Strategy** | `single` = uniform weights for all programs; `program-wise` = each program has separate weights |

---

## 2. Tech Stack & Setup

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Plain CSS (`globals.css`) + inline styles |
| Data Store | In-memory (no database, no Redis) |
| State | React `useState` + `sessionStorage` for cross-page persistence |

### Running Locally

```bash
npm install
npm run dev        # starts on http://localhost:3000
```

### Reset All Data

```bash
POST /api/reset    # clears all writable data (cycles, evaluations, ranks, scores)
```

Seed data (PTATs, LPPs, Applications) always persists — it is read-only.

---

## 3. Directory Structure

```
src/
├── app/
│   ├── layout.tsx                        # Root layout (nav + toast provider)
│   ├── page.tsx                          # Home/dashboard — cycles table + quick actions
│   ├── globals.css                       # All global styles and CSS variables
│   ├── create-cycle/
│   │   └── page.tsx                      # 5-step cycle creation wizard
│   ├── cycle/
│   │   └── [id]/
│   │       └── evaluation/
│   │           └── page.tsx              # Thin wrapper → renders EvaluationWorkflow
│   └── api/
│       ├── applications/
│       │   ├── route.ts                  # GET /api/applications
│       │   └── [id]/route.ts             # GET /api/applications/:id
│       ├── ptats/
│       │   ├── route.ts                  # GET, POST /api/ptats
│       │   └── [id]/route.ts             # GET, PUT, DELETE /api/ptats/:id
│       ├── lpps/
│       │   ├── route.ts                  # GET, POST /api/lpps
│       │   └── [id]/route.ts             # GET, PUT, DELETE /api/lpps/:id
│       ├── cycles/
│       │   ├── route.ts                  # GET, POST /api/cycles
│       │   └── [id]/route.ts             # GET, PUT, DELETE /api/cycles/:id
│       ├── evaluations/
│       │   ├── route.ts                  # GET, POST /api/evaluations
│       │   └── [id]/
│       │       ├── route.ts              # GET, PUT /api/evaluations/:id
│       │       ├── generate-scores/route.ts    # POST — compute composite scores
│       │       └── generate-rankings/route.ts  # POST — compute rankings with tiebreakers
│       ├── evaluation-scores/
│       │   └── route.ts                  # GET /api/evaluation-scores
│       ├── rank-records/
│       │   └── route.ts                  # GET /api/rank-records
│       ├── tiebreaker-configs/
│       │   ├── route.ts                  # GET, POST /api/tiebreaker-configs
│       │   └── [id]/route.ts             # GET, PUT /api/tiebreaker-configs/:id
│       ├── criteria-sets/
│       │   ├── route.ts                  # GET, POST /api/criteria-sets
│       │   └── [id]/route.ts             # GET, PUT, DELETE /api/criteria-sets/:id
│       └── reset/
│           └── route.ts                  # POST — clears all writable data
│
├── components/
│   ├── evaluation/
│   │   ├── EvaluationWorkflow.tsx        # Merit list + offer release + approval wizard
│   │   └── BulkOfferRelease.tsx          # Offer config table + release algorithm + results
│   └── common/
│       └── ToastContext.tsx              # Toast notification context + hook
│
├── lib/
│   ├── data/
│   │   ├── fileStore.ts                  # In-memory data store with seed data
│   │   ├── applications.ts               # Application CRUD helpers
│   │   ├── cycles.ts                     # Cycle CRUD helpers
│   │   ├── evaluations.ts                # Evaluation CRUD helpers
│   │   ├── lpps.ts                       # LPP CRUD helpers
│   │   ├── ptats.ts                      # PTAT CRUD helpers
│   │   ├── rankRecords.ts                # RankRecord CRUD helpers
│   │   ├── evaluationScores.ts           # EvaluationScore CRUD helpers
│   │   └── tiebreakerConfigs.ts          # TiebreakerConfig CRUD helpers
│   └── engine/
│       ├── scoreEngine.ts                # Composite score calculation
│       └── rankEngine.ts                 # Ranking + tiebreaker logic
│
└── types/
    ├── application.ts                    # Application interface
    ├── cycle.ts                          # Cycle + CycleTimeline interfaces
    ├── evaluation.ts                     # Evaluation + ProgramConfig + TiebreakerRule
    ├── evaluationScore.ts                # EvaluationScore interface
    ├── rankRecord.ts                     # RankRecord interface
    ├── lpp.ts                            # LPP interface
    ├── ptat.ts                           # PTAT interface
    ├── criteriaSet.ts                    # CriteriaSet + Criterion interfaces
    └── offerResult.ts                    # StudentOfferResult + ProgramOfferResult
```

---

## 4. Data Models

### PTAT
```typescript
interface PTAT {
  id: string;           // "ptat_001"
  name: string;         // "B.Tech"
  code: string;         // "BTECH"
  description?: string;
  createdAt: string;    // ISO datetime
  updatedAt: string;
}
```

### LPP
```typescript
interface LPP {
  id: string;                              // "lpp_001"
  ptatId: string;                          // parent PTAT id
  name: string;                            // "B.Tech CSE"
  code: string;                            // "BTECH_CSE"
  duration: number;                        // years, e.g. 4
  totalSeats: number;                      // total across all categories
  categoryWiseSeats: Record<string, number>; // { "General": 60, "OBC": 32, "SC": 18, "ST": 6, "EWS": 4 }
  description?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Application (Student)
```typescript
interface Application {
  id: string;           // "app_001"
  studentName: string;  // "Arjun Sharma"
  rollNumber: string;   // "JEE24001"
  dateOfBirth: string;  // "2003-05-12"
  category: string;     // "General" | "OBC" | "SC" | "ST" | "EWS"
  lppPreference: string;          // primary LPP id (legacy single-preference field)
  lppPreferences: {               // ranked preference list (always populated for B.Tech)
    lppId: string;
    preferenceOrder: number;      // 1 = top choice
  }[];
  entranceScore: number;  // 0–300 (raw JEE-style score)
  academicScore: number;  // 0–100
  interviewScore: number; // 0–100
  applicationDate: string;
  createdAt: string;
  updatedAt: string;
}
```

### Cycle
```typescript
interface Cycle {
  id: string;           // "cycle_abc123"
  name: string;         // "B.Tech – 2025-2026 – Cycle 1" (auto-generated)
  number: number;       // 1, 2, 3 … per PTAT+year
  academicYear: string; // "2025-2026"
  hasPreviousCycle: boolean;
  ptatId: string;
  lppIds: string[];     // LPPs included in this cycle
  timeline: CycleTimeline;
  evaluationStrategy: 'single' | 'program-wise' | null;
  status: 'Planned' | 'Active' | 'Closed' | 'Approved';
  createdAt: string;
  updatedAt: string;
}

interface CycleTimeline {
  startDate: string;           // YYYY-MM-DD
  offerReleaseDate: string;
  acceptanceDeadline: string;
  paymentDeadline: string;
  closingDate: string;
}
// Constraint: startDate ≤ offerReleaseDate ≤ acceptanceDeadline ≤ paymentDeadline ≤ closingDate
```

### Evaluation
```typescript
interface Evaluation {
  id: string;           // "eval_xyz789"
  cycleId: string;
  strategy: 'single' | 'program-wise' | null;
  programConfigs: ProgramConfig[];   // one per LPP (or one 'all' for single strategy)
  tiebreakerRules: TiebreakerRule[];
  ranksGenerated: boolean;
  status: 'Draft' | 'Scored' | 'Ranked' | 'Approved';
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProgramConfig {
  programId: string;    // lpp id, or 'all' for single strategy
  programName: string;
  weights: {
    entrance: number;   // 0–100; all three must sum to 100
    academic: number;
    interview: number;
  };
  scoresGenerated: boolean;
}

interface TiebreakerRule {
  order: number;        // 0, 1, 2 (execution order)
  criterionId: 'entrance' | 'academic' | 'interview';
  criterionName: string;
  direction: 'DESC' | 'ASC';  // DESC = higher score wins tie
}
```

### EvaluationScore
```typescript
interface EvaluationScore {
  id: string;
  evaluationId: string;
  applicationId: string;
  programId: string;        // lpp id or 'all'
  entranceScore: number;    // raw (0–300)
  academicScore: number;    // raw (0–100)
  interviewScore: number;   // raw (0–100)
  compositeScore: number;   // weighted (0–100 scale, 2 decimal places)
  createdAt: string;
  updatedAt: string;
}
```

### RankRecord
```typescript
interface RankRecord {
  id: string;
  evaluationId: string;
  cycleId: string;
  applicationId: string;
  programId: string;        // lpp id (always per-program, never 'all' after generation)
  compositeScore: number;
  globalRank: number;       // rank across ALL students for this program
  programRank: number;      // rank within program (same as globalRank in current impl)
  categoryRank: number;     // rank within (program × category)
  category: string;         // copied from Application.category
  tieBreakerValues: Record<string, number>;  // { criterionId → value } — only if tie
  tieBreakerApplied: boolean;
  preferenceOrder: number;  // student's preference order for this program (1 = top choice)
  createdAt: string;
  updatedAt: string;
}
```

### StudentOfferResult (client-side only, not persisted)
```typescript
type OfferStatus = 'Offered' | 'Waitlisted' | 'NotConsidered' | 'None';

interface ProgramOfferResult {
  status: OfferStatus;
  waitlistNumber?: number;  // only when status = 'Waitlisted'
  categoryRank: number;
}

interface StudentOfferResult {
  applicationId: string;
  studentName: string;
  rollNumber: string;
  category: string;
  compositeScore: number;
  programResults: Record<string, ProgramOfferResult>;  // keyed by programId
  awardedProgramId: string | null;       // which program they were offered
  awardedPreferenceOrder: number | null; // pref order of awarded program
}
```

---

## 5. API Reference

### PTATs

| Method | URL | Body | Response | Notes |
|--------|-----|------|----------|-------|
| GET | `/api/ptats` | — | `PTAT[]` | All program groups |
| POST | `/api/ptats` | `{ name, code, description? }` | `PTAT` | Create |
| GET | `/api/ptats/:id` | — | `PTAT` | By ID |
| PUT | `/api/ptats/:id` | `{ name?, code?, ... }` | `PTAT` | Update |
| DELETE | `/api/ptats/:id` | — | `{ ok: true }` | Delete |

### LPPs

| Method | URL | Query | Body | Response | Notes |
|--------|-----|-------|------|----------|-------|
| GET | `/api/lpps` | `?ptatId=X` | — | `LPP[]` | Filter by PTAT |
| POST | `/api/lpps` | — | `{ ptatId, name, code, duration, totalSeats, categoryWiseSeats }` | `LPP` | Create |
| GET | `/api/lpps/:id` | — | — | `LPP` | By ID |
| PUT | `/api/lpps/:id` | — | partial LPP | `LPP` | Update |
| DELETE | `/api/lpps/:id` | — | — | `{ ok: true }` | Delete |

### Cycles

| Method | URL | Query | Body | Response | Notes |
|--------|-----|-------|------|----------|-------|
| GET | `/api/cycles` | `?ptatId=X&academicYear=Y&status=Z` | — | `Cycle[]` | Filtered list |
| POST | `/api/cycles` | — | `{ academicYear, ptatId, ptatName, lppIds, timeline, evaluationStrategy, programConfigs, tiebreakerRules }` | `{ cycle, evaluation }` | Creates both Cycle and Evaluation atomically |
| GET | `/api/cycles/:id` | — | — | `Cycle` | By ID |
| PUT | `/api/cycles/:id` | — | partial Cycle | `Cycle` | Update |
| DELETE | `/api/cycles/:id` | — | — | `{ ok: true }` | Delete |

### Evaluations

| Method | URL | Body | Response | Notes |
|--------|-----|------|----------|-------|
| GET | `/api/evaluations` | — | `Evaluation[]` | All evaluations |
| GET | `/api/evaluations/:id` | — | `Evaluation` | By ID |
| PUT | `/api/evaluations/:id` | partial Evaluation | `Evaluation` | Update |
| POST | `/api/evaluations/:id/generate-scores` | `{ programId, weights: { entrance, academic, interview }, applications: Application[] }` | `EvaluationScore[]` | Compute + store composite scores |
| POST | `/api/evaluations/:id/generate-rankings` | `{ programId, cycleId, tiebreakerRules, evaluationScores, applications }` | `RankRecord[]` | Rank students; apply tiebreakers |

### Other Routes

| Method | URL | Query | Response | Notes |
|--------|-----|-------|----------|-------|
| GET | `/api/applications` | `?search=X` | `Application[]` | Search by name or roll number |
| GET | `/api/applications/:id` | — | `Application` | By ID |
| GET | `/api/evaluation-scores` | `?evaluationId=X&programId=Y` | `EvaluationScore[]` | Filtered scores |
| GET | `/api/rank-records` | `?cycleId=X&programId=Y` | `RankRecord[]` | Filtered rankings |
| GET | `/api/tiebreaker-configs` | — | `TiebreakerConfig[]` | All configs |
| POST | `/api/tiebreaker-configs` | `{ evaluationId, rules }` | `TiebreakerConfig` | Create config |
| GET/PUT | `/api/tiebreaker-configs/:id` | — | `TiebreakerConfig` | Get/update |
| GET | `/api/criteria-sets` | — | `CriteriaSet[]` | All criteria sets |
| POST | `/api/criteria-sets` | `{ name, description, isCustom, criteria }` | `CriteriaSet` | Create |
| GET/PUT/DELETE | `/api/criteria-sets/:id` | — | `CriteriaSet` | CRUD |
| POST | `/api/reset` | — | `{ ok: true }` | **Clears all writable data** |

---

## 6. Page Routes

| URL | Description |
|-----|-------------|
| `/` | Home dashboard — table of all cycles, quick-create button, offer summary cards |
| `/create-cycle` | 5-step cycle creation wizard (+ auto-generates rankings on submit) |
| `/cycle/:id/evaluation` | Evaluation workflow: merit list → bulk offer release → approval |

---

## 7. Business Logic Flows

### 7.1 Create Cycle Wizard

**File:** `src/app/create-cycle/page.tsx`

The wizard has `totalSteps = 5` (fresh) or `4` (previous import mode). Each step validates before allowing Next.

---

#### Step 1 — Academic Year & Program Group

- User selects academic year from dropdown (2024-2025 … 2027-2028)
- User selects a PTAT (loaded from `GET /api/ptats`)
- On both selected: fetch LPPs (`GET /api/lpps?ptatId=X`) and cycle count (`GET /api/cycles?ptatId=X&academicYear=Y`)
- Cycle number = existing cycle count + 1
- Cycle name auto-set to `"{PTAT name} – {year} – Cycle {number}"`

#### Step 2 — Seat Matrix (read-only)

- Displays seat allocation for all LPPs in selected PTAT
- **Table layout:** rows = program × stat-type; columns = categories (General, OBC, SC, ST, EWS) + Total
- **Stats per cell:** Seats, Released, Accepted, Withdrawn, Pending, Applications
  - `seats` = `lpp.categoryWiseSeats[category]`
  - `released/accepted/withdrawn/pending` = `getOfferFigures(seats, cycleNumber)` — returns 0 for cycle 1, mock figures for later cycles
  - `applications` = count of `allApplications` where `lppPreference === lpp.id && category === cat`
- Grand totals row at bottom sums per category

#### Step 3 — Timelines

Five required date fields in chronological order:
1. Cycle Start Date
2. Offer Release Date
3. Acceptance Deadline
4. Payment Deadline
5. Cycle Closing Date

Validation: each date must be ≥ the previous one.

#### Step 4 — Evaluation Strategy

Two choices:
- **Single:** One weight config for all programs; ranks pool all applicants together
- **Program-wise:** Each program has its own weights and independent ranking

Two generation modes (shown as sub-options):
- **Fresh:** Use new weights + tiebreaker rules (unlocks Step 5)
- **Previous:** Import rankings from most recent approved cycle (skips Step 5; only available if `cycleNumber > 1`)

When "Previous" is selected, program configs default to `{ entrance: 60, academic: 30, interview: 10 }` and tiebreaker defaults to `[{ entrance, DESC }]`.

#### Step 5 — Criteria & Tiebreakers (fresh mode only)

**Sub-step A: Evaluation Weights**

- One weight row per LPP (program-wise) or a single row (single strategy)
- Three fields per row: Entrance %, Academic %, Interview %
- Default: 50 / 30 / 20
- Validation: must sum to 100 ± 0.5

**Sub-step B: Tiebreaker Rules**

- Ordered list (drag/arrow buttons to reorder)
- Each rule: criterion (entrance/academic/interview) + direction (High→Low or Low→High)
- Default: `[{ entrance, DESC }]`
- Up to 3 rules

#### Submission (Phase 1 — Create)

```
POST /api/cycles  {
  academicYear, ptatId, ptatName, lppIds, timeline,
  evaluationStrategy, programConfigs, tiebreakerRules
}
→ { cycle, evaluation }
```

Saves to `sessionStorage["cycle-${cycle.id}"]`:
```json
{ "cycle": {...}, "evaluation": {...}, "ptat": {...}, "lpps": [...], "generationMode": "fresh" }
```

#### Submission (Phase 2 — Auto-Generate Rankings)

Immediately after cycle creation, in the same button click:

1. `GET /api/applications` → fetch all applications
2. If `strategy === 'single'` and config has `programId: 'all'` with multiple LPPs:
   - Expand into per-LPP configs (same weights, separate calls)
3. For each program config:
   a. Filter applications to those who listed this program as a preference
   b. `POST /api/evaluations/:id/generate-scores` `{ programId, weights, applications }`
   c. `POST /api/evaluations/:id/generate-rankings` `{ programId, cycleId, tiebreakerRules, evaluationScores, applications }`
   d. Collect returned `RankRecord[]`
4. Update sessionStorage: add `rankRecords`, set `evaluation.ranksGenerated = true`, `evaluation.status = 'Ranked'`
5. Navigate to `/cycle/:id/evaluation`

---

### 7.2 Evaluation Workflow

**File:** `src/components/evaluation/EvaluationWorkflow.tsx`

Loads from `sessionStorage["cycle-${cycleId}"]` on mount (cycle, evaluation, lpps, ptat, rankRecords).

Three sub-steps controlled by `evalStep` state: `'scores' | 'offers' | 'approval'`

---

#### Sub-step: Scores & Merit List

KPI summary cards:
- Total Students (unique applicationIds in rankRecords)
- Programs Ranked (`uniqueProgramIds.length` — programs extracted from rankRecords)
- Strategy (Single / Program-wise)
- Tiebreakers Applied (count of students with `tieBreakerApplied = true`)

**Merit List Summary Table** (`buildSummary()`):
- Groups rankRecords by `(programId, category)`
- Columns: Program, Category, Students Ranked, Highest Score, Lowest Score, Avg Score
- Rows sorted by program order then by category (General, OBC, SC, ST, EWS)
- Program name shown only on first row per program group

**Ranking Table:**
- `isStudentCentric = uniqueProgramIds.length > 0` (always true after current fix)
- Student-centric view: one row per student
  - Fixed columns: Global Rank, App ID, Student Name, Category, Cat. Rank, Score
  - Dynamic columns per program: `{ShortName} Rank` + `{ShortName} TB` (tiebreaker info)
  - "—" if student didn't apply to that program
  - TB column shows criterion + value if tiebreaker was applied for that program
- Shows top 10 rows; "Download CSV" for full data

CSV download via `downloadCSV()` helper — includes all students, all program rank columns.

---

#### Sub-step: Bulk Offer Release

**File:** `src/components/evaluation/BulkOfferRelease.tsx`

**Phase 1 — Configure:**
- Table: Program | Category | Available Seats | Offers to Release (editable input)
- Rows: one per (program × category) combination
- Available seats = `lpp.categoryWiseSeats[category]`
- Offers to Release defaults to available seats; user can reduce
- "Reset to Defaults" restores all inputs

**Phase 2 — Release:** runs `releaseOffers()` algorithm (see §8.3), shows results

**Results table (preference-centric view):**
- One row per student (top 10 shown; CSV for full)
- Fixed columns: #, App ID, Student Name, Category, Score
- Dynamic columns: for each preference slot (Pref 1 … Pref N): Program Name + Status

Status per preference cell:
| Condition | Display |
|-----------|---------|
| `pref.lppId === awardedProgramId` | Green **Offered** badge |
| `pref.preferenceOrder > awardedPrefOrder` (lower priority than offer) | Gray italic *Not Considered* |
| `pref.preferenceOrder < awardedPrefOrder` (higher priority, didn't get) | Amber **WL #N** badge |
| Not offered anywhere | Amber **WL #N** for all prefs |
| Student didn't apply to this pref | `—` |

Category filter + "Reconfigure" button (goes back to config phase) + CSV download.

Summary cards: Offers Released, Waitlisted, Total Students, Programs.

---

#### Sub-step: Approval

- Displays 3 hardcoded approvers (Dean, Registrar, Director Academic) with emails
- "Send for Approval" button sets `evaluation.status = 'Approved'` and shows success state
- No actual email is sent (mock)

---

## 8. Algorithms

### 8.1 Composite Score Calculation

**File:** `src/lib/engine/scoreEngine.ts`

```
For each application:
  1. Normalize entrance score: normEntrance = (entranceScore / 300) × 100
  2. composite = (normEntrance × weights.entrance
                + academicScore × weights.academic
                + interviewScore × weights.interview) / 100
  3. Round to 2 decimal places
```

Weights are percentages (e.g., 50, 30, 20) that must sum to 100.

### 8.2 Ranking with Tiebreakers

**File:** `src/lib/engine/rankEngine.ts`

```
Sort students using multi-level comparator:
  1. compositeScore DESC (primary)
     — scores within 0.01 of each other are considered tied
  2. For each tiebreakerRule in order:
     — Get score for criterion (entrance/academic/interview)
     — Compare based on rule.direction (DESC or ASC)
     — If different: return comparison result
  3. Last resort: applicationId.localeCompare() (alphabetical, deterministic)

Assign globalRank: position 1, 2, 3 … in sorted order (no tied ranks — each is unique)

Assign categoryRank: separately sort students of same category by composite (same tiebreaker), assign 1, 2, 3 …

Mark tieBreakerApplied = true if student's score was within 0.01 of any adjacent student
Populate tieBreakerValues = { criterionId → score } for tied students only

Set preferenceOrder from Application.lppPreferences.find(p => p.lppId === programId)?.preferenceOrder
```

### 8.3 Offer Release Algorithm

**File:** `src/components/evaluation/BulkOfferRelease.tsx`, function `releaseOffers()`

This is a **preference-sequential merit-order allocation**. It runs entirely client-side.

```
Input:
  configRows:   { programId, category, offersToRelease }[]
  rankRecords:  RankRecord[]
  applications: Application[]
  appMap:       Map<appId, Application>

Step 1 — Initialize remaining seats
  remaining = Map<"programId::category" → offersToRelease>

Step 2 — Build ranked lists per (program, category)
  rankedLists = Map<"programId::category" → RankRecord[]>
  Each list sorted by categoryRank ASC (best rank first)

Step 3 — Sort all students by merit
  allStudentIds sorted by:
    compositeScore DESC (primary)
    globalRank ASC (tiebreak — deterministic)

Step 4 — Preference-sequential allocation
  for each studentId in merit order:
    prefs = student.lppPreferences sorted by preferenceOrder ASC
    for each pref in prefs:
      key = pref.lppId + "::" + student.category
      if remaining[key] > 0:
        awardedProgram[studentId] = pref.lppId
        awardedPrefOrder[studentId] = pref.preferenceOrder
        remaining[key] -= 1
        break   ← student gets at most ONE offer

Step 5 — Build programResults per student
  for each (student, program):
    if student has no rank record for this program:
      status = 'None'
    elif program === awardedProgram[student]:
      status = 'Offered'
    else:
      // Compute waitlist position
      list = rankedLists["program::student.category"]
      wlNum = 0
      for each entry in list (ordered by categoryRank):
        if awardedProgram[entry] === program: skip (they got this program)
        wlNum++
        if entry === student: break
      status = 'Waitlisted', waitlistNumber = wlNum

Step 6 — Sort results by compositeScore DESC, return
```

**Key invariants:**
- Every student appears at most once in any program's offered set
- A student with no matching open seat across all preferences gets no offer (WL everywhere)
- WL numbers are dynamic — they reflect how many non-offered students rank above you in that program/category

---

## 9. Data Store

**File:** `src/lib/data/fileStore.ts`

### Architecture

The store is a plain in-memory JavaScript object. No files are read or written at runtime. Seed data is injected at module initialization time and is never mutated.

```typescript
const store: Record<string, unknown[]> = {
  // Read-only (seeded, never cleared)
  'ptats.json':        [...],   // 4 PTATs
  'lpps.json':         [...],   // 14 LPPs
  'applications.json': [...],   // 80 Applications
  'criteria-sets.json':[...],   // 1 CriteriaSet

  // Writable (cleared by /api/reset)
  'cycles.json':            [],
  'evaluations.json':       [],
  'evaluation-scores.json': [],
  'tiebreaker-configs.json':[],
  'rank-records.json':      [],
};
```

### Public API

```typescript
readJson<T>(filename: string): Promise<T[]>    // returns store[filename] ?? []
writeJson<T>(filename: string, data: T[]): Promise<void>  // replaces store[filename]
resetStore(): void                             // clears all writable keys to []
```

### Seed Data

**PTATs:**
| ID | Name | Code |
|----|------|------|
| ptat_001 | B.Tech | BTECH |
| ptat_002 | M.Tech | MTECH |
| ptat_003 | MBA | MBA |
| ptat_004 | M.Sc | MSC |

**LPPs:**
| ID | Name | PTAT | Total Seats |
|----|------|------|-------------|
| lpp_001 | B.Tech CSE | ptat_001 | 120 |
| lpp_002 | B.Tech Mechanical | ptat_001 | 60 |
| lpp_003 | B.Tech ECE | ptat_001 | 80 (approx) |
| lpp_004 | B.Tech Civil | ptat_001 | 50 |
| lpp_005 | M.Tech CS | ptat_002 | 40 |
| lpp_006 | M.Tech Mechanical | ptat_002 | 30 |
| lpp_007 | M.Tech EEE | ptat_002 | 25 |
| lpp_008 | M.Tech Civil | ptat_002 | 20 |
| lpp_009 | M.Tech Electronics | ptat_002 | 15 |
| lpp_010 | MBA General | ptat_003 | 80 |
| lpp_011 | MBA Finance | ptat_003 | 60 |
| lpp_012 | MBA Technology | ptat_003 | 50 |
| lpp_013 | M.Sc Physics | ptat_004 | 45 |
| lpp_014 | M.Sc Chemistry | ptat_004 | 40 |

**Category-wise seat distribution (all LPPs):**
- General: ~50%, OBC: ~27%, SC: ~15%, ST: ~5%, EWS: ~3%

**Applications:**
| Range | PTAT | Preferences |
|-------|------|-------------|
| app_001–app_030 | B.Tech (ptat_001) | Full 4-program ranked preferences (BTECH_PREFS) |
| app_031–app_050 | M.Tech (ptat_002) | Single preference |
| app_051–app_070 | MBA (ptat_003) | Single preference |
| app_071–app_080 | M.Sc (ptat_004) | Single preference |

**B.Tech students (app_001–app_030)** all have `lppPreferences` with all 4 B.Tech LPPs ranked. Example:
```
app_001: [lpp_001(1), lpp_003(2), lpp_002(3), lpp_004(4)]  → CSE > ECE > Mech > Civil
app_079: [lpp_002(1), lpp_001(2), lpp_003(3), lpp_004(4)]  → Mech > CSE > ECE > Civil
```

**Criteria Set (seeded):**
- ID: `cs_001`, Name: "Standard Engineering Criteria"
- Criteria: Entrance (60%), Academic (30%), Interview (10%)

### Reset Behavior

`POST /api/reset` calls `resetStore()` which sets all writable keys to `[]`. The page also calls this automatically when a new browser session is detected (first visit or after server restart).

---

## 10. Session Storage

All data lives in `sessionStorage` (browser tab scope) to persist across page navigations without a database.

### Key: `cycle-${cycleId}`

```typescript
{
  cycle: Cycle,
  evaluation: Evaluation,          // includes ranksGenerated, status
  ptat: PTAT | null,
  lpps: LPP[],                     // LPPs for this cycle
  generationMode: 'fresh' | 'previous',
  rankRecords?: RankRecord[]        // populated after generation phase
}
```

Written: at end of create-cycle wizard (after generation)
Read: by `EvaluationWorkflow` on mount
Updated: after approval (status set to 'Approved')

### Key: `cycle-${cycleId}-offers`

```typescript
{
  released: number,   // count of students offered
  pending: number,    // count waitlisted
  accepted: number,   // always 0 (not tracked in UI yet)
  withdrawn: number   // always 0
}
```

Written: when user clicks "Release Offers" in BulkOfferRelease
Read: by home dashboard to show offer status per cycle

---

## 11. UI Components

| Component | File | Purpose |
|-----------|------|---------|
| EvaluationWorkflow | `components/evaluation/EvaluationWorkflow.tsx` | Orchestrates merit list, offer release, and approval; loads from sessionStorage |
| BulkOfferRelease | `components/evaluation/BulkOfferRelease.tsx` | Offer config table + `releaseOffers()` algorithm + preference-centric results table |
| ToastContext | `components/common/ToastContext.tsx` | Global toast notification context; use `useToast()` hook for `showToast(msg, type)` |
| WizardStepper | (inline in EvaluationWorkflow.tsx) | Horizontal step indicator with done/active/pending states |

The home page (`app/page.tsx`) is a client component that fetches cycles from the API and renders a table. Each row links to `/cycle/:id/evaluation`.

---

## 12. CSS & Design System

**File:** `src/app/globals.css`

### Color Tokens (CSS variables)

| Variable | Value | Use |
|----------|-------|-----|
| `--color-primary` | `#5C1010` | Maroon — buttons, headings, links |
| `--color-primary-hover` | `#7B1A1A` | Button hover |
| `--color-primary-light` | `#B04040` | Secondary text |
| `--color-primary-bg` | `#FEF2F2` | Card backgrounds, totals rows |
| `--color-bg` | `#F5F0F0` | Page background |
| `--color-border` | `#E8E0E0` | All borders |
| `--color-text` | `#1A1A1A` | Body text |
| `--color-text-muted` | `#6B6B6B` | Secondary text, labels |
| `--color-header-text` | `#B04040` | Table headers |

### Key CSS Classes

| Class | Purpose |
|-------|---------|
| `.btn-primary` | Maroon filled button |
| `.btn-secondary` | White button with maroon border |
| `.page-container` | Main content area padding (28px 32px) |
| `.page-header` | Flex row: title left, actions right |
| `.page-title` | Large maroon heading |
| `.wizard-progress` | Horizontal stepper container |
| `.wizard-step-indicator` | One step circle + label; states: `active`, `done`, `pending` |
| `.step-connector` | Line between step circles; `.done` turns maroon |
| `.wizard-card` | White card for wizard step content; `max-width: 680px` by default |
| `.step-title` | H2 inside wizard card |
| `.step-subtitle` | Muted description under step title |
| `.data-table` | Table with maroon uppercase headers, hover rows |
| `.form-input` | Styled text input |
| `.badge` | Inline label chip |
| `.badge-success` | Green (#f0fdf4 / #166534) |
| `.badge-warning` | Yellow (#fffbeb / #92400e) |
| `.badge-default` | Gray |
| `.badge-gray` | Light gray |
| `.badge-maroon` | Maroon (#F5EAEA / #5C1010) |
| `.spinner` | Rotating border animation |
| `.strategy-card` | Clickable radio card for strategy selection |

### Category Badge Colors (inline)

| Category | Background | Text |
|----------|-----------|------|
| General | `badge-default` gray | gray |
| OBC | `badge-warning` yellow | amber |
| SC | `badge-success` green | green |
| ST | `badge-gray` | muted |
| EWS | `badge-maroon` | maroon |

---

## 13. Key Constants

```typescript
// Categories (all components)
const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS'];

// Academic years available in wizard
const ACADEMIC_YEARS = ['2024-2025', '2025-2026', '2026-2027', '2027-2028'];

// Tiebreaker criterion options
const CRITERION_OPTIONS = [
  { id: 'entrance',  label: 'Entrance Score' },
  { id: 'academic',  label: 'Academic Score' },
  { id: 'interview', label: 'Interview Score' },
];

// Pagination (EvaluationWorkflow + BulkOfferRelease)
const PAGE_SIZE = 15;

// Default weights — fresh generation
entrance: 50, academic: 30, interview: 20

// Default weights — previous cycle import
entrance: 60, academic: 30, interview: 10

// Hardcoded approvers (no actual email sent)
[
  { name: 'Dean of Admissions',  email: 'dean@university.edu' },
  { name: 'Registrar',           email: 'registrar@university.edu' },
  { name: 'Director Academic',   email: 'director@university.edu' },
]

// Offer results table: always shows top 10 (not paginated)
// Full data available via CSV download
```

---

## 14. Known Limitations & TODOs

| Area | Limitation | Notes |
|------|-----------|-------|
| **Persistence** | All writable data is in-memory; resets on server restart | Replace with a real DB (PostgreSQL, SQLite, etc.) for production |
| **Authentication** | No auth — any user can access all data | Add NextAuth or similar |
| **Offer figures** | Released/Accepted/Withdrawn/Pending numbers for cycle > 1 are mock (calculated as % of seats) | Connect to real offer tracking data |
| **Applications** | Applications are seeded and read-only; no UI to add/edit applications | Build application submission form |
| **Offer results** | Offer release runs client-side and is not persisted | Persist StudentOfferResult to the server after release |
| **Previous cycle import** | "Import from previous cycle" just uses the same mock weights; doesn't actually read the previous cycle's rank records | Implement real cross-cycle rank import |
| **Seat updates** | LPP seat counts are fixed in seed data; no UI to update seats per cycle | Allow per-cycle seat overrides |
| **Wizard card width** | Step 2 (Seat Matrix) forces `max-width: 980px` via inline override | Consider a full-width layout mode for data-heavy steps |
| **Tiebreaker max** | UI limits to 3 tiebreaker rules | Constraint is arbitrary; can be removed |
| **CSV export** | Rankings CSV has all data; offer results CSV top-10 only in UI (download gives full) | Confirm correct behaviour with stakeholders |
| **Single vs program-wise** | Both strategies now generate per-LPP rank records (single uses same weights for all LPPs) | The distinction between strategies is minimal in the data layer |
