import type { Metadata } from "next";
import GlobalNotFound from '@/components/GlobalNotFound';

export const metadata: Metadata = {
  title: "Unauthorized",
};

export default function UnauthorizedPage() {
  return (
    <GlobalNotFound
      theme="public"
      code="403"
      title="Access denied"
      description="You do not have permission to view this page. Sign in with the correct account or return home."
      homeHref="/"
      homeLabel="Go home"
      actionHref="/login"
      actionLabel="Sign in"
    />
  );
}
