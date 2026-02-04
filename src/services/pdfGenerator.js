import { jsPDF } from 'jspdf';
import { auditSections } from '../config/auditItems';

const PRIMARY_COLOR = [0, 82, 147];
const LIGHT_GRAY = [245, 245, 245];
const BORDER_GRAY = [200, 200, 200];
const TEXT_COLOR = [51, 51, 51];
const LIGHT_TEXT = [100, 100, 100];
const COMPLIANT_COLOR = [34, 197, 94];
const NONCOMPLIANT_COLOR = [239, 68, 68];
const NEUTRAL_COLOR = [156, 163, 175];

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

  function addHeader() {
    // White header with blue accent line
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Blue accent line at bottom of header
    doc.setFillColor(...PRIMARY_COLOR);
    doc.rect(0, 38, pageWidth, 3, 'F');

    // Logo on left
    if (logoData) {
      try {
        doc.addImage(logoData, 'PNG', margin, 8, 45, 22);
      } catch (e) {
        console.warn('Could not add logo to PDF:', e);
      }
    }

    // Title
    doc.setTextColor(...PRIMARY_COLOR);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Project Audit Form', pageWidth - margin, 18, { align: 'right' });

    // Date
    doc.setTextColor(...LIGHT_TEXT);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString('en-AU')}`, pageWidth - margin, 28, { align: 'right' });

    return 50;
  }

  function addFooter(pageNum, totalPages) {
    // Footer line
    doc.setDrawColor(...BORDER_GRAY);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    doc.setTextColor(...LIGHT_TEXT);
    doc.setFontSize(8);
    doc.text('Powertec Telecommunications', margin, pageHeight - 8);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  function checkNewPage(requiredSpace = 30) {
    if (yPos + requiredSpace > pageHeight - 25) {
      doc.addPage();
      yPos = margin + 10;
      return true;
    }
    return false;
  }

  function addSectionTitle(title) {
    checkNewPage(25);

    // Section background
    doc.setFillColor(...PRIMARY_COLOR);
    doc.roundedRect(margin, yPos, contentWidth, 10, 2, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 5, yPos + 7);
    yPos += 15;
  }

  function addInfoRow(label, value, isLast = false) {
    const rowHeight = 8;
    const labelWidth = 45;

    // Alternating row background
    doc.setFillColor(...LIGHT_GRAY);
    doc.rect(margin, yPos - 1, contentWidth, rowHeight, 'F');

    // Border
    doc.setDrawColor(...BORDER_GRAY);
    doc.setLineWidth(0.2);
    doc.rect(margin, yPos - 1, contentWidth, rowHeight, 'S');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text(label, margin + 3, yPos + 4);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_COLOR);
    doc.text(value || '-', margin + labelWidth, yPos + 4);

    yPos += rowHeight;
  }

  function addAuditItem(item, itemData, index) {
    checkNewPage(18);

    const status = itemData.status || 'Not answered';
    const notes = itemData.notes || '';
    const rowHeight = notes ? 16 : 10;

    // Row background - alternating
    if (index % 2 === 0) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(...LIGHT_GRAY);
    }
    doc.rect(margin, yPos, contentWidth, rowHeight, 'F');

    // Border
    doc.setDrawColor(...BORDER_GRAY);
    doc.setLineWidth(0.1);
    doc.rect(margin, yPos, contentWidth, rowHeight, 'S');

    // Item number
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...LIGHT_TEXT);
    doc.text(`${index + 1}.`, margin + 3, yPos + 5);

    // Item label
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_COLOR);
    const labelLines = doc.splitTextToSize(item.label, contentWidth - 45);
    doc.text(labelLines[0], margin + 12, yPos + 5);
    if (labelLines.length > 1) {
      doc.text(labelLines[1], margin + 12, yPos + 9);
    }

    // Status badge
    let statusColor = NEUTRAL_COLOR;
    let statusText = 'N/A';
    let badgeColor = [240, 240, 240];

    if (status === 'yes') {
      statusColor = COMPLIANT_COLOR;
      statusText = 'YES';
      badgeColor = [220, 252, 231];
    } else if (status === 'no') {
      statusColor = NONCOMPLIANT_COLOR;
      statusText = 'NO';
      badgeColor = [254, 226, 226];
    } else if (status === 'na') {
      statusColor = NEUTRAL_COLOR;
      statusText = 'N/A';
      badgeColor = [243, 244, 246];
    }

    // Draw status badge
    const badgeX = pageWidth - margin - 22;
    const badgeY = yPos + 1;
    doc.setFillColor(...badgeColor);
    doc.roundedRect(badgeX, badgeY, 20, 6, 1, 1, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...statusColor);
    doc.text(statusText, badgeX + 10, badgeY + 4.5, { align: 'center' });

    // Notes if present
    if (notes) {
      doc.setTextColor(...LIGHT_TEXT);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      const noteText = doc.splitTextToSize(`Note: ${notes}`, contentWidth - 20);
      doc.text(noteText[0], margin + 12, yPos + 13);
    }

    yPos += rowHeight;
  }

  // Start building PDF
  yPos = addHeader();

  // Project Information Section
  doc.setTextColor(...PRIMARY_COLOR);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Project Information', margin, yPos);
  yPos += 8;

  const projectInfo = formData.projectInfo;
  addInfoRow('Project Code', projectInfo.projectCode);
  addInfoRow('Site Name', projectInfo.siteName);
  addInfoRow('Site Address', projectInfo.siteAddress);
  addInfoRow('Project Manager', projectInfo.projectManager);
  addInfoRow('Auditor', projectInfo.auditor);
  addInfoRow('Audit Date', projectInfo.auditDate, true);

  yPos += 12;

  // Audit Sections
  Object.entries(auditSections).forEach(([sectionId, section]) => {
    addSectionTitle(section.title);

    section.items.forEach((item, index) => {
      const itemData = formData.auditItems[item.id] || {};
      addAuditItem(item, itemData, index);
    });

    yPos += 8;
  });

  // Sign-off Section
  checkNewPage(80);
  addSectionTitle('Sign-off');

  const signoff = formData.signoff;

  // Comments
  if (signoff.comments) {
    doc.setFillColor(...LIGHT_GRAY);
    doc.roundedRect(margin, yPos, contentWidth, 25, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PRIMARY_COLOR);
    doc.setFontSize(9);
    doc.text('Additional Comments:', margin + 5, yPos + 6);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_COLOR);
    doc.setFontSize(8);
    const commentLines = doc.splitTextToSize(signoff.comments, contentWidth - 10);
    doc.text(commentLines.slice(0, 3), margin + 5, yPos + 13);
    yPos += 30;
  }

  // Project Manager Sign-off Box
  doc.setDrawColor(...PRIMARY_COLOR);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, contentWidth, 50, 2, 2, 'S');

  doc.setFillColor(...PRIMARY_COLOR);
  doc.roundedRect(margin, yPos, contentWidth, 8, 2, 0, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Project Manager Approval', margin + 5, yPos + 6);

  yPos += 12;

  // Name and Date row
  doc.setTextColor(...TEXT_COLOR);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Name:', margin + 5, yPos + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(signoff.projectManagerName || '-', margin + 25, yPos + 4);

  doc.setFont('helvetica', 'bold');
  doc.text('Date:', margin + 100, yPos + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(signoff.projectManagerDate || '-', margin + 115, yPos + 4);

  yPos += 10;

  // Signature
  doc.setFont('helvetica', 'bold');
  doc.text('Signature:', margin + 5, yPos + 4);

  if (signoff.projectManagerSignature && signoff.projectManagerSignature.startsWith('data:image')) {
    try {
      doc.addImage(signoff.projectManagerSignature, 'PNG', margin + 35, yPos - 5, 50, 25);
    } catch (e) {
      console.warn('Could not add PM signature to PDF:', e);
    }
  }

  // Add footers to all pages
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
