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
  closed_bill_profit?: string | number;
  closed_bill_profit_raw?: number;
  discount: number;
  items_count: number;
  items: ClosedBillItem[];
}

export interface ClosedBillsReportData {
  start_date?: string;
  end_date?: string;
  closed_bills_count: number;
  closed_bill_profit?: string | number;
  total_closed_bill_profit?: string | number;
  total_profit: string | number;
  total_rental_fee?: string | number;
  total_fines?: string | number;
  total_income: string | number;
  total_refunds: string | number;
  closed_bill_profit_formatted?: string;
  total_closed_bill_profit_formatted?: string;
  total_profit_formatted?: string;
  total_rental_fee_formatted?: string;
  total_fines_formatted?: string;
  total_income_formatted?: string;
  total_refunds_formatted?: string;
  bills: ClosedBill[];
  detailed_bills?: ClosedBill[];
}

export interface PaymentMethodBreakdownItem {
  name: string;
  sales: string | number;
  deposits: string | number;
  refunds: string | number;
  total_amount: string | number;
  total_in?: string | number;
  total_out?: string | number;
  net: string | number;
  sales_formatted?: string;
  deposits_formatted?: string;
  refunds_formatted?: string;
  total_amount_formatted?: string;
  total_in_formatted?: string;
  net_formatted?: string;
}

export interface PaymentMethodsMap {
  cash?: PaymentMethodBreakdownItem;
  card?: PaymentMethodBreakdownItem;
  bank_transfer?: PaymentMethodBreakdownItem;
  [key: string]: PaymentMethodBreakdownItem | undefined;
}

export interface FinancialBreakdownItem {
  source: string;
  in: string | number;
  out: string | number;
  net: string | number;
}

export interface FinancialExpenseItem {
  id: number;
  description: string;
  amount: string | number;
  amount_raw?: number;
  amount_formatted?: string;
  created_at: string;
  created_by?: string;
  cash_register_id?: number;
}

export interface FinancialReportData {
  start_date?: string;
  end_date?: string;
  total_in: string | number;
  total_out: string | number;
  total_money_in?: string | number;
  total_money_out?: string | number;
  net_cash_flow?: string | number;
  total_deposit_taken?: string | number;
  deposit_taken?: string | number;
  total_deposit?: string | number;
  total_refund_given?: string | number;
  refund_given?: string | number;
  total_refunds?: string | number;
  total_fines_collected?: string | number;
  fines_collected?: string | number;
  total_fines?: string | number;
  total_expenses?: string | number;
  total_expense?: string | number;
  expenses_total?: string | number;
  total_expenses_formatted?: string;
  expenses_count?: number;
  total_in_formatted?: string;
  total_out_formatted?: string;
  net_cash_flow_formatted?: string;
  total_deposit_taken_formatted?: string;
  total_refund_given_formatted?: string;
  total_fines_collected_formatted?: string;
  total_money?: string | number;
  total_cash?: string | number;
  total_card?: string | number;
  total_bank_transfer?: string | number;
  total_cash_formatted?: string;
  total_card_formatted?: string;
  total_bank_transfer_formatted?: string;
  payment_methods?: PaymentMethodsMap;
  payment_methods_breakdown?: PaymentMethodBreakdownItem[];
  sale_income?: string | number;
  rental_income?: string | number;
  rental_deposit_non_closed?: string | number;
  total_closed_bill_profit?: string | number;
  'total closed bill profit'?: string | number;
  expenses?: FinancialExpenseItem[];
  detailed_expenses?: FinancialExpenseItem[];
  breakdown?: FinancialBreakdownItem[];
  transactions?: Record<string, any>[];
}

export interface OpenedBillItem {
  product_name: string;
  item_number: string;
  quantity: number;
  rental_start_date?: string;
  rental_end_date?: string;
  is_returned?: boolean;
  returned_date?: string;
  rental_days: number;
  rental_fee: number;
}

