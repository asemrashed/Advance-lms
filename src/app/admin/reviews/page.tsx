import type { Metadata } from "next";
import ReviewsPage from "./AdminReviewsClient";

export const metadata: Metadata = {
  title: "Reviews",
};

export default function AdminReviewsRoutePage() {
  return <ReviewsPage />;
}
