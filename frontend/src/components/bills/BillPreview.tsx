import { type Bill, type Business } from '../../types';
import { formatCurrency, formatDate } from '../../utils/format';
import { BillStatusBadge } from '../ui/Badge';

interface BillPreviewProps {
  bill: Bill;
  business?: Business | null;
}

export function BillPreview({ bill, business }: BillPreviewProps) {
  return (
    <div
      id="bill-preview"
      className="bg-white rounded-xl border border-gray-200 p-8 text-sm"
      style={{ minWidth: '500px', fontFamily: 'Inter, sans-serif' }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          {business?.logoUrl && (
            <img src={business.logoUrl} alt="Logo" className="h-12 object-contain mb-3" />
          )}
          <h2 className="text-xl font-bold text-gray-900">{business?.name ?? 'Your Business'}</h2>
          {business?.gstin && (
            <p className="text-xs text-gray-500 mt-0.5">GSTIN: {business.gstin}</p>
          )}
          {business?.address && (
            <p className="text-xs text-gray-500 mt-0.5">
              {business.address}, {business.city}, {business.state} - {business.pincode}
            </p>
          )}
          {business?.phone && <p className="text-xs text-gray-500 mt-0.5">Ph: {business.phone}</p>}
          {business?.email && <p className="text-xs text-gray-500 mt-0.5">{business.email}</p>}
        </div>

        <div className="text-right">
          <h1 className="text-2xl font-bold text-indigo-700 uppercase tracking-wide">
            Tax Invoice
          </h1>
          <p className="text-lg font-bold text-gray-900 mt-1">#{bill.invoiceNumber}</p>
          <div className="mt-2">
            <BillStatusBadge status={bill.status} />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t-2 border-indigo-600 mb-6" />

      {/* Bill meta + Customer */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Bill To</p>
          {bill.customer ? (
            <>
              <p className="font-semibold text-gray-900">{bill.customer.name}</p>
              {bill.customer.gstin && (
                <p className="text-xs text-gray-500">GSTIN: {bill.customer.gstin}</p>
              )}
              {bill.customer.billingAddress && (
                <p className="text-xs text-gray-500 mt-0.5">{bill.customer.billingAddress}</p>
              )}
              {bill.customer.phone && (
                <p className="text-xs text-gray-500 mt-0.5">Ph: {bill.customer.phone}</p>
              )}
            </>
          ) : (
            <p className="text-gray-500 text-xs italic">Walk-in Customer</p>
          )}
        </div>
        <div className="text-right">
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-xs text-gray-500">Invoice Date:</span>
              <span className="text-xs font-medium text-gray-900">{formatDate(bill.billDate)}</span>
            </div>
            {bill.dueDate && (
              <div className="flex justify-between gap-4">
                <span className="text-xs text-gray-500">Due Date:</span>
                <span className="text-xs font-medium text-gray-900">{formatDate(bill.dueDate)}</span>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <span className="text-xs text-gray-500">Tax Type:</span>
              <span className="text-xs font-medium text-gray-900">
                {bill.isInterstate ? 'IGST' : 'CGST + SGST'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full text-xs mb-6">
        <thead>
          <tr className="bg-indigo-600 text-white">
            <th className="px-3 py-2 text-left rounded-tl-lg">#</th>
            <th className="px-3 py-2 text-left">Item</th>
            <th className="px-3 py-2 text-center">HSN</th>
            <th className="px-3 py-2 text-center">Qty</th>
            <th className="px-3 py-2 text-right">Rate</th>
            <th className="px-3 py-2 text-right">Disc</th>
            <th className="px-3 py-2 text-right">GST%</th>
            <th className="px-3 py-2 text-right rounded-tr-lg">Amount</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((item, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-3 py-2 text-gray-500">{i + 1}</td>
              <td className="px-3 py-2 font-medium text-gray-900">{item.name}</td>
              <td className="px-3 py-2 text-center text-gray-500">{item.hsnCode ?? '-'}</td>
              <td className="px-3 py-2 text-center">
                {item.quantity} {item.unit ?? ''}
              </td>
              <td className="px-3 py-2 text-right">{formatCurrency(item.price)}</td>
              <td className="px-3 py-2 text-right text-gray-500">
                {item.discountAmount > 0 ? formatCurrency(item.discountAmount) : '-'}
              </td>
              <td className="px-3 py-2 text-right">{item.gstRate}%</td>
              <td className="px-3 py-2 text-right font-semibold">{formatCurrency(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium">{formatCurrency(bill.subtotal)}</span>
          </div>
          {bill.discountAmount > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Discount</span>
              <span className="text-red-500">-{formatCurrency(bill.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Taxable Amount</span>
            <span className="font-medium">{formatCurrency(bill.taxableAmount)}</span>
          </div>
          {bill.isInterstate ? (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">IGST</span>
              <span>{formatCurrency(bill.igstAmount)}</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">CGST</span>
                <span>{formatCurrency(bill.cgstAmount)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">SGST</span>
                <span>{formatCurrency(bill.sgstAmount)}</span>
              </div>
            </>
          )}
          <div className="border-t border-gray-200 pt-2 flex justify-between">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-bold text-indigo-700 text-base">
              {formatCurrency(bill.totalAmount)}
            </span>
          </div>
          {bill.paidAmount > 0 && bill.paidAmount < bill.totalAmount && (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Paid</span>
                <span className="text-emerald-600">{formatCurrency(bill.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-red-600">Balance Due</span>
                <span className="font-semibold text-red-600">
                  {formatCurrency(bill.totalAmount - bill.paidAmount)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Notes */}
      {bill.notes && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Notes</p>
          <p className="text-xs text-gray-600">{bill.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-400">
          Thank you for your business! • Generated by Billetra
        </p>
      </div>
    </div>
  );
}
