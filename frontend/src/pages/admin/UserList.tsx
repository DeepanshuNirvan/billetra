import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Shield, Users } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageSpinner } from '../../components/ui/Spinner';
import { useAdminUsers } from '../../hooks/useAdmin';
import { formatDate } from '../../utils/format';
import type { AdminUser } from '../../types';

export default function AdminUserList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useAdminUsers({ search: search || undefined });

  const users: AdminUser[] = data?.data ?? [];
  const total = data?.total ?? 0;

  const columns = [
    {
      key: 'name',
      header: 'User',
      cell: (u: AdminUser) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
            {u.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="font-medium text-gray-900">{u.name}</p>
            <p className="text-xs text-gray-400">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      cell: (u: AdminUser) => (
        <Badge color={u.role === 'super_admin' ? 'indigo' : 'gray'}>
          {u.role === 'super_admin' ? 'Super Admin' : 'Owner'}
        </Badge>
      ),
    },
    {
      key: 'business',
      header: 'Business',
      cell: (u: AdminUser) => <span className="text-sm text-gray-600">{u.business?.name ?? '-'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (u: AdminUser) => (
        <Badge color={u.is_active ? 'green' : 'red'}>{u.is_active ? 'Active' : 'Suspended'}</Badge>
      ),
    },
    {
      key: 'created',
      header: 'Joined',
      cell: (u: AdminUser) => <span className="text-sm text-gray-500">{formatDate(u.created_at)}</span>,
    },
  ];

  if (isLoading) return <PageSpinner />;

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">User Management</h2>
            <p className="text-sm text-gray-500 mt-0.5">{total} registered users</p>
          </div>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/admin/users/create')}>
          Create User
        </Button>
      </div>

      <Input
        placeholder="Search by name or email..."
        leftAddon={<Search className="h-4 w-4" />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users found"
          description="Create the first user account"
          action={{ label: 'Create User', onClick: () => navigate('/admin/users/create') }}
        />
      ) : (
        <Table
          columns={columns}
          data={users}
          keyExtractor={(u) => u.id}
          onRowClick={(u) => navigate(`/admin/users/${u.id}`)}
        />
      )}
    </div>
  );
}
