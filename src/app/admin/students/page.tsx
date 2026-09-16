import type { Metadata } from "next";
import StudentsPage from "./AdminStudentsClient";

export const metadata: Metadata = {
  title: "Students",
};

export default function AdminStudentsRoutePage() {
  return <StudentsPage />;
}
