import { useState, useMemo } from 'react';
import {
  Package,
  Wrench,
  DollarSign,
  Users,
  Search,
  Hash,
  Calendar,
  Phone,
  FileText
} from 'lucide-react';
import { RentedItemsReportData, RentedItem } from '../../../types/reports';
import { formatPrice } from '../../../utils/format';

interface RentedItemsReportViewProps {
  data: RentedItemsReportData;
  endDate?: string;
}

export function RentedItemsReportView({
  data,
  endDate
}: RentedItemsReportViewProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'tracked' | 'bulk'>('all');

  const items: RentedItem[] = useMemo(() => {
    return Array.isArray(data?.items) ? data.items : [];
  }, [data]);

  // Helper to determine Machine No vs QTY display information
  const getMachineOrQtyInfo = (item: RentedItem) => {
    const raw = (item.machine_number || '').trim();
    const qty = Number(item.quantity) || 1;

    if (raw && raw !== 'N/A') {
      const isPureNumeric = /^\d+(\.0+)?$/.test(raw);
      if (isPureNumeric && qty > 1) {
        return { text: raw, isTracked: false, isQty: true, isNA: false };
      }
      return { text: raw, isTracked: true, isQty: false, isNA: false };
    }

    if (qty > 1) {
      return { text: String(qty), isTracked: false, isQty: true, isNA: false };
    }

    return { text: 'N/A', isTracked: false, isQty: false, isNA: true };
  };

  const trackedCount = useMemo(() => {
    return items.filter((i) => getMachineOrQtyInfo(i).isTracked).length;
  }, [items]);

  const bulkCount = useMemo(() => {
    return items.filter((i) => !getMachineOrQtyInfo(i).isTracked).length;
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = items;

    if (filterType === 'tracked') {
      result = result.filter((i) => getMachineOrQtyInfo(i).isTracked);
    } else if (filterType === 'bulk') {
      result = result.filter((i) => !getMachineOrQtyInfo(i).isTracked);
    }

    if (!search.trim()) return result;
    const q = search.toLowerCase().trim();

    return result.filter((i) => {
      const info = getMachineOrQtyInfo(i);
      const pName = (i.product_name || '').toLowerCase();
      const iNum = (i.item_number || '').toLowerCase();
      const mNum = (i.machine_number || '').toLowerCase();
      const infoText = info.text.toLowerCase();
      const cName = (i.customer_name || '').toLowerCase();
      const cMobile = (i.customer_mobile || '').toLowerCase();
      const cNic = (i.customer_nic || '').toLowerCase();
      const bNum = (i.bill_number || '').toLowerCase();

      return (
        pName.includes(q) ||
        iNum.includes(q) ||
        mNum.includes(q) ||
        infoText.includes(q) ||
        cName.includes(q) ||
        cMobile.includes(q) ||
        cNic.includes(q) ||
        bNum.includes(q)
      );
    });
  }, [items, search, filterType]);

  // KPIs
  const totalRentedItems = data?.total_rented_items ?? items.reduce((s, i) => s + (Number(i.quantity) || 1), 0);

  const totalDailyValue = useMemo(() => {
    return items.reduce((sum, i) => {
      const rate = Number(i.price_per_day ?? i.price ?? 0);
      const qty = Number(i.quantity) || 1;
      return sum + rate * qty;
    }, 0);
  }, [items]);

  const uniqueCustomers = useMemo(() => {
    const set = new Set(
      items.map((i) => (i.customer_mobile || i.customer_name || '').trim())
    );
    return set.size;
  }, [items]);

  const filteredTotalValue = useMemo(() => {
    return filteredItems.reduce((sum, i) => {
      const rate = Number(i.price_per_day ?? i.price ?? 0);
      const qty = Number(i.quantity) || 1;
      return sum + rate * qty;
    }, 0);
  }, [filteredItems]);

  const filteredTotalQty = useMemo(() => {
    return filteredItems.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);
  }, [filteredItems]);

  const targetDateLabel =
    endDate || data?.target_date || data?.end_date || new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Rented Items */}
        <div className="bg-white rounded-xl p-5 border border-blue-200 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-blue-50/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Total Rented Items
            </span>
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-800">
            {totalRentedItems}
          </div>
          <p className="text-xs text-blue-600/80 mt-1">
            Active items on rent up to {targetDateLabel}
          </p>
        </div>

        {/* Tracked Machines */}
        <div className="bg-white rounded-xl p-5 border border-indigo-200 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-indigo-50/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
              Tracked Machines
            </span>
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-800">
            {trackedCount}
          </div>
          <p className="text-xs text-indigo-600/80 mt-1">
            With unique machine serial number
          </p>
        </div>

        {/* Total Daily Rate Value */}
        <div className="bg-white rounded-xl p-5 border border-emerald-200 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-emerald-50/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Daily Rental Rate
            </span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {formatPrice(totalDailyValue)}
          </div>
          <p className="text-xs text-emerald-600/80 mt-1">
            Combined daily rate across active rentals
          </p>
        </div>

        {/* Active Customers */}
        <div className="bg-white rounded-xl p-5 border border-purple-200 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-purple-50/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
              Active Customers
            </span>
            <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-800">
            {uniqueCustomers}
          </div>
          <p className="text-xs text-purple-600/80 mt-1">
            Holding rented tools as of {targetDateLabel}
          </p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-[#f5a623]" />
              Currently Rented Items ({filteredItems.length})
            </h3>
            <p className="text-xs text-gray-500">
              List of equipment currently rented out up to {targetDateLabel}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 no-print">
            {/* Filter pills */}
            <div className="flex items-center bg-gray-200/70 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filterType === 'all'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}>
                All ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('tracked')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filterType === 'tracked'
                    ? 'bg-white text-indigo-700 shadow-sm font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}>
                Tracked ({trackedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('bulk')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filterType === 'bulk'
                    ? 'bg-white text-gray-700 shadow-sm font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}>
                Bulk ({bulkCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products, machines, customers..."
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
                <th className="py-3 px-4">Rented Product</th>
                <th className="py-3 px-4">Machine No / QTY</th>
                <th className="py-3 px-4 text-right">Price (Per Day)</th>
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">Rental Period</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-gray-400">
                    No rented items found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const info = getMachineOrQtyInfo(item);
                  const rate = Number(item.price_per_day ?? item.price ?? 0);

                  return (
                    <tr
                      key={item.item_id || idx}
                      className={`${
                        idx % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'
                      } hover:bg-orange-50/30 transition-colors`}>
                      {/* # */}
                      <td className="py-3 px-4 text-center text-xs text-gray-400 font-mono">
                        {idx + 1}
                      </td>

                      {/* Product Name & Item Code */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 leading-snug">
                          {item.product_name}
                        </div>
                        {item.item_number && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-gray-100 text-gray-600">
                            {item.item_number}
                          </span>
                        )}
                      </td>

                      {/* Machine No / QTY */}
                      <td className="py-3 px-4">
                        {info.isTracked ? (
                          <span className="inline-flex items-center gap-1 font-mono text-xs font-bold px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Hash className="w-3 h-3 text-indigo-500" />
                            {info.text}
                          </span>
                        ) : info.isQty ? (
                          <span className="inline-flex items-center gap-1 font-mono text-xs font-bold px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200">
                            Qty: {info.text}
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded text-xs font-medium text-gray-400 bg-gray-100">
                            N/A
                          </span>
                        )}
                      </td>

                      {/* Price (Per Day) */}
                      <td className="py-3 px-4 text-right font-bold text-slate-800 tabular-nums">
                        {item.price_per_day_formatted || `${formatPrice(rate)} / day`}
                      </td>

                      {/* Customer Details */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">
                          {item.customer_name || 'Customer'}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 mt-0.5">
                          {item.customer_mobile && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-400" />
                              {item.customer_mobile}
                            </span>
                          )}
                          {item.customer_nic && (
                            <span>· NIC: {item.customer_nic}</span>
                          )}
                        </div>
                        {item.bill_number && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-100">
                              <FileText className="w-3 h-3" />
                              {item.bill_number}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Rental Period */}
                      <td className="py-3 px-4 text-xs">
                        <div className="flex items-center gap-1 text-slate-700 font-medium whitespace-nowrap">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>{item.rental_start_date || '-'}</span>
                          <span className="text-gray-400">→</span>
                          <span>{item.rental_end_date || '-'}</span>
                        </div>
                        {item.days_rented != null && (
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {item.days_rented} day{item.days_rented !== 1 ? 's' : ''} on rent
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredItems.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-bold text-slate-800 border-t-2 border-gray-200 text-xs">
                  <td colSpan={2} className="py-3 px-4 text-right uppercase tracking-wider text-slate-600">
                    Total ({filteredItems.length} items):
                  </td>
                  <td className="py-3 px-4 font-black text-slate-900">
                    {filteredTotalQty} units
                  </td>
                  <td className="py-3 px-4 text-right font-black text-slate-900 tabular-nums">
                    {formatPrice(filteredTotalValue)}
                  </td>
                  <td colSpan={2} className="py-3 px-4 text-xs text-gray-500">
                    Combined daily rate sum
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

