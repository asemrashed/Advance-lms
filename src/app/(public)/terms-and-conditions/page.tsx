import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions | AdvanceLMS",
  description: "Terms and Conditions for AdvanceLMS",
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

export default function TermsAndConditionsPage() {
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
              Home / Terms & Conditions
            </p>
            <h1 className="font-headline text-4xl font-black leading-[1.1] tracking-tight md:text-5xl">
              Terms & Conditions
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
            By accessing or using the AdvanceLMS Learning Management System (LMS), you agree to be bound by these Terms and Conditions and our Privacy Policy. If you disagree with any part of the terms, then you may not access the service.
          </p>

          <SectionHeading number={1} title="Intellectual Property Rights" />
          <p className="text-base leading-relaxed text-muted-foreground">
            The platform and its original content, features, and functionality (including but not limited to all course materials, videos, text, graphics, and logos) are and will remain the exclusive property of AdvanceLMS and its licensors. Our content is protected by copyright, trademark, and other laws.
          </p>

          <SectionHeading number={2} title="User Accounts" />
          <p className="text-base leading-relaxed text-muted-foreground">
            When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our platform. You are responsible for safeguarding the password that you use to access the service.
          </p>

          <SectionHeading number={3} title="Course Enrollment and Access" />
          <ul className="list-inside list-disc space-y-2 text-base text-muted-foreground marker:text-primary/50">
            <li><strong className="text-foreground">Access:</strong> Upon enrollment in a course, you are granted a limited, non-exclusive, non-transferable license to access and view the course content for your personal, non-commercial, educational purposes.</li>
            <li><strong className="text-foreground">Restrictions:</strong> You may not share your account credentials, download (unless explicitly permitted), reproduce, redistribute, transmit, assign, sell, broadcast, rent, share, lend, modify, adapt, edit, create derivative works of, sublicense, or otherwise transfer or use any course content.</li>
          </ul>

          <SectionHeading number={4} title="Code of Conduct" />
          <p className="text-base leading-relaxed text-muted-foreground">
            We expect all students to maintain a respectful and collaborative environment. Harassment, hate speech, spamming, or any form of disruptive behavior in discussion forums, live classes, or direct messages will not be tolerated and may result in account suspension or permanent ban without a refund.
          </p>

          <SectionHeading number={5} title="Payments" />
          <p className="text-base leading-relaxed text-muted-foreground">
            If you purchase a course or subscription, you agree to pay the applicable fees. We reserve the right to change our prices at any time. All sales are considered final unless otherwise stated at checkout.
          </p>

          <SectionHeading number={6} title="Limitation of Liability" />
          <p className="text-base leading-relaxed text-muted-foreground">
            In no event shall AdvanceLMS, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the platform.
          </p>

          <SectionHeading number={7} title="Changes to Terms" />
          <p className="text-base leading-relaxed text-muted-foreground">
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. By continuing to access or use our platform after those revisions become effective, you agree to be bound by the revised terms.
          </p>

          {/* Contact Box */}
          <div className="mt-12 flex flex-col items-center justify-between gap-6 rounded-2xl bg-surface-container-low p-6 sm:flex-row md:p-8">
            <div className="text-center sm:text-left">
              <h3 className="font-headline text-lg font-bold text-foreground">Have questions about terms?</h3>
              <p className="mt-1 text-sm text-muted-foreground">Reach out to our support team for clarification.</p>
            </div>
            <Link 
              href="/contact" 
              className="shrink-0 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
