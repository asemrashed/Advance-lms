import type { Metadata } from "next";
import { ResourceNotesBrowseClient } from "@/components/resources/ResourceNotesBrowseClient";

export const metadata: Metadata = {
  title: "Notes",
};

export default function PublicResourceNotesPage() {
  return <ResourceNotesBrowseClient context="public" />;
}
