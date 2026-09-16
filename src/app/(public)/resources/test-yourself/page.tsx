import type { Metadata } from "next";
import { TestYourselfBrowseClient } from "@/components/resources/TestYourselfBrowseClient";

export const metadata: Metadata = {
  title: "Test Yourself",
};

export default function PublicResourceTestYourselfPage() {
  return <TestYourselfBrowseClient context="public" />;
}
