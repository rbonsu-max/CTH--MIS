import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, BookMarked, CheckCircle, XCircle, Clock, Filter, Loader2, User } from 'lucide-react';
import { Student, Course, Registration } from '../types';
import { api } from '../services/api';

interface RegistrationModuleProps {
  activeSubItem: string | null;
}

export const RegistrationModule: React.FC<RegistrationModuleProps> = ({ activeSubItem }) => {
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Search state
  const [searchIndex, setSearchIndex] = useState('');
  const [foundStudent, setFoundStudent] = useState<Student | null>(null);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

  const handleFindStudent = async () => {
    if (!searchIndex.trim()) return;
    setSearching(true);
    setFoundStudent(null);
    setAvailableCourses([]);
    setSelectedCourses([]);
    
    try {
      const students = await api.getStudents();
      const student = students.find(s => s.index_number === searchIndex);
      
      if (student) {
        setFoundStudent(student);
        // Fetch courses for this student's program
        const allCourses = await api.getCourses();
        const programCourses = allCourses.filter(c => c.department === student.program_name || true); // Simplified for now
        setAvailableCourses(programCourses);
      } else {
        alert('Student not found');
      }
    } catch (error) {
      console.error('Search failed:', error);
      alert('Error searching for student');
    } finally {
      setSearching(false);
    }
  };

  const handleToggleCourse = (courseId: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleRegister = async () => {
    if (!foundStudent || selectedCourses.length === 0) return;
    setSubmitting(true);
    try {
      const academic_year = '2025/2026'; // Mock current year
      const semester_sid = 'SEM1'; // Mock current semester
      
      await Promise.all(selectedCourses.map(cid => 
        api.createRegistration({
          iid: foundStudent.iid,
          cid,
          academic_year,
          semester_sid,
          status: 'pending'
        })
      ));
      
      alert('Registration completed successfully!');
      setFoundStudent(null);
      setSearchIndex('');
      setSelectedCourses([]);
    } catch (error) {
      console.error('Registration failed:', error);
      alert('Failed to complete registration');
    } finally {
      setSubmitting(false);
    }
  };

  const [windows, setWindows] = useState<any[]>([]);
  const [activeWindow, setActiveWindow] = useState<any>(null);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [newWindow, setNewWindow] = useState({
    academic_year: '',
    semester_sid: '',
    opening_date: new Date().toISOString().split('T')[0],
    closing_date: '',
    level: 100
  });

  useEffect(() => {
    if (activeSubItem === 'open_close') {
      fetchWindows();
    }
  }, [activeSubItem]);

  const fetchWindows = async () => {
    setLoading(true);
    try {
      const [winData, yearData, semData] = await Promise.all([
        api.getRegistrationWindows(),
        api.getAcademicYears(),
        api.getSemesters()
      ]);
      setWindows(winData);
      setAcademicYears(yearData);
      setSemesters(semData);
      
      const active = winData.find(w => w.is_open);
      setActiveWindow(active);
      
      if (yearData.find(y => y.is_current)) {
        setNewWindow(prev => ({ ...prev, academic_year: yearData.find(y => y.is_current).code }));
      }
      if (semData.find(s => s.is_current)) {
        setNewWindow(prev => ({ ...prev, semester_sid: semData.find(s => s.is_current).sid }));
      }
    } catch (error) {
      console.error('Failed to fetch windows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWindow = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.openRegistrationWindow(newWindow);
      alert('Registration window opened successfully!');
      fetchWindows();
    } catch (error) {
      console.error('Failed to open window:', error);
      alert('Failed to open window');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseWindow = async (id: number) => {
    if (!window.confirm('Are you sure you want to close this registration window?')) return;
    try {
      await api.closeRegistrationWindow(id);
      alert('Registration window closed!');
      fetchWindows();
    } catch (error) {
      console.error('Failed to close window:', error);
      alert('Failed to close window');
    }
  };

  const renderOpenClose = () => (
    <div className="space-y-6">
      {activeWindow ? (
        <div className="card p-6 sm:p-8 bg-blue-600 text-white border-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">Registration Status</h2>
              <p className="text-blue-100 text-sm sm:text-base">Control student registration for the current semester.</p>
            </div>
            <div className="px-4 py-2 bg-emerald-500 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-lg self-start sm:self-center">
              Currently Open
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-blue-500/30 p-4 sm:p-6 rounded-xl border border-blue-400/30">
              <div className="text-blue-100 text-xs sm:text-sm mb-1">Academic Year</div>
              <div className="text-lg sm:text-xl font-bold">{activeWindow.academic_year}</div>
            </div>
            <div className="bg-blue-500/30 p-4 sm:p-6 rounded-xl border border-blue-400/30">
              <div className="text-blue-100 text-xs sm:text-sm mb-1">Semester</div>
              <div className="text-lg sm:text-xl font-bold">{activeWindow.semester_sid}</div>
            </div>
            <div className="bg-blue-500/30 p-4 sm:p-6 rounded-xl border border-blue-400/30 sm:col-span-2 lg:col-span-1">
              <div className="text-blue-100 text-xs sm:text-sm mb-1">Level</div>
              <div className="text-lg sm:text-xl font-bold">Level {activeWindow.level}</div>
            </div>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <button 
              className="btn bg-white text-blue-600 hover:bg-blue-50 font-bold px-8 w-full sm:w-auto"
              onClick={() => handleCloseWindow(activeWindow.id)}
            >
              Close Registration
            </button>
          </div>
        </div>
      ) : (
        <div className="card p-6">
          <h2 className="font-bold text-lg mb-4">Open New Registration Window</h2>
          <form className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" onSubmit={handleOpenWindow}>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Academic Year</label>
              <select 
                className="input"
                value={newWindow.academic_year}
                onChange={e => setNewWindow({...newWindow, academic_year: e.target.value})}
                required
              >
                <option value="">Select Year</option>
                {academicYears.map(y => <option key={y.code} value={y.code}>{y.code}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Semester</label>
              <select 
                className="input"
                value={newWindow.semester_sid}
                onChange={e => setNewWindow({...newWindow, semester_sid: e.target.value})}
                required
              >
                <option value="">Select Semester</option>
                {semesters.map(s => <option key={s.sid} value={s.sid}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Level</label>
              <select 
                className="input"
                value={newWindow.level}
                onChange={e => setNewWindow({...newWindow, level: parseInt(e.target.value)})}
                required
              >
                <option value="100">Level 100</option>
                <option value="200">Level 200</option>
                <option value="300">Level 300</option>
                <option value="400">Level 400</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Closing Date</label>
              <input 
                type="date" 
                className="input" 
                value={newWindow.closing_date}
                onChange={e => setNewWindow({...newWindow, closing_date: e.target.value})}
                required
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-2 flex items-end">
              <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
                {submitting ? <Loader2 size={18} className="animate-spin" /> : 'Open Registration Window'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-bold text-lg">Registration History</h2>
        </div>
        <div className="p-6 space-y-4">
          {windows.filter(w => !w.is_open).map((item) => (
            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors gap-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-slate-100 rounded-lg flex-shrink-0">
                  <Clock size={20} className="text-slate-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">{item.academic_year} - {item.semester_sid} (Level {item.level})</div>
                  <div className="text-xs text-slate-400">Closed on {item.closing_date}</div>
                </div>
              </div>
              <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-500 self-start sm:self-center">
                Closed
              </span>
            </div>
          ))}
          {windows.filter(w => !w.is_open).length === 0 && (
            <div className="p-8 text-center text-slate-400 italic">No registration history found.</div>
          )}
        </div>
      </div>
    </div>
  );

  const renderRegisterStudent = () => (
    <div className="space-y-6">
      <div className="card">
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-bold text-lg">Manual Student Registration</h2>
          <p className="text-slate-500 text-sm">Register a student for courses in the current semester.</p>
        </div>
        <div className="p-6 space-y-6">
          <div className="max-w-md space-y-2">
            <label className="label">Student ID / Index Number</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                type="text" 
                className="input" 
                placeholder="e.g. SIMS/2025/001" 
                value={searchIndex}
                onChange={e => setSearchIndex(e.target.value)}
              />
              <button 
                className="btn btn-primary w-full sm:w-auto" 
                onClick={handleFindStudent}
                disabled={searching}
              >
                {searching ? <Loader2 size={18} className="animate-spin" /> : 'Find'}
              </button>
            </div>
          </div>

          {foundStudent && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900">Student Information</h3>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Full Name:</span>
                    <span className="font-medium text-right ml-2">{foundStudent.full_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Index Number:</span>
                    <span className="font-medium text-right ml-2">{foundStudent.index_number}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Level:</span>
                    <span className="font-medium text-right ml-2">{foundStudent.current_level}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-slate-900">Available Courses</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                  {availableCourses.length > 0 ? availableCourses.map((course) => (
                    <label key={course.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 flex-shrink-0" 
                        checked={selectedCourses.includes(course.cid)}
                        onChange={() => handleToggleCourse(course.cid)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">{course.cid}: {course.title}</div>
                        <div className="text-xs text-slate-400">{course.credits} Credits</div>
                      </div>
                    </label>
                  )) : (
                    <p className="text-sm text-slate-500 italic">No courses available for this student's level/program.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-100">
            <button className="btn btn-secondary w-full sm:w-auto" onClick={() => {
              setFoundStudent(null);
              setSearchIndex('');
              setSelectedCourses([]);
            }}>Cancel</button>
            <button 
              className="btn btn-primary px-8 w-full sm:w-auto" 
              disabled={!foundStudent || selectedCourses.length === 0 || submitting}
              onClick={handleRegister}
            >
              {submitting ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
              {submitting ? 'Registering...' : 'Complete Registration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── RESIT ─────────────────────────────────────────────────────
  const [resitSearch, setResitSearch] = useState('');
  const [resitStudent, setResitStudent] = useState<Student | null>(null);
  const [failedCourses, setFailedCourses] = useState<any[]>([]);
  const [resitYear, setResitYear] = useState('');
  const [resitSemester, setResitSemester] = useState('');
  const [allYears, setAllYears] = useState<any[]>([]);
  const [allSemesters, setAllSemesters] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);

  useEffect(() => {
    if (activeSubItem === 'resit' || activeSubItem === 'view_registration') {
      Promise.all([api.getAcademicYears(), api.getSemesters(), api.getStudents()]).then(([y, s, st]) => {
        setAllYears(y); setAllSemesters(s); setAllStudents(st);
        const curY = y.find((x: any) => x.is_current);
        const curS = s.find((x: any) => x.is_current);
        if (curY) { setResitYear(curY.code); setViewYear(curY.code); }
        if (curS) { setResitSemester(curS.sid); setViewSemester(curS.sid); }
      }).catch(console.error);
    }
  }, [activeSubItem]);

  const handleFindResit = async () => {
    const student = allStudents.find(s => s.index_number === resitSearch || (s.full_name || '').toLowerCase().includes(resitSearch.toLowerCase()));
    if (!student) return alert('Student not found');
    setResitStudent(student);
    try {
      const assessments = await api.getAssessmentsByStudent(student.iid);
      const failed = assessments.filter((a: any) => a.grade === 'F' || a.grade === 'E' || a.total_score < 50);
      setFailedCourses(failed);
    } catch (e) { console.error(e); }
  };

  const handleResitRegister = async (course: any) => {
    if (!resitStudent || !resitYear || !resitSemester) return;
    try {
      await api.createRegistration({ iid: resitStudent.iid, cid: course.cid, academic_year: resitYear, semester_sid: resitSemester, status: 'pending' });
      alert(`${course.course_title || course.cid} registered for resit!`);
    } catch (e: any) { alert(e.message || 'Failed'); }
  };

  const renderResit = () => (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-1">Resit Registration</h2>
        <p className="text-slate-500 text-sm mb-4">Find a student's failed courses and register them for resit.</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2 md:col-span-2">
            <label className="label">Search Student (Index or Name)</label>
            <div className="flex gap-2">
              <input type="text" className="input flex-1" placeholder="Index number or name..." value={resitSearch} onChange={e => setResitSearch(e.target.value)} />
              <button className="btn btn-primary" onClick={handleFindResit}><Search size={18} /></button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="label">Year</label>
            <select className="input" value={resitYear} onChange={e => setResitYear(e.target.value)}>
              {allYears.map(y => <option key={y.code} value={y.code}>{y.code}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="label">Semester</label>
            <select className="input" value={resitSemester} onChange={e => setResitSemester(e.target.value)}>
              {allSemesters.map(s => <option key={s.sid} value={s.sid}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>
      {resitStudent && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-red-50/50">
            <h3 className="font-bold text-red-900">Failed Courses for {resitStudent.full_name}</h3>
          </div>
          <table className="w-full text-left">
            <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-3">Code</th>
              <th className="px-6 py-3">Course</th>
              <th className="px-6 py-3 hidden sm:table-cell">Score</th>
              <th className="px-6 py-3 hidden sm:table-cell">Grade</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {failedCourses.length > 0 ? failedCourses.map((c, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3 text-sm font-mono font-bold">{c.cid}</td>
                  <td className="px-6 py-3 text-sm">{c.course_title}</td>
                  <td className="px-6 py-3 text-sm hidden sm:table-cell">{c.total_score}</td>
                  <td className="px-6 py-3 hidden sm:table-cell"><span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-bold">{c.grade}</span></td>
                  <td className="px-6 py-3 text-right">
                    <button onClick={() => handleResitRegister(c)} className="btn btn-primary text-xs py-1 px-3"><Plus size={14} className="mr-1" /> Register</button>
                  </td>
                </tr>
              )) : <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No failed courses found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ─── VIEW REGISTRATION ────────────────────────────────────────
  const [viewYear, setViewYear] = useState('');
  const [viewSemester, setViewSemester] = useState('');
  const [viewRegs, setViewRegs] = useState<any[]>([]);
  const [viewLoading, setViewLoading] = useState(false);

  const fetchViewRegs = async () => {
    if (!viewYear || !viewSemester) return;
    setViewLoading(true);
    try {
      const data = await api.getRegistrations(undefined, viewYear, viewSemester);
      setViewRegs(data);
    } catch (e) { console.error(e); }
    finally { setViewLoading(false); }
  };

  useEffect(() => {
    if (activeSubItem === 'view_registration' && viewYear && viewSemester) fetchViewRegs();
  }, [viewYear, viewSemester, activeSubItem]);

  const renderViewRegistration = () => (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-1">View Registrations</h2>
        <p className="text-slate-500 text-sm mb-4">View all course registrations for a period.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="label">Academic Year</label>
            <select className="input" value={viewYear} onChange={e => setViewYear(e.target.value)}>
              {allYears.map(y => <option key={y.code} value={y.code}>{y.code}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="label">Semester</label>
            <select className="input" value={viewSemester} onChange={e => setViewSemester(e.target.value)}>
              {allSemesters.map(s => <option key={s.sid} value={s.sid}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn btn-primary w-full" onClick={() => window.print()}>🖨️ Print</button>
          </div>
        </div>
      </div>
      <div className="card overflow-hidden" id="print-registrations">
        {viewLoading ? (
          <div className="p-12 flex flex-col items-center"><Loader2 size={32} className="text-blue-600 animate-spin mb-4" /><p className="text-slate-500">Loading...</p></div>
        ) : (
          <table className="w-full text-left">
            <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-3">#</th>
              <th className="px-6 py-3">Student</th>
              <th className="px-6 py-3">Course</th>
              <th className="px-6 py-3 hidden sm:table-cell">Status</th>
              <th className="px-6 py-3 hidden md:table-cell">Date</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {viewRegs.length > 0 ? viewRegs.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3 text-sm text-slate-400">{i + 1}</td>
                  <td className="px-6 py-3">
                    <div className="text-sm font-bold">{r.full_name || `${r.surname || ''}, ${r.other_names || ''}`}</div>
                    <div className="text-xs text-slate-500 font-mono">{r.iid}</div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="text-sm font-medium">{r.course_title || r.cid}</div>
                    <div className="text-xs text-slate-400">{r.credits} credits</div>
                  </td>
                  <td className="px-6 py-3 hidden sm:table-cell">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{r.status}</span>
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-500 hidden md:table-cell">{r.registration_date ? new Date(r.registration_date).toLocaleDateString() : 'N/A'}</td>
                </tr>
              )) : <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No registrations found.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  switch (activeSubItem) {
    case 'open_close':
      return renderOpenClose();
    case 'register_student':
      return renderRegisterStudent();
    case 'resit':
      return renderResit();
    case 'view_registration':
      return renderViewRegistration();
    default:
      return (
        <div className="card p-12 text-center">
          <p className="text-slate-500">The {activeSubItem} feature is coming soon.</p>
        </div>
      );
  }
};
