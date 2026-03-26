import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, BookOpen, Filter, Loader2, Printer } from 'lucide-react';
import { Course, Program, Department } from '../types';
import { api } from '../services/api';
import { BulkUploadModule } from './BulkUploadModule';
import { printElement } from '../utils/print';
import { useToast } from '../context/ToastContext';
import { X } from 'lucide-react';
import { PaginationControls } from './PaginationControls';
import { DEFAULT_PAGE_SIZE, paginateItems } from '../utils/pagination';

interface CoursesModuleProps {
  activeSubItem: string | null;
}

export const CoursesModule: React.FC<CoursesModuleProps> = ({ activeSubItem }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '', credit_hours: 3, department: '' });

  const { success, error: toastError } = useToast();
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCourseObj, setSelectedCourseObj] = useState<Course | null>(null);
  const [coursePage, setCoursePage] = useState(1);
  const [coursePageSize, setCoursePageSize] = useState(DEFAULT_PAGE_SIZE);

  // Mount course state
  const [mountProgid, setMountProgid] = useState('');
  const [mountLevel, setMountLevel] = useState(100);
  const [mountSemester, setMountSemester] = useState('');
  const [semesters, setSemesters] = useState<any[]>([]);
  const [curriculum, setCurriculum] = useState<any[]>([]);

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    if (activeSubItem === 'mount_course') {
      api.getSemesters().then(s => {
        setSemesters(s);
        const cur = s.find((x: any) => x.is_current);
        if (cur) setMountSemester(cur.sid);
      }).catch(console.error);
    }
  }, [activeSubItem]);

  useEffect(() => {
    if (mountProgid && mountSemester) fetchCurriculum();
  }, [mountProgid, mountLevel, mountSemester]);

  useEffect(() => {
    setCoursePage(1);
  }, [searchTerm, coursePageSize]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [c, p, d] = await Promise.all([api.getCourses(), api.getPrograms(), api.getDepartments()]);
      setCourses(c); setPrograms(p); setDepartments(d);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchCurriculum = async () => {
    if (!mountProgid) return;
    try { setCurriculum(await api.getCurriculum(mountProgid, mountLevel, mountSemester)); }
    catch (e) { console.error(e); }
  };

  const handleMount = async (cid: string) => {
    if (!mountProgid || !mountSemester) return toastError('Select program & semester');
    try {
      await api.mountCurriculum(mountProgid, { course_code: cid, level: mountLevel, semester_sid: mountSemester });
      success('Course mounted!');
      fetchCurriculum();
    } catch (e: any) { toastError(e.message || 'Failed'); }
  };

  const handleUnmountCourse = async (cid: string) => {
    if (!window.confirm(`Unmount course ${cid}?`)) return;
    try {
      await api.unmountCurriculum(mountProgid, cid, mountLevel, mountSemester);
      success('Course unmounted!');
      fetchCurriculum();
    } catch (e: any) { toastError(e.message || 'Failed to unmount course'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createCourse(formData);
      setFormData({ name: '', code: '', credit_hours: 3, department: '' });
      success('Course created!');
      fetchData();
    } catch (e: any) { toastError(e.message || 'Failed to save course'); }
    finally { setSubmitting(false); }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseObj) return;
    setSubmitting(true);
    try {
      await api.updateCourse(selectedCourseObj.code, formData);
      success('Course updated successfully!');
      setShowEditModal(false);
      fetchData();
    } catch (e: any) { toastError(e.message || 'Failed to update course'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (course: Course) => {
    if (!window.confirm(`Are you sure you want to completely delete ${course.code} - ${course.name}? All associated curriculum placements, lecturer assignments, and active registrations will be deleted.`)) return;
    try {
      await api.deleteCourse(course.code);
      success('Course deleted successfully!');
      fetchData();
    } catch (err: any) { toastError(err.message || 'Failed to delete course'); }
  };

  const filteredCourses = courses.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const paginatedCourses = paginateItems<Course>(filteredCourses, coursePage, coursePageSize);

  const renderMountCourse = () => (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-1">Mount Courses to Program</h2>
        <p className="text-slate-500 text-sm mb-4">Select a program and mount courses to its curriculum.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="label">Program</label>
            <select className="input" value={mountProgid} onChange={e => setMountProgid(e.target.value)}>
              <option value="">Select Program</option>
              {programs.map(p => <option key={p.progid} value={p.progid}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="label">Level</label>
            <select className="input" value={mountLevel} onChange={e => setMountLevel(parseInt(e.target.value))}>
              {[100,200,300,400].map(l => <option key={l} value={l}>Level {l}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="label">Semester</label>
            <select className="input" value={mountSemester} onChange={e => setMountSemester(e.target.value)}>
              <option value="">Select Semester</option>
              {semesters.map(s => <option key={s.sid} value={s.sid}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50"><h3 className="font-bold">Available Courses</h3></div>
          <div className="p-4 max-h-[500px] overflow-y-auto space-y-2">
            {courses.map(c => (
              <div key={c.code} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg hover:border-blue-200 transition-all">
                <div className="flex-1 min-w-0 mr-4">
                  <div className="text-sm font-bold">{c.code}</div>
                  <div className="text-xs text-slate-500">{c.name} ({c.credit_hours} CR)</div>
                </div>
                <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" onClick={() => handleMount(c.code)}><Plus size={18} /></button>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="p-4 border-b border-slate-100 bg-blue-50/50"><h3 className="font-bold text-blue-900">Mounted Courses</h3></div>
          <div className="p-4 max-h-[500px] overflow-y-auto space-y-2">
            {curriculum.length > 0 ? curriculum.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-white border border-blue-100 rounded-lg">
                <div className="flex-1 min-w-0 mr-4">
                  <div className="text-sm font-bold">{item.course_code}</div>
                  <div className="text-xs text-slate-500">{item.name || item.course_name}</div>
                </div>
                <button onClick={() => handleUnmountCourse(item.course_code)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
              </div>
            )) : <div className="p-12 text-center text-slate-400 italic">No courses mounted.</div>}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSetupCourse = () => (
    <div className="card">
      <div className="p-6 border-b border-slate-100">
        <h2 className="font-bold text-lg">Setup New Course</h2>
        <p className="text-slate-500 text-sm">Define a new course.</p>
      </div>
      <form className="p-6 space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="label">Course Title</label>
            <input type="text" className="input" placeholder="e.g. Old Testament Survey" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="label">Course Code</label>
            <input type="text" className="input" placeholder="e.g. BT 101" required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="label">Credit Hours</label>
            <input type="number" className="input" required value={formData.credit_hours} onChange={e => setFormData({...formData, credit_hours: parseInt(e.target.value)})} />
          </div>
          <div className="space-y-2">
            <label className="label">Department</label>
            <select className="input" required value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
              <option value="">Select Department</option>
              {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
          <button type="button" className="btn btn-secondary" onClick={() => setFormData({name:'',code:'',credit_hours:3,department:''})}>Cancel</button>
          <button type="submit" className="btn btn-primary gap-2" disabled={submitting}>
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            {submitting ? 'Creating...' : 'Create Course'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderViewCourses = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Search by title or code..." className="input pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <button 
          className="btn btn-secondary gap-2 whitespace-nowrap"
          onClick={() => printElement('print-courses', 'Course Directory')}
        >
          <Printer size={18} />
          Print List
        </button>
      </div>
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center"><Loader2 size={32} className="text-blue-600 animate-spin mb-4" /><p className="text-slate-500">Loading...</p></div>
        ) : (
          <div className="overflow-x-auto" id="print-courses">
            <table className="w-full text-left">
              <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Code</th>
                <th className="px-6 py-4 font-semibold">Title</th>
                <th className="px-6 py-4 font-semibold hidden sm:table-cell">Credits</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCourses.items.length > 0 ? paginatedCourses.items.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-sm font-mono font-bold text-slate-600">{c.code}</td>
                    <td className="px-6 py-4"><div className="text-sm font-medium text-slate-900">{c.name}</div><div className="text-xs text-slate-400">{c.department}</div></td>
                    <td className="px-6 py-4 text-sm hidden sm:table-cell">{c.credit_hours}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => {
                            setSelectedCourseObj(c);
                            setFormData({ name: c.name, code: c.code, credit_hours: c.credit_hours, department: c.department || '' });
                            setShowEditModal(true);
                        }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={16} /></button>
                        <button onClick={() => handleDelete(c)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                )) : <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">No courses found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-6">
          <PaginationControls
            page={paginatedCourses.page}
            pageSize={coursePageSize}
            totalItems={filteredCourses.length}
            onPageChange={setCoursePage}
            onPageSizeChange={(size) => {
              setCoursePageSize(size);
              setCoursePage(1);
            }}
            itemLabel="courses"
          />
        </div>
      </div>

      {showEditModal && selectedCourseObj && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900">Edit Course</h3>
                <p className="text-xs text-slate-500">Update information for {selectedCourseObj.name}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form className="p-6 space-y-6" onSubmit={handleEditSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="label">Course Title</label>
                  <input type="text" className="input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="label">Course Code</label>
                  <input type="text" disabled value={formData.code} className="input bg-slate-100 text-slate-500 cursor-not-allowed" />
                </div>
                <div className="space-y-2">
                  <label className="label">Credit Hours</label>
                  <input type="number" className="input" required value={formData.credit_hours} onChange={e => setFormData({...formData, credit_hours: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="label">Department</label>
                  <select className="input" required value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary gap-2" disabled={submitting}>
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <Edit size={18} />}
                  {submitting ? 'Updating...' : 'Update Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  switch (activeSubItem) {
    case 'setup_course': return renderSetupCourse();
    case 'mount_course': return renderMountCourse();
    case 'view_courses': case null: return renderViewCourses();
    case 'bulk_upload': return <BulkUploadModule />;
    default: return <div className="card p-12 text-center"><p className="text-slate-500">The {activeSubItem} feature is coming soon.</p></div>;
  }
};
