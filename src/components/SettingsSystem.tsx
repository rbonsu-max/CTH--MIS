import React, { useState, useEffect, useRef } from 'react';
import { Upload, Image as ImageIcon, Loader2, Save } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export const SettingsSystem: React.FC = () => {
  const [logoBase64, setLogoBase64] = useState<string>('');
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
    } catch (e) {
      toastError('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
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
      await api.updateSetting('institution_logo', logoBase64);
      success('Institutional logo saved successfully! It will now appear on login pages and transcripts.');
    } catch (e: any) {
      toastError('Failed to save logo');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="card max-w-2xl">
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-bold text-lg">System Identity</h2>
          <p className="text-slate-500 text-sm">Manage the institutional logo used across the portal and printed transcripts.</p>
        </div>
        <div className="p-6 space-y-6">
          
          <div className="flex flex-col sm:flex-row items-center gap-8">
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

            <div className="space-y-3 flex-1 text-center sm:text-left">
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
                className="btn btn-secondary mt-2 w-full sm:w-auto"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose File
              </button>
            </div>
          </div>

        </div>
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button className="btn btn-primary gap-2" onClick={handleSave} disabled={saving || !logoBase64}>
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
