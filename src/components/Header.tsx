
import React, { useState } from 'react';
import {
  ShoppingCart,
  LogOut,
  Menu,
  X,
  Users,
  DollarSign,
  Package,
  History,
  Settings,
  AlertTriangle,
  Gauge } from
'lucide-react';
import { useCart } from '../hooks/useCart';
import { motion, AnimatePresence } from 'framer-motion';
import { ADMIN_SECTIONS, AdminSection } from './management/adminSections';
const LOGO_URL = "./WhatsApp_Image_2025-12-13_at_2.34.53_PM.jpg";

interface HeaderProps {
  currentPage:
  'catalog' |
  'history' |
  'cart' |
  'bill' |
  'expenses' |
  'customers' |
  'damages' |
  'machines' |
  'quick-rental' |
  'quick-sale';
  onNavigate: (
  page:
  'catalog' |
  'history' |
  'cart' |
  'bill' |
  'expenses' |
  'customers' |
  'damages' |
  'machines' |
  'quick-rental' |
  'quick-sale')
  => void;
  onLogout: () => void;
  isSuperUser?: boolean;
  managementMode?: boolean;
  onToggleManagement?: () => void;
  adminSection?: AdminSection;
  onAdminSectionChange?: (section: AdminSection) => void;
}
export function Header({
  currentPage,
  onNavigate,
  onLogout,
  isSuperUser,
  managementMode,
  onToggleManagement,
  adminSection,
  onAdminSectionChange
}: HeaderProps) {
  const { cartCount } = useCart();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navItems = [
  {
    id: 'catalog',
    label: 'Catalog',
    icon: Package
  },
  {
    id: 'history',
    label: 'History',
    icon: History
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: Users
  },
  {
    id: 'expenses',
    label: 'Expenses',
    icon: DollarSign
  },
  {
    id: 'damages',
    label: 'Damage Reports',
    icon: AlertTriangle
  },
  {
    id: 'machines',
    label: 'Machine History',
    icon: Gauge
  }] as
  const;
  const handleNavClick = (page: typeof currentPage) => {
    onNavigate(page);
    setIsMobileMenuOpen(false);
  };
  const handleAdminTabClick = (section: AdminSection) => {
    onAdminSectionChange?.(section);
    setIsMobileMenuOpen(false);
  };
  // Short labels for the admin tabs in the header nav
  const adminTabLabel = (label: string) =>
  label.
  replace('Product Management', 'Products').
  replace('Bill Management', 'Bills').
  replace('Customer Management', 'Customers').
  replace('Damaged Products', 'Damaged Products').
  replace('Machine Reset', 'Machine Reset');
  return (
    <header className="sticky top-0 z-50 bg-[#1a1a2e] text-white shadow-lg border-b border-[#2d4059]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo — image only, no text */}
          <div
            className="flex items-center cursor-pointer group"
            onClick={() => !managementMode && handleNavClick('catalog')}>
            
            <img
              src={LOGO_URL}
              alt="Universal Tools"
              className="h-10 w-auto object-contain group-hover:scale-105 transition-transform duration-200" />
            
          </div>

          {/* Desktop Navigation — normal user tabs */}
          {!managementMode &&
          <nav className="hidden lg:flex space-x-1 xl:space-x-3">
              {navItems.map((item) =>
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`relative px-2.5 py-2 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${currentPage === item.id ? 'text-[#f5a623]' : 'text-gray-300 hover:text-white'}`}>
              
                  <item.icon className="w-4 h-4" />
                  {item.label}
                  {currentPage === item.id &&
              <motion.div
                layoutId="nav-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f5a623]" />

              }
                </button>
            )}
            </nav>
          }

          {/* Desktop Navigation — Admin Dashboard tabs */}
          {managementMode &&
          <nav className="hidden lg:flex space-x-2">
              {ADMIN_SECTIONS.map((s) =>
            <button
              key={s.id}
              onClick={() => handleAdminTabClick(s.id)}
              className={`relative px-3 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${adminSection === s.id ? 'text-[#f5a623]' : 'text-gray-300 hover:text-white'}`}>
              
                  <s.icon className="w-4 h-4" />
                  {adminTabLabel(s.label)}
                  {adminSection === s.id &&
              <motion.div
                layoutId="admin-nav-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f5a623]" />

              }
                </button>
            )}
            </nav>
          }

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {!managementMode &&
            <button
              onClick={() => handleNavClick('cart')}
              className="relative p-2 text-gray-300 hover:text-[#f5a623] transition-colors"
              aria-label="Shopping Cart">
              
                <ShoppingCart className="h-6 w-6" />
                {cartCount > 0 &&
              <motion.span
                initial={{
                  scale: 0
                }}
                animate={{
                  scale: 1
                }}
                className="absolute -top-1 -right-1 bg-[#f5a623] text-[#1a1a2e] text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#1a1a2e]">
                
                    {cartCount}
                  </motion.span>
              }
              </button>
            }

            {isSuperUser &&
            <button
              onClick={onToggleManagement}
              className={`relative p-2 transition-colors ${managementMode ? 'text-[#f5a623]' : 'text-gray-300 hover:text-[#f5a623]'}`}
              aria-label="Management mode"
              title="Management mode">
              
                <Settings
                className={`h-6 w-6 ${managementMode ? 'animate-[spin_4s_linear_infinite]' : ''}`} />
              
              </button>
            }

            <div className="h-6 w-px bg-gray-700 hidden lg:block" />

            <button
              onClick={onLogout}
              className="hidden lg:flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium">
              
              <LogOut className="w-4 h-4" />
              Logout
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-gray-300 hover:text-white">
              
              {isMobileMenuOpen ?
              <X className="w-6 h-6" /> :

              <Menu className="w-6 h-6" />
              }
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen &&
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
          className="lg:hidden bg-[#2d4059] border-t border-gray-700 overflow-hidden">
          
            <div className="px-4 pt-2 pb-6 space-y-1">
              {!managementMode &&
            navItems.map((item) =>
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`block w-full text-left px-3 py-3 rounded-md text-base font-medium ${currentPage === item.id ? 'bg-[#1a1a2e] text-[#f5a623]' : 'text-gray-300 hover:bg-[#1a1a2e] hover:text-white'}`}>
              
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </div>
                  </button>
            )}
              {managementMode &&
            ADMIN_SECTIONS.map((s) =>
            <button
              key={s.id}
              onClick={() => handleAdminTabClick(s.id)}
              className={`block w-full text-left px-3 py-3 rounded-md text-base font-medium ${adminSection === s.id ? 'bg-[#1a1a2e] text-[#f5a623]' : 'text-gray-300 hover:bg-[#1a1a2e] hover:text-white'}`}>
              
                    <div className="flex items-center gap-3">
                      <s.icon className="w-5 h-5" />
                      {s.label}
                    </div>
                  </button>
            )}
              <button
              onClick={onLogout}
              className="block w-full text-left px-3 py-3 rounded-md text-base font-medium text-red-400 hover:bg-[#1a1a2e] hover:text-red-300 mt-4 border-t border-gray-600">
              
                <div className="flex items-center gap-3">
                  <LogOut className="w-5 h-5" />
                  Logout
                </div>
              </button>
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </header>);

}