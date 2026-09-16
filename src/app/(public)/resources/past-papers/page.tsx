import type { Metadata } from "next";
import { PastPapersBrowseClient } from "@/components/resources/PastPapersBrowseClient";

export const metadata: Metadata = {
  title: "Past Papers",
};

export default function PublicPastPapersPage() {
  return <PastPapersBrowseClient context="public" />;
}
