import type { Metadata } from "next";
import { PastPapersStaffClient } from "@/components/resources/PastPapersStaffClient";

export const metadata: Metadata = {
  title: "Past Papers",
};

export default function AdminPastPapersResourcePage() {
  return <PastPapersStaffClient role="admin" />;
}
