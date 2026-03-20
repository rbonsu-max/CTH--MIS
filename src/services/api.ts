import { Student, Program, Course, Registration, Assessment, Lecturer, AcademicYear, Semester, User, CalendarEvent } from '../types';

const API_URL = '/api';

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${res.status}`);
  }
  
  return res;
};

export const api = {
  // Auth
  login: async (credentials: any): Promise<User> => {
    const res = await fetchWithAuth(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return res.json();
  },
  logout: async (): Promise<void> => {
    await fetchWithAuth(`${API_URL}/auth/logout`, { method: 'POST' });
  },
  me: async (): Promise<User> => {
    const res = await fetchWithAuth(`${API_URL}/auth/me`);
    return res.json();
  },

  // Students
  getStudents: async (): Promise<Student[]> => {
    const res = await fetchWithAuth(`${API_URL}/students`);
    return res.json();
  },
  createStudent: async (student: Partial<Student>): Promise<Student> => {
    const res = await fetchWithAuth(`${API_URL}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(student),
    });
    return res.json();
  },
  getStudentLogin: async (iid: string): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/students/${iid}/login`);
    return res.json();
  },
  getTranscript: async (iid: string): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/students/${iid}/transcript`);
    return res.json();
  },
  createStudentLogin: async (iid: string, data: any): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/students/${iid}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Programs
  getPrograms: async (): Promise<Program[]> => {
    const res = await fetchWithAuth(`${API_URL}/programs`);
    return res.json();
  },
  createProgram: async (program: Partial<Program>): Promise<Program> => {
    const res = await fetchWithAuth(`${API_URL}/programs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(program),
    });
    return res.json();
  },

  // Courses
  getCourses: async (): Promise<Course[]> => {
    const res = await fetchWithAuth(`${API_URL}/courses`);
    return res.json();
  },
  createCourse: async (course: Partial<Course>): Promise<Course> => {
    const res = await fetchWithAuth(`${API_URL}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(course),
    });
    return res.json();
  },

  // Registrations
  getRegistrations: async (): Promise<Registration[]> => {
    const res = await fetchWithAuth(`${API_URL}/registrations`);
    return res.json();
  },
  createRegistration: async (reg: Partial<Registration>): Promise<Registration> => {
    const res = await fetchWithAuth(`${API_URL}/registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reg),
    });
    return res.json();
  },

  // Assessments
  getAssessments: async (cid?: string, academic_year?: string, semester_sid?: string): Promise<Assessment[]> => {
    const params = new URLSearchParams();
    if (cid) params.append('cid', cid);
    if (academic_year) params.append('academic_year', academic_year);
    if (semester_sid) params.append('semester_sid', semester_sid);
    const res = await fetchWithAuth(`${API_URL}/assessments?${params.toString()}`);
    return res.json();
  },
  createAssessment: async (assessment: Partial<Assessment>): Promise<Assessment> => {
    const res = await fetchWithAuth(`${API_URL}/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assessment),
    });
    return res.json();
  },

  // Lecturers
  getLecturers: async (): Promise<Lecturer[]> => {
    const res = await fetchWithAuth(`${API_URL}/lecturers`);
    return res.json();
  },
  createLecturer: async (lecturer: Partial<Lecturer>): Promise<Lecturer> => {
    const res = await fetchWithAuth(`${API_URL}/lecturers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lecturer),
    });
    return res.json();
  },

  // Bulk Uploads
  bulkUploadStudents: async (data: any[]): Promise<{ count: number }> => {
    const res = await fetchWithAuth(`${API_URL}/bulk/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  bulkUploadPrograms: async (data: any[]): Promise<{ count: number }> => {
    const res = await fetchWithAuth(`${API_URL}/bulk/programs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  bulkUploadCourses: async (data: any[]): Promise<{ count: number }> => {
    const res = await fetchWithAuth(`${API_URL}/bulk/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  bulkUploadLecturers: async (data: any[]): Promise<{ count: number }> => {
    const res = await fetchWithAuth(`${API_URL}/bulk/lecturers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  bulkUploadUsers: async (data: any[]): Promise<{ count: number }> => {
    const res = await fetchWithAuth(`${API_URL}/bulk/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  bulkUploadAssessments: async (data: any[]): Promise<{ count: number }> => {
    const res = await fetchWithAuth(`${API_URL}/bulk/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Academic Years
  getAcademicYears: async (): Promise<AcademicYear[]> => {
    const res = await fetchWithAuth(`${API_URL}/academic/years`);
    return res.json();
  },
  createAcademicYear: async (data: Partial<AcademicYear>): Promise<AcademicYear> => {
    const res = await fetchWithAuth(`${API_URL}/academic/years`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  setCurrentAcademicYear: async (code: string): Promise<void> => {
    await fetchWithAuth(`${API_URL}/academic/years/${code}/set-current`, {
      method: 'POST',
    });
  },
  deleteAcademicYear: async (code: string): Promise<void> => {
    await fetchWithAuth(`${API_URL}/academic/years/${code}`, {
      method: 'DELETE',
    });
  },
  updateAcademicYear: async (code: string, data: Partial<AcademicYear>): Promise<AcademicYear> => {
    const res = await fetchWithAuth(`${API_URL}/academic/years/${code}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Semesters
  getSemesters: async (): Promise<Semester[]> => {
    const res = await fetchWithAuth(`${API_URL}/academic/semesters`);
    return res.json();
  },
  setCurrentSemester: async (sid: string): Promise<void> => {
    await fetchWithAuth(`${API_URL}/academic/semesters/${sid}/set-current`, {
      method: 'POST',
    });
  },
  updateSemester: async (sid: string, data: Partial<Semester>): Promise<Semester> => {
    const res = await fetchWithAuth(`${API_URL}/academic/semesters/${sid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Curriculum
  getCurriculum: async (progid: string, level?: number, semester_sid?: string): Promise<any[]> => {
    let url = `${API_URL}/programs/${progid}/curriculum`;
    const params = new URLSearchParams();
    if (level) params.append('level', level.toString());
    if (semester_sid) params.append('semester_sid', semester_sid);
    if (params.toString()) url += `?${params.toString()}`;
    
    const res = await fetchWithAuth(url);
    return res.json();
  },
  mountCurriculum: async (progid: string, data: any): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/programs/${progid}/curriculum`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Registration Windows
  getRegistrationWindows: async (): Promise<any[]> => {
    const res = await fetchWithAuth(`${API_URL}/registrations/windows`);
    return res.json();
  },
  openRegistrationWindow: async (data: any): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/registrations/windows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  closeRegistrationWindow: async (id: number): Promise<void> => {
    await fetchWithAuth(`${API_URL}/registrations/windows/${id}/close`, {
      method: 'POST',
    });
  },

  // Users
  getUsers: async (): Promise<User[]> => {
    const res = await fetchWithAuth(`${API_URL}/users`);
    return res.json();
  },
  createUser: async (data: any): Promise<User> => {
    const res = await fetchWithAuth(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  updateUserPassword: async (uid: string, password: string): Promise<void> => {
    await fetchWithAuth(`${API_URL}/users/${uid}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
  },
  deleteUser: async (uid: string): Promise<void> => {
    await fetchWithAuth(`${API_URL}/users/${uid}`, {
      method: 'DELETE',
    });
  },

  // Calendar Events
  getCalendarEvents: async (): Promise<CalendarEvent[]> => {
    const res = await fetchWithAuth(`${API_URL}/calendar-events`);
    return res.json();
  },
  createCalendarEvent: async (data: any): Promise<CalendarEvent> => {
    const res = await fetchWithAuth(`${API_URL}/calendar-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  deleteCalendarEvent: async (id: string): Promise<void> => {
    await fetchWithAuth(`${API_URL}/calendar-events/${id}`, {
      method: 'DELETE',
    });
  },
};
