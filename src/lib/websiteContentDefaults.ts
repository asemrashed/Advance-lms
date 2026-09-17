import type {
  AboutContent,
  AboutPageContent,
  BatchesContent,
  BlogContent,
  ContactPageContent,
  CourseLessonBannerContent,
  CoursesByCategoryContent,
  CoursesContent,
  HomeInstructorsContent,
  FeaturesContent,
  FAQContent,
  FooterContent,
  HeroContent,
  PartnersContent,
  PromoBannerContent,
  SectionConfig,
  StatisticsContent,
  StudentPortalContent,
} from "@/lib/websiteContentTypes";
import { findInsecureImageUrlInObject } from "@/lib/imageUrl";
import { normalizeHomeSectionOrderForSave } from "@/lib/homeSectionOrder";

export type {
  AboutContent,
  BatchesContent,
  BatchLevelItem,
  CourseLessonBannerContent,
  CoursesByCategoryContent,
  CoursesContent,
  HomeInstructorsContent,
  FAQContent,
  FAQItem,
  FooterContent,
  FooterLink,
  HeroContent,
  PromoBannerContent,
  SectionConfig,
  SectionId,
  SocialMedia,
} from "@/lib/websiteContentTypes";

const DEFAULT_SECTION_ORDER: SectionConfig[] = [
  { id: "hero", label: "Hero", enabled: true, order: 0 },
  { id: "statistics", label: "Statistics", enabled: true, order: 1 },
  { id: "batches", label: "Featured Batches", enabled: true, order: 2 },
  { id: "courses", label: "Featured Courses", enabled: true, order: 3 },
  { id: "instructors", label: "Instructors", enabled: true, order: 4 },
  { id: "testimonials", label: "Testimonials", enabled: true, order: 5 },
  { id: "features", label: "Features", enabled: true, order: 6 },
  { id: "partners", label: "Partners", enabled: true, order: 7 },
  { id: "blog", label: "Blog", enabled: true, order: 8 },
];
/** CMS keys removed in phase 13.4.15 — stripped on save/load. */
export const REMOVED_WEBSITE_CONTENT_KEYS = [
  "marquee",
  "whyChooseUs",
  "services",
  "downloadApp",
  "certificates",
  "photoGallery",
] as const;

const REMOVED_SECTION_ORDER_IDS = new Set([
  "header",
  "footer",
  "about",
  "whyChooseUs",
  "services",
  "faq",
  "downloadApp",
  "certificates",
  "photoGallery",
  "coursesByCategory",
]);

export function sanitizeWebsiteContentForSave(
  settings: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...settings };
  for (const key of REMOVED_WEBSITE_CONTENT_KEYS) {
    delete out[key];
  }
  if (Array.isArray(out.sectionOrder)) {
    const normalized = normalizeHomeSectionOrderForSave(
      out.sectionOrder as Array<{ id?: string; label?: string; enabled?: boolean; order?: number }>,
    );
    out.sectionOrder = normalized;
    const coursesSection = normalized.find((section) => section.id === "courses");
    if (coursesSection) {
      const studentPortal =
        out.studentPortal && typeof out.studentPortal === "object" && !Array.isArray(out.studentPortal)
          ? { ...(out.studentPortal as Record<string, unknown>) }
          : {};
      studentPortal.recordedCoursesEnabled = coursesSection.enabled;
      out.studentPortal = studentPortal;
    }
  }
  return out;
}

/** Legacy product names stored in CMS before AdvanceLMS rebrand. */
const LEGACY_BRAND_NAMES = [
  "EduPlatform",
  "eduplatform",
  "CodeZyne",
  "Lumina Academy",
  "Nasmatics",
  "NASMATICS",
] as const;

/** Replace legacy brand strings with the current product name. */
export function replaceLegacyBrandName(value: string): string {
  let result = value;
  for (const legacy of LEGACY_BRAND_NAMES) {
    const pattern = new RegExp(
      legacy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "gi",
    );
    result = result.replace(pattern, "AdvanceLMS");
  }
  return result;
}

