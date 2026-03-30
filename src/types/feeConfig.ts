export interface InstallmentRow {
  pct: number;
  amount: number;
  dueDate: string;
}

export interface CycleFeeConfig {
  id: string;
  cycleId: string;
  installmentPlanId: string;
  installmentRows: InstallmentRow[];
  createdAt: string;
  updatedAt: string;
}
