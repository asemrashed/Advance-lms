import type { Metadata } from "next";
import AdminBlogClient from "./AdminBlogClient";

export const metadata: Metadata = {
  title: "Blog",
};

export default function AdminBlogPage() {
  return <AdminBlogClient />;
}
