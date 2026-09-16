"use client";

/** Learning-project used next-auth `checkAuthStatus`; EduPlatform mock role-area skips that gate. */
export default function InstructorPageWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
