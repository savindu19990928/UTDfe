import React from 'react';
import { CartItem as CartItemType } from '../types';
import { useCart } from '../hooks/useCart';
import { Trash2, Minus, Plus, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatPrice } from '../utils/format';
interface CartItemProps {
  item: CartItemType;
  index: number;
}
export function CartItem({ item, index }: CartItemProps) {
  const { updateQuantity, updateRentalDays, removeFromCart } = useCart();
  const unitPrice =
    item.type === 'sale' ?
      item.product.salePrice :
      item.product.rentPricePerDay || 0;
  const lineTotal =
    item.type === 'sale' ?
      unitPrice * item.quantity :
      unitPrice * item.quantity * (item.rentalDays || 1);
  return (
    <motion.div
      layout
      initial={{
        opacity: 0,
        x: -20
      }}
      animate={{
        opacity: 1,
        x: 0
      }}
      exit={{
        opacity: 0,
        x: 20
      }}
      className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4">

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${item.type === 'sale' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>

            {item.type === 'sale' ? 'Sale' : 'Rental'}
          </span>
          <h4 className="font-bold text-[#1a1a2e] truncate">
            {item.product.name}
          </h4>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{item.product.category}</span>
          <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">
            {item.type === 'sale' ?
              item.product.barcode :
              item.product.itemCode}
          </span>
        </div>
        <div className="text-sm font-medium text-gray-700 mt-1">
          {formatPrice(unitPrice)} {item.type === 'rent' && '/ day'}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 w-full sm:w-auto mt-2 sm:mt-0">
        {/* Rental Days Input */}
        {item.type === 'rent' &&
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <Clock className="w-4 h-4 text-gray-400" />
            <label className="text-xs font-semibold text-gray-500 whitespace-nowrap">
              Days:
            </label>
            <input
              type="number"
              min="1"
              value={item.rentalDays || 1}
              onChange={(e) =>
                updateRentalDays(index, parseInt(e.target.value) || 1)
              }
              className="w-12 bg-transparent text-center font-bold text-[#1a1a2e] focus:outline-none focus:ring-1 focus:ring-blue-500 rounded" />

          </div>
        }

        {/* Quantity */}
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
          <label className="text-xs font-semibold text-gray-500">Qty:</label>
          <input
            type="number"
            step="any"
            min="0"
            max={item.product.stock}
            value={item.quantity}
            onChange={(e) => {
              let val = parseFloat(e.target.value) || 1;
              if (val < 1) val = 1;
              if (item.product.stock != null && val > item.product.stock) {
                val = item.product.stock;
              }
              updateQuantity(index, val);
            }}
            className="w-14 bg-transparent text-center font-bold text-[#1a1a2e] focus:outline-none focus:ring-1 focus:ring-[#f5a623] rounded" />

        </div>

        {/* Total & Remove */}
        <div className="flex items-center gap-4 ml-auto sm:ml-0">
          <span className="font-bold text-lg text-[#1a1a2e] min-w-[80px] text-right">
            {formatPrice(lineTotal)}
          </span>
          <button
            onClick={() => removeFromCart(index)}
            className="text-gray-400 hover:text-red-500 transition-colors p-1"
            title="Remove item">

            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>);

}