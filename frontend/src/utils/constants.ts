export const GST_RATES = [0, 5, 12, 18, 28];

export const UNIT_TYPES = [
  'Pieces', 'Kg', 'Gram', 'Litre', 'ML', 'Meter', 'CM',
  'Box', 'Dozen', 'Pack', 'Set', 'Pair', 'Bundle', 'Custom',
];

export const BILL_SIZES = [
  { value: 'A4_PORTRAIT', label: 'A4 Portrait' },
  { value: 'A4_LANDSCAPE', label: 'A4 Landscape' },
  { value: 'HALF_A4', label: 'Half A4' },
  { value: 'THERMAL_3', label: '3-inch Thermal' },
  { value: 'THERMAL_4', label: '4-inch Thermal' },
];

export const BILL_TEMPLATES = [
  { value: 'MODERN_MINIMAL', label: 'Modern Minimal' },
  { value: 'CLASSIC_GST', label: 'Classic GST' },
  { value: 'RETAIL_COMPACT', label: 'Retail Compact' },
  { value: 'THERMAL', label: 'Thermal' },
  { value: 'CORPORATE', label: 'Corporate' },
];

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

export const ACCOUNT_TYPES = [
  { value: 'bank', label: 'Bank Account', icon: 'building-2' },
  { value: 'upi', label: 'UPI', icon: 'smartphone' },
  { value: 'cash', label: 'Cash', icon: 'banknote' },
  { value: 'current', label: 'Current Account', icon: 'credit-card' },
  { value: 'credit', label: 'Credit Card', icon: 'credit-card' },
  { value: 'wallet', label: 'Digital Wallet', icon: 'wallet' },
];

export const BILL_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

export const BILL_STATUS_COLORS: Record<string, string> = {
  pending: 'yellow',
  paid: 'green',
  overdue: 'red',
  cancelled: 'gray',
};

export const PAYMENT_TERMS = [
  'Immediate', 'Net 7', 'Net 15', 'Net 30', 'Net 45', 'Net 60',
];

export const PAGE_SIZE = 20;
