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

  switch (activeSubItem) {
    case 'open_close':
      return renderOpenClose();
    case 'register_student':
      return renderRegisterStudent();
    default:
      return (
        <div className="card p-12 text-center">
          <p className="text-slate-500">The {activeSubItem} feature is coming soon.</p>
        </div>
      );
  }
};
