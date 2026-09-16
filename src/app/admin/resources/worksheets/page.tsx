import type { Metadata } from "next";
import { ResourceWorksheetsStaffClient } from "@/components/resources/ResourceWorksheetsStaffClient";

export const metadata: Metadata = {
  title: "Resource worksheets",
};

export default function AdminResourceWorksheetsPage() {
  return <ResourceWorksheetsStaffClient role="admin" />;
}
