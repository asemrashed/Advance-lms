import type { Metadata } from "next";
import AdminsPage from "./AdminAdminsClient";

export const metadata: Metadata = {
  title: "Admins",
};

export default function AdminAdminsRoutePage() {
  return <AdminsPage />;
}
