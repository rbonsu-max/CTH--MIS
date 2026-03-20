import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Edit, Trash2, Filter, Download, Loader2, Key, X, CheckCircle, FileText, FileSpreadsheet } from 'lucide-react';
import { Student, Program } from '../types';
import { api } from '../services/api';
import { BulkUploadModule } from './BulkUploadModule';
import { TranscriptModal } from './TranscriptModal';

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
      alert('Student added successfully!');
      fetchData();
    } catch (error) {
      console.error('Failed to save student:', error);
      alert('Failed to save student');
    } finally {
      setSubmitting(false);
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
      alert('Student login saved successfully!');
      setShowLoginModal(false);
    } catch (error) {
      console.error('Failed to save student login:', error);
      alert('Failed to save student login');
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
    } catch (error) {
      console.error('Failed to fetch transcript:', error);
      alert('Failed to generate ' + title);
    } finally {
      setLoadingTranscript(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.index_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button type="button" className="btn btn-secondary" onClick={() => setFormData({
              index_number: '', surname: '', other_names: '', email: '', progid: '', current_level: 100, gender: 'Male', dob: '', phone: '', admission_year: new Date().getFullYear().toString()
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
          <button className="btn btn-secondary gap-2 whitespace-nowrap flex-1 lg:flex-none">
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
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{student.full_name}</span>
                        <span className="text-xs font-mono text-slate-500">{student.index_number}</span>
                        <span className="text-[10px] text-slate-400 sm:hidden">{student.progid} • L{student.current_level}</span>
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
                      <div className="flex justify-end gap-1 md:gap-2">
                        <button 
                          onClick={() => handleGenerateTranscript(student, 'Statement of Results')}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                          title="Statement of Results"
                          disabled={loadingTranscript}
                        >
                          <FileText size={16} />
                        </button>
                        <button 
                          onClick={() => handleGenerateTranscript(student, 'Transcript')}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Full Transcript"
                          disabled={loadingTranscript}
                        >
                          <FileSpreadsheet size={16} />
                        </button>
                        <button 
                          onClick={() => handleManageLogin(student)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Manage Login"
                        >
                          <Key size={16} />
                        </button>
                        <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all hidden sm:block">
                          <Edit size={16} />
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
                    <label className="label">Username</label>
                    <input 
                      type="text" 
                      className="input" 
                      value={loginData.username}
                      onChange={e => setLoginData({...loginData, username: e.target.value})}
                      required
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

      <TranscriptModal 
        isOpen={showTranscriptModal}
        onClose={() => setShowTranscriptModal(false)}
        data={transcriptData}
        title={transcriptTitle}
      />
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
