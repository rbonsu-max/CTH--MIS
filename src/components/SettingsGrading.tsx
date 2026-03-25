import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Loader2, X, GraduationCap } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export const SettingsGrading: React.FC = () => {
  const [points, setPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPoint, setEditingPoint] = useState<any | null>(null);
  const [formData, setFormData] = useState({ grade: '', min_score: 0, max_score: 0, gp: 0, remarks: '' });
  const { success, error: toastError } = useToast();

  useEffect(() => {
    fetchPoints();
  }, []);

  const fetchPoints = async () => {
    try {
      setLoading(true);
      const data = await api.getGradingPoints();
      setPoints(data);
    } catch (e: any) {
      toastError('Failed to load grading scale');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingPoint && editingPoint.id) {
        await api.updateGradingPoint(editingPoint.id, formData);
        success('Grading point updated');
      } else {
        await api.createGradingPoint(formData);
        success('Grading point created');
      }
      setShowModal(false);
      fetchPoints();
    } catch (e: any) {
      toastError(e.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this grading point?')) return;
    try {
      await api.deleteGradingPoint(id);
      success('Grading point deleted');
      fetchPoints();
    } catch (e: any) {
      toastError(e.message || 'Delete failed');
    }
  };

  const openForm = (point?: any) => {
    if (point) {
      setEditingPoint(point);
      setFormData({ grade: point.grade, min_score: point.min_score, max_score: point.max_score, gp: point.gp, remarks: point.remarks });
    } else {
      setEditingPoint(null);
      setFormData({ grade: '', min_score: 0, max_score: 100, gp: 0, remarks: '' });
    }
    setShowModal(true);
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="card">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-lg">Grading Scale</h2>
            <p className="text-slate-500 text-sm">Define dynamic score ranges, grades, and grade points.</p>
          </div>
          <button className="btn btn-primary gap-2" onClick={() => openForm()}>
            <Plus size={18} /> Add Grade
          </button>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-3">Grade</th>
                  <th className="px-6 py-3">Score Range</th>
                  <th className="px-6 py-3">Grade Point</th>
                  <th className="px-6 py-3">Remarks</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {points.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-blue-700">{p.grade}</td>
                    <td className="px-6 py-4 font-mono text-sm">{p.min_score} - {p.max_score}</td>
                    <td className="px-6 py-4 font-bold">{p.gp.toFixed(1)}</td>
                    <td className="px-6 py-4 text-slate-500 text-sm">{p.remarks}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg" onClick={() => openForm(p)}><Edit size={16} /></button>
                        <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg" onClick={() => handleDelete(p.id)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-lg">{editingPoint ? 'Edit' : 'Add'} Grading Point</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><X size={20} /></button>
            </div>
            <form className="p-6 space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <label className="label">Grade Letter</label>
                  <input type="text" className="input uppercase" required value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value.toUpperCase()})} placeholder="e.g. A" />
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <label className="label">Grade Point (GP)</label>
                  <input type="number" step="0.1" className="input" required value={formData.gp} onChange={e => setFormData({...formData, gp: parseFloat(e.target.value)})} placeholder="e.g. 4.0" />
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <label className="label">Min Score</label>
                  <input type="number" step="0.01" className="input" required value={formData.min_score} onChange={e => setFormData({...formData, min_score: parseFloat(e.target.value)})} placeholder="e.g. 80" />
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <label className="label">Max Score</label>
                  <input type="number" step="0.01" className="input" required value={formData.max_score} onChange={e => setFormData({...formData, max_score: parseFloat(e.target.value)})} placeholder="e.g. 100" />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="label">Remarks</label>
                  <input type="text" className="input" required value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} placeholder="e.g. Excellent" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : 'Save Grade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
