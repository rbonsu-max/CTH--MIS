import React, { useState, useEffect } from 'react';
import { Check, X, Loader2, Clock, User, BookOpen, AlertCircle, Calendar, ShieldCheck, Lock } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { AssessmentRequest } from '../types';

export const SettingsAccessRequests: React.FC = () => {
  const [requests, setRequests] = useState<AssessmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'pending' | 'granted' | 'denied' | 'all'>('pending');
  const [grantingRequest, setGrantingRequest] = useState<AssessmentRequest | null>(null);
  const [grantMode, setGrantMode] = useState<'days' | 'never'>('days');
  const [grantDays, setGrantDays] = useState('3');
  
  const { success, error: toastError } = useToast();

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await api.getAssessmentRequests(filter === 'all' ? undefined : filter);
      setRequests(data);
    } catch (e: any) {
      toastError('Failed to load access requests');
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (id: number, status: 'granted' | 'denied', expires_at?: string) => {
    setProcessingId(id);
    try {
      await api.processAssessmentRequest(id, status, expires_at);
      success(`Request ${status} successfully`);
      if (status === 'granted') {
        setGrantingRequest(null);
      }
      fetchRequests();
    } catch (e: any) {
      toastError(e.message || 'Action failed');
    } finally {
      setProcessingId(null);
    }
  };

  const openGrantModal = (request: AssessmentRequest) => {
    setGrantingRequest(request);
    setGrantMode('days');
    setGrantDays('3');
  };

  const handleGrantConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantingRequest) return;

    let expiresAt: string | undefined;
    if (grantMode === 'days') {
      const daysNum = parseInt(grantDays, 10);
      if (Number.isNaN(daysNum) || daysNum < 1) {
        toastError('Enter a valid number of days for the access period.');
        return;
      }

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + daysNum);
      expiresAt = expiryDate.toISOString();
    }

    await handleProcess(grantingRequest.id, 'granted', expiresAt);
  };

  if (loading && requests.length === 0) return <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="card">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-lg">Access Requests</h2>
            <p className="text-slate-500 text-sm">Review and approve lecturer requests for upload/edit access.</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(['pending', 'granted', 'denied', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                  filter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider">
                  <th className="px-6 py-3 font-bold">Lecturer & Course</th>
                  <th className="px-6 py-3 font-bold">Request Details</th>
                  <th className="px-6 py-3 font-bold">Status</th>
                  <th className="px-6 py-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                          <User size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">{r.lecturer_name}</div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <BookOpen size={12} />
                            <span>{r.course_code} - {r.course_name}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            r.request_type === 'edit' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {r.request_type}
                          </span>
                          {r.index_no && (
                            <span className="text-xs font-mono text-slate-500">Student: {r.index_no}</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 italic line-clamp-1" title={r.reason}>"{r.reason}"</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <Clock size={10} />
                          <span>{new Date(r.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase w-fit ${
                          r.status === 'granted' ? 'bg-emerald-100 text-emerald-700' :
                          r.status === 'denied' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {r.status}
                        </span>
                        {r.status === 'granted' && r.expires_at && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Calendar size={10} />
                            Exp: {new Date(r.expires_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {r.status === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <button 
                            className="btn btn-primary py-1.5 px-3 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
                            disabled={processingId === r.id}
                            onClick={() => openGrantModal(r)}
                          >
                            {processingId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            Grant
                          </button>
                          <button 
                            className="btn btn-secondary py-1.5 px-3 text-xs gap-1.5 text-red-600 hover:bg-red-50 border-red-100"
                            disabled={processingId === r.id}
                            onClick={() => handleProcess(r.id, 'denied')}
                          >
                            <X size={14} />
                            Deny
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center text-slate-400">
                      <div className="flex flex-col items-center">
                        <AlertCircle size={40} className="text-slate-200 mb-3" />
                        <p className="font-medium text-slate-500">No requests found matching your filter.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {grantingRequest && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50/60 flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Grant Lecturer Access</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Review the request details and define how long this permission should remain active.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setGrantingRequest(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGrantConfirm} className="p-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lecturer</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{grantingRequest.lecturer_name}</div>
                  <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Request Type</div>
                  <div className="mt-1 inline-flex items-center gap-2 text-sm text-slate-700">
                    <Lock size={14} className="text-slate-400" />
                    {grantingRequest.request_type}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Course</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {grantingRequest.course_code} {grantingRequest.course_name ? `• ${grantingRequest.course_name}` : ''}
                  </div>
                  <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Scope</div>
                  <div className="mt-1 text-sm text-slate-700">
                    {grantingRequest.index_no ? `Student ${grantingRequest.index_no}` : 'Whole course access'}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reason Provided</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{grantingRequest.reason}</p>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Permission Duration</h4>
                  <p className="text-xs text-slate-500 mt-1">Choose how long the granted access should remain valid.</p>
                </div>

                <div className="grid gap-3">
                  <label className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                    grantMode === 'days' ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        className="mt-1"
                        checked={grantMode === 'days'}
                        onChange={() => setGrantMode('days')}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-900">Grant for a limited time</div>
                        <div className="text-xs text-slate-500 mt-1">Best for temporary upload or edit access.</div>
                        <div className="mt-4 flex items-center gap-3">
                          <input
                            type="number"
                            min="1"
                            value={grantDays}
                            onChange={(e) => setGrantDays(e.target.value)}
                            className="input w-28"
                            disabled={grantMode !== 'days'}
                          />
                          <span className="text-sm text-slate-600">day(s)</span>
                        </div>
                        {grantMode === 'days' && !Number.isNaN(parseInt(grantDays, 10)) && parseInt(grantDays, 10) > 0 && (
                          <div className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full">
                            <Calendar size={12} />
                            Expires on {new Date(Date.now() + parseInt(grantDays, 10) * 24 * 60 * 60 * 1000).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </label>

                  <label className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                    grantMode === 'never' ? 'border-blue-300 bg-blue-50/60' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        className="mt-1"
                        checked={grantMode === 'never'}
                        onChange={() => setGrantMode('never')}
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Grant without expiration</div>
                        <div className="text-xs text-slate-500 mt-1">Use only when long-term access is intentional and approved.</div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" className="btn btn-secondary" onClick={() => setGrantingRequest(null)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary gap-2 bg-emerald-600 hover:bg-emerald-700 border-emerald-600 min-w-[170px]"
                  disabled={processingId === grantingRequest.id}
                >
                  {processingId === grantingRequest.id ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  Grant Permission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
