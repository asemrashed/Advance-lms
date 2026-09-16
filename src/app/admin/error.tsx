'use client';

import { RoleErrorPage } from '@/components/RoleStatusPages';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RoleErrorPage
      error={error}
      reset={reset}
      theme="admin"
      homeHref="/admin/dashboard"
    />
  );
}
