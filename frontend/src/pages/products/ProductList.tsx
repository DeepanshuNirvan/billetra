import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Package, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table, Pagination } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { ProductForm } from '../../components/products/ProductForm';
import { BulkActions } from '../../components/bulk/BulkActions';
import { useProducts, useDeleteProduct, useCategories } from '../../hooks/useProducts';
import { formatCurrency } from '../../utils/format';
import { productsApi } from '../../api/products';
import type { Product } from '../../types';

export default function ProductList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useProducts({ search: search || undefined, categoryId: categoryId || undefined, page, limit: 20 });
  const { data: categories = [] } = useCategories();
  const deleteProduct = useDeleteProduct();

  const products = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleEdit = (p: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditProduct(p);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteProduct.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const getStockBadge = (p: Product) => {
    if (p.stockQuantity === 0) return <Badge color="red">Out of Stock</Badge>;
    if (p.stockQuantity <= p.lowStockAlert) return <Badge color="yellow">Low Stock</Badge>;
    return <Badge color="green">In Stock</Badge>;
  };

  const columns = [
    {
      key: 'name',
      header: 'Product',
      cell: (p: Product) => (
        <div className="flex items-start gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
            <Package className="h-4 w-4 text-primary-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{p.name}</p>
            {p.sku && <p className="text-xs text-gray-400">SKU: {p.sku}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      cell: (p: Product) => <span className="text-gray-600">{p.category?.name ?? '-'}</span>,
    },
    {
      key: 'hsn',
      header: 'HSN',
      cell: (p: Product) => <span className="text-gray-600">{p.hsnCode ?? '-'}</span>,
    },
    {
      key: 'price',
      header: 'Selling Price',
      cell: (p: Product) => <span className="font-semibold text-gray-900">{formatCurrency(p.sellingPrice)}</span>,
    },
    {
      key: 'gst',
      header: 'GST',
      cell: (p: Product) => <Badge color="indigo">{p.gstRate}%</Badge>,
    },
    {
      key: 'stock',
      header: 'Stock',
      cell: (p: Product) => (
        <div className="flex items-center gap-2">
          {p.stockQuantity <= p.lowStockAlert && p.stockQuantity > 0 && (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          )}
          <span className={p.stockQuantity === 0 ? 'text-red-600 font-semibold' : p.stockQuantity <= p.lowStockAlert ? 'text-amber-600 font-semibold' : 'text-gray-700'}>
            {p.stockQuantity} {p.unitType}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (p: Product) => getStockBadge(p),
    },
    {
      key: 'actions',
      header: '',
      cell: (p: Product) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            className="rounded-lg p-1.5 text-gray-400 hover:bg-primary-50 hover:text-primary-600 transition-colors"
            onClick={(e) => handleEdit(p, e)}
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            onClick={(e) => { e.stopPropagation(); setDeleteId(p.id); }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Products</h2>
          <p className="text-sm text-gray-500 mt-0.5">{total} products</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setEditProduct(undefined); setShowForm(true); }}>
          Add Product
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search products..."
            leftAddon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          value={categoryId}
          onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
          className="w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
        >
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <BulkActions
        type="products"
        exportData={products.map((p) => ({
          name: p.name, sku: p.sku, hsn_code: p.hsnCode, selling_price: p.sellingPrice,
          cost_price: p.purchasePrice, gst_rate: p.gstRate, unit_type: p.unitType,
          stock_quantity: p.stockQuantity, low_stock_alert: p.lowStockAlert,
          category_name: p.category?.name ?? '',
        }))}
        exportColumns={[
          { header: 'Name', dataKey: 'name' }, { header: 'SKU', dataKey: 'sku' },
          { header: 'HSN', dataKey: 'hsn_code' }, { header: 'Price', dataKey: 'selling_price' },
          { header: 'GST%', dataKey: 'gst_rate' }, { header: 'Stock', dataKey: 'stock_quantity' },
          { header: 'Category', dataKey: 'category_name' },
        ]}
        onImport={productsApi.bulkImport}
      />

      {products.length === 0 && !isLoading ? (
        <EmptyState
          icon={Package}
          title="No products found"
          description="Add your first product to start billing"
          action={{ label: 'Add Product', onClick: () => setShowForm(true) }}
        />
      ) : (
        <>
          <Table
            columns={columns}
            data={products}
            keyExtractor={(p) => p.id}
            onRowClick={(p) => navigate(`/products/${p.id}`)}
            loading={isLoading}
            renderMobileCard={(p) => (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <Package className="h-5 w-5 text-primary-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.category?.name ?? 'Uncategorized'}{p.sku ? ` · ${p.sku}` : ''}</p>
                    </div>
                  </div>
                  {getStockBadge(p)}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Price</p>
                    <p className="font-semibold text-gray-900 tabular-nums">{formatCurrency(p.sellingPrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">GST</p>
                    <p className="font-medium text-gray-700">{p.gstRate}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Stock</p>
                    <p className={clsx('font-semibold tabular-nums', p.stockQuantity === 0 ? 'text-red-600' : p.stockQuantity <= p.lowStockAlert ? 'text-amber-600' : 'text-gray-700')}>
                      {p.stockQuantity} {p.unitType}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3" onClick={(e) => e.stopPropagation()}>
                  <Button variant="outline" size="sm" className="flex-1" leftIcon={<Edit className="h-4 w-4" />} onClick={(e) => handleEdit(p, e)}>
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" leftIcon={<Trash2 className="h-4 w-4" />} onClick={(e) => { e.stopPropagation(); setDeleteId(p.id); }}>
                    Delete
                  </Button>
                </div>
              </div>
            )}
          />
          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} total={total} limit={20} onPageChange={setPage} />
          )}
        </>
      )}

      <ProductForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditProduct(undefined); }}
        product={editProduct}
      />

      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Product"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleteProduct.isPending}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">Are you sure you want to delete this product? This cannot be undone.</p>
      </Modal>
    </div>
  );
}
