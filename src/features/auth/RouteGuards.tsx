import { Navigate, Outlet } from 'react-router-dom';

import { useAuthStore } from '@/stores/auth.store';

export function ParticipantGuard() {
  const identity = useAuthStore((state) => state.identity);
  return identity?.role === 'PARTICIPANT' ? <Outlet /> : <Navigate to="/login" replace />;
}

export function AdminGuard() {
  const identity = useAuthStore((state) => state.identity);
  return identity && identity.role !== 'PARTICIPANT' ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace />
  );
}
