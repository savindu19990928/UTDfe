

import React, { lazy, Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Bill, DamageRecord } from '../../types';
import { ProductManagement } from './ProductManagement';
import { ReportsPage } from './ReportsPage';
import { BillManagement } from './BillManagement';
import { MachineResetPage } from './MachineResetPage';
import { BulkSmsPage } from './BulkSmsPage';
import { ADMIN_SECTIONS, AdminSection } from './adminSections';

const CashManagementPage = lazy(() =>
import('./CashManagementPage').then((m) => ({
  default: m.CashManagementPage
}))
);
const DamageTracker = lazy(() =>
import('../DamageTracker').then((m) => ({
  default: m.DamageTracker
}))
);
const CustomerManager = lazy(() =>
import('../CustomerManager').then((m) => ({
  default: m.CustomerManager
}))
);

interface ManagementDashboardProps {
  section: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  onExit: () => void;
  onViewBill: (bill: Bill) => void;
  damages: DamageRecord[];
  onAddDamage: (damage: DamageRecord) => void;
}

const SectionFallback = () =>
<div className="flex items-center justify-center py-20">
    <div className="w-8 h-8 border-3 border-gray-200 border-t-[#f5a623] rounded-full animate-spin" />
  </div>;


export function ManagementDashboard({
  section,
  onSectionChange,
  onExit,
  onViewBill,
  damages,
  onAddDamage
}: ManagementDashboardProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8 no-print">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold bg-[#f5a623] text-[#1a1a2e] px-2 py-0.5 rounded uppercase tracking-wide">
              Management Mode
            </span>
          </div>
          <h1 className="text-3xl font-bold text-[#1a1a2e]">
            Admin Dashboard
          </h1>
        </div>
        <button
          onClick={onExit}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">
          
          <ArrowLeft className="w-4 h-4" /> Exit
        </button>
      </div>

      {/* Section switcher */}

      {section === 'products' && <ProductManagement />}
      {section === 'bills' && <BillManagement onViewBill={onViewBill} />}
      {section === 'customers' &&
      <Suspense fallback={<SectionFallback />}>
          <CustomerManager isAdmin />
        </Suspense>
      }
      {section === 'sms' && <BulkSmsPage />}
      {section === 'damages' &&
      <Suspense fallback={<SectionFallback />}>
          <DamageTracker damages={damages} onAddDamage={onAddDamage} />
        </Suspense>
      }
      {section === 'machines' && <MachineResetPage />}
      {section === 'cash' &&
      <Suspense fallback={<SectionFallback />}>
          <CashManagementPage />
        </Suspense>
      }
      {section === 'reports' && <ReportsPage />}
    </div>);

}