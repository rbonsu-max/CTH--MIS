import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, ClipboardCheck, FileSpreadsheet, Filter, CheckCircle, Loader2, BookOpen, Download } from 'lucide-react';
import { Course, Registration, Assessment } from '../types';
import { api } from '../services/api';
import Papa from 'papaparse';

interface AssessmentModuleProps {
  activeSubItem: string | null;
}

export const AssessmentModule: React.FC<AssessmentModuleProps> = ({ activeSubItem }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [assessments, setAssessments] = useState<Record<string, { class_score: number, exam_score: number }>>({});
  const [loading, setLoading] = useState(false);
  const [fetchingStudents, setFetchingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [currentYear, setCurrentYear] = useState('');
  const [currentSemester, setCurrentSemester] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [courseData, yearData, semData] = await Promise.all([
        api.getCourses(),
        api.getAcademicYears(),
        api.getSemesters()
      ]);
      setCourses(courseData);
      setAcademicYears(yearData);
      setSemesters(semData);
      
      const currYear = yearData.find(y => y.is_current);
      const currSem = semData.find(s => s.is_current);
      if (currYear) setCurrentYear(currYear.code);
      if (currSem) setCurrentSemester(currSem.sid);
    } catch (error) {
      console.error('Failed to fetch initial assessment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadStudents = async () => {
    if (!selectedCourseId || !currentYear || !currentSemester) return;
    setFetchingStudents(true);
    try {
      const [regData, assessData] = await Promise.all([
        api.getRegistrations(),
        api.getAssessments(selectedCourseId, currentYear, currentSemester)
      ]);
      
      const courseRegs = regData.filter(r => r.cid === selectedCourseId && r.academic_year === currentYear && r.semester_sid === currentSemester);
      setRegistrations(courseRegs);
      
      // Initialize assessments state with existing data if available
      const initialAssessments: Record<string, { class_score: number, exam_score: number }> = {};
      courseRegs.forEach(reg => {
        const existing = assessData.find((a: any) => a.iid === reg.iid);
        initialAssessments[reg.iid] = { 
          class_score: existing ? existing.class_score : 0, 
          exam_score: existing ? existing.exam_score : 0 
        };
      });
      setAssessments(initialAssessments);
    } catch (error) {
      console.error('Failed to fetch students/assessments:', error);
    } finally {
      setFetchingStudents(false);
    }
  };

  const handleScoreChange = (iid: string, type: 'class_score' | 'exam_score', value: string) => {
    const numValue = parseInt(value) || 0;
    const max = type === 'class_score' ? 30 : 70;
    const clampedValue = Math.min(Math.max(0, numValue), max);
    
    setAssessments(prev => ({
      ...prev,
      [iid]: {
        ...prev[iid],
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
    if (registrations.length === 0 || !currentYear || !currentSemester) return;
    setSubmitting(true);
    try {
      await Promise.all(registrations.map(reg => {
        const scores = assessments[reg.iid];
        const total = scores.class_score + scores.exam_score;
        const { grade, point } = calculateGrade(total);
        
        return api.createAssessment({
          iid: reg.iid,
          cid: reg.cid,
          academic_year: currentYear,
          semester_sid: currentSemester,
          class_score: scores.class_score,
          exam_score: scores.exam_score,
          total_score: total,
          grade,
          gp: point
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

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCourseId || !currentYear || !currentSemester) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const importData = results.data.map((row: any) => ({
          iid: row.iid || row.index_number,
          cid: selectedCourseId,
          academic_year: currentYear,
          semester_sid: currentSemester,
          class_score: parseFloat(row.class_score) || 0,
          exam_score: parseFloat(row.exam_score) || 0
        }));

        try {
          setSubmitting(true);
          await api.bulkUploadAssessments(importData);
          alert('Assessments imported successfully!');
          handleLoadStudents(); // Refresh list
        } catch (error) {
          console.error('Failed to import assessments:', error);
          alert('Failed to import assessments');
        } finally {
          setSubmitting(false);
        }
      }
    });
  };

  const downloadTemplate = () => {
    const headers = ['iid', 'class_score', 'exam_score'];
    const csv = Papa.unparse([headers]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `assessment_template_${selectedCourseId}.csv`);
    link.click();
  };

  const renderByCourse = () => (
    <div className="space-y-6">
      <div className="card p-4 md:p-6 bg-slate-900 text-white border-none">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold">Course Assessment Entry</h2>
            <p className="text-slate-400 text-sm">Enter scores for all students registered for a specific course.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-3">
            <button 
              className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg px-4 py-2 text-sm flex items-center justify-center gap-2 transition-colors border border-slate-700"
              onClick={downloadTemplate}
              disabled={!selectedCourseId}
            >
              <Download size={16} />
              Template
            </button>
            <label className={`bg-slate-800 hover:bg-slate-700 text-white rounded-lg px-4 py-2 text-sm flex items-center justify-center gap-2 transition-colors border border-slate-700 cursor-pointer ${(!selectedCourseId || !currentYear || !currentSemester) ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <FileSpreadsheet size={16} />
              Import CSV
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                onChange={handleImport}
                disabled={!selectedCourseId || !currentYear || !currentSemester}
              />
            </label>
            <select 
              className="bg-slate-800 border-slate-700 text-white rounded-lg px-4 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none w-full lg:w-auto"
              value={currentYear}
              onChange={e => setCurrentYear(e.target.value)}
            >
              <option value="">Select Year</option>
              {academicYears.map(y => <option key={y.code} value={y.code}>{y.code}</option>)}
            </select>
            <select 
              className="bg-slate-800 border-slate-700 text-white rounded-lg px-4 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none w-full lg:w-auto"
              value={currentSemester}
              onChange={e => setCurrentSemester(e.target.value)}
            >
              <option value="">Select Semester</option>
              {semesters.map(s => <option key={s.sid} value={s.sid}>{s.name}</option>)}
            </select>
            <select 
              className="bg-slate-800 border-slate-700 text-white rounded-lg px-4 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none w-full lg:w-auto"
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value)}
            >
              <option value="">Select Course</option>
              {courses.map(c => (
                <option key={c.id} value={c.cid}>{c.code} - {c.title}</option>
              ))}
            </select>
            <button 
              className="btn btn-primary px-6 w-full lg:w-auto" 
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
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50/50 gap-4">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white rounded-lg shadow-sm flex-shrink-0">
                <BookOpen size={20} className="text-blue-600" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate">
                  {courses.find(c => c.cid === selectedCourseId)?.cid} - {courses.find(c => c.cid === selectedCourseId)?.title}
                </div>
                <div className="text-xs text-slate-400">{registrations.length} Students Registered</div>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button className="btn btn-secondary py-1.5 px-3 text-xs gap-2 flex-1 sm:flex-none justify-center">
                <FileSpreadsheet size={14} />
                Import Excel
              </button>
              <button 
                className="btn btn-primary py-1.5 px-3 text-xs gap-2 flex-1 sm:flex-none justify-center"
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
                  <th className="px-6 py-4 font-semibold text-center w-24 sm:w-32">Mid-Sem</th>
                  <th className="px-6 py-4 font-semibold text-center w-24 sm:w-32">Exam</th>
                  <th className="px-6 py-4 font-semibold text-center w-20 sm:w-24">Total</th>
                  <th className="px-6 py-4 font-semibold text-center w-20 sm:w-24 hidden sm:table-cell">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registrations.map((reg) => {
                  const scores = assessments[reg.iid] || { class_score: 0, exam_score: 0 };
                  const total = scores.class_score + scores.exam_score;
                  const { grade, color } = calculateGrade(total);
                  
                  return (
                    <tr key={reg.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-slate-600">{reg.iid}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{reg.full_name || 'Loading...'}</td>
                      <td className="px-6 py-4">
                        <input 
                          type="number" 
                          className="input text-center py-1 px-1 h-8" 
                          value={scores.class_score} 
                          onChange={e => handleScoreChange(reg.iid, 'class_score', e.target.value)}
                          max={30} 
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="number" 
                          className="input text-center py-1 px-1 h-8" 
                          value={scores.exam_score} 
                          onChange={e => handleScoreChange(reg.iid, 'exam_score', e.target.value)}
                          max={70} 
                        />
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-900">
                        {total}
                        <div className="sm:hidden mt-1">
                          <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase ${color}`}>
                            {grade}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center hidden sm:table-cell">
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
          <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-end gap-3">
            <button className="btn btn-secondary w-full sm:w-auto" onClick={() => setRegistrations([])}>Cancel Changes</button>
            <button 
              className="btn btn-primary px-8 w-full sm:w-auto"
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
