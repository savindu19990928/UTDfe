import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ApiRentalStatus,
  Bill,
  CartItem,
  Customer,
  DepositEntry,
  PaginatedResponse } from
'../types';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';
import { getPhotoUrl, toDiscountPercent } from '../utils/format';
import { getCached, setCache, isFresh } from '../utils/apiCache';

interface UseRentalsOptions {
  search?: string;
  status?: 'all' | ApiRentalStatus;
  enabled?: boolean;
  page?: number;
  pageSize?: number;
}

export interface RentalStats {
  total?: number;
  open?: number;
  returned?: number;
  overdue?: number;
  closed?: number;
  unpaid?: number;
}

interface UseRentalsReturn {
  rentals: Bill[];
  loading: boolean;
  /** True while a background refresh is in flight (no spinner shown). */
  refreshing: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  stats: RentalStats;
  refetch: (opts?: {quiet?: boolean;}) => Promise<void>;
  /** Re-fetch a single rental and swap it into the list in place. */
  refreshRental: (apiId?: number | null) => Promise<Bill | null>;
  setPage: (page: number) => void;
}

function mapApiStatus(status: string): Bill['rentalStatus'] {
  switch (status) {
    case 'closed':
      return 'closed';
    case 'returned':
      return 'partially_closed';
    case 'active':
      return 'open';
    case 'overdue':
      return 'open';
    default:
      return 'open';
  }
}

function mapRentalItem(raw: any): CartItem {
  return {
    product: {
      id: String(raw.product || ''),
      name: raw.product_name || '',
      category: 'Heavy Equipment' as any,
      listingType: 'rent',
      salePrice: 0,
      rentPricePerDay: parseFloat(raw.price ?? 0),
      stock: 0,
      itemCode: raw.product_item_number || undefined
    },
    quantity: raw.quantity || 1,
    type: 'rent',
    rentalDays: raw.rental_days || 1,
    borrowedDate: raw.rental_start_date || '',
    expectedReturnDate: raw.rental_end_date || '',
    actualReturnDate: raw.returned_date || undefined,
    actualReturnTime: raw.returned_time || undefined,
    status: raw.is_returned ? 'returned' : 'active',
    apiItemId: raw.id || undefined,
    rentalFee:
    raw.rental_fee !== undefined && raw.rental_fee !== null ?
    parseFloat(raw.rental_fee) :
    undefined
  };
}

function mapDepositTransaction(raw: any): DepositEntry & {type?: string;} {
  const pm = raw.payment_method || 'cash';
  return {
    amount: parseFloat(raw.amount ?? 0),
    date: raw.transaction_date || '',
    note:
    raw.notes || (raw.transaction_type === 'deposit' ? 'Deposit' : 'Refund'),
    paymentMethod: pm,
    payment_method: pm
  };
}

function mapRentalFine(raw: any) {
  return {
    id: raw.id,
    reason: raw.reason || '',
    fine: parseFloat(raw.fine ?? 0),
    created_at: raw.created_at
  };
}

