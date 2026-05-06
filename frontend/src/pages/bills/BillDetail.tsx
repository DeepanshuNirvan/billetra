import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Download, Edit, Copy, CheckCircle, XCircle, ArrowLeft, Printer,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { BillPreview } from '../../components/bills/BillPreview';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { PageSpinner } from '../../components/ui/Spinner';
import { BillStatusBadge } from '../../components/ui/Badge';
import { useBill, useMarkBillPaid, useDuplicateBill, useCancelBill } from '../../hooks/useBills';
import { useAuthStore } from '../../store/authStore';
import { downloadBillPdf } from '../../utils/pdfGenerator';
import { formatCurrency, formatDate } from '../../utils/format';

export default function BillDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { business } = useAuthStore();
  const { data: bill, isLoading } = useBill(id!);
  const markPaid = useMarkBillPaid();
  const duplicate = useDuplicateBill();
  const cancel = useCancelBill();

  const [showMarkPaid, setShowMarkPaid] = useState(false);
  const [paidAmount, setPaidAmount] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (isLoading) return <PageSpinner />;
  if (!bill) return <div className="p-6 text-center text-gray-500">Bill not found</div>;

  const handleDownload = () => downloadBillPdf(bill, business);

  const handleMarkPaid = async () => {
    const amount = parseFloat(paidAmount) || bill.totalAmount;
    await markPaid.mutateAsync({ id: bill.id, paidAmount: amount });
    setShowMarkPaid(false);
  };

  const handleDuplicate = async () => {
    const newBill = await duplicate.mutateAsync(bill.id);
    navigate(`/bills/${newBill.id}`);
  };

  const handleCancel = async () => {
    await cancel.mutateAsync(bill.id);
    setShowCancelConfirm(false);
  };

  const handlePrint = () => {
    const content = document.getElementById('bill-preview');
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Invoice #${bill.invoiceNumber}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>body{font-family:Inter,sans-serif;margin:0;padding:20px}</style>
      </head><body>${content.outerHTML}</body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/bills')}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">#{bill.invoiceNumber}</h2>
              <BillStatusBadge status={bill.status} />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {formatDate(bill.billDate)} • {bill.customer?.name ?? 'Walk-in Customer'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!bill.isLocked && bill.status !== 'cancelled' && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Edit className="h-4 w-4" />}
              onClick={() => navigate(`/bills/${bill.id}/edit`)}
            >
              Edit
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Copy className="h-4 w-4" />}
            onClick={handleDuplicate}
            loading={duplicate.isPending}
          >
            Duplicate
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Printer className="h-4 w-4" />}
            onClick={handlePrint}
          >
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={handleDownload}
          >
            PDF
          </Button>
          {bill.status !== 'paid' && bill.status !== 'cancelled' && (
            <Button
              variant="success"
              size="sm"
              leftIcon={<CheckCircle className="h-4 w-4" />}
              onClick={() => { setPaidAmount(String(bill.totalAmount)); setShowMarkPaid(true); }}
            >
              Mark Paid
            </Button>
          )}
          {bill.status !== 'cancelled' && (
            <Button
              variant="danger"
              size="sm"
              leftIcon={<XCircle className="h-4 w-4" />}
              onClick={() => setShowCancelConfirm(true)}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Quick summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Amount', value: formatCurrency(bill.totalAmount), color: 'text-indigo-700' },
          { label: 'Paid Amount', value: formatCurrency(bill.paidAmount), color: 'text-green-600' },
          { label: 'Balance Due', value: formatCurrency(Math.max(0, bill.totalAmount - bill.paidAmount)), color: 'text-red-600' },
          { label: 'Tax Total', value: formatCurrency(bill.totalTax), color: 'text-gray-900' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <p className="text-xs text-gray-400 uppercase font-semibold">{label}</p>
            <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
          </Card>
        ))}
      </div>

      {/* Bill preview */}
      <div className="overflow-x-auto">
        <BillPreview bill={bill} business={business} />
      </div>

      {/* Mark Paid Modal */}
      <Modal
        open={showMarkPaid}
        onClose={() => setShowMarkPaid(false)}
        title="Mark Bill as Paid"
        description={`Total amount: ${formatCurrency(bill.totalAmount)}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowMarkPaid(false)}>Cancel</Button>
            <Button variant="success" onClick={handleMarkPaid} loading={markPaid.isPending}>
              Confirm Payment
            </Button>
          </>
        }
      >
        <Input
          label="Amount Received (₹)"
          type="number"
          value={paidAmount}
          onChange={(e) => setPaidAmount(e.target.value)}
          hint="Enter the amount received from the customer"
        />
      </Modal>

      {/* Cancel Confirm Modal */}
      <Modal
        open={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        title="Cancel Bill"
        description="This action cannot be undone. The bill will be marked as cancelled."
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>Keep Bill</Button>
            <Button variant="danger" onClick={handleCancel} loading={cancel.isPending}>
              Cancel Bill
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to cancel invoice <strong>#{bill.invoiceNumber}</strong>?
        </p>
      </Modal>
    </div>
  );
}
