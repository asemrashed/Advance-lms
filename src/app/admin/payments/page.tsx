import type { Metadata } from "next";
import AdminPaymentsClient from "./AdminPaymentsClient";

export const metadata: Metadata = {
  title: "Payment History",
};

export default function AdminPaymentsPage() {
  return <AdminPaymentsClient />;
}
