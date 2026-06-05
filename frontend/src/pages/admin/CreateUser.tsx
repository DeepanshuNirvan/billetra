import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader } from '../../components/ui/Card';
import { useCreateUser } from '../../hooks/useAdmin';

export default function CreateAdminUser() {
  const navigate = useNavigate();
  const createUser = useCreateUser();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', businessName: '' });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await createUser.mutateAsync({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        businessName: form.businessName || undefined,
      });
      navigate('/admin/users');
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/users')} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary-600" />
          <h2 className="text-xl font-bold text-gray-900">Create User</h2>
        </div>
      </div>

      <Card>
        <CardHeader title="New Owner Account" subtitle="This user will have access to their own isolated data" />
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="Business owner name"
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            placeholder="owner@example.com"
          />
          <Input
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
            placeholder="Minimum 8 characters"
          />
          <Input
            label="Phone (optional)"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="10-digit mobile number"
          />
          <Input
            label="Business Name (optional)"
            name="businessName"
            value={form.businessName}
            onChange={handleChange}
            placeholder="Defaults to the user's name"
          />

          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            New users start <strong>deactivated</strong> and cannot log in until you activate them from their detail page.
          </p>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => navigate('/admin/users')}>
              Cancel
            </Button>
            <Button type="submit" loading={createUser.isPending} className="flex-1">
              Create User
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