function normalizeStringField(
  obj: Record<string, unknown>,
  key: string,
): void {
  const value = obj[key];
  if (typeof value === "string" && value.trim()) {
    obj[key] = replaceLegacyBrandName(value);
  }
}

/** Rewrite persisted CMS branding that still uses EduPlatform / CodeZyne. */
export function normalizeLegacyBrandNames<T extends Record<string, unknown>>(
  raw: T,
): T {
  const out = { ...raw } as Record<string, unknown>;

  normalizeStringField(out, "metaTitle");

  const branding = asBrandingRecord(out.branding);
  if (branding) {
    normalizeStringField(branding, "logoText");
    out.branding = branding;
  }

  const hero = asBrandingRecord(out.hero);
  if (hero) {
    normalizeStringField(hero, "brandDisplayName");
    normalizeStringField(hero, "subtitle");
    normalizeStringField(hero, "tagline");
    out.hero = hero;
  }

  const footer = asBrandingRecord(out.footer);
  if (footer) {
    normalizeStringField(footer, "copyright");
    const footerBranding = asBrandingRecord(footer.branding);
    if (footerBranding) {
      normalizeStringField(footerBranding, "logoText");
      footer.branding = footerBranding;
    }
    out.footer = footer;
  }

  const aboutPage = asBrandingRecord(out.aboutPage);
  if (aboutPage) {
    normalizeStringField(aboutPage, "heading");
    normalizeStringField(aboutPage, "description");
    normalizeStringField(aboutPage, "aboutContent");
    out.aboutPage = aboutPage;
  }

  return out as T;
}

function asBrandingRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }
  return null;
}

export function stripLegacyWebsiteContentKeys<T extends Record<string, unknown>>(
  raw: T,
): T {
  const out = { ...raw } as Record<string, unknown>;
  if (!out.features && out.whyChooseUs && typeof out.whyChooseUs === "object") {
    out.features = out.whyChooseUs;
  }
  for (const key of REMOVED_WEBSITE_CONTENT_KEYS) {
    delete out[key];
  }
  if (Array.isArray(out.sectionOrder)) {
    out.sectionOrder = (
      out.sectionOrder as Array<{ id?: string }>
    ).filter((item) => !item?.id || !REMOVED_SECTION_ORDER_IDS.has(item.id));
  }
  return normalizeLegacyBrandNames(out as T);
}


import {
  HOME_FAQ,
  HOME_FEATURES,
  HOME_FEATURES_IMAGE,
  HOME_HERO,
  HOME_PARTNERS,
} from "@/data/homePageContent";

/** Settings document category for CMS website content. */
export const WEBSITE_CONTENT_CATEGORY = "website-content";

export const CACHE_TAG_WEBSITE_CONTENT = "website-content";

const PRIMARY_COLOR = "#0040a1";
const SECONDARY_COLOR = "#b52330";

export interface WebsiteContent {
  metaTitle: string;
  contact: {
    registrationNumber: string;
  };
  contactPage: ContactPageContent;
  aboutPage: AboutPageContent;
  socialMedia: {
    facebook: string;
    twitter: string;
    linkedin: string;
    instagram?: string;
    youtube?: string;
  };
  branding: {
    logoText: string;
    logoTextColor1: string;
    logoTextColor2: string;
    logoIconColor1: string;
    logoIconColor2: string;
    logoUrl: string;
    faviconUrl: string;
  };
  navigation: {
    home: {
      label: string;
      items: Array<{ label: string; href: string }>;
    };
    category: {
      label: string;
      items: Array<{ label: string; href: string }>;
    };
    pages: {
      label: string;
      items: Array<{ label: string; href: string }>;
    };
    courses: {
      label: string;
      items: Array<{ label: string; href: string }>;
    };
    account: {
      label: string;
      items: Array<{ label: string; href: string }>;
    };
    contact: {
      label: string;
      href: string;
    };
  };
  buttons: {
    liveCourse: {
      enabled: boolean;
      text: string;
      href?: string;
    };
    login: {
      text: string;
      href: string;
    };
  };
  mobileMenu: {
    items: Array<{ label: string; href: string }>;
  };
  partners: PartnersContent;
  hero: HeroContent;
  about: AboutContent;
  footer: FooterContent;
  batches: BatchesContent;
  courses: CoursesContent;
  coursesByCategory: CoursesByCategoryContent;
  homeInstructors: HomeInstructorsContent;
  features: FeaturesContent;
  statistics: StatisticsContent;
  sectionOrder: SectionConfig[];
  faq: FAQContent;
  blog: BlogContent;
  promotionalBanner: PromoBannerContent;
  courseLessonBanner: CourseLessonBannerContent;
  studentPortal: StudentPortalContent;
}

