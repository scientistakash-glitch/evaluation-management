# Comprehensive Functional Specification: Admissions Evaluation Engine

This document provides a highly structured, top-to-bottom master blueprint of the Admissions Evaluation Management System. It acts as the definitive source of truth for all logical flows, fields, data sources, and algorithms.

---

## 0. Top-Level Flow & Dashboard
The "Command Center" where admissions teams monitor the structural health of active cycles.

### 1. Objective
To provide a macro-level view of all current, draft, and completed admission cycles segmented by Program Groups (PTATs), showing instantaneous capacity vs. demand metrics.

### 2. Logical Flow & Process
1. Base load: The dashboard fetches all existing cycles from the `cycles.json` data store.
2. The user sees a summarized table card for every Cycle created.
3. If no draft exists, the user clicks "Create New Cycle" to enter the Evaluation Wizard (Step 1).

### 3. Fields & Data Sources
| Field Name | Component Type | Description | Source / Integration | Configurable via Backend? |
| :--- | :--- | :--- | :--- | :--- |
| **Program Group** | Table Cell | The PTAT & Year (e.g., B.Tech 2026-2027) | `cycles.json` join `ptats.json` | Yes (API additions) |
| **Cycle Status** | Badge | The current state of the evaluation cycle. | `Evaluation.status` | No (System driven) |
| **Offers Released** | Number | Total offers fired in this specific cycle. | `studentResults` collection | No (Derived count) |
| **Accepted** | Number | Students who paid the commitment fee. | Payment gateway sync / Webhook | Yes (Salesforce integration) |

### 4. Business Logic & Rules
- **Cycle Status State Machine**:
    1. `Draft` (Mid-wizard config).
    2. `Ranked` (Step 5 complete).
    3. `Approval Pending` (Step 8 triggered).
    4. `Approved` (Stakeholders verified).
    5. `Released` (Offers sent via portal/email integration).

### 5. Tables & Examples
**Admissions Overview Grids**
*Table Anatomy:* A row-based summary of critical throughput metrics for every established cycle.
| Program Group | Program Plan (LPPs) | Cycle Status | Offers | Accepted | Withdrawn | Pending |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| B.Tech – Cycle 1 | CSE, IT, MECH | Released | 150 | 90 | 10 | 50 |
| M.Tech – Cycle 1 | AI, VLSI | Ranked | 0 | 0 | 0 | 0 |

---

## 1. Wizard Step 1: Program Group & Initiation
Creating the administrative bounds for the cycle.

### 1. Objective
Identify which group of applicants and programs are being isolated for this specific ranking event. 

### 2. Logical Flow & Process
1. System queries the Master Program Database (`/api/ptats` and `/api/lpps`).
2. User selects the Academic Year.
3. User selects the Program Group (PTAT).
4. System automatically determines the correct chronological Cycle Number for this specific Year/Group pair.

### 3. Fields & Data Sources
| Field Name | Component Type | Description | Source / Integration | Configurable via Backend? |
| :--- | :--- | :--- | :--- | :--- |
| **Academic Year** | Select | Range of valid enrollment years. | Static System Array | Yes (Code-level edit) |
| **Program Group** | Dropdown | Master list of umbrella degrees. | `/api/ptats` (DB Table) | Yes (CRUD via Admin) |
| **Cycle Number** | Read-only Text| Auto-assigned chronological ID. | Derived internally | No |

### 4. Business Logic & Rules
- **Cycle Auto-Numbering Formula**: `Cycle_Num = Count(Existing Cycles WHERE PTAT == selectedGroup AND Year == selectedYear) + 1`.

---

## 2. Wizard Step 2: Cycle Date Definitions
Legal and administrative timelines dictating student consequences.

### 1. Objective
Establish distinct deadlines that integrate with the central Finance/Student Portal system regarding refunds.

### 2. Logical Flow & Process
1. System generates a non-editable 'Cycle Created Date'.
2. User provides the date/time cut-off for "Withdrawal with Refund".
3. User provides the date/time cut-off for "Withdrawal without Refund".
4. Validation checks if the dates are chronologically logical.

### 3. Fields & Data Sources
| Field Name | Component Type | Description | Source / Integration | Configurable? |
| :--- | :--- | :--- | :--- | :--- |
| **Cycle Created Date**| Read-only | The timestamp of initiation. | Local system clock | No |
| **Refund Date** | DateTime Input | Deadline to recoup the commitment fee. | User Input -> `cycles.json` | No |
| **No-Refund Date** | DateTime Input | Hard deadline to drop the seat. | User Input -> `cycles.json` | No |

### 4. Business Logic & Rules
- **Chronological Restraint**: `Refund Date` must be chronologically **greater than or equal to** `Cycle Created Date`.
- **Penalty Restraint**: `No-Refund Date` must be chronologically **greater than or equal to** `Refund Date`.

