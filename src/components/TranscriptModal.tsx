import React, { useRef } from 'react';
import { X, Printer } from 'lucide-react';
import { Student, Assessment, BoardsheetCache } from '../types';
import { TranscriptPreview } from './TranscriptPreview';

interface TranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    student: Student;
    assessments: Assessment[];
    caches: BoardsheetCache[];
  } | null;
  title: string;
}

export const TranscriptModal: React.FC<TranscriptModalProps> = ({ isOpen, onClose, data, title }) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !data) return null;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${title} - ${data.student.full_name}</title>
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
          <TranscriptPreview data={data} title={title} containerRef={printRef} />
        </div>
      </div>
    </div>
  );
};
