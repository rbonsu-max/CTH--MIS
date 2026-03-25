import React, { useState, useEffect } from 'react';
import { Calendar, GraduationCap, Clock, FileText, Loader2, BookOpen } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Student, Registration, Assessment, Program } from '../types';
import { printElement } from '../utils/print';

interface StudentPortalProps {
  activeSubItem: string | null;
}

export const StudentPortalModule: React.FC<StudentPortalProps> = ({ activeSubItem }) => {
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [program, setProgram] = useState<Program | null>(null);
  const [userRole, setUserRole] = useState<string>('Student');
  const [searchQuery, setSearchQuery] = useState('');
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const { success, error: toastError } = useToast();

  useEffect(() => {
    fetchInitial();
  }, []);

  const fetchInitial = async () => {
    setLoading(true);
    try {
      const user = await api.me();
      if (!user) return;
      setUserRole(user.role);
      
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

      const regs = await api.getRegistrations(iid);
      setRegistrations(regs);

      const assts = await api.getAssessmentsByStudent(iid);
      setAssessments(assts);

    } catch (error) {
      console.error('Failed to load portal data', error);
      toastError('Failed to load portal data');
    } finally {
      setLoading(false);
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
          <h2 className="font-bold text-lg">My Registered Courses</h2>
          <p className="text-slate-500 text-sm">Courses you have registered for the current session.</p>
        </div>
        <button onClick={() => printElement('print-my-registration', 'My Course Registration')} className="btn btn-secondary">Print Registration</button>
      </div>
      <div className="p-6 overflow-x-auto" id="print-my-registration">
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
            {registrations.length > 0 ? registrations.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium">{r.cid}</td>
                <td className="px-6 py-4">{r.course_name || 'Pending'}</td>
                <td className="px-6 py-4">{r.credit_hours || '-'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                    r.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {r.status || 'Registered'}
                  </span>
                </td>
              </tr>
            )) : <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">No courses registered yet.</td></tr>}
          </tbody>
        </table>
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
      <div className="p-6 overflow-x-auto" id="print-my-results">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">Course</th>
              <th className="px-6 py-4 font-semibold">Credits</th>
              <th className="px-6 py-4 font-semibold">Class Mark</th>
              <th className="px-6 py-4 font-semibold">Exam Mark</th>
              <th className="px-6 py-4 font-semibold text-blue-700">Total</th>
              <th className="px-6 py-4 font-semibold">Grade</th>
              <th className="px-6 py-4 font-semibold">GP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {assessments.length > 0 ? assessments.map((a, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium">
                  {a.cid} <br/> <span className="text-xs text-slate-400 font-normal">{a.course_name || 'Course'}</span>
                </td>
                <td className="px-6 py-4">{a.credit_hours}</td>
                <td className="px-6 py-4">{a.class_score}</td>
                <td className="px-6 py-4">{a.exam_score}</td>
                <td className="px-6 py-4 font-bold text-blue-700">{a.total_score}</td>
                <td className="px-6 py-4 font-bold">{a.grade}</td>
                <td className="px-6 py-4 font-bold">{a.gp}</td>
              </tr>
            )) : <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">No results published yet.</td></tr>}
          </tbody>
        </table>
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
