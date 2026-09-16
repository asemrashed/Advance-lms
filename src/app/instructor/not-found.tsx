import GlobalNotFound from '@/components/GlobalNotFound';

export default function NotFound() {
  return (
    <GlobalNotFound
      theme="instructor"
      homeHref="/instructor/dashboard"
      homeLabel="Back to dashboard"
    />
  );
}
