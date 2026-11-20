

import {
  Package,
  FileText,
  ArrowLeftRight,
  Banknote,
  MessageSquare,
  Users
} from 'lucide-react';

export type AdminSection =
  | 'products'
  | 'stock_movements'
  | 'users'
  | 'sms'
  | 'cash'
  | 'reports';

export const ADMIN_SECTIONS: {
  id: AdminSection;
  label: string;
  icon: typeof Package;
  desc: string;
}[] = [
  {
    id: 'products',
    label: 'Product Management',
    icon: Package,
    desc: 'Create, edit and remove sale & rental products.'
  },
  {
    id: 'stock_movements',
    label: 'Stock Movements',
    icon: ArrowLeftRight,
    desc: 'View, add, edit and delete inventory stock movements.'
  },
  {
    id: 'users',
    label: 'User Management',
    icon: Users,
    desc: 'Create, edit, promote, deactivate and delete user accounts.'
  },
  {
    id: 'sms',
    label: 'Bulk SMS',
    icon: MessageSquare,
    desc: 'Send a custom SMS to all active customers.'
  },
  {
    id: 'cash',
    label: 'Cash Management',
    icon: Banknote,
    desc: 'Count and reconcile the active cash register.'
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: FileText,
    desc: 'Generate and export PDF & Excel reports.'
  }
];