import type { Metadata } from "next";
import AdminNoticesClient from "./AdminNoticesClient";

export const metadata: Metadata = {
  title: "Notice Board",
};

export default function AdminNoticesPage() {
  return <AdminNoticesClient />;
}
