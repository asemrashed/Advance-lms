/** CMS website content TypeScript contracts (EduPlatform). */

export interface HeroContent {
  subtitle: string;
  title: {
    part1: string;
    part2: string;
    part3: string;
    part4: string;
    part5: string;
  };
  titleColors: {
    part1: string;
    part2: string;
    part3: string;
    part4: string;
    part5: string;
  };
  gradientColors?: {
    from: string;
    via?: string;
    to: string;
  };
  description: string;
  buttons: {
    primary: { text: string; href: string };
    secondary: { text: string; href: string };
  };
  carousel: {
    enabled: boolean;
    autoPlay: boolean;
    autoPlayInterval: number;
    items: Array<{
      id: number;
      image: string;
      title: string;
      category: string;
    }>;
  };
  stats: {
    students: { enabled: boolean; count: string; avatars: string[] };
    courses: { enabled: boolean; count: string };
  };
  /** Editorial home hero (AdvanceLMS-style layout) */
  tagline?: string;
  brandDisplayName?: string;
  badge?: string;
  introParagraphs?: string[];
  bioColumns?: { left: string[]; right: string[] };
  portraitImage?: string;
  navItems?: Array<{ label: string; href: string }>;
  highlightStat?: { value: string; label: string };
}

export interface AboutContent {
  label: { text: string; backgroundColor: string };
  title: {
    part1: string;
    part2: string;
    part3: string;
    part4: string;
    part5: string;
  };
  titleColors: {
    part1: string;
    part2: string;
    part3: string;
    part4: string;
    part5: string;
  };
  description: string;
  features: Array<{ title: string; description: string }>;
  button: { text: string; href?: string };
  experience: {
    number: string;
    label: string;
    gradientFrom: string;
    gradientTo: string;
  };
  images: { main: string; secondary: string };
}

export interface WhyChooseUsFeature {
  id: number;
  title: string;
  titleBn: string;
  description: string;
  descriptionBn: string;
  iconType: "money" | "instructor" | "flexible" | "community";
}

export interface WhyChooseUsContent {
  /** Home / About features section main heading */
  sectionHeading?: string;
  /** Home / About features section subtitle */
  sectionSubtitle?: string;
  label: { text: string; backgroundColor: string };
  title: {
    part1: string;
    part2: string;
    part3: string;
    part4: string;
    part5: string;
  };
  titleColors: {
    part1: string;
    part2: string;
    part3: string;
    part4: string;
    part5: string;
  };
  description: string;
  image: string;
  features: WhyChooseUsFeature[];
}

/** Home & About platform features (CMS key: `features`). */
export type FeaturesContent = WhyChooseUsContent;

export interface StatisticsItem {
  id: number;
  number: string;
  suffix: string;
  label: string;
  labelBengali: string;
  iconType: "students" | "courses" | "tutors" | "awards";
}

export interface StatisticsContent {
  items: StatisticsItem[];
}

export interface ServiceItem {
  id: number;
  title: string;
  titleBengali: string;
  description: string;
  iconType:
    | "online-courses"
    | "live-classes"
    | "certification"
    | "expert-support"
    | "career-guidance"
    | "lifetime-access";
}

export interface BatchLevelItem {
  id: string;
  label: string;
  subtitle: string;
  color: string;
}

export interface BatchSectionContent {
  onlineButtonLabel: string;
  offlineButtonLabel: string;
  defaultActiveTab: "online" | "offline";
  onlineBackground: { from: string; via: string; to: string };
  offlineBackground: { from: string; via: string; to: string };
  onlineLevels: BatchLevelItem[];
  offlineLevels: BatchLevelItem[];
}

export interface ServicesContent {
  label: { text: string; backgroundColor: string };
  title: { part1: string; part2: string };
  titleColors: { part1: string; part2: string };
  gradientColors?: { from: string; to: string };
  services: ServiceItem[];
  batchSection?: BatchSectionContent;
}

export interface BlogPost {
  id: number;
  image: string;
  date: string;
  author: string;
  authorBengali: string;
  comments: string;
  commentsBengali: string;
  title: string;
  titleBengali: string;
  description: string;
  descriptionBengali: string;
}

export interface BlogContent {
  title: { part1: string; part2: string };
  description: string;
  buttonText: string;
  buttonHref: string;
  featuredPostIds?: string[];
}

