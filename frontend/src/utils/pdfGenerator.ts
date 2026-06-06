import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Bill, Business } from '../types';
import { formatCurrency, formatDate } from './format';

export function downloadBillPdf(bill: Bill, business?: Business | null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Colors
  const primaryColor: [number, number, number] = [79, 70, 229]; // primary-600
  const gray: [number, number, number] = [107, 114, 128];
  const darkGray: [number, number, number] = [17, 24, 39];

  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Business name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(business?.name ?? 'Your Business', margin, 15);

  // Invoice label
  doc.setFontSize(11);
  doc.text('TAX INVOICE', pageWidth - margin, 12, { align: 'right' });
  doc.setFontSize(14);
  doc.text(`#${bill.invoiceNumber}`, pageWidth - margin, 22, { align: 'right' });

  // GSTIN under name
  if (business?.gstin) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`GSTIN: ${business.gstin}`, margin, 22);
  }

  let y = 45;

  // Business address
  doc.setTextColor(...gray);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  if (business?.address) {
    doc.text(`${business.address}, ${business.city ?? ''}, ${business.state ?? ''} - ${business.pincode ?? ''}`, margin, y);
    y += 5;
  }
  if (business?.phone) {
    doc.text(`Ph: ${business.phone}  |  ${business.email ?? ''}`, margin, y);
    y += 5;
  }

  y += 3;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Bill To + Bill Info two-column
  const col2X = pageWidth / 2 + 5;
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', margin, y);
  doc.text('INVOICE DETAILS', col2X, y);

  y += 5;
  doc.setTextColor(...darkGray);
  doc.setFont('helvetica', 'normal');

  if (bill.customer) {
    doc.setFont('helvetica', 'bold');
    doc.text(bill.customer.name, margin, y);
    doc.setFont('helvetica', 'normal');
    y += 4;
    if (bill.customer.gstin) { doc.text(`GSTIN: ${bill.customer.gstin}`, margin, y); y += 4; }
    if (bill.customer.billingAddress) { doc.text(bill.customer.billingAddress, margin, y, { maxWidth: 80 }); y += 8; }
    if (bill.customer.phone) { doc.text(`Ph: ${bill.customer.phone}`, margin, y); }
  } else {
    doc.text('Walk-in Customer', margin, y);
  }

  // Right column info
  let infoY = y - (bill.customer ? 13 : 0);
  const infoItems = [
    ['Date:', formatDate(bill.billDate)],
    ['Due Date:', bill.dueDate ? formatDate(bill.dueDate) : 'N/A'],
    ['Tax Type:', bill.isInterstate ? 'IGST' : 'CGST + SGST'],
    ['Status:', bill.status.toUpperCase()],
  ];
  infoItems.forEach(([label, val]) => {
    doc.setTextColor(...gray);
    doc.text(label, col2X, infoY);
    doc.setTextColor(...darkGray);
    doc.text(val, pageWidth - margin, infoY, { align: 'right' });
    infoY += 5;
  });

  y += 15;
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // Items table
  const tableRows = bill.items.map((item, i) => [
    String(i + 1),
    item.name,
    item.hsnCode ?? '-',
    `${item.quantity} ${item.unit ?? ''}`,
    formatCurrency(item.price),
    item.discountAmount > 0 ? formatCurrency(item.discountAmount) : '-',
    `${item.gstRate}%`,
    formatCurrency(item.total),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Item', 'HSN', 'Qty', 'Rate', 'Discount', 'GST%', 'Amount']],
    body: tableRows,
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: { fontSize: 8, textColor: darkGray },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 8 },
      7: { halign: 'right', fontStyle: 'bold' },
    },
  });

  let finalY: number = (doc as any).lastAutoTable.finalY + 8;

  // Totals section (right-aligned)
  const totalsX = pageWidth - margin - 80;
  const totalsValueX = pageWidth - margin;

  const addTotalRow = (label: string, value: string, bold = false, color?: [number, number, number]) => {
    doc.setFontSize(bold ? 10 : 8);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...(color ?? (bold ? darkGray : gray)));
    doc.text(label, totalsX, finalY);
    doc.text(value, totalsValueX, finalY, { align: 'right' });
    finalY += 5;
  };

  addTotalRow('Subtotal', formatCurrency(bill.subtotal));
  if (bill.discountAmount > 0) addTotalRow('Discount', `-${formatCurrency(bill.discountAmount)}`);
  addTotalRow('Taxable Amount', formatCurrency(bill.taxableAmount));

  if (bill.isInterstate) {
    addTotalRow('IGST', formatCurrency(bill.igstAmount));
  } else {
    addTotalRow('CGST', formatCurrency(bill.cgstAmount));
    addTotalRow('SGST', formatCurrency(bill.sgstAmount));
  }

  doc.setDrawColor(229, 231, 235);
  doc.line(totalsX, finalY, totalsValueX, finalY);
  finalY += 4;
  addTotalRow('Grand Total', formatCurrency(bill.totalAmount), true, primaryColor);

  // Notes
  if (bill.notes) {
    finalY += 8;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...gray);
    doc.text('NOTES', margin, finalY);
    finalY += 4;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkGray);
    doc.text(bill.notes, margin, finalY, { maxWidth: pageWidth - margin * 2 });
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(...gray);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Generated by Billetra • GST Billing for Indian SMBs',
    pageWidth / 2,
    pageHeight - 8,
    { align: 'center' }
  );

  doc.save(`Invoice-${bill.invoiceNumber}.pdf`);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToCsv(headers: string[], rows: (string | number)[][], filename: string) {
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => (typeof cell === 'string' ? `"${cell.replace(/"/g, '""')}"` : cell)).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}
