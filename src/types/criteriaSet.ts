export interface Criterion {
  id: string;
  name: string;
  description?: string;
  weightage: number;
  sourceField: string | null;
}

export interface CriteriaSet {
  id: string;
  name: string;
  description?: string;
  isCustom: boolean;
  criteria: Criterion[];
  createdAt: string;
  updatedAt: string;
}
