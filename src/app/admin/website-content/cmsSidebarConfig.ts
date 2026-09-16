import type { IconType } from 'react-icons';
import {
  LuSparkles as Sparkles,
  LuInfo as Info,
  LuFileText as FileText,
  LuMessageSquare as MessageSquare,
  LuImage as ImageIcon,
  LuLayoutList as LayoutIcon,
  LuPalette as Palette,
  LuPhone as Phone,
  LuBriefcase as Briefcase,
  LuStar as Star,
  LuNavigation as Navigation,
  LuSettings as Settings,
  LuLayers as Layers,
  LuUsers as Users,
  LuChartBar as ChartBar,
} from 'react-icons/lu';

export type CmsTabId = string;

export interface CmsSidebarItem {
  id: CmsTabId;
  label: string;
  icon: IconType;
  badge?: 'Coming Soon' | 'Unused' | 'Future';
  dimmed?: boolean;
}

export interface CmsSidebarGroup {
  label: string;
  items: CmsSidebarItem[];
}

export const CMS_SIDEBAR_GROUPS: CmsSidebarGroup[] = [
  {
    label: 'Global Settings',
    items: [{ id: 'branding', label: 'Branding', icon: Palette }],
  },
  {
    label: 'Navigation',
    items: [
      { id: 'navigation', label: 'Header & Nav', icon: Navigation },
      { id: 'footer', label: 'Footer', icon: LayoutIcon },
    ],
  },
  {
    label: 'Home Page',
    items: [
      { id: 'hero', label: 'Hero', icon: Sparkles },
      { id: 'statistics', label: 'Statistics', icon: ChartBar },
      { id: 'batches', label: 'Featured Batches', icon: Briefcase },
      { id: 'features', label: 'Features', icon: Layers },
      { id: 'instructors', label: 'Instructors', icon: Users },
      { id: 'blog', label: 'Blog', icon: FileText },
      { id: 'faq', label: 'FAQ', icon: MessageSquare },
      { id: 'partners', label: 'Partners', icon: Briefcase },
      { id: 'reviews', label: 'Reviews', icon: Star },
      { id: 'promoBanner', label: 'Promo Banners', icon: ImageIcon },
      { id: 'sectionOrder', label: 'Section Order', icon: Settings },
    ],
  },
  {
    label: 'Pages',
    items: [
      { id: 'about', label: 'About Page', icon: Info },
      { id: 'contactPage', label: 'Contact Page', icon: Phone },
    ],
  },
  {
    label: 'Student Portal',
    items: [
      { id: 'studentPortal', label: 'Portal Settings', icon: Settings },
      { id: 'batches', label: 'Featured Batches', icon: Briefcase },
      { id: 'courses', label: 'Featured Courses', icon: Briefcase },
    ],
  },
];

export function isCmsTabActive(activeTab: string, itemId: string): boolean {
  if (activeTab === itemId) return true;
  if (itemId === 'promoBanner' && activeTab === 'courseLessonBanner') return true;
  if (itemId === 'courses' && activeTab === 'coursesByCategory') return true;
  if (itemId === 'navigation' && activeTab === 'buttons') return true;
  return false;
}

export function getCmsTabLabel(tabId: string): string {
  for (const group of CMS_SIDEBAR_GROUPS) {
    const item = group.items.find((i) => i.id === tabId);
    if (item) return item.label;
  }
  if (tabId === 'courseLessonBanner') return 'Course Lesson Banner';
  if (tabId === 'coursesByCategory') return 'Courses by Category';
  if (tabId === 'social') return 'Social Media';
  if (tabId === 'buttons') return 'Buttons';
  if (tabId === 'partners') return 'Partners';
  if (tabId === 'contactPage') return 'Contact Page';
  if (tabId === 'features') return 'Features';
  if (tabId === 'statistics') return 'Statistics';
  if (tabId === 'instructors') return 'Instructors';
  if (tabId === 'studentPortal') return 'Portal Settings';
  return tabId;
}
