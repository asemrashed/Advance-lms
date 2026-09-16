import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | AdvanceLMS",
  description: "Privacy Policy for AdvanceLMS",
};

function SectionHeading({ number, title }: { number: number; title: string }) {
  return (
    <div className="mb-4 mt-10 flex items-center gap-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
        {number}
      </span>
      <h2 className="font-headline text-xl font-bold text-foreground m-0">
        {title}
      </h2>
    </div>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-screen-2xl pb-10 md:pb-20">
      <section className="relative flex min-h-[280px] items-center justify-center overflow-hidden bg-surface px-8 py-16 text-foreground md:min-h-[320px]">
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
          <Image
            src="/images/hero-background.svg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-top opacity-60"
          />
        </div>
        <div className="relative z-10 w-full text-center">
          <div className="mx-auto max-w-3xl">
            <p className="mb-4 text-sm font-bold uppercase tracking-widest text-primary">
              Home / Privacy Policy
            </p>
            <h1 className="font-headline text-4xl font-black leading-[1.1] tracking-tight md:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-4 font-body text-sm font-medium text-muted-foreground">
              Last Updated: July 6, 2026
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 md:px-8 md:py-16">
        <div className="rounded-3xl border border-border/50 bg-card p-6 shadow-sm sm:p-10 md:p-12">
          <p className="text-base leading-relaxed text-muted-foreground">
            AdvanceLMS ("we", "us", or "our") respects your privacy and is committed to protecting the personal data you share with us. This Privacy Policy explains how we collect, use, store, and protect your information when you visit our website, use our platform, or enroll in our courses.
          </p>

          <SectionHeading number={1} title="Information We Collect" />
          <p className="mb-4 text-base leading-relaxed text-muted-foreground">
            We collect information you provide directly to us when you create an account, enroll in a batch, or communicate with us. This includes:
          </p>
          <ul className="list-inside list-disc space-y-2 text-base text-muted-foreground marker:text-primary/50">
            <li><strong className="text-foreground">Identity Data:</strong> First name, last name, username or similar identifier.</li>
            <li><strong className="text-foreground">Contact Data:</strong> Email address and telephone numbers.</li>
            <li><strong className="text-foreground">Course Data:</strong> Quiz scores, assignment uploads, course status, watch progress, and active participation in class forums.</li>
            <li><strong className="text-foreground">Technical Data:</strong> Internet protocol (IP) address, login data, browser type, and location.</li>
          </ul>

          <SectionHeading number={2} title="How We Use Your Information" />
          <p className="mb-4 text-base leading-relaxed text-muted-foreground">
            We use the collected information for various educational and operational purposes, including:
          </p>
          <ul className="list-inside list-disc space-y-2 text-base text-muted-foreground marker:text-primary/50">
            <li>Providing access to student dashboards, active live class feeds, and curriculum files.</li>
            <li>Processing course enrollment fees and keeping track of transaction receipts.</li>
            <li>Sending critical announcements, schedule updates, or course changes.</li>
            <li>Improving the interactive learning tools, video players, and user interface layouts.</li>
            <li>Responding to customer support queries, resolving bugs, and enforcing community rules.</li>
          </ul>

          <SectionHeading number={3} title="Information Sharing and Disclosures" />
          <p className="text-base leading-relaxed text-muted-foreground">
            AdvanceLMS does not sell, lease, or distribute your personal contact information to any advertising brokers or external marketing companies. We share information only with trusted third-party service providers who assist us in operating our platform, specifically: payment gateway services for executing secure transactions, and authentication services. These services are contractually bound to safeguard your data.
          </p>

          <SectionHeading number={4} title="Data Protection and Security" />
          <p className="text-base leading-relaxed text-muted-foreground">
            We employ industry-standard technical security measures (including HTTPS encryption, firewalls, and database access controls) to protect your account and data against unauthorized access, loss, alteration, or disclosure. However, no database transmission over the internet can be guaranteed to be 100% secure. You are responsible for keeping your login credentials confidential.
          </p>

          <SectionHeading number={5} title="Cookies and Analytics" />
          <p className="text-base leading-relaxed text-muted-foreground">
            We use cookies and basic tracking tokens to keep you logged in across browser sessions, remember your theme selection (dark/light mode), and collect generic server analytics to check browser performance and fix latency issues. You can disable cookies inside your browser settings, though doing so may log you out of your student portal.
          </p>

          <SectionHeading number={6} title="Your Rights & Choices" />
          <p className="text-base leading-relaxed text-muted-foreground">
            You have the right to request access to the personal data we hold about you, request updates to outdated details, or ask us to deactivate your account. If you want to request data deletion, please contact us at our support email. Note that certain financial records of transactions must be preserved for accounting and tax purposes.
          </p>

          <SectionHeading number={7} title="Changes to this Privacy Policy" />
          <p className="text-base leading-relaxed text-muted-foreground">
            AdvanceLMS reserves the right to modify this Privacy Policy at any time. When updates are published, we will revise the last updated date at the top. If there are major changes to the way we manage data, we will post a notice on our homepage or send direct email notifications.
          </p>

          {/* Contact Box */}
          <div className="mt-12 flex flex-col items-center justify-between gap-6 rounded-2xl bg-surface-container-low p-6 sm:flex-row md:p-8">
            <div className="text-center sm:text-left">
              <h3 className="font-headline text-lg font-bold text-foreground">Have privacy concerns?</h3>
              <p className="mt-1 text-sm text-muted-foreground">Contact our Data protection officer for queries.</p>
            </div>
            <Link 
              href="/contact" 
              className="shrink-0 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
