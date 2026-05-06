import { useState, useRef } from 'react';
import { Upload, FileText, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useBulkUpload } from '../../hooks/useProducts';
import { clsx } from 'clsx';

interface BulkUploadProps {
  open: boolean;
  onClose: () => void;
}

const CSV_TEMPLATE = `name,sku,hsnCode,unitType,sellingPrice,purchasePrice,gstRate,stockQuantity,lowStockAlert
Laptop,LAP001,8471,Pieces,50000,40000,18,10,2
Mouse,MSE001,8471,Pieces,500,350,18,50,10`;

export function BulkUpload({ open, onClose }: BulkUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ created: number; errors: string[] } | null>(null);
  const bulkUpload = useBulkUpload();

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv')) return;
    setSelectedFile(file);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    const res = await bulkUpload.mutateAsync(selectedFile);
    setResult(res);
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bulk Upload Products"
      description="Upload a CSV file to add multiple products at once"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button
            onClick={handleUpload}
            loading={bulkUpload.isPending}
            disabled={!selectedFile}
          >
            Upload
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Download className="h-4 w-4" />}
          onClick={downloadTemplate}
        >
          Download CSV Template
        </Button>

        <div
          className={clsx(
            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
            dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
          )}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          {selectedFile ? (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
              <FileText className="h-4 w-4 text-indigo-500" />
              <span className="font-medium">{selectedFile.name}</span>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700">Drop CSV file here or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">Only .csv files supported</p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>

        {result && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>{result.created} products created successfully</span>
            </div>
            {result.errors.length > 0 && (
              <div className="rounded-lg bg-red-50 p-3">
                <div className="flex items-center gap-2 text-red-600 text-sm font-medium mb-2">
                  <AlertCircle className="h-4 w-4" />
                  {result.errors.length} errors
                </div>
                <ul className="text-xs text-red-500 space-y-1 max-h-32 overflow-y-auto">
                  {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
