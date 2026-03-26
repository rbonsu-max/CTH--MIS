export type UserRole = 'Administrator' | 'User' | 'Lecturer' | 'Student' | 'Finance' | 'Registry' | 'SuperAdmin';

export interface User {
  id: string;
  uid: string;
  fullname: string;
  name: string;       // returned by JWT (same as fullname)
  username: string;
  email?: string;
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
  duration: number;
  required_ch?: number;
}

export interface Course {
  id: number;
  code: string;
  name: string;
  credit_hours: number;
  department: string;
}

export interface Registration {
  id: number;
  index_no: string;
  course_code: string;
  academic_year: string;
  semester_sid: string;
  registration_date: string;
  status: 'pending' | 'approved' | 'rejected';
  surname?: string;
  other_names?: string;
  full_name?: string;
  course_name?: string;
  credit_hours?: number;
  createdAt?: string;
}

export interface Assessment {
  id: number;
  index_no: string;
  course_code: string;
  academic_year: string;
  semester_id: string;
  level: string;
  a1: number;
  a2: number;
  a3: number;
  a4: number;
  total_ca: number;
  exam_score: number;
  total_score: number;
  grade: string;
  grade_point: number;
  weighted_gp: number;
  updated_at?: string;
  surname?: string;
  other_names?: string;
  course_name?: string;
  credit_hours: number;
  index_number?: string;
  progid?: string;
}

export interface NotificationItem {
  id: number;
  recipient_uid: string;
  type: string;
  title: string;
  message: string;
  payload?: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
  read_at?: string | null;
}

export interface PaginatedUsers {
  data: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BroadsheetSemesterMetrics {
  semester_id: string;
  semester_name: string;
  sCH: number | null;
  sGP: number | null;
  sGPA: number | null;
  cCH: number | null;
  cGP: number | null;
  cGPA: number | null;
  class: string | null;
}

export interface BroadsheetSummaryRow {
  index_no: string;
  index_number: string;
  surname: string;
  first_name: string;
  other_names: string;
  progid: string;
  level: string;
  class: string | null;
  semesters: Record<string, BroadsheetSemesterMetrics | undefined>;
}

export interface BroadsheetSummaryResponse {
  semesters: Array<{ sid: string; name: string; sort_order: number | null }>;
  data: BroadsheetSummaryRow[];
}

export interface BoardsheetCache {
  id: number;
  index_no: string;
  academic_year: string;
  semester_id: string;
  level: string;
  progid: string;
  sCH: number;
  sGP: number;
  sGPA: number;
  cCH: number;
  cGP: number;
  cGPA: number;
  class: string;
  calculated_at: string;
}

export interface Lecturer {
  id: number;
  lid: string;
  title?: string;
  name: string;
  email: string;
  tel: string;
  department: string;
  designation: string;
  user_uid?: string;
}

export interface AcademicYear {
  id: number;
  code: string;
  date_from?: string;
  date_to?: string;
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
  course_code: string;
  academic_year: string;
  semester_sid: string;
  lecturer_name?: string;
  course_name?: string;
  credit_hours?: number;
}

export interface AssessmentWindow {
  id: number;
  academic_year: string;
  semester_id: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_by?: string;
  created_at?: string;
}

export interface AssessmentRequest {
  id: number;
  lid: string;
  lecturer_name?: string;
  course_code: string;
  course_name?: string;
  academic_year: string;
  semester_id: string;
  index_no?: string;
  student_name?: string;
  request_type: 'upload' | 'edit';
  reason: string;
  status: 'pending' | 'granted' | 'denied';
  created_at: string;
  granted_at?: string;
  expires_at?: string;
  processed_by?: string;
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
  | 'settings'
  | 'student_portal';
