# User Flow — Admissions Cycle Management

**App:** Evaluation Management System
**Reviewed:** 2026-04-07

---

## Pre-Conditions

- Admin is logged in
- Demo data is seeded: 1,080 student applications (80 hardcoded + 1,000 generated B.Tech)
- `data/offer-releases.json` has 14 students marked `Accepted` from a prior Cycle 1 run

---

## Flow A — Create a Fresh Cycle (Cycle 1 / First Time)

### Step 1 — Year & Group (`/create-cycle`)

1. Page loads with stepper showing all 4 steps (or 3 if Previous Cycle mode is later chosen)
2. Admin selects **Academic Year** from dropdown (e.g. 2026-2027)
3. Admin selects **Program Group (PTAT)** → system fetches LPP list and auto-fills:
   - **Cycle #** — computed as `existing cycles for this PTAT + 1`
   - **Programs included** — list of LPP names under the selected PTAT
4. Admin clicks **Next →**

### Step 2 — Cycle Dates

5. Admin enters **Withdrawal with Refund** deadline (datetime)
6. Admin enters **Withdrawal without Refund** deadline (must be ≥ refund deadline)
7. Admin clicks **Next →**

### Step 3 — Strategy

8. Admin selects **Scoring Strategy**: Single (one score for all) or Program-wise (per program)
9. Admin selects **Generation Mode**: Fresh (from scratch) or Previous Cycle (import prior ranks)
   - If Previous Cycle → cycle is created immediately, skips Step 4, redirects to `/cycle/{id}/evaluation`
10. Admin clicks **Next →** (Fresh mode proceeds to Step 4)

### Step 4 — Criteria & Tiebreakers

**Sub-step A: Scoring Weights**

11. Table shows one row per program (or "All Programs" for Single strategy)
12. Admin enters Entrance %, Academic %, Interview % — must sum to 100 per row
13. Default values: Entrance 50%, Academic 30%, Interview 20%
14. Admin clicks **Next: Tiebreakers →**

**Sub-step B: Tiebreaker Rules**

15. Default: Entrance Score, High → Low
16. Admin can add/remove/reorder rules using + Add, ↑ ↓, ✕ buttons
17. Each criterion (Entrance, Academic, Interview) can only be used once
18. Admin clicks **Create Cycle & Generate Rankings →**

### Processing Overlay (Rankings Generation)

19. Full-screen overlay appears with:
   - Spinner
   - Title: "Generating Rankings"
   - Subtitle: "Processing all student applications and computing the merit list."
   - Animated step checklist (steps illuminate as they complete):
     1. Fetching student applications
     2. Computing composite scores
     3. Applying tiebreaker rules
     4. Sorting merit list
     5. Finalising rank records
   - Email banner: *"A confirmation email will be sent to your registered email ID once this process is complete."*

20. Behind the overlay, the system:
    - `POST /api/cycles` → creates cycle + evaluation record
    - `POST /api/evaluations/{id}/generate-scores` (once per program)
    - `POST /api/evaluations/{id}/generate-rankings` (once per program)
    - Caches result in `sessionStorage[cycle-{id}]`
    - Deletes `localStorage` draft

21. Overlay disappears → admin is redirected to `/cycle/{id}/evaluation`

---

## Flow B — Evaluation Workflow (`/cycle/{id}/evaluation`)

Page loads from `sessionStorage` first (fast), then always re-fetches evaluation from server. If server returns empty but session has data, session is preserved.

### Step 5 — Scores & Merit

22. **KPI Cards** displayed:
   - Total Students | Programs Ranked | Strategy | Tiebreakers Applied

23. Admin reviews the merit list

24. Admin clicks **↓ Download Merit List CSV** (optional) → downloads `rankings.csv`

25. Admin clicks **Next: Bulk Offer Release →**

---

### Step 6 — Bulk Offers (Phase 1: Configuration)

#### Cycle 1 Mode

26. Config table shown with columns:
    - Program Plan | Category | Subcategory | Approved Intake | Applicants | Eligible Pool | Offers to Release | Waitlisted for Next Cycle

27. Admin adjusts **Offers to Release** per row (default = Approved Intake)

28. Admin clicks **Release Offers**

#### Cycle 2+ Mode (when Cycle 1 has accepted students)

26. **Carry-over summary card** shown at top:
    - Accepted (paid): 14 | Waitlisted: N | Out of Pool: N

27. Config table has extra columns:
    - **Committed (Fee Paid)** — C1 accepted students still in this program
    - **Available Seats** — Approved Intake minus Committed
    - **Eligible for Upgrade** — C1 accepted students who can move to a higher preference (live-recalculates as Offers to Release changes)

28. When admin edits Offers to Release → **Upgrade Preview Modal** opens automatically:
    - Shows up to 10 upgrade-eligible students
    - Columns: Student Name | Application ID | Category | C1 Program | Upgrade To (green)
    - Download button: **↓ Download CSV — All** → `upgrade-candidates.csv`

29. Admin clicks **Release Offers**

### Processing Overlay (Offer Release)

