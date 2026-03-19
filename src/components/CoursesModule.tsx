import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, BookOpen, Clock, Calendar, Filter, Loader2 } from 'lucide-react';
import { Course, Program } from '../types';
import { api } from '../services/api';
import { BulkUploadModule } from './BulkUploadModule';

interface CoursesModuleProps {
  activeSubItem: string | null;
}

export const CoursesModule: React.FC<CoursesModuleProps> = ({ activeSubItem }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    creditHours: 3,
    programId: '',
    semester: '1st Semester',
    level: '100'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [coursesData, programsData] = await Promise.all([
        api.getCourses(),
        api.getPrograms()
      ]);
      setCourses(coursesData);
      setPrograms(programsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createCourse(formData);
      setFormData({
        name: '',
        code: '',
        creditHours: 3,
        programId: '',
        semester: '1st Semester',
        level: '100'
      });
      alert('Course created successfully!');
      fetchData();
    } catch (error) {
      console.error('Failed to save course:', error);
      alert('Failed to save course');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCourses = courses.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderSetupCourse = () => (
    <div className="card">
      <div className="p-6 border-b border-slate-100">
        <h2 className="font-bold text-lg">Setup New Course</h2>
        <p className="text-slate-500 text-sm">Define a new course for the institution.</p>
      </div>
      <form className="p-6 space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="label">Course Title</label>
            <input 
              type="text" 
              className="input" 
              placeholder="e.g. Calculus I" 
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="label">Course Code</label>
            <input 
              type="text" 
              className="input" 
              placeholder="e.g. MAT101" 
              required
              value={formData.code}
              onChange={e => setFormData({...formData, code: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="label">Credit Hours</label>
            <input 
              type="number" 
              className="input" 
              required
              value={formData.creditHours}
              onChange={e => setFormData({...formData, creditHours: parseInt(e.target.value)})}
            />
          </div>
          <div className="space-y-2">
            <label className="label">Program</label>
            <select 
              className="input"
              required
              value={formData.programId}
              onChange={e => setFormData({...formData, programId: e.target.value})}
            >
              <option value="">Select Program</option>
              {programs.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="label">Level</label>
            <select 
              className="input"
              value={formData.level}
              onChange={e => setFormData({...formData, level: e.target.value})}
            >
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="300">300</option>
              <option value="400">400</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="label">Semester</label>
            <select 
              className="input"
              value={formData.semester}
              onChange={e => setFormData({...formData, semester: e.target.value})}
            >
              <option value="1st Semester">1st Semester</option>
              <option value="2nd Semester">2nd Semester</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
          <button type="button" className="btn btn-secondary" onClick={() => setFormData({
            name: '', code: '', creditHours: 3, programId: '', semester: '1st Semester', level: '100'
          })}>Cancel</button>
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
          <input 
            type="text" 
            placeholder="Search by title or code..." 
            className="input pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary gap-2">
            <Filter size={18} />
            Filter
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <Loader2 size={32} className="text-blue-600 animate-spin mb-4" />
            <p className="text-slate-500">Loading courses...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Course Code</th>
                  <th className="px-6 py-4 font-semibold">Course Title</th>
                  <th className="px-6 py-4 font-semibold">Credits</th>
                  <th className="px-6 py-4 font-semibold">Level</th>
                  <th className="px-6 py-4 font-semibold">Semester</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCourses.length > 0 ? filteredCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-slate-600 font-bold">{course.code}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">{course.name}</div>
                      <div className="text-xs text-slate-400">
                        {programs.find(p => p.id === course.programId)?.name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{course.creditHours}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{course.level}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{course.semester}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                          <Edit size={16} />
                        </button>
                        <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No courses found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  switch (activeSubItem) {
    case 'setup_course':
      return renderSetupCourse();
    case 'view_courses':
    case null:
      return renderViewCourses();
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