function mapApiRental(raw: any): Bill {
  const items: CartItem[] = (raw.items || []).map(mapRentalItem);
  const depositTransactions = raw.deposit_transactions || [];
  const deposits = depositTransactions.
  filter((t: any) => t.transaction_type === 'deposit').
  map(mapDepositTransaction);

  const fines = (raw.fines || []).map(mapRentalFine);

  const depositMethods = new Set(
    deposits
      .map((d: any) => d.paymentMethod || d.payment_method)
      .filter(Boolean)
  );

  let billPaymentMethod: Bill['paymentMethod'] = raw.payment_method as Bill['paymentMethod'];
  if (raw.payment_method === 'mixed' || depositMethods.size > 1) {
    billPaymentMethod = 'mixed';
  } else if (!billPaymentMethod && depositMethods.size === 1) {
    billPaymentMethod = Array.from(depositMethods)[0] as Bill['paymentMethod'];
  }
  if (!billPaymentMethod) {
    billPaymentMethod = 'cash';
  }

  const totalDeposit = parseFloat(raw.total_deposit ?? 0);
  const totalRentalFee = parseFloat(raw.total_rental_fee ?? 0);
  // The API returns the discount as an amount — convert it to a percentage.
  const discountAmount = parseFloat(raw.discount ?? 0) || 0;
  const subtotal = totalRentalFee + discountAmount;
  const discount = toDiscountPercent(discountAmount, subtotal);

  const customer: Customer = {
    name: raw.customer_name || '',
    phone: raw.customer_mobile || '',
    address: raw.customer_address || ''
  };

  const totalItems = items.length;
  const returnedItems = items.filter((i) => i.status === 'returned').length;

  let rentalStatus: Bill['rentalStatus'] = mapApiStatus(raw.status || '');
  if (rentalStatus !== 'closed') {
    const allReturned = totalItems > 0 && returnedItems === totalItems;
    if (allReturned || returnedItems > 0) {
      rentalStatus = 'partially_closed';
    } else {
      rentalStatus = 'open';
    }
  }

  return {
    id: raw.bill_number || String(raw.id),
    apiId: raw.id || undefined,
    date: raw.created_at ? new Date(raw.created_at).toLocaleDateString() : '',
    dueDate: '',
    customer,
    items,
    subtotal,
    discount,
    discountAmount,
    tax: 0,
    total: totalRentalFee,
    type: 'invoice',
    paymentMethod: billPaymentMethod,
    deposit: totalDeposit,
    depositHistory: deposits,
    fines,
    customerPhotoUrl: getPhotoUrl(raw.customer_photo),
    customerNic: raw.customer_nic || undefined,
    nicTaken: raw.nic_taken || false,
    isPassportTaken: raw.is_passport_taken || false,
    isDrivingLicenceTaken: raw.is_driving_licence_taken || false,
    rentalStatus,
    apiStatus: raw.status as ApiRentalStatus | undefined
  };
}

