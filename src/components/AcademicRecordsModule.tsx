import React, { useState, useEffect } from 'react';
import { Search, Loader2, Printer } from 'lucide-react';
import { Student, Assessment, AcademicYear, Semester, Course, BoardsheetCache } from '../types';
import { api } from '../services/api';
import { TranscriptModal } from './TranscriptModal';

interface AcademicRecordsModuleProps {
  activeSubItem: string | null;
}

export const AcademicRecordsModule: React.FC<AcademicRecordsModuleProps> = ({ activeSubItem }) => {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentYear, setCurrentYear] = useState('');
  const [currentSemester, setCurrentSemester] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [y, s, c, st] = await Promise.all([api.getAcademicYears(), api.getSemesters(), api.getCourses(), api.getStudents()]);
        setYears(y); setSemesters(s); setCourses(c); setStudents(st);
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

  const fetchCourseResults = async () => {
    if (!crCourse || !currentYear || !currentSemester) return;
    setCrLoading(true);
    try {
      const data = await api.getAssessments(crCourse, currentYear, currentSemester);
      setCrResults(data);
    } catch (e) { console.error(e); }
    finally { setCrLoading(false); }
  };

  useEffect(() => {
    if (activeSubItem === 'course_results' && crCourse) fetchCourseResults();
  }, [crCourse, currentYear, currentSemester]);

  const renderCourseResults = () => (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-1">Course Results</h2>
        <p className="text-slate-500 text-sm mb-4">View all student results for a specific course.</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="label">Course</label>
            <select className="input" value={crCourse} onChange={e => setCrCourse(e.target.value)}>
              <option value="">Select Course</option>
              {courses.map(c => <option key={c.cid} value={c.cid}>{c.cid} - {c.title}</option>)}
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
          <div className="flex items-end"><button className="btn btn-primary w-full" onClick={() => window.print()}>🖨️ Print</button></div>
        </div>
      </div>
      <div className="card overflow-hidden">
        {crLoading ? <div className="p-12 flex flex-col items-center"><Loader2 size={32} className="text-blue-600 animate-spin mb-4" /></div> : (
          <table className="w-full text-left">
            <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-3">#</th>
              <th className="px-6 py-3">Student</th>
              <th className="px-4 py-3">CA</th>
              <th className="px-4 py-3">Exam</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Grade</th>
              <th className="px-4 py-3">GP</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {crResults.length > 0 ? crResults.map((r: any, i) => {
                const student = students.find(s => s.iid === r.iid);
                return (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3 text-sm text-slate-400">{i + 1}</td>
                    <td className="px-6 py-3"><div className="text-sm font-bold">{student?.full_name || r.surname + ', ' + r.other_names || r.iid}</div></td>
                    <td className="px-4 py-3 text-sm">{r.class_score?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm">{r.exam_score?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-bold">{r.total_score?.toFixed(2)}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-bold ${r.grade === 'A' || r.grade === 'B+' || r.grade === 'B' ? 'bg-emerald-100 text-emerald-700' : r.grade === 'F' || r.grade === 'E' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{r.grade}</span></td>
                    <td className="px-4 py-3 text-sm font-mono">{r.gp?.toFixed(1)}</td>
                  </tr>
                );
              }) : <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">Select a course to view results.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  // ─── COMPOSITE RESULTS ──────────────────────────────────────
  const [compResults, setCompResults] = useState<any[]>([]);
  const [compLoading, setCompLoading] = useState(false);

  const fetchComposite = async () => {
    if (!currentYear || !currentSemester) return;
    setCompLoading(true);
    try {
      // Get boardsheet cache for all students
      const allStudentList = students;
      const results: any[] = [];
      for (const s of allStudentList) {
        try {
          const cache = await api.getBoardsheet(s.iid, currentYear, currentSemester);
          if (cache) results.push({ ...cache, full_name: s.full_name, index_number: s.index_number });
        } catch (_) {}
      }
      setCompResults(results.filter(r => r.gpa !== undefined));
    } catch (e) { console.error(e); }
    finally { setCompLoading(false); }
  };

  const renderCompositeResults = () => (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-1">Composite Results</h2>
        <p className="text-slate-500 text-sm mb-4">View GPA/CGPA for all students in a period.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <div className="flex items-end gap-2">
            <button className="btn btn-primary flex-1" onClick={fetchComposite} disabled={compLoading}>
              {compLoading ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
              Load
            </button>
            <button className="btn btn-secondary" onClick={() => window.print()}>🖨️</button>
          </div>
        </div>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <th className="px-6 py-3">#</th>
            <th className="px-6 py-3">Student</th>
            <th className="px-4 py-3">TCR</th>
            <th className="px-4 py-3">TCP</th>
            <th className="px-4 py-3">GPA</th>
            <th className="px-4 py-3">CTCR</th>
            <th className="px-4 py-3">CTCP</th>
            <th className="px-4 py-3">CGPA</th>
            <th className="px-4 py-3">Remarks</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {compResults.length > 0 ? compResults.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50/50">
                <td className="px-6 py-3 text-sm text-slate-400">{i + 1}</td>
                <td className="px-6 py-3"><div className="text-sm font-bold">{r.full_name}</div><div className="text-xs text-slate-500 font-mono">{r.index_number}</div></td>
                <td className="px-4 py-3 text-sm">{r.tcr}</td>
                <td className="px-4 py-3 text-sm">{r.tcp?.toFixed(1)}</td>
                <td className="px-4 py-3 text-sm font-bold text-blue-700">{r.gpa?.toFixed(4)}</td>
                <td className="px-4 py-3 text-sm">{r.ctcr}</td>
                <td className="px-4 py-3 text-sm">{r.ctcp?.toFixed(1)}</td>
                <td className="px-4 py-3 text-sm font-bold">{r.cgpa?.toFixed(4)}</td>
                <td className="px-4 py-3"><span className="text-xs font-bold">{r.remarks}</span></td>
              </tr>
            )) : <tr><td colSpan={9} className="px-6 py-12 text-center text-slate-500">Click "Load" to fetch results.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─── BROADSHEET ─────────────────────────────────────────────
  const [bsResults, setBsResults] = useState<any[]>([]);
  const [bsCourses, setBsCourses] = useState<string[]>([]);
  const [bsLoading, setBsLoading] = useState(false);

  const fetchBroadsheet = async () => {
    if (!currentYear || !currentSemester) return;
    setBsLoading(true);
    try {
      // Fetch all assessments for the period
      const allCourseIds = new Set<string>();
      const studentMap: Record<string, any> = {};
      
      for (const c of courses) {
        try {
          const results = await api.getAssessments(c.cid, currentYear, currentSemester);
          if (results.length > 0) {
            allCourseIds.add(c.cid);
            results.forEach((r: any) => {
              if (!studentMap[r.iid]) {
                const st = students.find(s => s.iid === r.iid);
                studentMap[r.iid] = { iid: r.iid, full_name: st?.full_name || r.iid, grades: {} };
              }
              studentMap[r.iid].grades[c.cid] = r.grade;
            });
          }
        } catch (_) {}
      }
      
      setBsCourses(Array.from(allCourseIds));
      setBsResults(Object.values(studentMap));
    } catch (e) { console.error(e); }
    finally { setBsLoading(false); }
  };

  const renderBroadsheet = () => (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-1">Broadsheet</h2>
        <p className="text-slate-500 text-sm mb-4">Full results grid — students × courses.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <div className="flex items-end gap-2">
            <button className="btn btn-primary flex-1" onClick={fetchBroadsheet} disabled={bsLoading}>
              {bsLoading ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
              Load
            </button>
            <button className="btn btn-secondary" onClick={() => window.print()}>🖨️</button>
          </div>
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead><tr className="bg-slate-50 text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-3 font-semibold sticky left-0 bg-slate-50">#</th>
              <th className="px-4 py-3 font-semibold sticky left-8 bg-slate-50 min-w-[200px]">Student</th>
              {bsCourses.map(c => <th key={c} className="px-3 py-3 font-semibold text-center min-w-[60px]">{c}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {bsResults.length > 0 ? bsResults.map((r, i) => (
                <tr key={r.iid} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2 text-slate-400 sticky left-0 bg-white">{i + 1}</td>
                  <td className="px-4 py-2 font-bold sticky left-8 bg-white">{r.full_name}</td>
                  {bsCourses.map(c => (
                    <td key={c} className="px-3 py-2 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        r.grades[c] === 'A' || r.grades[c] === 'B+' || r.grades[c] === 'B' ? 'bg-emerald-100 text-emerald-700' :
                        r.grades[c] === 'F' || r.grades[c] === 'E' ? 'bg-red-100 text-red-700' :
                        r.grades[c] ? 'bg-amber-100 text-amber-700' : ''
                      }`}>{r.grades[c] || '-'}</span>
                    </td>
                  ))}
                </tr>
              )) : <tr><td colSpan={2 + bsCourses.length} className="px-6 py-12 text-center text-slate-500">Click "Load" to generate broadsheet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ─── STATEMENT OF RESULT / TRANSCRIPT ───────────────────────
  const [srSearch, setSrSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<any>(null);
  const [modalTitle, setModalTitle] = useState('Statement of Results');

  const handleViewDocument = async (type: 'statement_results' | 'transcript') => {
    const student = students.find(s => s.index_number === srSearch || (s.full_name || '').toLowerCase().includes(srSearch.toLowerCase()));
    if (!student) return alert('Student not found');
    setLoading(true);
    try {
      const data = await api.getTranscript(student.iid);
      setModalData(data);
      setModalTitle(type === 'transcript' ? 'Transcript' : 'Statement of Results');
      setShowModal(true);
    } catch (e: any) { alert(e.message || 'Failed'); }
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

  switch (activeSubItem) {
    case 'course_results': return renderCourseResults();
    case 'composite_results': return renderCompositeResults();
    case 'broadsheet': return renderBroadsheet();
    case 'statement_results': return renderStatementOrTranscript('statement_results');
    case 'transcript': return renderStatementOrTranscript('transcript');
    default: return <div className="card p-12 text-center"><p className="text-slate-500">Select a sub-item from the menu.</p></div>;
  }
};
