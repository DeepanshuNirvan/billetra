import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';
import { BillItemRow } from './BillItemRow';
import { BillTemplates } from './BillTemplates';
import { useProducts } from '../../hooks/useProducts';
import { useCustomers } from '../../hooks/useCustomers';
import { useAccounts } from '../../hooks/useAccounts';
import { useCreateBill, useUpdateBill } from '../../hooks/useBills';
import { useAuthStore } from '../../store/authStore';
import { calculateItemTotals, calculateBillTotals } from '../../utils/gst';
import { formatCurrency, formatDateInput } from '../../utils/format';
import { BILL_SIZES, BILL_TEMPLATES } from '../../utils/constants';
import type { Bill, BillItem } from '../../types';
import { format } from 'date-fns';
import { downloadBillPdf } from '../../utils/pdfGenerator';

interface BillFormProps {
  existingBill?: Bill;
}

const emptyItem = (): BillItem => ({
  name: '',
  quantity: 1,
  price: 0,
  discountType: 'percent',
  discountValue: 0,
  discountAmount: 0,
  gstRate: 18,
  gstAmount: 0,
  total: 0,
});

export function BillForm({ existingBill }: BillFormProps) {
  const navigate = useNavigate();
  const { business } = useAuthStore();
  const createBill = useCreateBill();
  const updateBill = useUpdateBill();

  const { data: productsData } = useProducts({ isActive: true, limit: 200 });
  const { data: customersData } = useCustomers({ isActive: true, limit: 200 });
  const { data: accountsData } = useAccounts();

  const products = productsData?.data ?? [];
  const customers = customersData?.data ?? [];
  const accounts = accountsData ?? [];

  const [customerId, setCustomerId] = useState(existingBill?.customerId ?? '');
  const [accountId, setAccountId] = useState(existingBill?.accountId ?? '');
  const [billDate, setBillDate] = useState(
    existingBill ? formatDateInput(existingBill.billDate) : format(new Date(), 'yyyy-MM-dd')
  );
  const [dueDate, setDueDate] = useState(formatDateInput(existingBill?.dueDate ?? null));
  const [billSize, setBillSize] = useState(existingBill?.billSize ?? business?.defaultBillSize ?? 'A4_PORTRAIT');
  const [template, setTemplate] = useState(existingBill?.template ?? business?.defaultTemplate ?? 'MODERN_MINIMAL');
  const [items, setItems] = useState<BillItem[]>(existingBill?.items ?? [emptyItem()]);
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>(existingBill?.discountType ?? 'percent');
  const [discountValue, setDiscountValue] = useState(existingBill?.discountValue ?? 0);
  const [notes, setNotes] = useState(existingBill?.notes ?? '');
  const [isInterstate, setIsInterstate] = useState(existingBill?.isInterstate ?? false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-detect interstate based on customer state vs business state
  useEffect(() => {
    if (customerId && business?.state) {
      const customer = customers.find((c) => c.id === customerId);
      if (customer?.state) {
        setIsInterstate(customer.state !== business.state);
      }
    }
  }, [customerId, customers, business?.state]);

  const totals = calculateBillTotals(items, discountType, discountValue, isInterstate);

  const handleItemChange = useCallback((index: number, item: BillItem) => {
    setItems((prev) => prev.map((it, i) => (i === index ? item : it)));
  }, []);

  const handleAddItem = () => setItems((prev) => [...prev, emptyItem()]);

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!billDate) errs.billDate = 'Bill date is required';
    if (items.length === 0) errs.items = 'Add at least one item';
    if (items.some((it) => !it.name.trim())) errs.itemNames = 'All items must have a name';
    if (items.some((it) => it.quantity <= 0)) errs.itemQty = 'All quantities must be > 0';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildPayload = () => ({
    customerId: customerId || undefined,
    accountId: accountId || undefined,
    billDate,
    dueDate: dueDate || undefined,
    billSize,
    template,
    items: items.map(({ id: _id, ...rest }) => rest),
    discountType,
    discountValue,
    notes: notes || undefined,
    isInterstate,
  });

  const handleSave = async () => {
    if (!validate()) return;
    const payload = buildPayload();
    if (existingBill) {
      await updateBill.mutateAsync({ id: existingBill.id, payload });
    } else {
      await createBill.mutateAsync(payload);
    }
    navigate('/bills');
  };

  const handleSaveAndDownload = async () => {
    if (!validate()) return;
    const payload = buildPayload();
    let bill: Bill;
    if (existingBill) {
      bill = await updateBill.mutateAsync({ id: existingBill.id, payload });
    } else {
      bill = await createBill.mutateAsync(payload);
    }
    downloadBillPdf(bill, business);
    navigate('/bills');
  };

  const isSaving = createBill.isPending || updateBill.isPending;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Top row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Customer */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Customer</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Walk-in Customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Bill Date */}
        <Input
          label="Bill Date"
          type="date"
          value={billDate}
          onChange={(e) => setBillDate(e.target.value)}
          error={errors.billDate}
          required
        />

        {/* Due Date */}
        <Input
          label="Due Date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          hint="Optional"
        />
      </div>

      {/* Bill size + template */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <Select
          label="Bill Size"
          value={billSize}
          onChange={(e) => setBillSize(e.target.value)}
          options={BILL_SIZES}
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Template</label>
          <div className="flex gap-2">
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {BILL_TEMPLATES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setShowTemplates(!showTemplates)}
            >
              Preview
            </Button>
          </div>
        </div>
        <Select
          label="Payment Account"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          options={[
            { value: '', label: 'Select account' },
            ...accounts.map((a) => ({ value: a.id, label: `${a.name} (${a.accountType})` })),
          ]}
        />
      </div>

      {/* Template preview */}
      {showTemplates && (
        <Card>
          <p className="text-sm font-semibold text-gray-700 mb-4">Choose Template</p>
          <BillTemplates value={template} onChange={(t) => { setTemplate(t); setShowTemplates(false); }} />
        </Card>
      )}

      {/* Interstate toggle */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="interstate"
          checked={isInterstate}
          onChange={(e) => setIsInterstate(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label htmlFor="interstate" className="text-sm text-gray-700">
          Interstate Sale (IGST applies instead of CGST+SGST)
        </label>
      </div>

      {/* Items Table */}
      <Card padding="none">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Line Items</h3>
          <Button type="button" size="sm" variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={handleAddItem}>
            Add Item
          </Button>
        </div>
        {(errors.items || errors.itemNames || errors.itemQty) && (
          <div className="px-5 py-3 bg-red-50 flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="h-4 w-4" />
            {errors.items ?? errors.itemNames ?? errors.itemQty}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Product</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Name</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">HSN</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Qty</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Unit</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Price (₹)</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Discount</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">GST%</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500">Amount</th>
                <th className="px-3 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <BillItemRow
                  key={i}
                  item={item}
                  index={i}
                  products={products}
                  onChange={handleItemChange}
                  onRemove={handleRemoveItem}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-4 border-t border-gray-50">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={handleAddItem}
          >
            Add another item
          </Button>
        </div>
      </Card>

      {/* Bottom: Notes + Totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Notes */}
        <div className="space-y-4">
          <Textarea
            label="Notes / Terms"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Payment terms, thank you note, etc."
            rows={4}
          />
        </div>

        {/* Totals panel */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Bill Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
            </div>

            {/* Bill-level discount */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 flex-1">Discount</span>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'fixed' | 'percent')}
                className="border border-gray-200 rounded px-1.5 py-1 text-xs"
              >
                <option value="percent">%</option>
                <option value="fixed">₹</option>
              </select>
              <input
                type="number"
                value={discountValue}
                min={0}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                className="w-20 border border-gray-200 rounded px-2 py-1 text-sm text-right"
              />
            </div>

            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount Amount</span>
                <span className="text-red-500">-{formatCurrency(totals.discountAmount)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Taxable Amount</span>
              <span className="font-medium">{formatCurrency(totals.taxableAmount)}</span>
            </div>

            {isInterstate ? (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">IGST</span>
                <span>{formatCurrency(totals.igstAmount)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">CGST</span>
                  <span>{formatCurrency(totals.cgstAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">SGST</span>
                  <span>{formatCurrency(totals.sgstAmount)}</span>
                </div>
              </>
            )}

            <div className="border-t border-gray-200 pt-3 flex justify-between">
              <span className="font-bold text-gray-900 text-base">Grand Total</span>
              <span className="font-bold text-indigo-700 text-xl">
                {formatCurrency(totals.totalAmount)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3 pb-6">
        <Button variant="outline" onClick={() => navigate('/bills')}>
          Cancel
        </Button>
        <Button
          variant="secondary"
          loading={isSaving}
          onClick={handleSave}
        >
          Save Draft
        </Button>
        <Button
          variant="primary"
          loading={isSaving}
          onClick={handleSaveAndDownload}
        >
          Save & Download PDF
        </Button>
      </div>
    </div>
  );
}
