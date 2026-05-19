import React, { useEffect, useState, Suspense, lazy } from 'react';
import { CartProvider, useCart } from './hooks/useCart';
import { Header } from './components/Header';
import { CatalogPage } from './components/CatalogPage';
import { LoginPage } from './components/LoginPage';
import {
  Bill,
  DamageRecord,
  CashTransaction,
  CustomerRecord,
  Expense } from
'./types';
import { getToken, clearToken } from './utils/auth';
// Lazy load heavy/secondary pages — they're not needed for initial render
const HistoryPage = lazy(() =>
import('./components/HistoryPage').then((m) => ({
  default: m.HistoryPage
}))
);
const Cart = lazy(() =>
import('./components/Cart').then((m) => ({
  default: m.Cart
}))
);
const BillPreview = lazy(() =>
import('./components/BillPreview').then((m) => ({
  default: m.BillPreview
}))
);
const QuickRental = lazy(() =>
import('./components/QuickRental').then((m) => ({
  default: m.QuickRental
}))
);
const QuickSale = lazy(() =>
import('./components/QuickSale').then((m) => ({
  default: m.QuickSale
}))
);
const DamageTracker = lazy(() =>
import('./components/DamageTracker').then((m) => ({
  default: m.DamageTracker
}))
);
const ExpenseTracker = lazy(() =>
import('./components/ExpenseTracker').then((m) => ({
  default: m.ExpenseTracker
}))
);
const CustomerManager = lazy(() =>
import('./components/CustomerManager').then((m) => ({
  default: m.CustomerManager
}))
);
const PageFallback = () =>
<div className="flex items-center justify-center py-20">
    <div className="w-8 h-8 border-3 border-gray-200 border-t-[#f5a623] rounded-full animate-spin" />
  </div>;

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
const initialCustomers: CustomerRecord[] = [];
const initialDamages: DamageRecord[] = [];
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
  const { clearCart } = useCart();
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
  const handleAddDamage = (damage: DamageRecord) =>
  setDamages((prev) => [damage, ...prev]);
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
      <Suspense fallback={<PageFallback />}>
        <BillPreview
          bill={currentBill}
          onBack={() => setCurrentPage('history')}
          onNewOrder={handleNewOrder} />
        
      </Suspense>);

  }
  if (currentPage === 'quick-rental') {
    return (
      <Suspense fallback={<PageFallback />}>
        <QuickRental
          onGenerateBill={handleGenerateBill}
          onCancel={() => setCurrentPage('catalog')} />
        
      </Suspense>);

  }
  if (currentPage === 'quick-sale') {
    return (
      <Suspense fallback={<PageFallback />}>
        <QuickSale
          onGenerateBill={handleGenerateBill}
          onCancel={() => setCurrentPage('catalog')} />
        
      </Suspense>);

  }
  return (
    <div className="min-h-screen bg-[#faf8f5] flex flex-col">
      <Header
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={handleLogout} />
      

      <main className="flex-grow">
        {currentPage === 'catalog' &&
        <CatalogPage onNavigate={handleNavigate} />
        }

        <Suspense fallback={<PageFallback />}>
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
        </Suspense>
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