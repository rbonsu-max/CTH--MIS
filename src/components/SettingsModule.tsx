import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Settings, Calendar, Clock, UserCog, CheckCircle, Loader2, X, Upload } from 'lucide-react';
import { AcademicYear, Semester } from '../types';
import { api } from '../services/api';
import { BulkUploadModule } from './BulkUploadModule';

interface SettingsModuleProps {
  activeSubItem: string | null;
}

export const SettingsModule: React.FC<SettingsModuleProps> = ({ activeSubItem }) => {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddYearModal, setShowAddYearModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newYear, setNewYear] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [years, sems] = await Promise.all([
        api.getAcademicYears(),
        api.getSemesters()
      ]);
      setAcademicYears(years);
      setSemesters(sems);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddYear = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createAcademicYear({ year: newYear, isCurrent: academicYears.length === 0 });
      setNewYear('');
      setShowAddYearModal(false);
      alert('Academic year added successfully!');
      fetchData();
    } catch (error) {
      console.error('Failed to save academic year:', error);
      alert('Failed to save academic year');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetCurrentYear = async (id: string) => {
    try {
      await api.setCurrentAcademicYear(id);
      alert('Current academic year updated!');
      fetchData();
    } catch (error) {
      console.error('Failed to update current year:', error);
      alert('Failed to update current year');
    }
  };

  const handleSetCurrentSemester = async (id: string) => {
    try {
      await api.setCurrentSemester(id);
      alert('Current semester updated!');
      fetchData();
    } catch (error) {
      console.error('Failed to update current semester:', error);
      alert('Failed to update current semester');
    }
  };

  const renderAcademicYear = () => (
    <div className="space-y-6">
      <div className="card">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">Academic Year Setup</h2>
            <p className="text-slate-500 text-sm">Manage academic years and set the current active year.</p>
          </div>
          <button className="btn btn-primary gap-2" onClick={() => setShowAddYearModal(true)}>
            <Plus size={18} />
            New Academic Year
          </button>
        </div>
        <div className="p-6 space-y-4">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center">
              <Loader2 size={32} className="text-blue-600 animate-spin mb-4" />
              <p className="text-slate-500">Loading academic years...</p>
            </div>
          ) : academicYears.length > 0 ? academicYears.map((item) => (
            <div key={item.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
              item.isCurrent ? 'border-blue-200 bg-blue-50/50' : 'border-slate-100 bg-white'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${item.isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Calendar size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{item.year} Academic Year</div>
                  <div className="text-xs text-slate-400">{item.isCurrent ? 'Active' : 'Archived'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {item.isCurrent ? (
                  <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-600 text-white">Current</span>
                ) : (
                  <button 
                    className="text-blue-600 text-xs font-bold hover:underline"
                    onClick={() => handleSetCurrentYear(item.id)}
                  >
                    Set as Current
                  </button>
                )}
                <div className="flex gap-1">
                  <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all">
                    <Edit size={16} />
                  </button>
                  <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          )) : (
            <div className="p-12 text-center text-slate-500">No academic years setup.</div>
          )}
        </div>
      </div>

      {showAddYearModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-lg">Add Academic Year</h2>
              <button onClick={() => setShowAddYearModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <form className="p-6 space-y-4" onSubmit={handleAddYear}>
              <div className="space-y-2">
                <label className="label">Academic Year</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="e.g. 2025/2026" 
                  required
                  value={newYear}
                  onChange={e => setNewYear(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddYearModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary gap-2" disabled={submitting}>
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                  {submitting ? 'Adding...' : 'Add Year'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const renderSemesters = () => (
    <div className="space-y-6">
      <div className="card">
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-bold text-lg">Semester Setup</h2>
          <p className="text-slate-500 text-sm">Manage semesters for the current academic year.</p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-full p-12 flex flex-col items-center justify-center">
              <Loader2 size={32} className="text-blue-600 animate-spin mb-4" />
              <p className="text-slate-500">Loading semesters...</p>
            </div>
          ) : semesters.map((sem) => (
            <div key={sem.id} className={`p-6 rounded-2xl border transition-all ${
              sem.isCurrent ? 'border-blue-200 bg-blue-50/50 ring-4 ring-blue-500/5' : 'border-slate-100 bg-white'
            }`}>
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${sem.isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Clock size={24} />
                </div>
                {sem.isCurrent && (
                  <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-600 text-white">Active</span>
                )}
              </div>
              <h3 className="font-bold text-lg text-slate-900">{sem.name}</h3>
              <p className="text-sm text-slate-500 mt-1">Current Academic Year</p>
              <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                <button 
                  className={`text-sm font-bold ${sem.isCurrent ? 'text-slate-400 cursor-not-allowed' : 'text-blue-600 hover:underline'}`} 
                  disabled={sem.isCurrent}
                  onClick={() => handleSetCurrentSemester(sem.id)}
                >
                  {sem.isCurrent ? 'Currently Active' : 'Activate Semester'}
                </button>
                <div className="flex gap-1">
                  <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all">
                    <Edit size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  switch (activeSubItem) {
    case 'academic_year':
      return renderAcademicYear();
    case 'semesters':
      return renderSemesters();
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
