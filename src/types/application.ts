export type ApplicationCategory = 'General' | 'OBC' | 'SC/ST' | 'NRI-American' | 'NRI-Arab';

export interface Application {
  id: string;
  studentName: string;
  rollNumber: string;
  dateOfBirth: string;
  category: ApplicationCategory;
  lppPreference: string;
  lppPreferences: { lppId: string; preferenceOrder: number }[];
  entranceScore: number;
  academicScore: number;
  interviewScore: number;
  applicationDate: string;
  createdAt: string;
  updatedAt: string;
}
