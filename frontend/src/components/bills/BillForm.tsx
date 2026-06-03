import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, AlertCircle, Info, Eye, LayoutTemplate } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { SearchableSelect } from '../ui/SearchableSelect';
import { BillItemRow } from './BillItemRow';
import { BillTemplates } from './BillTemplates';
import { PdfPreviewModal } from './PdfPreviewModal';
import { billsApi } from '../../api/bills';
import { useProducts } from '../../hooks/useProducts';
import { useCustomers } from '../../hooks/useCustomers';
import { useAccounts } from '../../hooks/useAccounts';
import { useCreateBill, useUpdateBill } from '../../hooks/useBills';
import { useAuthStore } from '../../store/authStore';
import { calculateItemTotals, calculateBillTotals } from '../../utils/gst';
import { formatCurrency, formatDateInput } from '../../utils/format';
import { BILL_SIZES, BILL_TEMPLATES, GST_RATES } from '../../utils/constants';
import type { Bill, BillItem } from '../../types';
import { format } from 'date-fns';
import { downloadSavedBillPdf } from '../../utils/billPdf';

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
  const [billSize, setBillSize] = useState(existingBill?.billSize ?? business?.defaultBillSize ?? 'a4_portrait');
  const [template, setTemplate] = useState(existingBill?.template ?? business?.defaultTemplate ?? 'modern');
  const [items, setItems] = useState<BillItem[]>(existingBill?.items ?? [emptyItem()]);
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>(existingBill?.discountType ?? 'percent');
  const [discountValue, setDiscountValue] = useState(existingBill?.discountValue ?? 0);
  const [notes, setNotes] = useState(existingBill?.notes ?? '');
  const [isInterstate, setIsInterstate] = useState(existingBill?.isInterstate ?? false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // GST on whole bill
  const [gstOnWhole, setGstOnWhole] = useState(false);
  const [billGstRate, setBillGstRate] = useState(18);

  // Auto-detect interstate based on customer state vs business state
  useEffect(() => {
    if (customerId && business?.state) {
      const customer = customers.find((c) => c.id === customerId);
      if (customer?.state) {
        setIsInterstate(customer.state !== business.state);
      }
    }
  }, [customerId, customers, business?.state]);

  // When gstOnWhole toggled, zero out item gst rates
  useEffect(() => {
    if (gstOnWhole) {
      setItems((prev) =>
        prev.map((item) => calculateItemTotals({ ...item, gstRate: 0 }))
      );
    }
  }, [gstOnWhole]);

  const totals = calculateBillTotals(
    items,
    discountType,
    discountValue,
    isInterstate,
    gstOnWhole ? billGstRate : undefined
  );

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
    items: items.map(({ id: _id, ...rest }) => ({
      ...rest,
      // If gstOnWhole, override item gst rate with billGstRate so backend computes correctly
      gstRate: gstOnWhole ? billGstRate : rest.gstRate,
    })),
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
    try {
      await downloadSavedBillPdf(bill.id, bill.invoiceNumber);
    } catch {
      /* download failure shouldn't block navigation */
    }
    navigate('/bills');
  };

  const isSaving = createBill.isPending || updateBill.isPending;

  const customerOptions = customers.map((c) => ({
    value: c.id,
    label: c.name,
    sublabel: c.phone || undefined,
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Top row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Customer – searchable */}
        <SearchableSelect
          label="Customer"
          value={customerId}
          onChange={setCustomerId}
          options={customerOptions}
          placeholder="Select customer"
          searchPlaceholder="Search customers..."
          emptyLabel="Walk-in Customer"
        />

        <Input
          label="Bill Date"
          type="date"
          value={billDate}
          onChange={(e) => setBillDate(e.target.value)}
          error={errors.billDate}
          required
        />

        <Input
          label="Due Date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          hint="Optional"
        />
      </div>

      {/* Bill size + template + account */}
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
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {BILL_TEMPLATES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              size="md"
              leftIcon={<LayoutTemplate className="h-4 w-4" />}
              onClick={() => setShowTemplates(true)}
            >
              Browse
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

      <Modal
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        title="Choose a Template"
        description="Preview each design with your business details, then select one."
        size="5xl"
      >
        <BillTemplates value={template} onChange={(t) => { setTemplate(t); setShowTemplates(false); }} />
      </Modal>

      <PdfPreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        title="Invoice Preview"
        reloadKey={`${template}-${billSize}-${JSON.stringify(buildPayload())}`}
        load={() => billsApi.previewPdf(buildPayload())}
        footer={
          <Button variant="outline" onClick={() => setShowPreview(false)}>Close</Button>
        }
      />

      {/* Toggles row */}
      <div className="flex flex-wrap items-center gap-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
        {/* Interstate */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            id="interstate"
            checked={isInterstate}
            onChange={(e) => setIsInterstate(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700 font-medium">
            Interstate Sale <span className="font-normal text-gray-500">(IGST)</span>
          </span>
        </label>

        {/* GST on whole bill */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            id="gstOnWhole"
            checked={gstOnWhole}
            onChange={(e) => setGstOnWhole(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700 font-medium">GST on whole bill</span>
        </label>

        {gstOnWhole && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">GST Rate:</span>
            <select
              value={billGstRate}
              onChange={(e) => setBillGstRate(parseFloat(e.target.value))}
              className="border border-gray-300 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {GST_RATES.filter((r) => r > 0).map((r) => (
                <option key={r} value={r}>{r}%</option>
              ))}
            </select>
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <Info className="h-3.5 w-3.5" />
              Item GST fields disabled
            </span>
          </div>
        )}
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
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">HSN</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Unit</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Price (₹)</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Discount</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {gstOnWhole ? `GST (${billGstRate}%)` : 'GST%'}
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
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
                  gstOnWhole={gstOnWhole}
                  billGstRate={billGstRate}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-4 border-t border-gray-50">
          <Button type="button" variant="ghost" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={handleAddItem}>
            Add another item
          </Button>
        </div>
      </Card>

      {/* Notes + Totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Textarea
            label="Notes / Terms"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Payment terms, thank you note, etc."
            rows={4}
          />
        </div>

        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Bill Summary</h3>
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
            </div>

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

            {gstOnWhole && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                  GST @ {billGstRate}% (whole bill)
                </span>
                <span>{formatCurrency(totals.totalTax)}</span>
              </div>
            )}

            {!gstOnWhole && (
              isInterstate ? (
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
              )
            )}

            {gstOnWhole && !isInterstate && (
              <>
                <div className="flex justify-between text-sm text-gray-400">
                  <span>CGST ({billGstRate / 2}%)</span>
                  <span>{formatCurrency(totals.cgstAmount)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-400">
                  <span>SGST ({billGstRate / 2}%)</span>
                  <span>{formatCurrency(totals.sgstAmount)}</span>
                </div>
              </>
            )}

            <div className="border-t border-gray-200 pt-3 flex justify-between">
              <span className="font-bold text-gray-900 text-base">Grand Total</span>
              <span className="font-bold text-primary-700 text-xl">
                {formatCurrency(totals.totalAmount)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center justify-end gap-3 pb-6">
        <Button variant="outline" onClick={() => navigate('/bills')}>
          Cancel
        </Button>
        <Button
          variant="outline"
          leftIcon={<Eye className="h-4 w-4" />}
          onClick={() => setShowPreview(true)}
        >
          Preview
        </Button>
        <Button variant="secondary" loading={isSaving} onClick={handleSave}>
          Save Draft
        </Button>
        <Button variant="primary" loading={isSaving} onClick={handleSaveAndDownload}>
          Save & Download PDF
        </Button>
      </div>
    </div>
  );
}
