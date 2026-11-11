# Reports API Documentation

This document provides a comprehensive reference for all reporting API endpoints in the Tool Depot POS system. It details endpoint specifications, query parameters, response structures, calculation business rules, and recent feature updates.

---

## Table of Contents
1. [Overview & Authentication](#1-overview--authentication)
2. [Recent Updates & Removed Reports](#2-recent-updates--removed-reports)
3. [Main Reports Endpoint (`GET /api/reports/`)](#3-main-reports-endpoint-get-apireports)
   - [Financial Report (`financial`)](#31-financial-report-report_typefinancial)
   - [Opened Bills Report (`opened_bills`)](#32-opened-bills-report-report_typeopened_bills)
   - [Payment Unsettled Bills Report (`unsettled_bills`)](#33-payment-unsettled-bills-report-report_typeunsettled_bills)
   - [Closed Bills Report (`closed_bills`)](#34-closed-bills-report-report_typeclosed_bills)
   - [Stock Reports (`stock_all`, `stock_sales`, `stock_rentals`)](#35-stock-reports)
   - [Damaged Products Report (`damaged`)](#36-damaged-products-report-report_typedamaged)
   - [Customer Reports (`customers`, `banned`)](#37-customer-reports-report_typecustomers-banned)
   - [Machine Usage Report (`machines`)](#38-machine-usage-report-report_typemachines)
4. [Dedicated Machine Report Endpoint (`GET /api/machine-report/`)](#4-dedicated-machine-report-endpoint-get-apimachine-report)
5. [Customer Phone Numbers Excel Export (`GET /api/customers/export-phone-numbers/`)](#5-customer-phone-numbers-excel-export-get-apicustomersexport-phone-numbers)
6. [Django Admin PDF Reports (`/admin/reports/`)](#6-django-admin-pdf-reports-adminreports)
7. [Calculation & Business Rules](#7-calculation--business-rules)
8. [Error Handling](#8-error-handling)

---

## 1. Overview & Authentication

All reporting endpoints are restricted to authenticated Super Users and Staff (`is_staff = True` or `is_superuser = True`).

### Headers
| Header | Value | Description |
|---|---|---|
| `Authorization` | `Bearer <JWT_ACCESS_TOKEN>` | Standard JWT access token from `/api/auth/login/` |
| `Content-Type` | `application/json` | Request payload format |

### Timezone
All calculations, cutoff validations, and timestamps operate under the system timezone:
**`Asia/Colombo` (Sri Lanka Standard Time, UTC+05:30)**.

---

## 2. Recent Updates & Removed Reports

> [!IMPORTANT]
> **Summary of Key Changes:**
> 1. **Removed Reports:** The legacy `'Financial Summery Report'`, `'Profit and Loss Report'` (`profit`), and `'Rental Items Count Report'` (`rental_counts`) have been permanently removed.
> 2. **Unified Financial Report (`financial`):** Replaces legacy financial reports. Accepts `start_date` and `end_date`, providing:
>    - Total money came in (`total_in` / `total_money_in`)
>    - Total money gone out (`total_out` / `total_money_out`)
>    - Total deposit taken (`total_deposit_taken` / `deposit_taken`)
>    - Total refund given (`total_refund_given` / `refund_given`)
>    - Total fines collected (`total_fines_collected` / `fines_collected`)
>    - Total expenses (`total_expenses` / `total_expense`) and itemized expenses list (`expenses`)
>    - Cumulative profit from closed bills (`total_closed_bill_profit`)
> 3. **Opened Bills Report (`opened_bills`):** Dedicated report for all open (non-closed) bills. Has **no start date** (always calculates from system inception `2000-01-01` to `end_date`). Reports **only the accrued amount customer must be charged** up to `end_date` (rental fee + damage fines, excluding deposits) and deposits collected on those open bills.
> 4. **Payment Unsettled Bills Report (`unsettled_bills`):** Dedicated report for rental bills where payments are unsettled (`status == 'unpaid'` or `remaining_deposit < 0`). Like `opened_bills`, **start date is removed** (always calculates from system start `2000-01-01` up to the selected `end_date`).
> 5. **Closed Bill Profit (`closed_bill_profit` / `total_closed_bill_profit`):** Closed Bills Report (`closed_bills`) and related API views explicitly return Closed Bill Profit (calculated as rental fee profit gained from closed bills + fines), along with total rental fees, total fines, and per-bill `closed_bill_profit`.
> 6. **Customer Phone Numbers Excel Export:** Dedicated endpoint (`GET /api/customers/export-phone-numbers/` and `/api/reports/customer-phone-numbers-excel/`) to download an Excel file with a single column (no header) of all non-banned customer mobile numbers with leading zeros preserved.
> 7. **Admin PDF & REST API Alignment:** All updates are simultaneously implemented in the REST API views (`ReportDataAPIView`) and Django Admin PDF views (`AdminReportView`). For both Opened Bills and Payment Unsettled Bills, the Start Date field is omitted/hidden, with calculations running from system inception up to the selected End Date.

---

## 3. Main Reports Endpoint (`GET /api/reports/`)

Retrieve raw JSON report datasets.

- **URL:** `GET /api/reports/`
- **Permissions:** Admin / Superuser
- **Query Parameters:**
  | Parameter | Type | Required | Description |
  |---|---|---|---|
  | `report_type` | string | **Yes** | Key identifier of the report (see below). |
  | `start_date` | string (`YYYY-MM-DD`) | No | Start of reporting window (defaults to `2000-01-01` if omitted). *Ignored/fixed to `2000-01-01` for `opened_bills` and `unsettled_bills`.* |
  | `end_date` | string (`YYYY-MM-DD`) | No | End of reporting window (defaults to today's date in `Asia/Colombo` if omitted). |

---

### 3.1. Financial Report (`report_type=financial`)

#### Aliases
`financial`, `financial_report`

#### Description
Provides a complete financial audit within the given date range (`start_date 00:00:00` to `end_date 23:59:59`), tracking all cash inflows, cash outflows, security deposits, refunds, damage fines, and closed bill profit.

#### Key Metrics
1. **Total Money Came In (`total_in` / `total_money_in`):** Sum of all `cash_in` transactions in the date range.
2. **Total Money Gone Out (`total_out` / `total_money_out`):** Sum of all `cash_out` transactions in the date range.
3. **Net Cash Flow (`net_cash_flow`):** `total_in - total_out`.
4. **Total Deposit Taken (`total_deposit_taken` / `deposit_taken` / `total_deposit`):** Sum of all rental deposit transactions (`transaction_type='deposit'`) on non-cancelled bills in the date range.
5. **Total Refund Given (`total_refund_given` / `refund_given` / `total_refunds`):** Sum of all rental deposit refunds (`transaction_type='refund'`) on non-cancelled bills in the date range.
6. **Total Fines Collected (`total_fines_collected` / `fines_collected` / `total_fines`):** Sum of all rental damage fines created on non-cancelled bills in the date range.
7. **Total Expenses (`total_expenses` / `total_expense` / `expenses_total`):** Sum of all non-cancelled expenses paid from cash registers within the date range.
8. **Itemized Expenses (`expenses` / `detailed_expenses`):** Full list of expenses with description, amount, timestamp, created by staff username, and cash register ID.
9. **Total Closed Bill Profit (`total_closed_bill_profit`):** Sum of net profit (`rental_fee + fines`) from all rental bills closed on or before `end_date`.
10. **Cash Register Total Money (`total_money`):** Current net balance in the active cash register (`opening_balance + total_cash_in - total_cash_out`).
11. **Payment Methods Breakdown (`payment_methods`):** Complete breakdown by payment method (`cash`, `card`, `bank_transfer`), detailing `sales`, `deposits`, `refunds`, `total_amount` (`total_in`), `total_out`, `net`, and formatted values.
12. **Payment Method Inflow Totals (`total_cash`, `total_card`, `total_bank_transfer`):** Total amount received (`sales + deposits`) per payment method within the date range.
13. **Payment Methods List (`payment_methods_breakdown`):** Array format of payment method summaries for tables and client-side iterations.
14. **Breakdown (`breakdown`):** Aggregation grouped by transaction source (e.g., Sale, Sale Refund, Rental Deposit, Rental Refund, Expense, etc.).
15. **Transactions (`transactions`):** Full list of individual cash transactions with timestamps, sources, amounts, notes, and staff usernames.

#### Example Request
```http
GET /api/reports/?report_type=financial&start_date=2026-10-01&end_date=2026-10-31
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

#### Example Response (`200 OK`)
```json
{
  "report_type": "financial",
  "start_date": "2026-10-01",
  "end_date": "2026-10-31",
  "data": {
    "start_date": "2026-10-01",
    "end_date": "2026-10-31",
    "total_in": 750000.00,
    "total_out": 320000.00,
    "total_money_in": 750000.00,
    "total_money_out": 320000.00,
    "net_cash_flow": 430000.00,
    "total_deposit_taken": 627046.00,
    "deposit_taken": 627046.00,
    "total_deposit": 627046.00,
    "total_refund_given": 284512.00,
    "refund_given": 284512.00,
    "total_refunds": 284512.00,
    "total_fines_collected": 2500.00,
    "fines_collected": 2500.00,
    "total_fines": 2500.00,
    "total_expenses": 35488.00,
    "total_expense": 35488.00,
    "expenses_total": 35488.00,
    "total_expenses_formatted": "35,488.00",
    "expenses_count": 2,
    "total_in_formatted": "750,000.00",
    "total_out_formatted": "320,000.00",
    "net_cash_flow_formatted": "430,000.00",
    "total_deposit_taken_formatted": "627,046.00",
    "total_refund_given_formatted": "284,512.00",
    "total_fines_collected_formatted": "2,500.00",
    "total_money": 450000.00,
    "total_cash": 450000.00,
    "total_card": 125000.00,
    "total_bank_transfer": 97046.00,
    "total_cash_formatted": "450,000.00",
    "total_card_formatted": "125,000.00",
    "total_bank_transfer_formatted": "97,046.00",
    "payment_methods": {
      "cash": {
        "name": "Cash",
        "sales": 35000.00,
        "deposits": 415000.00,
        "refunds": 240000.00,
        "total_amount": 450000.00,
        "total_in": 450000.00,
        "total_out": 240000.00,
        "net": 210000.00,
        "sales_formatted": "35,000.00",
        "deposits_formatted": "415,000.00",
        "refunds_formatted": "240,000.00",
        "total_amount_formatted": "450,000.00",
        "total_in_formatted": "450,000.00",
        "net_formatted": "210,000.00"
      },
      "card": {
        "name": "Card",
        "sales": 10000.00,
        "deposits": 115000.00,
        "refunds": 44512.00,
        "total_amount": 125000.00,
        "total_in": 125000.00,
        "total_out": 44512.00,
        "net": 80488.00,
        "sales_formatted": "10,000.00",
        "deposits_formatted": "115,000.00",
        "refunds_formatted": "44,512.00",
        "total_amount_formatted": "125,000.00",
        "total_in_formatted": "125,000.00",
        "net_formatted": "80,488.00"
      },
      "bank_transfer": {
        "name": "Bank Transfer",
        "sales": 0.00,
        "deposits": 97046.00,
        "refunds": 0.00,
        "total_amount": 97046.00,
        "total_in": 97046.00,
        "total_out": 0.00,
        "net": 97046.00,
        "sales_formatted": "0.00",
        "deposits_formatted": "97,046.00",
        "refunds_formatted": "0.00",
        "total_amount_formatted": "97,046.00",
        "total_in_formatted": "97,046.00",
        "net_formatted": "97,046.00"
      }
    },
    "payment_methods_breakdown": [
      {
        "name": "Cash",
        "sales": 35000.00,
        "deposits": 415000.00,
        "refunds": 240000.00,
        "total_amount": 450000.00,
        "total_in": 450000.00,
        "total_out": 240000.00,
        "net": 210000.00,
        "sales_formatted": "35,000.00",
        "deposits_formatted": "415,000.00",
        "refunds_formatted": "240,000.00",
        "total_amount_formatted": "450,000.00",
        "total_in_formatted": "450,000.00",
        "net_formatted": "210,000.00"
      },
      {
        "name": "Card",
        "sales": 10000.00,
        "deposits": 115000.00,
        "refunds": 44512.00,
        "total_amount": 125000.00,
        "total_in": 125000.00,
        "total_out": 44512.00,
        "net": 80488.00,
        "sales_formatted": "10,000.00",
        "deposits_formatted": "115,000.00",
        "refunds_formatted": "44,512.00",
        "total_amount_formatted": "125,000.00",
        "total_in_formatted": "125,000.00",
        "net_formatted": "80,488.00"
      },
      {
        "name": "Bank Transfer",
        "sales": 0.00,
        "deposits": 97046.00,
        "refunds": 0.00,
        "total_amount": 97046.00,
        "total_in": 97046.00,
        "total_out": 0.00,
        "net": 97046.00,
        "sales_formatted": "0.00",
        "deposits_formatted": "97,046.00",
        "refunds_formatted": "0.00",
        "total_amount_formatted": "97,046.00",
        "total_in_formatted": "97,046.00",
        "net_formatted": "97,046.00"
      }
    ],
    "total_closed_bill_profit": 1089160.00,
    "total closed bill profit": 1089160.00,
    "sale_income": 45000.00,
    "rental_income": 344534.00,
    "rental_deposit_non_closed": 78000.00,
    "expenses": [
      {
        "id": 14,
        "description": "Redmi battery repair",
        "amount": "4500.00",
        "amount_raw": 4500.0,
        "amount_formatted": "4,500.00",
        "created_at": "2026-10-12 14:30",
        "created_by": "admin",
        "cash_register_id": 1
      },
      {
        "id": 15,
        "description": "Petrol pump fuel",
        "amount": "1800.00",
        "amount_raw": 1800.0,
        "amount_formatted": "1,800.00",
        "created_at": "2026-10-20 09:15",
        "created_by": "staff_user",
        "cash_register_id": 1
      }
    ],
    "breakdown": [
      {
        "source": "Rental Deposit",
        "in": 627046.00,
        "out": 0.00,
        "net": 627046.00
      },
      {
        "source": "Rental Refund",
        "in": 0.00,
        "out": 284512.00,
        "net": -284512.00
      },
      {
        "source": "Sale",
        "in": 45000.00,
        "out": 0.00,
        "net": 45000.00
      },
      {
        "source": "Expense",
        "in": 0.00,
        "out": 35488.00,
        "net": -35488.00
      }
    ],
    "transactions": [
      {
        "id": 142,
        "transaction_type": "cash_in",
        "get_transaction_type_display": "Cash In",
        "source": "rental_deposit",
        "get_source_display": "Rental Deposit",
        "reference": "RENT-00105",
        "notes": "Security deposit",
        "amount": "10000.00",
        "created_at": "2026-10-05T08:30:00+05:30",
        "created_by": "admin"
      }
    ]
  }
}
```

---

### 3.2. Opened Bills Report (`report_type=opened_bills`)

#### Aliases
`opened_bills`, `opened_bill`, `open_bills`, `open_bill`

#### Description
Isolates all **open (non-closed, non-cancelled)** rental bills (`status != 'closed'`).

- **No Start Date Restriction:** Start date is always fixed to system inception (`2000-01-01`). Even if a client sends a `start_date`, it is safely ignored and set to system start.
- **Accrued Income Only (`total_income` / `total_charged_amount`):** Represents **only the amount customer must be charged up to the selected `end_date`** (accrued rental days fee minus discount + fines accrued up to `end_date`). **Security deposit money is strictly excluded** from this income metric.
- **Deposit Taken (`total_deposit` / `total_deposit_taken`):** Total deposit received on these open bills up to `end_date` only.

#### Example Request
```http
GET /api/reports/?report_type=opened_bills&end_date=2026-11-05
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

#### Example Response (`200 OK`)
```json
{
  "report_type": "opened_bills",
  "start_date": "2000-01-01",
  "end_date": "2026-11-05",
  "data": {
    "start_date": "2000-01-01",
    "end_date": "2026-11-05",
    "opened_bills_count": 8,
    "open_bills_count": 8,
    "total_rental_fee": 54200.00,
    "total_fines": 1500.00,
    "total_income": 55700.00,
    "total_charged_amount": 55700.00,
    "total_deposit": 82000.00,
    "total_deposit_taken": 82000.00,
    "total_rental_fee_formatted": "54,200.00",
    "total_fines_formatted": "1,500.00",
    "total_income_formatted": "55,700.00",
    "total_charged_amount_formatted": "55,700.00",
    "total_deposit_formatted": "82,000.00",
    "total_deposit_taken_formatted": "82,000.00",
    "bills": [
      {
        "id": 88,
        "bill_number": "RENT-00088",
        "customer": "K. PERERA",
        "customer_nic": "198512345678",
        "customer_mobile": "0771234567",
        "status": "active",
        "created_at": "2026-10-15 09:20",
        "rental_fee": "12,600.00",
        "rental_fee_raw": 12600.0,
        "fines": "0.00",
        "fines_raw": 0.0,
        "income": "12,600.00",
        "income_raw": 12600.0,
        "charged_amount": "12,600.00",
        "charged_amount_raw": 12600.0,
        "deposit": "20,000.00",
        "deposit_raw": 20000.0,
        "deposit_taken": "20,000.00",
        "deposit_taken_raw": 20000.0,
        "discount": 0.0,
        "items_count": 1,
        "items": [
          {
            "product_name": "Demolition Hammer",
            "item_number": "ITM-58A2B1C",
            "quantity": 1.0,
            "rental_start_date": "2026-10-15",
            "rental_end_date": "2026-10-22",
            "is_returned": false,
            "returned_date": "",
            "rental_days": 21,
            "rental_fee": 12600.0
          }
        ]
      }
    ],
    "detailed_bills": [...]
  }
}
```

---

### 3.3. Payment Unsettled Bills Report (`report_type=unsettled_bills`)

#### Aliases
`unsettled_bills`, `unsettled_bill`, `unsettled`, `payment_unsettled_bills`, `payment_unsettled`, `unpaid_bills`, `unpaid_bill`, `unpaid`

#### Description
Filters non-cancelled, non-closed rental bills where payment has not been settled:
1. `status == 'unpaid'`, **OR**
2. `remaining_deposit < 0` (accrued rental charges and fines exceed total security deposit held).

- **No Start Date Restriction:** Start date is always fixed to system inception (`2000-01-01`). All past unsettled bills are evaluated up to `end_date`.
- **End Date Filter:** Query via `end_date=YYYY-MM-DD` (defaults to current date if omitted).

#### Key Fields
- `total_unsettled_amount` (`total_amount_owed`, `total_due`): Sum of outstanding money owed by customers across all unsettled bills.
- `total_rental_fee` (`total_rental_fee_formatted`): Total rental fee charges accrued on unsettled bills.
- `total_fines` (`total_fines_formatted`, `fines`, `fines_formatted`): Total damage fines charged on unsettled bills.
- `total_income` (`total_charged_amount`): Total charges accrued on these bills (`rental_fee + fines`) up to `end_date`.
- `total_deposit` (`total_deposit_taken`): Total deposits held for these bills.
- `total_refunds`: Any interim refunds issued.
- Per-bill fields:
  - `rental_fee` & `rental_fee_raw`: Rental fee charged for items.
  - `fines` & `fines_raw`: Damage fines charged.
  - `fines_details`: Itemized list of fine reasons, amounts, and timestamps (`[{reason, fine, fine_formatted, created_at}]`).
  - `remaining_deposit`: Net remaining deposit (negative value indicates amount customer owes).
  - `unsettled_amount` / `amount_owed` / `due_amount`: Positive currency value indicating amount customer owes (`charged_amount - net_deposit_held`).

#### Example Request
```http
GET /api/reports/?report_type=unsettled_bills&end_date=2026-11-05
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

#### Example Response (`200 OK`)
```json
{
  "report_type": "unsettled_bills",
  "start_date": "2000-01-01",
  "end_date": "2026-11-05",
  "data": {
    "start_date": "2000-01-01",
    "end_date": "2026-11-05",
    "unsettled_bills_count": 3,
    "unpaid_bills_count": 3,
    "total_rental_fee": 38400.00,
    "total_fines": 2000.00,
    "total_income": 40400.00,
    "total_charged_amount": 40400.00,
    "total_deposit": 25000.00,
    "total_deposit_taken": 25000.00,
    "total_refunds": 0.00,
    "total_unsettled_amount": 15400.00,
    "total_amount_owed": 15400.00,
    "total_due": 15400.00,
    "total_rental_fee_formatted": "38,400.00",
    "total_fines_formatted": "2,000.00",
    "total_income_formatted": "40,400.00",
    "total_charged_amount_formatted": "40,400.00",
    "total_deposit_formatted": "25,000.00",
    "total_deposit_taken_formatted": "25,000.00",
    "total_refunds_formatted": "0.00",
    "total_unsettled_amount_formatted": "15,400.00",
    "total_amount_owed_formatted": "15,400.00",
    "total_due_formatted": "15,400.00",
    "bills": [
      {
        "id": 92,
        "bill_number": "RENT-00092",
        "customer": "S. FERNANDO",
        "customer_nic": "199120401234",
        "customer_mobile": "0719876543",
        "status": "unpaid",
        "created_at": "2026-09-10 11:15",
        "rental_fee": "24,000.00",
        "rental_fee_raw": 24000.0,
        "fines": "1,000.00",
        "fines_raw": 1000.0,
        "fines_details": [
          {
            "reason": "Damaged power cable",
            "fine": 1000.0,
            "fine_formatted": "1,000.00",
            "created_at": "2026-09-22 15:30"
          }
        ],
        "income": "25,000.00",
        "income_raw": 25000.0,
        "charged_amount": "25,000.00",
        "charged_amount_raw": 25000.0,
        "deposit": "15,000.00",
        "deposit_raw": 15000.0,
        "deposit_taken": "15,000.00",
        "deposit_taken_raw": 15000.0,
        "refunds": "0.00",
        "refunds_raw": 0.0,
        "remaining_deposit": "-10,000.00",
        "remaining_deposit_raw": -10000.0,
        "unsettled_amount": "10,000.00",
        "unsettled_amount_raw": 10000.0,
        "amount_owed": "10,000.00",
        "amount_owed_raw": 10000.0,
        "due_amount": "10,000.00",
        "due_amount_raw": 10000.0,
        "discount": 0.0,
        "items_count": 1,
        "items": [
          {
            "product_name": "Generator 5KW",
            "item_number": "ITM-99123A",
            "quantity": 1.0,
            "rental_start_date": "2026-09-10",
            "rental_end_date": "2026-09-17",
            "is_returned": true,
            "returned_date": "2026-09-22",
            "rental_days": 12,
            "rental_fee": 24000.0
          }
        ]
      }
    ],
    "detailed_bills": [...]
  }
}
```

---

### 3.4. Closed Bills Report (`report_type=closed_bills`)

#### Aliases
`closed_bills`, `closed_bill`

#### Description
Isolates rental bills that were **closed strictly within the date range** (`start_date 00:00:00 <= closed_at <= end_date 23:59:59`).

#### Key Metrics
- **Closed Bill Profit (`closed_bill_profit` / `total_closed_bill_profit` / `total_profit`):** Net profit gained from closed bills + damage fines (`total_rental_fee + total_fines`).
- `closed_bill_profit_formatted` / `total_closed_bill_profit_formatted`: Formatted currency string (e.g., `"347,232.00"`).
- `total_rental_fee` (`total_rental_fee_formatted`): Total rental fees charged on closed bills in the period.
- `total_fines` (`total_fines_formatted`): Total damage fines charged on closed bills in the period.
- `total_income` (`total_income_formatted`): Total customer deposit payments collected for those bills.
- `total_refunds` (`total_refunds_formatted`): Total security deposit refunds returned to customers upon bill closure.

#### Example Request
```http
GET /api/reports/?report_type=closed_bills&start_date=2026-10-01&end_date=2026-10-24
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

#### Example Response (`200 OK`)
```json
{
  "report_type": "closed_bills",
  "start_date": "2026-10-01",
  "end_date": "2026-10-24",
  "data": {
    "start_date": "2026-10-01",
    "end_date": "2026-10-24",
    "closed_bills_count": 150,
    "closed_bill_profit": 347232.00,
    "total_closed_bill_profit": 347232.00,
    "total_profit": 347232.00,
    "total_rental_fee": 345732.00,
    "total_fines": 1500.00,
    "total_income": 627046.00,
    "total_refunds": 284512.00,
    "closed_bill_profit_formatted": "347,232.00",
    "total_closed_bill_profit_formatted": "347,232.00",
    "total_profit_formatted": "347,232.00",
    "total_rental_fee_formatted": "345,732.00",
    "total_fines_formatted": "1,500.00",
    "total_income_formatted": "627,046.00",
    "total_refunds_formatted": "284,512.00",
    "bills": [
      {
        "id": 671,
        "bill_number": "RENT-00388",
        "customer": "SUPPAIYA SASIDARAN",
        "customer_nic": "198805203490",
        "customer_mobile": "0776180705",
        "created_at": "2026-09-30 08:42",
        "closed_at": "2026-10-01 08:35",
        "rental_fee": "600.00",
        "rental_fee_raw": 600.0,
        "fines": "0.00",
        "fines_raw": 0.0,
        "income": "2,000.00",
        "income_raw": 2000.0,
        "refunds": "1,400.00",
        "refunds_raw": 1400.0,
        "profit": "600.00",
        "profit_raw": 600.0,
        "closed_bill_profit": "600.00",
        "closed_bill_profit_raw": 600.0,
        "discount": 0.0,
        "items_count": 1,
        "items": [
          {
            "product_name": "Sander Boda",
            "item_number": "ITM-30C31D62",
            "quantity": 1.0,
            "rental_days": 1,
            "returned_date": "2026-10-01",
            "rental_fee": 600.0
          }
        ]
      }
    ],
    "detailed_bills": [...]
  }
}
```

---

### 3.5. Stock Reports

#### Report Types
- `stock_all`: All active products (sales and rentals).
- `stock_sales`: Only products in categories with `category_type = 'sell'`.
- `stock_rentals`: Only products in categories with `category_type = 'rent'`.

#### Example Request
```http
GET /api/reports/?report_type=stock_all
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

#### Example Response (`200 OK`)
```json
{
  "report_type": "stock_all",
  "start_date": "2000-01-01",
  "end_date": "2026-11-06",
  "data": [
    {
      "item_number": "ITM-10293",
      "name": "Angle Grinder 4-inch",
      "category": "Power Tools",
      "price": "1200.00",
      "current_stock": "8",
      "unit": "Pieces"
    },
    {
      "item_number": "ITM-88912",
      "name": "Safety Gloves",
      "category": "Safety Gear",
      "price": "450.00",
      "current_stock": "50",
      "unit": "Pairs"
    }
  ]
}
```

---

### 3.6. Damaged Products Report (`report_type=damaged`)

#### Description
Returns all damaged product entries logged within `[start_date, end_date]`.

#### Example Request
```http
GET /api/reports/?report_type=damaged&start_date=2026-10-01&end_date=2026-10-31
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

#### Example Response (`200 OK`)
```json
{
  "report_type": "damaged",
  "start_date": "2026-10-01",
  "end_date": "2026-10-31",
  "data": [
    {
      "id": 14,
      "date": "2026-10-18",
      "item_number": "ITM-30C31D62",
      "name": "Sander Boda",
      "category": "Power Tools",
      "quantity": "1.00",
      "reason": "Motor burned during rental",
      "reported_by": "staff_user",
      "price": "600.00",
      "machine_number": "M-02"
    }
  ]
}
```

---

### 3.7. Customer Reports (`report_type=customers` & `banned`)

#### 1. Active Customers Report (`report_type=customers`)
Retrieves all non-banned customers created or active within the date range, annotating current active and overdue rental counts.

```http
GET /api/reports/?report_type=customers&start_date=2026-01-01&end_date=2026-11-06
```

```json
{
  "report_type": "customers",
  "start_date": "2026-01-01",
  "end_date": "2026-11-06",
  "data": [
    {
      "name": "Kamal Gunaratne",
      "nic": "197523456789",
      "mobile": "0777123456",
      "address": "No. 45, Galle Road, Colombo 03",
      "is_verified": true,
      "active_rentals": 2,
      "overdue_rentals": 1
    }
  ]
}
```

#### 2. Banned Customers Report (`report_type=banned`)
Retrieves all banned customers created within the given date window.

```http
GET /api/reports/?report_type=banned&start_date=2026-01-01&end_date=2026-11-06
```

```json
{
  "report_type": "banned",
  "start_date": "2026-01-01",
  "end_date": "2026-11-06",
  "data": [
    {
      "name": "Nimal Silva",
      "nic": "198212345678",
      "mobile": "0712345678",
      "address": "Kandy",
      "joined_on": "2026-03-12"
    }
  ]
}
```

---

### 3.8. Machine Usage Report (`report_type=machines`)

#### Description
Returns physical machine usage metrics grouped by parent rental product.

```http
GET /api/reports/?report_type=machines
```

```json
{
  "report_type": "machines",
  "start_date": "2000-01-01",
  "end_date": "2026-11-06",
  "data": [
    {
      "product_id": 12,
      "product_name": "Demolition Hammer",
      "category_name": "Heavy Machinery",
      "machines": [
        {
          "machine_id": 4,
          "machine_number": "M-01",
          "max_use_count": 10,
          "max_use_time": 10,
          "used_count": 6,
          "rented_times_after_last_reset": 6,
          "total_used_count": 26,
          "total_rented_times": 26,
          "last_reset_date": "2026-09-01 14:00",
          "is_active": true
        }
      ]
    }
  ]
}
```

---

## 4. Dedicated Machine Report Endpoint (`GET /api/machine-report/`)

A dedicated REST endpoint providing structured machine telemetry grouped by product.

- **URL:** `GET /api/machine-report/`
- **Permissions:** Admin / Superuser

### Example Request
```http
GET /api/machine-report/
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

### Example Response (`200 OK`)
```json
[
  {
    "product_id": 12,
    "product_name": "Demolition Hammer",
    "category_name": "Heavy Machinery",
    "machines": [
      {
        "machine_id": 4,
        "machine_number": "M-01",
        "max_use_time": 10,
        "rented_times_after_last_reset": 6,
        "total_rented_times": 26,
        "last_reset_date": "2026-09-01 14:00",
        "is_active": true
      }
    ]
  }
]
```

---

## 5. Customer Phone Numbers Excel Export (`GET /api/customers/export-phone-numbers/`)

Downloads an Excel spreadsheet (`.xlsx`) containing phone numbers of all registered customers except banned customers.

### Specifications
- **Endpoints:**
  - `GET /api/customers/export-phone-numbers/` (Primary ViewSet action)
  - `GET /api/customers/export-phone-numbers-excel/` (Alias)
  - `GET /api/reports/customer-phone-numbers-excel/` (Reports route)
  - `GET /api/reports/customer-phone-numbers/` (Reports route alias)
- **Permissions:** Admin / Superuser (`is_staff = True` or `is_superuser = True`)
- **Format Requirements:**
  - **Single Column:** Column A only (no additional columns).
  - **No Header:** Row 1 contains the first customer phone number directly.
  - **Customer Filter:** Includes all customers where `is_banned = False` and `mobile_number` is populated (banned customers are strictly excluded).
  - **Leading Zero Preservation:** Phone numbers are formatted as text strings (`@`) so leading zeros (e.g., `0771234567`) are preserved when opened in Microsoft Excel or Google Sheets.
- **Optional Query Parameters:**
  | Parameter | Type | Default | Description |
  |---|---|---|---|
  | `distinct` (or `unique`) | boolean (`true`/`false`) | `false` | If `true`, removes duplicate phone numbers while maintaining order. |

### Example Request
```http
GET /api/customers/export-phone-numbers/
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

### Response Headers
```http
HTTP/1.1 200 OK
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="customer_phone_numbers_202611060115.xlsx"
```

### File Content Structure
| Row | Column A |
|---|---|
| 1 | `0714263233` |
| 2 | `0713067197` |
| 3 | `0779587044` |
| 4 | `0789458601` |
| ... | ... |

---

## 6. Django Admin PDF Reports (`/admin/reports/`)

Staff and Superusers can generate and download formatted PDF documents directly from the Django Admin Panel.

- **URL:** `/admin/reports/`
- **View:** `AdminReportView`
- **Method:** `POST` (Form submission)
- **Response:** PDF binary download (`Content-Type: application/pdf`, `Content-Disposition: attachment; filename="<report_type>_<timestamp>.pdf"`)

### Available Report Types in Dropdown
| Value | Display Label | Behavior |
|---|---|---|
| `financial` | Financial Report | Requires `start_date` & `end_date`. Includes summary of money in, money out, deposits, refunds, damage fines, total expenses, itemized expenses table, source breakdown, and cash transactions. |
| `opened_bills` | Opened Bills Report | Start date is hidden in UI (fixed to system start). User selects `end_date`. PDF displays `Period: Beginning of System to <end_date>`. |
| `unsettled_bills` | Payment Unsettled Bills Report | Start date is hidden in UI (fixed to system start). User selects `end_date`. PDF displays `Period: Beginning of System to <end_date>`. |
| `closed_bills` | Closed Bills Report | Requires `start_date` & `end_date`. Includes Closed Bill Profit (rental fees + damage fines), total rental fees, total damage fines, customer deposits, refunds, and itemized bill details. |
| `stock_all` | Stock Report - All Products | Snapshot of current inventory |
| `stock_sales` | Stock Report - Sales Products | Snapshot of sale stock |
| `stock_rentals` | Stock Report - Rental Products | Snapshot of rental inventory |
| `damaged` | Damaged Products Report | Filtered by date range |
| `customers` | Customer Report | Filtered by date range |
| `banned` | Banned Customer Report | Filtered by date range |
| `machines` | Machine Usage Report | Snapshot with usage statistics |

---

## 7. Calculation & Business Rules

### 7.1. Daily Cutoff Time Calculation (`calculate_item_rental_days_to_date`)
When calculating rental days for open or unsettled bills up to a specific `target_end_date`:
1. If `target_end_date < item.rental_start_date`: Returns `0` days.
2. If the item was returned on or before `target_end_date`:
   - Uses `item.returned_date`.
   - If returned before the configured `return_cutoff_time`, `1` day is deducted (grace period).
3. If the item is still rented or returned after `target_end_date`:
   - Accrues up to `target_end_date`.
   - If `target_end_date == today` and the current time is before the cutoff, `1` day is deducted.
4. The billable days are calculated as `(effective_end - rental_start_date).days + 1`, subject to a minimum of `1` day.

### 7.2. Rental Damage Fines
- Damage fines (`RentalFine`) are deducted from security deposits upon tool check-in.
- In the Financial Report, `total_fines_collected` sums all `RentalFine` entries created on non-cancelled bills within `[start_date, end_date]`.

### 7.3. Closed Bill Lifecycle (`closed_at`)
- `RentalBill.closed_at` is indexed and recorded in `Asia/Colombo` time whenever:
  1. A bill is closed via the POS closure flow.
  2. An admin triggers `POST /api/rentals/{id}/manual_close/`.
  3. A bill is saved with `status = 'closed'` and `closed_at` is empty.
- Closed Bill Reports strictly filter on `closed_at__gte=start_dt, closed_at__lte=end_dt`.

---

## 8. Error Handling

Standard HTTP status codes returned by reporting endpoints:

| Status Code | Reason | Example Response |
|---|---|---|
| `400 Bad Request` | Missing required parameter or invalid date format | `{"error": "report_type is required"}` or `{"error": "Invalid start_date format. Use YYYY-MM-DD"}` |
| `401 Unauthorized` | Missing or invalid JWT Bearer token | `{"detail": "Authentication credentials were not provided."}` |
| `403 Forbidden` | User lacks superuser/staff privileges | `{"detail": "You do not have permission to perform this action."}` |
| `404 Not Found` | Unknown API path | `{"detail": "Not found."}` |
| `500 Server Error` | Unhandled backend exception | `{"detail": "An internal server error occurred."}` |

