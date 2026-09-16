import { redirect } from "next/navigation";

/** Course FAQ moved into course create/edit flow (step 4). */
export default function AdminFaqRoutePage() {
  redirect("/admin/courses");
}
