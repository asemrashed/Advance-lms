import type { Metadata } from "next";
import BlogListClient from "./BlogListClient";

export const metadata: Metadata = {
  title: "Blog",
  description: "Insights, updates, and learning tips from our team.",
};

export default function BlogPage() {
  return <BlogListClient />;
}
