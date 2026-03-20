import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, GraduationCap, Building2, Clock, Loader2 } from 'lucide-react';
import { Program } from '../types';
import { api } from '../services/api';
import { BulkUploadModule } from './BulkUploadModule';

interface ProgramsModuleProps {
  activeSubItem: string | null;
}

export const ProgramsModule: React.FC<ProgramsModuleProps> = ({ activeSubItem }) => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    progid: '',
    department: '',
    duration_years: 4
  });

  const [courses, setCourses] = useState<any[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<number>(100);
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [semesters, setSemesters] = useState<any[]>([]);
  const [curriculum, setCurriculum] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
    if (activeSubItem === 'mount_curriculum') {
      fetchMountData();
    }
  }, [activeSubItem]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.getPrograms();
      setPrograms(data);
    } catch (error) {
      console.error('Failed to fetch programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMountData = async () => {
    try {
      const [courseData, semesterData] = await Promise.all([
        api.getCourses(),
        api.getSemesters()
      ]);
      setCourses(courseData);
      setSemesters(semesterData);
      const currentSem = semesterData.find((s: any) => s.is_current);
      if (currentSem) setSelectedSemester(currentSem.sid);
    } catch (error) {
      console.error('Failed to fetch mounting data:', error);
    }
  };

  const handleMountCourse = async (course_code: string) => {
    if (!selectedProgram || !selectedSemester) {
      alert('Please select program and semester first');
      return;
    }
    try {
      await api.mountCurriculum(selectedProgram, {
        semester_sid: selectedSemester,
        course_code,
        level: selectedLevel
      });
      alert('Course mounted successfully!');
      fetchCurriculum();
    } catch (error) {
      console.error('Failed to mount course:', error);
      alert('Failed to mount course');
    }
  };

  const fetchCurriculum = async () => {
    if (!selectedProgram) return;
    try {
      const data = await api.getCurriculum(selectedProgram, selectedLevel, selectedSemester);
      setCurriculum(data);
    } catch (error) {
      console.error('Failed to fetch curriculum:', error);
    }
  };

  useEffect(() => {
    if (selectedProgram && selectedSemester) {
      fetchCurriculum();
    }
  }, [selectedProgram, selectedLevel, selectedSemester]);

  const renderMountCurriculum = () => (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="label">Select Program</label>
            <select 
              className="input"
              value={selectedProgram}
              onChange={e => setSelectedProgram(e.target.value)}
            >
              <option value="">Select Program</option>
              {programs.map(p => <option key={p.progid} value={p.progid}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="label">Level</label>
            <select 
              className="input"
              value={selectedLevel}
              onChange={e => setSelectedLevel(parseInt(e.target.value))}
            >
              <option value="100">Level 100</option>
              <option value="200">Level 200</option>
              <option value="300">Level 300</option>
              <option value="400">Level 400</option>
            </select>
          </div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <label className="label">Semester</label>
            <select 
              className="input"
              value={selectedSemester}
              onChange={e => setSelectedSemester(e.target.value)}
            >
              <option value="">Select Semester</option>
              {semesters.map(s => <option key={s.sid} value={s.sid}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold">Available Courses</h3>
          </div>
          <div className="p-4 max-h-[500px] overflow-y-auto space-y-2">
            {courses.map(course => (
              <div key={course.code} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg hover:border-blue-200 transition-all">
                <div className="flex-1 min-w-0 mr-4">
                  <div className="text-sm font-bold truncate">{course.code}</div>
                  <div className="text-xs text-slate-500 truncate">{course.title} ({course.credit_hours} Credits)</div>
                </div>
                <button 
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all flex-shrink-0"
                  onClick={() => handleMountCourse(course.code)}
                >
                  <Plus size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="p-4 border-b border-slate-100 bg-blue-50/50">
            <h3 className="font-bold text-blue-900">Mounted Curriculum</h3>
          </div>
          <div className="p-4 max-h-[500px] overflow-y-auto space-y-2">
            {curriculum.length > 0 ? curriculum.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-white border border-blue-100 rounded-lg">
                <div className="flex-1 min-w-0 mr-4">
                  <div className="text-sm font-bold truncate">{item.course_code}</div>
                  <div className="text-xs text-slate-500 truncate">{item.course_title}</div>
                </div>
                <button className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex-shrink-0">
                  <Trash2 size={18} />
                </button>
              </div>
            )) : (
              <div className="p-12 text-center text-slate-400 italic">No courses mounted for this selection.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createProgram(formData);
      setFormData({
        name: '',
        progid: '',
        department: '',
        duration_years: 4
      });
      alert('Program created successfully!');
      fetchData();
    } catch (error) {
      console.error('Failed to save program:', error);
      alert('Failed to save program');
    } finally {
      setSubmitting(false);
    }
  };

  const renderSetupProgram = () => (
    <div className="card">
      <div className="p-6 border-b border-slate-100">
        <h2 className="font-bold text-lg">Setup New Program</h2>
        <p className="text-slate-500 text-sm">Define a new academic program for the institution.</p>
      </div>
      <form className="p-6 space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="label">Program Name</label>
            <input 
              type="text" 
              className="input" 
              placeholder="e.g. B.Ed Mathematics" 
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="label">Program Code</label>
            <input 
              type="text" 
              className="input" 
              placeholder="e.g. BED-MAT" 
              required
              value={formData.progid}
              onChange={e => setFormData({...formData, progid: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="label">Department</label>
            <select 
              className="input"
              required
              value={formData.department}
              onChange={e => setFormData({...formData, department: e.target.value})}
            >
              <option value="">Select Department</option>
              <option value="Mathematics Education">Mathematics Education</option>
              <option value="Languages Education">Languages Education</option>
              <option value="Science Education">Science Education</option>
              <option value="ICT Education">ICT Education</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="label">Duration (Years)</label>
            <select 
              className="input"
              required
              value={formData.duration_years}
              onChange={e => setFormData({...formData, duration_years: parseInt(e.target.value)})}
            >
              <option value="1">1 Year</option>
              <option value="2">2 Years</option>
              <option value="3">3 Years</option>
              <option value="4">4 Years</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
          <button type="button" className="btn btn-secondary" onClick={() => setFormData({
            name: '', progid: '', department: '', duration_years: 4
          })}>Cancel</button>
          <button type="submit" className="btn btn-primary gap-2" disabled={submitting}>
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            {submitting ? 'Creating...' : 'Create Program'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderViewPrograms = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {loading ? (
        <div className="col-span-full p-12 flex flex-col items-center justify-center">
          <Loader2 size={32} className="text-blue-600 animate-spin mb-4" />
          <p className="text-slate-500">Loading programs...</p>
        </div>
      ) : (
        <>
          {programs.map((program) => (
            <div key={program.id} className="card hover:border-blue-200 transition-all group">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-white rounded-xl shadow-sm">
                    <GraduationCap className="text-blue-600" size={24} />
                  </div>
                  <div className="flex gap-1">
                    <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all">
                      <Edit size={16} />
                    </button>
                    <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">{program.progid}</div>
                  <h3 className="font-bold text-lg text-slate-900 leading-tight">{program.name}</h3>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Building2 size={16} className="text-slate-400" />
                  <span>{program.department}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Clock size={16} className="text-slate-400" />
                  <span>{program.duration_years} Years</span>
                </div>
              </div>
            </div>
          ))}
          <button 
            onClick={() => {/* handle navigate to setup */}}
            className="card border-dashed border-2 border-slate-200 bg-slate-50/30 flex flex-col items-center justify-center p-8 hover:bg-slate-50 hover:border-blue-300 transition-all group min-h-[200px]"
          >
            <div className="p-4 bg-white rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
              <Plus className="text-slate-400 group-hover:text-blue-600" size={32} />
            </div>
            <span className="font-bold text-slate-500 group-hover:text-blue-600">Add New Program</span>
          </button>
        </>
      )}
    </div>
  );

  switch (activeSubItem) {
    case 'setup_program':
      return renderSetupProgram();
    case 'mount_curriculum':
      return renderMountCurriculum();
    case 'view_programs':
    case null:
      return renderViewPrograms();
    case 'bulk_upload':
      return <BulkUploadModule />;
    default:
      return (
        <div className="card p-12 text-center">
          <p className="text-slate-500">The {activeSubItem} feature is coming soon.</p>
        </div>
      );
  }
};
