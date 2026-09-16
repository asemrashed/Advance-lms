import type { Metadata } from "next";
import StudentAttendanceClient from "./StudentAttendanceClient";

export const metadata: Metadata = {
  title: "Attendance",
};

export default function StudentAttendancePage() {
  return <StudentAttendanceClient />;
}
