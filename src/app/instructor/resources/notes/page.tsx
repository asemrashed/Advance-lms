import { redirect } from "next/navigation";

/** Teaching materials live on the T3 Upload Materials page. */
export default function InstructorResourceNotesPage() {
  redirect("/instructor/materials");
}
