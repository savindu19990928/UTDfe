import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Search,
  RefreshCw,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  User,
  X,
  Calendar,
  Mail,
  Phone,
  CheckCircle2,
  Ban
} from 'lucide-react';
import { useUsers, UserAccount } from '../../hooks/useUsers';
import { getToken } from '../../utils/auth';
import { Pagination } from '../Pagination';

function getCurrentUserId(): number | null {
  try {
    const token = getToken();
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '='
    );
    const payload = JSON.parse(atob(padded));
    const rawId = payload?.user_id ?? payload?.id ?? null;
    if (rawId == null) return null;
    const num = Number(rawId);
    return Number.isFinite(num) ? num : null;
  } catch {
    return null;
  }
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function UserManagementPage() {
  const currentUserId = useMemo(() => getCurrentUserId(), []);

  // Filters
  const [roleFilter, setRoleFilter] = useState<'' | 'superuser' | 'normal'>('');
  const [activeFilter, setActiveFilter] = useState<'' | 'active' | 'inactive'>(
    ''
  );
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [ordering, setOrdering] = useState('-date_joined');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    users,
    loading,
    error,
    totalCount,
    totalPages,
    submitting,
    actionError,
    setActionError,
    refetch,
    fetchSingleUser,
    createUser,
    updateUser,
    deleteUser
  } = useUsers({
    roleFilter,
    activeFilter,
    search: debouncedSearch,
    ordering,
    page
  });

  // Create / Edit Modal state
  const [formModal, setFormModal] = useState<{
    mode: 'create' | 'edit';
    user?: UserAccount;
  } | null>(null);
  const [formUsername, setFormUsername] = useState('');
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhoneNumber, setFormPhoneNumber] = useState('');
  const [formIsSuperuser, setFormIsSuperuser] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formPassword, setFormPassword] = useState('');
  const [formConfirmPassword, setFormConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formLocalError, setFormLocalError] = useState<string | null>(null);

  // View Modal state
  const [viewUser, setViewUser] = useState<UserAccount | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Delete Confirmation Modal state
  const [deleteTarget, setDeleteTarget] = useState<UserAccount | null>(null);

  const openCreateModal = () => {
    setActionError(null);
    setFormLocalError(null);
    setFormUsername('');
    setFormFirstName('');
    setFormLastName('');
    setFormEmail('');
    setFormPhoneNumber('');
    setFormIsSuperuser(roleFilter === 'superuser');
    setFormIsActive(true);
    setFormPassword('');
    setFormConfirmPassword('');
    setShowPassword(false);
    setFormModal({ mode: 'create' });
  };

  const openEditModal = (u: UserAccount) => {
    setActionError(null);
    setFormLocalError(null);
    setFormUsername(u.username);
    setFormFirstName(u.first_name || '');
    setFormLastName(u.last_name || '');
    setFormEmail(u.email || '');
    setFormPhoneNumber(u.phone_number || '');
    setFormIsSuperuser(u.is_superuser);
    setFormIsActive(u.is_active);
    setFormPassword('');
    setFormConfirmPassword('');
    setShowPassword(false);
    setFormModal({ mode: 'edit', user: u });
  };

  const handleOpenView = async (u: UserAccount) => {
    setViewUser(u);
    setViewLoading(true);
    const fresh = await fetchSingleUser(u.id);
    if (fresh) setViewUser(fresh);
    setViewLoading(false);
  };

  const isEditingSelf =
    formModal?.mode === 'edit' &&
    currentUserId != null &&
    formModal.user?.id === currentUserId;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLocalError(null);
    setActionError(null);

    const trimmedUsername = formUsername.trim();
    if (!trimmedUsername) {
      setFormLocalError('Username is required.');
      return;
    }

    if (formModal?.mode === 'create') {
      if (!formPassword || formPassword.length < 6) {
        setFormLocalError('Password must be at least 6 characters.');
        return;
      }
      if (formPassword !== formConfirmPassword) {
        setFormLocalError('Password and Confirm Password do not match.');
        return;
      }

      try {
        await createUser({
          username: trimmedUsername,
          password: formPassword,
          confirm_password: formConfirmPassword,
          phone_number: formPhoneNumber.trim() || undefined,
          is_superuser: formIsSuperuser,
          email: formEmail.trim() || undefined,
          first_name: formFirstName.trim() || undefined,
          last_name: formLastName.trim() || undefined,
          is_active: formIsActive
        });
        setFormModal(null);
      } catch {
        /* handled by hook actionError */
      }
    } else if (formModal?.mode === 'edit' && formModal.user) {
      try {
        await updateUser(formModal.user.id, {
          username: trimmedUsername,
          email: formEmail.trim(),
          first_name: formFirstName.trim(),
          last_name: formLastName.trim(),
          phone_number: formPhoneNumber.trim(),
          is_superuser: isEditingSelf
            ? formModal.user.is_superuser
            : formIsSuperuser,
          is_active: isEditingSelf ? formModal.user.is_active : formIsActive
        });
        setFormModal(null);
      } catch {
        /* handled by hook actionError */
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      /* handled by hook actionError */
    }
  };

  const hasActiveFilters =
    !!roleFilter ||
    !!activeFilter ||
    !!search ||
    ordering !== '-date_joined';

  const resetFilters = () => {
    setRoleFilter('');
    setActiveFilter('');
    setSearch('');
    setDebouncedSearch('');
    setOrdering('-date_joined');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1a1a2e] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#f5a623]" />
            User Management
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Create and manage Admin and Cashier POS accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-[#f5a623] hover:bg-[#d4901e] text-[#1a1a2e] px-4 py-2.5 rounded-lg font-bold text-sm shadow-sm transition-colors">
            <UserPlus className="w-4 h-4" />
            New User
          </button>
          <button
            type="button"
            onClick={refetch}
            className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg self-start">
            {(
              [
                ['', 'All Users'],
                ['superuser', 'Admins'],
                ['normal', 'Cashiers']
              ] as const
            ).map(([val, label]) => (
              <button
                key={val || 'all'}
                type="button"
                onClick={() => {
                  setRoleFilter(val);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-colors ${roleFilter === val
                  ? 'bg-[#2d4059] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search username, phone number, email, or name..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">
              Account Status
            </label>
            <select
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(
                  e.target.value as '' | 'active' | 'inactive'
                );
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#f5a623] outline-none">
              <option value="">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">
              Sort By
            </label>
            <select
              value={ordering}
              onChange={(e) => {
                setOrdering(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#f5a623] outline-none">
              <option value="-date_joined">Newest Joined</option>
              <option value="date_joined">Oldest Joined</option>
              <option value="username">Username (A–Z)</option>
              <option value="-username">Username (Z–A)</option>
              <option value="-last_login">Recent Login</option>
              <option value="-id">ID (Descending)</option>
            </select>
          </div>

          <div className="flex items-end">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors">
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {(error || (actionError && !formModal && !deleteTarget)) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between gap-2 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{actionError || error}</span>
          </div>
          {actionError && (
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="p-1 text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading && users.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-500">No users found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50 text-xs font-bold text-gray-500 uppercase border-b border-gray-200">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined / Last Login</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => {
                  const fullName = `${u.first_name} ${u.last_name}`.trim();
                  const isSelf = currentUserId != null && u.id === currentUserId;
                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-gray-50/80 ${!u.is_active ? 'opacity-60 bg-gray-50' : ''
                        }`}>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-gray-500">
                        #{u.id}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#1a1a2e]">
                            {u.username}
                          </span>
                          {isSelf && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                              You
                            </span>
                          )}
                        </div>
                        {fullName && (
                          <div className="text-xs text-gray-500">{fullName}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-700 whitespace-nowrap">
                        {u.phone_number || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {u.email || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {u.is_superuser ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                            <User className="w-3.5 h-3.5" />
                            Cashier
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                            <Ban className="w-3 h-3" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        <div>Joined: {formatDateTime(u.date_joined)}</div>
                        <div className="text-[11px] text-gray-400">
                          Last login: {formatDateTime(u.last_login)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenView(u)}
                            className="p-2 text-gray-500 hover:text-[#2d4059] hover:bg-gray-100 rounded-lg transition-colors"
                            title="View Details">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit User">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => {
                              setActionError(null);
                              setDeleteTarget(u);
                            }}
                            className={`p-2 rounded-lg transition-colors ${isSelf
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                              }`}
                            title={
                              isSelf
                                ? 'You cannot delete your own account'
                                : 'Delete User'
                            }>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && users.length > 0 && totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalCount={totalCount}
            itemLabel="users"
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Create / Edit User Modal */}
      {formModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !submitting && setFormModal(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-100 text-[#1a1a2e]">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1a1a2e]">
                    {formModal.mode === 'create'
                      ? 'Create New User'
                      : `Edit User — ${formModal.user?.username}`}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {formModal.mode === 'create'
                      ? 'Set account credentials and choose Cashier or Admin.'
                      : 'Update profile, role, or active state.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !submitting && setFormModal(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleFormSubmit}
              className="p-5 space-y-4 overflow-y-auto">
              {(formLocalError || actionError) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-xs text-red-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{formLocalError || actionError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="e.g. cashier1 or co_admin"
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    placeholder="First name"
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    placeholder="Last name"
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={formPhoneNumber}
                    onChange={(e) => setFormPhoneNumber(e.target.value)}
                    placeholder="e.g. 0771234567"
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Needed for SMS Forgot Password recovery.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none"
                  />
                </div>
              </div>

              {/* Role selector */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">
                  Account Role *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={isEditingSelf}
                    onClick={() => setFormIsSuperuser(false)}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm border-2 transition-all ${!formIsSuperuser
                      ? 'border-[#2d4059] bg-slate-50 text-[#1a1a2e]'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      } ${isEditingSelf ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    <User className="w-4 h-4" />
                    Cashier
                  </button>
                  <button
                    type="button"
                    disabled={isEditingSelf}
                    onClick={() => setFormIsSuperuser(true)}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm border-2 transition-all ${formIsSuperuser
                      ? 'border-purple-600 bg-purple-50 text-purple-900'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      } ${isEditingSelf ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    <ShieldCheck className="w-4 h-4" />
                    Admin
                  </button>
                </div>
                {isEditingSelf && (
                  <p className="text-[11px] text-amber-700 mt-1.5">
                    You cannot remove your own Admin role.
                  </p>
                )}
              </div>

              {/* Active Status */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <label
                  className={`flex items-center gap-2.5 ${isEditingSelf ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                    }`}>
                  <input
                    type="checkbox"
                    disabled={isEditingSelf}
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 text-[#f5a623] border-gray-300 rounded focus:ring-[#f5a623]"
                  />
                  <span className="text-sm font-bold text-[#1a1a2e]">
                    Account Active
                  </span>
                </label>
                <p className="text-[11px] text-gray-500 mt-1 ml-6">
                  {isEditingSelf
                    ? 'You cannot deactivate your own active account.'
                    : 'Uncheck to disable login access without deleting the account.'}
                </p>
              </div>

              {/* Password & Confirm Password (Create only) */}
              {formModal.mode === 'create' && (
                <div className="border-t border-gray-100 pt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase">
                      Password * (min 6 characters)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 font-medium">
                      {showPassword ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" /> Hide
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" /> Show
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none"
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formConfirmPassword}
                      onChange={(e) => setFormConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setFormModal(null)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg font-bold text-sm text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-[#f5a623] hover:bg-[#d4901e] disabled:opacity-60 text-[#1a1a2e] rounded-lg font-bold text-sm flex items-center justify-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {formModal.mode === 'create' ? 'Create User' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View User Details Modal */}
      {viewUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setViewUser(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-lg ${viewUser.is_superuser
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-slate-100 text-slate-700'
                    }`}>
                  {viewUser.is_superuser ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1a1a2e]">
                    {viewUser.username}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {viewLoading ? 'Refreshing...' : `User #${viewUser.id}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewUser(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">
                    Role
                  </span>
                  <span className="font-bold text-[#1a1a2e]">
                    {viewUser.is_superuser ? 'Admin' : 'Cashier'}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">
                    Status
                  </span>
                  <span
                    className={`font-bold ${viewUser.is_active ? 'text-emerald-700' : 'text-red-600'
                      }`}>
                    {viewUser.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 space-y-2">
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">
                    Full Name
                  </span>
                  <span className="font-medium text-slate-800">
                    {`${viewUser.first_name} ${viewUser.last_name}`.trim() ||
                      '—'}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200/60 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="font-mono">{viewUser.phone_number || '—'}</span>
                </div>
                <div className="pt-2 border-t border-gray-200/60 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{viewUser.email || '—'}</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 space-y-1.5 text-xs text-gray-600">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-gray-400">
                    <Calendar className="w-3.5 h-3.5" /> Date Joined
                  </span>
                  <span className="font-medium text-slate-800">
                    {formatDateTime(viewUser.date_joined)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-gray-400">
                    <Calendar className="w-3.5 h-3.5" /> Last Login
                  </span>
                  <span className="font-medium text-slate-800">
                    {formatDateTime(viewUser.last_login)}
                  </span>
                </div>
                {/* <div className="flex items-center justify-between">
                  <span className="text-gray-400">Staff Flag</span>
                  <span className="font-medium text-slate-800">
                    {viewUser.is_staff ? 'Yes' : 'No'}
                  </span>
                </div> */}
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-3">
              <button
                type="button"
                onClick={() => setViewUser(null)}
                className="flex-1 py-2.5 bg-white border border-gray-300 rounded-lg font-bold text-sm text-gray-700 hover:bg-gray-100">
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = viewUser;
                  setViewUser(null);
                  openEditModal(target);
                }}
                className="flex-1 py-2.5 bg-[#2d4059] hover:bg-[#1a1a2e] text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2">
                <Edit className="w-4 h-4" />
                Edit User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !submitting && setDeleteTarget(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2.5 rounded-full">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-[#1a1a2e]">Delete User</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Permanently delete user{' '}
              <span className="font-bold">{deleteTarget.username}</span>? This
              cannot be undone.
            </p>
            {actionError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-start gap-2 text-xs text-red-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{actionError}</span>
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg font-bold flex items-center justify-center gap-2">
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
