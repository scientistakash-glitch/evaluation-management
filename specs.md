# Functional Specifications: Admissions Evaluation Management System

## 1. System Objective
The primary objective of the Evaluation Management System is to facilitate **Bulk Offer Release** across multiple admission cycles (Cycle 1, Cycle 2, and Cycle 3). The system manages the transition of students between cycles, automates merit ranking, and handles complex seat/fee adjustments during program upgrades.

---

## 2. Dashboard: Admissions Cycles Overview
The home page serves as the central command center for all admission activities. 

### **Admissions Cycles Table**
The main table gives an immediate overview of the system state:
- **Program Group**: The high-level category (PTAT), Academic Year, and Cycle Number.
- **Program Plan**: The specific courses included in the cycle (e.g., B.Tech CSE · B.Tech MECH).
- **Cycle Status**: 
    - `Draft`: Initial setup, no offers generated.
    - `Approval Pending`: Offers generated, awaiting stakeholder sign-off.
    - `Review Needed`: Cycle closed but requires final data validation.
    - `Approved`: Ready for student release.
    - `Released`: Offers are live to students.
- **Offers Released**: Total number of offer letters generated and sent.
- **Accepted**: Students who have committed by accepting the offer and/or paying fees.
- **Withdrawn**: Students who have declined or withdrawn from the process.
- **Pending Acceptance**: Students who have received an offer but not yet responded.

### **Sample Dashboard Data**
| Program Group | Program Plan | Cycle Status | Offers Released | Accepted | Withdrawn | Pending Acceptance |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| B.Tech (2025-26) · Cycle 1 | B.Tech CSE · B.Tech IT | Released | 120 | 85 | 10 | 25 |
| B.Tech (2025-26) · Cycle 2 | B.Tech CSE · B.Tech ECE | Approved | 0 | 0 | 0 | 0 |
| MBA (2025-26) · Cycle 1 | MBA HR · Marketing | Review Needed | 80 | 45 | 5 | 30 |

---

## 3. Evaluation Setup & Strategy

### **Step 1: Initiation & Timeline**
1. **Academic Year & PTAT**: Initial selection.
2. **Timeline Selection**:
    - Offer Release Date.
    - Acceptance & Payment Deadlines.
    - Closing Date.
    > [!IMPORTANT]
    > **Salesforce Integration**: These dates are **configurable from the Salesforce backend**. The dates established in Salesforce are what the administrator or student will see and use within this system.

### **Step 2: Merit Strategy**
- **Single Merit List**: Global ranking across all programs in the PTAT.
- **Program-wise Merit List**: Independent rankings per course based on student preference.

### **Step 3: Ranking & Scoring (Anjali's Matrix)**
> [!IMPORTANT]
> **Use the evaluation matrix system developed by Anjali as is.**
- **Weighted Formula**: `(Entrance Score * 0.6) + (Past Academic * 0.3) + (Interview * 0.1)`.
- **Tiebreaker**: Entrance > Academic > Interview.

### **Sample Merit List Data**
| Student Name | Application ID | Category | Composite Score | Global Rank | Category Rank |
| :--- | :--- | :--- | :--- | :---: | :---: |
| Aarav Sharma | APP_101 | General | 94.2 | 1 | 1 |
| Aditi Patel | APP_102 | General | 92.8 | 2 | 2 |

---

## 4. Bulk Offer Release: Multi-Cycle Scenarios

When generating offers, the system behaves differently depending on whether it carries over data from a previous cycle.

### **Scenario A: Cycle 1 (Initial Allotment)**
Focused on the initial eligible pool and sanctioned intake.
| Field | Definition |
| :--- | :--- |
| **Approved Intake** | Total sanctioned seats for the subcategory. |
| **Applicants** | Total students who applied for this program. |
| **Eligible Pool** | Students meeting the minimum criteria (Cycle 1). |
| **Offers to Release** | Manual input for the current round. |
| **Waitlisted (Next Cycle)**| `Eligible Pool - Offers to Release`. |

