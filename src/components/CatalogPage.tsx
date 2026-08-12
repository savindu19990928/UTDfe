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
import {
  useProductSearch,
  fetchProductDetails,
  lookupProductByCode } from
'../hooks/useProductSearch';
import { ProductList } from './ProductList';
import { useCart } from '../hooks/useCart';
import { Product } from '../types';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
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
  // Fetch products: filter by category if selected, otherwise just by type + page
  const { products, loading, error, totalCount, totalPages, refetch } =
  useProducts({
    categoryType: activeCategoryId ? undefined : categoryType,
    categoryId: activeCategoryId || undefined,
    page: currentPage
  });
  // Search runs against the whole catalog through the dedicated endpoints,
  // not just the page currently on screen.
  const trimmedSearch = searchQuery.trim();
  const searchActive = trimmedSearch.length >= 2;
  const { results: searchResults, loading: searchLoading } = useProductSearch({
    type: activeTab === 'sale' ? 'sale' : 'rent',
    query: searchActive ? trimmedSearch : undefined,
    enabled: searchActive
  });
  const handlePageChange = (newPage: number) => {
    if (activeTab === 'sale') setSalePage(newPage);else
    setRentPage(newPage);
    window.scrollTo(0, 0);
  };
  const handleCategoryChange = (catId: string | number | null) => {
    if (activeTab === 'sale') {
      setSaleCategoryId(catId);
      setSalePage(1);
    } else {
      setRentCategoryId(catId);
      setRentPage(1);
    }
  };
  const handleTabChange = (tab: 'sale' | 'rent') => {
    setActiveTab(tab);
    setSearchQuery('');
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
  // Add a product to the cart, hydrating search hits (which carry no stock
  // or category) with their full record first.
  const handleAddProduct = useCallback(
    async (product: Product): Promise<boolean> => {
      let full = product;
      if (!product.category) {
        setAddingProductId(product.id);
        const detailed = await fetchProductDetails(product.id);
        setAddingProductId(null);
        if (detailed) full = detailed;
      }
      if (full.listingType === 'rent' && full.stock <= 0) {
        showFeedback('error', `${full.name} is currently unavailable`);
        return true;
      }
      const success = addToCart(full, full.listingType, 1);
      if (success) showFeedback('success', `${full.name} added to cart`);
      return success;
    },
    [addToCart, showFeedback]
  );
  const processBarcode = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;
      const local = products.find(
        (p) =>
        p.barcode?.toLowerCase() === trimmed.toLowerCase() ||
        p.itemCode?.toLowerCase() === trimmed.toLowerCase()
      );
      if (local) {
        const success = await handleAddProduct(local);
        if (!success) showFeedback('error', `Can't mix sale & rental items in cart`);
        return;
      }
      // Not on this page — look the code up across the whole catalog
      const primary = activeTab === 'sale' ? 'sale' : 'rent';
      const secondary = primary === 'sale' ? 'rent' : 'sale';
      const match =
      (await lookupProductByCode(primary, trimmed)) || (
      await lookupProductByCode(secondary, trimmed));
      if (!match) {
        showFeedback('error', `No product found for code: ${trimmed}`);
        return;
      }
      const success = await handleAddProduct(match);
      if (!success) showFeedback('error', `Can't mix sale & rental items in cart`);
    },
    [products, activeTab, handleAddProduct, showFeedback]
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
          {activeTab === 'sale' &&
          <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-white/20">
              {loading ? '…' : totalCount}
            </span>
          }
        </button>
        <button
          onClick={() => handleTabChange('rent')}
          className={`relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors ${activeTab === 'rent' ? 'bg-[#2d4059] text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
          
          <Clock className="w-4 h-4" />
          Rent Items
          {activeTab === 'rent' &&
          <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-white/20">
              {loading ? '…' : totalCount}
            </span>
          }
        </button>
      </div>

      {/* Loading */}
      {loading && !searchActive &&
      <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#f5a623] animate-spin" />
          <span className="ml-3 text-gray-500 font-medium">
            Loading products...
          </span>
        </div>
      }

      {/* Error */}
      {error && !loading && !searchActive &&
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
      {(searchActive || !loading && !error) &&
      <ProductList
        products={searchActive ? searchResults : products}
        title={activeTab === 'sale' ? 'Sale Items' : 'Rental Equipment'}
        listingType={activeTab}
        categories={categories}
        activeCategoryId={activeCategoryId}
        onCategoryChange={handleCategoryChange}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={handlePageChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchActive={searchActive}
        searchLoading={searchLoading}
        onAddProduct={handleAddProduct}
        addingProductId={addingProductId} />

      }
    </div>);

}