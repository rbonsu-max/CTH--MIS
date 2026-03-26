import React, { useState, useEffect } from 'react';
import { Printer, Loader2, Download, Search, CheckCircle, XCircle, AlertCircle, Trash2, Edit2, Plus, ChevronRight, BookOpen, User as UserIcon, Calendar, Settings as SettingsIcon, GraduationCap, ClipboardList, Filter } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { Student, Assessment, AcademicYear, Semester, Course, BoardsheetCache, Program, BroadsheetSummaryResponse, BroadsheetSummaryRow } from '../types';
import { api } from '../services/api';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { TranscriptModal } from './TranscriptModal';
import { printElement } from '../utils/print';
import { PaginationControls } from './PaginationControls';
import { DEFAULT_PAGE_SIZE, paginateItems } from '../utils/pagination';

interface AcademicRecordsModuleProps {
  activeSubItem: string | null;
}

export const AcademicRecordsModule: React.FC<AcademicRecordsModuleProps> = ({ activeSubItem }) => {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentYear, setCurrentYear] = useState('');
  const [currentSemester, setCurrentSemester] = useState('');
  const { error: toastError } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const [y, s, c, st, p] = await Promise.all([api.getAcademicYears(), api.getSemesters(), api.getCourses(), api.getStudents(), api.getPrograms()]);
        setYears(y); setSemesters(s); setCourses(c); setStudents(st); setPrograms(p);
        const curY = y.find(x => x.is_current);
        const curS = s.find(x => x.is_current);
        if (curY) setCurrentYear(curY.code);
        if (curS) setCurrentSemester(curS.sid);
      } catch (e) { console.error(e); }
    };
    load();
  }, []);

  // ─── COURSE RESULTS ─────────────────────────────────────────
  const [crCourse, setCrCourse] = useState('');
  const [crResults, setCrResults] = useState<Assessment[]>([]);
  const [crLoading, setCrLoading] = useState(false);
  const [crPage, setCrPage] = useState(1);
  const [crPageSize, setCrPageSize] = useState(DEFAULT_PAGE_SIZE);

  const fetchCourseResults = async () => {
    if (!crCourse || !currentYear || !currentSemester) return;
    setCrLoading(true);
    setCrResults([]);
    try {
      const data = await api.getAssessments(crCourse, currentYear, currentSemester);
      setCrResults(data);
      if (data.length === 0) {
        toastError('No records found for the selected filters.');
      }
    } catch (e) {
      console.error(e);
      setCrResults([]);
      toastError('Failed to load records for the selected filters.');
    }
    finally { setCrLoading(false); }
  };

  useEffect(() => {
    if (activeSubItem === 'course_results' && crCourse) fetchCourseResults();
  }, [crCourse, currentYear, currentSemester]);

  useEffect(() => {
    setCrPage(1);
  }, [crCourse, currentYear, currentSemester, crPageSize]);

  const renderCourseResults = () => (
    (() => {
      const paginatedCourseResults = paginateItems<Assessment>(crResults, crPage, crPageSize);
      return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-1">Course Results</h2>
        <p className="text-slate-500 text-sm mb-4">View all student results for a specific course.</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="label">Course</label>
            <select className="input" value={crCourse} onChange={e => setCrCourse(e.target.value)}>
              <option value="">Select Course</option>
              {courses.map(c => <option key={c.id} value={c.code}>{c.code} - {c.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="label">Year</label>
            <select className="input" value={currentYear} onChange={e => setCurrentYear(e.target.value)}>
              {years.map(y => <option key={y.code} value={y.code}>{y.code}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="label">Semester</label>
            <select className="input" value={currentSemester} onChange={e => setCurrentSemester(e.target.value)}>
              {semesters.map(s => <option key={s.sid} value={s.sid}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex items-end"><button className="btn btn-primary w-full" onClick={() => printElement('print-course-results', `Course Results - ${crCourse}`)}>🖨️ Print</button></div>
        </div>
      </div>
      <div className="card overflow-hidden" id="print-course-results">
        {crLoading ? <div className="p-12 flex flex-col items-center"><Loader2 size={32} className="text-blue-600 animate-spin mb-4" /></div> : (
          <table className="w-full text-left">
            <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-3">#</th>
              <th className="px-6 py-3">Index Number</th>
              <th className="px-6 py-3">Student Name</th>
              <th className="px-4 py-3">CA</th>
              <th className="px-4 py-3">Exam</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Grade</th>
              <th className="px-4 py-3">GP</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedCourseResults.items.length > 0 ? paginatedCourseResults.items.map((r: any, i) => {
                const student = students.find(s => s.index_number === r.index_no || s.iid === r.index_no);
                return (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3 text-sm text-slate-400">{paginatedCourseResults.startIndex + i + 1}</td>
                    <td className="px-6 py-3 text-sm font-mono text-slate-600">{r.index_no}</td>
                    <td className="px-6 py-3"><div className="text-sm font-bold">{student?.full_name || r.surname + ', ' + r.other_names || r.index_no}</div></td>
                    <td className="px-4 py-3 text-sm">{((r.a1 || 0) + (r.a2 || 0) + (r.a3 || 0) + (r.a4 || 0)).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm">{r.exam_score?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-bold">{r.total_score?.toFixed(2)}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-bold ${r.grade === 'A' || r.grade === 'B+' || r.grade === 'B' ? 'bg-emerald-100 text-emerald-700' : r.grade === 'F' || r.grade === 'E' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{r.grade}</span></td>
                    <td className="px-4 py-3 text-sm font-mono text-blue-600 font-bold">{r.grade_point?.toFixed(1)}</td>
                  </tr>
                );
              }) : <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-500">Select a course to view results.</td></tr>}
            </tbody>
          </table>
        )}
        <div className="px-6">
          <PaginationControls
            page={paginatedCourseResults.page}
            pageSize={crPageSize}
            totalItems={crResults.length}
            onPageChange={setCrPage}
            onPageSizeChange={(size) => {
              setCrPageSize(size);
              setCrPage(1);
            }}
            itemLabel="results"
          />
        </div>
      </div>
    </div>
      );
    })()
  );

  // ─── COMPOSITE RESULTS ──────────────────────────────────────
  const [compResults, setCompResults] = useState<any[]>([]);
  const [compLoading, setCompLoading] = useState(false);
  const [compLevel, setCompLevel] = useState('');
  const [compProgram, setCompProgram] = useState('');
  const [compPage, setCompPage] = useState(1);
  const [compPageSize, setCompPageSize] = useState(DEFAULT_PAGE_SIZE);

  const fetchComposite = async () => {
    if (!currentYear || !currentSemester || !compLevel || !compProgram) {
      toastError('Please select all filters (Year, Semester, Level, and Program) before loading.');
      return;
    }
    setCompLoading(true);
    setCompResults({ students: [], courses: [] } as any);
    try {
      const studentGroups: Record<string, { student: any, assessments: any[] }> = {};
      const courseCodesSet = new Set<string>();

      // Use the new optimized period fetch
      const periodResults = await api.getPeriodAssessments(currentYear, currentSemester);
      
      periodResults.forEach((r: any) => {
        // Filter by Level
        if (compLevel && String(r.level) !== compLevel) return;
        
        // Filter by Program (find student)
        const st = students.find(s => s.iid === r.index_no || s.index_number === r.index_no);
        if (compProgram && st?.progid !== compProgram) return;

        courseCodesSet.add(r.course_code);
        if (!studentGroups[r.index_no]) {
          studentGroups[r.index_no] = {
            student: {
              surname: st?.surname || r.surname || '',
              other_names: st?.other_names || r.other_names || '',
              readable_index: st?.index_number || r.index_number || r.index_no
            },
            assessments: []
          };
        }
        studentGroups[r.index_no].assessments.push(r);
      });
      
      const sortedStudents = Object.values(studentGroups).sort((a, b) => {
        const nameA = `${a.student.surname} ${a.student.other_names}`.toLowerCase();
        const nameB = `${b.student.surname} ${b.student.other_names}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
      const activeCourses = Array.from(courseCodesSet).sort();
      
      setCompResults({ students: sortedStudents, courses: activeCourses } as any);
      if (sortedStudents.length === 0) {
        toastError('No records found for the selected filters.');
      }
    } catch (e) {
      console.error(e);
      setCompResults({ students: [], courses: [] } as any);
      toastError('Failed to load records for the selected filters.');
    }
    finally { setCompLoading(false); }
  };

  const exportToExcel = () => {
    const data = compResults as any;
    if (!data.students || data.students.length === 0) return;

    const exportData: any[] = [];
    const headers = ['#', 'Surname', 'Other Names', 'Index Number'];
    data.courses.forEach((code: string) => {
      headers.push(`${code} CA`, `${code} EX`, `${code} TOT`);
    });
    exportData.push(headers);

    data.students.forEach((grp: any, i: number) => {
      const row = [i + 1, grp.student.surname, grp.student.other_names, grp.student.readable_index];
      data.courses.forEach((code: string) => {
        const ass = grp.assessments.find((a: any) => a.course_code === code);
        if (ass) {
          row.push(Number(ass.total_ca?.toFixed(1) || 0), Number(ass.exam_score?.toFixed(1) || 0), Number(ass.total_score?.toFixed(1) || 0));
        } else {
          row.push('-', '-', '-');
        }
      });
      exportData.push(row);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Composite Results');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(dataBlob, `Composite_Results_${currentYear.replace(/\//g, '-')}_${currentSemester}.xlsx`);
  };

  const renderCompositeResults = () => {
    const data = compResults as unknown as { students: any[], courses: string[] };
    const groupedStudents = data.students || [];
    const activeCourses = data.courses || [];
    const paginatedComposite = paginateItems<any>(groupedStudents, compPage, compPageSize);

    return (
      <div className="space-y-6">
        <div className="card p-6">
          <h2 className="font-bold text-lg mb-1">Composite Results</h2>
          <p className="text-slate-500 text-sm mb-4">View detailed assessment summary grouped by student.</p>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="label">Year</label>
              <select className="input" value={currentYear} onChange={e => setCurrentYear(e.target.value)}>
                {years.map(y => <option key={y.code} value={y.code}>{y.code}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="label">Semester</label>
              <select className="input" value={currentSemester} onChange={e => setCurrentSemester(e.target.value)}>
                {semesters.map(s => <option key={s.sid} value={s.sid}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="label">Level</label>
              <select className="input" value={compLevel} onChange={e => setCompLevel(e.target.value)}>
                <option value="">Select Level</option>
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="300">300</option>
                <option value="400">400</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="label">Program</label>
              <select className="input" value={compProgram} onChange={e => setCompProgram(e.target.value)}>
                <option value="">Select Program</option>
                {programs.map(p => <option key={p.progid} value={p.progid}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2 sm:col-span-1">
              <button className="btn btn-primary flex-1" onClick={fetchComposite} disabled={compLoading}>
                {compLoading ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                Load
              </button>
              <button className="btn btn-secondary flex items-center justify-center p-3" onClick={exportToExcel} title="Export to Excel">
                <Download size={18} />
              </button>
              <button className="btn btn-secondary flex items-center justify-center p-3" onClick={() => printElement('print-composite', 'Composite Results')} title="Print">
                <Printer size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="card overflow-x-auto" id="print-composite">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider border-b">
                <th className="px-4 py-3 border-r" rowSpan={2}>#</th>
                <th className="px-4 py-3 border-r" rowSpan={2}>Surname</th>
                <th className="px-4 py-3 border-r" rowSpan={2}>Other Names</th>
                <th className="px-4 py-3 border-r" rowSpan={2}>Index Number</th>
                {activeCourses.map(code => (
                  <th key={code} className="px-4 py-2 text-center border-r" colSpan={3}>{code}</th>
                ))}
              </tr>
              <tr className="bg-slate-50 text-slate-500 text-[9px] uppercase tracking-wider border-b">
                {activeCourses.map(code => (
                  <React.Fragment key={code}>
                    <th className="px-2 py-1 text-center border-r">CA</th>
                    <th className="px-2 py-1 text-center border-r">EX</th>
                    <th className="px-2 py-1 text-center border-r font-bold">TOT</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {paginatedComposite.items.length > 0 ? paginatedComposite.items.map((grp: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 border-r text-slate-400">{paginatedComposite.startIndex + i + 1}</td>
                  <td className="px-4 py-3 border-r font-bold text-slate-800 uppercase">{grp.student.surname}</td>
                  <td className="px-4 py-3 border-r text-slate-800">{grp.student.other_names}</td>
                  <td className="px-4 py-3 border-r font-mono text-slate-500">{grp.student.readable_index}</td>
                  {activeCourses.map(code => {
                    const ass = grp.assessments.find((a: any) => a.course_code === code);
                    return (
                      <React.Fragment key={code}>
                        <td className="px-2 py-3 text-center border-r bg-slate-50/20">{ass ? (ass.total_ca || 0).toFixed(1) : '-'}</td>
                        <td className="px-2 py-3 text-center border-r">{ass ? (ass.exam_score || 0).toFixed(1) : '-'}</td>
                        <td className="px-2 py-3 text-center border-r font-bold text-blue-700 bg-blue-50/10">
                          {ass ? (ass.total_score || 0).toFixed(1) : '-'}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              )) : (
                <tr>
                  <td colSpan={4 + activeCourses.length * 3} className="px-6 py-12 text-center text-slate-500">
                    Click "Load" to fetch results.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 pb-6">
          <PaginationControls
            page={paginatedComposite.page}
            pageSize={compPageSize}
            totalItems={groupedStudents.length}
            onPageChange={setCompPage}
            onPageSizeChange={(size) => {
              setCompPageSize(size);
              setCompPage(1);
            }}
            itemLabel="students"
          />
        </div>
      </div>
    );
  };

  // ─── BROADSHEET ─────────────────────────────────────────────
  const [bsResults, setBsResults] = useState<BroadsheetSummaryRow[]>([]);
  const [bsSemesters, setBsSemesters] = useState<BroadsheetSummaryResponse['semesters']>([]);
  const [bsLoading, setBsLoading] = useState(false);
  const [bsProgram, setBsProgram] = useState('');
  const [bsLevel, setBsLevel] = useState('');
  const [bsPage, setBsPage] = useState(1);
  const [bsPageSize, setBsPageSize] = useState(DEFAULT_PAGE_SIZE);

  const fetchBroadsheet = async () => {
    if (!currentYear) return;
    setBsLoading(true);
    setBsResults([]);
    setBsSemesters([]);
    try {
      const response = await api.getBroadsheetSummary(currentYear, bsProgram || undefined, bsLevel || undefined);
      setBsSemesters(response.semesters);
      setBsResults(response.data);
      if (response.data.length === 0) {
        toastError('No records found for the selected filters.');
      }
    } catch (e) {
      console.error(e);
      setBsResults([]);
      setBsSemesters([]);
      toastError('Failed to load records for the selected filters.');
    }
    finally { setBsLoading(false); }
  };

  const exportBroadsheetToExcel = () => {
    if (bsResults.length === 0) return;
    const orderedSemesters = bsSemesters.slice(0, 2);
    const headerTop = ['INDEX NO. / NAME', '', ''];
    orderedSemesters.forEach((semester) => {
      headerTop.push(semester.name.toUpperCase(), '', '', '', '', '');
    });
    if (orderedSemesters.length === 1) {
      headerTop.push('', '', '', '', '', '');
    }

    const headerBottom = ['Index No.', 'Last Name', 'First Name'];
    orderedSemesters.forEach(() => {
      headerBottom.push('sCH', 'sGP', 'sGPA', 'cCH', 'cGP', 'cGPA');
    });
    if (orderedSemesters.length === 1) {
      headerBottom.push('sCH', 'sGP', 'sGPA', 'cCH', 'cGP', 'cGPA');
    }
    headerBottom.push('Class');

    const rows = bsResults.map((row) => {
      const base = [row.index_number || row.index_no, row.surname, row.first_name];
      orderedSemesters.forEach((semester) => {
        const metrics = row.semesters[semester.sid];
        base.push(
          metrics?.sCH ?? '',
          metrics?.sGP ?? '',
          metrics?.sGPA ?? '',
          metrics?.cCH ?? '',
          metrics?.cGP ?? '',
          metrics?.cGPA ?? '',
        );
      });
      if (orderedSemesters.length === 1) {
        base.push('', '', '', '', '', '');
      }
      base.push(row.class || '');
      return base;
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headerTop, headerBottom, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Broadsheet');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(
      new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `Broadsheet_${currentYear.replace(/\//g, '-')}${bsProgram ? `_${bsProgram}` : ''}${bsLevel ? `_L${bsLevel}` : ''}.xlsx`,
    );
  };

  const renderBroadsheet = () => {
    const orderedSemesters = bsSemesters.slice(0, 2);
    const paginatedBroadsheet = paginateItems<BroadsheetSummaryRow>(bsResults, bsPage, bsPageSize);
    return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-1">Broadsheet</h2>
        <p className="text-slate-500 text-sm mb-4">Year summary broadsheet with semester GPA and cumulative standing.</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="label">Year</label>
            <select className="input" value={currentYear} onChange={e => setCurrentYear(e.target.value)}>
              {years.map(y => <option key={y.code} value={y.code}>{y.code}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="label">Program</label>
            <select className="input" value={bsProgram} onChange={e => setBsProgram(e.target.value)}>
              <option value="">All Programs</option>
              {programs.map(p => <option key={p.progid} value={p.progid}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="label">Level</label>
            <select className="input" value={bsLevel} onChange={e => setBsLevel(e.target.value)}>
              <option value="">All Levels</option>
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="300">300</option>
              <option value="400">400</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button className="btn btn-primary flex-1" onClick={fetchBroadsheet} disabled={bsLoading}>
              {bsLoading ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
              Load
            </button>
            <button className="btn btn-secondary flex items-center justify-center p-3" onClick={exportBroadsheetToExcel} title="Export to Excel">
              <Download size={18} />
            </button>
            <button className="btn btn-secondary" onClick={() => printElement('print-broadsheet', 'Broadsheet')}>🖨️</button>
          </div>
        </div>
      </div>
      <div className="card overflow-hidden" id="print-broadsheet">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 uppercase tracking-wider">
                <th className="px-4 py-3 font-semibold text-center border-b border-r" colSpan={3}>Index No. / Name</th>
                {orderedSemesters.map((semester) => (
                  <th key={semester.sid} className="px-4 py-3 font-semibold text-center border-b border-r" colSpan={6}>
                    {semester.name.toUpperCase()}
                  </th>
                ))}
                <th className="px-4 py-3 font-semibold text-center border-b">Class</th>
              </tr>
              <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3 font-semibold border-r">Index No.</th>
                <th className="px-4 py-3 font-semibold border-r">Last Name</th>
                <th className="px-4 py-3 font-semibold border-r">First Name</th>
                {orderedSemesters.map((semester) => (
                  <React.Fragment key={semester.sid}>
                    <th className="px-3 py-3 font-semibold text-center border-r">sCH</th>
                    <th className="px-3 py-3 font-semibold text-center border-r">sGP</th>
                    <th className="px-3 py-3 font-semibold text-center border-r">sGPA</th>
                    <th className="px-3 py-3 font-semibold text-center border-r">cCH</th>
                    <th className="px-3 py-3 font-semibold text-center border-r">cGP</th>
                    <th className="px-3 py-3 font-semibold text-center border-r">cGPA</th>
                  </React.Fragment>
                ))}
                <th className="px-4 py-3 font-semibold text-center">Class</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedBroadsheet.items.length > 0 ? paginatedBroadsheet.items.map((row) => (
                <tr key={row.index_no} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2 font-mono border-r">{row.index_number || row.index_no}</td>
                  <td className="px-4 py-2 font-bold border-r">{row.surname}</td>
                  <td className="px-4 py-2 border-r">{row.first_name}</td>
                  {orderedSemesters.map((semester) => {
                    const metrics = row.semesters[semester.sid];
                    return (
                      <React.Fragment key={semester.sid}>
                        <td className="px-3 py-2 text-center border-r">{metrics?.sCH ?? '-'}</td>
                        <td className="px-3 py-2 text-center border-r">{metrics?.sGP?.toFixed?.(4) ?? '-'}</td>
                        <td className="px-3 py-2 text-center border-r">{metrics?.sGPA?.toFixed?.(4) ?? '-'}</td>
                        <td className="px-3 py-2 text-center border-r">{metrics?.cCH ?? '-'}</td>
                        <td className="px-3 py-2 text-center border-r">{metrics?.cGP?.toFixed?.(4) ?? '-'}</td>
                        <td className="px-3 py-2 text-center border-r">{metrics?.cGPA?.toFixed?.(4) ?? '-'}</td>
                      </React.Fragment>
                    );
                  })}
                  <td className="px-4 py-2 text-center font-medium">{row.class || '-'}</td>
                </tr>
              )) : <tr><td colSpan={4 + orderedSemesters.length * 6} className="px-6 py-12 text-center text-slate-500">Click "Load" to generate broadsheet.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-6 pb-6">
          <PaginationControls
            page={paginatedBroadsheet.page}
            pageSize={bsPageSize}
            totalItems={bsResults.length}
            onPageChange={setBsPage}
            onPageSizeChange={(size) => {
              setBsPageSize(size);
              setBsPage(1);
            }}
            itemLabel="broadsheet rows"
          />
        </div>
      </div>
    </div>
    );
  };

  // ─── STATEMENT OF RESULT / TRANSCRIPT ───────────────────────
  const [srSearch, setSrSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<any>(null);
  const [modalTitle, setModalTitle] = useState('Statement of Results');

  const handleViewDocument = async (type: 'statement_results' | 'transcript') => {
    const student = students.find(s => s.index_number === srSearch || (s.full_name || '').toLowerCase().includes(srSearch.toLowerCase()));
    if (!student) return toastError('Student not found');
    setLoading(true);
    try {
      const data = await api.getTranscript(student.iid);
      setModalData(data);
      setModalTitle(type === 'transcript' ? 'Transcript' : 'Statement of Results');
      setShowModal(true);
    } catch (e: any) { toastError(e.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const renderStatementOrTranscript = (type: 'statement_results' | 'transcript') => (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-1">{type === 'transcript' ? 'Transcript' : 'Statement of Results'}</h2>
        <p className="text-slate-500 text-sm mb-4">Search for a student to generate their {type === 'transcript' ? 'transcript' : 'statement of results'}.</p>
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" className="input pl-10" placeholder="Index number or student name..." value={srSearch} onChange={e => setSrSearch(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => handleViewDocument(type)} disabled={loading}>
            {loading ? <Loader2 size={18} className="animate-spin mr-2" /> : <Printer size={18} className="mr-2" />}
            Generate
          </button>
        </div>
      </div>
      {!showModal && (
        <div className="card p-12 text-center text-slate-400">
          <p>Enter a student's index number or name and click "Generate" to view their {type === 'transcript' ? 'transcript' : 'statement of results'}.</p>
        </div>
      )}
      <TranscriptModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        data={modalData}
        title={modalTitle}
      />
    </div>
  );

  // ─── GRADUATION LIST ─────────────────────────────────────────
  const [gradProg, setGradProg] = useState('');
  const [gradYear, setGradYear] = useState('');
  const [gradList, setGradList] = useState<any[]>([]);
  const [gradLoading, setGradLoading] = useState(false);
  const [gradPage, setGradPage] = useState(1);
  const [gradPageSize, setGradPageSize] = useState(DEFAULT_PAGE_SIZE);

  const fetchGraduationList = async () => {
    if (!gradProg || !gradYear) return toastError('Select both Program and Admission Year');
    setGradLoading(true);
    setGradList([]);
    try {
      const data = await api.getGraduationList(gradProg, gradYear);
      setGradList(data);
      if (data.length === 0) {
        toastError('No records found for the selected filters.');
      }
    } catch (e: any) {
      toastError(e.message || 'Failed to generate list');
      setGradList([]);
    } finally {
      setGradLoading(false);
    }
  };

  const renderGraduationList = () => (
    (() => {
      const paginatedGraduationList = paginateItems<any>(gradList, gradPage, gradPageSize);
      return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-1">Graduation List</h2>
        <p className="text-slate-500 text-sm mb-4">Generate and print the valid graduation list for an admission cohort.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="label">Program</label>
            <select className="input" value={gradProg} onChange={e => setGradProg(e.target.value)}>
              <option value="">Select Program</option>
              {programs.map(p => <option key={p.progid} value={p.progid}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="label">Admission Year</label>
            <select className="input" value={gradYear} onChange={e => setGradYear(e.target.value)}>
              <option value="">Select Year</option>
              {years.map(y => <option key={y.code} value={y.code}>{y.code}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button className="btn btn-primary flex-1" onClick={fetchGraduationList} disabled={gradLoading}>
              {gradLoading ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
              Generate
            </button>
            <button className="btn btn-secondary flex items-center justify-center p-3" onClick={() => printElement('print-grad-list', 'Graduation List')} title="Print List">
              <Printer size={18} />
            </button>
          </div>
        </div>
      </div>
      <div className="card overflow-hidden" id="print-grad-list">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-3">#</th>
              <th className="px-6 py-3">Student Name</th>
              <th className="px-4 py-3">Index Number</th>
              <th className="px-4 py-3">Gender</th>
              <th className="px-4 py-3 text-right">Final CGPA</th>
              <th className="px-6 py-3">Class Award</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedGraduationList.items.length > 0 ? paginatedGraduationList.items.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 text-sm text-slate-400">{paginatedGraduationList.startIndex + i + 1}</td>
                <td className="px-6 py-4"><div className="text-sm font-bold text-slate-900">{r.name}</div></td>
                <td className="px-4 py-4 text-sm font-mono text-slate-500">{r.index_number}</td>
                <td className="px-4 py-4 text-sm">{r.gender}</td>
                <td className="px-4 py-4 text-sm font-bold text-blue-700 text-right">{r.final_cgpa == null ? 'Pending' : r.final_cgpa.toFixed(4)}</td>
                <td className="px-6 py-4"><span className="text-sm font-bold text-emerald-700">{r.class_award || '-'}</span></td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">Select options and click "Generate" to construct the list.</td></tr>
            )}
          </tbody>
        </table>
        <div className="px-6 pb-6">
          <PaginationControls
            page={paginatedGraduationList.page}
            pageSize={gradPageSize}
            totalItems={gradList.length}
            onPageChange={setGradPage}
            onPageSizeChange={(size) => {
              setGradPageSize(size);
              setGradPage(1);
            }}
            itemLabel="students"
          />
        </div>
      </div>
    </div>
      );
    })()
  );

  switch (activeSubItem) {
    case 'course_results': return renderCourseResults();
    case 'composite_results': return renderCompositeResults();
    case 'broadsheet': return renderBroadsheet();
    case 'statement_results': return renderStatementOrTranscript('statement_results');
    case 'transcript': return renderStatementOrTranscript('transcript');
    case 'graduation_list': return renderGraduationList();
    default: return <div className="card p-12 text-center"><p className="text-slate-500">Select a sub-item from the menu.</p></div>;
  }
};
