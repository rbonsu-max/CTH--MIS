import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, ClipboardCheck, FileSpreadsheet, Filter, CheckCircle, Loader2, BookOpen, Download, Lock, AlertTriangle, Send, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { Course, Registration, Assessment } from '../types';
import { api } from '../services/api';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { printElement } from '../utils/print';

interface AssessmentModuleProps {
  activeSubItem: string | null;
  user?: any;
}

export const AssessmentModule: React.FC<AssessmentModuleProps> = ({ activeSubItem, user }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [assessments, setAssessments] = useState<Record<string, { a1: number, a2: number, a3: number, a4: number, exam_score: number }>>({});
  const [loading, setLoading] = useState(false);
  const [fetchingStudents, setFetchingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { success, error: toastError } = useToast();

  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [currentYear, setCurrentYear] = useState('');
  const [currentSemester, setCurrentSemester] = useState('');
  
  const [accessInfo, setAccessInfo] = useState<{ hasAccess: boolean; accessSource: string | null; window: any | null } | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [requestType, setRequestType] = useState<'upload' | 'edit'>('upload');
  const [requestStudentId, setRequestStudentId] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedCourseId && currentYear && currentSemester) {
      checkAccess();
    }
  }, [selectedCourseId, currentYear, currentSemester]);

  const checkAccess = async () => {
    if (user?.role === 'SuperAdmin') {
      setAccessInfo({ hasAccess: true, accessSource: 'SuperAdmin', window: null });
      return;
    }
    setCheckingAccess(true);
    try {
      const info = await api.checkAssessmentAccess({
        academic_year: currentYear,
        semester_id: currentSemester,
        course_code: selectedCourseId
      });
      setAccessInfo(info);
    } catch (error) {
      console.error('Failed to check access:', error);
    } finally {
      setCheckingAccess(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createAssessmentRequest({
        course_code: selectedCourseId,
        academic_year: currentYear,
        semester_id: currentSemester,
        request_type: requestType,
        index_no: requestStudentId || undefined,
        reason: requestReason
      });
      success('Access request submitted to SuperAdmin!');
      setShowRequestModal(false);
      setRequestReason('');
      setRequestStudentId('');
    } catch (error: any) {
      toastError(error.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

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
      
      const courseRegs = regData.filter(r => r.course_code === selectedCourseId && r.academic_year === currentYear && r.semester_sid === currentSemester);
      setRegistrations(courseRegs);

      if (courseRegs.length === 0) {
        setAssessments({});
        toastError('No records found for the selected course, year, and semester.');
        return;
      }
      
      // Initialize assessments state with existing data if available
      const initialAssessments: Record<string, { a1: number, a2: number, a3: number, a4: number, exam_score: number }> = {};
      courseRegs.forEach(reg => {
        const existing = assessData.find((a: any) => a.index_no === reg.index_no);
        initialAssessments[reg.index_no] = { 
          a1: existing ? existing.a1 : 0, 
          a2: existing ? existing.a2 : 0, 
          a3: existing ? existing.a3 : 0, 
          a4: existing ? existing.a4 : 0, 
          exam_score: existing ? existing.exam_score : 0 
        };
      });
      setAssessments(initialAssessments);
    } catch (error) {
      console.error('Failed to fetch students/assessments:', error);
      setRegistrations([]);
      setAssessments({});
      toastError('Failed to load records for the selected filters.');
    } finally {
      setFetchingStudents(false);
    }
  };

  const handleScoreChange = (index_no: string, type: 'a1' | 'a2' | 'a3' | 'a4' | 'exam_score', value: string) => {
    const numValue = parseInt(value) || 0;
    const max = type === 'exam_score' ? 60 : 10;
    const clampedValue = Math.min(Math.max(0, numValue), max);
    
    setAssessments(prev => ({
      ...prev,
      [index_no]: {
        ...prev[index_no],
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
    if (accessInfo && !accessInfo.hasAccess) {
      toastError('You do not have access to save results at this time.');
      return;
    }
    setSubmitting(true);
    try {
      await Promise.all(registrations.map(reg => {
        const scores = assessments[reg.index_no];
        const total_ca = scores.a1 + scores.a2 + scores.a3 + scores.a4;
        const total = total_ca + scores.exam_score;
        const { grade, point } = calculateGrade(total);
        
        return api.createAssessment({
          index_no: reg.index_no,
          course_code: reg.course_code,
          academic_year: currentYear,
          semester_id: currentSemester,
          a1: scores.a1,
          a2: scores.a2,
          a3: scores.a3,
          a4: scores.a4,
          exam_score: scores.exam_score,
          total_score: total,
          grade,
          grade_point: point
        });
      }));
      
      success('Assessments saved successfully!');
    } catch (error) {
      console.error('Failed to save assessments:', error);
      toastError('Failed to save assessments');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCourseId || !currentYear || !currentSemester) return;
    if (accessInfo && !accessInfo.hasAccess) {
      toastError('You do not have access to upload results at this time.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setSubmitting(true);
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const importData = data.map((row: any) => ({
          index_no: row.index_no || row.index_number || row.iid || row['Index Number'],
          course_code: selectedCourseId,
          academic_year: currentYear,
          semester_id: currentSemester,
          a1: parseFloat(row.a1 || row['CA1'] || 0),
          a2: parseFloat(row.a2 || row['CA2'] || 0),
          a3: parseFloat(row.a3 || row['CA3'] || 0),
          a4: parseFloat(row.a4 || row['CA4'] || 0),
          exam_score: parseFloat(row.exam_score || row['Exam Score'] || 0)
        }));

        await api.bulkUploadAssessments(importData);
        success('Assessments imported successfully!');
        handleLoadStudents(); // Refresh list
      } catch (error) {
        console.error('Failed to import assessments:', error);
        toastError('Failed to import assessments. Ensure the file format is correct.');
      } finally {
        setSubmitting(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const data = [
      { 'Index Number': '', 'CA1': '', 'CA2': '', 'CA3': '', 'CA4': '', 'Exam Score': '' }
    ];
    
    // If we have registrations, pre-populate them
    const templateData = registrations.length > 0 
      ? registrations.map(r => ({
          'Index Number': r.index_no,
          'Student Name': r.full_name,
          'CA1': '',
          'CA2': '',
          'CA3': '',
          'CA4': '',
          'Exam Score': ''
        }))
      : data;

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Assessment Template');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `assessment_template_${selectedCourseId}.xlsx`);
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
            <label className={`bg-slate-800 hover:bg-slate-700 text-white rounded-lg px-4 py-2 text-sm flex items-center justify-center gap-2 transition-colors border border-slate-700 cursor-pointer ${(!selectedCourseId || !currentYear || !currentSemester || (accessInfo && !accessInfo.hasAccess)) ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <FileSpreadsheet size={16} />
              Import Excel/CSV
              <input 
                type="file" 
                accept=".xlsx,.xls,.csv" 
                className="hidden" 
                onChange={handleImport}
                disabled={!selectedCourseId || !currentYear || !currentSemester || (accessInfo && !accessInfo.hasAccess)}
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
                <option key={c.id} value={c.code}>{c.code} - {c.name}</option>
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

        {selectedCourseId && accessInfo && !accessInfo.hasAccess && (
          <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500 text-white rounded-lg shadow-lg shadow-orange-500/20">
                <Lock size={18} />
              </div>
              <div>
                <div className="text-sm font-bold text-orange-200">Upload Access Restricted</div>
                <p className="text-xs text-orange-200/70">The assessment window is closed or you don't have permission to edit existing results.</p>
              </div>
            </div>
            <button 
              className="btn py-1.5 px-4 bg-orange-500 hover:bg-orange-600 text-white border-none text-xs font-bold gap-2 shadow-lg shadow-orange-500/20"
              onClick={() => {
                setRequestType('upload');
                setShowRequestModal(true);
              }}
            >
              <Send size={14} />
              Request Access
            </button>
          </div>
        )}

        {selectedCourseId && accessInfo?.hasAccess && accessInfo.accessSource === 'Request' && (
          <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-500/20">
              <CheckCircle size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-emerald-200">Temporary Access Granted</div>
              <p className="text-xs text-emerald-200/70">You have been granted access to upload/edit results for this course.</p>
            </div>
          </div>
        )}
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
                  {courses.find(c => c.code === selectedCourseId)?.code} - {courses.find(c => c.code === selectedCourseId)?.name}
                </div>
                <div className="text-xs text-slate-400">{registrations.length} Students Registered</div>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                className="btn btn-secondary py-1.5 px-3 text-xs gap-2 flex-1 sm:flex-none justify-center"
                onClick={() => printElement('print-assessment', `Assessment Sheet - ${selectedCourseId}`)}
              >
                🖨️ Print Sheet
              </button>
              <button 
                className="btn btn-primary py-1.5 px-3 text-xs gap-2 flex-1 sm:flex-none justify-center"
                onClick={handleSaveAll}
                disabled={submitting || (accessInfo && !accessInfo.hasAccess)}
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                {submitting ? 'Saving...' : 'Save All'}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto" id="print-assessment">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-4 font-semibold">Student ID</th>
                  <th className="px-6 py-4 font-semibold">Student Name</th>
                  <th className="px-2 py-4 font-semibold text-center w-16">A1</th>
                  <th className="px-2 py-4 font-semibold text-center w-16">A2</th>
                  <th className="px-2 py-4 font-semibold text-center w-16">A3</th>
                  <th className="px-2 py-4 font-semibold text-center w-16">A4</th>
                  <th className="px-4 py-4 font-semibold text-center w-24">Exam</th>
                  <th className="px-4 py-4 font-semibold text-center w-20">Total</th>
                  <th className="px-4 py-4 font-semibold text-center w-20">GP</th>
                  <th className="px-4 py-4 font-semibold text-center w-20 hidden sm:table-cell">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registrations.map((reg) => {
                  const scores = assessments[reg.index_no] || { a1: 0, a2: 0, a3: 0, a4: 0, exam_score: 0 };
                  const total_ca = scores.a1 + scores.a2 + scores.a3 + scores.a4;
                  const total = total_ca + scores.exam_score;
                  const { grade, color, point } = calculateGrade(total);
                  
                  return (
                    <tr key={reg.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-slate-600">{reg.index_no}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{reg.full_name || 'Loading...'}</td>
                      <td className="px-2 py-4">
                        <input type="number" className="input text-center py-1 px-1 h-8" value={scores.a1} onChange={e => handleScoreChange(reg.index_no, 'a1', e.target.value)} max={10} disabled={accessInfo && !accessInfo.hasAccess} />
                      </td>
                      <td className="px-2 py-4">
                        <input type="number" className="input text-center py-1 px-1 h-8" value={scores.a2} onChange={e => handleScoreChange(reg.index_no, 'a2', e.target.value)} max={10} disabled={accessInfo && !accessInfo.hasAccess} />
                      </td>
                      <td className="px-2 py-4">
                        <input type="number" className="input text-center py-1 px-1 h-8" value={scores.a3} onChange={e => handleScoreChange(reg.index_no, 'a3', e.target.value)} max={10} disabled={accessInfo && !accessInfo.hasAccess} />
                      </td>
                      <td className="px-2 py-4">
                        <input type="number" className="input text-center py-1 px-1 h-8" value={scores.a4} onChange={e => handleScoreChange(reg.index_no, 'a4', e.target.value)} max={10} disabled={accessInfo && !accessInfo.hasAccess} />
                      </td>
                      <td className="px-4 py-4">
                        <input type="number" className="input text-center py-1 px-1 h-8" value={scores.exam_score} onChange={e => handleScoreChange(reg.index_no, 'exam_score', e.target.value)} max={60} disabled={accessInfo && !accessInfo.hasAccess} />
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-slate-900">
                        {total}
                      </td>
                      <td className="px-4 py-4 text-center font-mono text-sm text-blue-600">
                        {point.toFixed(1)}
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
              disabled={submitting || (accessInfo && !accessInfo.hasAccess)}
            >
              {submitting ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
              {submitting ? 'Saving...' : 'Save & Submit Results'}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ─── BY INDIVIDUAL ────────────────────────────────────────────
  const [indSearch, setIndSearch] = useState('');
  const [indStudent, setIndStudent] = useState<any>(null);
  const [indAssessments, setIndAssessments] = useState<any[]>([]);
  const [indScores, setIndScores] = useState<Record<string, { a1: number, a2: number, a3: number, a4: number, exam_score: number }>>({});
  const [indSaving, setIndSaving] = useState(false);
  const [allStudents, setAllStudents] = useState<any[]>([]);

  useEffect(() => {
    if (activeSubItem === 'by_individual') {
      api.getStudents().then(setAllStudents).catch(console.error);
    }
  }, [activeSubItem]);

  const handleFindIndividual = async () => {
    const student = allStudents.find((s: any) =>
      s.index_number === indSearch || (s.full_name || '').toLowerCase().includes(indSearch.toLowerCase())
    );
    if (!student) return toastError('Student not found');
    setIndStudent(student);
    try {
      const regs = await api.getRegistrations(student.index_no || student.iid, currentYear, currentSemester);
      const existing = await api.getAssessmentsByStudent(student.index_no || student.iid, currentYear, currentSemester);
      setIndAssessments(regs);
      const scores: Record<string, { a1: number, a2: number, a3: number, a4: number, exam_score: number }> = {};
      regs.forEach((r: any) => {
        const ex = existing.find((a: any) => a.course_code === r.course_code);
        scores[r.course_code] = { a1: ex?.a1||0, a2: ex?.a2||0, a3: ex?.a3||0, a4: ex?.a4||0, exam_score: ex?.exam_score || 0 };
      });
      setIndScores(scores);
    } catch (e) { console.error(e); }
  };

  const handleSaveIndividual = async () => {
    if (!indStudent || !currentYear || !currentSemester) return;
    setIndSaving(true);
    try {
      await Promise.all(Object.entries(indScores).map(([course_code, scores]: [string, { a1: number, a2: number, a3: number, a4: number, exam_score: number }]) => {
        const total = scores.a1 + scores.a2 + scores.a3 + scores.a4 + scores.exam_score;
        const { grade, point } = calculateGrade(total);
        return api.createAssessment({
          index_no: indStudent.index_no || indStudent.iid, course_code, academic_year: currentYear, semester_id: currentSemester,
          a1: scores.a1, a2: scores.a2, a3: scores.a3, a4: scores.a4, exam_score: scores.exam_score, total_score: total, grade, grade_point: point
        });
      }));
      success('Scores saved!');
    } catch (e) { toastError('Failed'); }
    finally { setIndSaving(false); }
  };

  const renderByIndividual = () => (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-1">Assessment by Individual</h2>
        <p className="text-slate-500 text-sm mb-4">Search for a student and enter their scores for all registered courses.</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2 md:col-span-2">
            <label className="label">Search Student</label>
            <div className="flex gap-2">
              <input type="text" className="input flex-1" placeholder="Index or name..." value={indSearch} onChange={e => setIndSearch(e.target.value)} />
              <button className="btn btn-primary" onClick={handleFindIndividual}><Search size={18} /></button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="label">Academic Year</label>
            <select className="input" value={currentYear} onChange={e => setCurrentYear(e.target.value)}>
              {academicYears.map(y => <option key={y.code} value={y.code}>{y.code}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="label">Semester</label>
            <select className="input" value={currentSemester} onChange={e => setCurrentSemester(e.target.value)}>
              {semesters.map(s => <option key={s.sid} value={s.sid}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>
      {indStudent && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-blue-50/50">
            <h3 className="font-bold text-blue-900">{indStudent.full_name} — {indStudent.index_number}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3">Course</th>
                <th className="px-2 py-3 w-16">A1</th>
                <th className="px-2 py-3 w-16">A2</th>
                <th className="px-2 py-3 w-16">A3</th>
                <th className="px-2 py-3 w-16">A4</th>
                <th className="px-4 py-3 w-24">Exam</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Grade</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {indAssessments.length > 0 ? indAssessments.map(r => {
                  const scores = indScores[r.course_code] || { a1: 0, a2: 0, a3: 0, a4: 0, exam_score: 0 };
                  const total = scores.a1 + scores.a2 + scores.a3 + scores.a4 + scores.exam_score;
                  const { grade, color } = calculateGrade(total);
                  return (
                    <tr key={r.course_code}>
                      <td className="px-6 py-3"><div className="text-sm font-bold">{r.course_code}</div><div className="text-xs text-slate-500">{r.course_name}</div></td>
                      <td className="px-2 py-3"><input type="number" className="input text-center p-1 font-mono h-8" min="0" max="10" value={scores.a1} onChange={e => setIndScores(prev => ({ ...prev, [r.course_code]: { ...prev[r.course_code], a1: Math.min(10, parseInt(e.target.value) || 0) } }))} /></td>
                      <td className="px-2 py-3"><input type="number" className="input text-center p-1 font-mono h-8" min="0" max="10" value={scores.a2} onChange={e => setIndScores(prev => ({ ...prev, [r.course_code]: { ...prev[r.course_code], a2: Math.min(10, parseInt(e.target.value) || 0) } }))} /></td>
                      <td className="px-2 py-3"><input type="number" className="input text-center p-1 font-mono h-8" min="0" max="10" value={scores.a3} onChange={e => setIndScores(prev => ({ ...prev, [r.course_code]: { ...prev[r.course_code], a3: Math.min(10, parseInt(e.target.value) || 0) } }))} /></td>
                      <td className="px-2 py-3"><input type="number" className="input text-center p-1 font-mono h-8" min="0" max="10" value={scores.a4} onChange={e => setIndScores(prev => ({ ...prev, [r.course_code]: { ...prev[r.course_code], a4: Math.min(10, parseInt(e.target.value) || 0) } }))} /></td>
                      <td className="px-4 py-3"><input type="number" className="input text-center p-1 font-mono h-8" min="0" max="60" value={scores.exam_score} onChange={e => setIndScores(prev => ({ ...prev, [r.course_code]: { ...prev[r.course_code], exam_score: Math.min(60, parseInt(e.target.value) || 0) } }))} /></td>
                      <td className="px-4 py-3 text-sm font-bold">{total}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-bold ${color}`}>{grade}</span></td>
                    </tr>
                  );
                }) : <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No registered courses found.</td></tr>}
              </tbody>
            </table>
          </div>
          {indAssessments.length > 0 && (
            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button onClick={handleSaveIndividual} disabled={indSaving} className="btn btn-primary px-8">
                {indSaving ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                {indSaving ? 'Saving...' : 'Save Scores'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {activeSubItem === 'by_individual' ? renderByIndividual() : renderByCourse()}

      {showRequestModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-lg">Request Access</h2>
              <button onClick={() => setShowRequestModal(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                <X size={20} />
              </button>
            </div>
            <form className="p-6 space-y-4" onSubmit={handleCreateRequest}>
              <div className="p-4 bg-blue-50 rounded-xl mb-4 border border-blue-100 flex gap-3">
                <AlertTriangle size={20} className="text-blue-600 shrink-0" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  Provide a clear reason for why you need access to upload or edit results for <strong>{selectedCourseId}</strong> outside the regular assessment window.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="label">Request Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={`py-2 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      requestType === 'upload' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                    }`}
                    onClick={() => setRequestType('upload')}
                  >
                    Bulk Upload
                  </button>
                  <button
                    type="button"
                    className={`py-2 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      requestType === 'edit' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                    }`}
                    onClick={() => setRequestType('edit')}
                  >
                    Specific Student
                  </button>
                </div>
              </div>

              {requestType === 'edit' && (
                <div className="space-y-1.5">
                  <label className="label">Student Index Number</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. SN-ICT-23-001"
                    required
                    value={requestStudentId}
                    onChange={e => setRequestStudentId(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="label">Reason for Request</label>
                <textarea
                  className="input min-h-[100px] py-3"
                  placeholder="Explain why you need access..."
                  required
                  value={requestReason}
                  onChange={e => setRequestReason(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                <button type="button" className="btn btn-secondary px-6" onClick={() => setShowRequestModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary px-8 gap-2" disabled={submitting}>
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
