import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, BarChart2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { PageSpinner } from '../../components/ui/Spinner';
import { reportsApi } from '../../api/reports';
import { formatCurrency, formatDate } from '../../utils/format';
import { exportToCsv } from '../../utils/pdfGenerator';
import { format, subDays } from 'date-fns';
import type { SalesReportRow } from '../../types';

export default function SalesReport() {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day');
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'sales', startDate, endDate, groupBy],
    queryFn: () => reportsApi.sales({ startDate, endDate, groupBy }),
    enabled: !!(startDate && endDate),
  });

  const totals = data.reduce(
    (acc, row) => ({
      invoiceCount: acc.invoiceCount + row.invoiceCount,
      subtotal: acc.subtotal + row.subtotal,
      discount: acc.discount + row.discount,
      taxable: acc.taxable + row.taxable,
      cgst: acc.cgst + row.cgst,
      sgst: acc.sgst + row.sgst,
      igst: acc.igst + row.igst,
      total: acc.total + row.total,
    }),
    { invoiceCount: 0, subtotal: 0, discount: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }
  );

  const handleExport = () => {
    exportToCsv(
      ['Date', 'Invoices', 'Subtotal', 'Discount', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total'],
      data.map((r) => [r.date, r.invoiceCount, r.subtotal, r.discount, r.taxable, r.cgst, r.sgst, r.igst, r.total]),
      `sales-report-${startDate}-${endDate}.csv`
    );
  };

  const columns = [
    { key: 'date', header: 'Date', cell: (r: SalesReportRow) => formatDate(r.date) },
    { key: 'count', header: 'Invoices', cell: (r: SalesReportRow) => r.invoiceCount },
    { key: 'subtotal', header: 'Subtotal', cell: (r: SalesReportRow) => formatCurrency(r.subtotal) },
    { key: 'discount', header: 'Discount', cell: (r: SalesReportRow) => formatCurrency(r.discount) },
    { key: 'taxable', header: 'Taxable', cell: (r: SalesReportRow) => formatCurrency(r.taxable) },
    { key: 'cgst', header: 'CGST', cell: (r: SalesReportRow) => formatCurrency(r.cgst) },
    { key: 'sgst', header: 'SGST', cell: (r: SalesReportRow) => formatCurrency(r.sgst) },
    { key: 'igst', header: 'IGST', cell: (r: SalesReportRow) => formatCurrency(r.igst) },
    { key: 'total', header: 'Total', cell: (r: SalesReportRow) => <span className="font-bold text-indigo-700">{formatCurrency(r.total)}</span> },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Sales Report</h2>
        <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={handleExport} disabled={data.length === 0}>
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as 'day' | 'month')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="day">Daily</option>
              <option value="month">Monthly</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Sales', value: formatCurrency(totals.total), color: 'text-indigo-700' },
          { label: 'Taxable Amount', value: formatCurrency(totals.taxable), color: 'text-gray-900' },
          { label: 'Total Tax', value: formatCurrency(totals.cgst + totals.sgst + totals.igst), color: 'text-emerald-600' },
          { label: 'Total Invoices', value: String(totals.invoiceCount), color: 'text-gray-900' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <p className="text-xs text-gray-400 uppercase font-semibold">{label}</p>
            <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
          </Card>
        ))}
      </div>

      {isLoading ? <PageSpinner /> : (
        <>
          {/* Chart */}
          {data.length > 0 && (
            <Card>
              <CardHeader
                title="Sales Trend"
                action={
                  <div className="flex gap-1">
                    {(['bar', 'line'] as const).map((t) => (
                      <Button key={t} size="xs" variant={chartType === t ? 'primary' : 'outline'} onClick={() => setChartType(t)}>
                        {t === 'bar' ? 'Bar' : 'Line'}
                      </Button>
                    ))}
                  </div>
                }
              />
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <BarChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={50} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={40} name="Total Sales" />
                    </BarChart>
                  ) : (
                    <LineChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={50} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Line type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3 }} name="Total Sales" />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Table */}
          {data.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <BarChart2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400">No data for selected period</p>
              </div>
            </Card>
          ) : (
            <Table
              columns={columns}
              data={data}
              keyExtractor={(r, i) => String(i)}
            />
          )}
        </>
      )}
    </div>
  );
}
