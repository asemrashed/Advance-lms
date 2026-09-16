import type { Metadata } from "next";
import InstructorStudentsPage from "./InstructorStudentsClient";

export const metadata: Metadata = {
  title: "Students",
};

export default function InstructorStudentsRoutePage() {
  return <InstructorStudentsPage />;
}
