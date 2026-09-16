'use client';

import GlobalError from '@/components/GlobalError';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <GlobalError error={error} reset={reset} />;
}