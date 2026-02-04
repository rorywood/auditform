import { jsPDF } from 'jspdf';
import { auditSections } from '../config/auditItems';

const PRIMARY_COLOR = [0, 82, 147];
const LIGHT_BLUE = [240, 247, 255];
const LIGHT_GRAY = [248, 250, 252];
const BORDER_COLOR = [220, 225, 230];
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
  const margin = 18;
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
          doc.addImage(logoData, 'PNG', margin, 15, 55, 28);
        } catch (e) {
          console.warn('Could not add logo to PDF:', e);
        }
      }

      // Title block on right
      doc.setFillColor(...PRIMARY_COLOR);
      doc.roundedRect(pageWidth - margin - 75, 15, 75, 28, 3, 3, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Projects Audit', pageWidth - margin - 37.5, 27, { align: 'center' });
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Form', pageWidth - margin - 37.5, 38, { align: 'center' });

      // Accent line
      doc.setFillColor(...PRIMARY_COLOR);
      doc.rect(margin, 50, contentWidth, 2, 'F');

      return 62;
    }
    return margin + 10;
  }

  function addFooter(pageNum, totalPages) {
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);

    doc.setFontSize(9);
    doc.setTextColor(...LIGHT_TEXT);
    doc.text('Powertec Telecommunications Pty Ltd', margin, pageHeight - 12);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, pageHeight - 12, { align: 'center' });
    doc.text(new Date().toLocaleDateString('en-AU'), pageWidth - margin, pageHeight - 12, { align: 'right' });
  }

  function checkNewPage(requiredSpace = 30) {
    if (yPos + requiredSpace > pageHeight - 30) {
      doc.addPage();
      yPos = addHeader(false);
      return true;
    }
    return false;
  }

  function addSectionHeader(title, itemCount) {
    checkNewPage(35);

    yPos += 5;

    doc.setFillColor(...PRIMARY_COLOR);
    doc.roundedRect(margin, yPos, contentWidth, 12, 2, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), margin + 6, yPos + 8.5);

    if (itemCount) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`${itemCount} items`, pageWidth - margin - 6, yPos + 8.5, { align: 'right' });
    }

    yPos += 18;
  }

  function drawProjectInfoTable(data) {
    const rowHeight = 12;

    data.forEach((item, index) => {
      const isEven = index % 2 === 0;
      if (isEven) {
        doc.setFillColor(255, 255, 255);
      } else {
        doc.setFillColor(...LIGHT_GRAY);
      }
      doc.rect(margin, yPos, contentWidth, rowHeight, 'F');

      doc.setDrawColor(...BORDER_COLOR);
      doc.setLineWidth(0.3);
      doc.rect(margin, yPos, contentWidth, rowHeight, 'S');

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PRIMARY_COLOR);
      doc.text(item.label + ':', margin + 5, yPos + 8);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEXT_COLOR);
      doc.text(item.value || '-', margin + 55, yPos + 8);

      yPos += rowHeight;
    });
  }

  function addAuditItem(item, itemData, index) {
    const status = itemData.status || '';
    const notes = itemData.notes || '';
    const hasNotes = notes.length > 0;
    const rowHeight = hasNotes ? 20 : 12;

    checkNewPage(rowHeight + 5);

    // Row background
    const isEven = index % 2 === 0;
    if (isEven) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(...LIGHT_GRAY);
    }
    doc.rect(margin, yPos, contentWidth, rowHeight, 'F');

    // Border
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.2);
    doc.rect(margin, yPos, contentWidth, rowHeight, 'S');

    // Item number
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...LIGHT_TEXT);
    doc.text(String(index + 1) + '.', margin + 4, yPos + 8);

    // Item text
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_COLOR);
    const maxWidth = contentWidth - 50;
    const lines = doc.splitTextToSize(item.label, maxWidth);
    doc.text(lines[0], margin + 15, yPos + 8);

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
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...statusColor);
      doc.text(statusText, pageWidth - margin - 5, yPos + 8, { align: 'right' });
    }

    // Notes
    if (hasNotes) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...LIGHT_TEXT);
      const noteLines = doc.splitTextToSize('Note: ' + notes, maxWidth);
      doc.text(noteLines[0], margin + 15, yPos + 16);
    }

    yPos += rowHeight;
  }

  // === BUILD PDF ===

  yPos = addHeader(true);

  // Project Information
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_COLOR);
  doc.text('Project Information', margin, yPos);
  yPos += 8;

  const projectInfo = formData.projectInfo;
  drawProjectInfoTable([
    { label: 'Project Code', value: projectInfo.projectCode },
    { label: 'Site Name', value: projectInfo.siteName },
    { label: 'Site Address', value: projectInfo.siteAddress },
    { label: 'Project Manager', value: projectInfo.projectManager },
    { label: 'Auditor', value: projectInfo.auditor },
    { label: 'Audit Date', value: projectInfo.auditDate },
  ]);

  yPos += 8;

  // Audit Sections
  Object.entries(auditSections).forEach(([sectionId, section]) => {
    addSectionHeader(section.title, section.items.length);

    section.items.forEach((item, index) => {
      const itemData = formData.auditItems[item.id] || {};
      addAuditItem(item, itemData, index);
    });

    yPos += 4;
  });

  // Sign-off Section
  checkNewPage(85);
  addSectionHeader('Sign-off & Approval', null);

  const signoff = formData.signoff;

  // Comments box
  if (signoff.comments) {
    doc.setFillColor(...LIGHT_BLUE);
    doc.roundedRect(margin, yPos, contentWidth, 28, 3, 3, 'F');
    doc.setDrawColor(...PRIMARY_COLOR);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, yPos, contentWidth, 28, 3, 3, 'S');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('Comments:', margin + 6, yPos + 10);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_COLOR);
    const commentLines = doc.splitTextToSize(signoff.comments, contentWidth - 15);
    doc.text(commentLines.slice(0, 2), margin + 6, yPos + 20);
    yPos += 35;
  }

  // Signature box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...PRIMARY_COLOR);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, yPos, contentWidth, 55, 3, 3, 'S');

  // Header bar
  doc.setFillColor(...LIGHT_BLUE);
  doc.rect(margin + 0.4, yPos + 0.4, contentWidth - 0.8, 14, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('Project Manager Approval', margin + 6, yPos + 10);

  // Name and Date row
  yPos += 22;
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_COLOR);

  doc.setFont('helvetica', 'bold');
  doc.text('Name:', margin + 6, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(signoff.projectManagerName || '-', margin + 30, yPos);

  doc.setFont('helvetica', 'bold');
  doc.text('Date:', margin + 110, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(signoff.projectManagerDate || '-', margin + 130, yPos);

  // Signature row
  yPos += 12;
  doc.setFont('helvetica', 'bold');
  doc.text('Signature:', margin + 6, yPos);

  if (signoff.projectManagerSignature && signoff.projectManagerSignature.startsWith('data:image')) {
    try {
      doc.addImage(signoff.projectManagerSignature, 'PNG', margin + 40, yPos - 12, 60, 28);
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
