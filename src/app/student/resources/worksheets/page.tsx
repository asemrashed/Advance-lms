import type { Metadata } from "next";
import { ResourceWorksheetsBrowseClient } from "@/components/resources/ResourceWorksheetsBrowseClient";

export const metadata: Metadata = {
  title: "Topical Worksheets",
};

export default function StudentResourceWorksheetsPage() {
  return (
    <ResourceWorksheetsBrowseClient context="student" showPageHeader={false} />
  );
}