---

## 3. Wizard Step 3: Evaluation Strategy
Defining the architecture of how the merit lists are processed.

### 1. Objective
Determine whether the evaluation logic runs in isolated program buckets (Program-wise) or targets the entire umbrella PTAT (Single), and whether to calculate fresh scores or import a waitlist. 

### 2. Logical Flow & Process
1. User selects Strategy (`Single` vs `Program-wise`).
2. User selects Generation Mode (`Fresh` vs `Previous`).
3. If `Previous` is selected AND there is no prior Cycle, the UI dynamically disables the radio button.

### 3. Fields & Data Sources
| Field Name | Component Type | Description | Source / Integration | Configurable? |
| :--- | :--- | :--- | :--- | :--- |
| **Evaluation Strategy**| Radio Group | How scores are calculated. | `Single` or `Program-wise` | No |
| **Generation Mode** | Radio Group | Where applicant data originates. | `Fresh` or `Previous` | No |

### 4. Business Logic & Rules
- **Carry-Over Validation**: `Previous` mode can only be active if `Count(cycles where ptatId == user_ptat AND status == 'Released') > 0`.
- **Waitlist Logic (If Previous Mode)**: The system filters `applications.json` to **exclude** any student IDs that were marked `Accepted` or `Pending` in Cycle N-1. The remnants become the "Carry-Over Waitlist".

---

## 4. Wizard Step 4: Criteria Configuration & Tiebreakers
The mathematical "Anjali Matrix" engine room.

### 1. Objective
Define the normalized mathematical weights and strict tiebreaker policies used to sort students into an absolute merit order.

### 2. Logical Flow & Process
1. System renders weight inputs for Entrance, Academic, and Interview scores per program.
2. User specifies integer percentages.
3. System verifies `Total % == 100`.
4. User clicks "Tiebreakers" tab to define priority handling for identical scores.

### 3. Fields & Data Sources
| Field Name | Component Type | Description | Source / Integration | Configurable? |
| :--- | :--- | :--- | :--- | :--- |
| **Entrance Weight** | Number Input | % importance of external test. | User Input -> `evaluation.weights`| Yes (Per program) |
| **Academic Weight** | Number Input | % importance of GPA/Boards. | User Input -> `evaluation.weights`| Yes (Per program) |
| **Interview Weight**| Number Input | % importance of personal interview. | User Input -> `evaluation.weights`| Yes (Per program) |
| **Criterion Priority**| Select Box | Trait to check if composite scores tie. | Static array | Yes (UI reordering) |

### 4. Business Logic & Rules
- **The "Anjali" Normalization Formula**:
  `( (Applicant_Entrance_Score / 300) * 100 * (W_ent% / 100) ) + (Applicant_Academic * W_acad%) + (Applicant_Interview * W_int%)`
- **Arithmetic Precision**: Calculated composites are rounded to exactly **two decimal places** (e.g., `87.45`).
- **Tiebreaker Fallback Flow**:
  1. Priority 1 Criteria (Highest value wins).
  2. Priority 2 Criteria (Highest value wins).
  3. String comparison sorting of `Application ID` (Fallback logic).

---

## 5. Wizard Step 5: Merit Ranking Disclosure
Visualizing the results of the configured criteria engine.

### 1. Objective
Allow the human user to audit the processed list of applicants before allocating seats.

### 2. Logical Flow & Process
1. System executes the ranking logic against `applications.json`.
2. System pushes generated data into a Data Table.
3. User views dual rankings (Global vs Category).

### 4. Business Logic & Rules
- **Category Isolation**: Category Rank resets to `1` for every independent permutation of `(Program, Category)`. Global rank scopes only the `Program Group` level.

### 5. Tables & Examples
**The Merit Roster**
*Table Anatomy:* A read-only grid providing verification of the Anjali algorithm outputs and tiebreakers.
| Student Name | App ID | Category | Entrance | Acad | Int | Composite Score | Global Rank | Category Rank |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Aarav Sharma | APP_101| General | 280 | 95 | 90 | **94.25** | 1 | 1 |
| Aditi Patel | APP_102| OBC | 275 | 92 | 85 | **89.10** | 2 | 1 |

---

## 6. Wizard Step 6: Bulk Offer Release (The Ripple Effect)
The most complex operational step balancing supply and auto-cascading rules.

### 1. Objective
Configure the amount of seats to release into the applicant pool, forcing the system to map available supply to student demand via preferences. 

### 2. Logical Flow & Process
1. System renders an aggregated matrix of every independent Program + Category permutation.
2. System reads the base capacity limits from the LPP Master configuration.
3. User designates an `Offers to Release` integer.
4. Internal algorithm processes Cycle 1 waitlists to calculate "Eligible Upgrades", resolving the "Ripple Effect".
5. Results Grid previews exactly who gets what allocation.

