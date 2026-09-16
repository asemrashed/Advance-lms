import type { Metadata } from "next";
import { DM_Serif_Display, Inter, Manrope } from "next/font/google";
import Providers from "@/components/Providers";
import { loadWebsiteContentSettings } from "@/app/api/_lib/websiteContentStore";
import type { WebsiteContent } from "@/lib/websiteContentDefaults";
import {
  SITE_BRAND_NAME,
  SITE_FAVICON_PUBLIC_PATH,
} from "@/lib/siteBrandingConstants";
import "./globals.css";
import "katex/dist/katex.min.css";

const manrope = Manrope({
  variable: "--font-headline",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-serif-display",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

const DEFAULT_FAVICON = SITE_FAVICON_PUBLIC_PATH;
const DEFAULT_META_DESCRIPTION =
  "AdvanceLMS — online courses, learning paths, and expert-led programs for Cambridge and beyond.";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const raw = await loadWebsiteContentSettings();
    const cms = raw as unknown as WebsiteContent;
    const favicon = cms.branding?.faviconUrl?.trim() || DEFAULT_FAVICON;
    const metaTitle = cms.metaTitle?.trim();

    return {
      ...(metaTitle
        ? {
            title: {
              default: metaTitle,
              template: `%s · ${metaTitle.split("—")[0]?.trim() || SITE_BRAND_NAME}`,
            },
          }
        : {
            title: {
              default: SITE_BRAND_NAME,
              template: `%s · ${SITE_BRAND_NAME}`,
            },
          }),
      description: DEFAULT_META_DESCRIPTION,
      icons: {
        icon: favicon,
        shortcut: favicon,
        apple: favicon,
      },
    };
  } catch {
    return {
      title: {
        default: SITE_BRAND_NAME,
        template: `%s · ${SITE_BRAND_NAME}`,
      },
      description: DEFAULT_META_DESCRIPTION,
      icons: {
        icon: DEFAULT_FAVICON,
        shortcut: DEFAULT_FAVICON,
        apple: DEFAULT_FAVICON,
      },
    };
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${inter.variable} ${dmSerifDisplay.variable}`}
    >
      <head>
        <link
          rel="stylesheet"
          href={
            "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
          }
        />
      </head>
      <body className="flex min-h-dvh flex-col bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
