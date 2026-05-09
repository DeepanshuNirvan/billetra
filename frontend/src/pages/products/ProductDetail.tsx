import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Package, History } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { PageSpinner } from '../../components/ui/Spinner';
import { ProductForm } from '../../components/products/ProductForm';
import { AuditHistory } from '../../components/audit/AuditHistory';
import { useProduct, useDeleteProduct } from '../../hooks/useProducts';
import { formatCurrency, formatDate } from '../../utils/format';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading } = useProduct(id!);
  const deleteProduct = useDeleteProduct();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

  if (isLoading) return <PageSpinner />;
  if (!product) return <div className="p-6 text-center text-gray-500">Product not found</div>;

  const handleDelete = async () => {
    await deleteProduct.mutateAsync(product.id);
    navigate('/products');
  };

  const isLowStock = product.stockQuantity <= product.lowStockAlert;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/products')} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" leftIcon={<Edit className="h-4 w-4" />} onClick={() => setShowEdit(true)}>Edit</Button>
          <Button variant="danger" size="sm" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setShowDelete(true)}>Delete</Button>
        </div>
      </div>

      <div className="flex border-b border-gray-200 gap-4">
        {(['details', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-sm font-medium capitalize flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === tab ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'history' && <History className="h-3.5 w-3.5" />}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'history' && (
        <Card><AuditHistory entityType="product" entityId={product.id} /></Card>
      )}

      {activeTab === 'details' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Product Info" />
          <dl className="space-y-3">
            {[
              ['SKU', product.sku ?? '-'],
              ['Category', product.category?.name ?? '-'],
              ['HSN Code', product.hsnCode ?? '-'],
              ['Unit Type', product.unitType],
              ['GST Rate', `${product.gstRate}%`],
              ['Created', formatDate(product.createdAt)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <dt className="text-sm text-gray-500">{label}</dt>
                <dd className="text-sm font-medium text-gray-900">{value}</dd>
              </div>
            ))}
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Status</dt>
              <dd><Badge color={product.isActive ? 'green' : 'gray'}>{product.isActive ? 'Active' : 'Inactive'}</Badge></dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Pricing & Stock" />
          <dl className="space-y-3">
            {[
              ['Selling Price', formatCurrency(product.sellingPrice)],
              ['Purchase Price', formatCurrency(product.purchasePrice)],
              ['Margin', `${product.purchasePrice > 0 ? (((product.sellingPrice - product.purchasePrice) / product.purchasePrice) * 100).toFixed(1) : 0}%`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <dt className="text-sm text-gray-500">{label}</dt>
                <dd className="text-sm font-medium text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>

          <div className={`mt-4 rounded-xl p-4 ${isLowStock ? 'bg-amber-50 border border-amber-100' : 'bg-green-50 border border-green-100'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Package className={`h-4 w-4 ${isLowStock ? 'text-amber-600' : 'text-green-600'}`} />
              <span className="text-sm font-semibold text-gray-700">Stock Level</span>
            </div>
            <p className={`text-2xl font-bold ${isLowStock ? 'text-amber-700' : 'text-green-700'}`}>
              {product.stockQuantity} <span className="text-sm font-normal">{product.unitType}</span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Alert threshold: {product.lowStockAlert}</p>
          </div>
        </Card>
      </div>
      )}

      {activeTab === 'details' && product.description && (
        <Card>
          <CardHeader title="Description" />
          <p className="text-sm text-gray-600">{product.description}</p>
        </Card>
      )}

      <ProductForm open={showEdit} onClose={() => setShowEdit(false)} product={product} />

      <Modal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title="Delete Product"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleteProduct.isPending}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Delete <strong>{product.name}</strong>? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
