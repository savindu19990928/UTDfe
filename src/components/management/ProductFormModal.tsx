
import React, { useEffect, useState, useRef } from 'react';
import { X, Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Product, ApiCategory } from '../../types';
import { useProductAdmin, MachineInput } from '../../hooks/useProductAdmin';

type ProductKind = 'sale' | 'rental_machines' | 'rental_bulk';

interface ProductFormModalProps {
  mode: 'create' | 'edit';
  kind: ProductKind;
  product?: Product | null;
  categories: ApiCategory[];
  onClose: () => void;
  onSaved: () => void;
}

const KIND_LABEL: Record<ProductKind, string> = {
  sale: 'Sale Product',
  rental_machines: 'Rental Product (Machines)',
  rental_bulk: 'Rental Product (Bulk / No Machines)'
};

export function ProductFormModal({
  mode,
  kind,
  product,
  categories,
  onClose,
  onSaved
}: ProductFormModalProps) {
  const {
    submitting,
    error,
    setError,
    createSaleProduct,
    createRentalProductWithMachines,
    createRentalProductBulk,
    updateProduct
  } = useProductAdmin();

  const [name, setName] = useState(product?.name || '');
  const [categoryId, setCategoryId] = useState<string>(
    product?.categoryId ? String(product.categoryId) : ''
  );
  const [unit, setUnit] = useState('pcs');
  const [price, setPrice] = useState<string>(
    kind === 'sale' ?
      String(product?.salePrice ?? '') :
      String(product?.rentPricePerDay ?? '')
  );
  const [isStockTracked, setIsStockTracked] = useState(
    product?.isStockTracked ?? true
  );
  const [initialStock, setInitialStock] = useState<string>('');
  const [barcode, setBarcode] = useState<string>(product?.barcode || '');
  const scannerRef = useRef<HTMLInputElement>(null);
  const [machines, setMachines] = useState<MachineInput[]>(() => {
    if (mode === 'edit' && product?.machines && product.machines.length > 0) {
      return product.machines.map((m) => ({
        id: m.id,
        machine_number: m.machine_number,
        max_use_count: m.max_use_count
      }));
    }
    return [{ machine_number: '', max_use_count: 10 }];
  });
  const [categoryTouched, setCategoryTouched] = useState(false);

  useEffect(() => {
    if (categories.length === 0 || categoryTouched) return;

    if (mode === 'edit' && product) {
      const idMatch = product.categoryId ?
        categories.find((category) => String(category.id) === String(product.categoryId)) :
        undefined;
      const nameMatch = categories.find(
        (category) =>
          category.name.trim().toLowerCase() === product.category.trim().toLowerCase()
      );
      const resolvedCategory = idMatch || nameMatch;
      setCategoryId(resolvedCategory ? String(resolvedCategory.id) : '');
      return;
    }

    if (!categoryId) setCategoryId(String(categories[0].id));
  }, [categories, categoryId, categoryTouched, mode, product]);

  useEffect(() => {
    if (kind === 'sale') {
      const timer = setTimeout(() => {
        scannerRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [kind]);

  const addMachineRow = () =>
    setMachines((prev) => [...prev, { machine_number: '', max_use_count: 10 }]);
  const removeMachineRow = (idx: number) => {
    setMachines((prev) => {
      const newMachines = [...prev];
      if (newMachines[idx].id) {
        newMachines[idx] = { ...newMachines[idx], delete: true };
      } else {
        newMachines.splice(idx, 1);
      }
      return newMachines;
    });
  };
  const updateMachineRow = (
    idx: number,
    field: keyof MachineInput,
    value: string) =>

    setMachines((prev) =>
      prev.map((m, i) =>
        i === idx ?
          {
            ...m,
            [field]:
              field === 'max_use_count' ? parseInt(value || '0', 10) : value
          } :
          m
      )
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Product name is required.');
    if (!categoryId) return setError('Please select a category.');
    if (!price || parseFloat(price) < 0)
      return setError('Please enter a valid price.');

    try {
      if (mode === 'edit' && product) {
        const parsedCategoryId = Number(categoryId);
        if (!Number.isInteger(parsedCategoryId)) {
          return setError('Please select a valid category.');
        }
        const payload = {
          name: name.trim(),
          category: parsedCategoryId,
          price: parseFloat(price).toFixed(2),
          ...(kind === 'rental_machines' ?
            {
              machines: machines.filter(
                (machine) => machine.machine_number.trim() || machine.delete
              )
            } :
            {})
        };
        await updateProduct(product.id, payload);
        onSaved();
        return;
      }

      if (kind === 'sale') {
        const payload: any = {
          name: name.trim(),
          category: parseInt(categoryId, 10),
          unit,
          price: parseFloat(price).toFixed(2),
          is_stock_tracked: isStockTracked,
          initial_stock: initialStock ? parseFloat(initialStock) : undefined
        };
        if (barcode.trim()) {
          payload.barcode = barcode.trim();
        }
        await createSaleProduct(payload);
      } else if (kind === 'rental_machines') {
        const validMachines = machines.filter((m) => m.machine_number.trim());
        if (validMachines.length === 0)
          return setError('Add at least one machine number.');
        await createRentalProductWithMachines({
          name: name.trim(),
          category: parseInt(categoryId, 10),
          unit,
          price: parseFloat(price).toFixed(2),
          machines: validMachines
        });
      } else {
        await createRentalProductBulk({
          name: name.trim(),
          category: parseInt(categoryId, 10),
          unit,
          price: parseFloat(price).toFixed(2),
          is_stock_tracked: true,
          initial_stock: initialStock ? parseFloat(initialStock) : undefined
        });
      }
      onSaved();
    } catch {

      /* error surfaced by hook */
}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-[#1a1a2e]">
            {mode === 'edit' ? 'Edit' : 'New'} {KIND_LABEL[kind]}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1"
            aria-label="Close">

            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error &&
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          }

          <div>
            <label className="text-sm font-bold text-gray-700 block mb-1">
              Name
            </label>
            <input
              id="product-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none"
              placeholder="e.g. Hammer Drill" />

          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-gray-700 block mb-1">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryTouched(true);
                  setCategoryId(e.target.value);
                }}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none bg-white">

                <option value="">Select...</option>
                {categories.map((c) =>
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                )}
              </select>
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700 block mb-1">
                {kind === 'sale' ? 'Price' : 'Price / Day'}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none"
                placeholder="0.00" />

            </div>
          </div>

          {mode === 'create' &&
            <>
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-1">
                  Unit
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none bg-white">

                  <option value="pcs">Pieces</option>
                  <option value="kg">Kilograms</option>
                  <option value="m">Meters</option>
                  <option value="l">Liters</option>
                  <option value="box">Box</option>
                  <option value="set">Set</option>
                  <option value="pair">Pair</option>
                </select>
              </div>

              {kind === 'sale' &&
                <>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-bold text-gray-700 block">
                        Barcode (Scanned)
                      </label>
                      {barcode && (
                        <button
                          type="button"
                          onClick={() => {
                            setBarcode('');
                            scannerRef.current?.focus();
                          }}
                          className="text-xs text-red-500 hover:text-red-700 font-bold"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div 
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 flex items-center min-h-[46px] cursor-pointer"
                      onClick={() => scannerRef.current?.focus()}
                      title="Click here to scan barcode"
                    >
                      {barcode ? (
                        <span className="font-mono text-[#1a1a2e] font-bold">{barcode}</span>
                      ) : (
                        <span className="italic text-sm">Ready to scan...</span>
                      )}
                    </div>
                    <input
                      ref={scannerRef}
                      type="text"
                      className="opacity-0 absolute w-0 h-0"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (e.currentTarget.value.trim()) {
                            setBarcode(e.currentTarget.value.trim());
                            e.currentTarget.value = '';
                            document.getElementById('product-name-input')?.focus();
                          }
                        }
                      }}
                    />
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isStockTracked}
                      onChange={(e) => setIsStockTracked(e.target.checked)}
                      className="w-4 h-4 text-[#f5a623] rounded" />

                    <span className="text-sm font-medium text-gray-700">
                      Track stock
                    </span>
                  </label>
                  {isStockTracked &&
                    <div>
                      <label className="text-sm font-bold text-gray-700 block mb-1">
                        Initial Stock
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={initialStock}
                        onChange={(e) => setInitialStock(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none"
                        placeholder="0" />

                    </div>
                  }
                </>
              }

              {kind === 'rental_bulk' &&
                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-1">
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={initialStock}
                    onChange={(e) => setInitialStock(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none"
                    placeholder="0" />

                </div>
              }
            </>
          }

          {kind === 'rental_machines' &&
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-gray-700">
                  Machines
                </label>
                <button
                  type="button"
                  onClick={addMachineRow}
                  className="flex items-center gap-1 text-xs font-bold text-[#f5a623] hover:underline">

                  <Plus className="w-3.5 h-3.5" /> Add Machine
                </button>
              </div>
              <div className="space-y-2">
                {machines.map((m, idx) => {
                  if (m.delete) return null;
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        value={m.machine_number}
                        onChange={(e) =>
                          updateMachineRow(idx, 'machine_number', e.target.value)
                        }
                        placeholder="Machine No. (e.g. M01)"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f5a623] outline-none" />

                      <input
                        type="number"
                        min="1"
                        value={m.max_use_count}
                        onChange={(e) =>
                          updateMachineRow(idx, 'max_use_count', e.target.value)
                        }
                        placeholder="Max uses"
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f5a623] outline-none" />

                      <button
                        type="button"
                        onClick={() => removeMachineRow(idx)}
                        className="text-gray-400 hover:text-red-500 p-1">

                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>);
                })}
              </div>
            </div>
          }

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50">

              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-[#f5a623] hover:bg-[#d4901e] disabled:opacity-60 text-[#1a1a2e] rounded-lg font-bold flex items-center justify-center gap-2">

              {submitting ?
                <Loader2 className="w-4 h-4 animate-spin" /> :
                mode === 'edit' ?
                  'Save Changes' :

                  'Create Product'
              }
            </button>
          </div>
        </form>
      </motion.div>
    </div>);

}