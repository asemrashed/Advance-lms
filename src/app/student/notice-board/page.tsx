import type { Metadata } from "next";
import StudentNoticeBoardClient from "./StudentNoticeBoardClient";

export const metadata: Metadata = {
  title: "Notice board",
};

export default function StudentNoticeBoardPage() {
  return <StudentNoticeBoardClient />;
}
