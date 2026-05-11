import type { BillItem, BillTotals } from '../types';

export const calculateItemTotals = (item: Partial<BillItem>): BillItem => {
  const price = item.price ?? 0;
  const quantity = item.quantity ?? 0;
  const lineSubtotal = price * quantity;

  const discountValue = item.discountValue ?? 0;
  const discountAmount =
    item.discountType === 'percent'
      ? (lineSubtotal * discountValue) / 100
      : discountValue;

  const taxable = lineSubtotal - discountAmount;
  const gstRate = item.gstRate ?? 0;
  const gstAmount = (taxable * gstRate) / 100;
  const total = taxable + gstAmount;

  return {
    id: item.id,
    productId: item.productId,
    name: item.name ?? '',
    hsnCode: item.hsnCode,
    quantity,
    unit: item.unit,
    price,
    discountType: item.discountType ?? 'percent',
    discountValue,
    discountAmount: Math.round(discountAmount * 100) / 100,
    gstRate,
    gstAmount: Math.round(gstAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
};

export const calculateBillTotals = (
  items: BillItem[],
  billDiscountType: 'fixed' | 'percent',
  billDiscountValue: number,
  isInterstate: boolean,
  /** When set, GST is applied at this rate on the whole bill instead of per-item */
  billGstRate?: number
): BillTotals => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity - item.discountAmount, 0);

  const billDiscount =
    billDiscountType === 'percent'
      ? (subtotal * billDiscountValue) / 100
      : billDiscountValue;

  const taxableAmount = subtotal - billDiscount;

  let totalTax: number;

  if (billGstRate != null && billGstRate > 0) {
    // Whole-bill GST: apply single rate on taxable amount
    totalTax = Math.round((taxableAmount * billGstRate) / 100 * 100) / 100;
  } else {
    // Per-item GST: sum item gst amounts proportionally after bill discount
    const itemTaxTotal = items.reduce((sum, item) => sum + item.gstAmount, 0);
    const itemTaxableTotal = items.reduce(
      (sum, item) => sum + (item.price * item.quantity - item.discountAmount),
      0
    );
    const discountFactor = itemTaxableTotal > 0 ? taxableAmount / itemTaxableTotal : 1;
    totalTax = Math.round(itemTaxTotal * discountFactor * 100) / 100;
  }

  const cgstAmount = isInterstate ? 0 : Math.round((totalTax / 2) * 100) / 100;
  const sgstAmount = isInterstate ? 0 : Math.round((totalTax / 2) * 100) / 100;
  const igstAmount = isInterstate ? totalTax : 0;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(billDiscount * 100) / 100,
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalTax,
    totalAmount: Math.round((taxableAmount + totalTax) * 100) / 100,
  };
};

export const getGSTRateLabel = (rate: number): string => `${rate}% GST`;

export const validateGSTIN = (gstin: string): boolean => {
  const re = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return re.test(gstin);
};

export const validatePAN = (pan: string): boolean => {
  const re = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return re.test(pan);
};

export const getStateCodeFromGSTIN = (gstin: string): string =>
  gstin.length >= 2 ? gstin.substring(0, 2) : '';
