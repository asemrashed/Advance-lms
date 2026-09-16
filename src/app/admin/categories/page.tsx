import { redirect } from "next/navigation";

/** Legacy route — categories replaced by subjects. */
export default function LegacyCategoriesRedirect() {
  redirect("/admin/subjects");
}
