import React, { useRef, useState, useEffect } from 'react';
import { X, Printer, Download, GraduationCap } from 'lucide-react';
import { Student, Assessment, BoardsheetCache } from '../types';
import { api } from '../services/api';

interface TranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    student: Student;
    assessments: Assessment[];
    caches: BoardsheetCache[];
  } | null;
  title: string; // "Statement of Results" or "Transcript"
}

export const TranscriptModal: React.FC<TranscriptModalProps> = ({ isOpen, onClose, data, title }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [logoBase64, setLogoBase64] = useState<string>('');
  const [gradingPoints, setGradingPoints] = useState<Array<{ grade: string; min_score: number; max_score: number; gp: number }>>([]);
  const [institution, setInstitution] = useState({
    institution_name: 'St. Nicholas Anglican Seminary',
    institution_address: 'P.O.Box AD162, Cape Coast, Ghana',
    institution_phone: '+233-3321-33174',
    institution_email: 'registrar@snsanglican.org'
  });

  useEffect(() => {
    if (isOpen) {
      Promise.all([api.getSettings(), api.getGradingPoints()])
        .then(([settings, grading]) => {
          if (settings.institution_logo) setLogoBase64(settings.institution_logo);
          setInstitution({
            institution_name: settings.institution_name || 'St. Nicholas Anglican Seminary',
            institution_address: settings.institution_address || 'P.O.Box AD162, Cape Coast, Ghana',
            institution_phone: settings.institution_phone || '+233-3321-33174',
            institution_email: settings.institution_email || 'registrar@snsanglican.org'
          });
          setGradingPoints(grading);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen || !data) return null;

  const { student, assessments, caches } = data;
  const finalCache = caches[caches.length - 1];

  // Group assessments by academic year and semester
  const groupedResults: Record<string, Record<string, Assessment[]>> = {};
  assessments.forEach(ass => {
    if (!groupedResults[ass.academic_year]) {
      groupedResults[ass.academic_year] = {};
    }
    if (!groupedResults[ass.academic_year][ass.semester_id]) {
      groupedResults[ass.academic_year][ass.semester_id] = [];
    }
    groupedResults[ass.academic_year][ass.semester_id].push(ass);
  });

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${title} - ${student.full_name}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            :root {
              color-scheme: light;
            }
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: white !important;
            }
            * {
              box-sizing: border-box;
            }
            @media print {
              .no-print { display: none; }
              body { padding: 0; margin: 0; }
              .print-shell { padding: 0 !important; }
            }
            body { font-family: 'Inter', sans-serif; color: #0f172a; }
            .print-shell {
              padding: 10mm;
            }
            .print-scale-frame {
              width: 100%;
              overflow: hidden;
            }
            .print-scale-target {
              transform-origin: top left;
              width: 100%;
            }
            table {
              width: 100% !important;
            }
            thead {
              display: table-header-group;
            }
            tr, img {
              break-inside: avoid;
              page-break-inside: avoid;
            }
            img {
              max-width: 100%;
            }
          </style>
        </head>
        <body class="bg-white">
          <div class="print-shell">
            <div class="print-scale-frame">
              <div id="print-scale-target" class="print-scale-target">
                ${printContent.innerHTML}
              </div>
            </div>
          </div>
          <script>
            const fitToPage = () => {
              const target = document.getElementById('print-scale-target');
              if (!target) return;
              target.style.transform = 'scale(1)';
              target.style.width = '100%';
              const frame = target.parentElement;
              if (!frame) return;
              const availableWidth = frame.clientWidth;
              const contentWidth = target.scrollWidth;
              if (!availableWidth || !contentWidth) return;
              const scale = Math.min(1, availableWidth / contentWidth);
              target.style.transform = 'scale(' + scale + ')';
              target.style.width = scale < 1 ? (100 / scale) + '%' : '100%';
            };

            window.onload = () => {
              fitToPage();
              window.print();
              window.onafterprint = () => window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-4 overflow-y-auto">
      <div className="bg-white rounded-none md:rounded-2xl shadow-xl w-full max-w-5xl my-0 md:my-8 overflow-hidden flex flex-col h-full md:max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 no-print">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-slate-900">{title} Preview</h3>
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Printer size={16} />
              Print
            </button>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 md:p-8 bg-slate-100">
          <div ref={printRef} className="bg-white p-4 md:p-12 shadow-sm mx-auto w-full max-w-[210mm] min-h-[297mm] text-slate-900">
            {/* Header */}
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

            {/* Student Info */}
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

            {/* Results */}
            <div className="space-y-12">
              {Object.entries(groupedResults).map(([year, semesters]) => (
                <div key={year} className="space-y-8">
                  {Object.entries(semesters).map(([sem, results]) => {
                    const cache = caches.find(c => c.academic_year === year && c.semester_id === sem);
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
                              {results.map(res => (
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

            {/* Grading Key & Signature */}
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

            {/* Footer */}
            <div className="mt-12 text-[9px] text-slate-400 text-center font-mono uppercase tracking-widest">
              *** END OF {title} - VALID ONLY WITH OFFICIAL SEAL ***
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
