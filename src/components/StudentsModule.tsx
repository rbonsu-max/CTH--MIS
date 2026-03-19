import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Edit, Trash2, Filter, Download, Loader2 } from 'lucide-react';
import { Student, Program } from '../types';
import { api } from '../services/api';
import { BulkUploadModule } from './BulkUploadModule';

interface StudentsModuleProps {
  activeSubItem: string | null;
}

export const StudentsModule: React.FC<StudentsModuleProps> = ({ activeSubItem }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    indexNumber: '',
    name: '',
    email: '',
    programId: '',
    level: '100',
    gender: 'Male',
    dateOfBirth: '',
    phoneNumber: '',
    address: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [studentsData, programsData] = await Promise.all([
        api.getStudents(),
        api.getPrograms()
      ]);
      setStudents(studentsData);
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
      await api.createStudent(formData);
      setFormData({
        indexNumber: '',
        name: '',
        email: '',
        programId: '',
        level: '100',
        gender: 'Male',
        dateOfBirth: '',
        phoneNumber: '',
        address: ''
      });
      alert('Student added successfully!');
      fetchData();
    } catch (error) {
      console.error('Failed to save student:', error);
      alert('Failed to save student');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.indexNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderAddStudent = () => (
    <div className="space-y-6">
      <div className="card">
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-bold text-lg">Add New Student Biodata</h2>
          <p className="text-slate-500 text-sm">Enter the student's personal and academic information.</p>
        </div>
        <form className="p-6 space-y-8" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="label">Index Number</label>
              <input 
                type="text" 
                className="input" 
                placeholder="e.g. SIMS/2025/001" 
                required
                value={formData.indexNumber}
                onChange={e => setFormData({...formData, indexNumber: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="label">Full Name</label>
              <input 
                type="text" 
                className="input" 
                placeholder="e.g. John Doe" 
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="label">Email Address</label>
              <input 
                type="email" 
                className="input" 
                placeholder="name@example.com" 
                required
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="label">Gender</label>
              <select 
                className="input"
                value={formData.gender}
                onChange={e => setFormData({...formData, gender: e.target.value})}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="label">Date of Birth</label>
              <input 
                type="date" 
                className="input" 
                required
                value={formData.dateOfBirth}
                onChange={e => setFormData({...formData, dateOfBirth: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="label">Phone Number</label>
              <input 
                type="tel" 
                className="input" 
                placeholder="024XXXXXXX" 
                required
                value={formData.phoneNumber}
                onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
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
              <label className="label">Address</label>
              <input 
                type="text" 
                className="input" 
                placeholder="Residential Address" 
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button type="button" className="btn btn-secondary" onClick={() => setFormData({
              indexNumber: '', name: '', email: '', programId: '', level: '100', gender: 'Male', dateOfBirth: '', phoneNumber: '', address: ''
            })}>Clear Form</button>
            <button type="submit" className="btn btn-primary gap-2" disabled={submitting}>
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
              {submitting ? 'Saving...' : 'Save Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderViewStudents = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, ID or email..." 
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
          <button className="btn btn-secondary gap-2">
            <Download size={18} />
            Export PDF
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <Loader2 size={32} className="text-blue-600 animate-spin mb-4" />
            <p className="text-slate-500">Loading students...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Index Number</th>
                  <th className="px-6 py-4 font-semibold">Full Name</th>
                  <th className="px-6 py-4 font-semibold">Program</th>
                  <th className="px-6 py-4 font-semibold">Level</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-slate-600">{student.indexNumber}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">{student.name}</div>
                      <div className="text-xs text-slate-400">{student.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {programs.find(p => p.id === student.programId)?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{student.level}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        student.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {student.status}
                      </span>
                    </td>
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
                      No students found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <p className="text-xs text-slate-500">Showing {filteredStudents.length} of {students.length} students</p>
          <div className="flex gap-2">
            <button className="btn btn-secondary py-1 px-3 text-xs disabled:opacity-50" disabled>Previous</button>
            <button className="btn btn-secondary py-1 px-3 text-xs disabled:opacity-50" disabled>Next</button>
          </div>
        </div>
      </div>
    </div>
  );

  switch (activeSubItem) {
    case 'add_student':
      return renderAddStudent();
    case 'view_students':
    case null:
      return renderViewStudents();
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
