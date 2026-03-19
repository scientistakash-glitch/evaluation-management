export interface LPP {
  id: string;
  ptatId: string;
  name: string;
  code: string;
  duration: number;
  totalSeats: number;
  categoryWiseSeats: Record<string, number>;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
