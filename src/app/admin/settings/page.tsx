import type { Metadata } from "next";
import AdminSettings from "./AdminSettingsClient";

export const metadata: Metadata = {
  title: "Settings",
};

export default function AdminSettingsRoutePage() {
  return <AdminSettings />;
}
