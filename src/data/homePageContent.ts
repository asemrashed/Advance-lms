/**
 * Static marketing copy for CMS seed defaults and hero/FAQ fallbacks.
 */

export const HOME_HERO = {
  tagline: "Premier Digital Learning",
  badge: "Cambridge IGCSE Add Maths · 0606",
  headlineBefore: "Helping students see Mathematics in ",
  headlineAccent: "the real world.",
  introParagraphs: [
    "With over 7 years of experience and a 90% A & A* rate, I'm passionate about making Add Maths click — not just on paper, but in everyday life.",
    "As a Mechanical Engineer from Dhaka, I know firsthand how powerful mathematics becomes when you understand *why* it works, not just how.",
  ],
  bioLeft: [
    "Too many students can solve an equation but freeze when the world asks them to use it. That gap — between knowing maths and *living* it — is exactly what AdvanceLMS was built to close.",
    "Growing up and studying engineering in Dhaka, I kept meeting brilliant people who asked the same question: *'Where will I ever use this?'* That question inspired everything I do.",
  ],
  bioRight: [
    "Through years of teaching, I've discovered that students don't struggle with maths because they're not smart — they struggle because no one connected it to something real. My resources are built to fix that.",
    "Whether you're pushing for an A* or just trying to make sense of functions and calculus, I'm here to make the journey feel worth it.",
  ],
  heroImage: "/images/nasmatic.png",
  statValue: "90%",
  statLabel: "A & A* RATE",
  eyebrow: "Premier Digital Learning",
  navItems: [
    { label: "Resources", href: "/courses" },
    { label: "Video", href: "/courses" },
    { label: "Live Classes", href: "/courses" },
  ],
  titleBefore: "Helping students see Mathematics in ",
  titleAccent: "the real world.",
  description:
    "With over 7 years of experience and a 90% A & A* rate, I'm passionate about making Add Maths click — not just on paper, but in everyday life.",
};

export const HOME_FEATURES_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA4hJNB4ZGj-XYYhd_-dq7X7y-9h716Q5KpN36ZAiZHpfsnEfbqhsUrqKSB6xe9rL-TGAfAbH0nmtZaJlh5_AqYbesdI4Vrj6yi9aQe2ZrKxBLyYWMjQuK-UA9jR0TOdElPay8PKf5U0-BBX9EkMnbR8X40VuaLDAMRh1_MXNpg9H76jWFYdOh7zklT_vVMAxauIWqmdMgOwtFhiOLYjnXyYmxcfp7tZRjWAQIHFpkr1aox-bJQ5gTNrQRCtaDUr7kyvZuTHhxSido";

export const HOME_FEATURES = [
  {
    icon: "route",
    iconBg: "bg-primary",
    title: "Personalized Learning Paths",
    body: "AI-driven curriculum adjustment based on your progress and goals.",
  },
  {
    icon: "video_chat",
    iconBg: "bg-secondary",
    title: "Live Sessions & Webinars",
    body: "Interact weekly with industry pioneers in high-bandwidth live events.",
  },
  {
    icon: "dashboard",
    iconBg: "bg-[#0040a1]",
    title: "Student Dashboard",
    body: "Track every milestone with our comprehensive data-rich student panel.",
  },
  {
    icon: "groups",
    iconBg: "bg-tertiary-container",
    title: "Community & Networking",
    body: "Access private forums and global networking events with elite alumni.",
  },
] as const;

export const HOME_PARTNERS = [
  "HubSpot",
  "Zoom",
  "Zendesk",
  "Notion",
  "Slack",
] as const;

export const HOME_FAQ = [
  {
    q: "What types of courses do you offer?",
    a: `We offer a wide range of courses across various domains including technology, business, design, marketing, and more. Each course is designed to provide in-depth knowledge and practical skills to help you excel in your career.`,
  },
  {
    q: "How can I enroll?",
    a: `Simply click the "Enroll Course" button on any course card or navigate to the course details page. You can pay via credit card, PayPal, or use your corporate learning credits. Once processed, you'll have instant access to all materials.`,
  },
  {
    q: "Is there a group discount for institutions?",
    a: `Yes, we offer special pricing for institutions and organizations looking to provide learning opportunities for their teams. Please contact our sales team for more information.`,
  },
] as const;
