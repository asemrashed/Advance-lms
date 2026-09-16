import type { Metadata } from "next";
import StudentProgressPage from "./StudentProgressClient";

export const metadata: Metadata = {
  title: "Progress",
};

export default function StudentProgressRoutePage() {
  return <StudentProgressPage />;
}
