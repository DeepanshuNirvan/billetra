import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function downloadTemplate(type: 'products' | 'customers') {
  const configs = {
    products: {
      filename: 'products_template.xlsx',
      headers: ['name', 'sku', 'hsn_code', 'selling_price', 'cost_price', 'gst_rate', 'unit_type', 'stock_quantity', 'low_stock_alert', 'category_name'],
      sample: ['Sample Product', 'SKU001', '1234', '100', '80', '18', 'pcs', '50', '10', 'Electronics'],
    },
    customers: {
      filename: 'customers_template.xlsx',
      headers: ['name', 'email', 'phone', 'gstin', 'address', 'city', 'state', 'pincode'],
      sample: ['Acme Corp', 'acme@example.com', '9876543210', '27AABCU9603R1ZX', '123 MG Road', 'Mumbai', 'Maharashtra', '400001'],
    },
  };

  const cfg = configs[type];
  const ws = XLSX.utils.aoa_to_sheet([cfg.headers, cfg.sample]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, cfg.filename);
}

export function exportToExcel(data: Record<string, unknown>[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function parseExcelFile(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
        resolve(rows);
      } catch {
        reject(new Error('Failed to parse Excel file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
}

export function exportToPDF(
  title: string,
  columns: { header: string; dataKey: string }[],
  data: Record<string, unknown>[],
  filename: string
) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [columns.map((c) => c.header)],
    body: data.map((row) => columns.map((c) => String(row[c.dataKey] ?? ''))),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [79, 70, 229] },
    alternateRowStyles: { fillColor: [248, 249, 250] },
  });

  doc.save(`${filename}.pdf`);
}
