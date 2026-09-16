import type { Metadata } from "next";
import WebsiteContentPage from "./AdminWebsiteContentClient";
import { SuperAdminOnlyGate } from "@/components/auth/SuperAdminOnlyGate";

export const metadata: Metadata = {
  title: "Website content",
};

export default function AdminWebsiteContentRoutePage() {
  return (
    <SuperAdminOnlyGate>
      <WebsiteContentPage />
    </SuperAdminOnlyGate>
  );
}
