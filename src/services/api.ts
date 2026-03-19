import { Student, Program, Course, Registration, Assessment, Lecturer, AcademicYear, Semester, User } from '../types';

const API_URL = '/api';

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
  });
  if (res.status === 401 && !url.includes('/auth/login')) {
    // Handle unauthorized - maybe redirect to login or clear state
    // For now, let the caller handle it
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
    if (!res.ok) throw new Error('Invalid credentials');
    return res.json();
  },
  logout: async (): Promise<void> => {
    await fetchWithAuth(`${API_URL}/auth/logout`, { method: 'POST' });
  },
  me: async (): Promise<User> => {
    const res = await fetchWithAuth(`${API_URL}/auth/me`);
    if (!res.ok) throw new Error('Not authenticated');
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
  getAssessments: async (): Promise<Assessment[]> => {
    const res = await fetchWithAuth(`${API_URL}/assessments`);
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

  // Academic Years
  getAcademicYears: async (): Promise<AcademicYear[]> => {
    const res = await fetchWithAuth(`${API_URL}/academic-years`);
    return res.json();
  },
  createAcademicYear: async (data: Partial<AcademicYear>): Promise<AcademicYear> => {
    const res = await fetchWithAuth(`${API_URL}/academic-years`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  setCurrentAcademicYear: async (id: string): Promise<void> => {
    await fetchWithAuth(`${API_URL}/academic-years/${id}/set-current`, {
      method: 'POST',
    });
  },

  // Semesters
  getSemesters: async (): Promise<Semester[]> => {
    const res = await fetchWithAuth(`${API_URL}/semesters`);
    return res.json();
  },
  setCurrentSemester: async (id: string): Promise<void> => {
    await fetchWithAuth(`${API_URL}/semesters/${id}/set-current`, {
      method: 'POST',
    });
  },
};
