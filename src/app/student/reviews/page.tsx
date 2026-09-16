import type { Metadata } from "next";
import StudentReviewsPage from "./StudentReviewsClient";

export const metadata: Metadata = {
  title: "Reviews",
};

export default function StudentReviewsRoutePage() {
  return <StudentReviewsPage />;
}
