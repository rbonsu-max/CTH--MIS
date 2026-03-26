export const printElement = (elementId: string, title: string = 'Print Document') => {
  const content = document.getElementById(elementId);
  if (!content) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print this document');
    return;
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          :root {
            color-scheme: light;
          }
          @page {
            size: A4 landscape;
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
            .no-print { display: none !important; }
            body { 
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important; 
              background: white !important;
            }
            .print-shell {
              padding: 0 !important;
            }
          }
          body { 
            font-family: ui-sans-serif, system-ui, sans-serif;
            color: #0f172a;
          }
          .print-shell {
            padding: 10mm;
          }
          .print-header {
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 2px solid #e2e8f0;
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
            border-collapse: collapse !important;
            table-layout: auto;
          }
          th, td {
            word-break: break-word;
            vertical-align: top;
          }
          thead {
            display: table-header-group;
          }
          tr, img {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          img, svg {
            max-width: 100%;
          }
        </style>
      </head>
      <body class="bg-white">
        <div class="print-shell">
          <div class="print-header">
            <h1 class="text-2xl font-bold text-slate-900">${title}</h1>
            <p class="text-slate-500 text-sm mt-1">Generated on ${new Date().toLocaleString()}</p>
          </div>
          <div class="print-scale-frame">
            <div id="print-scale-target" class="print-scale-target">
              ${content.innerHTML}
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

          window.addEventListener('load', fitToPage);
          window.addEventListener('resize', fitToPage);

          setTimeout(() => {
            fitToPage();
            window.print();
            window.onafterprint = () => window.close();
          }, 900);
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
