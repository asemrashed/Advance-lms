import { RoleAreaLayout } from "@/components/layout/RoleAreaLayout";
import { AdminPermissionsProvider } from "@/hooks/useAdminPermissions";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminPermissionsProvider>
      <RoleAreaLayout role="admin">{children}</RoleAreaLayout>
    </AdminPermissionsProvider>
  );
}
