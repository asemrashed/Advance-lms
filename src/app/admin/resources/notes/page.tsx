import type { Metadata } from "next";
import { ResourceNotesStaffClient } from "@/components/resources/ResourceNotesStaffClient";

export const metadata: Metadata = {
  title: "Resource notes",
};

export default function AdminResourceNotesPage() {
  return <ResourceNotesStaffClient role="admin" />;
}
