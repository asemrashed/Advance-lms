/**
 * Static catalog rows from Frontend-design/AllCourse.html (supplements Redux mock list for full-grid parity).
 */

export type CatalogCategoryId = string;

export type CatalogSidebarItem = {
  id: CatalogCategoryId;
  label: string;
  count: number;
};

export const CATALOG_SIDEBAR: CatalogSidebarItem[] = [
  { id: "all" as const, label: "All", count: 48 },
  { id: "web-development" as const, label: "Web Development", count: 8 },
  { id: "data-science" as const, label: "Data Science", count: 7 },
  { id: "design" as const, label: "Design", count: 5 },
  { id: "programming" as const, label: "Programming", count: 6 },
  { id: "cloud-computing" as const, label: "Cloud Computing", count: 4 },
  { id: "mobile-development" as const, label: "Mobile Development", count: 4 },
  { id: "marketing" as const, label: "Marketing", count: 5 },
  { id: "databases" as const, label: "Databases", count: 4 },
  { id: "cybersecurity" as const, label: "Cybersecurity", count: 5 },
] as const;

export type StaticCatalogCard = {
  image: string;
  imageAlt: string;
  badge: string;
  categoryId: CatalogCategoryId;
  title: string;
  description: string;
  price: string;
  lessons: string;
};

export const STATIC_CATALOG_CARDS: StaticCatalogCard[] = [
  {
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAcBZqvF9S4XJxbHTkXmH3f9S2nguKoBLsh0WNiXpxEKcPtiqm2q7u33HtkChEiGO1yVUXV3YX74chjCSR7svAuh4oufS4xwpXvso6_X2WA4QfIZCHg3IgoM6bQ7P7QwRhnpibyqv9DP-VXOg7dVeSLbJfdwKBqCB1LwPVssAmyNDTKfvPg1e0WHUS7a3iJ-I5pKEvulcBVK9uwaJPTg1WCGxtjm12MTH5a2FG47aMxv3kE2g3CNHutYA6O-VeQg6x7EDTIoXnqfvI",
    imageAlt: "Data Science",
    badge: "Data Science",
    categoryId: "data-science",
    title: "Advanced Machine Learning & AI Neural Networks",
    description:
      "Master complex neural architectures and predictive modeling for industrial scale AI solutions.",
    price: "$129.00",
    lessons: "10+ Lessons",
  },
  {
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC9O_v90zXFBZf8rhF7Y8nyJf2azFgA5dpdF-8b3mBvzNd-mQCDAbLBTrGwAPT_xmxpt3aAROhbWFxcaTvavEMO2nCbOefWA39v6KLeSTBXCuW0zcoG-gmb3RyfmKIL8WiDtRYbgujHk3yHUMII3gHWhpLzJXO3oMQFqOOfaZg7P_Per0DaT_v6O4Q54fBVYF_dNHFHhzs03yOSJuYPMSk0zgcvlrIpNcBwy559R-S1iKB7pYdayiuYL67Q83WhHYC0JwqVPfduLE8",
    imageAlt: "Academic",
    badge: "Academic",
    categoryId: "design",
    title: "Elite English Literature: From Classical to Modern",
    description:
      "Analyze the evolution of global narratives through critical lenses of history and philosophy.",
    price: "$89.00",
    lessons: "12+ Lessons",
  },
  {
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDGw8ETAlon156vG21L6z7jIzzNAcymGm1l821DyTD9GnVe95vtnTfAbblCNYHHlsoiQxo6EC73z8h-zpjOkcSWxdToZvPD2b64kktuRY5vH-wM_xEMqBU8AoTSaEhAQH7DDejaZP1DQVDQYg6PhBMR6zc_lHcnHrJlkx03jbp-0RZCIc-1mZYTxgUz1k_R02m1SbvrAwqMEpmzADonlSuiC3FIQjMTT8zEh0Nf-VQdnXsC8bgB56zHoAeVRdZIHZpdmGMeM9NpO18",
    imageAlt: "Admission",
    badge: "Admission",
    categoryId: "programming",
    title: "Global MBA Entry Prep: Master Quantitative Reasoning",
    description:
      "Comprehensive curriculum focused on GMAT/GRE logic patterns and mathematical fluency.",
    price: "$149.00",
    lessons: "20+ Lessons",
  },
  {
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC-jx6KAaYl0QzH3oETl4LU_yc8PAEMAuFnNzs_767m-4Px9PsVbZHT7kAlt6b8pegVsbo9AEtrCCXTpXHPsU1n2LdN2vf0e6LEwQEQBVLpgyHrGZGliGBTluYZFQ0x-CCoEC633xxH8Y8OhkCeVUSEkLcBha3RsoDLEayUCHzs9NiiWc7FAuw8gUEhlX--ldQZ91C38i_Ueg5q0rlt-cHBSt5nDs6qX906TiHbo9NMa13qXAu_D466HxSvbdQ06I2A9gcmJnFzL3c",
    imageAlt: "HSC",
    badge: "HSC",
    categoryId: "programming",
    title: "Pure Mathematics: Advanced Calculus for HSC Success",
    description:
      "Deep dive into differentiation, integration, and mathematical modeling for academic excellence.",
    price: "$75.00",
    lessons: "15+ Lessons",
  },
  {
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDAxpC0gi9NbpJKK-0c0LZcBG0qQqaB9x8jkotHAGkGuE67pF59zDPHJm63p6GnskbEIDsQyB3o1e7hLgSJHJAJkN31B4O2_vBcLvteQJyb3oxzziBaW3QN1zmsgLabpGduS5STbn9KAyoIDyDm3F0T9xHMMJ0KMlflqxVE2oIzi3KUVF9vd9ATd_fIfILbD53A9tNWpV13kSWvDUrVFxoHnattRiWYbDwrrEHuIA8X3TrJxoQklnjtncpb7SBQsjCSDAB-RMP-OFw",
    imageAlt: "Data Science",
    badge: "Data Science",
    categoryId: "web-development",
    title: "Full-Stack Development: React & High-Performance Backends",
    description:
      "Build scalable modern web applications from frontend UI to complex database architectures.",
    price: "$199.00",
    lessons: "32+ Lessons",
  },
  {
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC3m4EfAMObkqqvbvQywj8SKI7UgFFNxceEsDnKeovkFT6zeAWOM8EK39oj725c9Z8Vrj_F32monOxgl69NfI_XmzV9_jullvDFc3gsARphtZy0cgp0KrkFZmHkiBq0N5d3OVJQYvkur8o1CpVxGqXYo7bR_pA8M7pOhSUjIM2YR-9oAJg3lF8XGsVWDIHQUUC8Y8m-MjxKDc7YLZ2c8cN0pZjsT97BaqAfR4-tmF_7uvwXOPyGiiimDp51RXU1tkGPuyLKIuCCjGY",
    imageAlt: "SSC",
    badge: "SSC",
    categoryId: "programming",
    title: "Foundational Physics: Concepts & Application for SSC",
    description:
      "Comprehensive understanding of fundamental mechanics, optics, and thermodynamics.",
    price: "$59.00",
    lessons: "10+ Lessons",
  },
];