const HOME_FEATURE_ICON_TYPES: Array<
  import("@/lib/websiteContentTypes").WhyChooseUsFeature["iconType"]
> = ["flexible", "instructor", "money", "community"];

export const defaultFeaturesContent: FeaturesContent = {
  sectionHeading: "Powerful Features for an Elite Experience",
  sectionSubtitle:
    "Our platform isn't just about video lessons; it's a complete ecosystem designed to facilitate mastery and networking.",
  label: { text: "Features", backgroundColor: PRIMARY_COLOR },
  title: { part1: "", part2: "", part3: "", part4: "", part5: "" },
  titleColors: {
    part1: PRIMARY_COLOR,
    part2: SECONDARY_COLOR,
    part3: PRIMARY_COLOR,
    part4: PRIMARY_COLOR,
    part5: PRIMARY_COLOR,
  },
  description: "",
  image: HOME_FEATURES_IMAGE,
  features: HOME_FEATURES.map((item, index) => ({
    id: index + 1,
    title: item.title,
    titleBn: item.title,
    description: item.body,
    descriptionBn: item.body,
    iconType: HOME_FEATURE_ICON_TYPES[index] ?? "flexible",
  })),
};

export const defaultStatisticsContent: StatisticsContent = {
  items: [
    {
      id: 1,
      number: "150",
      suffix: "k",
      label: "Students Enrolled",
      labelBengali: "",
      iconType: "students",
    },
    {
      id: 2,
      number: "25",
      suffix: "K",
      label: "Total Courses",
      labelBengali: "",
      iconType: "courses",
    },
    {
      id: 3,
      number: "120",
      suffix: "+",
      label: "Expert Tutors",
      labelBengali: "",
      iconType: "tutors",
    },
    {
      id: 4,
      number: "50",
      suffix: "+",
      label: "Win Awards",
      labelBengali: "",
      iconType: "awards",
    },
  ],
};

const ABOUT_HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA49z5j8dNSWa9xyciQauqnApJ20f5WiqAAFt1WC0qJnfhMUz2PJC4u1-22QUWy7ne00W-7hNpWway3iinbaoTxzGVBdugweY_nGDoBhF9xnkL1QPXKw4AlJGLV35u6rQx1eW8GM9DaUFs5Zbl81chOkgg2lD0Fbct348O1Tyr3jCw1xpW7NDWRVmnI2cxsDNVGAeYALh7qYZ3FGBDKOoso9_EjggIWuvXSzy2uRtrm3XaWNlqGjaMQvFd3YkTCU4iLY_xewch068Y";

const categoryNavItems = [
  { label: "Web Development", href: "/courses" },
  { label: "Data Science", href: "/courses" },
  { label: "Design", href: "/courses" },
];

