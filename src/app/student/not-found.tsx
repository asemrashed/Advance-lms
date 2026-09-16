import GlobalNotFound from '@/components/GlobalNotFound';

export default function NotFound() {
  return (
    <GlobalNotFound
      theme="student"
      homeHref="/student/dashboard"
      homeLabel="Back to dashboard"
    />
  );
}
