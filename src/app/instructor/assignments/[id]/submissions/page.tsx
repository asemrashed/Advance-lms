import type { Metadata } from "next";
import InstructorAssignmentSubmissionsPage from "./InstructorSubmissionsClient";

export const metadata: Metadata = {
  title: "Submissions",
};

export default function InstructorSubmissionsRoutePage() {
  return <InstructorAssignmentSubmissionsPage />;
}
