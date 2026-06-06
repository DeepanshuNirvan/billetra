import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Download, Edit, Copy, CheckCircle, XCircle, ArrowLeft, Printer, History,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PdfFrame } from '../../components/bills/PdfFrame';
import { billsApi } from '../../api/bills';
import { downloadSavedBillPdf, printSavedBillPdf } from '../../utils/billPdf';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { PageSpinner } from '../../components/ui/Spinner';
import { BillStatusBadge } from '../../components/ui/Badge';
import { AuditHistory } from '../../components/audit/AuditHistory';
import { useBill, useMarkBillPaid, useDuplicateBill, useCancelBill } from '../../hooks/useBills';
import { formatCurrency, formatDate } from '../../utils/format';

export default function BillDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: bill, isLoading } = useBill(id!);
  const markPaid = useMarkBillPaid();
  const duplicate = useDuplicateBill();
  const cancel = useCancelBill();

  const [showMarkPaid, setShowMarkPaid] = useState(false);
  const [paidAmount, setPaidAmount] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

  if (isLoading) return <PageSpinner />;
  if (!bill) return <div className="p-6 text-center text-gray-500">Bill not found</div>;

  const handleDownload = () => downloadSavedBillPdf(bill.id, bill.invoiceNumber);

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

  const handlePrint = () => printSavedBillPdf(bill.id);

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
          { label: 'Total Amount', value: formatCurrency(bill.totalAmount), color: 'text-primary-700' },
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

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-4">
        {(['details', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-sm font-medium capitalize flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'history' && <History className="h-3.5 w-3.5" />}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'details' && (
        <PdfFrame
          load={() => billsApi.downloadPdf(bill.id)}
          reloadKey={`${bill.id}-${bill.template}-${bill.status}`}
          title={`Invoice ${bill.invoiceNumber}`}
          className="h-[80vh] border border-gray-200"
        />
      )}
      {activeTab === 'history' && (
        <Card>
          <AuditHistory entityType="bill" entityId={bill.id} />
        </Card>
      )}

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
