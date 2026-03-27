import React, { useState, useEffect } from 'react';
import { Calendar, GraduationCap, FileText, Loader2, BookOpen, CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Student, Registration, Assessment, Program, Course, Semester } from '../types';
import { printElement } from '../utils/print';
import { TranscriptPreview } from './TranscriptPreview';

interface StudentPortalProps {
  activeSubItem: string | null;
}

export const StudentPortalModule: React.FC<StudentPortalProps> = ({ activeSubItem }) => {
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [program, setProgram] = useState<Program | null>(null);
  const [academicYear, setAcademicYear] = useState('');
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [registrationWindows, setRegistrationWindows] = useState<any[]>([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [registrationCourses, setRegistrationCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [loadingRegistrationCourses, setLoadingRegistrationCourses] = useState(false);
  const [submittingRegistration, setSubmittingRegistration] = useState(false);
  const [transcriptData, setTranscriptData] = useState<{
    student: Student;
    assessments: Assessment[];
    caches: any[];
  } | null>(null);
  const [userRole, setUserRole] = useState<string>('Student');
  const [searchQuery, setSearchQuery] = useState('');
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const { success, error: toastError } = useToast();
  const today = new Date().toISOString().split('T')[0];
  const openSemesterWindows = registrationWindows.filter((item) =>
    Number(item.is_active) === 1 &&
    (!academicYear || item.academic_year === academicYear) &&
    item.start_date <= today &&
    item.end_date >= today
  );
  const openSemesterIds = new Set(openSemesterWindows.map((item) => item.semester_sid));

  useEffect(() => {
    fetchInitial();
  }, []);

  const fetchInitial = async () => {
    setLoading(true);
    try {
      const [user, years, semData, windows] = await Promise.all([
        api.me(),
        api.getAcademicYears(),
        api.getSemesters(),
        api.getRegistrationWindows()
      ]);
      if (!user) return;
      setUserRole(user.role);
      setSemesters(semData);
      setRegistrationWindows(windows);

      const currentYear = years.find((item) => item.is_current)?.code || windows.find((item) => Number(item.is_active) === 1)?.academic_year || '';
      setAcademicYear(currentYear);

      const openWindows = windows.filter((item) =>
        Number(item.is_active) === 1 &&
        (!currentYear || item.academic_year === currentYear) &&
        item.start_date <= today &&
        item.end_date >= today
      );
      const currentSemester = semData.find((item) => item.is_current)?.sid || '';
      const defaultSemester = openWindows.find((item) => item.semester_sid === currentSemester)?.semester_sid
        || openWindows[0]?.semester_sid
        || currentSemester;
      setSelectedSemester(defaultSemester);
      
      if (user.role === 'Student') {
        await loadStudentData(user.uid);
      } else {
        const students = await api.getStudents();
        setAllStudents(students);
        setLoading(false);
      }
    } catch (error) {
      console.error('Initial load failed', error);
      toastError('Initial load failed');
      setLoading(false);
    }
  };

  const loadStudentData = async (iid: string) => {
    setLoading(true);
    try {
      const students = await api.getStudents();
      const targetStudent = students.find((s: Student) => s.iid === iid);
      if (targetStudent) {
        setStudent(targetStudent);
        const programs = await api.getPrograms();
        const myProg = programs.find((p: Program) => p.progid === targetStudent.progid);
        if (myProg) setProgram(myProg);
      } else {
        toastError('Student profile not found');
        setLoading(false);
        return;
      }

      const [regs, assts, transcript] = await Promise.all([
        api.getRegistrations(iid),
        api.getAssessmentsByStudent(iid),
        api.getTranscript(iid)
      ]);
      setRegistrations(regs);
      setAssessments(assts);
      setTranscriptData(transcript);

    } catch (error) {
      console.error('Failed to load portal data', error);
      toastError('Failed to load portal data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!student || !academicYear || !selectedSemester || !openSemesterIds.has(selectedSemester)) {
      setRegistrationCourses([]);
      setSelectedCourses([]);
      return;
    }
    void loadRegistrationOptions(student, academicYear, selectedSemester);
  }, [student?.iid, academicYear, selectedSemester, registrationWindows]);

  const loadRegistrationOptions = async (targetStudent: Student, targetYear: string, targetSemester: string) => {
    setLoadingRegistrationCourses(true);
    setSelectedCourses([]);
    try {
      const [curriculum, existingRegistrations] = await Promise.all([
        api.getCurriculum(targetStudent.progid, targetStudent.current_level, targetSemester),
        api.getRegistrations(targetStudent.iid, targetYear, targetSemester)
      ]);

      const alreadyRegistered = new Set(existingRegistrations.map((item) => item.course_code));
      const available = curriculum
        .filter((item: any) => !alreadyRegistered.has(item.course_code))
        .map((item: any) => ({
          id: item.id,
          code: item.course_code,
          name: item.course_name || item.name,
          credit_hours: item.credit_hours,
          department: targetStudent.program_name || ''
        }));

      setRegistrationCourses(available);
      setRegistrations(await api.getRegistrations(targetStudent.iid));
    } catch (error) {
      console.error('Failed to load registration options', error);
      toastError('Failed to load available courses for registration');
      setRegistrationCourses([]);
    } finally {
      setLoadingRegistrationCourses(false);
    }
  };

  const toggleRegistrationCourse = (courseCode: string) => {
    setSelectedCourses((prev) => (
      prev.includes(courseCode)
        ? prev.filter((item) => item !== courseCode)
        : [...prev, courseCode]
    ));
  };

  const handleStudentRegistration = async () => {
    if (!student || !academicYear || !selectedSemester || selectedCourses.length === 0) return;
    setSubmittingRegistration(true);
    try {
      await Promise.all(selectedCourses.map((course_code) => (
        api.createRegistration({
          index_no: student.iid,
          course_code,
          academic_year: academicYear,
          semester_sid: selectedSemester,
          status: 'pending'
        })
      )));
      success('Registration completed successfully!');
      await loadRegistrationOptions(student, academicYear, selectedSemester);
    } catch (error: any) {
      console.error('Student registration failed', error);
      toastError(error?.message || 'Failed to complete registration');
    } finally {
      setSubmittingRegistration(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  const handleAdminSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const st = allStudents.find(s => s.index_number === searchQuery || s.iid === searchQuery);
    if (st) {
      setStudent(null);
      loadStudentData(st.iid);
    } else {
      toastError('Student not found. Check index number.');
    }
  };

  if (userRole !== 'Student' && !student) {
    return (
      <div className="card max-w-xl mx-auto mt-12">
        <div className="p-6 border-b border-slate-100 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl text-blue-600 mb-4 shadow-inner">
            <GraduationCap size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Student Portal View</h2>
          <p className="text-slate-500 text-sm mt-2">As an administrator, you must search for a student to view their portal.</p>
        </div>
        <form className="p-6 space-y-4" onSubmit={handleAdminSearch}>
          <div className="space-y-2">
            <label className="label">Student Index Number</label>
            <input 
              type="text" 
              className="input w-full" 
              placeholder="e.g. 02210403" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary w-full">View Portal</button>
        </form>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="card p-6 border-b border-slate-100 flex flex-col md:flex-row gap-6 items-start md:items-center">
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-3xl font-bold shrink-0">
          {student?.full_name?.charAt(0) || 'S'}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{student?.full_name}</h2>
          <p className="text-slate-500 font-medium">{student?.iid}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase">{program?.name || student?.progid}</span>
            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold uppercase">Level {student?.current_level || '100'}</span>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold uppercase">{student?.status}</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="text-blue-600" size={20} />
            <h3 className="font-bold text-slate-900">Total Registered</h3>
          </div>
          <p className="text-3xl font-black">{registrations.length}</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="text-emerald-600" size={20} />
            <h3 className="font-bold text-slate-900">Total Assessments</h3>
          </div>
          <p className="text-3xl font-black">{assessments.length}</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="text-purple-600" size={20} />
            <h3 className="font-bold text-slate-900">Admission Year</h3>
          </div>
          <p className="text-3xl font-black">{student?.admission_year_code || student?.admission_year || 'N/A'}</p>
        </div>
      </div>
    </div>
  );

  const renderRegistration = () => (
    <div className="card">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h2 className="font-bold text-lg">Course Registration</h2>
          <p className="text-slate-500 text-sm">Register your courses for the active academic year using your current level automatically.</p>
        </div>
        <button onClick={() => printElement('print-my-registration', 'My Course Registration')} className="btn btn-secondary">Print Registration</button>
      </div>
      <div className="p-6 space-y-6" id="print-my-registration">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="label">Academic Year</label>
            <input type="text" className="input bg-slate-50" value={academicYear} readOnly />
          </div>
          <div className="space-y-2">
            <label className="label">Current Level</label>
            <input type="text" className="input bg-slate-50" value={student?.current_level || ''} readOnly />
          </div>
          <div className="space-y-2">
            <label className="label">Semester</label>
            <select className="input" value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)}>
              <option value="">Select Semester</option>
              {semesters.map((semester) => {
                const hasOpenWindow = openSemesterIds.has(semester.sid);
                return (
                  <option key={semester.sid} value={semester.sid} disabled={!hasOpenWindow}>
                    {semester.name}{hasOpenWindow ? '' : ' (Window Closed)'}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {openSemesterWindows.length === 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Course registration is currently closed for {academicYear || 'the active academic year'}. Contact the registry if you expected an open registration window.
          </div>
        )}

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="font-bold text-slate-900">{student?.full_name}</div>
              <div className="text-slate-500">{student?.index_number}</div>
            </div>
            <button
              className="btn btn-secondary w-full md:w-auto"
              type="button"
              onClick={() => setSelectedCourses(registrationCourses.map((course) => course.code))}
              disabled={registrationCourses.length === 0}
            >
              Select All Available Courses
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-slate-900">Available Courses</h3>
          {loadingRegistrationCourses ? (
            <div className="py-12 flex justify-center"><Loader2 size={32} className="animate-spin text-blue-600" /></div>
          ) : registrationCourses.length > 0 ? (
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-2 no-scrollbar">
              {registrationCourses.map((course) => (
                <label key={course.code} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 flex-shrink-0"
                    checked={selectedCourses.includes(course.code)}
                    onChange={() => toggleRegistrationCourse(course.code)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{course.code}: {course.name}</div>
                    <div className="text-xs text-slate-400">{course.credit_hours} Credits</div>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-100 bg-white px-6 py-10 text-center text-slate-400">
              No available courses found for your current level and selected semester, or you have already registered all courses.
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-6">
          <button
            className="btn btn-primary px-8"
            disabled={!selectedSemester || !openSemesterIds.has(selectedSemester) || selectedCourses.length === 0 || submittingRegistration}
            onClick={handleStudentRegistration}
          >
            {submittingRegistration ? <Loader2 size={18} className="animate-spin mr-2" /> : <CheckCircle size={18} className="mr-2" />}
            {submittingRegistration ? 'Registering...' : 'Complete Registration'}
          </button>
        </div>

        <div className="overflow-x-auto border-t border-slate-100 pt-6">
          <h3 className="font-bold text-slate-900 mb-4">Registered Courses</h3>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Course Code</th>
                <th className="px-6 py-4 font-semibold">Course Title</th>
                <th className="px-6 py-4 font-semibold">Credits</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {registrations
                .filter((item) => !selectedSemester || item.academic_year === academicYear && item.semester_sid === selectedSemester)
                .map((item, index) => (
                  <tr key={`${item.course_code}-${index}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium">{item.course_code}</td>
                    <td className="px-6 py-4">{item.course_name || 'Pending'}</td>
                    <td className="px-6 py-4">{item.credit_hours || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        item.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {item.status || 'registered'}
                      </span>
                    </td>
                  </tr>
                ))}
              {registrations.filter((item) => !selectedSemester || item.academic_year === academicYear && item.semester_sid === selectedSemester).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">No courses registered yet for this semester.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderResults = () => (
    <div className="card">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h2 className="font-bold text-lg">Statement of Results</h2>
          <p className="text-slate-500 text-sm">Your officially published academic results.</p>
        </div>
        <button onClick={() => printElement('print-my-results', 'My Statement of Results')} className="btn btn-secondary">Print Results</button>
      </div>
      <div className="p-2 md:p-6 bg-slate-100" id="print-my-results">
        {transcriptData && transcriptData.assessments.length > 0 ? (
          <TranscriptPreview data={transcriptData} title="Statement of Results" />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 px-6 py-12 text-center text-slate-400">
            No results published yet.
          </div>
        )}
      </div>
    </div>
  );

  switch (activeSubItem) {
    case 'overview': return renderOverview();
    case 'registration': return renderRegistration();
    case 'results': return renderResults();
    default: return renderOverview();
  }
};
