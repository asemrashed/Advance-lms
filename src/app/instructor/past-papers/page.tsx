import { redirect } from "next/navigation";

/** Phase 3: platform Resource Center is admin-only. */
export default function InstructorPastPapersRedirectPage() {
  redirect("/instructor/courses");
}
