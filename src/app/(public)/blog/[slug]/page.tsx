import type { Metadata } from "next";
import BlogDetailClient from "./BlogDetailClient";

export const metadata: Metadata = {
  title: "Blog post",
};

export default function BlogDetailPage() {
  return <BlogDetailClient />;
}
