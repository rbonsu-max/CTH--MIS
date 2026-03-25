import React, { useState, useEffect } from 'react';
import { Check, X, Loader2, Clock, User, BookOpen, AlertCircle, Calendar } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { AssessmentRequest } from '../types';

export const SettingsAccessRequests: React.FC = () => {
  const [requests, setRequests] = useState<AssessmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'pending' | 'granted' | 'denied' | 'all'>('pending');
  
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

  const handleProcess = async (id: number, status: 'granted' | 'denied') => {
    let expires_at = undefined;
    if (status === 'granted') {
      const days = window.prompt('For how many days should this access be granted? (Enter 0 for no expiration)', '3');
      if (days === null) return;
      const daysNum = parseInt(days);
      if (daysNum > 0) {
        const exp = new Date();
        exp.setDate(exp.getDate() + daysNum);
        expires_at = exp.toISOString();
      }
    }

    setProcessingId(id);
    try {
      await api.processAssessmentRequest(id, status, expires_at);
      success(`Request ${status} successfully`);
      fetchRequests();
    } catch (e: any) {
      toastError(e.message || 'Action failed');
    } finally {
      setProcessingId(null);
    }
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
                            onClick={() => handleProcess(r.id, 'granted')}
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
    </div>
  );
};
