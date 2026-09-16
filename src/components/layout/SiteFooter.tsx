import Link from "next/link";
import {
  defaultWebsiteContent,
  type WebsiteContent,
} from "@/lib/websiteContentDefaults";
import type { FooterLink } from "@/lib/websiteContentTypes";
import { filterNavItemsBySectionOrder } from "@/lib/navSectionVisibility";
import { BrandLogo } from "@/components/layout/BrandLogo";

type SiteFooterProps = {
  cmsData?: WebsiteContent | null;
};

function resolveFooterLinks(
  links: FooterLink[] | undefined,
  fallback: FooterLink[],
  sectionOrder?: WebsiteContent["sectionOrder"],
): FooterLink[] {
  const resolved = links?.filter((link) => link.label?.trim());
  const mapped =
    resolved && resolved.length > 0
      ? resolved.map((link) => ({
          label: link.label.trim(),
          href: link.href?.trim() || "#",
        }))
      : fallback;
  return filterNavItemsBySectionOrder(mapped, sectionOrder);
}

function resolveFooterContent(cmsData?: WebsiteContent | null) {
  const footer = cmsData?.footer;
  const defaults = defaultWebsiteContent.footer;
  const siteBranding = cmsData?.branding;

  return {
    branding: {
      logoAlt:
        footer?.branding?.logoText?.trim() ||
        siteBranding?.logoText?.trim() ||
        defaults.branding.logoText,
      description:
        footer?.branding?.description?.trim() || defaults.branding.description,
    },
    companyLinks: [
      { label: "Home", href: "/" },
      { label: "Blog", href: "/blog" },
      { label: "About us", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
    quickLinks: [
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms & Conditions", href: "/terms-and-conditions" },
    ],
    newsletter: {
      title: footer?.newsletter?.title?.trim() || defaults.newsletter.title,
      emailPlaceholder:
        footer?.newsletter?.emailPlaceholder?.trim() ||
        defaults.newsletter.emailPlaceholder,
    },
    copyright:
      footer?.copyright?.trim() ||
      `© ${new Date().getFullYear()} ${defaults.branding.logoText}. The digital curator of elite knowledge.`,
  };
}

function FooterLinkColumn({
  title,
  links,
  className,
}: {
  title: string;
  links: FooterLink[];
  className?: string;
}) {
  return (
    <div className={className}>
      <h2 className="mb-6 text-xs font-bold uppercase tracking-widest text-primary">
        {title}
      </h2>
      <ul className="space-y-4">
        {links.map((link) => (
          <li key={`${title}-${link.href}-${link.label}`}>
            {link.href && link.href !== "#" ? (
              <Link
                href={link.href}
                className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
              >
                {link.label}
              </Link>
            ) : (
              <span className="text-sm text-muted-foreground">{link.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter({ cmsData }: SiteFooterProps) {
  const content = resolveFooterContent(cmsData);

  return (
    <footer className="mt-auto border-t border-transparent bg-surface-container-low">
      <div className="mx-auto grid max-w-screen-2xl grid-cols-2 gap-12 px-6 py-16 md:grid-cols-6 md:px-12">
        <div className="col-span-2 flex flex-col items-center md:items-start">
          <div className="mb-4">
            <BrandLogo
              alt={content.branding.logoAlt}
              imageClassName="h-11 sm:h-12 max-w-[12rem]"
            />
          </div>
          <p className="max-w-xs text-sm leading-7 text-muted-foreground">
            {content.branding.description}
          </p>
        </div>
        <FooterLinkColumn
          title="Platform"
          links={content.companyLinks}
          className="flex flex-col items-center md:items-start"
        />
        <FooterLinkColumn 
          title="Policy" 
          links={content.quickLinks} 
          className="flex flex-col items-center md:items-start"
        />
        <div className="col-span-2 flex flex-col items-center md:items-start">
          <h2 className="mb-6 text-xs font-bold uppercase tracking-widest text-primary">
            Enroll
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Ready to start your journey?
          </p>
          <Link
            href="/enroll"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90"
          >
            Enroll Course
          </Link>
        </div>
      </div>
      <div className="border-t border-outline-variant/20 px-6 py-8 text-center text-xs text-muted-foreground md:px-12">
        {content.copyright}
      </div>
    </footer>
  );
}

function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