export interface OpenedBill {
  id: number;
  bill_number: string;
  customer: string;
  customer_nic: string;
  customer_mobile: string;
  status?: string;
  created_at: string;
  rental_fee: string | number;
  rental_fee_raw?: number;
  fines: string | number;
  fines_raw?: number;
  income: string | number;
  income_raw?: number;
  charged_amount?: string | number;
  charged_amount_raw?: number;
  deposit: string | number;
  deposit_raw?: number;
  deposit_taken?: string | number;
  deposit_taken_raw?: number;
  discount: number;
  items_count: number;
  items: OpenedBillItem[];
}

export interface OpenedBillsReportData {
  start_date?: string;
  end_date?: string;
  opened_bills_count?: number;
  open_bills_count?: number;
  total_rental_fee?: string | number;
  total_fines?: string | number;
  total_income?: string | number;
  total_charged_amount?: string | number;
  total_deposit?: string | number;
  total_deposit_taken?: string | number;
  total_rental_fee_formatted?: string;
  total_fines_formatted?: string;
  total_income_formatted?: string;
  total_charged_amount_formatted?: string;
  total_deposit_formatted?: string;
  total_deposit_taken_formatted?: string;
  bills: OpenedBill[];
  detailed_bills?: OpenedBill[];
}

export interface FineDetail {
  reason: string;
  fine: number;
  fine_formatted?: string;
  created_at?: string;
}

export interface UnsettledBill extends OpenedBill {
  refunds?: string | number;
  refunds_raw?: number;
  remaining_deposit?: string | number;
  remaining_deposit_raw?: number;
  unsettled_amount?: string | number;
  unsettled_amount_raw?: number;
  amount_owed?: string | number;
  amount_owed_raw?: number;
  due_amount?: string | number;
  due_amount_raw?: number;
  fines_details?: FineDetail[];
}

export interface UnsettledBillsReportData {
  start_date?: string;
  end_date?: string;
  unsettled_bills_count?: number;
  unpaid_bills_count?: number;
  total_rental_fee?: string | number;
  total_fines?: string | number;
  total_income?: string | number;
  total_charged_amount?: string | number;
  total_deposit?: string | number;
  total_deposit_taken?: string | number;
  total_refunds?: string | number;
  total_unsettled_amount?: string | number;
  total_amount_owed?: string | number;
  total_due?: string | number;
  total_rental_fee_formatted?: string;
  total_fines_formatted?: string;
  total_income_formatted?: string;
  total_charged_amount_formatted?: string;
  total_deposit_formatted?: string;
  total_deposit_taken_formatted?: string;
  total_refunds_formatted?: string;
  total_unsettled_amount_formatted?: string;
  total_amount_owed_formatted?: string;
  total_due_formatted?: string;
  bills: UnsettledBill[];
  detailed_bills?: UnsettledBill[];
}

export interface RentedItem {
  item_id: number;
  bill_id: number;
  bill_number: string;
  product_name: string;
  item_number: string;
  machine_number: string;
  price?: number;
  price_per_day: number;
  price_per_day_formatted?: string;
  quantity: number;
  customer_name: string;
  customer_mobile: string;
  customer_nic?: string;
  customer_address?: string;
  rental_start_date?: string;
  rental_end_date?: string;
  days_rented?: number;
}

export interface RentedItemsReportData {
  target_date?: string;
  end_date?: string;
  total_rented_items: number;
  items: RentedItem[];
}

export interface HeldDocumentCustomer {
  customer_id: number;
  customer_name: string;
  mobile_number: string;
  taken_id: string;
  taken_id_types?: string[];
  nic_number?: string;
  bills?: string[];
  bill_number?: string;
}

export interface HeldDocumentsReportData {
  start_date?: string;
  end_date?: string;
  total_customers: number;
  total_nic?: number;
  total_passport?: number;
  total_driving_licence?: number;
  customers: HeldDocumentCustomer[];
}
