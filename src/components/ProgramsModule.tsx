import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, GraduationCap, Building2, Clock, Loader2, Users, Printer } from 'lucide-react';
import { Program, Department, Student } from '../types';
import { api } from '../services/api';
import { BulkUploadModule } from './BulkUploadModule';
import { printElement } from '../utils/print';
import { useToast } from '../context/ToastContext';
import { X } from 'lucide-react';
import { PaginationControls } from './PaginationControls';
import { DEFAULT_PAGE_SIZE, paginateItems } from '../utils/pagination';

interface ProgramsModuleProps {
  activeSubItem: string | null;
  onSubItemChange?: (id: string) => void;
}

export const ProgramsModule: React.FC<ProgramsModuleProps> = ({ activeSubItem, onSubItemChange }) => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', progid: '', department: '', duration: 4, required_ch: 0 });

  const { success, error: toastError } = useToast();
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProgramObj, setSelectedProgramObj] = useState<Program | null>(null);

  // Mount curriculum state
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedLevel, setSelectedLevel] = useState(100);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [semesters, setSemesters] = useState<any[]>([]);
  const [curriculum, setCurriculum] = useState<any[]>([]);

  // Populate program state
  const [students, setStudents] = useState<Student[]>([]);
  const [populateSearch, setPopulateSearch] = useState('');
  const [populateProgid, setPopulateProgid] = useState('');
  const [programPage, setProgramPage] = useState(1);
  const [programPageSize, setProgramPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [populatePage, setPopulatePage] = useState(1);
  const [populatePageSize, setPopulatePageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    if (activeSubItem === 'populate_program') {
      api.getStudents().then(setStudents).catch(console.error);
    }
    if (activeSubItem === 'mount_curriculum') fetchMountData();
  }, [activeSubItem]);

  useEffect(() => {
    setPopulatePage(1);
  }, [populateSearch, populatePageSize]);

  useEffect(() => {
    setProgramPage(1);
  }, [programPageSize]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [p, d] = await Promise.all([api.getPrograms(), api.getDepartments()]);
      setPrograms(p);
      setDepartments(d);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchMountData = async () => {
    try {
      const [c, s] = await Promise.all([api.getCourses(), api.getSemesters()]);
      setCourses(c);
      setSemesters(s);
      const cur = s.find((x: any) => x.is_current);
      if (cur) setSelectedSemester(cur.sid);
    } catch (e) { console.error(e); }
  };

  const fetchCurriculum = async () => {
    if (!selectedProgram) return;
    try {
      setCurriculum(await api.getCurriculum(selectedProgram, selectedLevel, selectedSemester));
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (selectedProgram && selectedSemester) fetchCurriculum();
  }, [selectedProgram, selectedLevel, selectedSemester]);

  const handleMountCourse = async (cid: string) => {
    if (!selectedProgram || !selectedSemester) return toastError('Please select program and semester first');
    try {
      await api.mountCurriculum(selectedProgram, { course_code: cid, level: selectedLevel, semester_sid: selectedSemester });
      success('Course mounted!');
      fetchCurriculum();
    } catch (e: any) { toastError(e.message || 'Failed'); }
  };

  const handleUnmountCourse = async (cid: string) => {
    if (!window.confirm(`Unmount course ${cid}?`)) return;
    try {
      await api.unmountCurriculum(selectedProgram, cid, selectedLevel, selectedSemester);
      success('Course unmounted!');
      fetchCurriculum();
    } catch (e: any) { toastError(e.message || 'Failed to unmount course'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createProgram(formData);
      setFormData({ name: '', progid: '', department: '', duration: 4, required_ch: 0 });
      success('Program created!');
      fetchData();
    } catch (e: any) { toastError(e.message || 'Failed to save program'); }
    finally { setSubmitting(false); }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgramObj) return;
    setSubmitting(true);
    try {
      await api.updateProgram(selectedProgramObj.progid, formData);
      success('Program updated successfully!');
      setShowEditModal(false);
      fetchData();
    } catch (e: any) { toastError(e.message || 'Failed to update program'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (program: Program) => {
    if (!window.confirm(`Are you sure you want to completely delete the ${program.name} program? Associated curriculum mounts will be removed, and students in this program will be detached.`)) return;
    try {
      await api.deleteProgram(program.progid);
      success('Program deleted successfully!');
      fetchData();
    } catch (err: any) {
      toastError(err.message || 'Failed to delete program');
    }
  };

  const handlePopulate = async (student: Student) => {
    if (!populateProgid) return toastError('Please select a program first');
    try {
      await api.updateStudent(student.iid, { ...student, progid: populateProgid });
      success(`${student.full_name} assigned to program!`);
      setStudents(prev => prev.map(s => s.iid === student.iid ? { ...s, progid: populateProgid } : s));
    } catch (e) { toastError('Failed to assign'); }
  };

  const filteredPopulate = students.filter(s =>
    (s.full_name || '').toLowerCase().includes(populateSearch.toLowerCase()) ||
    (s.index_number || '').toLowerCase().includes(populateSearch.toLowerCase())
  );
  const paginatedPopulate = paginateItems<Student>(filteredPopulate, populatePage, populatePageSize);
  const paginatedPrograms = paginateItems<Program>(programs, programPage, programPageSize);

  const renderPopulateProgram = () => (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-1">Populate Program</h2>
        <p className="text-slate-500 text-sm mb-4">Assign students to a program.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="label">Select Program</label>
            <select className="input" value={populateProgid} onChange={e => setPopulateProgid(e.target.value)}>
              <option value="">Select Program</option>
              {programs.map(p => <option key={p.progid} value={p.progid}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="label">Search Student</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" className="input pl-10" placeholder="Search by name or index..." value={populateSearch} onChange={e => setPopulateSearch(e.target.value)} />
            </div>
          </div>
        </div>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <th className="px-6 py-3 font-semibold">Student</th>
            <th className="px-6 py-3 font-semibold hidden sm:table-cell">Current Program</th>
            <th className="px-6 py-3 font-semibold hidden md:table-cell">Level</th>
            <th className="px-6 py-3 font-semibold text-right">Action</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedPopulate.items.length > 0 ? paginatedPopulate.items.map(s => (
              <tr key={s.iid} className="hover:bg-slate-50/50">
                <td className="px-6 py-3">
                  <div className="text-sm font-bold">{s.full_name}</div>
                  <div className="text-xs text-slate-500 font-mono">{s.index_number}</div>
                </td>
                <td className="px-6 py-3 text-sm text-slate-600 hidden sm:table-cell">{programs.find(p => p.progid === s.progid)?.name || s.progid || 'None'}</td>
                <td className="px-6 py-3 text-sm hidden md:table-cell">{s.current_level}</td>
                <td className="px-6 py-3 text-right">
                  <button onClick={() => handlePopulate(s)} disabled={!populateProgid} className="btn btn-primary text-xs py-1 px-3 disabled:opacity-50">
                    <Users size={14} className="mr-1" /> Assign
                  </button>
                </td>
              </tr>
            )) : <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">No students found.</td></tr>}
          </tbody>
        </table>
        <div className="px-6 pb-6">
          <PaginationControls
            page={paginatedPopulate.page}
            pageSize={populatePageSize}
            totalItems={filteredPopulate.length}
            onPageChange={setPopulatePage}
            onPageSizeChange={(size) => {
              setPopulatePageSize(size);
              setPopulatePage(1);
            }}
            itemLabel="students"
          />
        </div>
      </div>
    </div>
  );

  const renderMountCurriculum = () => (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="label">Program</label>
            <select className="input" value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)}>
              <option value="">Select Program</option>
              {programs.map(p => <option key={p.progid} value={p.progid}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="label">Level</label>
            <select className="input" value={selectedLevel} onChange={e => setSelectedLevel(parseInt(e.target.value))}>
              {[100,200,300,400].map(l => <option key={l} value={l}>Level {l}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="label">Semester</label>
            <select className="input" value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)}>
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
                  <div className="text-xs text-slate-500">{c.name} ({c.credit_hours} Credits)</div>
                </div>
                <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" onClick={() => handleMountCourse(c.code)}>
                  <Plus size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="p-4 border-b border-slate-100 bg-blue-50/50"><h3 className="font-bold text-blue-900">Mounted Curriculum</h3></div>
          <div className="p-4 max-h-[500px] overflow-y-auto space-y-2">
            {curriculum.length > 0 ? curriculum.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-white border border-blue-100 rounded-lg">
                <div className="flex-1 min-w-0 mr-4">
                  <div className="text-sm font-bold">{item.course_code}</div>
                  <div className="text-xs text-slate-500">{item.course_name || item.name}</div>
                </div>
                <button onClick={() => handleUnmountCourse(item.course_code)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
              </div>
            )) : <div className="p-12 text-center text-slate-400 italic">No courses mounted.</div>}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSetupProgram = () => (
    <div className="card">
      <div className="p-6 border-b border-slate-100">
        <h2 className="font-bold text-lg">Setup New Program</h2>
        <p className="text-slate-500 text-sm">Define a new academic program.</p>
      </div>
      <form className="p-6 space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="label">Program Name</label>
            <input type="text" className="input" placeholder="e.g. Bachelor of Theology" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="label">Program Code</label>
            <input type="text" className="input" placeholder="e.g. B.TH" required value={formData.progid} onChange={e => setFormData({...formData, progid: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="label">Department</label>
            <select className="input" required value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
              <option value="">Select Department</option>
              {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="label">Duration (Years)</label>
            <select className="input" value={formData.duration} onChange={e => setFormData({...formData, duration: parseInt(e.target.value)})}>
              {[1,2,3,4].map(y => <option key={y} value={y}>{y} Year{y>1?'s':''}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="label">Required Credit Hours</label>
            <input type="number" className="input" required value={formData.required_ch} onChange={e => setFormData({...formData, required_ch: parseInt(e.target.value)})} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
          <button type="button" className="btn btn-secondary" onClick={() => setFormData({name:'',progid:'',department:'',duration:4, required_ch:0})}>Cancel</button>
          <button type="submit" className="btn btn-primary gap-2" disabled={submitting}>
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            {submitting ? 'Creating...' : 'Create Program'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderViewPrograms = () => (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button 
          className="btn btn-secondary gap-2"
          onClick={() => printElement('print-programs', 'Program Directory')}
        >
          <Printer size={18} /> Print List
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="print-programs">
      {loading ? (
        <div className="col-span-full p-12 flex flex-col items-center justify-center">
          <Loader2 size={32} className="text-blue-600 animate-spin mb-4" />
          <p className="text-slate-500">Loading programs...</p>
        </div>
      ) : (
        <>
          {paginatedPrograms.items.map(program => (
            <div key={program.id} className="card hover:border-blue-200 transition-all group">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-white rounded-xl shadow-sm"><GraduationCap className="text-blue-600" size={24} /></div>
                  <div className="flex gap-1">
                    <button onClick={() => {
                        setSelectedProgramObj(program);
                        setFormData({ name: program.name, progid: program.progid, department: program.department || '', duration: program.duration || 4, required_ch: program.required_ch || 0 });
                        setShowEditModal(true);
                    }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(program)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg"><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">{program.progid}</div>
                  <h3 className="font-bold text-lg text-slate-900 leading-tight">{program.name}</h3>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 text-sm text-slate-600"><Building2 size={16} className="text-slate-400" /><span>{program.department || 'N/A'}</span></div>
                <div className="flex items-center gap-3 text-sm text-slate-600"><Clock size={16} className="text-slate-400" /><span>{program.duration} Years</span></div>
              </div>
            </div>
          ))}
          <button 
            className="card border-dashed border-2 border-slate-200 bg-slate-50/30 flex flex-col items-center justify-center p-8 hover:bg-slate-50 hover:border-blue-300 transition-all group min-h-[200px]"
            onClick={() => onSubItemChange?.('setup_program')}
          >
            <div className="p-4 bg-white rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform"><Plus className="text-slate-400 group-hover:text-blue-600" size={32} /></div>
            <span className="font-bold text-slate-500 group-hover:text-blue-600">Add New Program</span>
          </button>
        </>
      )}
      </div>
      <PaginationControls
        page={paginatedPrograms.page}
        pageSize={programPageSize}
        totalItems={programs.length}
        onPageChange={setProgramPage}
        onPageSizeChange={(size) => {
          setProgramPageSize(size);
          setProgramPage(1);
        }}
        itemLabel="programs"
      />

      {showEditModal && selectedProgramObj && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900">Edit Program</h3>
                <p className="text-xs text-slate-500">Update configuration for {selectedProgramObj.name}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form className="p-6 space-y-6" onSubmit={handleEditSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="label">Program Name</label>
                  <input type="text" className="input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="label">Program Code</label>
                  <input type="text" disabled value={formData.progid} className="input bg-slate-100 text-slate-500 cursor-not-allowed" />
                </div>
                <div className="space-y-2">
                  <label className="label">Department</label>
                  <select className="input" required value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="label">Duration (Years)</label>
                  <select className="input" value={formData.duration} onChange={e => setFormData({...formData, duration: parseInt(e.target.value)})}>
                    {[1,2,3,4].map(y => <option key={y} value={y}>{y} Year{y>1?'s':''}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="label">Required Credit Hours</label>
                  <input type="number" className="input" required value={formData.required_ch} onChange={e => setFormData({...formData, required_ch: parseInt(e.target.value)})} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary gap-2" disabled={submitting}>
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <Edit size={18} />}
                  {submitting ? 'Updating...' : 'Update Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  switch (activeSubItem) {
    case 'setup_program': return renderSetupProgram();
    case 'populate_program': return renderPopulateProgram();
    case 'mount_curriculum': return renderMountCurriculum();
    case 'view_programs': case null: return renderViewPrograms();
    case 'bulk_upload': return <BulkUploadModule />;
    default: return <div className="card p-12 text-center"><p className="text-slate-500">The {activeSubItem} feature is coming soon.</p></div>;
  }
};
