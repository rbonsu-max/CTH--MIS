import React, { useState, useEffect, useRef } from 'react';
import { Upload, Image as ImageIcon, Loader2, Save } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

const DEFAULT_SETTINGS = {
  institution_name: 'St. Nicholas Anglican Seminary',
  institution_short_name: 'SNS',
  institution_address: 'P.O.Box AD162, Cape Coast, Ghana',
  institution_phone: '+233-3321-33174',
  institution_email: 'registrar@snsanglican.org',
  portal_title: 'SIMS Portal',
  portal_subtitle: 'Student Information Management System'
};

export const SettingsSystem: React.FC = () => {
  const [logoBase64, setLogoBase64] = useState<string>('');
  const [form, setForm] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error: toastError } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await api.getSettings();
      if (data.institution_logo) {
        setLogoBase64(data.institution_logo);
      }
      setForm({
        institution_name: data.institution_name || DEFAULT_SETTINGS.institution_name,
        institution_short_name: data.institution_short_name || DEFAULT_SETTINGS.institution_short_name,
        institution_address: data.institution_address || DEFAULT_SETTINGS.institution_address,
        institution_phone: data.institution_phone || DEFAULT_SETTINGS.institution_phone,
        institution_email: data.institution_email || DEFAULT_SETTINGS.institution_email,
        portal_title: data.portal_title || DEFAULT_SETTINGS.portal_title,
        portal_subtitle: data.portal_subtitle || DEFAULT_SETTINGS.portal_subtitle
      });
    } catch {
      toastError('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toastError('Logo must be smaller than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Array<[string, string]> = [
        ['institution_logo', logoBase64],
        ['institution_name', form.institution_name.trim()],
        ['institution_short_name', form.institution_short_name.trim()],
        ['institution_address', form.institution_address.trim()],
        ['institution_phone', form.institution_phone.trim()],
        ['institution_email', form.institution_email.trim()],
        ['portal_title', form.portal_title.trim()],
        ['portal_subtitle', form.portal_subtitle.trim()]
      ];

      await Promise.all(updates.map(([key, value]) => api.updateSetting(key, value)));
      success('System identity saved successfully. The portal, login page, and printed transcripts now use these values.');
    } catch {
      toastError('Failed to save system settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="card max-w-4xl">
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-bold text-lg">System Identity</h2>
          <p className="text-slate-500 text-sm">Manage the institutional profile used across the portal, login screen, calendar views, and printed transcripts.</p>
        </div>
        <div className="p-6 space-y-8">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="w-48 h-48 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden shrink-0 relative group">
              {logoBase64 ? (
                <img src={logoBase64} alt="Institution Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <div className="text-center text-slate-400 p-4">
                  <ImageIcon size={48} className="mx-auto mb-2 opacity-50" />
                  <span className="text-xs">No logo uploaded. Using generic seal.</span>
                </div>
              )}

              <div
                className="absolute inset-0 bg-slate-900/50 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={24} className="mb-2" />
                <span className="text-sm font-bold">Change Logo</span>
              </div>
            </div>

            <div className="space-y-3 flex-1 text-center lg:text-left">
              <h3 className="font-bold text-slate-900">Upload Logo</h3>
              <p className="text-sm text-slate-500">
                Upload a high-quality logo (PNG or SVG recommended with a transparent background). Maximum size: 2MB.
              </p>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <button
                className="btn btn-secondary mt-2 w-full lg:w-auto"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose File
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <label className="label">Institution Name</label>
              <input
                type="text"
                className="input"
                value={form.institution_name}
                onChange={(e) => setForm({ ...form, institution_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="label">Institution Short Name</label>
              <input
                type="text"
                className="input"
                value={form.institution_short_name}
                onChange={(e) => setForm({ ...form, institution_short_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="label">Portal Title</label>
              <input
                type="text"
                className="input"
                value={form.portal_title}
                onChange={(e) => setForm({ ...form, portal_title: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="label">Portal Subtitle</label>
              <input
                type="text"
                className="input"
                value={form.portal_subtitle}
                onChange={(e) => setForm({ ...form, portal_subtitle: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="label">Address</label>
              <input
                type="text"
                className="input"
                value={form.institution_address}
                onChange={(e) => setForm({ ...form, institution_address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="label">Phone</label>
              <input
                type="text"
                className="input"
                value={form.institution_phone}
                onChange={(e) => setForm({ ...form, institution_phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={form.institution_email}
                onChange={(e) => setForm({ ...form, institution_email: e.target.value })}
              />
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button className="btn btn-primary gap-2" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
