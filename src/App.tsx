import React, { useEffect, useState } from 'react';
import { CartProvider, useCart } from './hooks/useCart';
import { Header } from './components/Header';
import { CatalogPage } from './components/CatalogPage';
import { Cart } from './components/Cart';
import { BillPreview } from './components/BillPreview';
import { HistoryPage } from './components/HistoryPage';
import { QuickRental } from './components/QuickRental';
import { QuickSale } from './components/QuickSale';
import { LoginPage } from './components/LoginPage';
import { DamageTracker } from './components/DamageTracker';
import { ExpenseTracker } from './components/ExpenseTracker';
import { CustomerManager } from './components/CustomerManager';
import { Bill, DamageRecord, CashTransaction } from './types';
import { getToken, clearToken, getAuthHeaders } from './utils/auth';
import { API_URL } from './utils/config';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
type Page =
'catalog' |
'history' |
'cart' |
'bill' |
'damages' |
'expenses' |
'customers' |
'quick-rental' |
'quick-sale';
const initialCustomers: CustomerRecord[] = [
{
  id: 'CUST-1',
  name: 'Acme Construction',
  phone: '(555) 123-4567',
  address: '101 Builder Ln',
  nicNumber: 'A1234567',
  phoneVerified: true,
  isBanned: false
},
{
  id: 'CUST-2',
  name: 'John Smith',
  phone: '(555) 987-6543',
  address: '42 Residential Rd',
  nicNumber: 'B7654321',
  phoneVerified: false,
  isBanned: false
}];

const initialDamages: DamageRecord[] = [
{
  id: 'DMG-1',
  productId: '1',
  productName: 'Heavy Duty Concrete Mixer',
  damagedQty: 1,
  date: '2023-10-15',
  severity: 'minor',
  notes: 'Dented drum during transport',
  estimatedLoss: 150
}];

const initialExpenses: Expense[] = [
{
  id: 'EXP-1',
  description: 'Delivery Van Fuel',
  amount: 85.5,
  date: '2023-10-20'
},
{
  id: 'EXP-2',
  description: 'Shop Electricity Bill',
  amount: 245.0,
  date: '2023-10-01'
}];