export interface DownloadAppContent {
  label: { text: string; backgroundColor: string };
  title: {
    part1: string;
    part2: string;
    part3: string;
    part4: string;
    part5: string;
    part6: string;
    part7: string;
  };
  titleColors: {
    part1: string;
    part2: string;
    part3: string;
    part4: string;
    part5: string;
    part6: string;
    part7: string;
  };
  description: string;
  buttons: {
    googlePlay: {
      text: string;
      href: string;
      gradientFrom: string;
      gradientTo: string;
    };
    appStore: {
      text: string;
      href: string;
      gradientFrom: string;
      gradientVia?: string;
      gradientTo: string;
    };
  };
  backgroundImage: string;
}

export interface FooterLink {
  label: string;
  href: string;
}

export interface PartnerItem {
  name: string;
  imageUrl: string;
  href: string;
}

export interface PartnersContent {
  title: string;
  items: PartnerItem[];
}

export interface SocialMedia {
  name: string;
  icon: string;
  color: string;
  href: string;
}

export interface FooterContent {
  branding: {
    logoText: string;
    logoIcon: string;
    logoIconColor: string;
    logoTextColor: string;
    description: string;
  };
  newsletter: {
    title: string;
    emailPlaceholder: string;
    buttonText: string;
    buttonGradientFrom: string;
    buttonGradientTo: string;
  };
  companyLinks: FooterLink[];
  quickLinks: FooterLink[];
  contact: {
    address: { label: string; value: string };
    phone: { label: string; value: string };
    email: { label: string; value: string };
  };
  copyright: string;
  backgroundGradient: { from: string; to: string };
  /** @deprecated Use top-level `partners` — kept for legacy DB payloads */
  paymentGateway?: { title: string; methods: string[] };
  /** @deprecated Removed from footer UI */
  socialMedia?: SocialMedia[];
}

export interface BatchesContent {
  title: { part1: string; part2: string };
  description: string;
  buttonText: string;
  buttonHref: string;
  featuredBatchIds?: string[];
}

export interface CoursesContent {
  label: { text: string; backgroundColor: string };
  title: { part1: string; part2: string };
  titleColors: { part1: string; part2: string };
  gradientColors: { from: string; via?: string; to: string };
  buttonText: string;
  buttonHref: string;
  buttonGradientFrom: string;
  buttonGradientTo: string;
  featuredCourseIds?: string[];
}

export interface HomeInstructorsContent {
  badgeLabel: string;
  sectionHeading: string;
  sectionSubtitle: string;
  instructorIds?: string[];
}

export interface CoursesByCategoryContent {
  label: { text: string; backgroundColor: string };
  title: { part1: string; part2: string; part3: string };
  titleColors: { part1: string; part2: string; part3: string };
  gradientColors: { from: string; to: string };
  buttonText: string;
  buttonHref: string;
  buttonGradientFrom: string;
  buttonGradientTo: string;
}

export type SectionId =
  | "header"
  | "hero"
  | "about"
  | "courses"
  | "batches"
  | "features"
  | "instructors"
  | "partners"
  | "faq"
  | "whyChooseUs"
  | "statistics"
  | "services"
  | "coursesByCategory"
  | "testimonials"
  | "blog"
  | "downloadApp"
  | "footer";

export interface SectionConfig {
  id: SectionId;
  label: string;
  enabled: boolean;
  order: number;
}

export interface FAQItem {
  id: number;
  question: string;
  answer: string;
  order: number;
}

export interface FAQContent {
  label: { text: string; backgroundColor: string };
  title: { part1: string; part2: string };
  titleColors: { part1: string; part2: string };
  gradientColors?: { from: string; via?: string; to: string };
  faqs: FAQItem[];
}

export interface PromoBannerContent {
  enabled: boolean;
  imageUrl: string;
  link: string;
  headline: string;
  subtext: string;
  ctaLabel: string;
}

export interface CourseLessonBannerContent {
  enabled: boolean;
  title: string;
  imageUrl: string;
}

export interface StudentPortalContent {
  /** When false, student portal hides recorded-course browse links. */
  recordedCoursesEnabled: boolean;
}

/** Public /about page copy and media. */
export interface AboutPageContent {
  heading: string;
  description: string;
  aboutContent: string;
  imageUrl: string;
}

/** Public /contact page copy and contact details. */
export interface ContactPageContent {
  headline: string;
  subheadline: string;
  mapEmbedUrl: string;
  phone: string;
  email: string;
  address: string;
}
