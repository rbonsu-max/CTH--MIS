export type UserRole = 'super_admin' | 'admin' | 'lecturer' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Student {
  id: string;
  indexNumber: string;
  name: string;
  email: string;
  programId: string;
  level: string;
  gender: string;
  dateOfBirth: string;
  phoneNumber: string;
  address?: string;
  status: string;
  createdAt?: string;
}

export interface Program {
  id: string;
  name: string;
  code: string;
  department: string;
  duration: string;
  description?: string;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  creditHours: number;
  programId: string;
  semester: string;
  level: string;
}

export interface Registration {
  id: string;
  studentId: string;
  courseId: string;
  academicYear: string;
  semester: string;
  status: string;
  createdAt?: string;
  studentName?: string;
  courseName?: string;
  courseCode?: string;
}

export interface Assessment {
  id: string;
  studentId: string;
  courseId: string;
  academicYear: string;
  semester: string;
  midSemScore: number;
  examScore: number;
  totalScore: number;
  grade: string;
  gradePoint: number;
  updatedAt?: string;
  studentName?: string;
  courseName?: string;
  courseCode?: string;
}

export interface Lecturer {
  id: string;
  name: string;
  email: string;
  department: string;
  phoneNumber: string;
}

export interface AcademicYear {
  id: string;
  year: string;
  isCurrent: boolean;
}

export interface Semester {
  id: string;
  name: 'First Semester' | 'Second Semester';
  isCurrent: boolean;
}

export interface CalendarEvent {
  id: string;
  date: string;
  event: string;
  academicYear?: string;
  semester?: string;
}

export type ModuleType = 
  | 'dashboard'
  | 'students'
  | 'programs'
  | 'courses'
  | 'registration'
  | 'assessment'
  | 'academic_records'
  | 'statistics'
  | 'lecturers'
  | 'settings';
