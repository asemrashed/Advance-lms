import type { Metadata } from "next";
import StudentAssignmentDetailPage from "./StudentAssignmentDetailClient";

export const metadata: Metadata = {
  title: "Assignment",
};

export default function StudentAssignmentDetailRoutePage() {
  return <StudentAssignmentDetailPage />;
}