export function useRentals(options?: UseRentalsOptions): UseRentalsReturn {
  const [rentals, setRentals] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(options?.page || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [stats, setStats] = useState<RentalStats>({});

  const search = options?.search;
  const status = options?.status;
  const enabled = options?.enabled !== false;
  const pageSize = options?.pageSize || 20;
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  const abortRef = useRef<AbortController | null>(null);
  const refreshCountRef = useRef(0);

  const beginRefresh = useCallback(() => {
    refreshCountRef.current += 1;
    setRefreshing(true);
  }, []);

  const endRefresh = useCallback(() => {
    refreshCountRef.current = Math.max(0, refreshCountRef.current - 1);
    if (refreshCountRef.current === 0) setRefreshing(false);
  }, []);

  // Faster debounce — 200ms feels nearly instant while still batching keystrokes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchRentals = useCallback(async (opts?: {quiet?: boolean;}) => {
    if (!enabled) return;

    // A quiet refresh keeps the list exactly as the user sees it — no spinner,
    // no reordering, no rows appearing or disappearing. Only the data of the
    // bills already on screen is updated.
    const quiet = opts?.quiet === true;

    let baseUrl = `${API_URL}rentals/`;
    const params = new URLSearchParams();

    params.append('page', currentPage.toString());
    params.append('page_size', pageSize.toString());

    if (debouncedSearch && debouncedSearch.trim()) {
      params.append('search', debouncedSearch.trim());
    }

    if (status && status !== 'all') {
      params.append('status', status);
    }

    baseUrl += `?${params.toString()}`;

    const cacheKey = `rentals:${baseUrl}`;

    // Stale-while-revalidate — show cached instantly
    let cached: {
      rentals: Bill[];
      totalCount: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
      stats: any;
    } | null = null;

    if (quiet) {
      beginRefresh();
    } else {
      cached = getCached<{rentals: Bill[];totalCount: number;totalPages: number;hasNext: boolean;hasPrevious: boolean;stats: any;}>(
        cacheKey,
        5 * 60_000
      );
      if (cached) {
        setRentals(cached.rentals);
        setTotalCount(cached.totalCount);
        setTotalPages(cached.totalPages);
        setHasNext(cached.hasNext);
        setHasPrevious(cached.hasPrevious);
        if (cached.stats) setStats(cached.stats);
        setLoading(false);
        // If fresh, skip network entirely (60s window)
        if (isFresh(cacheKey, 60_000)) return;
      } else {
        setLoading(true);
      }
    }

    // Cancel in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    try {
      const headers = {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      };
      const res = await fetch(baseUrl, { headers, signal: controller.signal });
      if (!res.ok) throw new Error(`Failed to fetch rentals (${res.status})`);
      const data = (await res.json()) as PaginatedResponse<any> & {
        total_bill_count?: number;
        total_open_bills_count?: number;
        total_returned_bills_count?: number;
        total_overdue_bills_count?: number;
        total_closed_bills_count?: number;
        total_unpaid_bills_count?: number;
      };
      const allResults = Array.isArray(data.results) ? data.results : [];
      const count = data.count ?? allResults.length;
      const next = Boolean(data.next);
      const prev = Boolean(data.previous);
      const pages = Math.max(1, Math.ceil(count / pageSize));
      const apiStats: RentalStats = {
        total: data.total_bill_count ?? count,
        open: data.total_open_bills_count,
        returned: data.total_returned_bills_count,
        overdue: data.total_overdue_bills_count,
        closed: data.total_closed_bills_count,
        unpaid: data.total_unpaid_bills_count
      };

      const mapped = allResults.map(mapApiRental);
      if (quiet) {
        // Patch data in place; never change which rows are shown or their order.
        const byId = new Map(mapped.map((b) => [b.id, b]));
        setRentals((current) => current.map((b) => byId.get(b.id) ?? b));
      } else {
        setRentals(mapped);
      }
      setTotalCount(count);
      setTotalPages(pages);
      setHasNext(next);
      setHasPrevious(prev);
      setStats(apiStats);
      setCache(cacheKey, {
        rentals: mapped,
        totalCount: count,
        totalPages: pages,
        hasNext: next,
        hasPrevious: prev,
        stats: apiStats
      });
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      if (!cached && !quiet) {
        setError(err.message || 'Failed to load rentals');
      }
      console.error('Rentals fetch error:', err);
    } finally {
      if (quiet) endRefresh();
      if (abortRef.current === controller) {
        setLoading(false);
      }
    }
  }, [
  debouncedSearch,
  enabled,
  currentPage,
  pageSize,
  status,
  beginRefresh,
  endRefresh]
  );

  // Pull one bill's latest data and swap it into the list where it already
  // sits. Used after an edit so nothing else on screen moves.
  const refreshRental = useCallback(
    async (apiId?: number | null): Promise<Bill | null> => {
      if (!apiId) return null;
      try {
        const res = await fetch(`${API_URL}rentals/${apiId}/`, {
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) throw new Error(`Failed to refresh bill (${res.status})`);
        const mapped = mapApiRental(await res.json());
        setRentals((prev) => {
          const oldBill = prev.find((b) => b.apiId === apiId || b.id === mapped.id);
          const next = prev.map((b) => b.apiId === apiId || b.id === mapped.id ? mapped : b);

          if (oldBill && oldBill.rentalStatus !== mapped.rentalStatus) {
            setStats((prevStats) => {
              const updatedStats = { ...prevStats };
              if (oldBill.rentalStatus === 'open' && updatedStats.open != null) {
                updatedStats.open = Math.max(0, updatedStats.open - 1);
              }
              if (mapped.rentalStatus === 'closed') {
                updatedStats.closed = (updatedStats.closed != null ? updatedStats.closed : 0) + 1;
              } else if (mapped.rentalStatus === 'partially_closed') {
                updatedStats.returned = (updatedStats.returned != null ? updatedStats.returned : 0) + 1;
              }
              return updatedStats;
            });
          }

          let baseUrl = `${API_URL}rentals/`;
          const params = new URLSearchParams();
          params.append('page', currentPage.toString());
          params.append('page_size', pageSize.toString());
          if (debouncedSearch && debouncedSearch.trim()) {
            params.append('search', debouncedSearch.trim());
          }
          if (status && status !== 'all') {
            params.append('status', status);
          }
          baseUrl += `?${params.toString()}`;
          const cacheKey = `rentals:${baseUrl}`;
          const cached = getCached<any>(cacheKey);
          if (cached) {
            setCache(cacheKey, {
              ...cached,
              rentals: next
            });
          }

          return next;
        });
        return mapped;
      } catch (err) {
        console.error('Rental refresh error:', err);
        return null;
      }
    },
    [currentPage, pageSize, debouncedSearch, status]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, status]);

  useEffect(() => {
    if (options?.page != null) setCurrentPage(options.page);
  }, [options?.page]);

  useEffect(() => {
    if (enabled) {
      fetchRentals();
    }
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchRentals, enabled]);

  return {
    rentals,
    loading,
    refreshing,
    error,
    totalCount,
    currentPage,
    totalPages,
    hasNext,
    hasPrevious,
    stats,
    refetch: fetchRentals,
    refreshRental,
    setPage: setCurrentPage
  };
}