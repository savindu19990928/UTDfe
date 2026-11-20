import { useState, useMemo } from 'react';
import {
  ShieldCheck,
  User,
  Activity,
  Users,
  Search,
  Layers,
  Phone,
  Mail,
  Clock,
  Tag,
  KeyRound
} from 'lucide-react';
import {
  AuditLogReportData,
  UserActivityAction,
  AllUsersSummaryItem
} from '../../../types/reports';

interface AuditLogReportViewProps {
  data: AuditLogReportData;
  reportType?: 'user_history' | 'all_users_history' | string;
  startDate?: string;
  endDate?: string;
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function getCategoryColor(category: string): {
  bg: string;
  text: string;
  border: string;
} {
  switch (category.toLowerCase()) {
    case 'auth':
      return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' };
    case 'user':
      return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
    case 'sale':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    case 'rental':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    case 'stock':
      return { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' };
    case 'damaged':
      return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' };
    case 'expense':
      return { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' };
    case 'cash_register':
      return { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200' };
    case 'customer':
      return { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' };
    case 'machine':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    case 'category':
      return { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' };
    case 'product':
      return { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' };
    case 'report':
      return { bg: 'bg-lime-50', text: 'text-lime-800', border: 'border-lime-200' };
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
  }
}

function getMethodBadge(method?: string) {
  if (!method) return null;
  const m = method.toUpperCase();
  let color = 'bg-gray-100 text-gray-700';
  if (m === 'POST') color = 'bg-emerald-100 text-emerald-800';
  else if (m === 'GET') color = 'bg-blue-100 text-blue-800';
  else if (m === 'PUT' || m === 'PATCH') color = 'bg-amber-100 text-amber-800';
  else if (m === 'DELETE') color = 'bg-rose-100 text-rose-800';
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${color}`}>
      {m}
    </span>
  );
}

export function AuditLogReportView({
  data,
  reportType,
  startDate,
  endDate
}: AuditLogReportViewProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const isSingleUser =
    reportType === 'user_history' || Boolean(data?.user || data?.user_id);
  const user = data?.user;

  const actions: UserActivityAction[] = useMemo(() => {
    return Array.isArray(data?.actions) ? data.actions : [];
  }, [data]);

  const categories = useMemo(() => {
    if (Array.isArray(data?.actions_by_category) && data.actions_by_category.length > 0) {
      return data.actions_by_category;
    }
    const map = new Map<string, { category: string; category_display: string; count: number }>();
    actions.forEach((a) => {
      const cat = a.category || 'other';
      const existing = map.get(cat);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(cat, {
          category: cat,
          category_display: a.category_display || cat,
          count: 1
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [data, actions]);

  const usersSummary: AllUsersSummaryItem[] = useMemo(() => {
    return Array.isArray(data?.users_summary) ? data.users_summary : [];
  }, [data]);

  const filteredActions = useMemo(() => {
    let list = actions;
    if (selectedCategory !== 'all') {
      list = list.filter((a) => (a.category || '').toLowerCase() === selectedCategory.toLowerCase());
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((a) => {
      const matchText = [
        String(a.id || ''),
        a.username || '',
        a.description || '',
        a.category || '',
        a.category_display || '',
        a.action || '',
        a.method || '',
        a.target_model || '',
        String(a.target_id || ''),
        a.path || ''
      ]
        .join(' ')
        .toLowerCase();
      return matchText.includes(q);
    });
  }, [actions, selectedCategory, search]);

  const totalActions = data?.total_actions ?? actions.length;
  const dateRangeLabel =
    startDate || endDate || data?.start_date || data?.end_date
      ? `${startDate || data?.start_date || 'Start'} → ${endDate || data?.end_date || 'Today'}`
      : 'All Dates';

  return (
    <div className="space-y-6">
      {/* If single user report: display User Profile summary card */}
      {isSingleUser && user && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className={`p-3 rounded-xl ${
                  user.is_superuser
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-slate-100 text-slate-800'
                }`}
              >
                {user.is_superuser ? (
                  <ShieldCheck className="w-6 h-6" />
                ) : (
                  <User className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[#1a1a2e]">
                    {user.username}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      user.is_superuser
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {user.is_superuser ? 'Admin' : 'Cashier'}
                  </span>
                  {user.is_active === false && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                      Inactive
                    </span>
                  )}
                </div>
                {user.full_name && (
                  <p className="text-xs text-gray-500 mt-0.5">{user.full_name}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 border-t sm:border-t-0 pt-3 sm:pt-0">
              {user.phone_number && (
                <div className="flex items-center gap-1.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span>{user.phone_number}</span>
                </div>
              )}
              {user.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <span>{user.email}</span>
                </div>
              )}
              {user.last_login && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span>Last Login: {formatDateTime(user.last_login)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Actions */}
        <div className="bg-[#1a1a2e] rounded-xl p-5 border border-slate-700 text-white shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#f5a623] uppercase tracking-wider">
              Total Actions
            </span>
            <div className="p-2 bg-[#f5a623]/20 text-[#f5a623] rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {totalActions.toLocaleString()}
          </div>
          <p className="text-xs text-slate-300 mt-1 truncate">{dateRangeLabel}</p>
        </div>

        {/* Categories Involved */}
        <div className="bg-white rounded-xl p-5 border border-blue-200 shadow-sm bg-gradient-to-br from-white to-blue-50/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Categories
            </span>
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-800">
            {categories.length}
          </div>
          <p className="text-xs text-blue-600/80 mt-1">Activity domains</p>
        </div>

        {/* If all users: Users Count */}
        {!isSingleUser && (
          <>
            <div className="bg-white rounded-xl p-5 border border-purple-200 shadow-sm bg-gradient-to-br from-white to-purple-50/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                  Total Users
                </span>
                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-purple-800">
                {data.total_users_count ?? usersSummary.length}
              </div>
              <p className="text-xs text-purple-600/80 mt-1">System user accounts</p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-emerald-200 shadow-sm bg-gradient-to-br from-white to-emerald-50/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Active Users
                </span>
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <User className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-800">
                {data.active_users_count ??
                  usersSummary.filter((u) => u.is_active !== false).length}
              </div>
              <p className="text-xs text-emerald-600/80 mt-1">Users with activity</p>
            </div>
          </>
        )}

        {/* If single user: Date joined / Auth status card */}
        {isSingleUser && (
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Account Status
              </span>
              <div className="p-2 bg-gray-100 text-gray-700 rounded-lg">
                <KeyRound className="w-5 h-5" />
              </div>
            </div>
            <div className="text-lg font-black text-[#1a1a2e]">
              {user?.is_active !== false ? 'Active' : 'Inactive'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Joined: {user?.date_joined ? formatDateTime(user.date_joined) : '-'}
            </p>
          </div>
        )}
      </div>

      {/* Category breakdown pills */}
      {categories.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-[#f5a623]" />
            <span className="text-xs font-bold text-[#1a1a2e] uppercase tracking-wider">
              Actions by Category
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-[#2d4059] text-white border-[#2d4059]'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              All ({totalActions})
            </button>
            {categories.map((c) => {
              const colors = getCategoryColor(c.category);
              const isSelected = selectedCategory.toLowerCase() === c.category.toLowerCase();
              return (
                <button
                  key={c.category}
                  type="button"
                  onClick={() =>
                    setSelectedCategory(isSelected ? 'all' : c.category)
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    isSelected
                      ? 'bg-[#2d4059] text-white border-[#2d4059] shadow-sm'
                      : `${colors.bg} ${colors.text} ${colors.border} hover:opacity-80`
                  }`}
                >
                  {c.category_display || c.category} ({c.count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* If all users: Users Summary Table */}
      {!isSingleUser && usersSummary.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#f5a623]" />
            <h3 className="text-sm font-bold text-[#1a1a2e] uppercase tracking-wider">
              User Activity Summary ({usersSummary.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50/70 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <th className="px-4 py-2.5">User</th>
                  <th className="px-4 py-2.5">Role</th>
                  <th className="px-4 py-2.5">Phone</th>
                  <th className="px-4 py-2.5 text-right">Total Actions</th>
                  <th className="px-4 py-2.5">Last Action At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {usersSummary.map((u) => {
                  const isAdmin = u.is_superuser || u.role === 'superuser';
                  return (
                    <tr key={u.user_id} className="hover:bg-gray-50/70">
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-[#1a1a2e]">
                          {u.username}
                        </div>
                        {u.full_name && (
                          <div className="text-xs text-gray-500">{u.full_name}</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            isAdmin
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isAdmin ? 'Admin' : 'Cashier'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-600">
                        {u.phone_number || '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-[#2d4059]">
                        {u.total_actions}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                        {formatDateTime(u.last_action_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed Action Log Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#f5a623]" />
            <h3 className="text-sm font-bold text-[#1a1a2e] uppercase tracking-wider">
              Chronological Audit Trail ({filteredActions.length})
            </h3>
          </div>

          <div className="relative no-print">
            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, description, target..."
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#f5a623] outline-none w-64"
            />
          </div>
        </div>

        {filteredActions.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            No audit logs found for the selected period or filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50/70 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <th className="px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">Timestamp</th>
                  {!isSingleUser && <th className="px-3 py-2.5">User</th>}
                  <th className="px-3 py-2.5">Category</th>
                  <th className="px-3 py-2.5">Action</th>
                  <th className="px-3 py-2.5">Target</th>
                  <th className="px-3 py-2.5">Description</th>
                  <th className="px-3 py-2.5">Path</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredActions.map((a, idx) => {
                  const catColor = getCategoryColor(a.category);
                  return (
                    <tr key={String(a.id || idx)} className="hover:bg-gray-50/70">
                      <td className="px-3 py-2.5 text-xs text-gray-400">{idx + 1}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-700 whitespace-nowrap">
                        <div className="font-medium">
                          {a.date || a.created_at ? formatDateTime(a.created_at || a.date) : '-'}
                        </div>
                        {a.time && !a.created_at && (
                          <div className="text-[10px] text-gray-400">{a.time}</div>
                        )}
                      </td>
                      {!isSingleUser && (
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="font-semibold text-[#1a1a2e]">
                            {a.username || `User #${a.user_id}`}
                          </span>
                        </td>
                      )}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${catColor.bg} ${catColor.text} ${catColor.border}`}
                        >
                          {a.category_display || a.category}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {getMethodBadge(a.method)}
                          <span className="font-mono text-xs font-semibold text-[#1a1a2e]">
                            {a.action}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                        {a.target_model ? (
                          <span className="font-mono text-gray-700">
                            {a.target_model}
                            {a.target_id ? ` #${a.target_id}` : ''}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-800 max-w-md">
                        {a.description}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] font-mono text-gray-500 max-w-xs truncate">
                        {a.path || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
