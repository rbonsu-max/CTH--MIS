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
    code: '',
    department: '',
    duration: '4 Years',
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createProgram(formData);
      setFormData({
        name: '',
        code: '',
        department: '',
        duration: '4 Years',
        description: ''
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
              value={formData.code}
              onChange={e => setFormData({...formData, code: e.target.value})}
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
            <label className="label">Duration</label>
            <select 
              className="input"
              value={formData.duration}
              onChange={e => setFormData({...formData, duration: e.target.value})}
            >
              <option value="1 Year">1 Year</option>
              <option value="2 Years">2 Years</option>
              <option value="3 Years">3 Years</option>
              <option value="4 Years">4 Years</option>
            </select>
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="label">Description</label>
            <textarea 
              className="input min-h-[100px]" 
              placeholder="Program description..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
          <button type="button" className="btn btn-secondary" onClick={() => setFormData({
            name: '', code: '', department: '', duration: '4 Years', description: ''
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
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">{program.code}</div>
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
                  <span>{program.duration}</span>
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
