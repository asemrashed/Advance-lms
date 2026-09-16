import type { Metadata } from "next";
import StudentPaymentsClient from "./StudentPaymentsClient";

export const metadata: Metadata = {
  title: "Payment History",
};

export default function StudentPaymentsPage() {
  return <StudentPaymentsClient />;
}
