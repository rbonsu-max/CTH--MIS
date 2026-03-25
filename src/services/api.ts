import { Student, Program, Course, Registration, Assessment, Lecturer, AcademicYear, Semester, User, CalendarEvent, Department, LecturerAssignment, AssessmentWindow, AssessmentRequest, NotificationItem } from '../types';

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
  setupPassword: async (credentials: any): Promise<User> => {
    const res = await fetchWithAuth(`${API_URL}/auth/setup-password`, {
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
  getPublicSettings: async (): Promise<Record<string, string>> => {
    const res = await fetch(`${API_URL}/auth/public-settings`, { credentials: 'include' });
    if (!res.ok) return {};
    return res.json();
  },
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await fetchWithAuth(`${API_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
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
  updateStudent: async (iid: string, student: Partial<Student>): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/students/${iid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(student),
    });
    return res.json();
  },
  deleteStudent: async (iid: string): Promise<void> => {
    await fetchWithAuth(`${API_URL}/students/${iid}`, { method: 'DELETE' });
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
  updateProgram: async (progid: string, program: Partial<Program>): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/programs/${progid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(program),
    });
    return res.json();
  },
  deleteProgram: async (progid: string): Promise<void> => {
    await fetchWithAuth(`${API_URL}/programs/${progid}`, { method: 'DELETE' });
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
  updateCourse: async (cid: string, course: Partial<Course>): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/courses/${cid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(course),
    });
    return res.json();
  },
  deleteCourse: async (cid: string): Promise<void> => {
    await fetchWithAuth(`${API_URL}/courses/${cid}`, { method: 'DELETE' });
  },

  // Registrations
  getRegistrations: async (index_no?: string, academic_year?: string, semester_sid?: string): Promise<Registration[]> => {
    const params = new URLSearchParams();
    if (index_no) params.append('index_no', index_no);
    if (academic_year) params.append('academic_year', academic_year);
    if (semester_sid) params.append('semester_sid', semester_sid);
    const queryStr = params.toString();
    const res = await fetchWithAuth(`${API_URL}/registrations${queryStr ? '?' + queryStr : ''}`);
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
  deleteRegistration: async (index_no: string, course_code: string, academic_year: string, semester_sid: string): Promise<void> => {
    const params = new URLSearchParams({ index_no, course_code, academic_year, semester_sid });
    await fetchWithAuth(`${API_URL}/registrations?${params.toString()}`, { method: 'DELETE' });
  },

  // Assessments
  async getAssessments(courseCode?: string, academicYear?: string, semesterId?: string, indexNo?: string): Promise<Assessment[]> {
    const params = new URLSearchParams();
    if (courseCode) params.append('course_code', courseCode);
    if (academicYear) params.append('academic_year', academicYear);
    if (semesterId) params.append('semester_id', semesterId);
    if (indexNo) params.append('index_no', indexNo);
    const response = await fetchWithAuth(`${API_URL}/assessments?${params.toString()}`);
    return response.json();
  },

  async getPeriodAssessments(academicYear: string, semesterId: string): Promise<Assessment[]> {
    const params = new URLSearchParams({ academic_year: academicYear, semester_id: semesterId });
    const response = await fetchWithAuth(`${API_URL}/assessments?${params.toString()}`);
    return response.json();
  },
  createAssessment: async (assessment: Partial<Assessment>): Promise<Assessment> => {
    const res = await fetchWithAuth(`${API_URL}/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assessment),
    });
    return res.json();
  },
  getAssessmentsByStudent: async (index_no: string, academic_year?: string, semester_id?: string): Promise<Assessment[]> => {
    const params = new URLSearchParams({ index_no });
    if (academic_year) params.append('academic_year', academic_year);
    if (semester_id) params.append('semester_id', semester_id);
    const res = await fetchWithAuth(`${API_URL}/assessments?${params.toString()}`);
    return res.json();
  },
  computeGPA: async (academic_year: string, semester_id: string): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/assessments/compute-gpa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ academic_year, semester_id }),
    });
    return res.json();
  },
  getBoardsheet: async (index_no: string, academic_year: string, semester_id: string): Promise<any> => {
    const params = new URLSearchParams({ index_no, academic_year, semester_id });
    const res = await fetchWithAuth(`${API_URL}/assessments/broadsheet?${params.toString()}`);
    return res.json();
  },
  getGraduationList: async (progid: string, admission_year: string): Promise<any[]> => {
    const params = new URLSearchParams({ progid, admission_year });
    const res = await fetchWithAuth(`${API_URL}/assessments/graduation-list?${params.toString()}`);
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
  updateLecturer: async (lid: string, lecturer: Partial<Lecturer>): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/lecturers/${lid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lecturer),
    });
    return res.json();
  },
  deleteLecturer: async (lid: string): Promise<void> => {
    await fetchWithAuth(`${API_URL}/lecturers/${lid}`, { method: 'DELETE' });
  },
  getLecturerAssignments: async (lid?: string, academic_year?: string, semester_sid?: string): Promise<LecturerAssignment[]> => {
    const params = new URLSearchParams();
    if (lid) params.append('lid', lid);
    if (academic_year) params.append('academic_year', academic_year);
    if (semester_sid) params.append('semester_sid', semester_sid);
    const res = await fetchWithAuth(`${API_URL}/lecturers/assignments?${params.toString()}`);
    return res.json();
  },
  assignLecturer: async (data: { lid: string; course_code: string; academic_year: string; semester_sid: string }): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/lecturers/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  deleteAssignment: async (id: number): Promise<void> => {
    await fetchWithAuth(`${API_URL}/lecturers/assignments/${id}`, { method: 'DELETE' });
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
    await fetchWithAuth(`${API_URL}/academic/years/${encodeURIComponent(code)}/set-current`, {
      method: 'POST',
    });
  },
  deleteAcademicYear: async (code: string): Promise<void> => {
    await fetchWithAuth(`${API_URL}/academic/years/${encodeURIComponent(code)}`, {
      method: 'DELETE',
    });
  },
  updateAcademicYear: async (code: string, data: Partial<AcademicYear>): Promise<AcademicYear> => {
    const res = await fetchWithAuth(`${API_URL}/academic/years/${encodeURIComponent(code)}`, {
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
  createSemester: async (data: Partial<Semester>): Promise<Semester> => {
    const res = await fetchWithAuth(`${API_URL}/academic/semesters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
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
  deleteSemester: async (sid: string): Promise<void> => {
    await fetchWithAuth(`${API_URL}/academic/semesters/${sid}`, {
      method: 'DELETE',
    });
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
  unmountCurriculum: async (progid: string, course_code: string, level: number, semester_sid: string): Promise<void> => {
    const params = new URLSearchParams({ course_code, level: level.toString(), semester_sid });
    await fetchWithAuth(`${API_URL}/programs/${progid}/curriculum?${params.toString()}`, { method: 'DELETE' });
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

  // Departments
  getDepartments: async (): Promise<Department[]> => {
    const res = await fetchWithAuth(`${API_URL}/departments`);
    return res.json();
  },
  createDepartment: async (data: Partial<Department>): Promise<Department> => {
    const res = await fetchWithAuth(`${API_URL}/departments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  updateDepartment: async (id: number, data: Partial<Department>): Promise<Department> => {
    const res = await fetchWithAuth(`${API_URL}/departments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  deleteDepartment: async (id: number): Promise<void> => {
    await fetchWithAuth(`${API_URL}/departments/${id}`, { method: 'DELETE' });
  },

  // Settings
  getSettings: async (): Promise<Record<string, string>> => {
    const res = await fetchWithAuth(`${API_URL}/settings`);
    return res.json();
  },
  updateSetting: async (key: string, value: string): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    return res.json();
  },

  // Grading Points
  getGradingPoints: async (): Promise<any[]> => {
    const res = await fetchWithAuth(`${API_URL}/settings/grading`);
    return res.json();
  },
  createGradingPoint: async (data: any): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/settings/grading`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  updateGradingPoint: async (id: number, data: any): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/settings/grading/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  deleteGradingPoint: async (id: number): Promise<void> => {
    await fetchWithAuth(`${API_URL}/settings/grading/${id}`, { method: 'DELETE' });
  },

  // Student password reset
  resetStudentPassword: async (iid: string, password: string): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/students/${iid}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    return res.json();
  },

  // Statistics
  getStudentStats: async (): Promise<any> => {
    const [students, programs] = await Promise.all([
      fetchWithAuth(`${API_URL}/students`).then(r => r.json()),
      fetchWithAuth(`${API_URL}/programs`).then(r => r.json())
    ]);
    return { students, programs };
  },

  // Assessment Control
  getAssessmentWindows: async (): Promise<AssessmentWindow[]> => {
    const res = await fetchWithAuth(`${API_URL}/assessment-control/windows`);
    return res.json();
  },
  upsertAssessmentWindow: async (data: Partial<AssessmentWindow>): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/assessment-control/windows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  deleteAssessmentWindow: async (id: number): Promise<void> => {
    await fetchWithAuth(`${API_URL}/assessment-control/windows/${id}`, { method: 'DELETE' });
  },
  getAssessmentRequests: async (status?: string): Promise<AssessmentRequest[]> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    const res = await fetchWithAuth(`${API_URL}/assessment-control/requests?${params.toString()}`);
    return res.json();
  },
  processAssessmentRequest: async (id: number, status: string, expires_at?: string): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/assessment-control/requests/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, expires_at }),
    });
    return res.json();
  },
  getMyAssessmentRequests: async (): Promise<AssessmentRequest[]> => {
    const res = await fetchWithAuth(`${API_URL}/assessment-control/my-requests`);
    return res.json();
  },
  createAssessmentRequest: async (data: Partial<AssessmentRequest>): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/assessment-control/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  checkAssessmentAccess: async (params: { academic_year: string; semester_id: string; course_code: string; index_no?: string }): Promise<{ hasAccess: boolean; accessSource: string | null; window: AssessmentWindow | null }> => {
    const sp = new URLSearchParams(params as any);
    const res = await fetchWithAuth(`${API_URL}/assessment-control/check-access?${sp.toString()}`);
    return res.json();
  },

  // Notifications
  getNotifications: async (): Promise<NotificationItem[]> => {
    const res = await fetchWithAuth(`${API_URL}/notifications`);
    return res.json();
  },
  markNotificationRead: async (id: number): Promise<void> => {
    await fetchWithAuth(`${API_URL}/notifications/${id}/read`, { method: 'POST' });
  },
  markAllNotificationsRead: async (): Promise<void> => {
    await fetchWithAuth(`${API_URL}/notifications/read-all`, { method: 'POST' });
  },
};
