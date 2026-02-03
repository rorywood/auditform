import { jsPDF } from 'jspdf';
import { auditSections } from '../config/auditItems';

const PRIMARY_COLOR = [0, 82, 147];
const TEXT_COLOR = [51, 51, 51];
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
  const margin = 20;
  let yPos = margin;

  let logoData = null;
  try {
    logoData = await loadImage('/logo.png');
  } catch (e) {
    console.warn('Could not load logo for PDF:', e);
  }

  function addHeader() {
    doc.setFillColor(...PRIMARY_COLOR);
    doc.rect(0, 0, pageWidth, 35, 'F');

    if (logoData) {
      try {
        doc.addImage(logoData, 'PNG', margin, 8, 40, 20);
      } catch (e) {
        console.warn('Could not add logo to PDF:', e);
      }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Project Audit Form', logoData ? margin + 45 : margin, 22);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin, 22, { align: 'right' });

    return 45;
  }

  function addFooter(pageNum) {
    doc.setTextColor(...TEXT_COLOR);
    doc.setFontSize(8);
    doc.text(
      `Page ${pageNum}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  function checkNewPage(requiredSpace = 30) {
    if (yPos + requiredSpace > pageHeight - 20) {
      addFooter(doc.internal.getNumberOfPages());
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  }

  function addSectionTitle(title) {
    checkNewPage(25);
    doc.setFillColor(...PRIMARY_COLOR);
    doc.rect(margin, yPos, pageWidth - margin * 2, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 5, yPos + 7);
    yPos += 15;
  }

  yPos = addHeader();

  doc.setTextColor(...TEXT_COLOR);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Project Information', margin, yPos);
  yPos += 10;

  const projectInfo = formData.projectInfo;
  const infoFields = [
    ['Project Code', projectInfo.projectCode || '-'],
    ['Site Name', projectInfo.siteName || '-'],
    ['Site Address', projectInfo.siteAddress || '-'],
    ['Project Manager', projectInfo.projectManager || '-'],
    ['Auditor', projectInfo.auditor || '-'],
    ['Audit Date', projectInfo.auditDate || '-'],
  ];

  doc.setFontSize(10);
  infoFields.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 45, yPos);
    yPos += 6;
  });

  yPos += 10;

  Object.entries(auditSections).forEach(([sectionId, section]) => {
    addSectionTitle(section.title);

    section.items.forEach((item) => {
      checkNewPage(15);

      const itemData = formData.auditItems[item.id] || {};
      const status = itemData.status || 'Not answered';
      const notes = itemData.notes || '';

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEXT_COLOR);

      const labelLines = doc.splitTextToSize(item.label, pageWidth - margin * 2 - 40);
      doc.text(labelLines, margin, yPos);

      let statusColor = TEXT_COLOR;
      let statusText = status.toUpperCase();
      if (status === 'yes') {
        statusColor = COMPLIANT_COLOR;
        statusText = 'YES';
      } else if (status === 'no') {
        statusColor = NONCOMPLIANT_COLOR;
        statusText = 'NO';
      } else if (status === 'na') {
        statusColor = NEUTRAL_COLOR;
        statusText = 'N/A';
      }

      doc.setTextColor(...statusColor);
      doc.setFont('helvetica', 'bold');
      doc.text(statusText, pageWidth - margin, yPos, { align: 'right' });

      yPos += labelLines.length * 5;

      if (notes) {
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        const noteLines = doc.splitTextToSize(`Notes: ${notes}`, pageWidth - margin * 2 - 10);
        doc.text(noteLines, margin + 5, yPos);
        yPos += noteLines.length * 4 + 2;
      }

      yPos += 3;
    });

    yPos += 5;
  });

  checkNewPage(100);
  addSectionTitle('Sign-off');

  const signoff = formData.signoff;

  doc.setTextColor(...TEXT_COLOR);
  doc.setFontSize(10);

  if (signoff.comments) {
    doc.setFont('helvetica', 'bold');
    doc.text('Additional Comments:', margin, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    const commentLines = doc.splitTextToSize(signoff.comments, pageWidth - margin * 2);
    doc.text(commentLines, margin, yPos);
    yPos += commentLines.length * 5 + 10;
  }

  doc.setFont('helvetica', 'bold');
  doc.text('Project Manager Sign-off', margin, yPos);
  yPos += 10;

  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${signoff.projectManagerName || '-'}`, margin, yPos);
  yPos += 8;

  doc.text('Signature:', margin, yPos);
  yPos += 4;

  // Add signature image
  const sigWidth = 60;
  const sigHeight = 25;

  if (signoff.projectManagerSignature && signoff.projectManagerSignature.startsWith('data:image')) {
    try {
      doc.addImage(signoff.projectManagerSignature, 'PNG', margin, yPos, sigWidth, sigHeight);
    } catch (e) {
      console.warn('Could not add PM signature to PDF:', e);
    }
  }

  yPos += sigHeight + 6;

  doc.text(`Date: ${signoff.projectManagerDate || '-'}`, margin, yPos);

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i);
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
