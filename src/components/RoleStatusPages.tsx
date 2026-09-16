'use client';

import GlobalError from '@/components/GlobalError';
import type { SiteTheme } from '@/lib/siteTheme';

type RoleErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
  theme: SiteTheme;
  homeHref: string;
};

export function RoleErrorPage({
  error,
  reset,
  theme,
  homeHref,
}: RoleErrorProps) {
  return (
    <GlobalError
      error={error}
      reset={reset}
      theme={theme}
      homeHref={homeHref}
    />
  );
}
