import type { Metadata } from "next";
import TeacherProfile from "./InstructorProfileClient";

export const metadata: Metadata = {
  title: "Profile",
};

export default function InstructorProfilePage() {
  return <TeacherProfile />;
}
