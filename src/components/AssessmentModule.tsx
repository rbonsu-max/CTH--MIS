import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, ClipboardCheck, FileSpreadsheet, Filter, CheckCircle, Loader2, BookOpen } from 'lucide-react';
import { Course, Registration, Assessment } from '../types';
import { api } from '../services/api';

interface AssessmentModuleProps {
  activeSubItem: string | null;
}

export const AssessmentModule: React.FC<AssessmentModuleProps> = ({ activeSubItem }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [assessments, setAssessments] = useState<Record<string, { midSem: number, exam: number }>>({});
  const [loading, setLoading] = useState(false);
  const [fetchingStudents, setFetchingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const data = await api.getCourses();
      setCourses(data);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadStudents = async () => {
    if (!selectedCourseId) return;
    setFetchingStudents(true);
    try {
      const data = await api.getRegistrations();
      const courseRegs = data.filter(r => r.courseId === selectedCourseId);
      setRegistrations(courseRegs);
      
      // Initialize assessments state
      const initialAssessments: Record<string, { midSem: number, exam: number }> = {};
      courseRegs.forEach(reg => {
        initialAssessments[reg.studentId] = { midSem: 0, exam: 0 };
      });
      setAssessments(initialAssessments);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setFetchingStudents(false);
    }
  };

  const handleScoreChange = (studentId: string, type: 'midSem' | 'exam', value: string) => {
    const numValue = parseInt(value) || 0;
    const max = type === 'midSem' ? 30 : 70;
    const clampedValue = Math.min(Math.max(0, numValue), max);
    
    setAssessments(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [type]: clampedValue
      }
    }));
  };

  const calculateGrade = (total: number) => {
    if (total >= 80) return { grade: 'A', point: 4.0, color: 'bg-emerald-100 text-emerald-700' };
    if (total >= 75) return { grade: 'B+', point: 3.5, color: 'bg-blue-100 text-blue-700' };
    if (total >= 70) return { grade: 'B', point: 3.0, color: 'bg-blue-100 text-blue-700' };
    if (total >= 65) return { grade: 'C+', point: 2.5, color: 'bg-orange-100 text-orange-700' };
    if (total >= 60) return { grade: 'C', point: 2.0, color: 'bg-orange-100 text-orange-700' };
    if (total >= 55) return { grade: 'D+', point: 1.5, color: 'bg-red-100 text-red-700' };
    if (total >= 50) return { grade: 'D', point: 1.0, color: 'bg-red-100 text-red-700' };
    return { grade: 'E', point: 0, color: 'bg-red-100 text-red-700' };
  };

  const handleSaveAll = async () => {
    if (registrations.length === 0) return;
    setSubmitting(true);
    try {
      const academicYear = '2025/2026';
      const semester = '1st Semester';
      
      await Promise.all(registrations.map(reg => {
        const scores = assessments[reg.studentId];
        const total = scores.midSem + scores.exam;
        const { grade, point } = calculateGrade(total);
        
        return api.createAssessment({
          studentId: reg.studentId,
          courseId: reg.courseId,
          academicYear,
          semester,
          midSemScore: scores.midSem,
          examScore: scores.exam,
          totalScore: total,
          grade,
          gradePoint: point
        });
      }));
      
      alert('Assessments saved successfully!');
    } catch (error) {
      console.error('Failed to save assessments:', error);
      alert('Failed to save assessments');
    } finally {
      setSubmitting(false);
    }
  };

  const renderByCourse = () => (
    <div className="space-y-6">
      <div className="card p-6 bg-slate-900 text-white border-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold">Course Assessment Entry</h2>
            <p className="text-slate-400 text-sm">Enter scores for all students registered for a specific course.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <select 
              className="bg-slate-800 border-slate-700 text-white rounded-lg px-4 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value)}
            >
              <option value="">Select Course</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
              ))}
            </select>
            <button 
              className="btn btn-primary px-6" 
              onClick={handleLoadStudents}
              disabled={!selectedCourseId || fetchingStudents}
            >
              {fetchingStudents ? <Loader2 size={18} className="animate-spin" /> : 'Load Students'}
            </button>
          </div>
        </div>
      </div>

      {registrations.length > 0 && (
        <div className="card overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <BookOpen size={20} className="text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">
                  {courses.find(c => c.id === selectedCourseId)?.code} - {courses.find(c => c.id === selectedCourseId)?.name}
                </div>
                <div className="text-xs text-slate-400">{registrations.length} Students Registered</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary py-1.5 px-3 text-xs gap-2">
                <FileSpreadsheet size={14} />
                Import Excel
              </button>
              <button 
                className="btn btn-primary py-1.5 px-3 text-xs gap-2"
                onClick={handleSaveAll}
                disabled={submitting}
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                {submitting ? 'Saving...' : 'Save All'}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-4 font-semibold">Student ID</th>
                  <th className="px-6 py-4 font-semibold">Student Name</th>
                  <th className="px-6 py-4 font-semibold text-center w-32">Mid-Sem (30)</th>
                  <th className="px-6 py-4 font-semibold text-center w-32">Exam (70)</th>
                  <th className="px-6 py-4 font-semibold text-center w-24">Total</th>
                  <th className="px-6 py-4 font-semibold text-center w-24">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registrations.map((reg) => {
                  const scores = assessments[reg.studentId] || { midSem: 0, exam: 0 };
                  const total = scores.midSem + scores.exam;
                  const { grade, color } = calculateGrade(total);
                  
                  return (
                    <tr key={reg.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-slate-600">{reg.studentId}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{reg.studentName || 'Loading...'}</td>
                      <td className="px-6 py-4">
                        <input 
                          type="number" 
                          className="input text-center py-1" 
                          value={scores.midSem} 
                          onChange={e => handleScoreChange(reg.studentId, 'midSem', e.target.value)}
                          max={30} 
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="number" 
                          className="input text-center py-1" 
                          value={scores.exam} 
                          onChange={e => handleScoreChange(reg.studentId, 'exam', e.target.value)}
                          max={70} 
                        />
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-900">
                        {total}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${color}`}>
                          {grade}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
            <button className="btn btn-secondary" onClick={() => setRegistrations([])}>Cancel Changes</button>
            <button 
              className="btn btn-primary px-8"
              onClick={handleSaveAll}
              disabled={submitting}
            >
              {submitting ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
              {submitting ? 'Saving...' : 'Save & Submit Results'}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  switch (activeSubItem) {
    case 'by_course':
      return renderByCourse();
    default:
      return (
        <div className="card p-12 text-center">
          <p className="text-slate-500">The {activeSubItem} feature is coming soon.</p>
        </div>
      );
  }
};
