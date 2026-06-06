import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useCreateCustomer, useUpdateCustomer } from '../../hooks/useCustomers';
import { INDIAN_STATES, PAYMENT_TERMS } from '../../utils/constants';
import type { Customer } from '../../types';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  state: z.string().optional(),
  creditLimit: z.coerce.number().min(0).default(0),
  paymentTerms: z.string().optional(),
  isActive: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

interface CustomerFormProps {
  open: boolean;
  onClose: () => void;
  customer?: Customer;
}

export function CustomerForm({ open, onClose, customer }: CustomerFormProps) {
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: customer
      ? {
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          gstin: customer.gstin,
          pan: customer.pan,
          billingAddress: customer.billingAddress,
          shippingAddress: customer.shippingAddress,
          state: customer.state,
          creditLimit: customer.creditLimit,
          paymentTerms: customer.paymentTerms,
          isActive: customer.isActive,
        }
      : { creditLimit: 0, isActive: true },
  });

  const onSubmit = async (data: FormData) => {
    if (customer) {
      await updateCustomer.mutateAsync({ id: customer.id, payload: data });
    } else {
      await createCustomer.mutateAsync(data as any);
    }
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={customer ? 'Edit Customer' : 'Add Customer'}
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="customer-form" loading={isSubmitting}>
            {customer ? 'Update' : 'Create'} Customer
          </Button>
        </>
      }
    >
      <form id="customer-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Customer Name" {...register('name')} error={errors.name?.message} required />

        <div className="grid grid-cols-2 gap-4">
          <Input label="Phone" {...register('phone')} error={errors.phone?.message} placeholder="+91 XXXXX XXXXX" />
          <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="GSTIN" {...register('gstin')} error={errors.gstin?.message} placeholder="27AAAPL1234C1Z5" />
          <Input label="PAN" {...register('pan')} error={errors.pan?.message} placeholder="AAAPL1234C" />
        </div>

        <Input label="Billing Address" {...register('billingAddress')} error={errors.billingAddress?.message} />
        <Input label="Shipping Address" {...register('shippingAddress')} hint="Leave blank if same as billing" />

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">State</label>
            <select
              {...register('state')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select state</option>
              {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Payment Terms</label>
            <select
              {...register('paymentTerms')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select terms</option>
              {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <Input
          label="Credit Limit (₹)"
          type="number"
          {...register('creditLimit')}
          error={errors.creditLimit?.message}
          hint="Set to 0 for no credit limit"
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="custIsActive"
            {...register('isActive')}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="custIsActive" className="text-sm text-gray-700">Active Customer</label>
        </div>
      </form>
    </Modal>
  );
}
