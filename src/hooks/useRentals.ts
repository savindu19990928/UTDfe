import { useState, useEffect, useCallback } from 'react';
import { Bill, CartItem, DepositEntry, Customer } from '../types';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';
import { getPhotoUrl } from '../utils/format';
import { getCached, setCache, isFresh } from '../utils/apiCache';

interface UseRentalsOptions {
  search?: string;
  enabled?: boolean;
}

interface UseRentalsReturn {
  rentals: Bill[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  refetch: () => void;
}

function mapApiStatus(status: string): Bill['rentalStatus'] {
  switch (status) {
    case 'returned':
      return 'closed';
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
    apiItemId: raw.id || undefined
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
  const totalFines =
  parseFloat(raw.total_fines ?? 0) ||
  fines.reduce((s: number, f: any) => s + f.fine, 0);
  const discount = parseFloat(raw.discount ?? 0);

  // Calculate subtotal (before discount)
  const subtotal =
  discount > 0 ? totalRentalFee / (1 - discount / 100) : totalRentalFee;

  const customer: Customer = {
    name: raw.customer_name || '',
    phone: raw.customer_mobile || '',
    address: raw.customer_address || ''
  };

  // Determine rental status from item statuses AND balance (including fines)
  const totalItems = items.length;
  const returnedItems = items.filter((i) => i.status === 'returned').length;
  const allReturned = totalItems > 0 && returnedItems === totalItems;
  const netOwed = totalRentalFee + totalFines;
  const balanceSettled = totalDeposit >= netOwed;

  let rentalStatus: Bill['rentalStatus'] = 'open';
  if (allReturned && balanceSettled) {
    rentalStatus = 'closed';
  } else if (allReturned && !balanceSettled) {
    rentalStatus = 'partially_closed';
  } else if (returnedItems > 0) {
    rentalStatus = 'partially_closed';
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
    paymentMethod: 'cash',
    deposit: totalDeposit,
    depositHistory: deposits,
    fines,
    customerPhotoUrl: getPhotoUrl(raw.customer_photo),
    customerNic: raw.customer_nic || undefined,
    rentalStatus
  };
}

export function useRentals(options?: UseRentalsOptions): UseRentalsReturn {
  const [rentals, setRentals] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const search = options?.search;
  const enabled = options?.enabled !== false;
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchRentals = useCallback(async () => {
    if (!enabled) return;

    let baseUrl = `${API_URL}rentals/`;
    if (debouncedSearch && debouncedSearch.trim()) {
      baseUrl += `?bill_number=${encodeURIComponent(debouncedSearch.trim())}`;
    }

    const cacheKey = `rentals:${baseUrl}`;

    // Stale-while-revalidate
    const cached = getCached<{rentals: Bill[];totalCount: number;}>(
      cacheKey,
      60_000
    );
    if (cached) {
      setRentals(cached.rentals);
      setTotalCount(cached.totalCount);
      setLoading(false);
      if (isFresh(cacheKey, 20_000)) return;
    } else {
      setLoading(true);
    }

    setError(null);
    try {
      // Fetch first page
      const headers = {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      };
      const firstRes = await fetch(baseUrl, { headers });
      if (!firstRes.ok)
      throw new Error(`Failed to fetch rentals (${firstRes.status})`);
      const firstData = await firstRes.json();

      let allResults: any[];

      if (Array.isArray(firstData)) {
        allResults = firstData;
      } else {
        allResults = [...(firstData.results || [])];
        const total = firstData.count ?? allResults.length;

        // Fetch remaining pages in PARALLEL
        if (firstData.next) {
          const pageUrls: string[] = [];
          let nextUrl: string | null = firstData.next;
          // Build page URLs from the next links, or calculate them
          const pageSize = firstData.results?.length || 20;
          const totalPages = Math.ceil(total / pageSize);
          for (let p = 2; p <= totalPages; p++) {
            const separator = baseUrl.includes('?') ? '&' : '?';
            pageUrls.push(`${baseUrl}${separator}page=${p}`);
          }

          if (pageUrls.length > 0) {
            const pageResults = await Promise.all(
              pageUrls.map(async (url) => {
                try {
                  const res = await fetch(url, { headers });
                  if (!res.ok) return [];
                  const data = await res.json();
                  return data.results || [];
                } catch {
                  return [];
                }
              })
            );
            for (const results of pageResults) {
              allResults = [...allResults, ...results];
            }
          }
        }

        setTotalCount(total);
      }

      const mapped = allResults.map(mapApiRental);
      setRentals(mapped);
      setTotalCount(allResults.length);
      setCache(cacheKey, { rentals: mapped, totalCount: allResults.length });
    } catch (err: any) {
      if (!cached) {
        setError(err.message || 'Failed to load rentals');
      }
      console.error('Rentals fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, enabled]);

  useEffect(() => {
    if (enabled) {
      fetchRentals();
    }
  }, [fetchRentals, enabled]);

  return {
    rentals,
    loading,
    error,
    totalCount,
    refetch: fetchRentals
  };
}