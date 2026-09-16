import type { Metadata } from "next";
import StudentProfile from "./StudentProfileClient";

export const metadata: Metadata = {
  title: "Profile",
};

export default function StudentProfilePage() {
  return <StudentProfile />;
}
