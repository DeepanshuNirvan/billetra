export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
}

export interface Business {
  id: string;
  userId: string;
  name: string;
  gstin?: string;
  pan?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  logoUrl?: string;
  defaultTemplate: string;
  defaultBillSize: string;
  invoicePrefix: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  categoryId?: string;
  category?: Category;
  description?: string;
  hsnCode?: string;
  unitType: string;
  customUnit?: string;
  sizeVariant?: string;
  sellingPrice: number;
  purchasePrice: number;
  gstRate: number;
  stockQuantity: number;
  lowStockAlert: number;
  isActive: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  billingAddress?: string;
  shippingAddress?: string;
  state?: string;
  creditLimit: number;
  paymentTerms?: string;
  outstandingBalance: number;
  isActive: boolean;
}

export interface Account {
  id: string;
  name: string;
  accountType: 'bank' | 'upi' | 'cash' | 'current' | 'credit' | 'wallet';
  accountNumber?: string;
  ifsc?: string;
  upiId?: string;
  branch?: string;
  isDefault: boolean;
  balance: number;
  isActive: boolean;
}

export interface BillItem {
  id?: string;
  productId?: string;
  name: string;
  hsnCode?: string;
  quantity: number;
  unit?: string;
  price: number;
  discountType: 'fixed' | 'percent';
  discountValue: number;
  discountAmount: number;
  gstRate: number;
  gstAmount: number;
  total: number;
}

export interface Bill {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customer?: Customer;
  accountId?: string;
  account?: Account;
  billDate: string;
  dueDate?: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  billSize: string;
  template: string;
  items: BillItem[];
  subtotal: number;
  discountType: 'fixed' | 'percent';
  discountValue: number;
  discountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  totalAmount: number;
  paidAmount: number;
  notes?: string;
  isInterstate: boolean;
  isLocked: boolean;
  createdAt: string;
}

export interface DashboardData {
  todaySales: number;
  monthSales: number;
  totalOutstanding: number;
  gstCollected: number;
  totalBills: number;
  paidBills: number;
  pendingBills: number;
  topProducts: { name: string; revenue: number; quantity: number }[];
  topCustomers: { name: string; totalAmount: number; billCount: number }[];
  recentBills: Bill[];
  lowStockProducts: Product[];
  salesChart: { date: string; amount: number }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  businessName: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  business?: Business;
}

export type BillStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';
export type AccountType = 'bank' | 'upi' | 'cash' | 'current' | 'credit' | 'wallet';
export type DiscountType = 'fixed' | 'percent';

export interface GSTSummary {
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  isInterstate: boolean;
}

export interface BillTotals {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  totalAmount: number;
}

export interface SalesReportRow {
  date: string;
  invoiceCount: number;
  subtotal: number;
  discount: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface GSTReportRow {
  invoiceNumber: string;
  customerName: string;
  billDate: string;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  total: number;
  isInterstate: boolean;
}

export interface InventoryReportRow {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  stockQuantity: number;
  purchasePrice: number;
  sellingPrice: number;
  stockValue: number;
  lowStockAlert: number;
  isLowStock: boolean;
}
