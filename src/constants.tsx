import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  BookMarked, 
  ClipboardCheck, 
  FileText, 
  BarChart3, 
  UserCog, 
  Settings, 
  GraduationCap,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  UserPlus,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  ChevronDown,
  LogOut,
  Bell,
  Menu,
  X
} from 'lucide-react';
import { ModuleType, UserRole } from './types';

export interface NavItem {
  id: ModuleType;
  label: string;
  icon: React.ReactNode;
  roles: UserRole[];
  subItems?: { id: string; label: string; roles?: UserRole[] }[];
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: ['SuperAdmin', 'Administrator', 'Lecturer'] },
  { 
    id: 'student_portal', 
    label: 'My Portal', 
    icon: <GraduationCap size={20} />,
    roles: ['Student', 'SuperAdmin'],
    subItems: [
      { id: 'overview', label: 'Overview' },
      { id: 'registration', label: 'Course Registration' },
      { id: 'results', label: 'Academic Results' }
    ]
  },
  { 
    id: 'students', 
    label: 'Students', 
    icon: <Users size={20} />,
    roles: ['SuperAdmin', 'Administrator'],
    subItems: [
      { id: 'add_student', label: 'Add Biodata' },
      { id: 'update_student', label: 'Update Biodata' },
      { id: 'view_students', label: 'View Biodata' },
      { id: 'bulk_upload', label: 'Bulk Upload' },
      { id: 'reset_password', label: 'Reset Password' }
    ]
  },
  { 
    id: 'programs', 
    label: 'Programs', 
    icon: <GraduationCap size={20} />,
    roles: ['SuperAdmin', 'Administrator'],
    subItems: [
      { id: 'setup_program', label: 'Setup Program' },
      { id: 'populate_program', label: 'Populate Program' },
      { id: 'view_programs', label: 'View Programs' },
      { id: 'bulk_upload', label: 'Bulk Upload' }
    ]
  },
  { 
    id: 'courses', 
    label: 'Courses', 
    icon: <BookOpen size={20} />,
    roles: ['SuperAdmin', 'Administrator', 'Lecturer'],
    subItems: [
      { id: 'setup_course', label: 'Setup Course', roles: ['SuperAdmin', 'Administrator'] },
      { id: 'mount_course', label: 'Mount Course', roles: ['SuperAdmin', 'Administrator'] },
      { id: 'view_courses', label: 'View Courses', roles: ['SuperAdmin', 'Administrator', 'Lecturer'] },
      { id: 'bulk_upload', label: 'Bulk Upload', roles: ['SuperAdmin', 'Administrator'] }
    ]
  },
  { 
    id: 'registration', 
    label: 'Registration', 
    icon: <BookMarked size={20} />,
    roles: ['SuperAdmin', 'Administrator'],
    subItems: [
      { id: 'open_close', label: 'Open/Close Registration' },
      { id: 'register_student', label: 'Register Student' },
      { id: 'resit', label: 'Resit' },
      { id: 'view_registration', label: 'View Registration' }
    ]
  },
  { 
    id: 'assessment', 
    label: 'Assessment', 
    icon: <ClipboardCheck size={20} />,
    roles: ['SuperAdmin', 'Administrator', 'Lecturer'],
    subItems: [
      { id: 'by_course', label: 'By Course' },
      { id: 'by_individual', label: 'By Individual' }
    ]
  },
  { 
    id: 'academic_records', 
    label: 'Academic Records', 
    icon: <FileText size={20} />,
    roles: ['SuperAdmin', 'Administrator'],
    subItems: [
      { id: 'course_results', label: 'Course Results' },
      { id: 'composite_results', label: 'Composite Results' },
      { id: 'broadsheet', label: 'Broadsheet' },
      { id: 'statement_results', label: 'Statement of Results' },
      { id: 'transcript', label: 'Transcript' },
      { id: 'graduation_list', label: 'Graduation List' }
    ]
  },
  { 
    id: 'statistics', 
    label: 'Statistics', 
    icon: <BarChart3 size={20} />,
    roles: ['SuperAdmin', 'Administrator'],
    subItems: [
      { id: 'student_stats', label: 'Students Statistics' },
      { id: 'course_stats', label: 'Courses Statistics' }
    ]
  },
  { 
    id: 'lecturers', 
    label: 'Lecturers', 
    icon: <UserCog size={20} />,
    roles: ['SuperAdmin', 'Administrator'],
    subItems: [
      { id: 'setup_lecturer', label: 'Setup Lecturer' },
      { id: 'assign_lecturer', label: 'Assign Lecturer' },
      { id: 'view_lecturers', label: 'View Lecturers' },
      { id: 'bulk_upload', label: 'Bulk Upload' }
    ]
  },
  { 
    id: 'settings', 
    label: 'Settings', 
    icon: <Settings size={20} />,
    roles: ['SuperAdmin', 'Administrator', 'Lecturer', 'Student', 'User', 'Finance', 'Registry'],
    subItems: [
      { id: 'account_settings', label: 'Account Settings' },
      { id: 'my_access_requests', label: 'My Access Requests', roles: ['Lecturer'] },
      { id: 'academic_year', label: 'Academic Year', roles: ['SuperAdmin', 'Administrator'] },
      { id: 'semesters', label: 'Semesters', roles: ['SuperAdmin', 'Administrator'] },
      { id: 'academic_calendar', label: 'Academic Calendar', roles: ['SuperAdmin', 'Administrator'] },
      { id: 'grading_points', label: 'Grading Points', roles: ['SuperAdmin', 'Administrator'] },
      { id: 'departments', label: 'Departments', roles: ['SuperAdmin', 'Administrator'] },
      { id: 'user_management', label: 'User Management', roles: ['SuperAdmin'] },
      { id: 'assessment_control', label: 'Assessment Control', roles: ['SuperAdmin'] },
      { id: 'access_requests', label: 'Access Requests', roles: ['SuperAdmin'] },
      { id: 'system_settings', label: 'System Settings', roles: ['SuperAdmin', 'Administrator'] },
      { id: 'bulk_upload', label: 'Bulk Upload', roles: ['SuperAdmin'] }
    ]
  }
];

export const COLORS = {
  primary: '#1e293b', // Slate 800
  secondary: '#334155', // Slate 700
  accent: '#3b82f6', // Blue 500
  background: '#f8fafc', // Slate 50
  text: '#1e293b',
  muted: '#64748b'
};
