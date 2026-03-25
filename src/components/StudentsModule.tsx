import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Edit, Trash2, Filter, Download, Loader2, Key, X, CheckCircle, FileText, FileSpreadsheet, Camera, Printer, Eye, User, Calendar, Mail, Phone, Shield } from 'lucide-react';
import { Student, Program } from '../types';
import { api } from '../services/api';
import { printElement } from '../utils/print';
import { BulkUploadModule } from './BulkUploadModule';
import { TranscriptModal } from './TranscriptModal';
import { useToast } from '../context/ToastContext';

interface StudentsModuleProps {
  activeSubItem: string | null;
}

export const StudentsModule: React.FC<StudentsModuleProps> = ({ activeSubItem }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [existingLogin, setExistingLogin] = useState<any>(null);
  const [loadingLogin, setLoadingLogin] = useState(false);

  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [transcriptData, setTranscriptData] = useState<any>(null);
  const [transcriptTitle, setTranscriptTitle] = useState('');
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  // New Custom hooks and states for Edit / Toast
  const { success, error: toastError } = useToast();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    index_number: '',
    surname: '',
    other_names: '',
    email: '',
    progid: '',
    current_level: 100,
    gender: 'Male',
    dob: '',
    phone: '',
    admission_year: new Date().getFullYear().toString()
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);

  // System-defined passport photo dimensions
  const PHOTO_MAX_WIDTH = 200;
  const PHOTO_MAX_HEIGHT = 250;
  const PHOTO_QUALITY = 0.8;

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Scale to fit within passport photo dimensions
          const ratio = Math.min(PHOTO_MAX_WIDTH / width, PHOTO_MAX_HEIGHT / height);
          if (ratio < 1) {
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', PHOTO_QUALITY);
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toastError('Please select an image file');
      return;
    }
    try {
      const resized = await resizeImage(file);
      setPhotoPreview(resized);
      setPhotoBase64(resized);
    } catch (err) {
      console.error('Failed to process image:', err);
      toastError('Failed to process image');
    }
  };

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
      await api.createStudent({ ...formData, photo: photoBase64 });
      setFormData({
        index_number: '',
        surname: '',
        other_names: '',
        email: '',
        progid: '',
        current_level: 100,
        gender: 'Male',
        dob: '',
        phone: '',
        admission_year: new Date().getFullYear().toString()
      });
      setPhotoPreview(null);
      setPhotoBase64(null);
      success('Student added successfully!');
      fetchData();
    } catch (error: any) {
      console.error('Failed to save student:', error);
      toastError(error.message || 'Failed to save student');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setSubmitting(true);
    try {
      await api.updateStudent(selectedStudent.iid, { ...formData, photo: photoBase64 });
      success('Student updated successfully!');
      setShowEditModal(false);
      fetchData();
    } catch (err: any) {
      toastError(err.message || 'Failed to update student');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (student: Student) => {
    if (!window.confirm(`Are you sure you want to completely delete ${student.full_name}? This action cannot be undone and will delete all associated records.`)) return;
    try {
      await api.deleteStudent(student.iid);
      success('Student deleted successfully!');
      fetchData();
    } catch (err: any) {
      toastError(err.message || 'Failed to delete student');
    }
  };

  const handleManageLogin = async (student: Student) => {
    setSelectedStudent(student);
    setShowLoginModal(true);
    setLoadingLogin(true);
    setLoginData({ username: student.index_number, password: '' });
    try {
      const login = await api.getStudentLogin(student.iid);
      setExistingLogin(login);
      if (login) {
        setLoginData({ username: login.username, password: '' });
      }
    } catch (error) {
      console.error('Failed to fetch student login:', error);
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleSaveLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setSubmitting(true);
    try {
      await api.createStudentLogin(selectedStudent.iid, loginData);
      success('Student login saved successfully!');
      setShowLoginModal(false);
    } catch (error: any) {
      console.error('Failed to save student login:', error);
      toastError(error.message || 'Failed to save student login');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateTranscript = async (student: Student, title: string) => {
    setLoadingTranscript(true);
    setTranscriptTitle(title);
    try {
      const data = await api.getTranscript(student.iid);
      setTranscriptData(data);
      setShowTranscriptModal(true);
    } catch (error: any) {
      console.error('Failed to fetch transcript:', error);
      toastError('Failed to generate ' + title);
    } finally {
      setLoadingTranscript(false);
    }
  };

  const filteredStudents = students.filter(s => 
    (s.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.index_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(searchTerm.toLowerCase())
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
                value={formData.index_number}
                onChange={e => setFormData({...formData, index_number: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="label">Surname</label>
              <input 
                type="text" 
                className="input" 
                placeholder="e.g. Doe" 
                required
                value={formData.surname}
                onChange={e => setFormData({...formData, surname: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="label">Other Names</label>
              <input 
                type="text" 
                className="input" 
                placeholder="e.g. John" 
                required
                value={formData.other_names}
                onChange={e => setFormData({...formData, other_names: e.target.value})}
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
                onChange={e => setFormData({...formData, gender: e.target.value as any})}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="label">Date of Birth</label>
              <input 
                type="date" 
                className="input" 
                required
                value={formData.dob}
                onChange={e => setFormData({...formData, dob: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="label">Phone Number</label>
              <input 
                type="tel" 
                className="input" 
                placeholder="024XXXXXXX" 
                required
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="label">Program</label>
              <select 
                className="input" 
                required
                value={formData.progid}
                onChange={e => setFormData({...formData, progid: e.target.value})}
              >
                <option value="">Select Program</option>
                {programs.map(p => (
                  <option key={p.id} value={p.progid}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="label">Level</label>
              <select 
                className="input"
                value={formData.current_level}
                onChange={e => setFormData({...formData, current_level: parseInt(e.target.value)})}
              >
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="300">300</option>
                <option value="400">400</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="label">Admission Year</label>
              <input 
                type="text" 
                className="input" 
                placeholder="e.g. 2025" 
                value={formData.admission_year}
                onChange={e => setFormData({...formData, admission_year: e.target.value})}
              />
            </div>
          </div>

          {/* Passport Photo Upload */}
          <div className="pt-2">
            <label className="label mb-3">Passport Photo</label>
            <div className="flex items-start gap-6">
              <div className="relative group">
                {photoPreview ? (
                  <div className="relative">
                    <img 
                      src={photoPreview} 
                      alt="Student photo" 
                      className="w-[120px] h-[150px] object-cover rounded-xl border-2 border-slate-200 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => { setPhotoPreview(null); setPhotoBase64(null); }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center justify-center w-[120px] h-[150px] rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 transition-all group">
                    <Camera size={28} className="text-slate-400 group-hover:text-blue-500 mb-2 transition-colors" />
                    <span className="text-[10px] text-slate-500 group-hover:text-blue-600 font-medium text-center px-2">Click to upload photo</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handlePhotoSelect}
                    />
                  </label>
                )}
              </div>
              <div className="text-xs text-slate-400 space-y-1 pt-1">
                <p className="font-medium text-slate-500">Guidelines:</p>
                <p>• Passport-size photo</p>
                <p>• JPG, PNG or WebP format</p>
                <p>• Auto-resized to {PHOTO_MAX_WIDTH}×{PHOTO_MAX_HEIGHT}px</p>
                <p>• Max file size ~50KB after resize</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button type="button" className="btn btn-secondary" onClick={() => {
              setFormData({
                index_number: '', surname: '', other_names: '', email: '', progid: '', current_level: 100, gender: 'Male', dob: '', phone: '', admission_year: new Date().getFullYear().toString()
              });
              setPhotoPreview(null);
              setPhotoBase64(null);
            }}>Clear Form</button>
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, ID or email..." 
            className="input pl-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar pb-1 lg:pb-0">
          <button className="btn btn-secondary gap-2 whitespace-nowrap flex-1 lg:flex-none">
            <Filter size={18} />
            Filter
          </button>
          <button 
            className="btn btn-secondary gap-2 whitespace-nowrap flex-1 lg:flex-none"
            onClick={() => printElement('print-students', 'Student Directory')}
          >
            <Printer size={18} />
            Print List
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
          <div className="overflow-x-auto" id="print-students">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Student Details</th>
                  <th className="px-6 py-4 font-semibold hidden md:table-cell">Program</th>
                  <th className="px-6 py-4 font-semibold hidden sm:table-cell">Level</th>
                  <th className="px-6 py-4 font-semibold hidden lg:table-cell">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {student.photo ? (
                          <img src={student.photo} alt="" className="w-9 h-9 rounded-lg object-cover border border-slate-200 flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                            {(student.surname || '?').charAt(0)}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900">{student.full_name}</span>
                          <span className="text-xs font-mono text-slate-500">{student.index_number}</span>
                          <span className="text-[10px] text-slate-400 sm:hidden">{student.progid} • L{student.current_level}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 hidden md:table-cell">
                      {programs.find(p => p.progid === student.progid)?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 hidden sm:table-cell">{student.current_level}</td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        student.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 flex-wrap max-w-[300px] ml-auto">
                        <button 
                          onClick={() => { setSelectedStudent(student); setShowViewModal(true); }}
                          className="flex items-center gap-1.5 px-2 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="View Full Profile"
                        >
                          <Eye size={14} />
                          <span className="text-[10px] font-bold uppercase">View</span>
                        </button>
                        <button 
                          onClick={() => handleGenerateTranscript(student, 'Statement of Results')}
                          className="flex items-center gap-1.5 px-2 py-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                          title="Statement of Results"
                          disabled={loadingTranscript}
                        >
                          <FileText size={14} />
                          <span className="text-[10px] font-bold uppercase">SOR</span>
                        </button>
                        <button 
                          onClick={() => handleGenerateTranscript(student, 'Transcript')}
                          className="flex items-center gap-1.5 px-2 py-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Full Transcript"
                          disabled={loadingTranscript}
                        >
                          <FileSpreadsheet size={14} />
                          <span className="text-[10px] font-bold uppercase">Trans.</span>
                        </button>
                        <button 
                          onClick={() => handleManageLogin(student)}
                          className="flex items-center gap-1.5 px-2 py-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Manage Login"
                        >
                          <Key size={14} />
                          <span className="text-[10px] font-bold uppercase">Login</span>
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedStudent(student);
                            setFormData({
                              index_number: student.index_number,
                              surname: student.surname,
                              other_names: student.other_names,
                              email: student.email || '',
                              progid: student.progid || '',
                              current_level: student.current_level || 100,
                              gender: student.gender || 'Male',
                              dob: student.dob || '',
                              phone: student.phone || '',
                              admission_year: student.admission_year || ''
                            });
                            setPhotoPreview(student.photo || null);
                            setPhotoBase64(student.photo || null);
                            setShowEditModal(true);
                          }}
                          className="flex items-center gap-1.5 px-2 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                          title="Edit Profile"
                        >
                          <Edit size={14} />
                          <span className="text-[10px] font-bold uppercase">Edit</span>
                        </button>
                        <button 
                          onClick={() => handleDelete(student)}
                          className="flex items-center gap-1.5 px-2 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete Student"
                        >
                          <Trash2 size={14} />
                          <span className="text-[10px] font-bold uppercase">Del</span>
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
      
      {showLoginModal && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900">Manage Student Login</h3>
                <p className="text-xs text-slate-500">{selectedStudent.full_name} ({selectedStudent.index_number})</p>
              </div>
              <button 
                onClick={() => setShowLoginModal(false)}
                className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveLogin} className="p-6 space-y-4">
              {loadingLogin ? (
                <div className="py-8 flex flex-col items-center justify-center">
                  <Loader2 size={24} className="text-blue-600 animate-spin mb-2" />
                  <p className="text-sm text-slate-500">Fetching login details...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="label">Username (Index Number)</label>
                    <input 
                      type="text" 
                      className="input bg-slate-100 text-slate-500 cursor-not-allowed" 
                      value={selectedStudent?.index_number || ''}
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="label">Password</label>
                    <input 
                      type="password" 
                      className="input" 
                      placeholder={existingLogin ? "Leave blank to keep current" : "Enter new password"}
                      value={loginData.password}
                      onChange={e => setLoginData({...loginData, password: e.target.value})}
                      required={!existingLogin}
                    />
                  </div>
                  
                  {existingLogin && (
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center gap-2">
                      <CheckCircle size={16} className="text-emerald-600" />
                      <p className="text-xs text-emerald-700">
                        Login account exists. Created on {new Date(existingLogin.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  
                  <div className="pt-4 flex gap-3">
                    <button 
                      type="button" 
                      className="btn btn-secondary flex-1"
                      onClick={() => setShowLoginModal(false)}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary flex-1 gap-2"
                      disabled={submitting}
                    >
                      {submitting ? <Loader2 size={18} className="animate-spin" /> : <Key size={18} />}
                      {submitting ? 'Saving...' : 'Save Login'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {showEditModal && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-bold text-slate-900">Edit Student Biodata</h3>
                <p className="text-xs text-slate-500">Update information for {selectedStudent.full_name}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form className="p-6 space-y-8" onSubmit={handleEditSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="label">Index Number</label>
                  <input type="text" className="input" required value={formData.index_number} onChange={e => setFormData({...formData, index_number: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="label">Surname</label>
                  <input type="text" className="input" required value={formData.surname} onChange={e => setFormData({...formData, surname: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="label">Other Names</label>
                  <input type="text" className="input" required value={formData.other_names} onChange={e => setFormData({...formData, other_names: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="label">Email Address</label>
                  <input type="email" className="input" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="label">Gender</label>
                  <select className="input" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as any})}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="label">Date of Birth</label>
                  <input type="date" className="input" required value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="label">Phone Number</label>
                  <input type="tel" className="input" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="label">Program</label>
                  <select className="input" required value={formData.progid} onChange={e => setFormData({...formData, progid: e.target.value})}>
                    <option value="">Select Program</option>
                    {programs.map(p => <option key={p.id} value={p.progid}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="label">Level</label>
                  <select className="input" value={formData.current_level} onChange={e => setFormData({...formData, current_level: parseInt(e.target.value)})}>
                    <option value="100">100</option>
                    <option value="200">200</option>
                    <option value="300">300</option>
                    <option value="400">400</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="label">Admission Year</label>
                  <input type="text" className="input" value={formData.admission_year} onChange={e => setFormData({...formData, admission_year: e.target.value})} />
                </div>
              </div>
              <div className="pt-2">
                <label className="label mb-3">Passport Photo</label>
                <div className="flex justify-start gap-4">
                  {photoPreview ? (
                    <div className="relative">
                      <img src={photoPreview} alt="Student photo" className="w-[120px] h-[150px] object-cover rounded-xl border" />
                      <button type="button" onClick={() => { setPhotoPreview(null); setPhotoBase64(null); }} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <input type="file" accept="image/*" onChange={handlePhotoSelect} />
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary gap-2" disabled={submitting}>
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <Edit size={18} />}
                  {submitting ? 'Saving...' : 'Update Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewModal && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white relative">
              <button 
                onClick={() => setShowViewModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative group">
                  {selectedStudent.photo ? (
                    <img 
                      src={selectedStudent.photo} 
                      alt={selectedStudent.full_name} 
                      className="w-32 h-40 object-cover rounded-2xl border-4 border-white/30 shadow-2xl"
                    />
                  ) : (
                    <div className="w-32 h-40 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border-4 border-white/20">
                      <User size={64} className="text-white/40" />
                    </div>
                  )}
                  <div className={`absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg ${
                    selectedStudent.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'
                  }`}>
                    {selectedStudent.status}
                  </div>
                </div>
                
                <div className="text-center md:text-left space-y-2">
                  <h2 className="text-3xl font-black tracking-tight">{selectedStudent.full_name}</h2>
                  <div className="flex flex-wrap justify-center md:justify-start gap-3">
                    <span className="px-3 py-1 bg-white/20 rounded-lg text-xs font-bold border border-white/10 uppercase">{selectedStudent.index_number}</span>
                    <span className="px-3 py-1 bg-white/20 rounded-lg text-xs font-bold border border-white/10 uppercase">Level {selectedStudent.current_level}</span>
                  </div>
                  <p className="text-blue-100 font-medium">{programs.find(p => p.progid === selectedStudent.progid)?.name || selectedStudent.progid}</p>
                </div>
              </div>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white">
              <div className="space-y-6">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <User size={14} className="text-blue-500" />
                  Personal Information
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      <User size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gender</p>
                      <p className="font-bold text-slate-700">{selectedStudent.gender || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Date of Birth</p>
                      <p className="font-bold text-slate-700">{selectedStudent.dob ? new Date(selectedStudent.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Phone size={14} className="text-blue-500" />
                  Contact Details
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      <Mail size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email Address</p>
                      <p className="font-bold text-slate-700 truncate max-w-[180px]">{selectedStudent.email || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      <Phone size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Phone Number</p>
                      <p className="font-bold text-slate-700">{selectedStudent.phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="md:col-span-2 pt-4 flex gap-3">
                <button 
                  onClick={() => setShowViewModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all uppercase text-xs tracking-widest"
                >
                  Close Profile
                </button>
                <button 
                  onClick={() => {
                    setShowViewModal(false);
                    // Open Edit Modal logic (same as in table)
                    setFormData({
                      index_number: selectedStudent.index_number,
                      surname: selectedStudent.surname,
                      other_names: selectedStudent.other_names,
                      email: selectedStudent.email || '',
                      progid: selectedStudent.progid || '',
                      current_level: selectedStudent.current_level || 100,
                      gender: selectedStudent.gender || 'Male',
                      dob: selectedStudent.dob || '',
                      phone: selectedStudent.phone || '',
                      admission_year: selectedStudent.admission_year || ''
                    });
                    setPhotoPreview(selectedStudent.photo || null);
                    setPhotoBase64(selectedStudent.photo || null);
                    setShowEditModal(true);
                  }}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2"
                >
                  <Edit size={16} />
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <TranscriptModal 
        isOpen={showTranscriptModal}
        onClose={() => setShowTranscriptModal(false)}
        data={transcriptData}
        title={transcriptTitle}
      />
    </div>
  );

  const [resetSearch, setResetSearch] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const filteredResetStudents = students.filter(s =>
    (s.full_name || '').toLowerCase().includes(resetSearch.toLowerCase()) ||
    (s.index_number || '').toLowerCase().includes(resetSearch.toLowerCase())
  );

  const handleResetPassword = async (student: Student) => {
    if (!resetPassword) return toastError('Please enter a new password');
    setResetLoading(true);
    try {
      await api.resetStudentPassword(student.iid, resetPassword);
      success(`Password reset for ${student.full_name}!`);
      setResetPassword('');
    } catch (e: any) {
      toastError(e.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  const renderResetPassword = () => (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-1">Reset Student Password</h2>
        <p className="text-slate-500 text-sm mb-4">Search for a student and reset their portal login password.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="label">Search Student</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" className="input pl-10" placeholder="Name or index number..." value={resetSearch} onChange={e => setResetSearch(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="label">New Password</label>
            <input type="password" className="input" placeholder="Enter new password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <th className="px-6 py-3 font-semibold">Student</th>
            <th className="px-6 py-3 font-semibold hidden sm:table-cell">Program</th>
            <th className="px-6 py-3 font-semibold text-right">Action</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {filteredResetStudents.length > 0 ? filteredResetStudents.slice(0, 20).map(s => (
              <tr key={s.iid} className="hover:bg-slate-50/50">
                <td className="px-6 py-3">
                  <div className="text-sm font-bold">{s.full_name}</div>
                  <div className="text-xs text-slate-500 font-mono">{s.index_number}</div>
                </td>
                <td className="px-6 py-3 text-sm hidden sm:table-cell">{s.program_name || s.progid || 'N/A'}</td>
                <td className="px-6 py-3 text-right">
                  <button onClick={() => handleResetPassword(s)} disabled={!resetPassword || resetLoading} className="btn btn-primary text-xs py-1 px-3 disabled:opacity-50">
                    {resetLoading ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                    <span className="ml-1">Reset</span>
                  </button>
                </td>
              </tr>
            )) : <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">{resetSearch ? 'No students found.' : 'Type to search students.'}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  switch (activeSubItem) {
    case 'add_student':
      return renderAddStudent();
    case 'update_student':
    case 'view_students':
    case null:
      return renderViewStudents();
    case 'reset_password':
      return renderResetPassword();
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
