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
      theme="student"
      homeHref="/student/dashboard"
    />
  );
}
