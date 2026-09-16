import { redirect } from "next/navigation";

/** Phase 3: platform Resource Center is admin-only. */
export default function InstructorResourcePastPapersPage() {
  redirect("/instructor/courses");
}
