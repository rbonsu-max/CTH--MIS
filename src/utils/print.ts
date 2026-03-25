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
          @media print {
            .no-print { display: none !important; }
            @page { margin: 10mm; }
            body { 
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important; 
              background: white !important;
            }
            .print-container { width: 100%; }
          }
          body { font-family: ui-sans-serif, system-ui, sans-serif; }
        </style>
      </head>
      <body class="bg-white p-8">
        <div class="print-container">
          <div class="mb-6 pb-4 border-b-2 border-slate-200">
            <h1 class="text-2xl font-bold text-slate-900">${title}</h1>
            <p class="text-slate-500 text-sm mt-1">Generated on ${new Date().toLocaleString()}</p>
          </div>
          ${content.innerHTML}
        </div>
        <script>
          // Wait for Tailwind CDN to apply styles before printing
          setTimeout(() => {
            window.print();
            window.onafterprint = () => window.close();
          }, 800);
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
