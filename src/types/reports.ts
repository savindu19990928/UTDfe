export interface ClosedBillItem {
  product_name: string;
  item_number: string;
  quantity: number;
  rental_days: number;
  returned_date: string;
  rental_fee: number;
}

export interface ClosedBill {
  id: number;
  bill_number: string;
  customer: string;
  customer_nic: string;
  customer_mobile: string;
  created_at: string;
  closed_at: string;
  rental_fee: string;
  rental_fee_raw?: number;
  fines: string;
  fines_raw?: number;
  income: string;
  income_raw?: number;
  refunds: string;
  refunds_raw?: number;
  profit: string;
  profit_raw?: number;
  discount: number;
  items_count: number;
  items: ClosedBillItem[];
}

export interface ClosedBillsReportData {
  start_date?: string;
  end_date?: string;
  closed_bills_count: number;
  total_profit: string | number;
  total_income: string | number;
  total_refunds: string | number;
  total_profit_formatted?: string;
  total_income_formatted?: string;
  total_refunds_formatted?: string;
  bills: ClosedBill[];
  detailed_bills?: ClosedBill[];
}

export interface FinancialBreakdownItem {
  source: string;
  in: string | number;
  out: string | number;
  net: string | number;
}

export interface FinancialReportData {
  start_date?: string;
  end_date?: string;
  total_in: string | number;
  total_out: string | number;
  total_money: string | number;
  sale_income?: string | number;
  rental_income?: string | number;
  rental_deposit_non_closed?: string | number;
  total_closed_bill_profit?: string | number;
  'total closed bill profit'?: string | number;
  breakdown?: FinancialBreakdownItem[];
  transactions?: Record<string, any>[];
}
