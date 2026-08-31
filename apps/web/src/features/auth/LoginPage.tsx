import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AxiosError } from 'axios';
import { AlertCircle } from 'lucide-react';
import { BRAND_NAME } from '@licoreria/shared-types';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLogin } from './hooks';

// Validación en cliente espejo del servidor; el servidor es la autoridad final
const loginSchema = z.object({
  email: z.string().email('Ingrese un email válido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});
type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const serverError =
    login.error instanceof AxiosError
      ? (login.error.response?.data?.message as string) ??
        'Error al iniciar sesión'
      : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-base p-4">
      <div className="w-full max-w-sm">
        {/* Encabezado de marca */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandMark className="h-16 w-16" />
          <h1 className="font-display text-display-md font-medium text-ink">
            {BRAND_NAME}
          </h1>
          <p className="text-small text-muted">
            Control de inventario y facturación
          </p>
        </div>

        <form
          onSubmit={handleSubmit((data) => login.mutate(data))}
          className="flex flex-col gap-5 rounded-md border border-border bg-surface-card p-6"
          noValidate
        >
          {serverError && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-sm bg-status-danger/10 px-3 py-2 text-small text-status-danger"
            >
              <AlertCircle size={16} aria-hidden />
              {serverError}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              error={!!errors.email}
              {...register('email')}
            />
            {errors.email && (
              <p className="flex items-center gap-1 text-small text-status-danger">
                <AlertCircle size={14} aria-hidden />
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              error={!!errors.password}
              {...register('password')}
            />
            {errors.password && (
              <p className="flex items-center gap-1 text-small text-status-danger">
                <AlertCircle size={14} aria-hidden />
                {errors.password.message}
              </p>
            )}
          </div>

          <Button type="submit" size="lg" disabled={login.isPending}>
            {login.isPending ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