### **Scenario B: Cycle 2 & 3 (Carry-Over & Upgrades)**
Includes data from the previous cycle and allows for "Ripple Effect" seat utilization.

#### **Cycle Carry-Over Card**
Before configuration, the system displays the starting state:
- **Accepted (Paid)**: Students from C1 who are staying (Status Quo) or waiting for Upgrade.
- **Waitlisted**: Students who did not get an offer in C1, now re-entering the fresh pool.
- **Out of Pool**: Total of `Pending` + `Withdrawn` students from C1. These seats are now **Available** for release.

#### **Advanced Seat Matrix (Cycle 2+)**
| Field | Definition |
| :--- | :--- |
| **Committed (C1)** | Previous cycle accepted students remaining in this choice. |
| **Available Seats** | `Approved Intake - Committed`. |
| **Eligible for Upgrade** | Students already accepted who can move to this choice (Dynamic counter). |

### **Upgrade Preview Modal (Pop-up)**
Triggered by clicking the "Eligible for Upgrade" count.
| Student Name | Application ID | Category | Previous Program | Upgrade Target |
| :--- | :--- | :--- | :--- | :--- |
| Aarav Sharma | APP_101 | General | B.Tech MECH (2nd pref) | B.Tech CSE (1st pref) |

---

## 5. Offer Results & Progress Tracking

Once offers are "Released," the system generates a detailed result view with historical context.

### **Cycle Offer Release Summary (Cycle 2+)**
- **🔼 Upgrades**: Accepted students moved to a higher preference.
- **✦ Fresh Allotment**: New applicants or previously waitlisted students receiving their first offer.
- **═ Status Quo**: Previous cycle accepted students who stayed in their original allocation.

### **Offer Results Table**
| Student Name | Application ID | Category | Program Offered | Pref. Order | Remarks |
| :--- | :--- | :--- | :--- | :---: | :--- |
| Aarav Sharma | APP_101 | General | B.Tech CSE | 1 | 🔼 Upgraded |
| Aditi Patel | APP_102 | General | B.Tech ECE | 1 | ★ Waitlist Improvement |
| Chetan Verma | APP_105 | OBC | B.Tech IT | 2 | ✦ Fresh Allotment |

---

## 6. Core Transition Formulas (Technical Logic)

### **The "Eligible Pool" Logic**
- **Cycle 1**: Students who are eligible and meet the minimum criteria.
- **Cycle 2 & 3**:
    1. Students who have **paid** in the previous cycle (Upgrade candidates).
    2. Students who were **Waitlisted** in the previous cycle.
    3. New applicants who meet current criteria.

### **Seat & Shift Formulas**
- **Upgrade Formula**: If `Current Cycle Preference < Previous Cycle Preference`, move student and release their old seat back into the pool.
- **Waitlist Consumption**: Seats vacated by "Withdrawn" or "Declined" students from C1 are automatically filled by the C2 pool.
- **Refund/Adjustment**: 
    - Move to lower-fee program = **Refund Difference**.
    - Move to higher-fee program = **Invoice Difference**.

---

## 7. Fee Configuration
- **Group-wise Mode**: Syncs Amounts, Plans, and Dates across courses in a subcategory.
- **Installment Plans**: Plans (1, 2, 4, 10 inst.) calculate prorated amounts automatically.

### **Sample Fee Config (Group Mode)**
| Program | Category | Fee (₹) | Plan | # | Amount (₹) | Due Date |
| :--- | :--- | :---: | :--- | :---: | :---: | :--- |
| B.Tech CSE | Resident | 7,80,000 | 4 Inst. | 1 | 1,95,000 | 15/06/25 |
| B.Tech MECH | Resident | 7,00,000 | 4 Inst. | 1 | 1,75,000 | 15/06/25 |
