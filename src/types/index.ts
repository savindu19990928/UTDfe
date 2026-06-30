export type ApiCategory = {
  id: number | string;
  name: string;
  category_type?: 'sell' | 'rent';
};

export type Product = {
  id: string;
  name: string;
  category: string;
  categoryId?: number | string;
  listingType: 'sale' | 'rent';
  salePrice: number;
  rentPricePerDay: number | null;
  stock: number;
  itemCode?: string;
  barcode?: string;
  isStockTracked?: boolean;
};

export type CartItemType = 'sale' | 'rent';

export type RentalItemStatus = 'active' | 'returned';

export type CartItem = {
  product: Product;
  quantity: number;
  type: CartItemType;
  rentalDays?: number;
  // Rental specific fields
  borrowedDate?: string;
  expectedReturnDate?: string;
  actualReturnDate?: string;
  actualReturnTime?: string;
  status?: RentalItemStatus;
  apiItemId?: number;
  returnedQuantity?: number;
  rentalFee?: number;
};

export type RentalRecord = {
  id: string;
  product: Product;
  quantity: number;
  startDate: string;
  endDate: string;
  customerName: string;
  status: 'active' | 'returned' | 'overdue';
};

export type SaleRecord = {
  id: string;
  product: Product;
  quantity: number;
  date: string;
  customerName: string;
  total: number;
};

export type CustomerRecord = {
  id: string;
  name: string;
  phone: string;
  address: string;
  email?: string;
  nicNumber?: string;
  photoUrl?: string;
  phoneVerified?: boolean;
  isBanned?: boolean;
  rentalCount?: number;
};

export type Customer = {
  name: string;
  phone: string;
  address: string;
  email?: string;
};

export type DamageRecord = {
  id: string;
  productId: string;
  productName: string;
  damagedQty: number;
  date: string;
  severity: 'minor' | 'major' | 'total_loss';
  notes: string;
  estimatedLoss: number;
};

export type ExpenseCategory =
'transport' |
'fuel' |
'maintenance' |
'office' |
'utilities' |
'other';

export type Expense = {
  id: string | number;
  description: string;
  amount: number;
  date: string;
  created_by_name?: string;
};

export type DepositEntry = {
  amount: number;
  date: string;
  note?: string;
};

export type RentalFine = {
  id?: number;
  reason: string;
  fine: number;
  created_at?: string;
};

export type RentalBillStatus = 'open' | 'partially_closed' | 'closed';

export type Bill = {
  id: string;
  apiId?: number;
  date: string;
  dueDate: string;
  customer: Customer;
  items: CartItem[];
  subtotal: number;
  discount: number;
  discountAmount: number;
  tax: number;
  total: number;
  type: 'invoice';
  paymentMethod?: 'cash' | 'card' | 'bank_transfer';
  deposit?: number;
  depositHistory?: DepositEntry[];
  fines?: RentalFine[];
  customerPhotoUrl?: string;
  customerNic?: string;
  nicTaken?: boolean;
  rentalStatus?: RentalBillStatus;
};

export type CashTransaction = {
  id: string;
  type: 'cash_in' | 'cash_out';
  amount: number;
  note: string;
  date: string;
};