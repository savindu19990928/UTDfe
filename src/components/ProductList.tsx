import React, { useMemo, useState } from 'react';
import {
  Search,
  PackageOpen,
  ShoppingCart,
  Clock,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight } from
'lucide-react';
import { Product, ApiCategory } from '../types';
import { useCart } from '../hooks/useCart';
import { CategoryTabs } from './CategoryTabs';
import { formatPrice } from '../utils/format';
import { motion, AnimatePresence } from 'framer-motion';
interface ProductListProps {
  products: Product[];
  title: string;
  listingType: 'sale' | 'rent';
  categories?: ApiCategory[];
  activeCategoryId?: string | number | null;
  onCategoryChange?: (categoryId: string | number | null) => void;
  currentPage?: number;
  totalPages?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
}
export function ProductList({
  products,
  title,
  listingType,
  categories = [],
  activeCategoryId = null,
  onCategoryChange,
  currentPage = 1,
  totalPages = 1,
  totalCount = 0,
  onPageChange
}: ProductListProps) {
  const { addToCart, cartType } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [showTypeWarning, setShowTypeWarning] = useState(false);
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode &&
        product.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.itemCode &&
        product.itemCode.toLowerCase().includes(searchQuery.toLowerCase()));

    });
  }, [products, searchQuery]);
  const handleAddToCart = (product: Product) => {
    const success = addToCart(product, product.listingType, 1);
    if (!success) {
      setShowTypeWarning(true);
      setTimeout(() => setShowTypeWarning(false), 4000);
    }
  };
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const exactMatch = products.find(
        (p) =>
        p.barcode && p.barcode.toLowerCase() === q ||
        p.itemCode && p.itemCode.toLowerCase() === q
      );
      const canAdd = (p: Product) => p.listingType === 'sale' || p.stock > 0;
      if (exactMatch && canAdd(exactMatch)) {
        handleAddToCart(exactMatch);
        setSearchQuery('');
        return;
      }
      if (filteredProducts.length === 1 && canAdd(filteredProducts[0])) {
        handleAddToCart(filteredProducts[0]);
        setSearchQuery('');
      }
    }
  };
  const showPagination = totalCount > 20 && onPageChange;
  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };
  return (
    <div>
      {/* Type conflict warning */}
      <AnimatePresence>
        {showTypeWarning &&
        <motion.div
          initial={{
            opacity: 0,
            y: -10
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          exit={{
            opacity: 0,
            y: -10
          }}
          className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-800">
                {cartType === 'sale' ?
              'විකිණීම් සහ කුලියට දීම එකම බිල්පතකින් කළ නොහැක' :
              'කුලියට දීම සහ විකිණීම් එකම බිල්පතකින් කළ නොහැක'}
              </p>
              <p className="text-xs text-red-600 mt-1">
                {cartType === 'sale' ?
              'Your cart has sale items. Complete or clear the current order before adding rental items.' :
              'Your cart has rental items. Complete or clear the current order before adding sale items.'}
              </p>
            </div>
            <button
            onClick={() => setShowTypeWarning(false)}
            className="text-red-400 hover:text-red-600 transition-colors">
            
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        }
      </AnimatePresence>

      {/* Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <span className="text-sm font-medium text-gray-500">
          {totalCount > 0 ?
          `${totalCount} products total` :
          `Showing ${filteredProducts.length} results`}
        </span>
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder={
            listingType === 'sale' ?
            'Search or scan barcode...' :
            'Search by name or item code...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#f5a623] focus:border-transparent transition-shadow" />
          
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && onCategoryChange &&
      <div className="mb-6 border-b border-gray-200">
          <CategoryTabs
          categories={categories}
          activeCategoryId={activeCategoryId}
          onSelectCategory={onCategoryChange} />
        
        </div>
      }

      {/* List View */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 w-1/3">Product Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 font-mono">
                  {listingType === 'sale' ? 'Barcode' : 'Item Code'}
                </th>
                <th className="px-6 py-4 text-right">Price</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <AnimatePresence>
                {filteredProducts.length > 0 ?
                filteredProducts.map((product) => {
                  const isBlocked =
                  cartType !== null && cartType !== product.listingType;
                  const isOutOfStock =
                  product.listingType === 'rent' && product.stock === 0;
                  return (
                    <motion.tr
                      key={product.id}
                      initial={{
                        opacity: 0
                      }}
                      animate={{
                        opacity: 1
                      }}
                      exit={{
                        opacity: 0
                      }}
                      className="hover:bg-gray-50 transition-colors group">
                      
                        <td className="px-6 py-4">
                          <div className="font-bold text-[#1a1a2e] text-base">
                            {product.name}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {product.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-gray-600">
                          {listingType === 'sale' ?
                        product.barcode || '-' :
                        product.itemCode || '-'}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-[#1a1a2e]">
                          {listingType === 'sale' ?
                        formatPrice(product.salePrice) :
                        `${formatPrice(product.rentPricePerDay || 0)} / day`}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                          onClick={() => handleAddToCart(product)}
                          disabled={isOutOfStock}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm ${isOutOfStock ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : isBlocked ? 'bg-gray-100 text-gray-400 border border-dashed border-gray-300' : listingType === 'sale' ? 'bg-[#f5a623] hover:bg-[#d4901e] text-[#1a1a2e]' : 'bg-[#2d4059] hover:bg-[#1a1a2e] text-white'}`}>
                          
                            {listingType === 'sale' ?
                          <ShoppingCart className="w-4 h-4" /> :

                          <Clock className="w-4 h-4" />
                          }
                            {isOutOfStock ?
                          'Unavailable' :
                          listingType === 'sale' ?
                          'Add' :
                          'Rent'}
                          </button>
                        </td>
                      </motion.tr>);

                }) :

                <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="bg-gray-100 p-4 rounded-full mb-3">
                          <PackageOpen className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          No products found
                        </h3>
                        <p className="text-gray-500 text-sm">
                          Try adjusting your search terms or filters.
                        </p>
                        <button
                        onClick={() => {
                          setSearchQuery('');
                          setActiveCategory('All');
                        }}
                        className="mt-4 text-[#f5a623] font-medium hover:underline text-sm">
                        
                          Clear all filters
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {showPagination &&
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-500">
              Page{' '}
              <span className="font-bold text-[#1a1a2e]">{currentPage}</span> of{' '}
              <span className="font-bold text-[#1a1a2e]">{totalPages}</span>
              <span className="ml-2 text-gray-400">({totalCount} items)</span>
            </p>
            <div className="flex items-center gap-1">
              <button
              onClick={() => onPageChange!(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-2 rounded-lg text-gray-500 hover:bg-white hover:text-[#1a1a2e] disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-transparent hover:border-gray-200 disabled:hover:border-transparent disabled:hover:bg-transparent">
              
                <ChevronLeft className="w-4 h-4" />
              </button>

              {getPageNumbers().map((page, idx) =>
            page === '...' ?
            <span
              key={`dots-${idx}`}
              className="px-2 text-gray-400 text-sm">
              
                    …
                  </span> :

            <button
              key={page}
              onClick={() => onPageChange!(page as number)}
              className={`min-w-[36px] h-9 rounded-lg text-sm font-bold transition-colors ${page === currentPage ? 'bg-[#1a1a2e] text-white shadow-sm' : 'text-gray-600 hover:bg-white hover:text-[#1a1a2e] border border-transparent hover:border-gray-200'}`}>
              
                    {page}
                  </button>

            )}

              <button
              onClick={() => onPageChange!(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-2 rounded-lg text-gray-500 hover:bg-white hover:text-[#1a1a2e] disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-transparent hover:border-gray-200 disabled:hover:border-transparent disabled:hover:bg-transparent">
              
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        }
      </div>
    </div>);

}