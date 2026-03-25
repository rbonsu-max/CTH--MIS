import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Loader2, X, Building } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Department } from '../types';

export const SettingsDepartments: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '' });
  const { success, error: toastError } = useToast();

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const data = await api.getDepartments();
      setDepartments(data);
    } catch (e: any) {
      toastError('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingDept && editingDept.id) {
        await api.updateDepartment(editingDept.id, formData);
        success('Department updated');
      } else {
        await api.createDepartment(formData);
        success('Department created');
      }
      setShowModal(false);
      fetchDepartments();
    } catch (e: any) {
      toastError(e.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this department? This might affect existing programs.')) return;
    try {
      await api.deleteDepartment(id);
      success('Department deleted');
      fetchDepartments();
    } catch (e: any) {
      toastError(e.message || 'Delete failed');
    }
  };

  const openForm = (dept?: Department) => {
    if (dept) {
      setEditingDept(dept);
      setFormData({ code: dept.code, name: dept.name });
    } else {
      setEditingDept(null);
      setFormData({ code: '', name: '' });
    }
    setShowModal(true);
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="card">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-lg">Departments</h2>
            <p className="text-slate-500 text-sm">Manage institutional departments.</p>
          </div>
          <button className="btn btn-primary gap-2" onClick={() => openForm()}>
            <Plus size={18} /> New Department
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {departments.map((d) => (
            <div key={d.id} className="border border-slate-200 p-4 rounded-xl flex justify-between items-center bg-white hover:border-blue-200 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 text-slate-500 rounded-lg"><Building size={20} /></div>
                <div>
                  <h3 className="font-bold text-slate-900">{d.name}</h3>
                  <p className="text-xs font-mono text-slate-500">{d.code}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button className="p-2 text-slate-400 hover:text-blue-600 rounded" onClick={() => openForm(d)}><Edit size={16} /></button>
                <button className="p-2 text-slate-400 hover:text-red-600 rounded" onClick={() => d.id && handleDelete(d.id)}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
          {departments.length === 0 && <div className="col-span-full p-8 text-center text-slate-500">No departments added yet.</div>}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-lg">{editingDept ? 'Edit' : 'Add'} Department</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><X size={20} /></button>
            </div>
            <form className="p-6 space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="label">Department Code</label>
                <input type="text" className="input" required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="e.g. CS" />
              </div>
              <div className="space-y-2">
                <label className="label">Department Name</label>
                <input type="text" className="input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Computer Science" />
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : 'Save Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
