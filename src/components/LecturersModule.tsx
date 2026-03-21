import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, UserCog, Loader2, BookOpen, Calendar, Link } from 'lucide-react';
import { Lecturer, Course, Department, LecturerAssignment, AcademicYear, Semester } from '../types';
import { api } from '../services/api';
import { BulkUploadModule } from './BulkUploadModule';

interface LecturersModuleProps {
  activeSubItem: string | null;
}

export const LecturersModule: React.FC<LecturersModuleProps> = ({ activeSubItem }) => {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [assignments, setAssignments] = useState<LecturerAssignment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Setup form
  const [formData, setFormData] = useState({ lid: '', fullname: '', email: '', phone: '', department: '', designation: '' });

  // Assign form
  const [assignData, setAssignData] = useState({ lid: '', cid: '', academic_year: '', semester_sid: '' });

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    if (activeSubItem === 'assign_lecturer') fetchAssignData();
  }, [activeSubItem]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [l, d] = await Promise.all([api.getLecturers(), api.getDepartments()]);
      setLecturers(l); setDepartments(d);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchAssignData = async () => {
    try {
      const [c, y, s, a] = await Promise.all([
        api.getCourses(), api.getAcademicYears(), api.getSemesters(), api.getLecturerAssignments()
      ]);
      setCourses(c); setYears(y); setSemesters(s); setAssignments(a);
      const curYear = y.find((x: AcademicYear) => x.is_current);
      const curSem = s.find((x: Semester) => x.is_current);
      setAssignData(prev => ({
        ...prev,
        academic_year: curYear?.code || '',
        semester_sid: curSem?.sid || ''
      }));
    } catch (e) { console.error(e); }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createLecturer(formData);
      setFormData({ lid: '', fullname: '', email: '', phone: '', department: '', designation: '' });
      alert('Lecturer created!');
      fetchData();
    } catch (e: any) { alert(e.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignData.lid || !assignData.cid || !assignData.academic_year || !assignData.semester_sid) return alert('All fields required');
    try {
      await api.assignLecturer(assignData);
      alert('Lecturer assigned!');
      const a = await api.getLecturerAssignments();
      setAssignments(a);
    } catch (e: any) { alert(e.message || 'Failed'); }
  };

  const handleDeleteAssignment = async (id: number) => {
    if (!confirm('Remove this assignment?')) return;
    try {
      await api.deleteAssignment(id);
      setAssignments(prev => prev.filter(a => a.id !== id));
    } catch (e) { alert('Failed'); }
  };

  const filteredLecturers = lecturers.filter(l =>
    (l.fullname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.lid || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderSetupLecturer = () => (
    <div className="card">
      <div className="p-6 border-b border-slate-100">
        <h2 className="font-bold text-lg">Setup Lecturer</h2>
        <p className="text-slate-500 text-sm">Add a new lecturer to the system.</p>
      </div>
      <form className="p-6 space-y-6" onSubmit={handleSetup}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="label">Lecturer ID</label>
            <input type="text" className="input" placeholder="e.g. LEC001" required value={formData.lid} onChange={e => setFormData({...formData, lid: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="label">Full Name</label>
            <input type="text" className="input" placeholder="e.g. Prof. John Doe" required value={formData.fullname} onChange={e => setFormData({...formData, fullname: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="label">Email</label>
            <input type="email" className="input" placeholder="email@example.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="label">Phone</label>
            <input type="tel" className="input" placeholder="024XXXXXXX" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="label">Department</label>
            <select className="input" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
              <option value="">Select Department</option>
              {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="label">Designation</label>
            <input type="text" className="input" placeholder="e.g. Senior Lecturer" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
          <button type="button" className="btn btn-secondary" onClick={() => setFormData({lid:'',fullname:'',email:'',phone:'',department:'',designation:''})}>Clear</button>
          <button type="submit" className="btn btn-primary gap-2" disabled={submitting}>
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            {submitting ? 'Saving...' : 'Add Lecturer'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderAssignLecturer = () => (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-1">Assign Lecturer to Course</h2>
        <p className="text-slate-500 text-sm mb-4">Assign a lecturer to teach a course in a specific academic period.</p>
        <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" onSubmit={handleAssign}>
          <div className="space-y-2">
            <label className="label">Lecturer</label>
            <select className="input" value={assignData.lid} onChange={e => setAssignData({...assignData, lid: e.target.value})} required>
              <option value="">Select Lecturer</option>
              {lecturers.map(l => <option key={l.lid} value={l.lid}>{l.fullname}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="label">Course</label>
            <select className="input" value={assignData.cid} onChange={e => setAssignData({...assignData, cid: e.target.value})} required>
              <option value="">Select Course</option>
              {courses.map(c => <option key={c.cid} value={c.cid}>{c.cid} - {c.title}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="label">Academic Year</label>
            <select className="input" value={assignData.academic_year} onChange={e => setAssignData({...assignData, academic_year: e.target.value})} required>
              <option value="">Select Year</option>
              {years.map(y => <option key={y.code} value={y.code}>{y.code}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="label">Semester</label>
            <div className="flex gap-2">
              <select className="input flex-1" value={assignData.semester_sid} onChange={e => setAssignData({...assignData, semester_sid: e.target.value})} required>
                <option value="">Select</option>
                {semesters.map(s => <option key={s.sid} value={s.sid}>{s.name}</option>)}
              </select>
              <button type="submit" className="btn btn-primary px-4"><Link size={18} /></button>
            </div>
          </div>
        </form>
      </div>
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50"><h3 className="font-bold">Current Assignments</h3></div>
        <table className="w-full text-left">
          <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <th className="px-6 py-3 font-semibold">Lecturer</th>
            <th className="px-6 py-3 font-semibold">Course</th>
            <th className="px-6 py-3 font-semibold hidden md:table-cell">Year</th>
            <th className="px-6 py-3 font-semibold hidden sm:table-cell">Semester</th>
            <th className="px-6 py-3 font-semibold text-right">Action</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {assignments.length > 0 ? assignments.map(a => (
              <tr key={a.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-3 text-sm font-medium">{a.lecturer_name}</td>
                <td className="px-6 py-3 text-sm">{a.cid} - {a.course_title}</td>
                <td className="px-6 py-3 text-sm hidden md:table-cell">{a.academic_year}</td>
                <td className="px-6 py-3 text-sm hidden sm:table-cell">{a.semester_sid}</td>
                <td className="px-6 py-3 text-right">
                  <button onClick={() => handleDeleteAssignment(a.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                </td>
              </tr>
            )) : <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No assignments yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderViewLecturers = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" className="input pl-10" placeholder="Search lecturers..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center"><Loader2 size={32} className="text-blue-600 animate-spin mb-4" /><p className="text-slate-500">Loading...</p></div>
        ) : (
          <table className="w-full text-left">
            <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">Lecturer</th>
              <th className="px-6 py-4 font-semibold hidden md:table-cell">Department</th>
              <th className="px-6 py-4 font-semibold hidden lg:table-cell">Designation</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLecturers.length > 0 ? filteredLecturers.map(l => (
                <tr key={l.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
                        {(l.fullname || '?').charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-bold">{l.fullname}</div>
                        <div className="text-xs text-slate-500">{l.lid} • {l.email || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm hidden md:table-cell">{l.department || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm hidden lg:table-cell">{l.designation || 'N/A'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={async () => { if (confirm(`Delete ${l.fullname}?`)) { await api.deleteLecturer(l.lid); fetchData(); } }} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              )) : <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">No lecturers found.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  switch (activeSubItem) {
    case 'setup_lecturer': return renderSetupLecturer();
    case 'assign_lecturer': return renderAssignLecturer();
    case 'view_lecturers': case null: return renderViewLecturers();
    case 'bulk_upload': return <BulkUploadModule />;
    default: return <div className="card p-12 text-center"><p className="text-slate-500">Coming soon.</p></div>;
  }
};
