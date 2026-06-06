import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, Save, Building2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader } from '../../components/ui/Card';
import { BillTemplates } from '../../components/bills/BillTemplates';
import { useAuthStore } from '../../store/authStore';
import { businessApi } from '../../api/business';
import { toast } from '../../store/uiStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { INDIAN_STATES, BILL_SIZES, BILL_TEMPLATES } from '../../utils/constants';

const schema = z.object({
  name: z.string().min(1, 'Business name is required'),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  invoicePrefix: z.string().min(1, 'Prefix is required'),
  defaultTemplate: z.string(),
  defaultBillSize: z.string(),
  showLogoOnBills: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export default function BusinessSettings() {
  const { business, setBusiness } = useAuthStore();
  const logoRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isDirty, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: business?.name ?? '',
      gstin: business?.gstin ?? '',
      pan: business?.pan ?? '',
      phone: business?.phone ?? '',
      email: business?.email ?? '',
      address: business?.address ?? '',
      city: business?.city ?? '',
      state: business?.state ?? '',
      pincode: business?.pincode ?? '',
      invoicePrefix: business?.invoicePrefix ?? 'INV',
      defaultTemplate: business?.defaultTemplate ?? 'modern',
      defaultBillSize: business?.defaultBillSize ?? 'a4_portrait',
      showLogoOnBills: business?.showLogoOnBills ?? true,
    },
  });

  useEffect(() => {
    if (business) {
      reset({
        name: business.name,
        gstin: business.gstin ?? '',
        pan: business.pan ?? '',
        phone: business.phone ?? '',
        email: business.email ?? '',
        address: business.address ?? '',
        city: business.city ?? '',
        state: business.state ?? '',
        pincode: business.pincode ?? '',
        invoicePrefix: business.invoicePrefix,
        defaultTemplate: business.defaultTemplate,
        defaultBillSize: business.defaultBillSize,
        showLogoOnBills: business.showLogoOnBills ?? true,
      });
    }
  }, [business, reset]);

  const updateBusiness = useMutation({
    mutationFn: (data: Partial<FormData>) => businessApi.update(data),
    onSuccess: (updatedBusiness) => {
      setBusiness(updatedBusiness);
      toast.success('Business settings saved');
    },
    onError: (err: Error) => toast.error('Failed to save', err.message),
  });

  const uploadLogo = useMutation({
    mutationFn: (file: File) => businessApi.uploadLogo(file),
    onSuccess: ({ logoUrl }) => {
      if (business) setBusiness({ ...business, logoUrl });
      toast.success('Logo updated');
    },
    onError: () => toast.error('Failed to upload logo'),
  });

  const onSubmit = async (data: FormData) => {
    await updateBusiness.mutateAsync(data);
  };

  const defaultTemplate = watch('defaultTemplate');
  const defaultBillSize = watch('defaultBillSize');

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold text-gray-900">Business Settings</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Logo */}
        <Card>
          <CardHeader title="Business Logo" />
          <div className="flex items-center gap-5">
            <div className="relative">
              {business?.logoUrl ? (
                <img src={business.logoUrl} alt="Logo" className="h-20 w-20 rounded-xl object-contain border border-gray-200" />
              ) : (
                <div className="h-20 w-20 rounded-xl bg-primary-50 border-2 border-dashed border-primary-200 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-primary-300" />
                </div>
              )}
              <button
                type="button"
                onClick={() => logoRef.current?.click()}
                className="absolute -bottom-2 -right-2 h-7 w-7 rounded-full bg-primary-600 text-white flex items-center justify-center shadow hover:bg-primary-700 transition-colors"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Upload business logo</p>
              <p className="text-xs text-gray-400 mt-0.5">PNG, JPG up to 2MB. Will appear on invoices.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                loading={uploadLogo.isPending}
                onClick={() => logoRef.current?.click()}
              >
                {uploadLogo.isPending ? 'Uploading...' : 'Choose File'}
              </Button>
            </div>
          </div>
          <input
            ref={logoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo.mutate(f); }}
          />

          <label className="mt-4 flex items-center gap-3 cursor-pointer border-t border-gray-100 pt-4">
            <input
              type="checkbox"
              {...register('showLogoOnBills')}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">
              Show logo on invoices
              <span className="block text-xs text-gray-400">Print the logo at the top of generated bills (save to apply).</span>
            </span>
          </label>
        </Card>

        {/* Business Info */}
        <Card>
          <CardHeader title="Business Information" />
          <div className="space-y-4">
            <Input label="Business Name" {...register('name')} error={errors.name?.message} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="GSTIN" {...register('gstin')} error={errors.gstin?.message} placeholder="27AAAPL1234C1Z5" />
              <Input label="PAN" {...register('pan')} error={errors.pan?.message} placeholder="AAAPL1234C" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Phone" {...register('phone')} placeholder="+91 XXXXX XXXXX" />
              <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
            </div>
            <Input label="Address" {...register('address')} />
            <div className="grid grid-cols-3 gap-4">
              <Input label="City" {...register('city')} />
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
              <Input label="Pincode" {...register('pincode')} maxLength={6} />
            </div>
          </div>
        </Card>

        {/* Invoice Settings */}
        <Card>
          <CardHeader title="Invoice Settings" />
          <div className="space-y-4">
            <Input
              label="Invoice Number Prefix"
              {...register('invoicePrefix')}
              error={errors.invoicePrefix?.message}
              hint="e.g. INV → INV-0001"
              required
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Default Bill Size</label>
              <select
                {...register('defaultBillSize')}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {BILL_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </Card>

        {/* Template */}
        <Card>
          <CardHeader title="Default Invoice Template" />
          <BillTemplates
            value={defaultTemplate}
            onChange={(t) => setValue('defaultTemplate', t, { shouldDirty: true })}
          />
        </Card>

        {/* Save */}
        <div className="flex justify-end">
          <Button
            type="submit"
            size="lg"
            loading={isSubmitting || updateBusiness.isPending}
            leftIcon={<Save className="h-4 w-4" />}
            disabled={!isDirty}
          >
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
