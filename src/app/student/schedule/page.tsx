import type { Metadata } from "next";
import StudentScheduleClient from "./StudentScheduleClient";

export const metadata: Metadata = {
  title: "Schedule",
};

export default function StudentSchedulePage() {
  return <StudentScheduleClient />;
}
