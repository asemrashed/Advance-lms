import type { Metadata } from "next";
import InstructorNoticeBoardClient from "./InstructorNoticeBoardClient";

export const metadata: Metadata = {
  title: "Notice board",
};

export default function InstructorNoticeBoardPage() {
  return <InstructorNoticeBoardClient />;
}
