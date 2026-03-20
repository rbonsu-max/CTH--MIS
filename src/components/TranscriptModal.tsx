import React, { useRef } from 'react';
import { X, Printer, Download, GraduationCap } from 'lucide-react';
import { Student, Assessment, BoardsheetCache } from '../types';

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

  if (!isOpen || !data) return null;

  const { student, assessments, caches } = data;

  // Group assessments by academic year and semester
  const groupedResults: Record<string, Record<string, Assessment[]>> = {};
  assessments.forEach(ass => {
    if (!groupedResults[ass.academic_year]) {
      groupedResults[ass.academic_year] = {};
    }
    if (!groupedResults[ass.academic_year][ass.semester_sid]) {
      groupedResults[ass.academic_year][ass.semester_sid] = [];
    }
    groupedResults[ass.academic_year][ass.semester_sid].push(ass);
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
            @media print {
              .no-print { display: none; }
              body { padding: 0; margin: 0; }
              .print-container { width: 100%; }
            }
            body { font-family: 'Inter', sans-serif; }
          </style>
        </head>
        <body class="bg-white">
          <div class="p-8 max-w-4xl mx-auto">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = () => {
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
              <div className="w-24 h-24 md:w-32 md:h-32 bg-slate-100 border-2 border-slate-200 rounded-xl flex items-center justify-center text-slate-400 font-bold text-[10px] md:text-xs text-center p-4 shadow-inner">
                <div className="flex flex-col items-center">
                  <GraduationCap size={40} className="text-slate-300 mb-1" />
                  <span>OFFICIAL SEAL</span>
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase text-slate-900">St. Nicholas Anglican Seminary</h1>
                <p className="text-sm md:text-base font-bold uppercase tracking-[0.2em] text-slate-600">Cape Coast, Ghana</p>
                <div className="h-1 w-24 bg-blue-600 mx-auto md:mx-0 my-2"></div>
                <p className="text-xs md:text-sm font-mono text-slate-500 uppercase">
                  P.O.Box AD162, Cape Coast || Tel: +233-3321-33174 || Email: registrar@snsanglican.org
                </p>
                <div className="mt-4 inline-block px-6 py-1 bg-slate-900 text-white text-lg md:text-xl font-bold uppercase tracking-widest">
                  {title}
                </div>
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
                  <span className="font-bold">{student.gender === 'M' ? 'MALE' : 'FEMALE'}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Programme</span>
                  <span className="font-bold uppercase text-right">{student.progid}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Admission Year</span>
                  <span className="font-bold">{student.admission_year}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Date of Issue</span>
                  <span className="font-bold">{new Date().toLocaleDateString('en-GB')}</span>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-12">
              {Object.entries(groupedResults).map(([year, semesters]) => (
                <div key={year} className="space-y-8">
                  {Object.entries(semesters).map(([sem, results]) => {
                    const cache = caches.find(c => c.academic_year === year && c.semester_sid === sem);
                    return (
                      <div key={sem} className="space-y-4">
                        <div className="flex items-center gap-4">
                          <h2 className="text-base font-black uppercase text-slate-900 whitespace-nowrap">
                            {year} - {sem === 'SEM1' ? 'First Semester' : 'Second Semester'}
                          </h2>
                          <div className="h-px bg-slate-200 flex-1"></div>
                        </div>
                        <div className="overflow-hidden border border-slate-200 rounded-lg">
                          <table className="w-full text-[11px]">
                            <thead>
                              <tr className="bg-slate-900 text-white text-left">
                                <th className="px-4 py-2 w-24">COURSE CODE</th>
                                <th className="px-4 py-2">COURSE TITLE</th>
                                <th className="px-4 py-2 w-12 text-center">CR</th>
                                <th className="px-4 py-2 w-12 text-center">GD</th>
                                <th className="px-4 py-2 w-12 text-center">GP</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {results.map(res => (
                                <tr key={res.id} className="hover:bg-slate-50">
                                  <td className="px-4 py-2 font-bold text-slate-700">{res.cid}</td>
                                  <td className="px-4 py-2 uppercase font-medium">{res.course_title || 'N/A'}</td>
                                  <td className="px-4 py-2 text-center font-bold">{res.credits}</td>
                                  <td className="px-4 py-2 text-center font-black text-blue-700">{res.grade}</td>
                                  <td className="px-4 py-2 text-center font-mono">{res.gp.toFixed(1)}</td>
                                </tr>
                              ))}
                            </tbody>
                            {cache && (
                              <tfoot className="bg-slate-50">
                                <tr className="font-bold border-t-2 border-slate-900">
                                  <td colSpan={2} className="px-4 py-3">
                                    <div className="flex gap-8">
                                      <div className="flex flex-col">
                                        <span className="text-[9px] uppercase text-slate-500">Semester GPA</span>
                                        <span className="text-sm font-black text-blue-700">{cache.gpa.toFixed(4)}</span>
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-[9px] uppercase text-slate-500">Cumulative GPA</span>
                                        <span className="text-sm font-black text-slate-900">{cache.cgpa.toFixed(4)}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <div className="flex flex-col">
                                      <span className="text-[9px] uppercase text-slate-500">TCR</span>
                                      <span>{cache.tcr}</span>
                                    </div>
                                  </td>
                                  <td></td>
                                  <td className="px-4 py-3 text-center">
                                    <div className="flex flex-col">
                                      <span className="text-[9px] uppercase text-slate-500">TCP</span>
                                      <span>{cache.tcp.toFixed(1)}</span>
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
                  <div className="flex justify-between"><span>80 - 100</span> <span className="font-bold">A (4.0)</span></div>
                  <div className="flex justify-between"><span>75 - 79</span> <span className="font-bold">B+ (3.5)</span></div>
                  <div className="flex justify-between"><span>70 - 74</span> <span className="font-bold">B (3.0)</span></div>
                  <div className="flex justify-between"><span>65 - 69</span> <span className="font-bold">C+ (2.5)</span></div>
                  <div className="flex justify-between"><span>60 - 64</span> <span className="font-bold">C (2.0)</span></div>
                  <div className="flex justify-between"><span>55 - 59</span> <span className="font-bold">D+ (1.5)</span></div>
                  <div className="flex justify-between"><span>50 - 54</span> <span className="font-bold">D (1.0)</span></div>
                  <div className="flex justify-between"><span>00 - 49</span> <span className="font-bold">E (0.0)</span></div>
                </div>
              </div>
              <div className="flex flex-col items-center justify-end space-y-4">
                <div className="w-48 border-b-2 border-slate-900"></div>
                <div className="text-center">
                  <p className="text-sm font-black uppercase text-slate-900">Registrar</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">St. Nicholas Anglican Seminary</p>
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
