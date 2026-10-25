import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export interface LocationQrExportItem {
  id: string;
  code?: string;
  label: string;
  sequence: number;
  scanUrl?: string;
}

export async function generateLocationQrsPdf({
  eventName: _eventName,
  checkpoints,
  getScanUrl,
}: {
  eventName?: string;
  checkpoints: LocationQrExportItem[];
  getScanUrl?(checkpoint: LocationQrExportItem): Promise<string> | string;
}): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // 8 QRs per page arranged in a 2 column x 4 row grid
  const qrSize = 50; // 50mm x 50mm QR code
  const colCenters = [58, 152]; // Centers for 2 columns on A4 (210mm wide)
  const topMargin = 16;
  const rowHeight = 68;

  for (let index = 0; index < checkpoints.length; index++) {
    const indexOnPage = index % 8;
    if (index > 0 && indexOnPage === 0) {
      doc.addPage();
    }

    const cp = checkpoints[index];
    let scanUrl = cp.scanUrl;
    if (!scanUrl && getScanUrl) {
      scanUrl = await getScanUrl(cp);
    }
    if (!scanUrl) {
      scanUrl = `checkpoint-${cp.id}`;
    }

    // High resolution QR code image
    const qrDataUrl = await QRCode.toDataURL(scanUrl, {
      width: 600,
      margin: 2,
      errorCorrectionLevel: 'M',
    });

    const col = indexOnPage % 2;
    const row = Math.floor(indexOnPage / 2);

    const colCenter = colCenters[col];
    const qrX = colCenter - qrSize / 2;
    const qrY = topMargin + row * rowHeight;

    // Render QR Code
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    // Render Location below the QR
    const displayText = cp.code ? `${cp.code} · ${cp.label}` : cp.label;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42); // slate-900

    const textLines = doc.splitTextToSize(displayText, 85);
    const textY = qrY + qrSize + 5;
    doc.text(textLines, colCenter, textY, { align: 'center' });
  }

  return doc;
}
