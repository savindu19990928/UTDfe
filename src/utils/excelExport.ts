import * as XLSX from 'xlsx';
import {
  FinancialReportData,
  OpenedBillsReportData,
  UnsettledBillsReportData,
  ClosedBillsReportData
} from '../types/reports';

/**
 * Trigger browser download of an XLSX workbook
 */
export function downloadWorkbook(
  wb: XLSX.WorkBook,
  filename: string
): void {
  const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = cleanFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generic helper to build a sheet from 2D array of data with auto column widths
 */
export function createSheetFromAoa(data: any[][]): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(data);
  // Auto-fit column widths
  const colWidths = data.reduce<number[]>((acc, row) => {
    row.forEach((cell, colIdx) => {
      const len = cell != null ? String(cell).length : 0;
      acc[colIdx] = Math.max(acc[colIdx] || 10, len + 3);
    });
    return acc;
  }, []);
  ws['!cols'] = colWidths.map((w) => ({ wch: Math.min(w, 50) }));
  return ws;
}

function parseNum(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (val == null || val === '') return 0;
  return parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0;
}

// -------------------------------------------------------------
// 1. FINANCIAL REPORT EXPORT
// -------------------------------------------------------------
export function exportFinancialReportToExcel(
  data: FinancialReportData,
  startDate?: string,
  endDate?: string
): void {
  const wb = XLSX.utils.book_new();
  const dateStr = `${startDate || data.start_date || 'Start'}_to_${endDate || data.end_date || 'End'}`;

  // Sheet 1: Summary KPIs
  const totalIn = parseNum(data.total_money_in ?? data.total_in);
  const totalOut = parseNum(data.total_money_out ?? data.total_out);
  const netFlow = data.net_cash_flow != null ? parseNum(data.net_cash_flow) : totalIn - totalOut;
  const depositTaken = parseNum(data.total_deposit_taken ?? data.deposit_taken ?? data.total_deposit);
  const refundGiven = parseNum(data.total_refund_given ?? data.refund_given ?? data.total_refunds);
  const finesCollected = parseNum(data.total_fines_collected ?? data.fines_collected ?? data.total_fines);
  const expensesTotal = parseNum(data.total_expenses ?? data.total_expense ?? data.expenses_total);

  const summaryRows: any[][] = [
    ['TOOL DEPOT POS - FINANCIAL REPORT'],
    ['Period', `${startDate || data.start_date || 'Start'} to ${endDate || data.end_date || 'Today'}`],
    ['Generated At', new Date().toLocaleString()],
    [],
    ['KEY FINANCIAL METRICS', 'AMOUNT (LKR)'],
    ['Total Money Came In', totalIn],
    ['Total Money Gone Out', totalOut],
    ['Net Cash Flow', netFlow],
    ['Total Deposit Taken', depositTaken],
    ['Total Refund Given', refundGiven],
    ['Total Fines Collected', finesCollected],
    ['Total Expenses', expensesTotal]
  ];

  if (data.sale_income != null) {
    summaryRows.push(['Sale Income', parseNum(data.sale_income)]);
  }
  if (data.rental_income != null) {
    summaryRows.push(['Rental Income', parseNum(data.rental_income)]);
  }

  const wsSummary = createSheetFromAoa(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // Sheet 2: Breakdown by Source
  if (Array.isArray(data.breakdown) && data.breakdown.length > 0) {
    const breakdownRows: any[][] = [
      ['Source / Category', 'Money In', 'Money Out', 'Net Flow'],
      ...data.breakdown.map((b) => [
        b.source,
        parseNum(b.in),
        parseNum(b.out),
        parseNum(b.net)
      ]),
      ['Total', totalIn, totalOut, netFlow]
    ];
    const wsBreakdown = createSheetFromAoa(breakdownRows);
    XLSX.utils.book_append_sheet(wb, wsBreakdown, 'Cash Flow Breakdown');
  }

  // Sheet 3: Expenses
  const expensesList = Array.isArray(data.expenses)
    ? data.expenses
    : Array.isArray(data.detailed_expenses)
    ? data.detailed_expenses
    : [];
  if (expensesList.length > 0) {
    const expenseRows: any[][] = [
      ['ID', 'Description', 'Amount', 'Date & Time', 'Staff User', 'Register ID'],
      ...expensesList.map((e) => [
        e.id,
        e.description,
        parseNum(e.amount_raw ?? e.amount),
        e.created_at,
        e.created_by || '',
        e.cash_register_id != null ? `#${e.cash_register_id}` : ''
      ]),
      ['Total', '', expensesTotal, '', '', '']
    ];
    const wsExpenses = createSheetFromAoa(expenseRows);
    XLSX.utils.book_append_sheet(wb, wsExpenses, 'Itemized Expenses');
  }

  // Sheet 4: Transactions Ledger
  if (Array.isArray(data.transactions) && data.transactions.length > 0) {
    const keys = Object.keys(data.transactions[0]).filter((k) => k !== 'transaction_type');
    const headers = keys.map((k) => k.replace(/_/g, ' ').toUpperCase());
    const txnRows: any[][] = [
      headers,
      ...data.transactions.map((t) =>
        keys.map((k) => {
          const val = t[k];
          if (typeof val === 'number') return val;
          if (typeof val === 'string' && !isNaN(Number(val)) && val.trim() !== '') {
            return Number(val);
          }
          return val ?? '';
        })
      )
    ];
    const wsTxns = createSheetFromAoa(txnRows);
    XLSX.utils.book_append_sheet(wb, wsTxns, 'Transactions Ledger');
  }

  downloadWorkbook(wb, `financial_report_${dateStr}.xlsx`);
}

// -------------------------------------------------------------
// 2. OPENED BILLS REPORT EXPORT
// -------------------------------------------------------------
export function exportOpenedBillsReportToExcel(
  data: OpenedBillsReportData,
  date?: string
): void {
  const wb = XLSX.utils.book_new();
  const effectiveDate = date || data.end_date || 'today';
  const bills = Array.isArray(data.bills)
    ? data.bills
    : Array.isArray(data.detailed_bills)
    ? data.detailed_bills
    : [];

  const headers = [
    'Bill Number',
    'Customer',
    'Customer NIC',
    'Customer Mobile',
    'Status',
    'Created At',
    'Accrued Rental Fee',
    'Accrued Fines',
    'Charged Amount (Income)',
    'Deposit Taken',
    'Items Count'
  ];

  const rows: any[][] = [
    ['TOOL DEPOT POS - OPENED BILLS REPORT'],
    ['Cutoff Date', effectiveDate],
    ['Generated At', new Date().toLocaleString()],
    ['Total Opened Bills', data.opened_bills_count ?? data.open_bills_count ?? bills.length],
    ['Total Income (Charged)', parseNum(data.total_charged_amount ?? data.total_income)],
    ['Total Deposit Taken', parseNum(data.total_deposit_taken ?? data.total_deposit)],
    [],
    headers,
    ...bills.map((b) => [
      b.bill_number,
      b.customer,
      b.customer_nic || '',
      b.customer_mobile || '',
      b.status || 'open',
      b.created_at,
      parseNum(b.rental_fee_raw ?? b.rental_fee),
      parseNum(b.fines_raw ?? b.fines),
      parseNum(b.charged_amount_raw ?? b.income_raw ?? b.charged_amount ?? b.income),
      parseNum(b.deposit_taken_raw ?? b.deposit_raw ?? b.deposit_taken ?? b.deposit),
      b.items_count || b.items?.length || 0
    ])
  ];

  const ws = createSheetFromAoa(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Opened Bills');

  // Detailed items sheet
  const itemRows: any[][] = [
    [
      'Bill Number',
      'Customer',
      'Tool / Product',
      'Serial Number',
      'Quantity',
      'Rental Start Date',
      'Expected End Date',
      'Return Status',
      'Accrued Days',
      'Accrued Fee'
    ]
  ];
  bills.forEach((b) => {
    (b.items || []).forEach((item) => {
      itemRows.push([
        b.bill_number,
        b.customer,
        item.product_name,
        item.item_number,
        item.quantity,
        item.rental_start_date || '',
        item.rental_end_date || '',
        item.is_returned ? `Returned (${item.returned_date || ''})` : 'Still Rented',
        item.rental_days,
        parseNum(item.rental_fee)
      ]);
    });
  });

  if (itemRows.length > 1) {
    const wsItems = createSheetFromAoa(itemRows);
    XLSX.utils.book_append_sheet(wb, wsItems, 'Rented Items');
  }

  downloadWorkbook(wb, `opened_bills_report_${effectiveDate}.xlsx`);
}

// -------------------------------------------------------------
// 3. PAYMENT UNSETTLED BILLS REPORT EXPORT
// -------------------------------------------------------------
export function exportUnsettledBillsReportToExcel(
  data: UnsettledBillsReportData,
  date?: string
): void {
  const wb = XLSX.utils.book_new();
  const effectiveDate = date || data.end_date || 'today';
  const bills = Array.isArray(data.bills)
    ? data.bills
    : Array.isArray(data.detailed_bills)
    ? data.detailed_bills
    : [];

  const headers = [
    'Bill Number',
    'Customer',
    'Customer NIC',
    'Customer Mobile',
    'Status',
    'Created At',
    'Rental Fee',
    'Fines',
    'Charged Amount',
    'Deposit Taken',
    'Unsettled Amount (Owed)',
    'Items Count'
  ];

  const rows: any[][] = [
    ['TOOL DEPOT POS - PAYMENT UNSETTLED BILLS REPORT'],
    ['Cutoff Date', effectiveDate],
    ['Generated At', new Date().toLocaleString()],
    ['Total Unsettled Bills', data.unsettled_bills_count ?? data.unpaid_bills_count ?? bills.length],
    ['Total Charged Amount', parseNum(data.total_charged_amount ?? data.total_income)],
    ['Total Fines', parseNum(data.total_fines)],
    ['Total Deposit Taken', parseNum(data.total_deposit_taken ?? data.total_deposit)],
    ['Total Unsettled Amount (Owed)', parseNum(data.total_unsettled_amount ?? data.total_amount_owed ?? data.total_due)],
    [],
    headers,
    ...bills.map((b) => [
      b.bill_number,
      b.customer,
      b.customer_nic || '',
      b.customer_mobile || '',
      b.status || 'unpaid',
      b.created_at,
      parseNum(b.rental_fee_raw ?? b.rental_fee),
      parseNum(b.fines_raw ?? b.fines),
      parseNum(b.charged_amount_raw ?? b.income_raw ?? b.charged_amount ?? b.income),
      parseNum(b.deposit_taken_raw ?? b.deposit_raw ?? b.deposit_taken ?? b.deposit),
      parseNum(b.unsettled_amount_raw ?? b.amount_owed_raw ?? b.due_amount_raw ?? b.unsettled_amount ?? b.amount_owed ?? b.due_amount),
      b.items_count || b.items?.length || 0
    ])
  ];

  const ws = createSheetFromAoa(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Unsettled Bills');

  // Items sheet
  const itemRows: any[][] = [
    [
      'Bill Number',
      'Customer',
      'Tool / Product',
      'Serial Number',
      'Quantity',
      'Rental Start Date',
      'Expected End Date',
      'Return Status',
      'Rental Days',
      'Rental Fee'
    ]
  ];
  bills.forEach((b) => {
    (b.items || []).forEach((item) => {
      itemRows.push([
        b.bill_number,
        b.customer,
        item.product_name,
        item.item_number,
        item.quantity,
        item.rental_start_date || '',
        item.rental_end_date || '',
        item.is_returned ? `Returned (${item.returned_date || ''})` : 'Still Rented',
        item.rental_days,
        parseNum(item.rental_fee)
      ]);
    });
  });

  if (itemRows.length > 1) {
    const wsItems = createSheetFromAoa(itemRows);
    XLSX.utils.book_append_sheet(wb, wsItems, 'Rented Items');
  }

  downloadWorkbook(wb, `unsettled_bills_report_${effectiveDate}.xlsx`);
}

// -------------------------------------------------------------
// 4. CLOSED BILLS REPORT EXPORT
// -------------------------------------------------------------
export function exportClosedBillsReportToExcel(
  data: ClosedBillsReportData,
  startDate?: string,
  endDate?: string
): void {
  const wb = XLSX.utils.book_new();
  const dateStr = `${startDate || data.start_date || 'Start'}_to_${endDate || data.end_date || 'End'}`;
  const bills = Array.isArray(data.bills)
    ? data.bills
    : Array.isArray(data.detailed_bills)
    ? data.detailed_bills
    : [];

  const closedProfit = parseNum(
    data.closed_bill_profit ?? data.total_closed_bill_profit ?? data.total_profit
  );
  const totalRentalFee = parseNum(data.total_rental_fee);
  const totalFines = parseNum(data.total_fines);
  const totalIncome = parseNum(data.total_income);
  const totalRefunds = parseNum(data.total_refunds);

  const headers = [
    'Bill Number',
    'Customer',
    'Customer NIC',
    'Customer Mobile',
    'Created At',
    'Closed At',
    'Rental Fee',
    'Fines',
    'Deposit (Income)',
    'Refund',
    'Closed Bill Profit',
    'Items Count'
  ];

  const rows: any[][] = [
    ['TOOL DEPOT POS - CLOSED BILLS REPORT'],
    ['Period', `${startDate || data.start_date || 'Start'} to ${endDate || data.end_date || 'Today'}`],
    ['Generated At', new Date().toLocaleString()],
    ['Total Closed Bills', data.closed_bills_count ?? bills.length],
    ['Closed Bill Profit (Rental Fee + Fines)', closedProfit],
    ['Total Rental Fee', totalRentalFee],
    ['Total Fines', totalFines],
    ['Total Customer Deposits (Income)', totalIncome],
    ['Total Refunds Given', totalRefunds],
    [],
    headers,
    ...bills.map((b) => [
      b.bill_number,
      b.customer,
      b.customer_nic || '',
      b.customer_mobile || '',
      b.created_at,
      b.closed_at,
      parseNum(b.rental_fee_raw ?? b.rental_fee),
      parseNum(b.fines_raw ?? b.fines),
      parseNum(b.income_raw ?? b.income),
      parseNum(b.refunds_raw ?? b.refunds),
      parseNum(b.closed_bill_profit_raw ?? b.profit_raw ?? b.closed_bill_profit ?? b.profit),
      b.items_count || b.items?.length || 0
    ])
  ];

  const ws = createSheetFromAoa(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Closed Bills');

  // Detailed items sheet
  const itemRows: any[][] = [
    [
      'Bill Number',
      'Customer',
      'Tool / Product',
      'Serial Number',
      'Quantity',
      'Rental Days',
      'Returned Date',
      'Rental Fee'
    ]
  ];
  bills.forEach((b) => {
    (b.items || []).forEach((item) => {
      itemRows.push([
        b.bill_number,
        b.customer,
        item.product_name,
        item.item_number,
        item.quantity,
        item.rental_days,
        item.returned_date || '',
        parseNum(item.rental_fee)
      ]);
    });
  });

  if (itemRows.length > 1) {
    const wsItems = createSheetFromAoa(itemRows);
    XLSX.utils.book_append_sheet(wb, wsItems, 'Closed Items');
  }

  downloadWorkbook(wb, `closed_bills_report_${dateStr}.xlsx`);
}

// -------------------------------------------------------------
// 5. GENERIC REPORT EXPORT (Stock, Damaged, Customers, Banned, etc.)
// -------------------------------------------------------------
export function exportGenericReportToExcel(
  reportType: string,
  reportTitle: string,
  summary: [string, any][],
  tables: { title: string; rows: Record<string, any>[] }[],
  dateRangeStr?: string
): void {
  const wb = XLSX.utils.book_new();

  // If there are summary metrics
  if (summary.length > 0) {
    const summaryRows: any[][] = [
      [`TOOL DEPOT POS - ${reportTitle.toUpperCase()}`],
      ['Generated At', new Date().toLocaleString()],
      ...(dateRangeStr ? [['Period / Date', dateRangeStr]] : []),
      [],
      ['Metric', 'Value'],
      ...summary.map(([k, v]) => [
        k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        typeof v === 'number' ? v : String(v ?? '')
      ])
    ];
    const wsSummary = createSheetFromAoa(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
  }

  // Add sheets for each table
  tables.forEach((table, idx) => {
    if (!table.rows || table.rows.length === 0) return;
    const keys = Object.keys(table.rows[0]);
    const headers = keys.map((k) => k.replace(/_/g, ' ').toUpperCase());
    const rows: any[][] = [
      headers,
      ...table.rows.map((r) =>
        keys.map((k) => {
          const val = r[k];
          if (typeof val === 'number') return val;
          if (typeof val === 'string' && !isNaN(Number(val)) && val.trim() !== '') {
            return Number(val);
          }
          return val ?? '';
        })
      )
    ];
    const sheetName = (table.title || `Records ${idx + 1}`).slice(0, 31);
    const wsTable = createSheetFromAoa(rows);
    XLSX.utils.book_append_sheet(wb, wsTable, sheetName || `Sheet${idx + 1}`);
  });

  const filename = `${reportType}_report_${dateRangeStr ? dateRangeStr.replace(/[^a-zA-Z0-9_-]/g, '_') : 'snapshot'}.xlsx`;
  downloadWorkbook(wb, filename);
}

// -------------------------------------------------------------
// 6. MACHINE REPORT EXPORT
// -------------------------------------------------------------
export function exportMachineReportToExcel(groups: any[]): void {
  const wb = XLSX.utils.book_new();
  const rows: any[][] = [
    ['TOOL DEPOT POS - MACHINE USAGE REPORT'],
    ['Generated At', new Date().toLocaleString()],
    [],
    [
      'Product Name',
      'Category',
      'Machine ID',
      'Machine Number',
      'Used After Reset',
      'Max Use Count',
      'Total Used Count',
      'Last Reset Date',
      'Is Active'
    ]
  ];

  groups.forEach((g) => {
    (g.machines || []).forEach((m: any) => {
      rows.push([
        g.product_name,
        g.category_name,
        m.machine_id,
        m.machine_number,
        m.used_count ?? m.rented_times_after_last_reset,
        m.max_use_count ?? m.max_use_time,
        m.total_used_count ?? m.total_rented_times,
        m.last_reset_date || '',
        m.is_active ? 'Yes' : 'No'
      ]);
    });
  });

  const ws = createSheetFromAoa(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Machines');
  downloadWorkbook(wb, `machine_usage_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

