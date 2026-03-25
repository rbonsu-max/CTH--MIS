import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, X, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { AssessmentWindow, AcademicYear, Semester } from '../types';

export const SettingsAssessmentControl: React.FC = () => {
  const [windows, setWindows] = useState<AssessmentWindow[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingWindow, setEditingWindow] = useState<AssessmentWindow | null>(null);
  const [formData, setFormData] = useState({
    academic_year: '',
    semester_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_active: true
  });
  
  const { success, error: toastError } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [winData, yearData, semData] = await Promise.all([
        api.getAssessmentWindows(),
        api.getAcademicYears(),
        api.getSemesters()
      ]);
      setWindows(winData);
      setAcademicYears(yearData);
      setSemesters(semData);
      
      const currentYear = yearData.find(y => y.is_current)?.code || '';
      const currentSem = semData.find(s => s.is_current)?.sid || '';
      setFormData(prev => ({ ...prev, academic_year: currentYear, semester_id: currentSem }));
    } catch (e: any) {
      toastError('Failed to load assessment windows');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.upsertAssessmentWindow({
        ...formData,
        id: editingWindow?.id
      });
      success(editingWindow ? 'Window updated' : 'Window created');
      setShowModal(false);
      fetchData();
    } catch (e: any) {
      toastError(e.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this assessment window?')) return;
    try {
      await api.deleteAssessmentWindow(id);
      success('Window deleted');
      fetchData();
    } catch (e: any) {
      toastError(e.message || 'Delete failed');
    }
  };

  const openForm = (win?: AssessmentWindow) => {
    if (win) {
      setEditingWindow(win);
      setFormData({
        academic_year: win.academic_year,
        semester_id: win.semester_id,
        start_date: win.start_date,
        end_date: win.end_date,
        is_active: !!win.is_active
      });
    } else {
      setEditingWindow(null);
      const currentYear = academicYears.find(y => y.is_current)?.code || '';
      const currentSem = semesters.find(s => s.is_current)?.sid || '';
      setFormData({
        academic_year: currentYear,
        semester_id: currentSem,
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        is_active: true
      });
    }
    setShowModal(true);
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="card">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-lg">Assessment Upload Windows</h2>
            <p className="text-slate-500 text-sm">Define time periods when lecturers can upload results.</p>
          </div>
          <button className="btn btn-primary gap-2" onClick={() => openForm()}>
            <Plus size={18} /> New Window
          </button>
        </div>
        <div className="p-6 space-y-4">
          {windows.map((w) => {
            const now = new Date().toISOString().split('T')[0];
            const isOpen = w.is_active && now >= w.start_date && now <= w.end_date;
            
            return (
              <div key={w.id} className={`border p-5 rounded-2xl flex justify-between items-center transition-all ${
                isOpen ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-white'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${isOpen ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {isOpen ? <CheckCircle size={24} /> : <Clock size={24} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900">{w.academic_year} - {semesters.find(s => s.sid === w.semester_id)?.name || w.semester_id}</h3>
                      {isOpen ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 border border-emerald-200">Open</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-500 border border-slate-200">Closed</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Calendar size={14} />
                        <span>{new Date(w.start_date).toLocaleDateString()} to {new Date(w.end_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-blue-100" onClick={() => openForm(w)}>
                    <Edit size={18} />
                  </button>
                  <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-red-100" onClick={() => w.id && handleDelete(w.id)}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
          {windows.length === 0 && (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertCircle size={24} className="text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">No assessment windows defined yet.</p>
              <p className="text-xs text-slate-400 mt-1">Lecturers will need to request access for all uploads.</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-lg">{editingWindow ? 'Edit' : 'Create'} Assessment Window</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                <X size={20} />
              </button>
            </div>
            <form className="p-6 space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="label">Academic Year</label>
                  <select 
                    className="input" 
                    required 
                    value={formData.academic_year} 
                    onChange={e => setFormData({...formData, academic_year: e.target.value})}
                  >
                    <option value="">Select Year</option>
                    {academicYears.map(y => <option key={y.code} value={y.code}>{y.code}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="label">Semester</label>
                  <select 
                    className="input" 
                    required 
                    value={formData.semester_id} 
                    onChange={e => setFormData({...formData, semester_id: e.target.value})}
                  >
                    <option value="">Select Semester</option>
                    {semesters.map(s => <option key={s.sid} value={s.sid}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="label">Start Date</label>
                  <input 
                    type="date" 
                    className="input" 
                    required 
                    value={formData.start_date} 
                    onChange={e => setFormData({...formData, start_date: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="label">End Date</label>
                  <input 
                    type="date" 
                    className="input" 
                    required 
                    value={formData.end_date} 
                    onChange={e => setFormData({...formData, end_date: e.target.value})} 
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                <input 
                  type="checkbox" 
                  id="win_active"
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={formData.is_active}
                  onChange={e => setFormData({...formData, is_active: e.target.checked})}
                />
                <label htmlFor="win_active" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Activate this window immediately
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary min-w-[120px]" disabled={submitting}>
                  {submitting ? <Loader2 size={18} className="animate-spin mx-auto" /> : (editingWindow ? 'Update Window' : 'Create Window')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const Edit = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
