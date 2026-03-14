// HARMONI — Export Module (PDF/Word/Excel/CSV/Print)
// Uses: jsPDF + AutoTable (PDF), docx.js (Word), SheetJS (Excel)

const Exporter = {
  // ==================== PDF Export ====================
  async toPDF(title, data, options = {}) {
    if (typeof jspdf === 'undefined') {
      App.toast('กำลังโหลด PDF library...', 'info');
      await this._loadScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js');
      await this._loadScript('https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js');
    }
    const { jsPDF } = jspdf;
    const doc = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Thai font support — use built-in Helvetica (limited Thai) or load if available
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(16);
    doc.text(title, 14, 20);
    doc.setFontSize(10);

    if (options.subtitle) {
      doc.setFontSize(12);
      doc.text(options.subtitle, 14, 28);
    }

    const startY = options.subtitle ? 35 : 28;

    if (Array.isArray(data) && data.length > 0) {
      const headers = options.headers || Object.keys(data[0]);
      const headerLabels = options.headerLabels || headers;

      doc.autoTable({
        startY,
        head: [headerLabels],
        body: data.map(row => headers.map(h => row[h] ?? '')),
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [67, 97, 238], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 246, 250] },
        margin: { top: 10, left: 14, right: 14 },
        didDrawPage: (d) => {
          // Footer
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(
            `HARMONI — ${new Date().toLocaleDateString('th-TH')}`,
            14, doc.internal.pageSize.height - 10
          );
          doc.text(
            `หน้า ${d.pageNumber}`,
            doc.internal.pageSize.width - 25,
            doc.internal.pageSize.height - 10
          );
        }
      });
    } else if (typeof data === 'string') {
      // Free text content
      const lines = doc.splitTextToSize(data, 180);
      doc.text(lines, 14, startY);
    }

    const filename = `${title.replace(/[^a-zA-Z0-9ก-๙]/g, '_')}.pdf`;
    doc.save(filename);
    App.toast('ส่งออก PDF สำเร็จ', 'success');
  },

  // ==================== Excel Export ====================
  async toExcel(title, data, options = {}) {
    if (typeof XLSX === 'undefined') {
      App.toast('กำลังโหลด Excel library...', 'info');
      await this._loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
    }

    const headers = options.headers || Object.keys(data[0] || {});
    const headerLabels = options.headerLabels || headers;

    // Build worksheet data
    const wsData = [headerLabels];
    for (const row of data) {
      wsData.push(headers.map(h => row[h] ?? ''));
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws['!cols'] = headerLabels.map(h => ({ wch: Math.max(h.length * 2, 12) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, options.sheetName || 'Sheet1');

    const filename = `${title.replace(/[^a-zA-Z0-9ก-๙]/g, '_')}.xlsx`;
    XLSX.writeFile(wb, filename);
    App.toast('ส่งออก Excel สำเร็จ', 'success');
  },

  // ==================== CSV Export ====================
  toCSV(title, data, options = {}) {
    const headers = options.headers || Object.keys(data[0] || {});
    const headerLabels = options.headerLabels || headers;

    let csv = '\ufeff'; // UTF-8 BOM
    csv += headerLabels.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',') + '\n';

    for (const row of data) {
      csv += headers.map(h => {
        const val = row[h] ?? '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',') + '\n';
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9ก-๙]/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    App.toast('ส่งออก CSV สำเร็จ', 'success');
  },

  // ==================== Word Export ====================
  async toWord(title, data, options = {}) {
    if (typeof docx === 'undefined') {
      App.toast('กำลังโหลด Word library...', 'info');
      await this._loadScript('https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.min.js');
    }

    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
            WidthType, AlignmentType, HeadingLevel, BorderStyle } = docx;

    const children = [
      new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    ];

    if (options.subtitle) {
      children.push(new Paragraph({
        text: options.subtitle,
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 }
      }));
    }

    if (Array.isArray(data) && data.length > 0) {
      const headers = options.headers || Object.keys(data[0]);
      const headerLabels = options.headerLabels || headers;

      // Header row
      const headerRow = new TableRow({
        children: headerLabels.map(h => new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 22 })] })],
          width: { size: Math.floor(9000 / headerLabels.length), type: WidthType.DXA }
        }))
      });

      // Data rows
      const dataRows = data.map(row => new TableRow({
        children: headers.map(h => new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: String(row[h] ?? ''), size: 22 })] })],
          width: { size: Math.floor(9000 / headers.length), type: WidthType.DXA }
        }))
      }));

      children.push(new Table({ rows: [headerRow, ...dataRows] }));
    } else if (typeof data === 'string') {
      data.split('\n').forEach(line => {
        children.push(new Paragraph({
          children: [new TextRun({ text: line, size: 24 })],
          spacing: { after: 100 }
        }));
      });
    }

    const doc = new Document({
      sections: [{
        properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
        children
      }]
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9ก-๙]/g, '_')}.docx`;
    a.click();
    URL.revokeObjectURL(url);
    App.toast('ส่งออก Word สำเร็จ', 'success');
  },

  // ==================== Print ====================
  print(title, html) {
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head>
      <title>${DOMPurify.sanitize(title)}</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
      <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Prompt', sans-serif; padding: 20px; }
        @media print { .no-print { display: none !important; } }
      </style>
    </head><body>
      <div class="no-print mb-3">
        <button class="btn btn-primary btn-sm" onclick="window.print()"><i class="bi bi-printer me-1"></i>พิมพ์</button>
        <button class="btn btn-secondary btn-sm ms-1" onclick="window.close()">ปิด</button>
      </div>
      <h4 class="mb-3">${DOMPurify.sanitize(title)}</h4>
      ${DOMPurify.sanitize(html, { ADD_TAGS: ['table','thead','tbody','tr','th','td','style'], ADD_ATTR: ['class','style','colspan','rowspan'] })}
    </body></html>`);
    win.document.close();
  },

  // ==================== Export Dialog ====================
  showExportDialog(title, data, options = {}) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="bi bi-download me-2"></i>ส่งออกข้อมูล</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p class="text-muted small mb-3">${DOMPurify.sanitize(title)}</p>
            <div class="d-grid gap-2">
              <button class="btn btn-outline-danger" data-export="pdf"><i class="bi bi-file-earmark-pdf me-2"></i>PDF</button>
              <button class="btn btn-outline-success" data-export="excel"><i class="bi bi-file-earmark-spreadsheet me-2"></i>Excel (.xlsx)</button>
              <button class="btn btn-outline-primary" data-export="csv"><i class="bi bi-filetype-csv me-2"></i>CSV</button>
              <button class="btn btn-outline-info" data-export="word"><i class="bi bi-file-earmark-word me-2"></i>Word (.docx)</button>
              <button class="btn btn-outline-secondary" data-export="print"><i class="bi bi-printer me-2"></i>พิมพ์</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal);

    modal.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-export]');
      if (!btn) return;
      const type = btn.dataset.export;
      bsModal.hide();
      switch (type) {
        case 'pdf': await this.toPDF(title, data, options); break;
        case 'excel': await this.toExcel(title, data, options); break;
        case 'csv': this.toCSV(title, data, options); break;
        case 'word': await this.toWord(title, data, options); break;
        case 'print':
          if (options.printHtml) {
            this.print(title, options.printHtml);
          } else {
            await this.toPDF(title, data, options);
          }
          break;
      }
    });

    modal.addEventListener('hidden.bs.modal', () => modal.remove());
    bsModal.show();
  },

  // ==================== Utility ====================
  _loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`Failed to load: ${src}`));
      document.head.appendChild(s);
    });
  }
};