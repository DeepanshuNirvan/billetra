import { useQuery } from '@tanstack/react-query';
import { Download, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import { reportsApi } from '../../api/reports';
import { formatCurrency } from '../../utils/format';
import { exportToCsv } from '../../utils/pdfGenerator';
import type { InventoryReportRow } from '../../types';

export default function InventoryReport() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'inventory'],
    queryFn: () => reportsApi.inventory(),
  });

  const totalStockValue = data.reduce((s, r) => s + r.stockValue, 0);
  const lowStockCount = data.filter((r) => r.isLowStock).length;
  const outOfStockCount = data.filter((r) => r.stockQuantity === 0).length;

  const handleExport = () => {
    exportToCsv(
      ['Name', 'SKU', 'Category', 'Stock', 'Purchase Price', 'Selling Price', 'Stock Value', 'Status'],
      data.map((r) => [
        r.name, r.sku ?? '', r.category ?? '',
        r.stockQuantity, r.purchasePrice, r.sellingPrice, r.stockValue,
        r.stockQuantity === 0 ? 'Out of Stock' : r.isLowStock ? 'Low Stock' : 'In Stock',
      ]),
      'inventory-report.csv'
    );
  };

  const getStockStatus = (r: InventoryReportRow) => {
    if (r.stockQuantity === 0) return <Badge color="red">Out of Stock</Badge>;
    if (r.isLowStock) return <Badge color="yellow">Low Stock</Badge>;
    return <Badge color="green">In Stock</Badge>;
  };

  const columns = [
    {
      key: 'name',
      header: 'Product',
      cell: (r: InventoryReportRow) => (
        <div className="flex items-center gap-2">
          {r.isLowStock && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
          <div>
            <p className="font-medium text-gray-900">{r.name}</p>
            {r.sku && <p className="text-xs text-gray-400">SKU: {r.sku}</p>}
          </div>
        </div>
      ),
    },
    { key: 'category', header: 'Category', cell: (r: InventoryReportRow) => r.category ?? '-' },
    {
      key: 'stock',
      header: 'Stock Qty',
      cell: (r: InventoryReportRow) => (
        <span className={r.stockQuantity === 0 ? 'font-bold text-red-600' : r.isLowStock ? 'font-bold text-amber-600' : 'text-gray-900'}>
          {r.stockQuantity}
        </span>
      ),
    },
    { key: 'alert', header: 'Alert At', cell: (r: InventoryReportRow) => r.lowStockAlert },
    { key: 'purchasePrice', header: 'Purchase Price', cell: (r: InventoryReportRow) => formatCurrency(r.purchasePrice) },
    { key: 'sellingPrice', header: 'Selling Price', cell: (r: InventoryReportRow) => formatCurrency(r.sellingPrice) },
    { key: 'stockValue', header: 'Stock Value', cell: (r: InventoryReportRow) => <span className="font-semibold text-indigo-700">{formatCurrency(r.stockValue)}</span> },
    { key: 'status', header: 'Status', cell: (r: InventoryReportRow) => getStockStatus(r) },
  ];

  if (isLoading) return <PageSpinner />;

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Inventory Report</h2>
        <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={handleExport} disabled={data.length === 0}>
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Products', value: String(data.length), color: 'text-gray-900' },
          { label: 'Stock Value', value: formatCurrency(totalStockValue), color: 'text-indigo-700' },
          { label: 'Low Stock', value: String(lowStockCount), color: 'text-amber-600' },
          { label: 'Out of Stock', value: String(outOfStockCount), color: 'text-red-600' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <p className="text-xs text-gray-400 uppercase font-semibold">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </Card>
        ))}
      </div>

      <Table
        columns={columns}
        data={data}
        keyExtractor={(r) => r.id}
        emptyMessage="No inventory data"
      />
    </div>
  );
}
