import type { Metadata } from "next";
import { ResourceTestYourselfStaffClient } from "@/components/resources/ResourceTestYourselfStaffClient";

export const metadata: Metadata = {
  title: "Test Yourself",
};

export default function AdminResourceTestYourselfPage() {
  return <ResourceTestYourselfStaffClient role="admin" />;
}
