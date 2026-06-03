export const GST_RATES = [0, 5, 12, 18, 28];

export const UNIT_TYPES = [
  'Pieces', 'Kg', 'Gram', 'Litre', 'ML', 'Meter', 'CM',
  'Box', 'Dozen', 'Pack', 'Set', 'Pair', 'Bundle', 'Custom',
];

export const BILL_SIZES = [
  { value: 'a4_portrait', label: 'A4 Portrait' },
  { value: 'a4_landscape', label: 'A4 Landscape' },
  { value: 'half_a4', label: 'Half A4' },
  { value: 'thermal_3', label: '3-inch Thermal' },
  { value: 'thermal_4', label: '4-inch Thermal' },
];

// Canonical template slugs — must match backend services.Templates.
export interface BillTemplateOption {
  value: string;
  label: string;
  description: string;
  accent: string;
}

export const BILL_TEMPLATES: BillTemplateOption[] = [
  { value: 'modern', label: 'Modern', description: 'Clean indigo accent, zebra rows. Great default.', accent: '#4f46e5' },
  { value: 'classic_gst', label: 'Classic GST', description: 'Formal bordered tax invoice with CGST/SGST columns.', accent: '#1e3a8a' },
  { value: 'corporate', label: 'Corporate', description: 'Bold full-width colour header band.', accent: '#0f766e' },
  { value: 'elegant', label: 'Elegant B/W', description: 'Refined black & white, hairline rules.', accent: '#111827' },
  { value: 'retail', label: 'Retail Compact', description: 'Dense compact layout for quick counter bills.', accent: '#b91c1c' },
  { value: 'thermal', label: 'Thermal 80mm', description: 'Narrow thermal-printer receipt.', accent: '#374151' },
  { value: 'royal', label: 'Royal', description: 'Navy & gold double-frame premium look.', accent: '#1e3a8a' },
  { value: 'minimal', label: 'Minimal', description: 'Ultra-clean, lots of whitespace, single accent line.', accent: '#0ea5e9' },
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
  partial: 'Partial',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

export const BILL_STATUS_COLORS: Record<string, string> = {
  pending: 'yellow',
  partial: 'blue',
  paid: 'green',
  overdue: 'red',
  cancelled: 'gray',
};

export const PAYMENT_TERMS = [
  'Immediate', 'Net 7', 'Net 15', 'Net 30', 'Net 45', 'Net 60',
];

export const PAGE_SIZE = 20;
