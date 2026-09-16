import type { Metadata } from "next";
import InstructorEnrollmentsPage from "./InstructorEnrollmentsClient";

export const metadata: Metadata = {
  title: "Enrollments",
};

export default function InstructorEnrollmentsRoutePage() {
  return <InstructorEnrollmentsPage />;
}
