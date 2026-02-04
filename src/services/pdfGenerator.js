import { jsPDF } from 'jspdf';
import { auditSections } from '../config/auditItems';

const PRIMARY = [0, 82, 147];
const DARK_TEXT = [31, 41, 55];
const GRAY_TEXT = [107, 114, 128];
const LIGHT_BG = [249, 250, 251];
const BORDER = [229, 231, 235];
const GREEN = [34, 197, 94];
const RED = [239, 68, 68];
const GRAY = [156, 163, 175];

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
  const contentWidth = pageWidth - margin * 2;
  let yPos = 0;

  let logoData = null;
  try {
    logoData = await loadImage('/logo.png');
  } catch (e) {
    console.warn('Could not load logo:', e);
  }

  // ============ HEADER ============
  function drawHeader() {
    // White background with bottom border
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 45, 'F');
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.5);
    doc.line(0, 45, pageWidth, 45);

    // Logo - proper aspect ratio
    if (logoData) {
      doc.addImage(logoData, 'PNG', margin, 12, 40, 20);
    }

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...PRIMARY);
    doc.text('Projects Audit Form', pageWidth - margin, 25, { align: 'right' });

    // Subtitle with date and time
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...GRAY_TEXT);
    const now = new Date();
    const dateTime = `${now.toLocaleDateString('en-AU')} ${now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`;
    doc.text(`Generated ${dateTime}`, pageWidth - margin, 35, { align: 'right' });

    return 55;
  }

  // ============ FOOTER ============
  function drawFooter(pageNum, totalPages) {
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY_TEXT);
    doc.text('Powertec Telecommunications', margin, pageHeight - 8);
    doc.text(`${pageNum} / ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  // ============ NEW PAGE CHECK ============
  function needsNewPage(space = 20) {
    if (yPos + space > pageHeight - 25) {
      doc.addPage();
      yPos = 20;
      return true;
    }
    return false;
  }

  // ============ SECTION TITLE ============
  function drawSectionTitle(title) {
    needsNewPage(30);
    yPos += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...PRIMARY);
    doc.text(title, margin, yPos);

    // Underline
    doc.setDrawColor(...PRIMARY);
    doc.setLineWidth(0.8);
    doc.line(margin, yPos + 3, margin + doc.getTextWidth(title), yPos + 3);

    yPos += 12;
  }

  // ============ PROJECT INFO ============
  function drawProjectInfo(info) {
    const fields = [
      { label: 'Project Code', value: info.projectCode },
      { label: 'Site Name', value: info.siteName },
      { label: 'Site Address', value: info.siteAddress },
      { label: 'Project Manager', value: info.projectManager },
      { label: 'Auditor', value: info.auditor },
      { label: 'Audit Date', value: info.auditDate },
    ];

    fields.forEach((field, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(...LIGHT_BG);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(margin, yPos, contentWidth, 11, 'F');
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.2);
      doc.rect(margin, yPos, contentWidth, 11, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...DARK_TEXT);
      doc.text(field.label, margin + 5, yPos + 7.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...DARK_TEXT);
      doc.text(field.value || '—', margin + 55, yPos + 7.5);

      yPos += 11;
    });
  }

  // ============ AUDIT ITEMS ============
  function drawAuditItems(section) {
    const RED_BG = [254, 242, 242]; // Light red background for non-compliant
    const GREEN_BG = [240, 253, 244]; // Light green background for compliant with notes

    section.items.forEach((item, i) => {
      const data = formData.auditItems[item.id] || {};
      const status = data.status || '';
      const notes = data.notes || '';
      const hasNotes = notes.length > 0;
      const isNonCompliant = status === 'no';
      const isCompliantWithNotes = status === 'yes' && hasNotes;
      const height = hasNotes ? 18 : 11;

      needsNewPage(height + 3);

      // Background - red for non-compliant, green for compliant with notes, alternating for others
      if (isNonCompliant) {
        doc.setFillColor(...RED_BG);
      } else if (isCompliantWithNotes) {
        doc.setFillColor(...GREEN_BG);
      } else if (i % 2 === 0) {
        doc.setFillColor(255, 255, 255);
      } else {
        doc.setFillColor(...LIGHT_BG);
      }
      doc.rect(margin, yPos, contentWidth, height, 'F');

      // Border - red outline for non-compliant items
      if (isNonCompliant) {
        doc.setDrawColor(...RED);
        doc.setLineWidth(0.5);
      } else {
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.15);
      }
      doc.rect(margin, yPos, contentWidth, height, 'S');

      // Number
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...(isNonCompliant ? RED : GRAY_TEXT));
      doc.text(`${i + 1}.`, margin + 4, yPos + 7.5);

      // Label - red text for non-compliant
      doc.setFont('helvetica', isNonCompliant ? 'bold' : 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...(isNonCompliant ? RED : DARK_TEXT));
      const labelText = doc.splitTextToSize(item.label, contentWidth - 55);
      doc.text(labelText[0], margin + 14, yPos + 7.5);

      // Status
      if (status) {
        let color = GRAY;
        let text = 'N/A';
        if (status === 'yes') { color = GREEN; text = 'YES'; }
        if (status === 'no') { color = RED; text = 'NO'; }
        if (status === 'na') { color = GRAY; text = 'N/A'; }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...color);
        doc.text(text, pageWidth - margin - 5, yPos + 7.5, { align: 'right' });
      }

      // Notes - red for non-compliant, gray for others
      if (hasNotes) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(...(isNonCompliant ? RED : GRAY_TEXT));
        const noteText = doc.splitTextToSize(notes, contentWidth - 25);
        doc.text(noteText[0], margin + 14, yPos + 14);
      }

      yPos += height;
    });
  }

  // ============ SIGN-OFF ============
  function drawSignoff() {
    const signoff = formData.signoff;

    // Comments
    if (signoff.comments) {
      doc.setFillColor(...LIGHT_BG);
      doc.roundedRect(margin, yPos, contentWidth, 25, 2, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...DARK_TEXT);
      doc.text('Comments:', margin + 5, yPos + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const comments = doc.splitTextToSize(signoff.comments, contentWidth - 15);
      doc.text(comments.slice(0, 2), margin + 5, yPos + 16);

      yPos += 30;
    }

    // Signature box
    doc.setDrawColor(...PRIMARY);
    doc.setLineWidth(1);
    doc.roundedRect(margin, yPos, contentWidth, 50, 3, 3, 'S');

    // Title bar
    doc.setFillColor(...PRIMARY);
    doc.rect(margin + 0.5, yPos + 0.5, contentWidth - 1, 12, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('Project Manager Approval', margin + 8, yPos + 9);

    // Details
    const detailY = yPos + 22;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...DARK_TEXT);

    doc.setFont('helvetica', 'bold');
    doc.text('Name:', margin + 8, detailY);
    doc.setFont('helvetica', 'normal');
    doc.text(signoff.projectManagerName || '—', margin + 30, detailY);

    doc.setFont('helvetica', 'bold');
    doc.text('Date:', margin + 100, detailY);
    doc.setFont('helvetica', 'normal');
    doc.text(signoff.projectManagerDate || '—', margin + 118, detailY);

    // Signature
    doc.setFont('helvetica', 'bold');
    doc.text('Signature:', margin + 8, detailY + 15);

    if (signoff.projectManagerSignature?.startsWith('data:image')) {
      try {
        // Smaller signature that maintains aspect ratio
        doc.addImage(signoff.projectManagerSignature, 'PNG', margin + 40, detailY + 5, 40, 16);
      } catch (e) {
        console.warn('Could not add signature:', e);
      }
    }
  }

  // ============ BUILD PDF ============
  yPos = drawHeader();

  drawSectionTitle('Project Information');
  drawProjectInfo(formData.projectInfo);

  yPos += 5;

  Object.entries(auditSections).forEach(([id, section]) => {
    drawSectionTitle(section.title);
    drawAuditItems(section);
    yPos += 3;
  });

  needsNewPage(80);
  drawSectionTitle('Sign-off');
  drawSignoff();

  // Add footers
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(i, total);
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
