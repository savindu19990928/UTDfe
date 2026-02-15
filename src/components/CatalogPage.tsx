import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  ShoppingCart,
  Clock,
  ScanBarcode,
  Check,
  AlertCircle,
  X,
  Loader2,
  Zap } from
'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { useCategories } from '../hooks/useCategories';
import { useRentals } from '../hooks/useRentals';
import { useSales } from '../hooks/useSales';
import { ProductList } from './ProductList';
import { useCart } from '../hooks/useCart';
import { motion, AnimatePresence } from 'framer-motion';
interface CatalogPageProps {
  onNavigate?: (page: 'quick-rental' | 'quick-sale') => void;
}
export function CatalogPage({ onNavigate }: CatalogPageProps) {
  const [activeTab, setActiveTab] = useState<'sale' | 'rent'>('sale');
  const [salePage, setSalePage] = useState(1);
  const [rentPage, setRentPage] = useState(1);
  const [saleCategoryId, setSaleCategoryId] = useState<string | number | null>(
    null
  );
  const [rentCategoryId, setRentCategoryId] = useState<string | number | null>(
    null
  );
  const [scanMode, setScanMode] = useState(false);
  const [scanBuffer, setScanBuffer] = useState('');
  const [scanFeedback, setScanFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const bufferRef = useRef('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { addToCart } = useCart();
  const currentPage = activeTab === 'sale' ? salePage : rentPage;
  const categoryType =
  activeTab === 'sale' ? 'sell' as const : 'rent' as const;
  const activeCategoryId =
  activeTab === 'sale' ? saleCategoryId : rentCategoryId;
  // Fetch categories for current tab
  const { categories } = useCategories(categoryType);
  // Fetch products with category + pagination
  const { products, loading, error, totalCount, totalPages, refetch } =
  useProducts({
    categoryType: activeCategoryId ? undefined : categoryType,
    categoryId: activeCategoryId || undefined,
    page: currentPage
  });
  // All products for barcode scanning — only fetch when scan mode is active
  const { products: allProducts } = useProducts({
    enabled: scanMode
  });
  // Preloaded counts for both product types (from cache)
  const { totalCount: saleProductCount } = useProducts({
    categoryType: 'sell',
    enabled: true
  });
  const { totalCount: rentProductCount } = useProducts({
    categoryType: 'rent',
    enabled: true
  });
  // Preloaded rental & sale bill counts (from cache via useDataPreloader)
  const { rentals, loading: rentalsLoading } = useRentals({
    enabled: true
  });
  const { sales, loading: salesLoading } = useSales({
    enabled: true
  });
  // Compute active rental count (non-closed)
  const activeRentalCount = rentals.filter(
    (b) => b.rentalStatus !== 'closed'
  ).length;
  const totalRentalCount = rentals.length;
  const totalSaleCount = sales.length;
  const handlePageChange = (newPage: number) => {
    if (activeTab === 'sale') setSalePage(newPage);else
    setRentPage(newPage);
    window.scrollTo(0, 0);
  };
  const handleCategoryChange = (catId: string | number | null) => {
    if (activeTab === 'sale') {
      setSaleCategoryId(catId);
      setSalePage(1); // Reset to page 1
    } else {
      setRentCategoryId(catId);
      setRentPage(1);
    }
  };
  const handleTabChange = (tab: 'sale' | 'rent') => {
    setActiveTab(tab);
  };
  const showFeedback = useCallback(
    (type: 'success' | 'error', message: string) => {
      setScanFeedback({
        type,
        message
      });
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => setScanFeedback(null), 2500);
    },
    []
  );
  const processBarcode = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;
      const product = allProducts.find(
        (p) =>
        p.barcode?.toLowerCase() === trimmed.toLowerCase() ||
        p.itemCode?.toLowerCase() === trimmed.toLowerCase()
      );
      if (product) {
        const type = product.listingType;
        const success = addToCart(product, type, 1);
        if (success) showFeedback('success', `${product.name} added to cart`);else
        showFeedback('error', `Can't mix sale & rental items in cart`);
      } else {
        showFeedback('error', `No product found for code: ${trimmed}`);
      }
    },
    [allProducts, addToCart, showFeedback]
  );
  useEffect(() => {
    if (!scanMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Enter') {
        e.preventDefault();
        processBarcode(bufferRef.current);
        bufferRef.current = '';
        setScanBuffer('');
        return;
      }
      if (e.key.length === 1) {
        bufferRef.current += e.key;
        setScanBuffer(bufferRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          bufferRef.current = '';
          setScanBuffer('');
        }, 500);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [scanMode, processBarcode]);
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#1a1a2e] mb-2">
            Product Catalog
          </h1>
          <p className="text-gray-600">
            Browse items available for purchase or rent.
          </p>
        </div>
        <div className="flex gap-3">
          {onNavigate &&
          <>
              <button
              onClick={() => onNavigate('quick-sale')}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 transition-colors shadow-sm">

                <ShoppingCart className="w-5 h-5" />
                Quick Sale
              </button>
              <button
              onClick={() => onNavigate('quick-rental')}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">

                <Zap className="w-5 h-5" />
                Quick Rental
              </button>
            </>
          }
          <button
            onClick={() => {
              setScanMode(!scanMode);
              bufferRef.current = '';
              setScanBuffer('');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${scanMode ? 'bg-[#f5a623] text-[#1a1a2e] shadow-md ring-2 ring-[#f5a623]/30' : 'bg-[#1a1a2e] text-white hover:bg-[#2d4059]'}`}>

            <ScanBarcode className="w-5 h-5" />
            {scanMode ? 'Scanning...' : 'Scan Barcode'}
          </button>
        </div>
      </div>

      {/* Scan Mode Banner */}
      <AnimatePresence>
        {scanMode &&
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
          className="overflow-hidden mb-6">

            <div className="bg-[#f5a623]/10 border-2 border-dashed border-[#f5a623] rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-[#f5a623] p-2 rounded-lg">
                  <ScanBarcode className="w-5 h-5 text-[#1a1a2e]" />
                </div>
                <div>
                  <p className="font-bold text-[#1a1a2e] text-sm">
                    Barcode Scanner Active
                  </p>
                  <p className="text-xs text-gray-600">
                    Scan any product barcode to add it to the cart
                    automatically.
                    {scanBuffer &&
                  <span className="ml-2 font-mono bg-white px-2 py-0.5 rounded text-[#1a1a2e] border border-gray-200">
                        {scanBuffer}
                      </span>
                  }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f5a623] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#f5a623]"></span>
                </span>
                <button
                onClick={() => {
                  setScanMode(false);
                  bufferRef.current = '';
                  setScanBuffer('');
                }}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-lg transition-colors">

                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        }
      </AnimatePresence>

      {/* Scan Feedback Toast */}
      <AnimatePresence>
        {scanFeedback &&
        <motion.div
          initial={{
            opacity: 0,
            y: -20,
            scale: 0.95
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1
          }}
          exit={{
            opacity: 0,
            y: -20,
            scale: 0.95
          }}
          className="fixed top-20 right-4 z-50">

            <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-bold ${scanFeedback.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>

              {scanFeedback.type === 'success' ?
            <Check className="w-4 h-4 text-green-600 flex-shrink-0" /> :

            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            }
              {scanFeedback.message}
            </div>
          </motion.div>
        }
      </AnimatePresence>

      {/* Sub-tabs */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => handleTabChange('sale')}
          className={`relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors ${activeTab === 'sale' ? 'bg-[#f5a623] text-[#1a1a2e] shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>

          <ShoppingCart className="w-4 h-4" />
          Sale Items
          <span
            className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'sale' ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>

            {saleProductCount}
          </span>
        </button>
        <button
          onClick={() => handleTabChange('rent')}
          className={`relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors ${activeTab === 'rent' ? 'bg-[#2d4059] text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>

          <Clock className="w-4 h-4" />
          Rent Items
          <span
            className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'rent' ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>

            {rentProductCount}
          </span>
        </button>

        {/* Bill counts from preloaded data */}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <div
              className={`w-2 h-2 rounded-full ${activeRentalCount > 0 ? 'bg-blue-500' : 'bg-gray-300'}`} />

            <span className="font-medium">
              {rentalsLoading ?
              '…' :

              <>
                  <span className="font-bold text-[#2d4059]">
                    {activeRentalCount}
                  </span>{' '}
                  active rentals
                </>
              }
            </span>
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <div
              className={`w-2 h-2 rounded-full ${totalSaleCount > 0 ? 'bg-[#f5a623]' : 'bg-gray-300'}`} />

            <span className="font-medium">
              {salesLoading ?
              '…' :

              <>
                  <span className="font-bold text-[#2d4059]">
                    {totalSaleCount}
                  </span>{' '}
                  sales
                </>
              }
            </span>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading &&
      <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#f5a623] animate-spin" />
          <span className="ml-3 text-gray-500 font-medium">
            Loading products...
          </span>
        </div>
      }

      {/* Error */}
      {error && !loading &&
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 font-medium mb-3">{error}</p>
          <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors">

            Retry
          </button>
        </div>
      }

      {/* Product List */}
      {!loading && !error &&
      <ProductList
        products={products}
        title={activeTab === 'sale' ? 'Sale Items' : 'Rental Equipment'}
        listingType={activeTab}
        categories={categories}
        activeCategoryId={activeCategoryId}
        onCategoryChange={handleCategoryChange}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={handlePageChange} />

      }
    </div>);

}