

import {
  Package,
  FileText,
  ReceiptText,
  AlertTriangle,
  Users,
  Gauge,
  Banknote,
  MessageSquare } from
'lucide-react';

export type AdminSection =
'products' |
'bills' |
'customers' |
'sms' |
'damages' |
'machines' |
'cash' |
'reports';

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
  id: 'bills',
  label: 'Bill Management',
  icon: ReceiptText,
  desc: 'Review and cancel sale & rental bills.'
},
{
  id: 'customers',
  label: 'Customer Management',
  icon: Users,
  desc: 'Manage customer profiles, ban & unban customers.'
},
{
  id: 'sms',
  label: 'Bulk SMS',
  icon: MessageSquare,
  desc: 'Send a custom SMS to all active customers.'
},
{
  id: 'damages',
  label: 'Damaged Products',
  icon: AlertTriangle,
  desc: 'Track and manage damaged inventory.'
},
{
  id: 'machines',
  label: 'Machine Reset',
  icon: Gauge,
  desc: 'Reset machines that exceeded their max use count.'
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
  desc: 'Generate and download PDF reports.'
}];