### 3. Fields & Data Sources
| Field Name | Component Type | Description | Source / Integration | Configurable? |
| :--- | :--- | :--- | :--- | :--- |
| **Approved Intake** | Label | Absolute legal max capacity. | `lpps.json` subcategories | Yes (via Admin DB) |
| **Offers to Release**| Number Input | Target batch size to fire today. | User Input | Yes |

### 4. Business Logic & Rules
- **The 75% Eligible Pool Rule**: `Eligible Pool = Math.round(Count(Program Applicants) * 0.75)`. Only the upper 75% quartile is considered.
- **The Ripple Effect Model**: 
  1. *Upgrade Check*: Was "Student X" accepted in Cycle 1? Are there seats in their preferred Cycle 2 choice?
  2. *Execute*: Move Student X to Cycle 2 choice. Award prefix `Upgraded`.
  3. *The Ripple*: Immediately augment `Available Seats` for Student X's old program by `+1`. Release that specific seat downward to a fresh applicant.

### 5. Tables & Examples
**Seat Config Matrix**
*Table Anatomy:* Real-time calculator exposing current capacities versus the waitlist.
| Program Plan | Category | Approved Intake | Committed | Available Seats | Eligible Pool | Offers to Release | Waitlisted |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| B.Tech CSE | General | 60 | 45 | 15 | 120 | **15** | 105 |

**Offer Release Output (Preview)**
*Table Anatomy:* Final mapping result of applicant identity to offered program.
| Student Name | App ID | C1 Program | Upgrade To | Pref Order | Output Remark |
| :--- | :--- | :---: | :---: | :---: | :--- |
| Aarav S. | APP_101| IT | CSE | 1 | 🔼 Upgraded |
| Chetan V. | APP_444| — | ECE | 2 | ✦ Fresh Allotment |

---

## 7. Wizard Step 7: Fee Configuration
Translating the academic decision into a financial directive.

### 1. Objective
Define the payment plan architecture and detect invoice vs. refund scenarios for upgraded students before generating the portal ledger.

### 2. Logical Flow & Process
1. System groups the evaluation tree by Program ID.
2. User selects an Installment Split (e.g. `50/50`).
3. User specifies exact dates the installments are legally due.

### 3. Fields & Data Sources
| Field Name | Component Type | Description | Source / Integration | Configurable? |
| :--- | :--- | :--- | :--- | :--- |
| **Base Program Fee**| Label | Cost of the degree. | `lpps.json` (Per program) | Yes (via Admin DB) |
| **Installment Plan**| Select Dropdown| Structural tiering of amounts. | Hardcoded System Constants| Yes (Code Level) |
| **Due Date** | DateTime Input | Legal deadline for payment. | User Input | Yes |

### 4. Business Logic & Rules
- **Split Validation**: Total sum of user-input installment amounts **must** `== Base Program Fee`.
- **Financial Delta Detection**:
  - `New Target Fee` minus `Previous Paid Fee` = `Delta`.
  - IF Delta > 0 = **Invoice** (Student owes difference).
  - IF Delta < 0 = **Refund** (Student is owed difference).

### 5. Tables & Examples
**Fee Allocation Matrix**
*Table Anatomy:* Detailed financial split assigned to the specific program cohort.
| Program | Subcategory | Total Fee | Plan Type | Inst # | Amount (₹) | % | Due Date | Status |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| M.Tech AI | General | ₹150,000 | Two equal (50/50) | 1 | 75,000 | 50% | 04-15-2026 | ✅ Done |
| M.Tech AI | General | ₹150,000 | Two equal (50/50) | 2 | 75,000 | 50% | 06-15-2026 | ✅ Done |

---

## 8. Wizard Step 8: Stakeholder Approval Workflow
The final human layer of checks and balances.

### 1. Objective
Lock the configurations and solicit cryptographic or system approval from authorized personas before firing live data endpoints to Salesforce and student emails.

### 2. Logical Flow & Process
1. Cycle Status updates to `Approval Pending`. 
2. A payload of the Draft Evaluation object is generated.
3. System awaits three distinct user-role verified clicks.
4. Final approval flips Cycle Status to `Released`.

### 3. Business Logic & Rules
- **Post-Approval Config Lock**: Once `Status == Approved` or `Status == Released`, NO user can edit the Evaluation Weights (Step 4), The Seat Configurations (Step 6), or the Fees (Step 7). Changing these necessitates a full override forcing status back to `Draft`.
- **Required Stakeholders**:
  1. **Dean of Admissions**: Merits verified.
  2. **Registrar**: Sanctioned matrix and intake legality verified.
  3. **Director Academic**: Final Go/No-Go signature.
