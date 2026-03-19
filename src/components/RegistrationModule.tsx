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
      const student = students.find(s => s.indexNumber === searchIndex);
      
      if (student) {
        setFoundStudent(student);
        // Fetch courses for this student's program
        const allCourses = await api.getCourses();
        const programCourses = allCourses.filter(c => c.programId === student.programId && c.level === student.level);
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
      const academicYear = '2025/2026'; // Mock current year
      const semester = '1st Semester'; // Mock current semester
      
      await Promise.all(selectedCourses.map(courseId => 
        api.createRegistration({
          studentId: foundStudent.id,
          courseId,
          academicYear,
          semester,
          status: 'Registered'
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

  const renderOpenClose = () => (
    <div className="space-y-6">
      <div className="card p-8 bg-blue-600 text-white border-none">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">Registration Status</h2>
            <p className="text-blue-100">Control student registration for the current semester.</p>
          </div>
          <div className="px-4 py-2 bg-emerald-500 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
            Currently Open
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-500/30 p-6 rounded-xl border border-blue-400/30">
            <div className="text-blue-100 text-sm mb-1">Academic Year</div>
            <div className="text-xl font-bold">2025/2026</div>
          </div>
          <div className="bg-blue-500/30 p-6 rounded-xl border border-blue-400/30">
            <div className="text-blue-100 text-sm mb-1">Semester</div>
            <div className="text-xl font-bold">1st Semester</div>
          </div>
          <div className="bg-blue-500/30 p-6 rounded-xl border border-blue-400/30">
            <div className="text-blue-100 text-sm mb-1">Students Registered</div>
            <div className="text-xl font-bold">2,145 / 2,450</div>
          </div>
        </div>
        <div className="mt-8 flex gap-4">
          <button className="btn bg-white text-blue-600 hover:bg-blue-50 font-bold px-8">
            Close Registration
          </button>
          <button className="btn bg-blue-500 text-white hover:bg-blue-400 border border-blue-400 font-bold px-8">
            Extend Deadline
          </button>
        </div>
      </div>

      <div className="card">
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-bold text-lg">Registration History</h2>
        </div>
        <div className="p-6 space-y-4">
          {[
            { year: '2024/2025', semester: '2nd Semester', status: 'Closed', date: 'Oct 15, 2024' },
            { year: '2024/2025', semester: '1st Semester', status: 'Closed', date: 'Mar 10, 2024' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Clock size={20} className="text-slate-500" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{item.year} - {item.semester}</div>
                  <div className="text-xs text-slate-400">Closed on {item.date}</div>
                </div>
              </div>
              <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-500">
                {item.status}
              </span>
            </div>
          ))}
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
            <div className="flex gap-2">
              <input 
                type="text" 
                className="input" 
                placeholder="e.g. SIMS/2025/001" 
                value={searchIndex}
                onChange={e => setSearchIndex(e.target.value)}
              />
              <button 
                className="btn btn-primary" 
                onClick={handleFindStudent}
                disabled={searching}
              >
                {searching ? <Loader2 size={18} className="animate-spin" /> : 'Find'}
              </button>
            </div>
          </div>

          {foundStudent && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900">Student Information</h3>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Full Name:</span>
                    <span className="font-medium">{foundStudent.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Index Number:</span>
                    <span className="font-medium">{foundStudent.indexNumber}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Level:</span>
                    <span className="font-medium">{foundStudent.level}</span>
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
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" 
                        checked={selectedCourses.includes(course.id)}
                        onChange={() => handleToggleCourse(course.id)}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-bold text-slate-900">{course.code}: {course.name}</div>
                        <div className="text-xs text-slate-400">{course.creditHours} Credits</div>
                      </div>
                    </label>
                  )) : (
                    <p className="text-sm text-slate-500 italic">No courses available for this student's level/program.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button className="btn btn-secondary" onClick={() => {
              setFoundStudent(null);
              setSearchIndex('');
              setSelectedCourses([]);
            }}>Cancel</button>
            <button 
              className="btn btn-primary px-8" 
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
