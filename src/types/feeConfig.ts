export interface InstallmentRow {
  pct: number;
  amount: number;
  dueDate: string;
}

export interface CategoryFeeConfig {
  programId: string;      // LPP id, e.g. 'lpp_001'
  programName: string;    // e.g. 'B.Tech CSE'
  category: string;       // parent group, e.g. 'Resident Indian' | 'NRI'
  subcategory: string;    // specific, e.g. 'General' | 'OBC' | 'SC/ST' | 'American' | 'Arab'
  programFee: number;     // from LPP (read-only reference value)
  installmentPlanId: string; // 'INSTA_1' | 'INSTA_2' | 'INSTA_3'
  installmentRows: InstallmentRow[];
}

export interface CycleFeeConfig {
  id: string;
  cycleId: string;
  installmentPlanId: string;   // first category's plan (legacy reference)
  categoryConfigs: CategoryFeeConfig[];
  installmentRows: InstallmentRow[]; // kept for backward compat
  createdAt: string;
  updatedAt: string;
}
