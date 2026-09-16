import { RoleAreaLayout } from "@/components/layout/RoleAreaLayout";

export default function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleAreaLayout role="instructor">{children}</RoleAreaLayout>;
}
