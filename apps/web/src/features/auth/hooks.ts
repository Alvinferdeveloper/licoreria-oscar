import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore, SessionUser } from '@/stores/auth.store';

interface LoginResponse {
  user: SessionUser;
  accessToken: string;
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const res = await api.post<{ data: LoginResponse }>(
        '/auth/login',
        credentials,
      );
      return res.data.data;
    },
    onSuccess: ({ user, accessToken }) => {
      setSession(user, accessToken);
      navigate('/', { replace: true });
    },
  });
}

export function useLogout() {
  const clearSession = useAuthStore((s) => s.clearSession);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      clearSession();
      navigate('/login', { replace: true });
    },
  });
}
