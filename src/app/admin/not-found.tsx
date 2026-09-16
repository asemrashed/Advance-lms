import GlobalNotFound from '@/components/GlobalNotFound';

export default function NotFound() {
  return (
    <GlobalNotFound
      theme="admin"
      homeHref="/admin/dashboard"
      homeLabel="Back to dashboard"
    />
  );
}