30. Full-screen overlay appears with:
    - Spinner
    - Title: "Releasing Offers"
    - Subtitle: "Allocating seats based on merit, category quotas, and preferences."
    - Animated step checklist:
      1. Analysing seat availability
      2. Processing upgrades
      3. Allocating fresh offers
      4. Updating waitlist
      5. Saving results
    - Email banner: *"A confirmation email will be sent to your registered email ID once this process is complete."*

31. Behind the overlay:
    - Algorithm runs Pass 1 (upgrades for C1 accepted students)
    - Algorithm runs Pass 2 (fresh allocation for all others)
    - Results `POST`-ed to `/api/cycles/{id}/offer-release`
    - Cached in `sessionStorage`

32. Overlay disappears → Results table appears

### Step 6 — Bulk Offers (Phase 2: Results)

#### Cycle 1 — 5-column table:
| Student Name | Application ID | Category | Program Offered | Score |

#### Cycle 2+ — 7-column table:
| Student Name | Application ID | Category | Program Offered | Score | Remarks | Fee Adjustment |

**Remarks values:**
- 🔼 Upgraded — moved to higher-preference program
- ═ Status Quo — stayed in same C1 program
- ✦ Fresh Allotment — new student or C1 waitlisted
- ★ Waitlist Improvement — improved waitlist position

**Fee Adjustment (Cycle 2+ only):**
- `feeDelta > 0` → Red badge: "Pay ₹X more"
- `feeDelta < 0` → Green badge: "Refund ₹X"
- `feeDelta = 0` and upgraded → Grey: "No change"
- StatusQuo / Fresh / Waitlisted → `—`

**Fee reference (per program):**
- B.Tech CSE = ₹7,80,000
- B.Tech Mech = ₹7,00,000
- B.Tech EXTC = ₹7,40,000
- B.Tech AI = ₹8,50,000

**Waitlisted students** shown in collapsible section below — 3 columns only.

**Cycle 2+ summary badges:** Upgraded N | Status Quo N | Fresh N

33. Admin clicks **↓ Download Offer Results CSV** (optional) → `offer-results.csv`

34. Admin clicks **Proceed to Fee Config →**

---

### Step 7 — Fee Config

35. Page loads existing config from `GET /api/cycles/{id}/fee-config` (if previously saved)

36. Admin selects **Installment Plan** (card-style radio):
    - INSTA 1 — Single payment (100%)
    - INSTA 2 — Two equal payments (50/50)
    - INSTA 3 — Three payments (30/30/40)

37. Selecting a plan auto-populates the **Due Dates table**:
    | # | % of Program Fee | Due Date |
    Each row requires a due date before Save is enabled.

38. Admin fills all due dates

39. Admin clicks **Save & Continue →** → `POST /api/cycles/{id}/fee-config` → moves to Approval

---

### Step 8 — Approval

40. Page shows 3 hardcoded approvers:
    - Dean of Admissions — dean@university.edu
    - Registrar — registrar@university.edu
    - Director Academic — director@university.edu

41. Admin clicks **Send for Approval** → `POST /api/evaluations/{id}/approve`
    - Sets evaluation status → `Approved`
    - Sets cycle status → `Approved`

42. Inline success confirmation shown

43. Admin clicks **Back to Cycle Overview →** → navigates to `/cycle/{id}/view`

---

## Flow C — Previous Cycle Mode (Cycle 2 with imported ranks)

Same as Flow A Steps 1–3, but at Step 3:
- Admin selects **Generation Mode: Previous Cycle**
- System creates cycle immediately (no Step 4 criteria/tiebreakers)
- Ranks are imported from previous cycle
- Redirects directly to `/cycle/{id}/evaluation` at Step 5
- Evaluation workflow proceeds as Flow B from Step 22 onwards (with Cycle 2+ UI)

---

## Data Verification Summary (Pre-Prod)

| Check | Status |
|-------|--------|
| TypeScript compilation | ✅ Clean (0 errors) |
| `execSync` removed from fileStore | ✅ |
| `applications.json` removed from WRITABLE_KEYS | ✅ |
| `storeInitialized` declared before `resetStore` | ✅ |
| EvaluationWorkflow session guard (`!sessionData?.evaluation`) | ✅ |
| ProcessingOverlay renders on rankings generation | ✅ |
| ProcessingOverlay renders on offer release | ✅ |
| Email notification banner in overlay | ✅ |
| 14 accepted students in offer-releases.json | ✅ |
| 8 upgradeable (pref > 1) + 6 StatusQuo (pref = 1) | ✅ |
| All 14 student IDs in SEED_READONLY (hardcoded or generated 101–1100) | ✅ |
| Cycle 1 status = "Released" (valid for previous-offer-results API) | ✅ |
| Cycle 1 offer release cycleId matches Cycle 1 id | ✅ |
| Cycle 2 `hasPreviousCycle = true` | ✅ |
| API: `previous-offer-results` returns 14 accepted, 8 upgradeable | ✅ |
| API: `evaluations?cycleId=X` query param works | ✅ |
| API: `fee-config` GET + POST both work | ✅ |
| API: `approve` sets both evaluation + cycle to Approved | ✅ |
| `export const dynamic = 'force-dynamic'` on all API routes | ✅ |
