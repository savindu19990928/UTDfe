import { useRentals } from './useRentals';
import { useSales } from './useSales';
import { useProducts } from './useProducts';
import { useExpenses } from './useExpenses';
import { useCustomers } from './useCustomers';
import { useCategories } from './useCategories';
import { useRentalConditions } from './useRentalConditions';

/**
 * Preloads ALL app data in the background on app startup / after login.
 * This warms the apiCache so that every page (HistoryPage, CatalogPage,
 * QuickSale, QuickRental, ExpenseTracker, CustomerManager, BillPreview)
 * can serve data instantly from cache instead of waiting for fresh fetches.
 */
export function useDataPreloader() {
  // Preload rentals and sales for History page & CatalogPage counts
  useRentals({ enabled: true });
  useSales({ enabled: true });

  // Preload products by category type for QuickSale, QuickRental, CatalogPage
  useProducts({ categoryType: 'sell', enabled: true });
  useProducts({ categoryType: 'rent', enabled: true });

  // Preload expenses for HistoryPage cash register & ExpenseTracker
  useExpenses();

  // Preload customers for CustomerManager & QuickRental/QuickSale customer selection
  useCustomers();

  // Preload categories for CatalogPage tab filters
  useCategories('sell');
  useCategories('rent');

  // Preload rental conditions for BillPreview rental invoices
  useRentalConditions();
}