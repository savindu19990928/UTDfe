import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useDeferredValue } from
'react';
import {
  ShoppingCart,
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Package,
  Search,
  Edit,
  Eye,
  Plus,
  X,
  Banknote,
  RotateCcw,
  Loader2,
  AlertCircle,
  RefreshCw,
  Undo2,
  Ban,
  Wrench,
  Trash2 } from
'lucide-react';
import { Bill, CartItem, Product, CashTransaction } from '../types';
import { useProducts } from '../hooks/useProducts';
import { useRentals } from '../hooks/useRentals';
import { useSales } from '../hooks/useSales';
import { formatPrice } from '../utils/format';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { clearCache } from '../utils/apiCache';
interface HistoryPageProps {
  bills: Bill[];
  cashTransactions: CashTransaction[];
  onUpdateBill: (bill: Bill) => void;
  onViewBill: (bill: Bill) => void;
  onAddCashTransaction: (transaction: CashTransaction) => void;
}
export function HistoryPage({
  bills,
  cashTransactions,
  onUpdateBill,
  onViewBill,
  onAddCashTransaction
}: HistoryPageProps) {
  const [activeTab, setActiveTab] = useState<'sales' | 'rentals'>('rentals');
  const [searchQuery, setSearchQuery] = useState('');
  // Deferred value keeps the input snappy when filtering large result sets
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [newDepositAmount, setNewDepositAmount] = useState('');
  // Modal state for adding products
  const [addItemModalBillId, setAddItemModalBillId] = useState<string | null>(
    null
  );
  const [productSearch, setProductSearch] = useState('');
  const modalSearchRef = useRef<HTMLInputElement>(null);
  // Two-step modal: select product, then set return date
  const [selectedProductForAdd, setSelectedProductForAdd] =
  useState<Product | null>(null);
  const [newItemReturnDate, setNewItemReturnDate] = useState('');
  // Machine number selection for adding an item to an existing rental bill
  const [availableMachines, setAvailableMachines] = useState<string[]>([]);
  const [rentedOutMachines, setRentedOutMachines] = useState<string[]>([]);
  const [damagedMachines, setDamagedMachines] = useState<string[]>([]);
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [machinesLoading, setMachinesLoading] = useState(false);
  const [machinesError, setMachinesError] = useState<string | null>(null);
  const [machineSearch, setMachineSearch] = useState('');
  const [manualQuantity, setManualQuantity] = useState(1);
  const [addItemLoading, setAddItemLoading] = useState(false);
  const [addItemError, setAddItemError] = useState<string | null>(null);
  // Single item return modal state
  const [returnSingleItemModal, setReturnSingleItemModal] = useState<{
    bill: Bill;
    itemIndex: number;
    returnDate: string;
    returnTime: string;
    fines: {
      reason: string;
      fine: string;
    }[];
  } | null>(null);
  const [returnDatePickerKey, setReturnDatePickerKey] = useState<string | null>(
    null
  );
  const [returnDateValue, setReturnDateValue] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Optimistic local updates for returned items
  const [localReturnedItems, setLocalReturnedItems] = useState<Set<string>>(
    new Set()
  );
  const [localReturnedBills, setLocalReturnedBills] = useState<Set<string>>(
    new Set()
  );
  // Rental return flow state
  const [returnAllConfirmBill, setReturnAllConfirmBill] = useState<Bill | null>(
    null
  );
  const [returnPaymentAmount, setReturnPaymentAmount] = useState('');
  // Fines state for return modal
  const [returnFines, setReturnFines] = useState<
    {
      reason: string;
      fine: string;
    }[]>(
    []);
  const [rentalReturnResult, setRentalReturnResult] = useState<{
    refundAmount: number;
    totalRentalFee: number;
    paymentProcessed: number;
    totalFines: number;
    allReturned: boolean;
    billId: string;
  } | null>(null);
  // Sale return modal state
  const [returnModalBill, setReturnModalBill] = useState<Bill | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<
    Record<number, number>>(
    {});
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);
  const [returnSuccess, setReturnSuccess] = useState<{
    refundAmount: number;
  } | null>(null);
  // Rental filter state
  const [rentalFilter, setRentalFilter] = useState<
    'all' | 'open' | 'overdue' | 'unpaid' | 'closed'>(
    'all');
  // Fetch products from API only when modal is open
  const { products: rentProducts } = useProducts({
    categoryType: 'rent',
    search: addItemModalBillId && productSearch ? productSearch : undefined,
    enabled: !!addItemModalBillId
  });
  // Fetch rentals from API
  const {
    rentals: apiRentalBills,
    loading: rentalsLoading,
    error: rentalsError,
    refetch: refetchRentals
  } = useRentals({
    search: activeTab === 'rentals' ? searchQuery : undefined,
    enabled: activeTab === 'rentals'
  });
  // Fetch sales from API
  const {
    sales: apiSaleBills,
    loading: salesLoading,
    error: salesError,
    refetch: refetchSales
  } = useSales({
    search: activeTab === 'sales' ? searchQuery : undefined,
    enabled: activeTab === 'sales'
  });
  useEffect(() => {
    if (
    addItemModalBillId &&
    modalSearchRef.current &&
    !selectedProductForAdd)
    {
      modalSearchRef.current.focus();
    }
  }, [addItemModalBillId, selectedProductForAdd]);
  // Apply optimistic updates to rental bills
  const patchedRentalBills = useMemo(() => {
    if (localReturnedItems.size === 0 && localReturnedBills.size === 0)
    return apiRentalBills;
    return apiRentalBills.map((bill) => {
      const hasLocalUpdates =
      bill.items.some((_, idx) =>
      localReturnedItems.has(`${bill.id}-${idx}`)
      ) || localReturnedBills.has(bill.id);
      if (!hasLocalUpdates) return bill;
      const updatedItems = bill.items.map((item, idx) => {
        if (
        localReturnedItems.has(`${bill.id}-${idx}`) ||
        localReturnedBills.has(bill.id) && item.status === 'active')
        {
          const now = new Date();
          return {
            ...item,
            status: 'returned' as const,
            actualReturnDate:
            item.actualReturnDate || now.toISOString().split('T')[0],
            actualReturnTime:
            item.actualReturnTime || now.toTimeString().slice(0, 5)
          };
        }
        return item;
      });
      const returnedCount = updatedItems.filter(
        (i) => i.status === 'returned'
      ).length;
      const allReturned = returnedCount === updatedItems.length;
      // Never auto-close — closing must be done manually
      let rentalStatus: Bill['rentalStatus'] = bill.rentalStatus || 'open';
      if (rentalStatus !== 'closed') {
        if (allReturned || returnedCount > 0) {
          rentalStatus = 'partially_closed';
        } else {
          rentalStatus = 'open';
        }
      }
      return {
        ...bill,
        items: updatedItems,
        rentalStatus
      };
    });
  }, [apiRentalBills, localReturnedItems, localReturnedBills]);
  // Clear local patches when API data refreshes (the API data will have the real status)
  useEffect(() => {
    if (
    !rentalsLoading && (
    localReturnedItems.size > 0 || localReturnedBills.size > 0))
    {
      setLocalReturnedItems(new Set());
      setLocalReturnedBills(new Set());
    }
  }, [apiRentalBills]);
  // Separate bills by type
  const saleBills = apiSaleBills;
  const rentalBills = patchedRentalBills;
  // Search filter — use deferred value so typing stays instant
  const filteredSaleBills = useMemo(() => {
    if (!deferredSearchQuery.trim()) return saleBills;
    const q = deferredSearchQuery.toLowerCase();
    return saleBills.filter(
      (b) =>
      b.id.toLowerCase().includes(q) ||
      b.customer.name.toLowerCase().includes(q) ||
      b.items.some((i) => i.product.name.toLowerCase().includes(q))
    );
  }, [saleBills, deferredSearchQuery]);
  const filteredRentalBills = useMemo(() => {
    if (!deferredSearchQuery.trim()) return rentalBills;
    const q = deferredSearchQuery.toLowerCase();
    return rentalBills.filter(
      (b) =>
      b.id.toLowerCase().includes(q) ||
      b.customer.name.toLowerCase().includes(q) ||
      b.items.some((i) => i.product.name.toLowerCase().includes(q))
    );
  }, [rentalBills, deferredSearchQuery]);
  // Rental stats
  const rentalStats = useMemo(() => {
    const helper = (bills: Bill[]) => {
      let open = 0;
      let overdue = 0;
      let unpaid = 0;
      let closed = 0;
      bills.forEach((b) => {
        const totalDeposit =
        b.depositHistory?.reduce((s, d) => s + d.amount, 0) || b.deposit || 0;
        const returnedCount = b.items.filter(
          (i) => i.status === 'returned'
        ).length;
        const allReturned =
        returnedCount === b.items.length && b.items.length > 0;
        const hasActiveItems = b.items.some((i) => i.status === 'active');
        const owes = b.total > totalDeposit;
        if (b.rentalStatus === 'closed') {
          closed++;
        } else if (allReturned && owes) {
          unpaid++;
        } else if (allReturned && !owes) {
          // All returned, balance settled, but not yet manually closed
          open++;
        } else if (hasActiveItems && owes) {
          overdue++;
        } else if (hasActiveItems) {
          open++;
        }
      });
      return {
        open,
        overdue,
        unpaid,
        closed,
        total: bills.length
      };
    };
    return helper(filteredRentalBills);
  }, [filteredRentalBills]);
  // Apply rental filter card
  const displayedRentalBills = useMemo(() => {
    if (rentalFilter === 'all') return filteredRentalBills;
    return filteredRentalBills.filter((b) => {
      const totalDeposit =
      b.depositHistory?.reduce((s, d) => s + d.amount, 0) || b.deposit || 0;
      const returnedCount = b.items.filter(
        (i) => i.status === 'returned'
      ).length;
      const allReturned = returnedCount === b.items.length && b.items.length > 0;
      const hasActiveItems = b.items.some((i) => i.status === 'active');
      const owes = b.total > totalDeposit;
      switch (rentalFilter) {
        case 'open':
          return (
            hasActiveItems && !owes ||
            allReturned && !owes && b.rentalStatus !== 'closed');

        case 'overdue':
          return hasActiveItems && owes;
        case 'unpaid':
          return allReturned && owes && b.rentalStatus !== 'closed';
        case 'closed':
          return b.rentalStatus === 'closed';
        default:
          return true;
      }
    });
  }, [filteredRentalBills, rentalFilter]);
  // Edit handlers
  const handleReturnItem = async (
  bill: Bill,
  itemIndex: number,
  returnDate: string,
  returnTime: string,
  fines?: {
    reason: string;
    fine: string;
  }[]) =>
  {
    const item = bill.items[itemIndex];
    if (
    item.type !== 'rent' ||
    item.status !== 'active' ||
    !item.apiItemId ||
    !bill.apiId)

    return;
    setActionLoading(`return-${bill.id}-${itemIndex}`);
    setActionError(null);
    try {
      const returnPayload: any = {
        item_id: item.apiItemId,
        actual_return_date: returnDate
      };
      if (returnTime) {
        returnPayload.actual_return_time =
        returnTime.length === 5 ? `${returnTime}:00` : returnTime;
      }
      const requestBody: any = {
        items_to_return: [returnPayload]
      };
      // Include fines if any valid entries exist
      const validFines = (fines || []).filter(
        (f) => f.reason.trim() && parseFloat(f.fine) > 0
      );
      if (validFines.length > 0) {
        requestBody.fines = validFines.map((f) => ({
          reason: f.reason.trim(),
          fine: parseFloat(f.fine)
        }));
      }
      const res = await fetch(`${API_URL}rentals/${bill.apiId}/return_items/`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        const msg = errData ?
        typeof errData === 'string' ?
        errData :
        errData.detail ||
        errData.message ||
        errData.error ||
        JSON.stringify(errData) :
        `Failed to return item (${res.status})`;
        throw new Error(msg);
      }
      const data = await res.json();
      setReturnSingleItemModal(null);
      // Show return result only if all items are returned
      const isAllReturned =
      data.all_items_returned ?? data.all_items_being_returned ?? false;
      if (isAllReturned) {
        setRentalReturnResult({
          refundAmount: parseFloat(data.refund_amount ?? 0),
          totalRentalFee: parseFloat(data.total_rental_fee ?? 0),
          paymentProcessed: parseFloat(data.payment_to_process ?? 0),
          totalFines: parseFloat(data.rental?.total_fines ?? 0),
          allReturned: isAllReturned,
          billId: bill.id
        });
      }
      // Optimistic local update
      setLocalReturnedItems((prev) =>
      new Set(prev).add(`${bill.id}-${itemIndex}`)
      );
      // Background refetch for data consistency
      clearCache('rentals:');
      refetchRentals();
    } catch (err: any) {
      setActionError(err.message || 'Failed to return item');
      console.error('Return item error:', err);
    } finally {
      setActionLoading(null);
    }
  };
  // Return ALL active items for a rental bill
  const handleReturnAllItems = async (bill: Bill) => {
    if (!bill.apiId) return;
    const activeItems = bill.items.filter(
      (i) => i.status === 'active' && i.apiItemId
    );
    if (activeItems.length === 0) return;
    setActionLoading(`return-all-${bill.id}`);
    setActionError(null);
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 8);
    try {
      const requestBody: any = {
        items_to_return: activeItems.map((item) => ({
          item_id: item.apiItemId,
          actual_return_date: today,
          actual_return_time: currentTime
        }))
      };
      // Include payment if customer owes money and a payment amount was entered
      const paymentVal = parseFloat(returnPaymentAmount);
      if (!isNaN(paymentVal) && paymentVal > 0) {
        requestBody.payment = paymentVal;
      }
      // Include fines if any valid entries exist
      const validFines = returnFines.filter(
        (f) => f.reason.trim() && parseFloat(f.fine) > 0
      );
      if (validFines.length > 0) {
        requestBody.fines = validFines.map((f) => ({
          reason: f.reason.trim(),
          fine: parseFloat(f.fine)
        }));
      }
      const res = await fetch(`${API_URL}rentals/${bill.apiId}/return_items/`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        const msg = errData ?
        typeof errData === 'string' ?
        errData :
        errData.detail ||
        errData.message ||
        errData.error ||
        JSON.stringify(errData) :
        `Failed to return items (${res.status})`;
        throw new Error(msg);
      }
      const data = await res.json();
      // Show return result
      setRentalReturnResult({
        refundAmount: parseFloat(data.refund_amount ?? 0),
        totalRentalFee: parseFloat(data.total_rental_fee ?? 0),
        paymentProcessed: parseFloat(data.payment_to_process ?? 0),
        totalFines: parseFloat(data.rental?.total_fines ?? 0),
        allReturned:
        data.all_items_returned ?? data.all_items_being_returned ?? false,
        billId: bill.id
      });
      // Optimistic local update — mark entire bill as returned
      setLocalReturnedBills((prev) => new Set(prev).add(bill.id));
      setEditingBillId(null);
      setReturnAllConfirmBill(null);
      setReturnPaymentAmount('');
      setReturnFines([]);
      // Background refetch
      clearCache('rentals:');
      refetchRentals();
    } catch (err: any) {
      setActionError(err.message || 'Failed to return items');
      console.error('Return all items error:', err);
    } finally {
      setActionLoading(null);
    }
  };
  const handleAddDeposit = async (bill: Bill) => {
    const amount = parseFloat(newDepositAmount);
    if (isNaN(amount) || amount <= 0 || !bill.apiId) return;
    setActionLoading(`deposit-${bill.id}`);
    setActionError(null);
    const today = new Date().toISOString().split('T')[0];
    try {
      const res = await fetch(`${API_URL}rentals/${bill.apiId}/add_deposit/`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amount.toFixed(2),
          payment_method: 'cash',
          transaction_date: today,
          notes: 'Additional Deposit'
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        const msg = errData ?
        typeof errData === 'string' ?
        errData :
        errData.detail || errData.message || JSON.stringify(errData) :
        `Failed to add deposit (${res.status})`;
        throw new Error(msg);
      }
      setNewDepositAmount('');
      // Clear cache and refetch rentals to get updated data
      clearCache('rentals:');
      refetchRentals();
    } catch (err: any) {
      setActionError(err.message || 'Failed to add deposit');
      console.error('Add deposit error:', err);
    } finally {
      setActionLoading(null);
    }
  };
  // Manually close a rental bill (no auto-close)
  const handleManualClose = async (bill: Bill) => {
    if (!bill.apiId) return;
    setActionLoading(`close-${bill.id}`);
    setActionError(null);
    try {
      const res = await fetch(`${API_URL}rentals/${bill.apiId}/manual_close/`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        const msg = errData ?
        typeof errData === 'string' ?
        errData :
        errData.detail ||
        errData.message ||
        errData.error ||
        JSON.stringify(errData) :
        `Failed to close bill (${res.status})`;
        throw new Error(msg);
      }
      // Clear cache and refetch to get updated status
      clearCache('rentals:');
      refetchRentals();
    } catch (err: any) {
      setActionError(err.message || 'Failed to close bill');
      console.error('Manual close error:', err);
    } finally {
      setActionLoading(null);
    }
  };
  // Reset the add-item modal back to a clean state
  const resetAddItemModal = () => {
    setAddItemModalBillId(null);
    setProductSearch('');
    setSelectedProductForAdd(null);
    setNewItemReturnDate('');
    setAvailableMachines([]);
    setRentedOutMachines([]);
    setDamagedMachines([]);
    setSelectedMachines([]);
    setMachineSearch('');
    setManualQuantity(1);
    setMachinesError(null);
    setMachinesLoading(false);
    setAddItemError(null);
    setAddItemLoading(false);
  };
  // Fetch available machine numbers for a product (for the add-item flow)
  const fetchAvailableMachines = async (product: Product) => {
    setSelectedMachines([]);
    setAvailableMachines([]);
    setRentedOutMachines([]);
    setDamagedMachines([]);
    setMachinesError(null);
    setMachinesLoading(true);
    try {
      const res = await fetch(
        `${API_URL}products/${product.id}/available_machines/`,
        {
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          }
        }
      );
      if (!res.ok) {
        throw new Error(`Failed to load machine numbers (${res.status})`);
      }
      const data = await res.json();
      const available: string[] = (data?.available_machine_numbers || []).map(
        (m: any) => String(m)
      );
      const rentedOut: string[] = (data?.rented_out_machine_numbers || []).map(
        (m: any) => String(m)
      );
      const damaged: string[] = (data?.damaged_machine_numbers || []).map(
        (m: any) => String(m)
      );
      setAvailableMachines(available);
      setRentedOutMachines(rentedOut);
      setDamagedMachines(damaged);
    } catch (err: any) {
      setMachinesError(err.message || 'Failed to load machine numbers');
    } finally {
      setMachinesLoading(false);
    }
  };
  const toggleAddItemMachine = (machine: string) => {
    setSelectedMachines((prev) =>
    prev.includes(machine) ?
    prev.filter((m) => m !== machine) :
    [...prev, machine]
    );
  };
  // Add a rental product to an EXISTING rental bill via the API,
  // including the selected machine numbers.
  const handleAddItem = async (bill: Bill, product: Product) => {
    if (!bill.apiId) {
      setAddItemError('This bill cannot be edited (missing reference).');
      return;
    }
    if (!newItemReturnDate) {
      setAddItemError('Please select an expected return date.');
      return;
    }
    // If it's tracked but no machines are available, we fallback to manual quantity
    const isTracked =
    product.isStockTracked !== false && availableMachines.length > 0;
    // Block: machine-tracked product with every machine rented out or damaged
    if (
    product.isStockTracked !== false &&
    availableMachines.length === 0 && (
    rentedOutMachines.length > 0 || damagedMachines.length > 0))
    {
      setAddItemError(
        `All machines for "${product.name}" are currently unavailable.`
      );
      return;
    }
    // Block: non-machine product that is out of stock
    if (!isTracked && product.stock != null && product.stock <= 0) {
      setAddItemError(`"${product.name}" is currently out of stock.`);
      return;
    }
    if (isTracked && selectedMachines.length === 0) {
      setAddItemError('Please select at least one machine number.');
      return;
    }
    if (!isTracked && manualQuantity <= 0) {
      setAddItemError('Please enter a valid quantity.');
      return;
    }
    setAddItemLoading(true);
    setAddItemError(null);
    const today = new Date().toISOString().split('T')[0];
    try {
      const payload: any = {
        product: parseInt(product.id),
        quantity: isTracked ? selectedMachines.length : manualQuantity,
        rental_start_date: today,
        rental_end_date: newItemReturnDate
      };
      if (isTracked) {
        payload.machine_numbers = selectedMachines;
      }
      const res = await fetch(`${API_URL}rentals/${bill.apiId}/add_item/`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        const msg = errData ?
        typeof errData === 'string' ?
        errData :
        errData.detail ||
        errData.message ||
        errData.error ||
        JSON.stringify(errData) :
        `Failed to add item (${res.status})`;
        throw new Error(msg);
      }
      // Refresh the rentals list to reflect the newly added item
      clearCache('rentals:');
      refetchRentals();
      resetAddItemModal();
    } catch (err: any) {
      setAddItemError(err.message || 'Failed to add item');
      console.error('Add item error:', err);
    } finally {
      setAddItemLoading(false);
    }
  };
  const handleCashTransaction = () => {
    const amount = parseFloat(cashAmount);
    if (!isNaN(amount) && amount > 0 && showCashModal) {
      onAddCashTransaction({
        id: `CT-${Date.now()}`,
        type: showCashModal,
        amount,
        note:
        cashNote || (showCashModal === 'cash_in' ? 'Cash In' : 'Cash Out'),
        date: new Date().toLocaleDateString()
      });
      setCashAmount('');
      setCashNote('');
      setShowCashModal(null);
    }
  };
  const recalcAndUpdate = (
  bill: Bill,
  items: CartItem[],
  depositHistory: Bill['depositHistory']) =>
  {
    let newSubtotal = 0;
    let allReturned = true;
    let anyReturned = false;
    items.forEach((item) => {
      if (item.type === 'rent') {
        const price = item.product.rentPricePerDay || 0;
        let days = item.rentalDays || 1;
        if (
        item.status === 'returned' &&
        item.actualReturnDate &&
        item.borrowedDate)
        {
          const start = new Date(item.borrowedDate);
          const end = new Date(item.actualReturnDate);
          const diffTime = Math.abs(end.getTime() - start.getTime());
          days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        } else if (item.status === 'active' && item.borrowedDate) {
          const start = new Date(item.borrowedDate);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - start.getTime());
          days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        }
        newSubtotal +=
        item.rentalFee !== undefined ?
        item.rentalFee :
        price * days * item.quantity;
        if (item.status === 'active') allReturned = false;
        if (item.status === 'returned') anyReturned = true;
      } else {
        newSubtotal += item.product.salePrice * item.quantity;
      }
    });
    const discountAmount = newSubtotal * (bill.discount / 100);
    const afterDiscount = newSubtotal - discountAmount;
    const taxAmount = afterDiscount * 0.08;
    const newTotal = afterDiscount + taxAmount;
    const totalDeposit =
    depositHistory?.reduce((sum, entry) => sum + entry.amount, 0) || 0;
    // Never auto-close — closing must be done manually
    let newStatus: Bill['rentalStatus'] = bill.rentalStatus || 'open';
    if (newStatus !== 'closed') {
      if (allReturned && items.length > 0) newStatus = 'partially_closed';else
      if (anyReturned) newStatus = 'partially_closed';else
      newStatus = 'open';
    }
    onUpdateBill({
      ...bill,
      items,
      subtotal: newSubtotal,
      discountAmount,
      tax: taxAmount,
      total: newTotal,
      deposit: totalDeposit,
      depositHistory,
      rentalStatus: newStatus
    });
  };
  const filteredProducts = rentProducts;
  const getStatusBadge = (status?: string, bill?: Bill) => {
    // Check special states for partially_closed bills
    if (bill && status === 'partially_closed') {
      const returnedCount = bill.items.filter(
        (i) => i.status === 'returned'
      ).length;
      const allReturned =
      returnedCount === bill.items.length && bill.items.length > 0;
      const totalDeposit =
      bill.depositHistory?.reduce((s, d) => s + d.amount, 0) ||
      bill.deposit ||
      0;
      const totalFines =
      bill.fines?.reduce((s, f) => s + Number(f.fine), 0) || 0;
      const netOwed = bill.total + totalFines;
      const owes = netOwed > totalDeposit;
      if (allReturned && owes) {
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
            <Ban className="w-3 h-3 mr-1" />
            Unpaid
          </span>);

      }
      if (allReturned && !owes) {
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Ready to Close
          </span>);

      }
    }
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3 mr-1" />
            Open
          </span>);

      case 'partially_closed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Partial
          </span>);

      case 'closed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Closed
          </span>);

      default:
        return null;
    }
  };
  // Get the bill for the modal
  const modalBill = addItemModalBillId ?
  rentalBills.find((b) => b.id === addItemModalBillId) :
  null;
  // Handle sale item return
  const handleSaleReturn = async () => {
    if (!returnModalBill || !returnModalBill.apiId) return;
    const itemsToReturn = Object.entries(returnQuantities).
    filter(([_, qty]) => qty > 0).
    map(([itemId, quantity]) => ({
      item_id: Number(itemId),
      quantity
    }));
    if (itemsToReturn.length === 0) return;
    setReturnLoading(true);
    setReturnError(null);
    setReturnSuccess(null);
    try {
      const res = await fetch(
        `${API_URL}sales/${returnModalBill.apiId}/return_items/`,
        {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            items_to_return: itemsToReturn
          })
        }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        const msg = errData ?
        typeof errData === 'string' ?
        errData :
        errData.detail || errData.message || JSON.stringify(errData) :
        `Failed to return items (${res.status})`;
        throw new Error(msg);
      }
      const data = await res.json();
      setReturnSuccess({
        refundAmount: parseFloat(data.refund_amount ?? 0)
      });
      clearCache('sales:');
      refetchSales();
    } catch (err: any) {
      setReturnError(err.message || 'Failed to return items');
      console.error('Sale return error:', err);
    } finally {
      setReturnLoading(false);
    }
  };
  const openReturnModal = (bill: Bill) => {
    setReturnModalBill(bill);
    setReturnQuantities({});
    setReturnError(null);
    setReturnSuccess(null);
  };
  const closeReturnModal = () => {
    setReturnModalBill(null);
    setReturnQuantities({});
    setReturnError(null);
    setReturnSuccess(null);
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1a1a2e] mb-2">History</h1>
        <p className="text-gray-600">
          View and manage sales and rental records.
        </p>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setActiveTab('rentals');
              setSearchQuery('');
              setEditingBillId(null);
              setRentalFilter('all');
            }}
            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors ${activeTab === 'rentals' ? 'bg-[#2d4059] text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            
            <Clock className="w-4 h-4" />
            Rentals
          </button>
          <button
            onClick={() => {
              setActiveTab('sales');
              setSearchQuery('');
              setEditingBillId(null);
            }}
            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors ${activeTab === 'sales' ? 'bg-[#f5a623] text-[#1a1a2e] shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            
            <ShoppingCart className="w-4 h-4" />
            Sales
          </button>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'rentals' &&
          <button
            onClick={() => {
              clearCache('rentals:');
              refetchRentals();
            }}
            className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            
              <RefreshCw
              className={`w-4 h-4 ${rentalsLoading ? 'animate-spin' : ''}`} />
            
            </button>
          }
          {activeTab === 'sales' &&
          <button
            onClick={() => {
              clearCache('sales:');
              refetchSales();
            }}
            className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            
              <RefreshCw
              className={`w-4 h-4 ${salesLoading ? 'animate-spin' : ''}`} />
            
            </button>
          }
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#f5a623] text-sm" />
            
          </div>
        </div>
      </div>

      {/* Rental History Tab */}
      {activeTab === 'rentals' &&
      <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <button
            onClick={() =>
            setRentalFilter(rentalFilter === 'open' ? 'all' : 'open')
            }
            className={`p-4 rounded-xl shadow-sm border flex items-center justify-between transition-all ${rentalFilter === 'open' ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200' : 'bg-white border-gray-200 hover:border-blue-200'}`}>
            
              <div>
                <p className="text-xs font-medium text-gray-500 text-left">
                  Open
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {rentalStats.open}
                </p>
              </div>
              <div
              className={`p-2.5 rounded-full ${rentalFilter === 'open' ? 'bg-blue-200' : 'bg-blue-100'}`}>
              
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
            </button>
            <button
            onClick={() =>
            setRentalFilter(rentalFilter === 'overdue' ? 'all' : 'overdue')
            }
            className={`p-4 rounded-xl shadow-sm border flex items-center justify-between transition-all ${rentalFilter === 'overdue' ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-200' : 'bg-white border-gray-200 hover:border-amber-200'}`}>
            
              <div>
                <p className="text-xs font-medium text-gray-500 text-left">
                  Overdue
                </p>
                <p className="text-2xl font-bold text-amber-600">
                  {rentalStats.overdue}
                </p>
              </div>
              <div
              className={`p-2.5 rounded-full ${rentalFilter === 'overdue' ? 'bg-amber-200' : 'bg-amber-100'}`}>
              
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
            </button>
            <button
            onClick={() =>
            setRentalFilter(rentalFilter === 'unpaid' ? 'all' : 'unpaid')
            }
            className={`p-4 rounded-xl shadow-sm border flex items-center justify-between transition-all ${rentalFilter === 'unpaid' ? 'bg-red-50 border-red-400 ring-2 ring-red-200' : 'bg-white border-gray-200 hover:border-red-200'}`}>
            
              <div>
                <p className="text-xs font-medium text-gray-500 text-left">
                  Unpaid
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {rentalStats.unpaid}
                </p>
              </div>
              <div
              className={`p-2.5 rounded-full ${rentalFilter === 'unpaid' ? 'bg-red-200' : 'bg-red-100'}`}>
              
                <Ban className="w-5 h-5 text-red-600" />
              </div>
            </button>
            <button
            onClick={() =>
            setRentalFilter(rentalFilter === 'closed' ? 'all' : 'closed')
            }
            className={`p-4 rounded-xl shadow-sm border flex items-center justify-between transition-all ${rentalFilter === 'closed' ? 'bg-green-50 border-green-400 ring-2 ring-green-200' : 'bg-white border-gray-200 hover:border-green-200'}`}>
            
              <div>
                <p className="text-xs font-medium text-gray-500 text-left">
                  Closed
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {rentalStats.closed}
                </p>
              </div>
              <div
              className={`p-2.5 rounded-full ${rentalFilter === 'closed' ? 'bg-green-200' : 'bg-green-100'}`}>
              
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </button>
          </div>

          {/* Active filter indicator */}
          {rentalFilter !== 'all' &&
        <div className="mb-4 flex items-center gap-2">
              <span className="text-sm text-gray-500">
                Showing{' '}
                <span className="font-bold capitalize text-[#1a1a2e]">
                  {rentalFilter}
                </span>{' '}
                bills ({displayedRentalBills.length})
              </span>
              <button
            onClick={() => setRentalFilter('all')}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
            
                <X className="w-3 h-3" />
                Clear filter
              </button>
            </div>
        }

          {/* Loading */}
          {rentalsLoading && rentalBills.length === 0 &&
        <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-[#f5a623] animate-spin" />
              <span className="ml-3 text-gray-500 font-medium">
                Loading rentals...
              </span>
            </div>
        }

          {/* Error */}
          {rentalsError && !rentalsLoading &&
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8 text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-700 font-medium mb-3">{rentalsError}</p>
              <button
            onClick={() => refetchRentals()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors">
            
                Retry
              </button>
            </div>
        }

          {!rentalsLoading && !rentalsError && rentalBills.length === 0 ?
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No rental bills found</p>
              <p className="text-gray-400 text-sm mt-1">
                Create a rental order from the catalog to see it here.
              </p>
            </div> :

        !rentalsLoading &&
        !rentalsError &&
        <div className="space-y-4">
                {displayedRentalBills.length === 0 && rentalFilter !== 'all' ?
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">
                      No {rentalFilter} rental bills
                    </p>
                    <button
              onClick={() => setRentalFilter('all')}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">
              
                      Show all bills
                    </button>
                  </div> :

          displayedRentalBills.map((bill) => {
            const isEditing = editingBillId === bill.id;
            const returnedCount = bill.items.filter(
              (i) => i.status === 'returned'
            ).length;
            const totalDeposit =
            bill.depositHistory?.reduce((s, d) => s + d.amount, 0) ||
            bill.deposit ||
            0;
            const totalFines =
            bill.fines?.reduce((s, f) => s + Number(f.fine), 0) || 0;
            const allItemsReturned =
            returnedCount === bill.items.length &&
            bill.items.length > 0;
            const netOwed = bill.total + totalFines;
            const balance = totalDeposit - netOwed;
            const hasOutstandingBalance = balance < 0;
            const needsPayment =
            allItemsReturned && hasOutstandingBalance;
            return (
              <div
                key={bill.id}
                className={`bg-white rounded-xl shadow-sm border ${isEditing ? 'border-blue-300 ring-2 ring-blue-100' : needsPayment ? 'border-red-200 ring-1 ring-red-100' : 'border-gray-200'}`}>
                
                        {/* Bill Header */}
                        <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono font-bold text-[#1a1a2e]">
                                {bill.id}
                              </span>
                              {getStatusBadge(bill.rentalStatus, bill)}
                              {needsPayment &&
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                  <Banknote className="w-3 h-3 mr-1" />
                                  {formatPrice(Math.abs(balance))} due
                                </span>
                      }
                            </div>
                            <p className="text-sm text-gray-600">
                              {bill.customer.name} · {bill.customer.phone}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {bill.date} · {returnedCount}/{bill.items.length}{' '}
                              items returned
                              {bill.nicTaken !== undefined &&
                      <span
                        className={`ml-2 px-1.5 py-0.5 rounded ${bill.nicTaken ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
                        
                                  NIC: {bill.nicTaken ? 'Taken' : 'Not Taken'}
                                </span>
                      }
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right mr-2">
                              <p className="text-xs text-gray-500">Subtotal</p>
                              <p className="font-bold text-[#1a1a2e]">
                                {formatPrice(bill.total)}
                              </p>
                            </div>
                            {totalFines > 0 &&
                    <div className="text-right mr-2">
                                <p className="text-xs text-gray-500">Fines</p>
                                <p className="font-bold text-red-600">
                                  {formatPrice(totalFines)}
                                </p>
                              </div>
                    }
                            <div className="text-right mr-2">
                              <p className="text-xs text-gray-500">Deposit</p>
                              <p className="font-bold text-blue-600">
                                {formatPrice(totalDeposit)}
                              </p>
                            </div>
                            <div className="text-right mr-4">
                              <p className="text-xs text-gray-500">Balance</p>
                              <p
                        className={`font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        
                                {balance >= 0 ?
                        formatPrice(balance) :
                        `-${formatPrice(Math.abs(balance))}`}
                              </p>
                            </div>
                            {bill.rentalStatus !== 'closed' &&
                    bill.items.some(
                      (i) => i.status === 'active' && i.apiItemId
                    ) &&
                    <button
                      onClick={() => {
                        setReturnAllConfirmBill(bill);
                        setReturnPaymentAmount('');
                        setActionError(null);
                      }}
                      disabled={
                      actionLoading === `return-all-${bill.id}`
                      }
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
                      
                                  {actionLoading === `return-all-${bill.id}` ?
                      <>
                                      <Loader2 className="w-4 h-4 animate-spin" />{' '}
                                      Returning...
                                    </> :

                      <>
                                      <RotateCcw className="w-4 h-4" /> Return
                                      All
                                    </>
                      }
                                </button>
                    }
                            {bill.rentalStatus !== 'closed' &&
                    allItemsReturned &&
                    <button
                      onClick={() => handleManualClose(bill)}
                      disabled={
                      actionLoading === `close-${bill.id}`
                      }
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
                      
                                  {actionLoading === `close-${bill.id}` ?
                      <>
                                      <Loader2 className="w-4 h-4 animate-spin" />{' '}
                                      Closing...
                                    </> :

                      <>
                                      <CheckCircle className="w-4 h-4" /> Close
                                      Bill
                                    </>
                      }
                                </button>
                    }
                            <button
                      onClick={() => {
                        setEditingBillId(isEditing ? null : bill.id);
                        setAddItemModalBillId(null);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${isEditing ? 'bg-gray-200 text-gray-700' : needsPayment ? 'bg-red-600 text-white hover:bg-red-700' : bill.rentalStatus === 'closed' ? 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                      
                              {isEditing ?
                      <>
                                  <X className="w-4 h-4" /> Close
                                </> :
                      needsPayment ?
                      <>
                                  <Banknote className="w-4 h-4" /> Settle
                                </> :

                      <>
                                  <Edit className="w-4 h-4" /> Edit
                                </>
                      }
                            </button>
                            <button
                      onClick={() => onViewBill(bill)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1a2e] text-white rounded-lg text-sm font-bold hover:bg-[#2d4059] transition-colors">
                      
                              <Eye className="w-4 h-4" />
                              Invoice
                            </button>
                          </div>
                        </div>

                        {/* Items Table */}
                        <div className="border-t border-gray-100 overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-500 text-xs font-medium">
                              <tr>
                                <th className="px-4 py-2 text-left">Item</th>
                                <th className="px-4 py-2 text-center">Start</th>
                                <th className="px-4 py-2 text-center">
                                  Return
                                </th>
                                <th className="px-4 py-2 text-center">Days</th>
                                <th className="px-4 py-2 text-center">Qty</th>
                                <th className="px-4 py-2 text-right">
                                  Rate/Day
                                </th>
                                <th className="px-4 py-2 text-right">Total</th>
                                <th className="px-4 py-2 text-center">
                                  Status
                                </th>
                                {isEditing &&
                        <th className="px-4 py-2 text-center">
                                    Action
                                  </th>
                        }
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {bill.items.map((item, idx) => {
                        const unitPrice =
                        item.product.rentPricePerDay || 0;
                        let days = item.rentalDays || 1;
                        if (
                        item.status === 'returned' &&
                        item.actualReturnDate &&
                        item.borrowedDate)
                        {
                          const start = new Date(item.borrowedDate);
                          const end = new Date(item.actualReturnDate);
                          days = Math.max(
                            1,
                            Math.ceil(
                              Math.abs(
                                end.getTime() - start.getTime()
                              ) / (
                              1000 * 60 * 60 * 24)
                            )
                          );
                        } else if (
                        item.status === 'active' &&
                        item.borrowedDate)
                        {
                          const start = new Date(item.borrowedDate);
                          const now = new Date();
                          days = Math.max(
                            1,
                            Math.ceil(
                              Math.abs(
                                now.getTime() - start.getTime()
                              ) / (
                              1000 * 60 * 60 * 24)
                            )
                          );
                        }
                        const lineTotal =
                        item.rentalFee !== undefined ?
                        item.rentalFee :
                        unitPrice * item.quantity * days;
                        return (
                          <tr
                            key={idx}
                            className={
                            item.status === 'returned' ?
                            'bg-green-50/50' :
                            ''
                            }>
                            
                                    <td className="px-4 py-2.5">
                                      <div className="flex items-center gap-2">
                                        <span
                                  className={`w-2 h-2 rounded-full flex-shrink-0 ${item.status === 'returned' ? 'bg-green-500' : 'bg-blue-500'}`} />
                                
                                        <span className="font-medium text-[#1a1a2e]">
                                          {item.product.name}
                                        </span>
                                        <span className="text-[10px] font-mono text-gray-400">
                                          {item.product.itemCode ||
                                  item.product.barcode ||
                                  ''}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-2.5 text-center text-xs text-gray-600">
                                      {item.borrowedDate || bill.date}
                                    </td>
                                    <td className="px-4 py-2.5 text-center text-xs">
                                      {item.status === 'returned' ?
                              <span className="text-green-600 font-medium">
                                          {item.actualReturnDate}
                                        </span> :

                              <span className="text-gray-500">
                                          {item.expectedReturnDate || '-'}
                                        </span>
                              }
                                    </td>
                                    <td className="px-4 py-2.5 text-center font-medium">
                                      {days}
                                    </td>
                                    <td className="px-4 py-2.5 text-center font-medium">
                                      {item.quantity}
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-gray-600">
                                      {formatPrice(unitPrice)}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-bold text-[#1a1a2e]">
                                      {formatPrice(lineTotal)}
                                    </td>
                                    <td className="px-4 py-2.5 text-center text-xs">
                                      {item.status === 'returned' ?
                              <span className="text-green-600 font-medium">
                                          Returned
                                        </span> :

                              <span className="text-blue-600 font-medium">
                                          Active
                                        </span>
                              }
                                    </td>
                                    {isEditing &&
                            <td className="px-4 py-2.5 text-center">
                                        {item.status === 'active' &&
                              <button
                                onClick={() => {
                                  const now = new Date();
                                  setReturnSingleItemModal({
                                    bill,
                                    itemIndex: idx,
                                    returnDate: now.
                                    toISOString().
                                    split('T')[0],
                                    returnTime: now.
                                    toTimeString().
                                    slice(0, 5),
                                    fines: []
                                  });
                                  setActionError(null);
                                }}
                                className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-md hover:bg-blue-200 transition-colors">
                                
                                            <RotateCcw className="w-3 h-3 inline mr-1" />
                                            Return
                                          </button>
                              }
                                      </td>
                            }
                                  </tr>);

                      })}
                            </tbody>
                          </table>
                        </div>

                        {/* Edit Controls */}
                        <AnimatePresence>
                          {isEditing &&
                  <motion.div
                    initial={{
                      height: 0,
                      opacity: 0
                    }}
                    animate={{
                      height: 'auto',
                      opacity: 1
                    }}
                    exit={{
                      height: 0,
                      opacity: 0
                    }}
                    className="overflow-hidden">
                    
                              <div className="p-4 border-t border-blue-100 bg-blue-50/30">
                                {bill.rentalStatus !== 'closed' ?
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Add Deposit */}
                                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                                      <h4 className="font-bold text-xs text-gray-700 mb-2 flex items-center gap-1.5">
                                        <Banknote className="w-4 h-4 text-green-600" />
                                        Add Deposit
                                      </h4>
                                      {actionError &&
                          editingBillId === bill.id &&
                          <div className="mb-2 bg-red-50 border border-red-200 rounded p-2 flex items-start gap-1.5 text-xs text-red-700">
                                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                            <span>{actionError}</span>
                                          </div>
                          }
                                      <div className="flex gap-2">
                                        <input
                              type="number"
                              value={newDepositAmount}
                              onChange={(e) =>
                              setNewDepositAmount(e.target.value)
                              }
                              placeholder="Amount"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#f5a623] outline-none" />
                            
                                        <button
                              onClick={() => handleAddDeposit(bill)}
                              disabled={
                              actionLoading ===
                              `deposit-${bill.id}`
                              }
                              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5">
                              
                                          {actionLoading ===
                              `deposit-${bill.id}` &&
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              }
                                          {actionLoading ===
                              `deposit-${bill.id}` ?
                              'Adding...' :
                              'Add'}
                                        </button>
                                      </div>
                                      {bill.depositHistory &&
                          bill.depositHistory.length > 0 &&
                          <div className="mt-2 space-y-1">
                                            {bill.depositHistory.map((d, i) =>
                            <div
                              key={i}
                              className="flex justify-between text-xs text-gray-500">
                              
                                                <span>
                                                  {d.date}{' '}
                                                  {d.note && `· ${d.note}`}
                                                </span>
                                                <span className="font-mono font-medium">
                                                  {formatPrice(d.amount)}
                                                </span>
                                              </div>
                            )}
                                          </div>
                          }
                                    </div>

                                    {/* Add Item - opens modal */}
                                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                                      <h4 className="font-bold text-xs text-gray-700 mb-2 flex items-center gap-1.5">
                                        <Plus className="w-4 h-4 text-blue-600" />
                                        Add Rental Item
                                      </h4>
                                      <button
                            onClick={() => {
                              setAddItemModalBillId(bill.id);
                              setProductSearch('');
                            }}
                            className="w-full px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors">
                            
                                        <Plus className="w-4 h-4" />
                                        Select Product
                                      </button>
                                    </div>
                                  </div> :

                      <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
                                    <p className="text-sm text-gray-500 font-medium flex items-center justify-center gap-2">
                                      <CheckCircle className="w-4 h-4 text-green-500" />
                                      This bill is closed. You cannot add
                                      deposits or rental items.
                                    </p>
                                  </div>
                      }
                              </div>
                            </motion.div>
                  }
                        </AnimatePresence>
                      </div>);

          })
          }
              </div>

        }
        </div>
      }

      {/* Sale History Tab */}
      {activeTab === 'sales' &&
      <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Total Sales</p>
                <p className="text-2xl font-bold text-[#2d4059]">
                  {filteredSaleBills.length}
                </p>
              </div>
              <div className="bg-orange-100 p-2.5 rounded-full">
                <Package className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Items Sold</p>
                <p className="text-2xl font-bold text-[#2d4059]">
                  {filteredSaleBills.reduce(
                  (s, b) => s + b.items.reduce((a, i) => a + i.quantity, 0),
                  0
                )}
                </p>
              </div>
              <div className="bg-blue-100 p-2.5 rounded-full">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatPrice(
                  filteredSaleBills.reduce((sum, b) => sum + b.total, 0)
                )}
                </p>
              </div>
              <div className="bg-green-100 p-2.5 rounded-full">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          {/* Loading */}
          {salesLoading && saleBills.length === 0 &&
        <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-[#f5a623] animate-spin" />
              <span className="ml-3 text-gray-500 font-medium">
                Loading sales...
              </span>
            </div>
        }

          {/* Error */}
          {salesError && !salesLoading &&
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8 text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-700 font-medium mb-3">{salesError}</p>
              <button
            onClick={() => refetchSales()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors">
            
                Retry
              </button>
            </div>
        }

          {!salesLoading && !salesError && saleBills.length === 0 ?
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No sale bills found</p>
              <p className="text-gray-400 text-sm mt-1">
                Create a sale order from the catalog to see it here.
              </p>
            </div> :

        !salesLoading &&
        !salesError &&
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3">Invoice</th>
                        <th className="px-6 py-3">Items</th>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Payment</th>
                        <th className="px-6 py-3 text-right">Total</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {saleBills.map((bill) => {
                  const hasReturnableItems = bill.items.some(
                    (item) =>
                    item.quantity - (item.returnedQuantity || 0) > 0
                  );
                  return (
                    <tr
                      key={bill.id}
                      className="hover:bg-gray-50 transition-colors">
                      
                            <td className="px-6 py-4 font-mono text-sm font-bold text-[#1a1a2e]">
                              {bill.id}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-0.5">
                                {bill.items.slice(0, 2).map((item, i) =>
                          <span
                            key={i}
                            className="text-xs text-gray-600">
                            
                                    {item.product.name} ×{item.quantity}
                                    {(item.returnedQuantity || 0) > 0 &&
                            <span className="ml-1 text-orange-500 font-medium">
                                        ({item.returnedQuantity} returned)
                                      </span>
                            }
                                  </span>
                          )}
                                {bill.items.length > 2 &&
                          <span className="text-xs text-gray-400">
                                    +{bill.items.length - 2} more
                                  </span>
                          }
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center text-gray-600 text-sm">
                                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                {bill.date}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs font-bold px-2 py-1 rounded bg-gray-100 text-gray-700 uppercase">
                                {bill.paymentMethod === 'card' ?
                          'Card' :
                          bill.paymentMethod === 'bank_transfer' ?
                          'Transfer' :
                          'Cash'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-[#1a1a2e]">
                              {formatPrice(bill.total)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center gap-2 justify-end">
                                {hasReturnableItems &&
                          <button
                            onClick={() => openReturnModal(bill)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-xs font-bold hover:bg-orange-200 transition-colors">
                            
                                    <Undo2 className="w-3.5 h-3.5" />
                                    Return
                                  </button>
                          }
                                <button
                            onClick={() => onViewBill(bill)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a2e] text-white rounded-lg text-xs font-bold hover:bg-[#2d4059] transition-colors">
                            
                                  <Eye className="w-3.5 h-3.5" />
                                  View
                                </button>
                              </div>
                            </td>
                          </tr>);

                })}
                    </tbody>
                  </table>
                </div>
              </div>

        }
        </div>
      }

      {/* Add Product Modal */}
      <AnimatePresence>
        {addItemModalBillId && modalBill &&
        <motion.div
          initial={{
            opacity: 0
          }}
          animate={{
            opacity: 1
          }}
          exit={{
            opacity: 0
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => resetAddItemModal()}>
          
            <motion.div
            initial={{
              scale: 0.95,
              opacity: 0
            }}
            animate={{
              scale: 1,
              opacity: 1
            }}
            exit={{
              scale: 0.95,
              opacity: 0
            }}
            transition={{
              duration: 0.15
            }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div>
                  <h3 className="font-bold text-lg text-[#1a1a2e]">
                    {selectedProductForAdd ?
                  'Set Return Date' :
                  'Add Rental Item'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Bill: {modalBill.id} · {modalBill.customer.name}
                  </p>
                </div>
                <button
                onClick={() => resetAddItemModal()}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Step 2: Set return date for selected product */}
              {selectedProductForAdd ?
            <>
                  <div className="p-5 space-y-5 overflow-y-auto flex-1">
                    {/* Selected product info */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="font-bold text-[#1a1a2e] text-base">
                        {selectedProductForAdd.name}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="font-mono">
                          {selectedProductForAdd.itemCode}
                        </span>
                        <span>·</span>
                        <span>{selectedProductForAdd.category}</span>
                        <span>·</span>
                        <span className="font-bold text-[#1a1a2e]">
                          {formatPrice(
                        selectedProductForAdd.rentPricePerDay || 0
                      )}
                          /day
                        </span>
                      </div>
                    </div>

                    {/* Date fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Start Date
                        </label>
                        <input
                      type="date"
                      value={new Date().toISOString().split('T')[0]}
                      disabled
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500" />
                    
                        <p className="text-[10px] text-gray-400 mt-1">
                          Today (auto)
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Expected Return Date
                        </label>
                        <input
                      type="date"
                      value={newItemReturnDate}
                      onChange={(e) => setNewItemReturnDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f5a623] outline-none"
                      autoFocus />
                    
                      </div>
                    </div>

                    {/* Days preview */}
                    {newItemReturnDate &&
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-blue-700 font-medium">
                            Rental Days:
                          </span>
                          <span className="font-bold text-blue-800">
                            {Math.max(
                        1,
                        Math.ceil(
                          Math.abs(
                            new Date(newItemReturnDate).getTime() -
                            new Date().getTime()
                          ) / (
                          1000 * 60 * 60 * 24)
                        )
                      )}{' '}
                            days
                          </span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-blue-700 font-medium">
                            Estimated Cost:
                          </span>
                          <span className="font-bold text-blue-800">
                            {formatPrice(
                        (selectedProductForAdd.rentPricePerDay || 0) *
                        Math.max(
                          1,
                          Math.ceil(
                            Math.abs(
                              new Date(newItemReturnDate).getTime() -
                              new Date().getTime()
                            ) / (
                            1000 * 60 * 60 * 24)
                          )
                        )
                      )}
                          </span>
                        </div>
                      </div>
                }

                    {/* Machine number or Quantity selection */}
                    <div>
                      {selectedProductForAdd.isStockTracked === false ||
                  !machinesLoading &&
                  !machinesError &&
                  availableMachines.length === 0 &&
                  rentedOutMachines.length === 0 &&
                  damagedMachines.length === 0 ?
                  <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1.5">
                            Quantity
                          </label>
                          <input
                      type="number"
                      min="1"
                      max={selectedProductForAdd.stock}
                      value={manualQuantity}
                      onChange={(e) =>
                      setManualQuantity(parseInt(e.target.value) || 1)
                      }
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f5a623] outline-none" />
                    
                          <p className="text-xs text-gray-500 mt-1">
                            Available stock: {selectedProductForAdd.stock}
                          </p>
                          {selectedProductForAdd.stock != null &&
                    selectedProductForAdd.stock <= 0 &&
                    <div className="mt-3 bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                This product is out of stock and cannot be
                                added.
                              </div>
                    }
                        </div> :

                  <>
                          <label className="block text-xs font-bold text-gray-700 mb-2">
                            Select Machine Numbers
                          </label>
                          {machinesLoading ?
                    <div className="flex items-center justify-center gap-2 py-6 text-gray-400">
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span className="text-sm font-medium">
                                Loading available machines...
                              </span>
                            </div> :
                    machinesError ?
                    <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              {machinesError}
                            </div> :

                    <>
                              {availableMachines.length === 0 && (
                      rentedOutMachines.length > 0 ||
                      damagedMachines.length > 0) &&
                      <div className="mb-3 bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    All machines are currently rented out or
                                    damaged.
                                  </div>
                      }
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-[10px] text-gray-400 uppercase font-bold">
                                  Click a number to select
                                </p>
                                <div className="relative w-1/2">
                                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                                  <input
                            type="text"
                            placeholder="Search machine..."
                            value={machineSearch}
                            onChange={(e) =>
                            setMachineSearch(e.target.value)
                            }
                            className="w-full pl-7 pr-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-[#f5a623] outline-none" />
                          
                                </div>
                              </div>
                              <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto pr-1">
                                {[
                        ...availableMachines,
                        ...rentedOutMachines,
                        ...damagedMachines].

                        sort().
                        filter((m) =>
                        m.
                        toLowerCase().
                        includes(machineSearch.toLowerCase())
                        ).
                        map((machine) => {
                          const isRentedOut =
                          rentedOutMachines.includes(machine);
                          const isDamaged =
                          damagedMachines.includes(machine);
                          const isUnavailable =
                          isRentedOut || isDamaged;
                          const isSelected =
                          selectedMachines.includes(machine);
                          return (
                            <button
                              key={machine}
                              type="button"
                              disabled={isUnavailable}
                              onClick={() =>
                              !isUnavailable &&
                              toggleAddItemMachine(machine)
                              }
                              className={`relative px-2 py-2.5 rounded-lg text-sm font-mono font-bold border-2 transition-colors ${isDamaged ? 'bg-red-50 border-red-200 text-red-500 cursor-not-allowed opacity-60' : isRentedOut ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-60' : isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-[#1a1a2e] hover:border-blue-400 hover:bg-blue-50'}`}>
                              
                                        {machine}
                                        {isSelected &&
                              <CheckCircle className="w-3.5 h-3.5 absolute top-1 right-1" />
                              }
                                      </button>);

                        })}
                              </div>
                              <p className="text-xs text-gray-500 mt-2">
                                <span className="font-bold text-[#1a1a2e]">
                                  {selectedMachines.length}
                                </span>{' '}
                                selected · Quantity will be set to{' '}
                                {selectedMachines.length || 0}
                              </p>
                            </>
                    }
                        </>
                  }
                    </div>

                    {addItemError &&
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        {addItemError}
                      </div>
                }
                  </div>

                  {/* Actions */}
                  <div className="p-4 border-t border-gray-200 flex gap-3 bg-gray-50">
                    <button
                  onClick={() => {
                    setSelectedProductForAdd(null);
                    setNewItemReturnDate('');
                    setAvailableMachines([]);
                    setSelectedMachines([]);
                    setMachineSearch('');
                    setMachinesError(null);
                    setAddItemError(null);
                  }}
                  disabled={addItemLoading}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 disabled:opacity-50 transition-colors">
                  
                      Back
                    </button>
                    <button
                  onClick={() =>
                  handleAddItem(modalBill, selectedProductForAdd)
                  }
                  disabled={
                  !newItemReturnDate ||
                  machinesLoading ||
                  selectedProductForAdd.isStockTracked !== false &&
                  availableMachines.length > 0 &&
                  selectedMachines.length === 0 ||
                  (selectedProductForAdd.isStockTracked === false ||
                  availableMachines.length === 0) &&
                  manualQuantity <= 0 ||
                  // All machines rented out or damaged (machine-tracked product)
                  selectedProductForAdd.isStockTracked !== false &&
                  !machinesLoading &&
                  availableMachines.length === 0 && (
                  rentedOutMachines.length > 0 ||
                  damagedMachines.length > 0) ||
                  // Out of stock (non-machine product)
                  (selectedProductForAdd.isStockTracked === false ||
                  !machinesLoading &&
                  availableMachines.length === 0 &&
                  rentedOutMachines.length === 0 &&
                  damagedMachines.length === 0) &&
                  selectedProductForAdd.stock != null &&
                  selectedProductForAdd.stock <= 0 ||
                  addItemLoading
                  }
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                  
                      {addItemLoading ?
                  <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Adding...
                        </> :

                  <>
                          <Plus className="w-4 h-4" />
                          Add to Bill
                        </>
                  }
                    </button>
                  </div>
                </> :

            <>
                  {/* Step 1: Search and select product */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                    ref={modalSearchRef}
                    type="text"
                    placeholder="Search by name or item code..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f5a623] outline-none" />
                  
                    </div>
                  </div>

                  <div className="overflow-y-auto flex-1">
                    {filteredProducts.length === 0 ?
                <div className="p-8 text-center text-gray-400">
                        <p className="font-medium">No rental products found</p>
                      </div> :

                filteredProducts.map((p) =>
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProductForAdd(p);
                    setAddItemError(null);
                    // Default to tomorrow
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    setNewItemReturnDate(
                      tomorrow.toISOString().split('T')[0]
                    );
                    // Fetch available machine numbers for this product
                    fetchAvailableMachines(p);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-[#f5a623]/10 border-b border-gray-50 last:border-0 flex items-center justify-between transition-colors">
                  
                          <div>
                            <p className="font-bold text-[#1a1a2e]">{p.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs font-mono text-gray-400">
                                {p.itemCode}
                              </span>
                              <span>·</span>
                              <span className="text-xs text-gray-400">·</span>
                              <span className="text-xs text-gray-500">
                                {p.category}
                              </span>
                              <span className="text-xs text-gray-400">·</span>
                              <span className="text-xs text-gray-500">
                                Stock: {p.stock}
                              </span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-4">
                            <p className="font-bold text-[#1a1a2e]">
                              {formatPrice(p.rentPricePerDay || 0)}
                            </p>
                            <p className="text-[10px] text-gray-400">per day</p>
                          </div>
                        </button>
                )
                }
                  </div>
                </>
            }
            </motion.div>
          </motion.div>
        }
      </AnimatePresence>

      {/* Sale Return Modal */}
      <AnimatePresence>
        {returnModalBill &&
        <motion.div
          initial={{
            opacity: 0
          }}
          animate={{
            opacity: 1
          }}
          exit={{
            opacity: 0
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeReturnModal}>
          
            <motion.div
            initial={{
              scale: 0.95,
              opacity: 0
            }}
            animate={{
              scale: 1,
              opacity: 1
            }}
            exit={{
              scale: 0.95,
              opacity: 0
            }}
            transition={{
              duration: 0.15
            }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            
              {/* Modal Header */}
              <div className="p-4 border-b border-gray-200 bg-orange-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-orange-100 p-1.5 rounded-lg">
                      <Undo2 className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-[#1a1a2e]">
                        Return Items
                      </h3>
                      <p className="text-xs text-gray-500">
                        {returnModalBill.id} · {returnModalBill.date}
                      </p>
                    </div>
                  </div>
                  <button
                  onClick={closeReturnModal}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Success State */}
              {returnSuccess ?
            <div className="p-6 text-center">
                  <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h4 className="text-lg font-bold text-[#1a1a2e] mb-2">
                    Items Returned Successfully
                  </h4>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 inline-block">
                    <p className="text-sm text-green-700 font-medium">
                      Refund Amount
                    </p>
                    <p className="text-2xl font-bold text-green-700">
                      {formatPrice(returnSuccess.refundAmount)}
                    </p>
                  </div>
                  <div>
                    <button
                  onClick={closeReturnModal}
                  className="px-6 py-2.5 bg-[#1a1a2e] text-white rounded-lg font-bold hover:bg-[#2d4059] transition-colors">
                  
                      Done
                    </button>
                  </div>
                </div> :

            <>
                  {/* Items List */}
                  <div className="overflow-y-auto flex-1 p-4 space-y-3">
                    {returnError &&
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-sm text-red-700">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{returnError}</span>
                      </div>
                }

                    {returnModalBill.items.map((item) => {
                  const remaining =
                  item.quantity - (item.returnedQuantity || 0);
                  const itemId = item.apiItemId;
                  if (!itemId || remaining <= 0) return null;
                  const currentReturnQty = returnQuantities[itemId] || 0;
                  return (
                    <div
                      key={itemId}
                      className={`border rounded-lg p-4 transition-colors ${currentReturnQty > 0 ? 'border-orange-300 bg-orange-50/50' : 'border-gray-200 bg-white'}`}>
                      
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-[#1a1a2e] text-sm">
                                {item.product.name}
                              </p>
                              <p className="text-xs text-gray-400 font-mono mt-0.5">
                                {item.product.itemCode || '—'}
                              </p>
                              <div className="flex items-center gap-3 mt-2 text-xs">
                                <span className="text-gray-500">
                                  Purchased:{' '}
                                  <span className="font-bold text-[#1a1a2e]">
                                    {item.quantity}
                                  </span>
                                </span>
                                {(item.returnedQuantity || 0) > 0 &&
                            <span className="text-orange-600">
                                    Already returned:{' '}
                                    <span className="font-bold">
                                      {item.returnedQuantity}
                                    </span>
                                  </span>
                            }
                                <span className="text-blue-600">
                                  Remaining:{' '}
                                  <span className="font-bold">{remaining}</span>
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Unit price:{' '}
                                {formatPrice(item.product.salePrice)}
                              </p>
                            </div>
                            <div className="flex-shrink-0">
                              <label className="block text-[10px] font-bold text-gray-500 mb-1 text-center">
                                Return Qty
                              </label>
                              <div className="flex items-center gap-1">
                                <button
                              onClick={() => {
                                setReturnQuantities((prev) => ({
                                  ...prev,
                                  [itemId]: Math.max(
                                    0,
                                    (prev[itemId] || 0) - 1
                                  )
                                }));
                              }}
                              disabled={currentReturnQty <= 0}
                              className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold">
                              
                                  −
                                </button>
                                <input
                              type="number"
                              min="0"
                              max={remaining}
                              value={currentReturnQty}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setReturnQuantities((prev) => ({
                                  ...prev,
                                  [itemId]: isNaN(val) ?
                                  0 :
                                  Math.min(remaining, Math.max(0, val))
                                }));
                              }}
                              className="w-12 h-8 text-center border border-gray-300 rounded-md text-sm font-bold focus:ring-2 focus:ring-orange-400 outline-none" />
                            
                                <button
                              onClick={() => {
                                setReturnQuantities((prev) => ({
                                  ...prev,
                                  [itemId]: Math.min(
                                    remaining,
                                    (prev[itemId] || 0) + 1
                                  )
                                }));
                              }}
                              disabled={currentReturnQty >= remaining}
                              className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold">
                              
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>);

                })}

                    {/* Show message if all items already returned */}
                    {returnModalBill.items.every(
                  (item) =>
                  item.quantity - (item.returnedQuantity || 0) <= 0 ||
                  !item.apiItemId
                ) &&
                <div className="text-center py-8 text-gray-400">
                        <Undo2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="font-medium">
                          All items have been returned
                        </p>
                      </div>
                }
                  </div>

                  {/* Footer */}
                  <div className="p-4 border-t border-gray-200 bg-gray-50">
                    {(() => {
                  const totalReturning = Object.values(
                    returnQuantities
                  ).reduce((sum, qty) => sum + qty, 0);
                  return (
                    <>
                          <div className="flex items-center justify-between mb-3 text-sm">
                            <span className="text-gray-600">
                              Items to return:{' '}
                              <span className="font-bold text-[#1a1a2e]">
                                {totalReturning}
                              </span>
                            </span>
                          </div>
                          <div className="flex gap-3">
                            <button
                          onClick={closeReturnModal}
                          className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors">
                          
                              Cancel
                            </button>
                            <button
                          onClick={() => {
                            handleSaleReturn();
                          }}
                          disabled={totalReturning === 0 || returnLoading}
                          className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                          
                              {returnLoading ?
                          <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Processing...
                                </> :

                          <>
                                  <Undo2 className="w-4 h-4" />
                                  Return Items
                                </>
                          }
                            </button>
                          </div>
                        </>);

                })()}
                  </div>
                </>
            }
            </motion.div>
          </motion.div>
        }
      </AnimatePresence>

      {/* Rental Return All Confirmation Modal */}
      <AnimatePresence>
        {returnAllConfirmBill &&
        <motion.div
          initial={{
            opacity: 0
          }}
          animate={{
            opacity: 1
          }}
          exit={{
            opacity: 0
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            setReturnAllConfirmBill(null);
            setReturnPaymentAmount('');
            setReturnFines([]);
          }}>
          
            <motion.div
            initial={{
              scale: 0.95,
              opacity: 0
            }}
            animate={{
              scale: 1,
              opacity: 1
            }}
            exit={{
              scale: 0.95,
              opacity: 0
            }}
            transition={{
              duration: 0.15
            }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}>
            
              <div className="p-4 border-b border-gray-200 bg-amber-50 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="bg-amber-100 p-1.5 rounded-lg">
                    <RotateCcw className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-[#1a1a2e]">
                      Return All Items
                    </h3>
                    <p className="text-xs text-gray-500">
                      {returnAllConfirmBill.id} ·{' '}
                      {returnAllConfirmBill.customer.name}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* Items summary */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                  {returnAllConfirmBill.items.
                filter((i) => i.status === 'active').
                map((item, i) =>
                <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-700">
                          {item.product.name} ×{item.quantity}
                        </span>
                        <span className="font-medium text-gray-500">
                          {formatPrice(item.product.rentPricePerDay || 0)}/day
                        </span>
                      </div>
                )}
                  <div className="border-t border-gray-200 pt-1.5 mt-1.5 flex justify-between text-sm font-bold">
                    <span>Active items</span>
                    <span>
                      {
                    returnAllConfirmBill.items.filter(
                      (i) => i.status === 'active'
                    ).length
                    }
                    </span>
                  </div>
                </div>

                {/* Balance info */}
                {(() => {
                const totalDeposit =
                returnAllConfirmBill.depositHistory?.reduce(
                  (s, d) => s + d.amount,
                  0
                ) ||
                returnAllConfirmBill.deposit ||
                0;
                const totalFinesPreview = returnFines.reduce(
                  (sum, f) => sum + (parseFloat(f.fine) || 0),
                  0
                );
                const totalOwed =
                returnAllConfirmBill.total + totalFinesPreview;
                const balance = totalDeposit - totalOwed;
                return (
                  <div
                    className={`rounded-lg p-3 text-sm ${balance < 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                    
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-600">Rental Fee</span>
                        <span className="font-bold">
                          {formatPrice(returnAllConfirmBill.total)}
                        </span>
                      </div>
                      {totalFinesPreview > 0 &&
                    <div className="flex justify-between mb-1">
                          <span className="text-orange-600 flex items-center gap-1">
                            <Wrench className="w-3 h-3" />
                            Damage Fines
                          </span>
                          <span className="font-bold text-orange-600">
                            +{formatPrice(totalFinesPreview)}
                          </span>
                        </div>
                    }
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-600">Total Deposit</span>
                        <span className="font-bold">
                          {formatPrice(totalDeposit)}
                        </span>
                      </div>
                      <div
                      className={`flex justify-between font-bold border-t pt-1 mt-1 ${balance < 0 ? 'text-red-700 border-red-200' : 'text-green-700 border-green-200'}`}>
                      
                        <span>
                          {balance >= 0 ?
                        'Refund to Customer' :
                        'Customer Owes'}
                        </span>
                        <span>{formatPrice(Math.abs(balance))}</span>
                      </div>
                    </div>);

              })()}

                {/* Damage Fines Section */}
                <div className="bg-white rounded-lg border border-orange-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-xs text-gray-700 flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-orange-500" />
                      Damage Fines
                      <span className="text-gray-400 font-normal">
                        (optional)
                      </span>
                    </h4>
                    <button
                    onClick={() =>
                    setReturnFines((prev) => [
                    ...prev,
                    {
                      reason: '',
                      fine: ''
                    }]
                    )
                    }
                    className="flex items-center gap-1 text-xs px-2 py-1 bg-orange-50 text-orange-600 border border-orange-200 rounded-md hover:bg-orange-100 transition-colors font-bold">
                    
                      <Plus className="w-3 h-3" />
                      Add Fine
                    </button>
                  </div>

                  {returnFines.length === 0 ?
                <p className="text-[11px] text-gray-400 italic text-center py-2">
                      No fines — click "Add Fine" if items are damaged
                    </p> :

                <div className="space-y-2">
                      {returnFines.map((fine, idx) =>
                  <div key={idx} className="flex items-start gap-2">
                          <div className="flex-1 space-y-1">
                            <input
                        type="text"
                        value={fine.reason}
                        onChange={(e) =>
                        setReturnFines((prev) =>
                        prev.map((f, i) =>
                        i === idx ?
                        {
                          ...f,
                          reason: e.target.value
                        } :
                        f
                        )
                        )
                        }
                        placeholder="Damage description (e.g. Motor seized)"
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-orange-400 outline-none" />
                      
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">
                                Rs.
                              </span>
                              <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={fine.fine}
                          onChange={(e) =>
                          setReturnFines((prev) =>
                          prev.map((f, i) =>
                          i === idx ?
                          {
                            ...f,
                            fine: e.target.value
                          } :
                          f
                          )
                          )
                          }
                          placeholder="Fine amount"
                          className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-md text-xs font-bold focus:ring-2 focus:ring-orange-400 outline-none" />
                        
                            </div>
                          </div>
                          <button
                      onClick={() =>
                      setReturnFines((prev) =>
                      prev.filter((_, i) => i !== idx)
                      )
                      }
                      className="mt-1 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                      
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                  )}
                      {returnFines.some((f) => parseFloat(f.fine) > 0) &&
                  <div className="flex justify-between text-xs font-bold text-orange-700 bg-orange-50 rounded-md px-2.5 py-1.5 border border-orange-200 mt-1">
                          <span>Total Fines</span>
                          <span>
                            {formatPrice(
                        returnFines.reduce(
                          (sum, f) => sum + (parseFloat(f.fine) || 0),
                          0
                        )
                      )}
                          </span>
                        </div>
                  }
                    </div>
                }
                </div>

                {/* Payment input — shown when customer owes money */}
                {(() => {
                const totalDeposit =
                returnAllConfirmBill.depositHistory?.reduce(
                  (s, d) => s + d.amount,
                  0
                ) ||
                returnAllConfirmBill.deposit ||
                0;
                const totalFinesPreview = returnFines.reduce(
                  (sum, f) => sum + (parseFloat(f.fine) || 0),
                  0
                );
                const totalOwed =
                returnAllConfirmBill.total + totalFinesPreview;
                const balance = totalDeposit - totalOwed;
                if (balance >= 0) return null;
                return (
                  <div className="bg-white rounded-lg border border-gray-200 p-3">
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                        <Banknote className="w-3.5 h-3.5 text-green-600" />
                        Payment from Customer
                        <span className="text-gray-400 font-normal">
                          (optional)
                        </span>
                      </label>
                      <p className="text-[10px] text-gray-500 mb-2">
                        Customer owes {formatPrice(Math.abs(balance))}. Enter
                        amount they're paying now.
                      </p>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">
                          Rs.
                        </span>
                        <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={returnPaymentAmount}
                        onChange={(e) =>
                        setReturnPaymentAmount(e.target.value)
                        }
                        placeholder="0.00"
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm font-bold text-right focus:ring-2 focus:ring-amber-400 outline-none" />
                      
                      </div>
                    </div>);

              })()}

                {actionError &&
              <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-start gap-1.5 text-xs text-red-700">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{actionError}</span>
                  </div>
              }
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-3 flex-shrink-0">
                <button
                onClick={() => {
                  setReturnAllConfirmBill(null);
                  setReturnFines([]);
                  setActionError(null);
                }}
                className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors">
                
                  Cancel
                </button>
                <button
                onClick={() => {
                  handleReturnAllItems(returnAllConfirmBill);
                }}
                disabled={
                actionLoading === `return-all-${returnAllConfirmBill.id}`
                }
                className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                
                  {actionLoading === `return-all-${returnAllConfirmBill.id}` ?
                <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </> :

                <>
                      <RotateCcw className="w-4 h-4" />
                      Confirm Return
                    </>
                }
                </button>
              </div>
            </motion.div>
          </motion.div>
        }
      </AnimatePresence>

      {/* Rental Return Result Modal */}
      <AnimatePresence>
        {rentalReturnResult &&
        <motion.div
          initial={{
            opacity: 0
          }}
          animate={{
            opacity: 1
          }}
          exit={{
            opacity: 0
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setRentalReturnResult(null)}>
          
            <motion.div
            initial={{
              scale: 0.95,
              opacity: 0
            }}
            animate={{
              scale: 1,
              opacity: 1
            }}
            exit={{
              scale: 0.95,
              opacity: 0
            }}
            transition={{
              duration: 0.15
            }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            
              <div className="p-6 text-center">
                <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${rentalReturnResult.refundAmount >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                
                  {rentalReturnResult.refundAmount >= 0 ?
                <CheckCircle className="w-8 h-8 text-green-600" /> :

                <AlertTriangle className="w-8 h-8 text-red-600" />
                }
                </div>
                <h4 className="text-lg font-bold text-[#1a1a2e] mb-1">
                  Items Returned
                </h4>
                <p className="text-xs text-gray-500 mb-4">
                  Bill: {rentalReturnResult.billId}
                </p>

                <div className="space-y-2 mb-5">
                  <div className="bg-gray-50 rounded-lg p-3 flex justify-between text-sm">
                    <span className="text-gray-600">Rental Fee</span>
                    <span className="font-bold text-[#1a1a2e]">
                      {formatPrice(rentalReturnResult.totalRentalFee)}
                    </span>
                  </div>

                  {rentalReturnResult.totalFines > 0 &&
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex justify-between text-sm">
                      <span className="text-orange-700 font-medium flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5" />
                        Damage Fines
                      </span>
                      <span className="font-bold text-orange-700">
                        {formatPrice(rentalReturnResult.totalFines)}
                      </span>
                    </div>
                }

                  {rentalReturnResult.paymentProcessed > 0 &&
                <div className="bg-blue-50 rounded-lg p-3 flex justify-between text-sm">
                      <span className="text-blue-700">Payment Received</span>
                      <span className="font-bold text-blue-700">
                        {formatPrice(rentalReturnResult.paymentProcessed)}
                      </span>
                    </div>
                }

                  <div
                  className={`rounded-lg p-3 flex justify-between text-sm ${rentalReturnResult.refundAmount >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  
                    <span
                    className={`font-medium ${rentalReturnResult.refundAmount >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    
                      {rentalReturnResult.refundAmount >= 0 ?
                    'Refund to Customer' :
                    'Customer Owes'}
                    </span>
                    <span
                    className={`text-lg font-bold ${rentalReturnResult.refundAmount >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    
                      {formatPrice(Math.abs(rentalReturnResult.refundAmount))}
                    </span>
                  </div>

                  {rentalReturnResult.totalFines > 0 &&
                <div className="bg-orange-50 border border-orange-100 rounded-lg p-2.5 text-xs text-orange-700 text-left">
                      <p className="font-bold mb-0.5">⚠ Fines are separate</p>
                      <p className="text-orange-600">
                        Collect {formatPrice(rentalReturnResult.totalFines)} in
                        damage fines directly from the customer.
                      </p>
                    </div>
                }
                </div>

                {rentalReturnResult.allReturned &&
              <p className="text-xs text-green-600 font-medium mb-4">
                    ✓ All items in this bill have been returned
                  </p>
              }

                <button
                onClick={() => setRentalReturnResult(null)}
                className="w-full px-6 py-2.5 bg-[#1a1a2e] text-white rounded-lg font-bold hover:bg-[#2d4059] transition-colors">
                
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        }
      </AnimatePresence>

      {/* Return Single Item Modal */}
      <AnimatePresence>
        {returnSingleItemModal &&
        <motion.div
          initial={{
            opacity: 0
          }}
          animate={{
            opacity: 1
          }}
          exit={{
            opacity: 0
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            setReturnSingleItemModal(null);
            setActionError(null);
          }}>
          
            <motion.div
            initial={{
              scale: 0.95,
              opacity: 0
            }}
            animate={{
              scale: 1,
              opacity: 1
            }}
            exit={{
              scale: 0.95,
              opacity: 0
            }}
            transition={{
              duration: 0.15
            }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}>
            
              {/* Header */}
              <div className="p-4 border-b border-gray-200 bg-blue-50 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-100 p-1.5 rounded-lg">
                      <RotateCcw className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-[#1a1a2e]">
                        Return Item
                      </h3>
                      <p className="text-xs text-gray-500">
                        {returnSingleItemModal.bill.id} ·{' '}
                        {
                      returnSingleItemModal.bill.items[
                      returnSingleItemModal.itemIndex].
                      product.name
                      }
                      </p>
                    </div>
                  </div>
                  <button
                  onClick={() => {
                    setReturnSingleItemModal(null);
                    setActionError(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Return Date
                    </label>
                    <input
                    type="date"
                    value={returnSingleItemModal.returnDate}
                    onChange={(e) =>
                    setReturnSingleItemModal((prev) =>
                    prev ?
                    {
                      ...prev,
                      returnDate: e.target.value
                    } :
                    prev
                    )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                    autoFocus />
                  
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Return Time
                    </label>
                    <input
                    type="time"
                    value={returnSingleItemModal.returnTime}
                    onChange={(e) =>
                    setReturnSingleItemModal((prev) =>
                    prev ?
                    {
                      ...prev,
                      returnTime: e.target.value
                    } :
                    prev
                    )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
                  
                  </div>
                </div>

                {/* Damage Fines Section */}
                <div className="bg-white rounded-lg border border-orange-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-xs text-gray-700 flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-orange-500" />
                      Damage Fines
                      <span className="text-gray-400 font-normal">
                        (optional)
                      </span>
                    </h4>
                    <button
                    onClick={() =>
                    setReturnSingleItemModal((prev) =>
                    prev ?
                    {
                      ...prev,
                      fines: [
                      ...prev.fines,
                      {
                        reason: '',
                        fine: ''
                      }]

                    } :
                    prev
                    )
                    }
                    className="flex items-center gap-1 text-xs px-2 py-1 bg-orange-50 text-orange-600 border border-orange-200 rounded-md hover:bg-orange-100 transition-colors font-bold">
                    
                      <Plus className="w-3 h-3" />
                      Add Fine
                    </button>
                  </div>

                  {returnSingleItemModal.fines.length === 0 ?
                <p className="text-[11px] text-gray-400 italic text-center py-2">
                      No fines — click "Add Fine" if item is damaged
                    </p> :

                <div className="space-y-2">
                      {returnSingleItemModal.fines.map((fine, idx) =>
                  <div key={idx} className="flex items-start gap-2">
                          <div className="flex-1 space-y-1">
                            <input
                        type="text"
                        value={fine.reason}
                        onChange={(e) =>
                        setReturnSingleItemModal((prev) =>
                        prev ?
                        {
                          ...prev,
                          fines: prev.fines.map((f, i) =>
                          i === idx ?
                          {
                            ...f,
                            reason: e.target.value
                          } :
                          f
                          )
                        } :
                        prev
                        )
                        }
                        placeholder="Damage description (e.g. Motor seized)"
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-orange-400 outline-none" />
                      
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">
                                Rs.
                              </span>
                              <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={fine.fine}
                          onChange={(e) =>
                          setReturnSingleItemModal((prev) =>
                          prev ?
                          {
                            ...prev,
                            fines: prev.fines.map((f, i) =>
                            i === idx ?
                            {
                              ...f,
                              fine: e.target.value
                            } :
                            f
                            )
                          } :
                          prev
                          )
                          }
                          placeholder="Fine amount"
                          className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-md text-xs font-bold focus:ring-2 focus:ring-orange-400 outline-none" />
                        
                            </div>
                          </div>
                          <button
                      onClick={() =>
                      setReturnSingleItemModal((prev) =>
                      prev ?
                      {
                        ...prev,
                        fines: prev.fines.filter(
                          (_, i) => i !== idx
                        )
                      } :
                      prev
                      )
                      }
                      className="mt-1 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                      
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                  )}
                      {returnSingleItemModal.fines.some(
                    (f) => parseFloat(f.fine) > 0
                  ) &&
                  <div className="flex justify-between text-xs font-bold text-orange-700 bg-orange-50 rounded-md px-2.5 py-1.5 border border-orange-200 mt-1">
                          <span>Total Fines</span>
                          <span>
                            {formatPrice(
                        returnSingleItemModal.fines.reduce(
                          (sum, f) => sum + (parseFloat(f.fine) || 0),
                          0
                        )
                      )}
                          </span>
                        </div>
                  }
                    </div>
                }
                </div>

                {actionError &&
              <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-start gap-1.5 text-xs text-red-700">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{actionError}</span>
                  </div>
              }
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-3 flex-shrink-0">
                <button
                onClick={() => {
                  setReturnSingleItemModal(null);
                  setActionError(null);
                }}
                className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors">
                
                  Cancel
                </button>
                <button
                onClick={() => {
                  if (!returnSingleItemModal.returnDate) return;
                  handleReturnItem(
                    returnSingleItemModal.bill,
                    returnSingleItemModal.itemIndex,
                    returnSingleItemModal.returnDate,
                    returnSingleItemModal.returnTime,
                    returnSingleItemModal.fines
                  );
                }}
                disabled={
                !returnSingleItemModal.returnDate ||
                actionLoading ===
                `return-${returnSingleItemModal.bill.id}-${returnSingleItemModal.itemIndex}`
                }
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                
                  {actionLoading ===
                `return-${returnSingleItemModal.bill.id}-${returnSingleItemModal.itemIndex}` ?
                <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Returning...
                    </> :

                <>
                      <RotateCcw className="w-4 h-4" />
                      Confirm Return
                    </>
                }
                </button>
              </div>
            </motion.div>
          </motion.div>
        }
      </AnimatePresence>
    </div>);

}