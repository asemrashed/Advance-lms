import { loadWebsiteContentSettings } from "@/app/api/_lib/websiteContentStore";
import type { WebsiteContent } from "@/lib/websiteContentDefaults";
import ContactFormClient from "./ContactFormClient";

export default async function ContactPage() {
  const raw = await loadWebsiteContentSettings();
  const cmsData = raw as unknown as WebsiteContent;

  return <ContactFormClient cmsData={cmsData} />;
}
