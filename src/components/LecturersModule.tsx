import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, UserCog, Building2, Mail, Phone, Filter, Loader2, X } from 'lucide-react';
import { Lecturer } from '../types';
import { api } from '../services/api';
import { BulkUploadModule } from './BulkUploadModule';

interface LecturersModuleProps {
  activeSubItem: string | null;
}

export const LecturersModule: React.FC<LecturersModuleProps> = ({ activeSubItem }) => {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    staff_id: '',
    fullname: '',
    email: '',
    department: '',
    phone: ''
  });

  useEffect(() => {
    fetchLecturers();
  }, []);

  const fetchLecturers = async () => {
    setLoading(true);
    try {
      const data = await api.getLecturers();
      setLecturers(data);
    } catch (error) {
      console.error('Failed to fetch lecturers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createLecturer(formData);
      setFormData({ staff_id: '', fullname: '', email: '', department: '', phone: '' });
      setShowAddModal(false);
      alert('Lecturer added successfully!');
      fetchLecturers();
    } catch (error) {
      console.error('Failed to save lecturer:', error);
      alert('Failed to save lecturer');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLecturers = lecturers.filter(l => 
    l.fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderViewLecturers = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search lecturers..." 
            className="input pl-10"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-primary gap-2" onClick={() => setShowAddModal(true)}>
          <Plus size={18} />
          Add Lecturer
        </button>
      </div>

      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center">
          <Loader2 size={32} className="text-blue-600 animate-spin mb-4" />
          <p className="text-slate-500">Loading lecturers...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLecturers.length > 0 ? filteredLecturers.map((lecturer) => (
            <div key={lecturer.id} className="card hover:border-blue-200 transition-all group">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                  {lecturer.fullname.split(' ').pop()?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 leading-tight">{lecturer.fullname}</h3>
                  <div className="text-xs font-medium text-blue-600 uppercase tracking-wider mt-1">{lecturer.department}</div>
                </div>
              </div>
              <div className="p-6 space-y-3">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <UserCog size={16} className="text-slate-400" />
                  <span>ID: {lecturer.staff_id}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Mail size={16} className="text-slate-400" />
                  <span className="truncate">{lecturer.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Phone size={16} className="text-slate-400" />
                  <span>{lecturer.phone}</span>
                </div>
                <div className="pt-4 flex items-center justify-end border-t border-slate-100">
                  <div className="flex gap-1">
                    <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                      <Edit size={16} />
                    </button>
                    <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-full p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-100">
              No lecturers found.
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-lg">Add New Lecturer</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <form className="p-6 space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="label">Staff ID</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="e.g. LEC001" 
                    required
                    value={formData.staff_id}
                    onChange={e => setFormData({...formData, staff_id: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="label">Full Name</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="e.g. Dr. Samuel Mensah" 
                    required
                    value={formData.fullname}
                    onChange={e => setFormData({...formData, fullname: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="label">Email Address</label>
                  <input 
                    type="email" 
                    className="input" 
                    placeholder="e.g. s.mensah@snsanglican.org" 
                    required
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="label">Phone Number</label>
                  <input 
                    type="tel" 
                    className="input" 
                    placeholder="e.g. 0244123456" 
                    required
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
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
                  <option value="Social Science Education">Social Science Education</option>
                  <option value="Vocational & Technical Education">Vocational & Technical Education</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary gap-2" disabled={submitting}>
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                  {submitting ? 'Adding...' : 'Add Lecturer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  switch (activeSubItem) {
    case 'view_lecturers':
    case null:
      return renderViewLecturers();
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
