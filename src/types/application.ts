export type ApplicationCategory = 'General' | 'OBC' | 'SC' | 'ST' | 'EWS';

export interface Application {
  id: string;
  studentName: string;
  rollNumber: string;
  dateOfBirth: string;
  category: ApplicationCategory;
  lppPreference: string;
  entranceScore: number;
  academicScore: number;
  interviewScore: number;
  applicationDate: string;
  createdAt: string;
  updatedAt: string;
}