function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('catalog');
  const [currentBill, setCurrentBill] = useState<Bill | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>(initialCustomers);
  const [damages, setDamages] = useState<DamageRecord[]>(initialDamages);
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>(
    []
  );
  const [overdueMessage, setOverdueMessage] = useState<string | null>(null);
  const { clearCart } = useCart();
  // Check for overdue rentals after login
  useEffect(() => {
    if (!isLoggedIn) return;
    const checkOverdue = async () => {
      try {
        const res = await fetch(`${API_URL}rentals/check_overdue/`, {
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.message) {
          setOverdueMessage(data.message);
        }
      } catch {

        // Silent fail — non-critical
      }};
    checkOverdue();
  }, [isLoggedIn]);
  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };
  const handleGenerateBill = (bill: Bill) => {
    clearCart();
    setBills((prev) => [bill, ...prev]);
    setCurrentBill(bill);
    setCurrentPage('bill');
    window.scrollTo(0, 0);
  };
  const handleNewOrder = () => {
    clearCart();
    setCurrentBill(null);
    setCurrentPage('catalog');
  };
  const handleUpdateBill = (updatedBill: Bill) => {
    setBills((prev) =>
    prev.map((b) => b.id === updatedBill.id ? updatedBill : b)
    );
    if (currentBill?.id === updatedBill.id) {
      setCurrentBill(updatedBill);
    }
  };
  const handleViewBill = (bill: Bill) => {
    setCurrentBill(bill);
    setCurrentPage('bill');
    window.scrollTo(0, 0);
  };
  const handleAddCustomer = (customer: CustomerRecord) =>
  setCustomers((prev) => [...prev, customer]);
  const handleUpdateCustomer = (customer: CustomerRecord) =>
  setCustomers((prev) =>
  prev.map((c) => c.id === customer.id ? customer : c)
  );
  const handleDeleteCustomer = (id: string) =>
  setCustomers((prev) => prev.filter((c) => c.id !== id));
  const handleAddDamage = (damage: DamageRecord) =>
  setDamages((prev) => [damage, ...prev]);
  const handleDeleteDamage = (id: string) =>
  setDamages((prev) => prev.filter((d) => d.id !== id));
  const handleAddExpense = (expense: Expense) =>
  setExpenses((prev) => [expense, ...prev]);
  const handleDeleteExpense = (id: string) =>
  setExpenses((prev) => prev.filter((e) => e.id !== id));
  const handleAddCashTransaction = (transaction: CashTransaction) =>
  setCashTransactions((prev) => [transaction, ...prev]);
  // Check for existing token on mount
  useEffect(() => {
    const token = getToken();
    if (token) {
      setIsLoggedIn(true);
    }
    setAuthChecked(true);
  }, []);
  const handleLogout = () => {
    clearToken();
    setIsLoggedIn(false);
  };
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-white/30 border-t-[#f5a623] rounded-full animate-spin" />
      </div>);

  }
  if (!isLoggedIn) {
    return <LoginPage onLogin={() => setIsLoggedIn(true)} />;
  }
  if (currentPage === 'bill' && currentBill) {
    return (
      <BillPreview
        bill={currentBill}
        onBack={() => setCurrentPage('history')}
        onNewOrder={handleNewOrder} />);


  }
  if (currentPage === 'quick-rental') {
    return (
      <QuickRental
        onGenerateBill={handleGenerateBill}
        onCancel={() => setCurrentPage('catalog')} />);


  }
  if (currentPage === 'quick-sale') {
    return (
      <QuickSale
        onGenerateBill={handleGenerateBill}
        onCancel={() => setCurrentPage('catalog')} />);


  }
  return (
    <div className="min-h-screen bg-[#faf8f5] flex flex-col">
      <Header
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={handleLogout} />
      

      {/* Overdue Rentals Banner */}
      <AnimatePresence>
        {overdueMessage &&
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
          transition={{
            duration: 0.25
          }}
          className="overflow-hidden">
          
            <div className="bg-amber-50 border-b border-amber-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <p className="text-sm font-medium text-amber-800 truncate">
                    {overdueMessage}
                  </p>
                </div>
                <button
                onClick={() => setOverdueMessage(null)}
                className="p-1 text-amber-500 hover:text-amber-700 hover:bg-amber-100 rounded transition-colors flex-shrink-0">
                
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        }
      </AnimatePresence>

      <main className="flex-grow">
        {currentPage === 'catalog' &&
        <CatalogPage onNavigate={handleNavigate} />
        }

        {currentPage === 'history' &&
        <HistoryPage
          bills={bills}
          cashTransactions={cashTransactions}
          onUpdateBill={handleUpdateBill}
          onViewBill={handleViewBill}
          onAddCashTransaction={handleAddCashTransaction} />

        }

        {currentPage === 'cart' &&
        <Cart
          onGenerateBill={handleGenerateBill}
          onContinueShopping={() => handleNavigate('catalog')} />

        }

        {currentPage === 'customers' && <CustomerManager />}

        {currentPage === 'damages' &&
        <DamageTracker damages={damages} onAddDamage={handleAddDamage} />
        }

        {currentPage === 'expenses' && <ExpenseTracker />}
      </main>

      <footer className="bg-[#1a1a2e] text-gray-400 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">
          <p>
            Made by{' '}
            <a
              href="https://www.devrious.lk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#f5a623] hover:underline">
              
              Devrious
            </a>
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Built for construction professionals.
          </p>
        </div>
      </footer>
    </div>);

}
export function App() {
  return (
    <CartProvider>
      <AppContent />
    </CartProvider>);

}