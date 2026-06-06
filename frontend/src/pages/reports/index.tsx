import { useNavigate } from 'react-router-dom';
import { BarChart3, FileText, Package } from 'lucide-react';
import { Card } from '../../components/ui/Card';

const reportTypes = [
  {
    title: 'Sales Report',
    description: 'View daily/monthly sales breakdown with charts and export',
    icon: BarChart3,
    path: '/reports/sales',
    color: 'bg-primary-50 text-primary-600',
  },
  {
    title: 'GST Report',
    description: 'CGST/SGST/IGST breakdown per invoice for filing returns',
    icon: FileText,
    path: '/reports/gst',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    title: 'Inventory Report',
    description: 'Stock levels, value, and low stock alerts for all products',
    icon: Package,
    path: '/reports/inventory',
    color: 'bg-amber-50 text-amber-600',
  },
];

export default function ReportsIndex() {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Reports</h2>
        <p className="text-sm text-gray-500 mt-0.5">Analyse your business performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reportTypes.map(({ title, description, icon: Icon, path, color }) => (
          <Card
            key={path}
            hover
            onClick={() => navigate(path)}
            className="cursor-pointer"
          >
            <div className={`inline-flex rounded-xl p-3 mb-4 ${color}`}>
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-500">{description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
