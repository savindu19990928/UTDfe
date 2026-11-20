import * as XLSX from 'xlsx';
import {
  FinancialReportData,
  OpenedBillsReportData,
  UnsettledBillsReportData,
  ClosedBillsReportData,
  RentedItemsReportData,
  HeldDocumentsReportData,
  ExpensesReportData,
  SingleMachineHistoryReportData,
  StockMovementsReportData,
  AuditLogReportData
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
  if (data.total_closed_bill_profit != null || data['total closed bill profit'] != null) {
    summaryRows.push(['Closed Bill Profit', parseNum(data.total_closed_bill_profit ?? data['total closed bill profit'])]);
  }
  if (data.total_money != null) {
    summaryRows.push(['Cash Register Total Money', parseNum(data.total_money)]);
  }

  const totalCash = parseNum(data.total_cash ?? data.payment_methods?.cash?.total_in ?? data.payment_methods?.cash?.total_amount);
  const totalCard = parseNum(data.total_card ?? data.payment_methods?.card?.total_in ?? data.payment_methods?.card?.total_amount);
  const totalBank = parseNum(data.total_bank_transfer ?? data.payment_methods?.bank_transfer?.total_in ?? data.payment_methods?.bank_transfer?.total_amount);

  if (totalCash > 0 || totalCard > 0 || totalBank > 0) {
    summaryRows.push([]);
    summaryRows.push(['PAYMENT METHOD TOTALS', 'INFLOW (LKR)']);
    summaryRows.push(['Total Cash', totalCash]);
    summaryRows.push(['Total Card', totalCard]);
    summaryRows.push(['Total Bank Transfer', totalBank]);
  }

  const wsSummary = createSheetFromAoa(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // Sheet: Payment Methods Breakdown
  const pmList =
    Array.isArray(data.payment_methods_breakdown) && data.payment_methods_breakdown.length > 0
      ? data.payment_methods_breakdown
      : data.payment_methods && typeof data.payment_methods === 'object'
      ? ['cash', 'card', 'bank_transfer']
          .map((k) => data.payment_methods![k])
          .filter(Boolean)
      : [];

  if (pmList.length > 0) {
    const pmRows: any[][] = [
      ['Payment Method', 'Sales In', 'Deposits In', 'Total Money In', 'Refunds Out', 'Net Flow'],
      ...pmList.map((pm: any) => {
        const s = parseNum(pm.sales);
        const d = parseNum(pm.deposits);
        const tIn = parseNum(pm.total_in ?? pm.total_amount);
        const rOut = parseNum(pm.refunds ?? pm.total_out);
        const net = parseNum(pm.net ?? tIn - rOut);
        return [pm.name, s, d, tIn, rOut, net];
      })
    ];
    const wsPaymentMethods = createSheetFromAoa(pmRows);
    XLSX.utils.book_append_sheet(wb, wsPaymentMethods, 'Payment Methods');
  }

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

// -------------------------------------------------------------
// 7. RENTED ITEMS REPORT EXPORT
// -------------------------------------------------------------
export function exportRentedItemsReportToExcel(
  data: RentedItemsReportData,
  targetDate?: string
): void {
  const wb = XLSX.utils.book_new();
  const dateStr = targetDate || data.target_date || data.end_date || new Date().toISOString().slice(0, 10);
  const items = Array.isArray(data.items) ? data.items : [];

  const totalItems = data.total_rented_items ?? items.reduce((s, i) => s + (Number(i.quantity) || 1), 0);
  const totalValue = items.reduce((s, i) => s + (Number(i.price_per_day ?? i.price ?? 0) * (Number(i.quantity) || 1)), 0);

  // Sheet 1: Summary
  const summaryRows: any[][] = [
    ['TOOL DEPOT POS - RENTED ITEMS REPORT'],
    ['Target Date', dateStr],
    ['Generated At', new Date().toLocaleString()],
    [],
    ['METRIC', 'VALUE'],
    ['Total Rented Items', totalItems],
    ['Total Tracked Machines', items.filter((i) => i.machine_number && i.machine_number !== 'N/A').length],
    ['Total Daily Rental Rate Sum (LKR)', totalValue],
    ['Unique Customers', new Set(items.map((i) => (i.customer_mobile || i.customer_name || '').trim())).size]
  ];
  const wsSummary = createSheetFromAoa(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // Sheet 2: Items
  const itemRows: any[][] = [
    [
      'Item ID',
      'Product Name',
      'Item Code',
      'Machine No / QTY',
      'Quantity',
      'Price (Per Day) (LKR)',
      'Customer Name',
      'Customer Mobile',
      'Customer NIC',
      'Customer Address',
      'Bill Number',
      'Rental Start Date',
      'Rental End Date',
      'Days Rented'
    ],
    ...items.map((i) => {
      const raw = (i.machine_number || '').trim();
      const qty = Number(i.quantity) || 1;
      let machineNoOrQty = raw || 'N/A';
      if ((!raw || raw === 'N/A') && qty > 1) {
        machineNoOrQty = String(qty);
      }
      return [
        i.item_id,
        i.product_name,
        i.item_number,
        machineNoOrQty,
        qty,
        Number(i.price_per_day ?? i.price ?? 0),
        i.customer_name || '',
        i.customer_mobile || '',
        i.customer_nic || '',
        i.customer_address || '',
        i.bill_number || '',
        i.rental_start_date || '',
        i.rental_end_date || '',
        i.days_rented ?? ''
      ];
    })
  ];
  const wsItems = createSheetFromAoa(itemRows);
  XLSX.utils.book_append_sheet(wb, wsItems, 'Rented Items');

  downloadWorkbook(wb, `rented_items_report_${dateStr}.xlsx`);
}

// -------------------------------------------------------------
// 8. CUSTOMER HELD DOCUMENTS REPORT EXPORT
// -------------------------------------------------------------
export function exportHeldDocumentsReportToExcel(
  data: HeldDocumentsReportData,
  targetDate?: string
): void {
  const wb = XLSX.utils.book_new();
  const dateStr = targetDate || data.end_date || new Date().toISOString().slice(0, 10);
  const customers = Array.isArray(data.customers) ? data.customers : [];

  const totalNic = data.total_nic ?? customers.filter((c) => c.taken_id?.toLowerCase().includes('nic')).length;
  const totalPassport = data.total_passport ?? customers.filter((c) => c.taken_id?.toLowerCase().includes('passport')).length;
  const totalDriving = data.total_driving_licence ?? customers.filter((c) => c.taken_id?.toLowerCase().includes('driving') || c.taken_id?.toLowerCase().includes('licence')).length;

  // Sheet 1: Summary
  const summaryRows: any[][] = [
    ['TOOL DEPOT POS - CUSTOMER HELD DOCUMENTS REPORT'],
    ['Target Date', dateStr],
    ['Generated At', new Date().toLocaleString()],
    [],
    ['METRIC', 'COUNT'],
    ['Total Customers with Held IDs', data.total_customers ?? customers.length],
    ['Total NICs Held', totalNic],
    ['Total Passports Held', totalPassport],
    ['Total Driving Licences Held', totalDriving]
  ];
  const wsSummary = createSheetFromAoa(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // Sheet 2: Customers
  const customerRows: any[][] = [
    [
      'Customer ID',
      'Customer Name',
      'Mobile Number',
      'Taken Document',
      'NIC Number',
      'Active Bill Numbers'
    ],
    ...customers.map((c) => [
      c.customer_id,
      c.customer_name,
      c.mobile_number,
      c.taken_id,
      c.nic_number || '',
      (c.bills || [c.bill_number]).filter(Boolean).join(', ')
    ])
  ];
  const wsCustomers = createSheetFromAoa(customerRows);
  XLSX.utils.book_append_sheet(wb, wsCustomers, 'Held Documents');

  downloadWorkbook(wb, `customer_held_documents_report_${dateStr}.xlsx`);
}

// -------------------------------------------------------------
// 9. EXPENSES REPORT EXPORT
// -------------------------------------------------------------
export function exportExpensesReportToExcel(
  data: ExpensesReportData,
  startDate?: string,
  endDate?: string
): void {
  const wb = XLSX.utils.book_new();
  const dateStr = `${startDate || data.start_date || 'Start'}_to_${endDate || data.end_date || 'End'}`;
  const expenses = Array.isArray(data.expenses)
    ? data.expenses
    : Array.isArray(data.detailed_expenses)
    ? data.detailed_expenses
    : [];

  const totalExpenses = parseNum(
    data.total_expenses ?? data.total_expense ?? data.expenses_total
  );
  const count = data.expenses_count ?? expenses.length;
  const avgExpense = parseNum(data.average_expense_raw ?? data.average_expense);
  const highestExpense = parseNum(
    data.highest_expense_raw ?? data.highest_expense
  );
  const lowestExpense = parseNum(
    data.lowest_expense_raw ?? data.lowest_expense
  );

  // Sheet 1: Summary
  const summaryRows: any[][] = [
    ['TOOL DEPOT POS - EXPENSES REPORT'],
    [
      'Period',
      `${startDate || data.start_date || 'Start'} to ${endDate || data.end_date || 'Today'}`
    ],
    ['Generated At', new Date().toLocaleString()],
    [],
    ['METRIC', 'VALUE'],
    ['Total Expenses Count', count],
    ['Total Expenses (LKR)', totalExpenses],
    ['Average Expense (LKR)', avgExpense],
    ['Highest Expense (LKR)', highestExpense],
    ['Lowest Expense (LKR)', lowestExpense]
  ];
  const wsSummary = createSheetFromAoa(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // Sheet 2: By Staff User
  if (Array.isArray(data.expenses_by_user) && data.expenses_by_user.length > 0) {
    const userRows: any[][] = [
      ['Staff User', 'Expenses Count', 'Total Amount (LKR)'],
      ...data.expenses_by_user.map((u) => [
        u.created_by || 'Unknown',
        u.count,
        parseNum(u.total_amount_raw ?? u.total_amount)
      ])
    ];
    const wsUsers = createSheetFromAoa(userRows);
    XLSX.utils.book_append_sheet(wb, wsUsers, 'By Staff User');
  }

  // Sheet 3: By Cash Register
  if (
    Array.isArray(data.expenses_by_register) &&
    data.expenses_by_register.length > 0
  ) {
    const regRows: any[][] = [
      [
        'Cash Register ID',
        'Opened At',
        'Status',
        'Expenses Count',
        'Total Amount (LKR)'
      ],
      ...data.expenses_by_register.map((r) => [
        r.cash_register_id,
        r.opened_at || '',
        r.status || '',
        r.count,
        parseNum(r.total_amount_raw ?? r.total_amount)
      ])
    ];
    const wsRegs = createSheetFromAoa(regRows);
    XLSX.utils.book_append_sheet(wb, wsRegs, 'By Cash Register');
  }

  // Sheet 4: Itemized Expenses
  const itemRows: any[][] = [
    [
      'ID',
      'Date',
      'Time',
      'Created At',
      'Description',
      'Amount (LKR)',
      'Created By',
      'Cash Register ID',
      'Register Status',
      'Cash Transaction ID',
      'Reference',
      'Notes'
    ],
    ...expenses.map((e) => [
      e.id,
      e.date || '',
      e.time || '',
      e.created_at || '',
      e.description || '',
      parseNum(e.amount_raw ?? e.amount),
      e.created_by || '',
      e.cash_register_id ?? '',
      e.cash_register_status || '',
      e.cash_transaction_id ?? '',
      e.reference || '',
      e.notes || ''
    ])
  ];
  const wsItems = createSheetFromAoa(itemRows);
  XLSX.utils.book_append_sheet(wb, wsItems, 'Itemized Expenses');

  downloadWorkbook(wb, `expenses_report_${dateStr}.xlsx`);
}

// -------------------------------------------------------------
// 10. SINGLE MACHINE HISTORY REPORT EXPORT
// -------------------------------------------------------------
export function exportSingleMachineHistoryReportToExcel(
  data: SingleMachineHistoryReportData,
  startDate?: string,
  endDate?: string
): void {
  const wb = XLSX.utils.book_new();
  const machine = data.machine;
  const machineNum =
    machine?.machine_number || data.machine_number || 'machine';
  const dateStr = `${startDate || data.start_date || 'Start'}_to_${endDate || data.end_date || 'End'}`;

  const rentalBills = Array.isArray(data.rental_bills)
    ? data.rental_bills
    : Array.isArray(data.bills)
    ? data.bills
    : [];
  const resets = Array.isArray(data.reset_history)
    ? data.reset_history
    : Array.isArray(data.resets)
    ? data.resets
    : [];

  // Sheet 1: Machine Details & Summary
  const summaryRows: any[][] = [
    ['TOOL DEPOT POS - SINGLE MACHINE USAGE & HISTORY REPORT'],
    [
      'Period',
      `${startDate || data.start_date || 'Start'} to ${endDate || data.end_date || 'Today'}`
    ],
    ['Generated At', new Date().toLocaleString()],
    [],
    ['MACHINE DETAILS', 'VALUE'],
    ['Machine ID', machine?.machine_id ?? data.machine_id ?? ''],
    ['Machine Number', machineNum],
    ['Product Name', machine?.product_name || data.product_name || ''],
    ['Item Code', machine?.item_number || ''],
    ['Category', machine?.category_name || ''],
    ['Price Per Day (LKR)', parseNum(machine?.price_per_day)],
    ['Current Used Count', machine?.used_count ?? 0],
    ['Max Use Count', machine?.max_use_count ?? 0],
    ['Lifetime Total Used Count', machine?.total_used_count ?? 0],
    ['Needs Reset', machine?.needs_reset ? 'Yes' : 'No'],
    ['Last Reset Date', machine?.last_reset_date || ''],
    ['Is Active', machine?.is_active !== false ? 'Yes' : 'No'],
    ['Is Damaged', machine?.is_damaged ? 'Yes' : 'No'],
    [
      'Currently Rented Out',
      data.is_currently_rented ?? machine?.is_currently_rented ? 'Yes' : 'No'
    ],
    ['Current Bill Number', data.current_bill_number || ''],
    ['Current Customer', data.current_customer_name || ''],
    ['Rental Bills in Period', data.rental_bills_count ?? rentalBills.length],
    ['Distinct Bills in Period', data.distinct_bills_count ?? rentalBills.length],
    ['Resets in Period', data.reset_count ?? resets.length],
    ['Total Lifetime Resets', data.total_reset_count ?? resets.length]
  ];
  const wsSummary = createSheetFromAoa(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Machine Summary');

  // Sheet 2: Rental Bills History
  const billRows: any[][] = [
    [
      'Bill ID',
      'Bill Number',
      'Bill Status',
      'Created At',
      'Closed At',
      'Customer Name',
      'Customer Mobile',
      'Customer NIC',
      'Customer Address',
      'Rental Start Date',
      'Rental End Date',
      'Is Returned',
      'Returned Date',
      'Returned Time',
      'Rental Days',
      'Rental Fee (LKR)'
    ],
    ...rentalBills.map((b) => [
      b.bill_id,
      b.bill_number || '',
      b.bill_status || b.status || '',
      b.created_at || '',
      b.closed_at || '',
      b.customer_name || b.customer || '',
      b.customer_mobile || '',
      b.customer_nic || '',
      b.customer_address || '',
      b.rental_start_date || '',
      b.rental_end_date || '',
      b.is_returned ? 'Yes' : 'No',
      b.returned_date || '',
      b.returned_time || '',
      b.rental_days ?? 0,
      parseNum(b.rental_fee_raw ?? b.rental_fee)
    ])
  ];
  const wsBills = createSheetFromAoa(billRows);
  XLSX.utils.book_append_sheet(wb, wsBills, 'Rental Bills History');

  // Sheet 3: Reset History
  const resetRows: any[][] = [
    [
      'Reset ID',
      'Reset At',
      'Reset Date',
      'Reset Time',
      'Previous Used Count',
      'Lifetime Uses at Reset',
      'Reset By',
      'Notes'
    ],
    ...resets.map((r) => [
      r.id,
      r.reset_at || '',
      r.reset_date || '',
      r.reset_time || '',
      r.previous_used_count,
      r.total_used_count_at_reset ?? '',
      r.reset_by || '',
      r.notes || ''
    ])
  ];
  const wsResets = createSheetFromAoa(resetRows);
  XLSX.utils.book_append_sheet(wb, wsResets, 'Reset History');

  const safeMachine = String(machineNum).replace(/[^a-zA-Z0-9_-]/g, '_');
  downloadWorkbook(wb, `machine_history_${safeMachine}_${dateStr}.xlsx`);
}

function cleanStockNum(val: any): number {
  const cleaned = Number(parseNum(val).toFixed(6));
  return Object.is(cleaned, -0) || isNaN(cleaned) ? 0 : cleaned;
}

// -------------------------------------------------------------
// 10. STOCK MOVEMENT REPORT EXPORT
// -------------------------------------------------------------
export function exportStockMovementsReportToExcel(
  data: StockMovementsReportData,
  startDate?: string,
  endDate?: string
): void {
  const wb = XLSX.utils.book_new();
  const sDate = startDate || data.start_date;
  const eDate = endDate || data.end_date;
  const dateStr =
    sDate || eDate ? `${sDate || 'Start'}_to_${eDate || 'Today'}` : 'all';

  const movements = Array.isArray(data.movements) ? data.movements : [];

  // Aggregate by product
  const byProductMap = new Map<
    number,
    {
      product_id: number;
      product_name: string;
      item_number: string;
      category_name: string;
      unit: string;
      movements_count: number;
      stock_in: number;
      stock_out: number;
      net_change: number;
      current_stock: number | null;
    }
  >();

  movements.forEach((m) => {
    const qty = cleanStockNum(m.quantity);
    const existing = byProductMap.get(m.product);
    if (!existing) {
      byProductMap.set(m.product, {
        product_id: m.product,
        product_name: m.product_name || `Product #${m.product}`,
        item_number: m.product_item_number || '',
        category_name: m.product_category_name || '',
        unit: m.product_unit || 'pcs',
        movements_count: 1,
        stock_in: m.movement_type === 'in' ? qty : 0,
        stock_out: m.movement_type === 'out' ? qty : 0,
        net_change: m.movement_type === 'in' ? qty : -qty,
        current_stock:
          m.current_stock != null ? cleanStockNum(m.current_stock) : null
      });
    } else {
      existing.movements_count += 1;
      if (m.movement_type === 'in') {
        existing.stock_in = cleanStockNum(existing.stock_in + qty);
        existing.net_change = cleanStockNum(existing.net_change + qty);
      } else {
        existing.stock_out = cleanStockNum(existing.stock_out + qty);
        existing.net_change = cleanStockNum(existing.net_change - qty);
      }
      if (existing.current_stock == null && m.current_stock != null) {
        existing.current_stock = cleanStockNum(m.current_stock);
      }
    }
  });

  const byProduct = Array.from(byProductMap.values()).sort(
    (a, b) => b.stock_in + b.stock_out - (a.stock_in + a.stock_out)
  );

  const totalStockIn = cleanStockNum(data.total_stock_in);
  const totalStockOut = cleanStockNum(data.total_stock_out);
  const netMovement =
    data.net_movement != null
      ? cleanStockNum(data.net_movement)
      : cleanStockNum(totalStockIn - totalStockOut);

  // Sheet 1: Summary
  const summaryRows: any[][] = [
    ['TOOL DEPOT POS - STOCK MOVEMENT REPORT'],
    ['Period', sDate || eDate ? `${sDate || 'Start'} to ${eDate || 'Today'}` : 'All Dates'],
    [
      'Product Filter',
      data.product_label ||
        (data.product_id ? `Product #${data.product_id}` : 'All Products')
    ],
    [
      'Movement Type Filter',
      data.movement_type === 'in'
        ? 'Stock In'
        : data.movement_type === 'out'
        ? 'Stock Out'
        : 'All Movements'
    ],
    ['Search Filter', data.search || 'None'],
    ['Generated At', new Date().toLocaleString()],
    [],
    ['SUMMARY METRICS', 'VALUE'],
    ['Total Movements', data.total_movements ?? movements.length],
    ['Unique Products Affected', byProduct.length],
    ['Total Stock In', totalStockIn],
    ['Total Stock Out', totalStockOut],
    ['Net Stock Change', netMovement]
  ];
  const wsSummary = createSheetFromAoa(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // Sheet 2: By Product
  const productRows: any[][] = [
    [
      'Product ID',
      'Product Name',
      'Item Code',
      'Category',
      'Unit',
      'Movements',
      'Stock In',
      'Stock Out',
      'Net Change',
      'Current Stock'
    ],
    ...byProduct.map((p) => [
      p.product_id,
      p.product_name,
      p.item_number,
      p.category_name,
      p.unit,
      p.movements_count,
      p.stock_in,
      p.stock_out,
      p.net_change,
      p.current_stock ?? ''
    ]),
    [
      'TOTAL',
      '',
      '',
      '',
      '',
      movements.length,
      cleanStockNum(byProduct.reduce((s, p) => s + p.stock_in, 0)),
      cleanStockNum(byProduct.reduce((s, p) => s + p.stock_out, 0)),
      cleanStockNum(byProduct.reduce((s, p) => s + p.net_change, 0)),
      ''
    ]
  ];
  const wsByProduct = createSheetFromAoa(productRows);
  XLSX.utils.book_append_sheet(wb, wsByProduct, 'By Product');

  // Sheet 3: Stock Movements
  const movementRows: any[][] = [
    [
      'ID',
      'Date & Time',
      'Product ID',
      'Product Name',
      'Item Code',
      'Category',
      'Movement Type',
      'Quantity',
      'Signed Quantity',
      'Unit',
      'Current Stock',
      'Reference',
      'Notes',
      'Recorded By'
    ],
    ...movements.map((m) => {
      const qty = cleanStockNum(m.quantity);
      const signedQty = m.movement_type === 'out' ? cleanStockNum(-qty) : qty;
      return [
        m.id,
        m.created_at || '',
        m.product,
        m.product_name || '',
        m.product_item_number || '',
        m.product_category_name || '',
        m.movement_type === 'in' ? 'Stock In' : 'Stock Out',
        qty,
        signedQty,
        m.product_unit || 'pcs',
        m.current_stock != null ? cleanStockNum(m.current_stock) : '',
        m.reference || '',
        m.notes || '',
        m.created_by_name || ''
      ];
    })
  ];
  const wsMovements = createSheetFromAoa(movementRows);
  XLSX.utils.book_append_sheet(wb, wsMovements, 'Stock Movements');

  downloadWorkbook(wb, `stock_movements_report_${dateStr}.xlsx`);
}

// -------------------------------------------------------------
// 10. AUDIT LOG REPORT EXPORT
// -------------------------------------------------------------
export function exportAuditLogReportToExcel(
  data: AuditLogReportData,
  reportType: string,
  startDate?: string,
  endDate?: string
): void {
  const wb = XLSX.utils.book_new();
  const dateStr = `${startDate || data.start_date || 'All'}_to_${endDate || data.end_date || 'Today'}`;
  const isSingleUser =
    reportType === 'user_history' || Boolean(data.user || data.user_id);
  const user = data.user;

  // Sheet 1: Summary
  const summaryRows: any[][] = [
    ['TOOL DEPOT POS - AUDIT LOG REPORT'],
    [
      'Report Type',
      isSingleUser ? 'Single User Action History' : 'All Users Action History'
    ],
    [
      'Period',
      `${startDate || data.start_date || 'Start'} to ${endDate || data.end_date || 'Today'}`
    ],
    ['Generated At', new Date().toLocaleString()]
  ];

  if (isSingleUser && user) {
    const role =
      user.is_superuser || user.role === 'superuser' ? 'Admin' : 'Cashier';
    summaryRows.push([]);
    summaryRows.push(['USER PROFILE', '']);
    summaryRows.push(['Username', user.username]);
    summaryRows.push(['Full Name', user.full_name || '']);
    summaryRows.push(['Role', role]);
    summaryRows.push(['Phone Number', user.phone_number || '']);
    summaryRows.push(['Email', user.email || '']);
    summaryRows.push([
      'Account Status',
      user.is_active !== false ? 'Active' : 'Inactive'
    ]);
    if (user.date_joined) summaryRows.push(['Date Joined', user.date_joined]);
    if (user.last_login) summaryRows.push(['Last Login', user.last_login]);
  }

  summaryRows.push([]);
  summaryRows.push(['METRICS', 'COUNT']);
  summaryRows.push([
    'Total Recorded Actions',
    data.total_actions ?? (Array.isArray(data.actions) ? data.actions.length : 0)
  ]);

  if (!isSingleUser) {
    if (data.total_users_count != null) {
      summaryRows.push(['Total System Users', data.total_users_count]);
    }
    if (data.active_users_count != null) {
      summaryRows.push(['Active Users in Period', data.active_users_count]);
    }
  }

  // Categories Breakdown
  const categories = Array.isArray(data.actions_by_category)
    ? data.actions_by_category
    : [];
  if (categories.length > 0) {
    summaryRows.push([]);
    summaryRows.push(['ACTIONS BY CATEGORY', 'COUNT']);
    categories.forEach((c) => {
      summaryRows.push([c.category_display || c.category, c.count]);
    });
  }

  const wsSummary = createSheetFromAoa(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // Sheet 2: Users Summary (for all users report if users_summary available)
  const usersSummary = Array.isArray(data.users_summary)
    ? data.users_summary
    : [];
  if (!isSingleUser && usersSummary.length > 0) {
    const userSummaryRows: any[][] = [
      [
        'User ID',
        'Username',
        'Full Name',
        'Role',
        'Phone Number',
        'Status',
        'Total Actions',
        'Last Action At'
      ],
      ...usersSummary.map((u) => {
        const role =
          u.is_superuser || u.role === 'superuser' ? 'Admin' : 'Cashier';
        return [
          u.user_id,
          u.username,
          u.full_name || '',
          role,
          u.phone_number || '',
          u.is_active !== false ? 'Active' : 'Inactive',
          u.total_actions,
          u.last_action_at || ''
        ];
      })
    ];
    const wsUsers = createSheetFromAoa(userSummaryRows);
    XLSX.utils.book_append_sheet(wb, wsUsers, 'Users Summary');
  }

  // Sheet 3: Detailed Action Logs / Audit Trail
  const actions = Array.isArray(data.actions) ? data.actions : [];
  const actionRows: any[][] = [
    [
      'ID',
      'Timestamp',
      'User',
      'Category',
      'Action',
      'HTTP Method',
      'Target Model',
      'Target ID',
      'Description',
      'Path'
    ],
    ...actions.map((a) => {
      const timestamp =
        a.created_at || (a.date ? `${a.date} ${a.time || ''}`.trim() : '');
      const username =
        a.username || (isSingleUser && user ? user.username : '');
      return [
        a.id,
        timestamp,
        username,
        a.category_display || a.category || '',
        a.action || '',
        a.method || '',
        a.target_model || '',
        a.target_id || '',
        a.description || '',
        a.path || ''
      ];
    })
  ];
  const wsActions = createSheetFromAoa(actionRows);
  XLSX.utils.book_append_sheet(wb, wsActions, 'Audit Trail');

  const filePrefix =
    isSingleUser && user
      ? `audit_log_${user.username}`
      : 'audit_log_all_users';
  downloadWorkbook(wb, `${filePrefix}_${dateStr}.xlsx`);
}




