import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge, BillStatusBadge } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import { CustomerForm } from '../../components/customers/CustomerForm';
import { useCustomer } from '../../hooks/useCustomers';
import { useBills } from '../../hooks/useBills';
import { formatCurrency, formatDate } from '../../utils/format';

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: customer, isLoading } = useCustomer(id!);
  const { data: billsData } = useBills({ customerId: id, limit: 10 });
  const [showEdit, setShowEdit] = useState(false);

  if (isLoading) return <PageSpinner />;
  if (!customer) return <div className="p-6 text-center text-gray-500">Customer not found</div>;

  const bills = billsData?.data ?? [];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/customers')} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{customer.name}</h2>
            <Badge color={customer.isActive ? 'green' : 'gray'} className="mt-0.5">
              {customer.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" leftIcon={<Edit className="h-4 w-4" />} onClick={() => setShowEdit(true)}>
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <p className="text-xs text-gray-400 uppercase font-semibold">Outstanding Balance</p>
          <p className={`text-2xl font-bold mt-1 ${customer.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(customer.outstandingBalance)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-gray-400 uppercase font-semibold">Credit Limit</p>
          <p className="text-2xl font-bold mt-1 text-gray-900">
            {customer.creditLimit > 0 ? formatCurrency(customer.creditLimit) : 'No limit'}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-gray-400 uppercase font-semibold">Payment Terms</p>
          <p className="text-xl font-bold mt-1 text-gray-900">{customer.paymentTerms ?? 'Immediate'}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Contact Info" />
          <div className="space-y-3">
            {customer.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-700">{customer.phone}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-700">{customer.email}</span>
              </div>
            )}
            {customer.billingAddress && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Billing Address</p>
                  <p className="text-sm text-gray-700">{customer.billingAddress}</p>
                  {customer.state && <p className="text-sm text-gray-500">{customer.state}</p>}
                </div>
              </div>
            )}
            {customer.gstin && (
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">GSTIN</p>
                  <p className="text-sm font-mono text-gray-700">{customer.gstin}</p>
                </div>
              </div>
            )}
            {customer.pan && (
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">PAN</p>
                  <p className="text-sm font-mono text-gray-700">{customer.pan}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Recent Bills"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate(`/bills?customerId=${customer.id}`)}>
                View all
              </Button>
            }
          />
          {bills.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No bills yet</p>
          ) : (
            <div className="space-y-2">
              {bills.map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/bills/${bill.id}`)}
                >
                  <div>
                    <p className="text-sm font-medium text-indigo-700">#{bill.invoiceNumber}</p>
                    <p className="text-xs text-gray-400">{formatDate(bill.billDate)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <BillStatusBadge status={bill.status} />
                    <span className="text-sm font-semibold">{formatCurrency(bill.totalAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <CustomerForm open={showEdit} onClose={() => setShowEdit(false)} customer={customer} />
    </div>
  );
}
