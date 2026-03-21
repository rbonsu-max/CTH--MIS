export type UserRole = 'Administrator' | 'User' | 'Lecturer' | 'Student' | 'Finance' | 'Registry' | 'SuperAdmin';

export interface User {
  id: string;
  uid: string;
  fullname: string;
  name: string;       // returned by JWT (same as fullname)
  username: string;
  role: UserRole;
  status: 'active' | 'inactive' | 'locked';
  avatar?: string;
}

export interface Student {
  id: number;
  iid: string;
  index_number: string;
  surname: string;
  other_names: string;
  full_name: string;
  gender: 'Male' | 'Female' | 'Other';
  dob: string;
  email: string;
  phone: string;
  progid: string;
  admission_year: string;
  current_level: number;
  status: 'active' | 'withdrawn' | 'graduated' | 'suspended' | 'deferred';
  photo?: string;
  user_uid?: string;
  program_name?: string;
  admission_year_code?: string;
}

export interface Program {
  id: number;
  progid: string;
  name: string;
  department: string;
  duration_years: number;
}

export interface Course {
  id: number;
  cid: string;
  title: string;
  credits: number;
  department: string;
}

export interface Registration {
  id: number;
  iid: string;
  cid: string;
  academic_year: string;
  semester_sid: string;
  registration_date: string;
  status: 'pending' | 'approved' | 'rejected';
  surname?: string;
  other_names?: string;
  full_name?: string;
  course_title?: string;
  credits?: number;
  createdAt?: string;
}

export interface Assessment {
  id: number;
  iid: string;
  cid: string;
  academic_year: string;
  semester_sid: string;
  class_score: number;
  exam_score: number;
  total_score: number;
  grade: string;
  gp: number;
  updated_at?: string;
  surname?: string;
  other_names?: string;
  course_title?: string;
  credits: number;
}

export interface BoardsheetCache {
  id: number;
  iid: string;
  academic_year: string;
  semester_sid: string;
  tcr: number;
  tcp: number;
  gpa: number;
  ctcr: number;
  ctcp: number;
  cgpa: number;
  remarks: string;
  calculated_at: string;
}

export interface Lecturer {
  id: number;
  lid: string;
  fullname: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  user_uid?: string;
}

export interface AcademicYear {
  id: number;
  code: string;
  start_date?: string;
  end_date?: string;
  is_current: boolean;
}

export interface Semester {
  id: number;
  sid: string;
  name: string;
  sort_order: number;
  is_current: boolean;
}

export interface CalendarEvent {
  id: string;
  date: string;
  event: string;
  academic_year?: string;
  semester?: string;
}

export interface Department {
  id: number;
  code: string;
  name: string;
}

export interface LecturerAssignment {
  id: number;
  lid: string;
  cid: string;
  academic_year: string;
  semester_sid: string;
  lecturer_name?: string;
  course_title?: string;
  credits?: number;
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
