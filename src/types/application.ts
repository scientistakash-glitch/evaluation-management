export type ApplicationCategory = 'General' | 'OBC' | 'SC' | 'ST' | 'EWS';

export interface Application {
  id: string;
  studentName: string;
  rollNumber: string;
  dateOfBirth: string;
  category: ApplicationCategory;
  entranceScore: number;
  academicScore: number;
  applicationDate: string;
  createdAt: string;
  updatedAt: string;
}
