import React, { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { Student, Assessment, BoardsheetCache } from '../types';
import { api } from '../services/api';

interface TranscriptPreviewProps {
  data: {
    student: Student;
    assessments: Assessment[];
    caches: BoardsheetCache[];
  };
  title: string;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

export const TranscriptPreview: React.FC<TranscriptPreviewProps> = ({ data, title, containerRef, className = '' }) => {
  const [logoBase64, setLogoBase64] = useState<string>('');
  const [gradingPoints, setGradingPoints] = useState<Array<{ grade: string; min_score: number; max_score: number; gp: number }>>([]);
  const [institution, setInstitution] = useState({
    institution_name: 'St. Nicholas Anglican Seminary',
    institution_address: 'P.O.Box AD162, Cape Coast, Ghana',
    institution_phone: '+233-3321-33174',
    institution_email: 'registrar@snsanglican.org'
  });

  useEffect(() => {
    Promise.all([api.getSettings(), api.getGradingPoints()])
      .then(([settings, grading]) => {
        if (settings.institution_logo) setLogoBase64(settings.institution_logo);
        setInstitution({
          institution_name: settings.institution_name || 'St. Nicholas Anglican Seminary',
          institution_address: settings.institution_address || 'P.O.Box AD162, Cape Coast, Ghana',
          institution_phone: settings.institution_phone || '+233-3321-33174',
          institution_email: settings.institution_email || 'registrar@snsanglican.org'
        });
        setGradingPoints(Array.isArray(grading) ? grading : []);
      })
      .catch(() => {});
  }, []);

  const { student, assessments, caches } = data;
  const finalCache = caches[caches.length - 1];

  const groupedResults: Record<string, Record<string, Assessment[]>> = {};
  assessments.forEach((ass) => {
    if (!groupedResults[ass.academic_year]) {
      groupedResults[ass.academic_year] = {};
    }
    if (!groupedResults[ass.academic_year][ass.semester_id]) {
      groupedResults[ass.academic_year][ass.semester_id] = [];
    }
    groupedResults[ass.academic_year][ass.semester_id].push(ass);
  });

  return (
    <div ref={containerRef} className={`bg-white p-4 md:p-12 shadow-sm mx-auto w-full max-w-[210mm] min-h-[297mm] text-slate-900 ${className}`}>
      <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 border-b-4 border-slate-900 pb-6 mb-8 text-center md:text-left">
        <div className="w-24 h-24 md:w-32 md:h-32 bg-slate-100 border-2 border-slate-200 rounded-xl flex items-center justify-center text-slate-400 font-bold text-[10px] md:text-xs text-center p-2 shadow-inner">
          {logoBase64 ? (
            <img src={logoBase64} alt="Official Seal" className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="flex flex-col items-center">
              <GraduationCap size={40} className="text-slate-300 mb-1" />
              <span>OFFICIAL SEAL</span>
            </div>
          )}
        </div>
        <div className="flex-1 space-y-1">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase text-slate-900">{institution.institution_name}</h1>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Academic Section</p>
          <p className="text-xs font-bold uppercase text-slate-700">{title}</p>
          <p className="text-[10px] text-slate-500">
            {institution.institution_address} || Tel: {institution.institution_phone} || Email: {institution.institution_email}
          </p>
        </div>
      </div>

      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 mb-10 text-sm">
        <div className="space-y-3">
          <div className="flex justify-between border-b border-slate-200 pb-1">
            <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Name of Student</span>
            <span className="font-black text-slate-900 uppercase">{student.surname}, {student.other_names}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-1">
            <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Index Number</span>
            <span className="font-mono font-bold text-blue-700">{student.index_number}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-1">
            <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Gender</span>
            <span className="font-bold">{student.gender?.toUpperCase() || 'N/A'}</span>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between border-b border-slate-200 pb-1">
            <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Programme</span>
            <span className="font-bold uppercase text-right">{student.program_name || student.progid}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-1">
            <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Admission Year</span>
            <span className="font-bold">{student.admission_year}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-1">
            <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Date of Issue</span>
            <span className="font-bold">{new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
          </div>
        </div>
      </div>

      {finalCache && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Final CGPA</div>
            <div className="text-2xl font-black text-blue-900">{finalCache.cGPA.toFixed(4)}</div>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Class Award</div>
            <div className="text-lg font-black text-emerald-900">{finalCache.class || 'N/A'}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Latest Semester</div>
            <div className="text-lg font-black text-slate-900">{finalCache.academic_year}</div>
            <div className="text-xs font-semibold text-slate-500">Semester {finalCache.semester_id}</div>
          </div>
        </div>
      )}

      <div className="space-y-12">
        {Object.entries(groupedResults).map(([year, semesters]) => (
          <div key={year} className="space-y-8">
            {Object.entries(semesters).map(([sem, results]) => {
              const cache = caches.find((item) => item.academic_year === year && item.semester_id === sem);
              return (
                <div key={`${year}-${sem}`} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-6 py-3 border-b border-slate-200">
                    <h5 className="text-sm font-bold text-slate-700">{year} - Semester {sem}</h5>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                          <th className="px-3 py-2 font-bold">Course Code</th>
                          <th className="px-3 py-2 font-bold">Course Title</th>
                          <th className="px-3 py-2 text-center font-bold">CA</th>
                          <th className="px-3 py-2 text-center font-bold">Exam</th>
                          <th className="px-3 py-2 text-center font-bold">CH</th>
                          <th className="px-3 py-2 text-center font-bold">Grade</th>
                          <th className="px-3 py-2 text-center font-bold">GP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((res) => (
                          <tr key={res.id} className="hover:bg-slate-50">
                            <td className="px-3 py-1.5 font-bold text-slate-700 text-[11px]">{res.course_code}</td>
                            <td className="px-3 py-1.5 uppercase font-medium text-[11px]">{res.course_name || 'N/A'}</td>
                            <td className="px-3 py-1.5 text-center text-[11px]">{res.total_ca?.toFixed(2) || '-'}</td>
                            <td className="px-3 py-1.5 text-center text-[11px]">{res.exam_score?.toFixed(2) || '-'}</td>
                            <td className="px-3 py-1.5 text-center font-bold text-[11px]">{res.credit_hours}</td>
                            <td className="px-3 py-1.5 text-center font-black text-blue-700 text-[11px]">{res.grade}</td>
                            <td className="px-3 py-1.5 text-center font-mono text-[11px]">{res.grade_point?.toFixed ? res.grade_point.toFixed(1) : (res.grade_point || '0.0')}</td>
                          </tr>
                        ))}
                      </tbody>
                      {cache && (
                        <tfoot>
                          <tr className="font-bold border-t-2 border-slate-900">
                            <td colSpan={2} className="px-4 py-3">
                              <div className="flex gap-8">
                                <div className="flex flex-col">
                                  <span className="text-[9px] uppercase text-slate-500">Semester GPA</span>
                                  <span className="text-sm font-black text-blue-700">{cache.sGPA?.toFixed(4) || '0.0000'}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[9px] uppercase text-slate-500">Cumulative GPA</span>
                                  <span className="text-sm font-black text-slate-900">{cache.cGPA?.toFixed(4) || '0.0000'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex flex-col">
                                <span className="text-[9px] uppercase text-slate-500">TCR</span>
                                <span>{cache.sCH}</span>
                              </div>
                            </td>
                            <td></td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex flex-col">
                                <span className="text-[9px] uppercase text-slate-500">TCP</span>
                                <span>{cache.sGP?.toFixed(1) || '0.0'}</span>
                              </div>
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t-2 border-slate-900">
        <div className="space-y-4">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Grading System</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px] font-medium text-slate-600">
            {gradingPoints
              .slice()
              .sort((left, right) => Number(right.min_score) - Number(left.min_score))
              .map((point) => (
                <div key={point.grade} className="flex justify-between">
                  <span>{Number(point.min_score).toFixed(0)} - {Number(point.max_score).toFixed(0)}</span>
                  <span className="font-bold">{point.grade} ({Number(point.gp).toFixed(1)})</span>
                </div>
              ))}
          </div>
        </div>
        <div className="flex flex-col items-center justify-end space-y-4">
          <div className="w-48 border-b-2 border-slate-900"></div>
          <div className="text-center">
            <p className="text-sm font-black uppercase text-slate-900">Registrar</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{institution.institution_name}</p>
          </div>
        </div>
      </div>

      <div className="mt-12 text-[9px] text-slate-400 text-center font-mono uppercase tracking-widest">
        *** END OF {title} - VALID ONLY WITH OFFICIAL SEAL ***
      </div>
    </div>
  );
};
