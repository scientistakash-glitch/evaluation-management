export interface LPPSubcategory {
  name: string;           // e.g., "Resident Indian", "Gujarati Minority"
  category: string;       // parent category group, e.g., "Resident Indian"
  approvedIntake: number; // total seats approved for this subcategory
}

export interface LPP {
  id: string;
  ptatId: string;
  name: string;
  code: string;
  duration: number;
  totalSeats: number;
  categoryWiseSeats: Record<string, number>;
  subcategories?: LPPSubcategory[];
  description?: string;
  createdAt: string;
  updatedAt: string;
}
