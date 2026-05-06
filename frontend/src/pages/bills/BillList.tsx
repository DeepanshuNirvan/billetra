import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Download, Eye, FileText } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table, Pagination } from '../../components/ui/Table';
import { BillStatusBadge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { useBills } from '../../hooks/useBills';
import { formatCurrency, formatDate } from '../../utils/format';
import { billsApi } from '../../api/bills';
import { downloadBillPdf } from '../../utils/pdfGenerator';
import { useAuthStore } from '../../store/authStore';
import type { Bill } from '../../types';
import { toast } from '../../store/uiStore';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function BillList() {
  const navigate = useNavigate();
  const { business } = useAuthStore();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useBills({
    search: search || undefined,
    status: status || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page,
    limit: 20,
  });

  const bills = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  const handleDownloadPdf = async (bill: Bill, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const fullBill = await billsApi.get(bill.id);
      downloadBillPdf(fullBill, business);
    } catch {
      toast.error('Failed to download PDF');
    }
  };

  const columns = [
    {
      key: 'invoice',
      header: 'Invoice #',
      cell: (bill: Bill) => (
        <span className="font-semibold text-indigo-700">#{bill.invoiceNumber}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      cell: (bill: Bill) => (
        <div>
          <p className="font-medium text-gray-900">{bill.customer?.name ?? 'Walk-in'}</p>
          {bill.customer?.phone && (
            <p className="text-xs text-gray-400">{bill.customer.phone}</p>
          )}
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      cell: (bill: Bill) => (
        <div>
          <p className="text-gray-700">{formatDate(bill.billDate)}</p>
          {bill.dueDate && (
            <p className="text-xs text-gray-400">Due: {formatDate(bill.dueDate)}</p>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      cell: (bill: Bill) => (
        <span className="font-semibold text-gray-900">{formatCurrency(bill.totalAmount)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (bill: Bill) => <BillStatusBadge status={bill.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (bill: Bill) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            onClick={() => navigate(`/bills/${bill.id}`)}
            title="View"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            className="rounded-lg p-1.5 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
            onClick={(e) => handleDownloadPdf(bill, e)}
            title="Download PDF"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Bills</h2>
          <p className="text-sm text-gray-500 mt-0.5">{total} invoices total</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/bills/create')}>
          New Bill
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search by invoice # or customer..."
            leftAddon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="From date"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="To date"
        />
        {(search || status || startDate || endDate) && (
          <Button
            variant="ghost"
            size="md"
            onClick={() => { setSearch(''); setStatus(''); setStartDate(''); setEndDate(''); setPage(1); }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      {bills.length === 0 && !isLoading ? (
        <EmptyState
          icon={FileText}
          title="No bills found"
          description="Create your first bill to get started"
          action={{ label: 'Create Bill', onClick: () => navigate('/bills/create') }}
        />
      ) : (
        <>
          <Table
            columns={columns}
            data={bills}
            keyExtractor={(b) => b.id}
            onRowClick={(b) => navigate(`/bills/${b.id}`)}
            loading={isLoading}
          />
          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={20}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
