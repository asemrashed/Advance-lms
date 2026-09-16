import type { Metadata } from "next";
import StudentSettingsPage from "./StudentSettingsClient";

export const metadata: Metadata = {
  title: "Settings",
};

export default function StudentSettingsPageRoute() {
  return <StudentSettingsPage />;
}
