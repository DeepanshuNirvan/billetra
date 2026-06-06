import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import { reportsApi } from '../../api/reports';
import { formatCurrency, formatDate } from '../../utils/format';
import { exportToCsv } from '../../utils/pdfGenerator';
import { format, subDays } from 'date-fns';
import type { GSTReportRow } from '../../types';

export default function GSTReport() {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'gst', startDate, endDate],
    queryFn: () => reportsApi.gst({ startDate, endDate }),
    enabled: !!(startDate && endDate),
  });

  const totals = data.reduce(
    (acc, row) => ({
      taxable: acc.taxable + row.taxable,
      cgst: acc.cgst + row.cgst,
      sgst: acc.sgst + row.sgst,
      igst: acc.igst + row.igst,
      totalGst: acc.totalGst + row.totalGst,
      total: acc.total + row.total,
    }),
    { taxable: 0, cgst: 0, sgst: 0, igst: 0, totalGst: 0, total: 0 }
  );

  const handleExport = () => {
    exportToCsv(
      ['Invoice #', 'Customer', 'Date', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total GST', 'Total', 'Type'],
      data.map((r) => [
        r.invoiceNumber, r.customerName, r.billDate,
        r.taxable, r.cgst, r.sgst, r.igst, r.totalGst, r.total,
        r.isInterstate ? 'IGST' : 'CGST+SGST',
      ]),
      `gst-report-${startDate}-${endDate}.csv`
    );
  };

  const columns = [
    { key: 'invoice', header: 'Invoice #', cell: (r: GSTReportRow) => <span className="font-semibold text-primary-700">#{r.invoiceNumber}</span> },
    { key: 'customer', header: 'Customer', cell: (r: GSTReportRow) => <span className="text-gray-900">{r.customerName}</span> },
    { key: 'date', header: 'Date', cell: (r: GSTReportRow) => formatDate(r.billDate) },
    { key: 'taxable', header: 'Taxable', cell: (r: GSTReportRow) => formatCurrency(r.taxable) },
    { key: 'cgst', header: 'CGST', cell: (r: GSTReportRow) => r.isInterstate ? '-' : formatCurrency(r.cgst) },
    { key: 'sgst', header: 'SGST', cell: (r: GSTReportRow) => r.isInterstate ? '-' : formatCurrency(r.sgst) },
    { key: 'igst', header: 'IGST', cell: (r: GSTReportRow) => r.isInterstate ? formatCurrency(r.igst) : '-' },
    { key: 'totalGst', header: 'Total GST', cell: (r: GSTReportRow) => <span className="font-semibold">{formatCurrency(r.totalGst)}</span> },
    { key: 'total', header: 'Total', cell: (r: GSTReportRow) => <span className="font-bold text-primary-700">{formatCurrency(r.total)}</span> },
    { key: 'type', header: 'Type', cell: (r: GSTReportRow) => <Badge color={r.isInterstate ? 'blue' : 'indigo'} size="sm">{r.isInterstate ? 'IGST' : 'CGST+SGST'}</Badge> },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">GST Report</h2>
        <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={handleExport} disabled={data.length === 0}>
          Export CSV
        </Button>
      </div>

      <Card>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Taxable', value: formatCurrency(totals.taxable), color: 'text-gray-900' },
          { label: 'CGST', value: formatCurrency(totals.cgst), color: 'text-blue-600' },
          { label: 'SGST', value: formatCurrency(totals.sgst), color: 'text-purple-600' },
          { label: 'IGST', value: formatCurrency(totals.igst), color: 'text-orange-600' },
          { label: 'Total GST', value: formatCurrency(totals.totalGst), color: 'text-emerald-600' },
          { label: 'Grand Total', value: formatCurrency(totals.total), color: 'text-primary-700' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <p className="text-xs text-gray-400 uppercase font-semibold">{label}</p>
            <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
          </Card>
        ))}
      </div>

      {isLoading ? <PageSpinner /> : (
        <Table
          columns={columns}
          data={data}
          keyExtractor={(r, i) => String(i)}
          emptyMessage="No GST data for selected period"
        />
      )}
    </div>
  );
}
