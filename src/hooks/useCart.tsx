import React, { useState, createContext, useContext, ReactNode } from 'react';
import { Product, CartItem, CartItemType } from '../types';
interface CartContextType {
  cartItems: CartItem[];
  cartType: CartItemType | null;
  addToCart: (
    product: Product,
    type: CartItemType,
    quantity: number,
    rentalDays?: number)
    => boolean;
  removeFromCart: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  updateRentalDays: (index: number, days: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
}
const CartContext = createContext<CartContextType | undefined>(undefined);
export function CartProvider({ children }: { children: ReactNode; }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  // Derived cart type — null if empty, otherwise the type of items in cart
  const cartType: CartItemType | null =
    cartItems.length > 0 ? cartItems[0].type : null;
  const addToCart = (
    product: Product,
    type: CartItemType,
    quantity: number,
    rentalDays: number = 1)
    : boolean => {
    // Prevent mixing sale and rental items
    if (cartType !== null && cartType !== type) {
      return false;
    }
    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && item.type === type
      );
      if (existingIndex >= 0) {
        const newItems = [...prev];
        newItems[existingIndex].quantity += quantity;
        return newItems;
      }
      return [
        ...prev,
        {
          product,
          quantity,
          type,
          rentalDays: type === 'rent' ? rentalDays : undefined
        }];

    });
    return true;
  };
  const removeFromCart = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };
  const updateQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return;
    setCartItems((prev) => {
      const newItems = [...prev];
      newItems[index].quantity = quantity;
      return newItems;
    });
  };
  const updateRentalDays = (index: number, days: number) => {
    if (days < 1) return;
    setCartItems((prev) => {
      const newItems = [...prev];
      if (newItems[index].type === 'rent') {
        newItems[index].rentalDays = days;
      }
      return newItems;
    });
  };
  const clearCart = () => {
    setCartItems([]);
  };
  const cartTotal = cartItems.reduce((total, item) => {
    if (item.type === 'sale') {
      return total + item.product.salePrice * item.quantity;
    } else {
      const days = item.rentalDays || 1;
      const price = item.product.rentPricePerDay || 0;
      return total + price * days * item.quantity;
    }
  }, 0);
  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);
  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartType,
        addToCart,
        removeFromCart,
        updateQuantity,
        updateRentalDays,
        clearCart,
        cartTotal,
        cartCount
      }}>

      {children}
    </CartContext.Provider>);

}
export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}