import { useRef, useState } from 'react';
import { Download, Upload, FileDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { downloadTemplate, exportToExcel, exportToPDF, parseExcelFile } from '../../utils/excelUtils';

interface Column { header: string; dataKey: string }

interface BulkActionsProps {
  type: 'products' | 'customers';
  exportData: Record<string, unknown>[];
  exportColumns: Column[];
  onImport: (rows: Record<string, unknown>[]) => Promise<{ created: number; errors: string[] }>;
}

export function BulkActions({ type, exportData, exportColumns, onImport }: BulkActionsProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: string[] } | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const rows = await parseExcelFile(file);
      const res = await onImport(rows);
      setResult(res);
    } catch (err: unknown) {
      setResult({ created: 0, errors: [(err as Error).message] });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const filename = type === 'products' ? 'products' : 'customers';
  const title = type === 'products' ? 'Products Export' : 'Customers Export';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Download className="h-3.5 w-3.5" />}
          onClick={() => downloadTemplate(type)}
        >
          Template
        </Button>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Upload className="h-3.5 w-3.5" />}
          loading={importing}
          onClick={() => fileRef.current?.click()}
        >
          Import Excel
        </Button>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<FileDown className="h-3.5 w-3.5" />}
          onClick={() => exportToExcel(exportData, filename)}
        >
          Export XLS
        </Button>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<FileDown className="h-3.5 w-3.5" />}
          onClick={() => exportToPDF(title, exportColumns, exportData, filename)}
        >
          Export PDF
        </Button>
      </div>

      <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />

      {result && (
        <div className={`text-xs rounded-lg px-3 py-2 ${result.errors.length ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-800'}`}>
          {result.created > 0 && <span>{result.created} records imported. </span>}
          {result.errors.length > 0 && (
            <details>
              <summary className="cursor-pointer font-medium">{result.errors.length} errors</summary>
              <ul className="mt-1 list-disc list-inside space-y-0.5">
                {result.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
