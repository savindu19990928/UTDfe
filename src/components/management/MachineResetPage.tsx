
import React, { useEffect } from 'react';
import {
  Loader2,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Gauge,
  CheckCircle2 } from
'lucide-react';
import { useMachines } from '../../hooks/useMachines';
import { Pagination } from '../Pagination';

export function MachineResetPage() {
  const [page, setPage] = React.useState(1);
  const { machines, loading, error, resettingId, fetchExceeded, resetMachine, totalCount, currentPage, totalPages } =
  useMachines();

  useEffect(() => {
    fetchExceeded(undefined, page);
  }, [fetchExceeded, page]);

  const handleReset = async (id: number) => {
    const ok = await resetMachine(id);
    if (ok) {
      // Refresh the list so the reset machine drops off
      fetchExceeded(undefined, page);
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#1a1a2e] flex items-center gap-2">
            <Gauge className="w-5 h-5 text-[#f5a623]" />
            Machines — Max Use Exceeded
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Active machines that have reached or exceeded their max use count.
            Reset their used count to bring them back into service.
          </p>
        </div>
        <button
          onClick={() => fetchExceeded(undefined, page)}
          className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 self-start">
          
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error &&
      <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      }

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading && machines.length === 0 ?
        <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div> :
        machines.length === 0 ?
        <div className="text-center py-16 text-gray-400">
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
            No machines have exceeded their max use count.
          </div> :

        <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase">
                <th className="px-4 py-3">Machine</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-center">Used / Max</th>
                <th className="px-4 py-3 text-center">Lifetime Uses</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {machines.map((m) =>
            <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-[#1a1a2e]">
                      {m.machine_number}
                    </span>
                    {m.is_currently_rented &&
                <span className="ml-2 text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase">
                        Rented
                      </span>
                }
                    {m.is_damaged &&
                <span className="ml-2 text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase">
                        Damaged
                      </span>
                }
                  </td>
                  <td className="px-4 py-3 font-medium text-[#1a1a2e]">
                    {m.product_name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{m.category_name}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-red-600">
                      {m.used_count}
                    </span>
                    <span className="text-gray-400"> / {m.max_use_count}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {m.total_used_count}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                  onClick={() => handleReset(m.id)}
                  disabled={resettingId === m.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#2d4059] hover:bg-[#1a1a2e] transition-colors disabled:opacity-60">
                  
                      {resettingId === m.id ?
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> :

                  <RotateCcw className="w-3.5 h-3.5" />
                  }
                      {resettingId === m.id ? 'Resetting...' : 'Reset'}
                    </button>
                  </td>
                </tr>
            )}
            </tbody>
          </table>
        }
        
        {!loading && machines.length > 0 &&
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          onPageChange={setPage} />

        }
      </div>
    </div>);

}