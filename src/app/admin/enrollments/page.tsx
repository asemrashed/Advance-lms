import type { Metadata } from "next";
import EnrollmentsPage from "./AdminEnrollmentsClient";

export const metadata: Metadata = {
  title: "Enrollments",
};

export default function AdminEnrollmentsRoutePage() {
  return <EnrollmentsPage />;
}
