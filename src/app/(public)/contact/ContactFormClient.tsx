"use client";

import { useRef, useState } from "react";
import { MdEmail, MdLocationOn, MdPhone } from "react-icons/md";
import type { WebsiteContent } from "@/lib/websiteContentDefaults";
import { defaultContactPageContent } from "@/lib/websiteContentDefaults";

type ContactDisplayContent = {
  heading: string;
  subheading: string;
  email: { label: string; value: string };
  phone: { label: string; value: string };
  address: { label: string; value: string };
  mapEmbedUrl: string;
};

const staticContactFallback: ContactDisplayContent = {
  heading: defaultContactPageContent.headline,
  subheading: defaultContactPageContent.subheadline,
  email: { label: "Email", value: defaultContactPageContent.email },
  phone: { label: "Phone", value: defaultContactPageContent.phone },
  address: {
    label: "Headquarters",
    value: defaultContactPageContent.address,
  },
  mapEmbedUrl: defaultContactPageContent.mapEmbedUrl,
};

function resolveContactContent(cmsData: WebsiteContent | null): ContactDisplayContent {
  const page = cmsData?.contactPage;
  if (page?.headline) {
    return {
      heading: page.headline,
      subheading: page.subheadline || staticContactFallback.subheading,
      email: { label: "Email", value: page.email || staticContactFallback.email.value },
      phone: { label: "Phone", value: page.phone || staticContactFallback.phone.value },
      address: {
        label: staticContactFallback.address.label,
        value: page.address || staticContactFallback.address.value,
      },
      mapEmbedUrl: page.mapEmbedUrl || "",
    };
  }

  const cmsContact = cmsData?.contact;
  const footerContact = cmsData?.footer?.contact;
  if (!cmsContact && !footerContact) {
    return staticContactFallback;
  }

  return {
    heading: staticContactFallback.heading,
    subheading: staticContactFallback.subheading,
    email: footerContact?.email ?? staticContactFallback.email,
    phone: footerContact?.phone ?? staticContactFallback.phone,
    address: {
      label: footerContact?.address?.label ?? staticContactFallback.address.label,
      value:
        cmsContact?.registrationNumber ||
        footerContact?.address?.value ||
        staticContactFallback.address.value,
    },
    mapEmbedUrl: staticContactFallback.mapEmbedUrl,
  };
}

type ContactFormClientProps = {
  cmsData: WebsiteContent | null;
};

export default function ContactFormClient({ cmsData }: ContactFormClientProps) {
  const contact = resolveContactContent(cmsData);
  const form = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState("");

  const sendEmail = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("sending");

    setTimeout(() => {
      setStatus("success");
      form.current?.reset();
    }, 1000);
  };

  return (
    <div className="w-full h-screen mx-auto flex items-center justify-center bg-gradient-to-t from-transparent/40 to-secondary-container">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
        <div className="space-y-8 flex-1">
          <div>
            <h1 className="text-4xl font-bold mb-4">{contact.heading}</h1>
            <p className="text-gray-500">{contact.subheading}</p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="size-12 bg-card rounded-full flex items-center justify-center text-primary">
                <MdEmail size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase">{contact.email.label}</p>
                <p className="font-medium">{contact.email.value}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="size-12 bg-card rounded-full flex items-center justify-center text-primary">
                <MdPhone size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase">{contact.phone.label}</p>
                <p className="font-medium">{contact.phone.value}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="size-12 bg-card rounded-full flex items-center justify-center text-primary">
                <MdLocationOn size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase">{contact.address.label}</p>
                <p className="font-medium">{contact.address.value}</p>
              </div>
            </div>
          </div>
          {contact.mapEmbedUrl ? (
            <div className="overflow-hidden rounded-2xl border border-outline-variant">
              <iframe
                title="Location map"
                src={contact.mapEmbedUrl}
                className="h-48 w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : null}
        </div>

        <div className="flex-1 bg-surface-container-low p-8 rounded-3xl border border-outline-variant">
          <form ref={form} onSubmit={sendEmail} className="space-y-6">
            <div className="space-y-2">
              <label className="font-bold ml-1">Name</label>
              <input
                type="text"
                name="user_name"
                required
                className="input input-bordered border rounded-md mt-2 w-full bg-base-100 p-2 focus:input-primary"
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <label className="font-bold ml-1">Email</label>
              <input
                type="email"
                name="user_email"
                required
                className="input input-bordered border rounded-md mt-2 w-full bg-base-100 p-2 focus:input-primary"
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="font-bold ml-1">Message</label>
              <textarea
                name="message"
                required
                className="textarea textarea-bordered border rounded-md mt-2 w-full bg-base-100 p-2 focus:textarea-primary h-32"
                placeholder="I'm interested in..."
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary bg-primary hover:bg-primary/80 w-full h-12 rounded-md text-lg text-white"
              disabled={status === "sending"}
            >
              {status === "sending" ? "Sending..." : "Send Message"}
            </button>

            {status === "success" && (
              <p className="text-green-500 text-center font-bold">Message sent successfully!</p>
            )}
            {status === "error" && (
              <p className="text-red-500 text-center font-bold">
                Failed to send message. Please try again.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
