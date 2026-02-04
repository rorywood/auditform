import { jsPDF } from 'jspdf';
import { auditSections } from '../config/auditItems';

const PRIMARY_COLOR = [0, 82, 147];
const LIGHT_BLUE = [240, 247, 255];
const LIGHT_GRAY = [248, 250, 252];
const BORDER_COLOR = [226, 232, 240];
const TEXT_COLOR = [30, 41, 59];
const LIGHT_TEXT = [100, 116, 139];
const COMPLIANT_COLOR = [22, 163, 74];
const NONCOMPLIANT_COLOR = [220, 38, 38];
const NEUTRAL_COLOR = [107, 114, 128];

async function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export async function generateAuditPdf(formData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  let logoData = null;
  try {
    logoData = await loadImage('/logo.png');
  } catch (e) {
    console.warn('Could not load logo for PDF:', e);
  }

  function addHeader(isFirstPage = false) {
    if (isFirstPage) {
      // Logo
      if (logoData) {
        try {
          doc.addImage(logoData, 'PNG', margin, 12, 50, 25);
        } catch (e) {
          console.warn('Could not add logo to PDF:', e);
        }
      }

      // Title block on right
      doc.setFillColor(...PRIMARY_COLOR);
      doc.roundedRect(pageWidth - margin - 85, 10, 85, 30, 3, 3, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Projects Audit', pageWidth - margin - 42.5, 22, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Form', pageWidth - margin - 42.5, 32, { align: 'center' });

      // Thin accent line
      doc.setFillColor(...PRIMARY_COLOR);
      doc.rect(margin, 45, contentWidth, 1, 'F');

      return 55;
    }
    return margin + 5;
  }

  function addFooter(pageNum, totalPages) {
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);

    doc.setFontSize(8);
    doc.setTextColor(...LIGHT_TEXT);
    doc.text('Powertec Telecommunications Pty Ltd', margin, pageHeight - 10);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text(new Date().toLocaleDateString('en-AU'), pageWidth - margin, pageHeight - 10, { align: 'right' });
  }

  function checkNewPage(requiredSpace = 25) {
    if (yPos + requiredSpace > pageHeight - 25) {
      doc.addPage();
      yPos = addHeader(false);
      return true;
    }
    return false;
  }

  function addSectionHeader(title, itemCount) {
    checkNewPage(30);

    doc.setFillColor(...PRIMARY_COLOR);
    doc.roundedRect(margin, yPos, contentWidth, 9, 1.5, 1.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), margin + 4, yPos + 6.5);

    if (itemCount) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`${itemCount} items`, pageWidth - margin - 4, yPos + 6.5, { align: 'right' });
    }

    yPos += 13;
  }

  function drawInfoTable(data) {
    const colWidth = contentWidth / 2;
    const rowHeight = 9;
    let row = 0;

    for (let i = 0; i < data.length; i += 2) {
      const isEven = row % 2 === 0;
      doc.setFillColor(isEven ? 255 : ...LIGHT_GRAY, isEven ? 255 : undefined, isEven ? 255 : undefined);
      doc.rect(margin, yPos, contentWidth, rowHeight, 'F');

      doc.setDrawColor(...BORDER_COLOR);
      doc.setLineWidth(0.2);
      doc.rect(margin, yPos, contentWidth, rowHeight, 'S');
      doc.line(margin + colWidth, yPos, margin + colWidth, yPos + rowHeight);

      // Left column
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PRIMARY_COLOR);
      doc.text(data[i].label + ':', margin + 3, yPos + 6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEXT_COLOR);
      doc.text(data[i].value || '-', margin + 38, yPos + 6);

      // Right column
      if (data[i + 1]) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PRIMARY_COLOR);
        doc.text(data[i + 1].label + ':', margin + colWidth + 3, yPos + 6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...TEXT_COLOR);
        doc.text(data[i + 1].value || '-', margin + colWidth + 38, yPos + 6);
      }

      yPos += rowHeight;
      row++;
    }
  }

  function addAuditItemsTable(items, formData) {
    items.forEach((item, index) => {
      const itemData = formData.auditItems[item.id] || {};
      const status = itemData.status || '';
      const notes = itemData.notes || '';

      const hasNotes = notes.length > 0;
      const rowHeight = hasNotes ? 14 : 8;

      checkNewPage(rowHeight + 2);

      // Row background
      const isEven = index % 2 === 0;
      if (!isEven) {
        doc.setFillColor(...LIGHT_GRAY);
        doc.rect(margin, yPos, contentWidth, rowHeight, 'F');
      }

      // Border
      doc.setDrawColor(...BORDER_COLOR);
      doc.setLineWidth(0.1);
      doc.rect(margin, yPos, contentWidth, rowHeight, 'S');

      // Item number
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...LIGHT_TEXT);
      doc.text(String(index + 1).padStart(2, '0'), margin + 2, yPos + 5);

      // Item text
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEXT_COLOR);
      const maxWidth = contentWidth - 45;
      const lines = doc.splitTextToSize(item.label, maxWidth);
      doc.text(lines[0], margin + 12, yPos + 5);

      // Status
      let statusText = '';
      let statusColor = LIGHT_TEXT;

      if (status === 'yes') {
        statusText = 'YES';
        statusColor = COMPLIANT_COLOR;
      } else if (status === 'no') {
        statusText = 'NO';
        statusColor = NONCOMPLIANT_COLOR;
      } else if (status === 'na') {
        statusText = 'N/A';
        statusColor = NEUTRAL_COLOR;
      }

      if (statusText) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...statusColor);
        doc.text(statusText, pageWidth - margin - 3, yPos + 5, { align: 'right' });
      }

      // Notes
      if (hasNotes) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...LIGHT_TEXT);
        const noteLines = doc.splitTextToSize('Note: ' + notes, maxWidth - 10);
        doc.text(noteLines[0], margin + 12, yPos + 11);
      }

      yPos += rowHeight;
    });
  }

  // === BUILD PDF ===

  yPos = addHeader(true);

  // Project Information
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_COLOR);
  doc.text('Project Information', margin, yPos);
  yPos += 6;

  const projectInfo = formData.projectInfo;
  drawInfoTable([
    { label: 'Project Code', value: projectInfo.projectCode },
    { label: 'Audit Date', value: projectInfo.auditDate },
    { label: 'Site Name', value: projectInfo.siteName },
    { label: 'Project Manager', value: projectInfo.projectManager },
    { label: 'Site Address', value: projectInfo.siteAddress },
    { label: 'Auditor', value: projectInfo.auditor },
  ]);

  yPos += 10;

  // Audit Sections
  Object.entries(auditSections).forEach(([sectionId, section]) => {
    addSectionHeader(section.title, section.items.length);
    addAuditItemsTable(section.items, formData);
    yPos += 6;
  });

  // Sign-off Section
  checkNewPage(70);
  addSectionHeader('Sign-off & Approval', null);

  const signoff = formData.signoff;

  // Comments box
  if (signoff.comments) {
    doc.setFillColor(...LIGHT_BLUE);
    doc.roundedRect(margin, yPos, contentWidth, 20, 2, 2, 'F');
    doc.setDrawColor(...PRIMARY_COLOR);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, yPos, contentWidth, 20, 2, 2, 'S');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('Comments:', margin + 4, yPos + 6);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_COLOR);
    const commentLines = doc.splitTextToSize(signoff.comments, contentWidth - 10);
    doc.text(commentLines.slice(0, 2), margin + 4, yPos + 12);
    yPos += 25;
  }

  // Signature box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...PRIMARY_COLOR);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, contentWidth, 45, 2, 2, 'S');

  // Header bar
  doc.setFillColor(...LIGHT_BLUE);
  doc.rect(margin + 0.25, yPos + 0.25, contentWidth - 0.5, 10, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('Project Manager Approval', margin + 4, yPos + 7);

  // Name and Date
  yPos += 15;
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_COLOR);

  doc.setFont('helvetica', 'bold');
  doc.text('Name:', margin + 4, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(signoff.projectManagerName || '-', margin + 22, yPos);

  doc.setFont('helvetica', 'bold');
  doc.text('Date:', margin + 100, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(signoff.projectManagerDate || '-', margin + 115, yPos);

  // Signature
  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Signature:', margin + 4, yPos);

  if (signoff.projectManagerSignature && signoff.projectManagerSignature.startsWith('data:image')) {
    try {
      doc.addImage(signoff.projectManagerSignature, 'PNG', margin + 30, yPos - 8, 55, 22);
    } catch (e) {
      console.warn('Could not add signature to PDF:', e);
    }
  }

  // Add footers
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

  return doc;
}

export async function downloadPdf(formData, fileName) {
  const doc = await generateAuditPdf(formData);
  doc.save(fileName);
}

export async function getPdfBlob(formData) {
  const doc = await generateAuditPdf(formData);
  return doc.output('blob');
}
