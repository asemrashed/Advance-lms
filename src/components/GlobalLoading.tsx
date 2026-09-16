import { SiteStatusShell } from '@/components/SiteStatusShell';
import type { SiteTheme } from '@/lib/siteTheme';

type GlobalLoadingProps = {
  theme?: SiteTheme;
  label?: string;
};

export default function GlobalLoading({
  theme = 'public',
  label = 'Loading...',
}: GlobalLoadingProps) {
  return (
    <SiteStatusShell theme={theme}>
      <div className="flex flex-col items-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <p className="mt-4 animate-pulse font-medium text-muted-foreground">
          {label}
        </p>
      </div>
    </SiteStatusShell>
  );
}
