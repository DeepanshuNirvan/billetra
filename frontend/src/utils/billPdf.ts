import { billsApi } from '../api/bills';

// Trigger a browser download for a blob.
export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Download a saved bill's PDF straight from the backend (single source of truth).
export async function downloadSavedBillPdf(id: string, invoiceNumber: string) {
  const blob = await billsApi.downloadPdf(id);
  triggerDownload(blob, `Invoice-${invoiceNumber}.pdf`);
}

// Open a blob in a new tab and trigger the print dialog.
export function printPdfBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.addEventListener('load', () => {
      try {
        win.focus();
        win.print();
      } catch {
        /* some browsers block programmatic print; user can print manually */
      }
    });
  }
}

export async function printSavedBillPdf(id: string) {
  const blob = await billsApi.downloadPdf(id);
  printPdfBlob(blob);
}
