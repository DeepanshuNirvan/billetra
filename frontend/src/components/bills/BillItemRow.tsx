import { Trash2 } from 'lucide-react';
import { type BillItem, type Product } from '../../types';
import { calculateItemTotals } from '../../utils/gst';
import { formatCurrency } from '../../utils/format';
import { GST_RATES, UNIT_TYPES } from '../../utils/constants';
import { SearchableSelect } from '../ui/SearchableSelect';
import { clsx } from 'clsx';

interface BillItemRowProps {
  item: BillItem;
  index: number;
  products: Product[];
  onChange: (index: number, item: BillItem) => void;
  onRemove: (index: number) => void;
  gstOnWhole?: boolean;
  billGstRate?: number;
}

export function BillItemRow({
  item,
  index,
  products,
  onChange,
  onRemove,
  gstOnWhole,
  billGstRate,
}: BillItemRowProps) {
  const update = (field: Partial<BillItem>) => {
    const gstRate = gstOnWhole ? 0 : (field.gstRate ?? item.gstRate);
    const updated = calculateItemTotals({ ...item, ...field, gstRate });
    onChange(index, updated);
  };

  const handleProductSelect = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      update({ productId: '', name: '', hsnCode: '', price: 0, gstRate: 0, unit: '' });
      return;
    }
    update({
      productId: product.id,
      name: product.name,
      hsnCode: product.hsnCode ?? '',
      price: product.sellingPrice,
      gstRate: gstOnWhole ? 0 : (product.gstRate ?? 0),
      unit: product.unitType,
    });
  };

  const productOptions = products.map((p) => ({
    value: p.id,
    label: p.name,
    sublabel: p.sellingPrice ? `₹${p.sellingPrice}` : undefined,
  }));

  const inputCls =
    'w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white';
  const disabledCls = 'opacity-60 bg-gray-50 cursor-not-allowed';

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/50">
      {/* Product searchable dropdown */}
      <td className="px-3 py-2 min-w-[160px]">
        <SearchableSelect
          value={item.productId ?? ''}
          onChange={handleProductSelect}
          options={productOptions}
          placeholder="Select product"
          searchPlaceholder="Search products..."
          emptyLabel="Custom item"
        />
      </td>

      {/* Name */}
      <td className="px-3 py-2">
        <input
          type="text"
          value={item.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Item name"
          className={clsx(inputCls, 'min-w-[130px]')}
        />
      </td>

      {/* HSN */}
      <td className="px-3 py-2">
        <input
          type="text"
          value={item.hsnCode ?? ''}
          onChange={(e) => update({ hsnCode: e.target.value })}
          placeholder="HSN"
          className={clsx(inputCls, 'w-20')}
        />
      </td>

      {/* Qty */}
      <td className="px-3 py-2">
        <input
          type="number"
          value={item.quantity}
          min={0.01}
          step="any"
          onChange={(e) => update({ quantity: parseFloat(e.target.value) || 0 })}
          className={clsx(inputCls, 'w-20')}
        />
      </td>

      {/* Unit */}
      <td className="px-3 py-2">
        <select
          value={item.unit ?? ''}
          onChange={(e) => update({ unit: e.target.value })}
          className={clsx(inputCls, 'w-24')}
        >
          <option value="">Unit</option>
          {UNIT_TYPES.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </td>

      {/* Price */}
      <td className="px-3 py-2">
        <input
          type="number"
          value={item.price}
          min={0}
          step="any"
          onChange={(e) => update({ price: parseFloat(e.target.value) || 0 })}
          className={clsx(inputCls, 'w-24')}
        />
      </td>

      {/* Discount */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <select
            value={item.discountType}
            onChange={(e) => update({ discountType: e.target.value as 'fixed' | 'percent' })}
            className={clsx(inputCls, 'w-14')}
          >
            <option value="percent">%</option>
            <option value="fixed">₹</option>
          </select>
          <input
            type="number"
            value={item.discountValue}
            min={0}
            step="any"
            onChange={(e) => update({ discountValue: parseFloat(e.target.value) || 0 })}
            className={clsx(inputCls, 'w-16')}
          />
        </div>
      </td>

      {/* GST% – disabled when gstOnWhole */}
      <td className="px-3 py-2">
        {gstOnWhole ? (
          <div className={clsx(inputCls, 'w-20 flex items-center justify-center', disabledCls)}>
            {billGstRate ?? 0}%
          </div>
        ) : (
          <select
            value={item.gstRate}
            onChange={(e) => update({ gstRate: parseFloat(e.target.value) })}
            className={clsx(inputCls, 'w-20')}
          >
            {GST_RATES.map((r) => (
              <option key={r} value={r}>
                {r}%
              </option>
            ))}
          </select>
        )}
      </td>

      {/* Amount */}
      <td className="px-3 py-2 text-right font-semibold text-gray-800 whitespace-nowrap">
        {formatCurrency(item.total)}
      </td>

      {/* Remove */}
      <td className="px-3 py-2">
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}
