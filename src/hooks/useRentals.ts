import { useState, useEffect, useCallback, useRef } from 'react';
import { Bill, CartItem, DepositEntry, Customer } from '../types';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';
import { getPhotoUrl } from '../utils/format';
import { getCached, setCache, isFresh } from '../utils/apiCache';

interface UseRentalsOptions {
  search?: string;
  status?: string;
  enabled?: boolean;
  page?: number;
  pageSize?: number;
}

interface UseRentalsReturn {
  rentals: Bill[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  stats: {
    total: number;
    open: number;
    overdue: number;
    closed: number;
    unpaid: number;
  };
  refetch: () => void;
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
  return {
    amount: parseFloat(raw.amount ?? 0),
    date: raw.transaction_date || '',
    note:
    raw.notes || (raw.transaction_type === 'deposit' ? 'Deposit' : 'Refund')
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

  const totalDeposit = parseFloat(raw.total_deposit ?? 0);
  const totalRentalFee = parseFloat(raw.total_rental_fee ?? 0);
  const discount = parseFloat(raw.discount ?? 0);

  const subtotal =
  discount > 0 ? totalRentalFee / (1 - discount / 100) : totalRentalFee;

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
    discountAmount: subtotal * (discount / 100),
    tax: 0,
    total: totalRentalFee,
    type: 'invoice',
    paymentMethod: raw.payment_method as Bill['paymentMethod'] || 'cash',
    deposit: totalDeposit,
    depositHistory: deposits,
    fines,
    customerPhotoUrl: getPhotoUrl(raw.customer_photo),
    customerNic: raw.customer_nic || undefined,
    nicTaken: raw.nic_taken || false,
    isPassportTaken: raw.is_passport_taken || false,
    isDrivingLicenceTaken: raw.is_driving_licence_taken || false,
    rentalStatus
  };
}

export function useRentals(options?: UseRentalsOptions): UseRentalsReturn {
  const [rentals, setRentals] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(options?.page || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    overdue: 0,
    closed: 0,
    unpaid: 0
  });

  const search = options?.search;
  const enabled = options?.enabled !== false;
  const pageSize = options?.pageSize || 20;
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  const abortRef = useRef<AbortController | null>(null);

  // Faster debounce — 200ms feels nearly instant while still batching keystrokes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchRentals = useCallback(async () => {
    if (!enabled) return;

    let baseUrl = `${API_URL}rentals/`;
    const params = new URLSearchParams();

    params.append('page', currentPage.toString());
    params.append('page_size', pageSize.toString());

    if (debouncedSearch && debouncedSearch.trim()) {
      params.append('search', debouncedSearch.trim());
    }

    if (options?.status && options.status !== 'all') {
      let apiStatus = options.status;
      if (apiStatus === 'open') apiStatus = 'active';
      params.append('status', apiStatus);
    }

    baseUrl += `?${params.toString()}`;

    const cacheKey = `rentals:${baseUrl}`;

    // Stale-while-revalidate — show cached instantly
    const cached = getCached<{rentals: Bill[];totalCount: number;totalPages: number;hasNext: boolean;hasPrevious: boolean;stats: any;}>(
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
      const data = await res.json();

      let allResults: any[];
      let count = 0;
      let next = false;
      let prev = false;
      let pages = 1;
      let apiStats = { total: 0, open: 0, overdue: 0, closed: 0, unpaid: 0 };

      if (Array.isArray(data)) {
        allResults = data;
        count = data.length;
      } else if (
      data &&
      typeof data === 'object' &&
      !('results' in data) && (
      data.bill_number || data.items || data.id))
      {
        allResults = [data];
        count = 1;
      } else {
        allResults = [...(data.results || [])];
        count = data.count || allResults.length;
        next = !!data.next;
        prev = !!data.previous;
        pages = data.total_pages || Math.ceil(count / pageSize) || 1;

        apiStats = {
          total: data.total_bill_count || 0,
          open: data.total_open_bills_count || 0,
          overdue: data.total_overdue_bills_count || 0,
          closed: data.total_closed_bills_count || 0,
          unpaid: data.total_unpaid_bills_count || 0
        };
      }

      const mapped = allResults.map(mapApiRental);
      setRentals(mapped);
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
      if (!cached) {
        setError(err.message || 'Failed to load rentals');
      }
      console.error('Rentals fetch error:', err);
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
      }
    }
  }, [debouncedSearch, enabled, currentPage, pageSize]);

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
    error,
    totalCount,
    currentPage,
    totalPages,
    hasNext,
    hasPrevious,
    stats,
    refetch: fetchRentals,
    setPage: setCurrentPage
  };
}