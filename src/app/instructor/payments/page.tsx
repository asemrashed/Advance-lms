import type { Metadata } from "next";
import InstructorPaymentsClient from "./InstructorPaymentsClient";

export const metadata: Metadata = {
  title: "Payment History",
};

export default function InstructorPaymentsPage() {
  return <InstructorPaymentsClient />;
}
