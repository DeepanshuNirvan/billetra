export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'super_admin' | 'user';
  isActive: boolean;
  createdAt: string;
}

export interface AdminUser extends User {
  business?: Business;
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
  showLogoOnBills: boolean;
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
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
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
  yesterdaySales: number;
  monthSales: number;
  lastMonthSales: number;
  totalOutstanding: number;
  gstCollected: number;
  totalBills: number;
  paidBills: number;
  pendingBills: number;
  topProducts: { name: string; totalRevenue: number; totalQty: number }[];
  topCustomers: { name: string; totalAmount: number; totalBills: number }[];
  recentBills: {
    id: string;
    invoiceNumber: string;
    customerName: string;
    billDate: string;
    totalAmount: number;
    status: string;
  }[];
  lowStockProducts: Product[];
  salesChart: { date: string; amount: number }[];
  monthlyRevenue: { month: string; amount: number }[];
  overdueAging: {
    days030: number;
    days3160: number;
    days6190: number;
    days90Plus: number;
  } | null;
  avgBillValue: number;
  weekSales: number;
  lastWeekSales: number;
  partialBills: number;
  overdueBills: number;
  cancelledBills: number;
  totalCustomers: number;
  totalProducts: number;
  newCustomersThisMonth: number;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export interface BulkImportResult {
  created: number;
  errors: string[];
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
  accessToken: string;
  user: User;
  business?: Business;
}

export type BillStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
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
  invoiceCount: number; // from invoice_count via camelCase transform
  subtotal: number;
  discount: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface GSTReportRow {
  invoiceNumber: string; // from invoice_number
  customerName: string;  // from customer_name
  billDate: string;      // from bill_date
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;      // from total_gst
  total: number;
  isInterstate: boolean; // from is_interstate
}

export interface InventoryReportRow {
  id: string;
  name: string;
  sku: string;
  category: string;
  stockQuantity: number;  // from stock_quantity
  purchasePrice: number;  // from purchase_price
  sellingPrice: number;   // from selling_price
  stockValue: number;     // from stock_value
  lowStockAlert: number;  // from low_stock_alert
  isLowStock: boolean;    // from is_low_stock
}
