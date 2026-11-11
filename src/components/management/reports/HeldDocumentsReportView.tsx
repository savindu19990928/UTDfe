import { useState, useMemo } from 'react';
import {
  FileCheck,
  CreditCard,
  Plane,
  Car,
  Search,
  Phone,
  FileText,
  Users
} from 'lucide-react';
import { HeldDocumentsReportData, HeldDocumentCustomer } from '../../../types/reports';

interface HeldDocumentsReportViewProps {
  data: HeldDocumentsReportData;
  endDate?: string;
}

export function HeldDocumentsReportView({
  data,
  endDate
}: HeldDocumentsReportViewProps) {
  const [search, setSearch] = useState('');
  const [docFilter, setDocFilter] = useState<'all' | 'nic' | 'passport' | 'driving_licence'>('all');

  const customers: HeldDocumentCustomer[] = useMemo(() => {
    return Array.isArray(data?.customers) ? data.customers : [];
  }, [data]);

  const filteredCustomers = useMemo(() => {
    let result = customers;

    if (docFilter === 'nic') {
      result = result.filter(
        (c) =>
          c.taken_id?.toLowerCase().includes('nic') ||
          c.taken_id_types?.some((t) => t.toLowerCase().includes('nic'))
      );
    } else if (docFilter === 'passport') {
      result = result.filter(
        (c) =>
          c.taken_id?.toLowerCase().includes('passport') ||
          c.taken_id_types?.some((t) => t.toLowerCase().includes('passport'))
      );
    } else if (docFilter === 'driving_licence') {
      result = result.filter(
        (c) =>
          c.taken_id?.toLowerCase().includes('driving') ||
          c.taken_id?.toLowerCase().includes('licence') ||
          c.taken_id?.toLowerCase().includes('license') ||
          c.taken_id_types?.some(
            (t) =>
              t.toLowerCase().includes('driving') ||
              t.toLowerCase().includes('licence') ||
              t.toLowerCase().includes('license')
          )
      );
    }

    if (!search.trim()) return result;
    const q = search.toLowerCase().trim();

    return result.filter((c) => {
      const name = (c.customer_name || '').toLowerCase();
      const mobile = (c.mobile_number || '').toLowerCase();
      const nic = (c.nic_number || '').toLowerCase();
      const doc = (c.taken_id || '').toLowerCase();
      const billsStr = (c.bills || [c.bill_number]).filter(Boolean).join(' ').toLowerCase();

      return (
        name.includes(q) ||
        mobile.includes(q) ||
        nic.includes(q) ||
        doc.includes(q) ||
        billsStr.includes(q)
      );
    });
  }, [customers, search, docFilter]);

  // KPIs
  const totalCustomers = data?.total_customers ?? customers.length;
  const totalNic =
    data?.total_nic ??
    customers.filter((c) => c.taken_id?.toLowerCase().includes('nic')).length;
  const totalPassport =
    data?.total_passport ??
    customers.filter((c) => c.taken_id?.toLowerCase().includes('passport')).length;
  const totalDriving =
    data?.total_driving_licence ??
    customers.filter(
      (c) =>
        c.taken_id?.toLowerCase().includes('driving') ||
        c.taken_id?.toLowerCase().includes('licence')
    ).length;

  const targetDateLabel =
    endDate || data?.end_date || new Date().toISOString().split('T')[0];

  const getDocBadge = (doc: string) => {
    const lower = (doc || '').toLowerCase();
    if (lower.includes('nic')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
          <CreditCard className="w-3.5 h-3.5 text-blue-600" />
          NIC
        </span>
      );
    }
    if (lower.includes('passport')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
          <Plane className="w-3.5 h-3.5 text-purple-600" />
          Passport
        </span>
      );
    }
    if (lower.includes('driving') || lower.includes('licence') || lower.includes('license')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <Car className="w-3.5 h-3.5 text-emerald-600" />
          Driving Licence
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200">
        <FileCheck className="w-3.5 h-3.5 text-gray-600" />
        {doc || 'Document'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-slate-50/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Customers with Held IDs
            </span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {totalCustomers}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Active customers currently holding tools
          </p>
        </div>

        {/* Total NIC Held */}
        <div className="bg-white rounded-xl p-5 border border-blue-200 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-blue-50/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-blue-600" />
              NICs Held
            </span>
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-800">
            {totalNic}
          </div>
          <p className="text-xs text-blue-600/80 mt-1">
            National Identity Cards in custody
          </p>
        </div>

        {/* Total Passports Held */}
        <div className="bg-white rounded-xl p-5 border border-purple-200 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-purple-50/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
              <Plane className="w-4 h-4 text-purple-600" />
              Passports Held
            </span>
            <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
              <Plane className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-800">
            {totalPassport}
          </div>
          <p className="text-xs text-purple-600/80 mt-1">
            Passports currently in custody
          </p>
        </div>

        {/* Total Driving Licences Held */}
        <div className="bg-white rounded-xl p-5 border border-emerald-200 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-emerald-50/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
              <Car className="w-4 h-4 text-emerald-600" />
              Driving Licences Held
            </span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <Car className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-800">
            {totalDriving}
          </div>
          <p className="text-xs text-emerald-600/80 mt-1">
            Driving licences currently in custody
          </p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#f5a623]" />
              Customer Held Identification Documents ({filteredCustomers.length})
            </h3>
            <p className="text-xs text-gray-500">
              Customers who have deposited physical identity documents for active rentals
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 no-print">
            {/* Filter pills */}
            <div className="flex items-center bg-gray-200/70 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDocFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  docFilter === 'all'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}>
                All ({customers.length})
              </button>
              <button
                type="button"
                onClick={() => setDocFilter('nic')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  docFilter === 'nic'
                    ? 'bg-white text-blue-700 shadow-sm font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}>
                NIC ({totalNic})
              </button>
              <button
                type="button"
                onClick={() => setDocFilter('passport')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  docFilter === 'passport'
                    ? 'bg-white text-purple-700 shadow-sm font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}>
                Passport ({totalPassport})
              </button>
              <button
                type="button"
                onClick={() => setDocFilter('driving_licence')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  docFilter === 'driving_licence'
                    ? 'bg-white text-emerald-700 shadow-sm font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}>
                Driving Licence ({totalDriving})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search name, phone, NIC, bill..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none w-60"
              />
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <th className="py-3 px-4 w-10 text-center">#</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Mobile Number</th>
                <th className="py-3 px-4">NIC / ID Number</th>
                <th className="py-3 px-4">Taken ID (Document Held)</th>
                <th className="py-3 px-4">Active Rental Bill(s)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-gray-400">
                    No customers found matching the selected filter.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust, idx) => {
                  const billList = (cust.bills || [cust.bill_number]).filter(Boolean);

                  return (
                    <tr
                      key={cust.customer_id || idx}
                      className={`${
                        idx % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'
                      } hover:bg-orange-50/30 transition-colors`}>
                      {/* # */}
                      <td className="py-3 px-4 text-center text-xs text-gray-400 font-mono">
                        {idx + 1}
                      </td>

                      {/* Customer Name */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">
                          {cust.customer_name}
                        </div>
                        {cust.customer_id != null && (
                          <span className="text-[11px] text-gray-400 font-mono">
                            ID #{cust.customer_id}
                          </span>
                        )}
                      </td>

                      {/* Mobile */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <span>{cust.mobile_number || '-'}</span>
                        </div>
                      </td>

                      {/* NIC / ID */}
                      <td className="py-3 px-4 font-mono text-xs text-slate-700">
                        {cust.nic_number || '-'}
                      </td>

                      {/* Taken ID */}
                      <td className="py-3 px-4">
                        {getDocBadge(cust.taken_id)}
                      </td>

                      {/* Active Bills */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {billList.length === 0 ? (
                            <span className="text-xs text-gray-400">-</span>
                          ) : (
                            billList.map((bill, bIdx) => (
                              <span
                                key={bIdx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <FileText className="w-3 h-3 text-amber-600" />
                                {bill}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredCustomers.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-bold text-slate-800 border-t-2 border-gray-200 text-xs">
                  <td colSpan={4} className="py-3 px-4 text-right uppercase tracking-wider text-slate-600">
                    Total Records:
                  </td>
                  <td colSpan={2} className="py-3 px-4 font-black text-slate-900">
                    {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} (NIC: {totalNic}, Passport: {totalPassport}, Driving Licence: {totalDriving})
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

