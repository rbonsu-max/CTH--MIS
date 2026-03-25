import React, { useEffect, useState } from 'react';
import { Loader2, Lock, Calendar, BookOpen } from 'lucide-react';
import { api } from '../services/api';
import { AssessmentRequest } from '../types';
import { useToast } from '../context/ToastContext';

export const MyAccessRequestsPanel: React.FC = () => {
  const [requests, setRequests] = useState<AssessmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { error: toastError } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setRequests(await api.getMyAssessmentRequests());
      } catch (error) {
        toastError('Failed to load your access requests.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [toastError]);

  if (loading) {
    return <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="card">
      <div className="p-6 border-b border-slate-100">
        <h2 className="font-bold text-lg text-slate-900">My Access Requests</h2>
        <p className="text-sm text-slate-500">Track lecturer upload and edit requests sent to the superadmin.</p>
      </div>
      <div className="p-6 space-y-4">
        {requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
            No access requests submitted yet.
          </div>
        ) : requests.map((request) => (
          <div key={request.id} className="rounded-2xl border border-slate-100 p-5 bg-white">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <BookOpen size={16} className="text-blue-600" />
                  {request.course_code} {request.course_name ? `• ${request.course_name}` : ''}
                </div>
                <div className="mt-1 text-xs text-slate-500 flex items-center gap-2">
                  <Calendar size={12} />
                  {request.academic_year || 'No year'} / {request.semester_id || 'No semester'}
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase w-fit ${
                request.status === 'granted' ? 'bg-emerald-100 text-emerald-700' :
                request.status === 'denied' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
              }`}>
                {request.status}
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Request Type</div>
                <div className="mt-1 text-sm text-slate-700 flex items-center gap-2">
                  <Lock size={14} className="text-slate-400" />
                  {request.request_type}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Student Scope</div>
                <div className="mt-1 text-sm text-slate-700">{request.index_no || 'Whole course upload'}</div>
              </div>
            </div>
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              {request.reason}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