/** Full default CMS payload (admin + public read) — AdvanceLMS English content. */
export const defaultWebsiteContent: WebsiteContent = {
  metaTitle: "AdvanceLMS — Online Learning Platform",
  contact: {
    registrationNumber: "123, Road 1, Block A, Mirpur 10, Dhaka 1216",
  },
  contactPage: {
    headline: "Get in Touch",
    subheadline:
      "Have questions about our courses or need help choosing the right path? We're here to help.",
    mapEmbedUrl: "",
    phone: "+880 1717 1717 1717",
    email: "contact@carmarket.premium",
    address: "123, Road 1, Block A, Mirpur 10, Dhaka 1216",
  },
  aboutPage: {
    heading: "The digital elite knowledge platform",
    description:
      "We are a team of dedicated educators and professionals who are passionate about helping students achieve their academic goals.",
    aboutContent:
      "Welcome to AdvanceLMS, a premier education hub dedicated to transforming academic dreams into reality. We bridge the gap between aspiring students and top-tier global universities through expert guidance, personalized counseling, and comprehensive test preparation. Our team specializes in holistic support, covering everything from university selection and visa processing to pre-departure briefing. By combining years of experience with a network of world-class institutions, we empower students to unlock their potential and achieve academic excellence.",
    imageUrl: ABOUT_HERO_IMAGE,
  },
  socialMedia: {
    facebook: "#",
    twitter: "#",
    linkedin: "#",
    instagram: "",
    youtube: "",
  },
  branding: {
    logoText: "AdvanceLMS",
    logoTextColor1: PRIMARY_COLOR,
    logoTextColor2: SECONDARY_COLOR,
    logoIconColor1: SECONDARY_COLOR,
    logoIconColor2: PRIMARY_COLOR,
    logoUrl: "",
    faviconUrl: "",
  },
  navigation: {
    home: {
      label: "Home",
      items: [{ label: "Home", href: "/" }],
    },
    category: {
      label: "Categories",
      items: categoryNavItems,
    },
    pages: {
      label: "Pages",
      items: [
        { label: "About us", href: "/about" },
        { label: "Contact", href: "/contact" },
      ],
    },
    courses: {
      label: "Courses",
      items: [
        { label: "All Courses", href: "/courses" },
        { label: "Courses Designed for Success", href: "/#courses" },
      ],
    },
    account: {
      label: "Account",
      items: [
        { label: "Sign in", href: "/login" },
        { label: "Join for free", href: "/register" },
        { label: "Dashboard", href: "/student/dashboard" },
      ],
    },
    contact: {
      label: "Contact",
      href: "/contact",
    },
  },
  buttons: {
    liveCourse: {
      enabled: true,
      text: "All Courses",
    },
    login: {
      text: "Sign in",
      href: "/login",
    },
  },
  mobileMenu: {
    items: [
      { label: "Home", href: "/" },
      { label: "All Courses", href: "/courses" },
      { label: "Enroll", href: "/enroll" },
      { label: "About us", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  partners: {
    title: "Our Trusted Partners & Integrations",
    items: HOME_PARTNERS.map((p) => ({
      name: p.name,
      imageUrl: p.imageUrl,
      href: p.href,
    })),
  },
  hero: {
    subtitle: HOME_HERO.tagline,
    tagline: HOME_HERO.tagline,
    brandDisplayName: "AdvanceLMS",
    badge: HOME_HERO.badge,
    title: {
      part1: HOME_HERO.headlineBefore,
      part2: HOME_HERO.headlineAccent,
      part3: "",
      part4: "",
      part5: "",
    },
    titleColors: {
      part1: PRIMARY_COLOR,
      part2: PRIMARY_COLOR,
      part3: PRIMARY_COLOR,
      part4: PRIMARY_COLOR,
      part5: PRIMARY_COLOR,
    },
    gradientColors: {
      from: PRIMARY_COLOR,
      to: SECONDARY_COLOR,
    },
    description: HOME_HERO.introParagraphs.join("\n\n"),
    introParagraphs: [...HOME_HERO.introParagraphs],
    bioColumns: {
      left: [...HOME_HERO.bioLeft],
      right: [...HOME_HERO.bioRight],
    },
    portraitImage: HOME_HERO.heroImage,
    highlightStat: {
      value: HOME_HERO.statValue,
      label: HOME_HERO.statLabel,
    },
    buttons: {
      primary: {
        text: "Join Now",
        href: "/register",
      },
      secondary: {
        text: "Join for free",
        href: "/register",
      },
    },
    carousel: {
      enabled: false,
      autoPlay: false,
      autoPlayInterval: 3000,
      items: [],
    },
    stats: {
      students: {
        enabled: true,
        count: HOME_HERO.statValue,
        avatars: [],
      },
      courses: {
        enabled: true,
        count: "20k+",
      },
    },
  },
  about: {
    label: {
      text: "Who we are",
      backgroundColor: PRIMARY_COLOR,
    },
    title: {
      part1: "The digital elite",
      part2: "knowledge",
      part3: "platform",
      part4: "",
      part5: "",
    },
    titleColors: {
      part1: PRIMARY_COLOR,
      part2: SECONDARY_COLOR,
      part3: PRIMARY_COLOR,
      part4: PRIMARY_COLOR,
      part5: PRIMARY_COLOR,
    },
    description:
      "We are a team of dedicated educators and professionals who are passionate about helping students achieve their academic goals.",
    features: [
      {
        title: "Curation",
        description:
          "Courses are reviewed for clarity, outcomes, and instructional quality.",
      },
      {
        title: "Community",
        description:
          "Learners and instructors share feedback to keep content current.",
      },
      {
        title: "Integrity",
        description: "Clear policies and support — no hidden fees in mock checkout flows.",
      },
    ],
    button: {
      text: "Explore courses",
      href: "/courses",
    },
    experience: {
      number: "12+",
      label: "Years Experience",
      gradientFrom: PRIMARY_COLOR,
      gradientTo: SECONDARY_COLOR,
    },
    images: {
      main: ABOUT_HERO_IMAGE,
      secondary: ABOUT_HERO_IMAGE,
    },
  },
  footer: {
    branding: {
      logoText: "AdvanceLMS",
      logoIcon: "N",
      logoIconColor: PRIMARY_COLOR,
      logoTextColor: PRIMARY_COLOR,
      description:
        "Elevating digital education through premium curation and world-class expert networks.",
    },
    newsletter: {
      title: "Newsletter",
      emailPlaceholder: "Email",
      buttonText: "Subscribe",
      buttonGradientFrom: PRIMARY_COLOR,
      buttonGradientTo: SECONDARY_COLOR,
    },
    companyLinks: [
      { label: "About us", href: "/about" },
      { label: "Courses", href: "/courses" },
      { label: "Expert network", href: "/courses" },
    ],
    quickLinks: [
      { label: "Home", href: "/" },
      { label: "All Courses", href: "/courses" },
      { label: "Contact", href: "/contact" },
    ],
    contact: {
      address: {
        label: "Headquarters",
        value: "123, Road 1, Block A, Mirpur 10, Dhaka 1216",
      },
      phone: {
        label: "Phone",
        value: "+880 1717 1717 1717",
      },
      email: {
        label: "Email",
        value: "contact@carmarket.premium",
      },
    },
    copyright: "© AdvanceLMS. The digital curator of elite knowledge.",
    backgroundGradient: {
      from: "#E8EEF7",
      to: "#F5E8EA",
    },
  },
  batches: {
    title: {
      part1: "Live",
      part2: "courses",
    },
    description:
      "Enroll in live courses with instructor-led sessions, then pick a batch section that fits your schedule.",
    buttonText: "View all",
    buttonHref: "/enroll",
    featuredBatchIds: [],
  },
  courses: {
    label: {
      text: "Courses",
      backgroundColor: PRIMARY_COLOR,
    },
    title: {
      part1: "Courses Designed for",
      part2: "Success",
    },
    titleColors: {
      part1: PRIMARY_COLOR,
      part2: SECONDARY_COLOR,
    },
    gradientColors: {
      from: PRIMARY_COLOR,
      to: SECONDARY_COLOR,
    },
    buttonText: "View all",
    buttonHref: "/courses",
    buttonGradientFrom: PRIMARY_COLOR,
    buttonGradientTo: SECONDARY_COLOR,
    featuredCourseIds: undefined,
  },
  homeInstructors: {
    badgeLabel: "Our Mentors",
    sectionHeading: "Meet Our Expert Mentors",
    sectionSubtitle:
      "Learn from the best in the industry—our mentors bring years of experience, knowledge, and passion to guide you.",
    instructorIds: [],
  },
  features: defaultFeaturesContent,
  statistics: defaultStatisticsContent,
  coursesByCategory: {
    label: {
      text: "Categories",
      backgroundColor: PRIMARY_COLOR,
    },
    title: {
      part1: "Browse courses",
      part2: "by",
      part3: "category",
    },
    titleColors: {
      part1: PRIMARY_COLOR,
      part2: PRIMARY_COLOR,
      part3: SECONDARY_COLOR,
    },
    gradientColors: {
      from: PRIMARY_COLOR,
      to: SECONDARY_COLOR,
    },
    buttonText: "View all",
    buttonHref: "/courses",
    buttonGradientFrom: PRIMARY_COLOR,
    buttonGradientTo: SECONDARY_COLOR,
  },
  sectionOrder: DEFAULT_SECTION_ORDER,
  faq: {
    label: {
      text: "FAQ",
      backgroundColor: PRIMARY_COLOR,
    },
    title: {
      part1: "Frequently Asked",
      part2: "Questions",
    },
    titleColors: {
      part1: PRIMARY_COLOR,
      part2: SECONDARY_COLOR,
    },
    gradientColors: {
      from: PRIMARY_COLOR,
      to: SECONDARY_COLOR,
    },
    faqs: HOME_FAQ.map((item, index) => ({
      id: index + 1,
      question: item.q,
      answer: item.a,
      order: index + 1,
    })),
  },
  blog: {
    title: {
      part1: "Latest",
      part2: "insights",
    },
    description:
      "Stay up to date with tips, tutorials, and news from our learning community.",
    buttonText: "View more",
    buttonHref: "/blog",
    featuredPostIds: [],
  },
  promotionalBanner: {
    enabled: true,
    imageUrl: "",
    link: "/courses",
    headline: "Courses Designed for Success",
    subtext:
      "Curated paths focusing on high-impact skills that the global market demands today..",
    ctaLabel: "View all",
  },
  courseLessonBanner: {
    enabled: true,
    title: HOME_FEATURES[2].title,
    imageUrl: "",
  },
  studentPortal: {
    recordedCoursesEnabled: true,
  },
};

export function validateWebsiteContent(settings: unknown): { isValid: boolean; error?: string } {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return { isValid: false, error: "Settings must be an object" };
  }

  const s = settings as Record<string, unknown>;


  if (s.metaTitle !== undefined && typeof s.metaTitle !== "string") {
    return { isValid: false, error: "Meta title must be a string" };
  }

  if (s.courseLessonBanner && typeof s.courseLessonBanner === "object") {
    const banner = s.courseLessonBanner as Record<string, unknown>;
    if (banner.enabled !== undefined && typeof banner.enabled !== "boolean") {
      return { isValid: false, error: "Course lesson banner enabled must be a boolean" };
    }
  }

  const insecure = findInsecureImageUrlInObject(s);
  if (insecure) {
    return { isValid: false, error: insecure };
  }

  return { isValid: true };
}

/** Per-section defaults (slices of `defaultWebsiteContent`) for admin/legacy CMS UIs. */
export const defaultHeroContent = defaultWebsiteContent.hero;
export const defaultAboutContent = defaultWebsiteContent.about;
export const defaultFooterContent = defaultWebsiteContent.footer;
export const defaultPartnersContent = defaultWebsiteContent.partners;
export const defaultCoursesContent = defaultWebsiteContent.courses;
export const defaultHomeInstructorsContent = defaultWebsiteContent.homeInstructors;
export const defaultCoursesByCategoryContent = defaultWebsiteContent.coursesByCategory;
export const defaultSectionOrder = defaultWebsiteContent.sectionOrder;
export const defaultFAQContent = defaultWebsiteContent.faq;
export const defaultBlogContent = defaultWebsiteContent.blog;
export const defaultPromoBannerContent = defaultWebsiteContent.promotionalBanner;
export const defaultCourseLessonBannerContent = defaultWebsiteContent.courseLessonBanner;
export const defaultContactPageContent = defaultWebsiteContent.contactPage;
export const defaultAboutPageContent = defaultWebsiteContent.aboutPage;
