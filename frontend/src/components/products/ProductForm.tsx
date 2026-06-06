import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useCreateProduct, useUpdateProduct, useCategories } from '../../hooks/useProducts';
import { GST_RATES, UNIT_TYPES } from '../../utils/constants';
import type { Product } from '../../types';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().optional(),
  categoryId: z.string().optional(),
  description: z.string().optional(),
  hsnCode: z.string().optional(),
  unitType: z.string().min(1, 'Unit type is required'),
  customUnit: z.string().optional(),
  sizeVariant: z.string().optional(),
  sellingPrice: z.coerce.number().min(0, 'Must be >= 0'),
  purchasePrice: z.coerce.number().min(0, 'Must be >= 0'),
  gstRate: z.coerce.number(),
  stockQuantity: z.coerce.number().min(0),
  lowStockAlert: z.coerce.number().min(0),
  isActive: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  product?: Product;
}

export function ProductForm({ open, onClose, product }: ProductFormProps) {
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { data: categories = [] } = useCategories();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: product
      ? {
          name: product.name,
          sku: product.sku,
          categoryId: product.categoryId,
          description: product.description,
          hsnCode: product.hsnCode,
          unitType: product.unitType,
          customUnit: product.customUnit,
          sizeVariant: product.sizeVariant,
          sellingPrice: product.sellingPrice,
          purchasePrice: product.purchasePrice,
          gstRate: product.gstRate,
          stockQuantity: product.stockQuantity,
          lowStockAlert: product.lowStockAlert,
          isActive: product.isActive,
        }
      : {
          unitType: 'Pieces',
          gstRate: 18,
          stockQuantity: 0,
          lowStockAlert: 5,
          sellingPrice: 0,
          purchasePrice: 0,
          isActive: true,
        },
  });

  const onSubmit = async (data: FormData) => {
    if (product) {
      await updateProduct.mutateAsync({ id: product.id, payload: data });
    } else {
      await createProduct.mutateAsync(data as any);
    }
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? 'Edit Product' : 'Add Product'}
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="product-form" loading={isSubmitting}>
            {product ? 'Update' : 'Create'} Product
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Product Name" {...register('name')} error={errors.name?.message} required />
          <Input label="SKU" {...register('sku')} error={errors.sku?.message} placeholder="Optional" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Category</label>
            <select
              {...register('categoryId')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <Input label="HSN Code" {...register('hsnCode')} error={errors.hsnCode?.message} placeholder="e.g. 8517" />
        </div>

        <Input label="Description" {...register('description')} error={errors.description?.message} />

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Unit Type <span className="text-red-500">*</span></label>
            <select
              {...register('unitType')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {UNIT_TYPES.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            {errors.unitType && <p className="text-xs text-red-500">{errors.unitType.message}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">GST Rate</label>
            <select
              {...register('gstRate')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Selling Price (₹)"
            type="number"
            step="0.01"
            {...register('sellingPrice')}
            error={errors.sellingPrice?.message}
            required
          />
          <Input
            label="Purchase Price (₹)"
            type="number"
            step="0.01"
            {...register('purchasePrice')}
            error={errors.purchasePrice?.message}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Stock Quantity"
            type="number"
            {...register('stockQuantity')}
            error={errors.stockQuantity?.message}
          />
          <Input
            label="Low Stock Alert At"
            type="number"
            {...register('lowStockAlert')}
            error={errors.lowStockAlert?.message}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            {...register('isActive')}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="isActive" className="text-sm text-gray-700">Active (visible in bills)</label>
        </div>
      </form>
    </Modal>
  );
}
