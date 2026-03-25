import React, { useState } from 'react';
import { Lock, Loader2, ShieldCheck } from 'lucide-react';
import { User } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface AccountSettingsPanelProps {
  user: User;
}

export const AccountSettingsPanel: React.FC<AccountSettingsPanelProps> = ({ user }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const { success, error: toastError } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toastError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toastError('New password and confirmation do not match.');
      return;
    }

    setSaving(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      success('Password updated successfully.');
    } catch (error: any) {
      toastError(error.message || 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ShieldCheck size={26} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Account Settings</h2>
            <p className="text-sm text-slate-500 mt-1">Manage your sign-in details and keep your account secure.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="text-xs uppercase tracking-wider font-bold text-slate-400">Full Name</div>
            <div className="mt-1 font-semibold text-slate-900">{user.name}</div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="text-xs uppercase tracking-wider font-bold text-slate-400">Username</div>
            <div className="mt-1 font-semibold text-slate-900">{user.username}</div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="text-xs uppercase tracking-wider font-bold text-slate-400">Role</div>
            <div className="mt-1 font-semibold text-slate-900">{user.role}</div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="text-xs uppercase tracking-wider font-bold text-slate-400">Account Status</div>
            <div className="mt-1 font-semibold text-slate-900 capitalize">{user.status}</div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="text-blue-600" size={20} />
          <div>
            <h3 className="font-bold text-slate-900">Change Password</h3>
            <p className="text-sm text-slate-500">Use your current password to set a new one.</p>
          </div>
        </div>

        <form className="space-y-4 max-w-xl" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="label">Current Password</label>
            <input type="password" className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="label">New Password</label>
            <input type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="label">Confirm New Password</label>
            <input type="password" className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary min-w-[170px]" disabled={saving}>
            {saving ? <Loader2 size={18} className="animate-spin" /> : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};
