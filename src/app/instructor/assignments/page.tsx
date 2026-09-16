import type { Metadata } from "next";
import InstructorAssignmentsPage from "./InstructorAssignmentsClient";

export const metadata: Metadata = {
  title: "Assignments",
};

export default function InstructorAssignmentsRoutePage() {
  return <InstructorAssignmentsPage />;
}
