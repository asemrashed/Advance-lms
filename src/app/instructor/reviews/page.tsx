import type { Metadata } from "next";
import InstructorReviewsPage from "./InstructorReviewsClient";

export const metadata: Metadata = {
  title: "Reviews",
};

export default function InstructorReviewsRoutePage() {
  return <InstructorReviewsPage />;
}
