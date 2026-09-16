import type { Metadata } from "next";
import InstructorSettingsPage from "./InstructorSettingsClient";

export const metadata: Metadata = {
  title: "Settings",
};

export default function InstructorSettingsRoutePage() {
  return <InstructorSettingsPage />;
}
