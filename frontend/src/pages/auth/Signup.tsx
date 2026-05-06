import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Zap, Mail, Lock, User, Building2 } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useSignup } from '../../hooks/useAuth';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  businessName: z.string().min(2, 'Business name is required'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function Signup() {
  const signup = useSignup();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    await signup.mutateAsync({
      name: data.name,
      email: data.email,
      password: data.password,
      businessName: data.businessName,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">Billetra</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">Create your account</h1>
          <p className="text-sm text-gray-500 text-center mb-8">Start billing smarter today</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Full Name"
              placeholder="Ravi Kumar"
              leftAddon={<User className="h-4 w-4" />}
              {...register('name')}
              error={errors.name?.message}
              required
            />

            <Input
              label="Business Name"
              placeholder="Kumar Enterprises"
              leftAddon={<Building2 className="h-4 w-4" />}
              {...register('businessName')}
              error={errors.businessName?.message}
              required
            />

            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              leftAddon={<Mail className="h-4 w-4" />}
              {...register('email')}
              error={errors.email?.message}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="At least 8 characters"
              leftAddon={<Lock className="h-4 w-4" />}
              {...register('password')}
              error={errors.password?.message}
              required
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Repeat password"
              leftAddon={<Lock className="h-4 w-4" />}
              {...register('confirmPassword')}
              error={errors.confirmPassword?.message}
              required
            />

            <Button
              type="submit"
              className="w-full mt-2"
              size="lg"
              loading={isSubmitting || signup.isPending}
            >
              Create Account
            </Button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-4">
            By signing up, you agree to our{' '}
            <a href="#" className="text-indigo-600">Terms of Service</a> and{' '}
            <a href="#" className="text-indigo-600">Privacy Policy</a>
          </p>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 font-semibold hover:text-indigo-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
