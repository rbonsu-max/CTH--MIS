import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Settings, Calendar, Clock, UserCog, CheckCircle, Loader2, X, Upload, Lock, Printer } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { AcademicYear, Semester, User, CalendarEvent } from '../types';
import { api } from '../services/api';
import { BulkUploadModule } from './BulkUploadModule';
import { SettingsDepartments } from './SettingsDepartments';
import { SettingsGrading } from './SettingsGrading';
import { SettingsSystem } from './SettingsSystem';
import { SettingsAssessmentControl } from './SettingsAssessmentControl';
import { SettingsAccessRequests } from './SettingsAccessRequests';
import { AccountSettingsPanel } from './AccountSettingsPanel';
import { MyAccessRequestsPanel } from './MyAccessRequestsPanel';
import { printElement } from '../utils/print';

interface SettingsModuleProps {
  activeSubItem: string | null;
  user: User;
}

export const SettingsModule: React.FC<SettingsModuleProps> = ({ activeSubItem, user }) => {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddYearModal, setShowAddYearModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newYear, setNewYear] = useState('');
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [userSearchInput, setUserSearchInput] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userSearchVersion, setUserSearchVersion] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const userPageSize = 8;
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [newUser, setNewUser] = useState({ fullname: '', username: '', email: '', password: '', role: 'Administrator' });
  const [newEvent, setNewEvent] = useState({ date: '', event: '' });
  const [changingPasswordUser, setChangingPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const { success, error: toastError } = useToast();
  const adminSections = new Set([
    'academic_year',
    'semesters',
    'academic_calendar',
    'user_management',
    'departments',
    'grading_points',
    'system_settings',
    'assessment_control',
    'access_requests',
    'bulk_upload'
  ]);
  const shouldLoadAdminData = (user.role === 'SuperAdmin' || user.role === 'Administrator')
    && (!activeSubItem || adminSections.has(activeSubItem));

  useEffect(() => {
    if (shouldLoadAdminData) {
      fetchData();
    }
  }, [shouldLoadAdminData, userSearch, userPage, userSearchVersion]);

  const fetchData = async (options?: { searchTerm?: string; page?: number }) => {
    setLoading(true);
    try {
      const [years, sems, userResponse, events] = await Promise.all([
        api.getAcademicYears(),
        api.getSemesters(),
        api.getUsers({ q: options?.searchTerm ?? userSearch, page: options?.page ?? userPage, pageSize: userPageSize }),
        api.getCalendarEvents()
      ]);
      const normalizedUsers = userResponse.data || [];
      const normalizedTotal = userResponse.total || 0;
      const normalizedTotalPages = userResponse.totalPages || 1;
      setAcademicYears(years);
      setSemesters(sems);
      setUsers(normalizedUsers);
      setUserTotal(normalizedTotal);
      setUserTotalPages(normalizedTotalPages);
      setCalendarEvents(events);
      return {
        users: normalizedUsers,
        total: normalizedTotal,
        totalPages: normalizedTotalPages,
      };
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleUserSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedSearch = userSearchInput.trim();
    const nextPage = 1;

    if (!trimmedSearch) {
      setUserPage(nextPage);
      setUserSearch('');
      setUserSearchVersion(prev => prev + 1);
      return;
    }

    const result = await fetchData({ searchTerm: trimmedSearch, page: nextPage });
    setUserPage(nextPage);
    setUserSearch(trimmedSearch);
    setUserSearchVersion(prev => prev + 1);

    if (result && result.total === 0) {
      toastError('User not found.');
    }
  };

  const handleAddYear = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingYear) {
        await api.updateAcademicYear(editingYear.code, { code: newYear });
        success('Academic year updated successfully!');
      } else {
        await api.createAcademicYear({ code: newYear, is_current: academicYears.length === 0 });
        success('Academic year added successfully!');
      }
      setNewYear('');
      setShowAddYearModal(false);
      setEditingYear(null);
      fetchData();
    } catch (error) {
      console.error('Failed to save academic year:', error);
      toastError('Failed to save academic year');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteYear = async (code: string) => {
    if (!window.confirm('Are you sure you want to delete this academic year?')) return;
    try {
      await api.deleteAcademicYear(code);
      success('Academic year deleted!');
      fetchData();
    } catch (error) {
      console.error('Failed to delete academic year:', error);
      toastError('Failed to delete academic year');
    }
  };

  const handleEditSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSemester) return;
    setSubmitting(true);
    try {
      await api.updateSemester(editingSemester.sid, { name: editingSemester.name });
      success('Semester updated successfully!');
      setEditingSemester(null);
      fetchData();
    } catch (error) {
      console.error('Failed to update semester:', error);
      toastError('Failed to update semester');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetCurrentYear = async (code: string) => {
    try {
      await api.setCurrentAcademicYear(code);
      success('Current academic year updated!');
      fetchData();
    } catch (error) {
      console.error('Failed to update current year:', error);
      toastError('Failed to update current year');
    }
  };

  const handleSetCurrentSemester = async (sid: string) => {
    try {
      await api.setCurrentSemester(sid);
      success('Current semester updated!');
      fetchData();
    } catch (error) {
      console.error('Failed to update current semester:', error);
      toastError('Failed to update current semester');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createUser(newUser);
      success('User created successfully!');
      setNewUser({ fullname: '', username: '', email: '', password: '', role: 'Administrator' });
      setShowAddUserModal(false);
      fetchData();
    } catch (error) {
      console.error('Failed to create user:', error);
      toastError('Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changingPasswordUser) return;
    setSubmitting(true);
    try {
      await api.updateUserPassword(changingPasswordUser.uid, newPassword);
      success('Password updated successfully!');
      setNewPassword('');
      setChangingPasswordUser(null);
    } catch (error) {
      console.error('Failed to update password:', error);
      toastError('Failed to update password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.deleteUser(uid);
      success('User deleted!');
      fetchData();
    } catch (error) {
      console.error('Failed to delete user:', error);
      toastError('Failed to delete user');
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
          <button className="btn btn-primary gap-2" onClick={() => { setEditingYear(null); setNewYear(''); setShowAddYearModal(true); }}>
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
            <div key={item.code} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
              item.is_current ? 'border-blue-200 bg-blue-50/50' : 'border-slate-100 bg-white'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${item.is_current ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Calendar size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{item.code} Academic Year</div>
                  <div className="text-xs text-slate-400">{item.is_current ? 'Active' : 'Archived'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {item.is_current ? (
                  <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-600 text-white">Current</span>
                ) : (
                  <button 
                    className="text-blue-600 text-xs font-bold hover:underline"
                    onClick={() => handleSetCurrentYear(item.code)}
                  >
                    Set as Current
                  </button>
                )}
                <div className="flex gap-1">
                  <button 
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                    onClick={() => { setEditingYear(item); setNewYear(item.code); setShowAddYearModal(true); }}
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all"
                    onClick={() => handleDeleteYear(item.code)}
                  >
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
              <h2 className="font-bold text-lg">{editingYear ? 'Edit' : 'Add'} Academic Year</h2>
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
                  {submitting ? (editingYear ? 'Saving...' : 'Adding...') : (editingYear ? 'Save Changes' : 'Add Year')}
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
            <div key={sem.sid} className={`p-6 rounded-2xl border transition-all ${
              sem.is_current ? 'border-blue-200 bg-blue-50/50' : 'border-slate-100 bg-white'
            }`}>
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${sem.is_current ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Clock size={24} />
                </div>
                {sem.is_current && (
                  <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-600 text-white">Active</span>
                )}
              </div>
              <h3 className="font-bold text-lg text-slate-900">{sem.name}</h3>
              <p className="text-sm text-slate-500 mt-1">Current Academic Year</p>
              <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                <button 
                  className={`text-sm font-bold ${sem.is_current ? 'text-slate-400 cursor-not-allowed' : 'text-blue-600 hover:underline'}`} 
                  disabled={sem.is_current}
                  onClick={() => handleSetCurrentSemester(sem.sid)}
                >
                  {sem.is_current ? 'Currently Active' : 'Activate Semester'}
                </button>
                <div className="flex gap-1">
                  <button 
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                    onClick={() => setEditingSemester(sem)}
                  >
                    <Edit size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingSemester && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-lg">Edit Semester</h2>
              <button onClick={() => setEditingSemester(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <form className="p-6 space-y-4" onSubmit={handleEditSemester}>
              <div className="space-y-2">
                <label className="label">Semester Name</label>
                <input 
                  type="text" 
                  className="input" 
                  required
                  value={editingSemester.name}
                  onChange={e => setEditingSemester({ ...editingSemester, name: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingSemester(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary gap-2" disabled={submitting}>
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <Edit size={18} />}
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const renderUserManagement = () => (
    <div className="space-y-6">
      <div className="card">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-lg">User Management</h2>
            <p className="text-slate-500 text-sm">Manage system administrators and lecturers.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button className="btn btn-secondary gap-2 flex-1 sm:flex-none justify-center" onClick={() => printElement('print-users', 'System Users')}>
              <Printer size={18} />
              Print List
            </button>
            <button className="btn btn-primary gap-2 flex-1 sm:flex-none justify-center" onClick={() => setShowAddUserModal(true)}>
              <Plus size={18} />
              New User
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <form
              className="flex flex-col sm:flex-row gap-3 w-full lg:max-w-2xl"
              onSubmit={handleUserSearch}
            >
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  className="input pl-10"
                  placeholder="Search by full name, email, or username"
                  value={userSearchInput}
                  onChange={e => setUserSearchInput(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary gap-2 justify-center">
                <Search size={16} />
                Search
              </button>
              {(userSearch || userSearchInput) && (
                <button
                  type="button"
                  className="btn btn-secondary justify-center"
                  onClick={() => {
                    setUserSearchInput('');
                    setUserSearch('');
                    setUserPage(1);
                    setUserSearchVersion(prev => prev + 1);
                  }}
                >
                  Clear
                </button>
              )}
            </form>

            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="font-semibold text-slate-700">{userTotal}</span>
              <span>user{userTotal === 1 ? '' : 's'} found</span>
            </div>
          </div>
          <div className="overflow-x-auto" id="print-users">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-3 font-semibold">User</th>
                  <th className="px-6 py-3 font-semibold hidden md:table-cell">Role</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullname || u.username)}&background=random`} 
                          alt="" 
                          className="w-8 h-8 rounded-lg flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 truncate">{u.fullname}</div>
                          <div className="text-xs text-slate-400 truncate">{u.username}</div>
                          {u.email && <div className="text-xs text-slate-400 truncate">{u.email}</div>}
                          <div className="md:hidden mt-1">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              u.role === 'SuperAdmin' ? 'bg-purple-100 text-purple-700' :
                              u.role === 'Administrator' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {u.role}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        u.role === 'SuperAdmin' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'Administrator' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                          title="Change Password"
                          onClick={() => setChangingPasswordUser(u)}
                        >
                          <Lock size={16} />
                        </button>
                        <button 
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all"
                          title="Delete User"
                          onClick={() => handleDeleteUser(u.uid)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-16 text-center text-slate-400">
                      No users matched your current search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-sm text-slate-500">
              Page <span className="font-semibold text-slate-700">{userTotal === 0 ? 0 : userPage}</span> of <span className="font-semibold text-slate-700">{userTotal === 0 ? 0 : userTotalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-secondary"
                disabled={userPage <= 1 || userTotal === 0}
                onClick={() => setUserPage(prev => Math.max(1, prev - 1))}
              >
                Previous
              </button>
              <button
                className="btn btn-secondary"
                disabled={userPage >= userTotalPages || userTotal === 0}
                onClick={() => setUserPage(prev => Math.min(userTotalPages, prev + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-lg">Add New User</h2>
              <button onClick={() => setShowAddUserModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <form className="p-6 space-y-4" onSubmit={handleAddUser}>
              <div className="space-y-2">
                <label className="label">Full Name</label>
                <input 
                  type="text" 
                  className="input" 
                  required
                  value={newUser.fullname}
                  onChange={e => setNewUser({ ...newUser, fullname: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="label">Username</label>
                <input 
                  type="text" 
                  className="input" 
                  required
                  value={newUser.username}
                  onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="label">Email</label>
                <input 
                  type="email" 
                  className="input"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="label">Password</label>
                <input 
                  type="password" 
                  className="input" 
                  required
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="label">Role</label>
                <select 
                  className="input"
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="Administrator">Administrator</option>
                  <option value="Lecturer">Lecturer</option>
                  <option value="SuperAdmin">Super Admin</option>
                  <option value="Registry">Registry</option>
                  <option value="Finance">Finance</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddUserModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary gap-2" disabled={submitting}>
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                  {submitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {changingPasswordUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-lg">Change Password</h2>
              <button onClick={() => setChangingPasswordUser(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <form className="p-6 space-y-4" onSubmit={handleChangePassword}>
              <div className="p-4 bg-blue-50 rounded-xl mb-4">
                <p className="text-sm text-blue-700">Changing password for <strong>{changingPasswordUser.fullname}</strong></p>
              </div>
              <div className="space-y-2">
                <label className="label">New Password</label>
                <input 
                  type="password" 
                  className="input" 
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setChangingPasswordUser(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary gap-2" disabled={submitting}>
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
                  {submitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createCalendarEvent(newEvent);
      success('Calendar event added successfully!');
      setNewEvent({ date: '', event: '' });
      setShowAddEventModal(false);
      fetchData();
    } catch (error) {
      console.error('Failed to add calendar event:', error);
      toastError('Failed to add calendar event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await api.deleteCalendarEvent(id);
      success('Calendar event deleted!');
      fetchData();
    } catch (error) {
      console.error('Failed to delete calendar event:', error);
      toastError('Failed to delete calendar event');
    }
  };

  const renderCalendarManagement = () => (
    <div className="space-y-6">
      <div className="card">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">Academic Calendar</h2>
            <p className="text-slate-500 text-sm">Manage important dates and events.</p>
          </div>
          <button className="btn btn-primary gap-2" onClick={() => setShowAddEventModal(true)}>
            <Plus size={18} />
            New Event
          </button>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 font-semibold">Event</th>
                  <th className="px-6 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calendarEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-900">{ev.date}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600">{ev.event}</div>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all"
                        onClick={() => handleDeleteEvent(ev.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {calendarEvents.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic">
                      No events found. Add your first event to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddEventModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-lg">Add Calendar Event</h2>
              <button onClick={() => setShowAddEventModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <form className="p-6 space-y-4" onSubmit={handleAddEvent}>
              <div className="space-y-2">
                <label className="label">Date (e.g., Mar 25)</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Mar 25"
                  required
                  value={newEvent.date}
                  onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="label">Event Description</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Registration Closes"
                  required
                  value={newEvent.event}
                  onChange={e => setNewEvent({ ...newEvent, event: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddEventModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary gap-2" disabled={submitting}>
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                  {submitting ? 'Adding...' : 'Add Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  switch (activeSubItem) {
    case 'account_settings':
      return <AccountSettingsPanel user={user} />;
    case 'my_access_requests':
      return <MyAccessRequestsPanel />;
    case 'academic_year':
      return renderAcademicYear();
    case 'semesters':
      return renderSemesters();
    case 'academic_calendar':
      return renderCalendarManagement();
    case 'user_management':
      return renderUserManagement();
    case 'departments':
      return <SettingsDepartments />;
    case 'grading_points':
      return <SettingsGrading />;
    case 'system_settings':
      return <SettingsSystem />;
    case 'assessment_control':
      return <SettingsAssessmentControl />;
    case 'access_requests':
      return <SettingsAccessRequests />;
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
