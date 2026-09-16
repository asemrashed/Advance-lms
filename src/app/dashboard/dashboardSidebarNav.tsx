import type { IconType } from "react-icons";
import {
  LuBookOpen as BookOpen,
  LuCalendar as Calendar,
  LuBookmark,
  LuChartBar,
  LuClipboardCheck,
  LuClipboardList,
  LuClock,
  LuFileText,
  LuGlobe as Globe,
  LuGraduationCap as GraduationCap,
  LuLayoutDashboard,
  LuLayers,
  LuLibrary,
  LuMegaphone,
  LuReceipt,
  LuSettings as Settings,
  LuShield,
  LuStar as Star,
  LuTag as Tag,
  LuUserCheck as UserCheck,
  LuUsers as Users,
} from "react-icons/lu";
import type { DashboardRole } from "@/types/dashboard";
import {
  canAccessAdminPayments,
  type AdminPermission,
} from "@/lib/adminPermissions";

export type SidebarNavItem = {
  icon: IconType;
  label: string;
  href: string;
  badge?: string | null;
  children?: Omit<SidebarNavItem, "children" | "badge">[];
  /** When true, only visible to super_admin in the admin sidebar. */
  superAdminOnly?: boolean;
  /** When set, visible to super admins or admins who have any of these permissions. */
  requiredAnyPermissions?: AdminPermission[];
};

export type SidebarNavCategory = {
  category: string;
  items: SidebarNavItem[];
};

/** Mirrors `learning-project/src/components/StudentSidebar.tsx` — paths match App Router. */
const studentNav: SidebarNavCategory[] = [
  {
    category: "Main",
    items: [
      {
        icon: LuLayoutDashboard,
        label: "Dashboard",
        href: "/student/dashboard",
        badge: null,
      },
      {
        icon: BookOpen,
        label: "My Courses",
        href: "/student/courses",
        badge: null,
      },
      {
        icon: Calendar,
        label: "Schedule",
        href: "/student/schedule",
        badge: null,
      },
      {
        icon: UserCheck,
        label: "Attendance",
        href: "/student/attendance",
        badge: null,
      },
    ],
  },
  {
    category: "Learning",
    items: [
      {
        icon: LuClipboardList,
        label: "Worksheets",
        href: "/student/resources/worksheets",
        badge: null,
      },
      {
        icon: LuFileText,
        label: "Assignments",
        href: "/student/assignments",
        badge: null,
      },
      {
        icon: LuClipboardCheck,
        label: "Tests",
        href: "/student/tests",
        badge: null,
      },
      { icon: GraduationCap, label: "Exams", href: "/student/exams", badge: null },
      { icon: LuChartBar, label: "My Progress", href: "/student/progress", badge: null },
    ],
  },
  {
    category: "Explore",
    items: [
      {
        icon: Users,
        label: "Browse Instructors",
        href: "/student/instructors",
        badge: null,
      },
      {
        icon: LuLibrary,
        label: "Resources",
        href: "/student/resources",
        badge: null,
        children: [
          { icon: LuFileText, label: "Notes", href: "/student/resources/notes" },
          {
            icon: LuBookmark,
            label: "Past Papers",
            href: "/student/resources/past-papers",
          },
        ],
      },
      {
        icon: Globe,
        label: "Browse Courses",
        href: "/student/browse-courses",
        badge: null,
      },
      {
        icon: LuMegaphone,
        label: "Notice Board",
        href: "/student/notice-board",
        badge: null,
      },
      { icon: Star, label: "Reviews", href: "/student/reviews", badge: null },
      {
        icon: LuClock,
        label: "Exam History",
        href: "/student/exam-history",
        badge: null,
      },
    ],
  },
  {
    category: "Account",
    items: [
      { icon: LuReceipt, label: "Payments", href: "/student/payments", badge: null },
      { icon: Users, label: "Profile", href: "/student/profile", badge: null },
      { icon: Settings, label: "Settings", href: "/student/settings", badge: null },
    ],
  },
];

/** Complete instructor panel IA — Curriculum Builder maps to /instructor/materials. */
const instructorNav: SidebarNavCategory[] = [
  {
    category: "Main",
    items: [
      {
        icon: LuLayoutDashboard,
        label: "Dashboard",
        href: "/instructor/dashboard",
        badge: null,
      },
    ],
  },
  {
    category: "Teaching",
    items: [
      { icon: BookOpen, label: "My Courses", href: "/instructor/courses", badge: null },
      {
        icon: LuClipboardCheck,
        label: "Curriculum Builder",
        href: "/instructor/materials",
        badge: null,
      },
      { icon: Calendar, label: "Schedule", href: "/instructor/schedule", badge: null },
      { icon: Users, label: "Students", href: "/instructor/students", badge: null },
      { icon: LuClipboardList, label: "Assignments", href: "/instructor/assignments", badge: null },
      { icon: LuFileText, label: "Question Bank", href: "/instructor/question-bank", badge: null },
      { icon: LuLayers, label: "Test Creator", href: "/instructor/tests", badge: null },
      { icon: LuFileText, label: "Exams", href: "/instructor/exams", badge: null },
    ],
  },
  {
    category: "Engagement",
    items: [
      { icon: UserCheck, label: "Enrollments", href: "/instructor/enrollments", badge: null },
      { icon: LuMegaphone, label: "Notice Board", href: "/instructor/notice-board", badge: null },
      { icon: Star, label: "Reviews", href: "/instructor/reviews", badge: null },
    ],
  },
  {
    category: "Account",
    items: [
      { icon: GraduationCap, label: "Profile", href: "/instructor/profile", badge: null },
      { icon: LuReceipt, label: "Payment History", href: "/instructor/payments", badge: null },
      { icon: Settings, label: "Settings", href: "/instructor/settings", badge: null },
    ],
  },
];

/** Mirrors `learning-project/src/components/AppSidebar.tsx` (active menu subset). */
const adminNav: SidebarNavCategory[] = [
  {
    category: "Main",
    items: [
      {
        icon: LuLayoutDashboard,
        label: "Dashboard",
        href: "/admin/dashboard",
        badge: null,
      },
    ],
  },
  {
    category: "Resources",
    items: [
      { icon: LuLibrary, label: "Notes", href: "/admin/resources/notes", badge: null },
      {
        icon: LuClipboardList,
        label: "Worksheets",
        href: "/admin/resources/worksheets",
        badge: null,
      },
      {
        icon: LuClipboardCheck,
        label: "Test Yourself",
        href: "/admin/resources/test-yourself",
        badge: null,
      },
      {
        icon: LuBookmark,
        label: "Past Papers",
        href: "/admin/resources/past-papers",
        badge: null,
      },
    ],
  },
  {
    category: "Learning",
    items: [
      { icon: BookOpen, label: "Courses", href: "/admin/courses", badge: null },
      {
        icon: LuClipboardCheck,
        label: "Curriculum Builder",
        href: "/admin/materials",
        badge: null,
      },
      { icon: Tag, label: "Subjects", href: "/admin/subjects", badge: null },
      {
        icon: LuLayers,
        label: "Platform Question Bank",
        href: "/admin/platform-question-bank",
        badge: null,
      },
    ],
  },
  {
    category: "People",
    items: [
      { icon: Users, label: "Students", href: "/admin/students", badge: null },
      { icon: GraduationCap, label: "Teachers", href: "/admin/teachers", badge: null },
      { icon: UserCheck, label: "Enrollments", href: "/admin/enrollments", badge: null },
      {
        icon: LuReceipt,
        label: "Payment History",
        href: "/admin/payments",
        badge: null,
        requiredAnyPermissions: [
          "view_payments",
          "view_platform_income",
          "view_instructor_income",
        ],
      },
      {
        icon: LuClipboardCheck,
        label: "Batch reconcile",
        href: "/admin/batch-enrollments/reconcile",
        badge: null,
        superAdminOnly: true,
      },
      {
        icon: LuShield,
        label: "Admins",
        href: "/admin/admins",
        badge: null,
        superAdminOnly: true,
      },
    ],
  },
  {
    category: "Communication",
    items: [
      { icon: Star, label: "Reviews", href: "/admin/reviews", badge: null },
      { icon: LuMegaphone, label: "Notice Board", href: "/admin/notices", badge: null },
      { icon: LuFileText, label: "Blog", href: "/admin/blog", badge: null },
    ],
  },
  {
    category: "System",
    items: [
      {
        icon: Globe,
        label: "Website Content",
        href: "/admin/website-content",
        badge: null,
        superAdminOnly: true,
      },
    ],
  },
];

export function getDashboardSidebarNav(
  role: DashboardRole,
  options?: {
    recordedCoursesEnabled?: boolean;
    isSuperAdmin?: boolean;
    adminPermissions?: readonly string[];
  },
): SidebarNavCategory[] {
  switch (role) {
    case "student": {
      if (options?.recordedCoursesEnabled === false) {
        return studentNav.map((category) => ({
          ...category,
          items: category.items.filter(
            (item) =>
              item.href !== "/student/browse-courses" &&
              item.label !== "Browse Courses",
          ),
        }));
      }
      return studentNav.map((category) => ({
        ...category,
        items: category.items.map((item) =>
          item.label === "Browse Courses"
            ? { ...item, href: "/courses" }
            : item,
        ),
      }));
    }
    case "instructor":
      return instructorNav;
    case "admin": {
      const allowSuper = options?.isSuperAdmin === true;
      const permissions = options?.adminPermissions;
      return adminNav
        .map((category) => ({
          ...category,
          items: category.items.filter((item) => {
            if (item.superAdminOnly && !allowSuper) return false;
            if (item.requiredAnyPermissions?.length) {
              if (allowSuper) return true;
              if (item.href === "/admin/payments") {
                return canAccessAdminPayments(permissions, "admin");
              }
              return item.requiredAnyPermissions.some((permission) =>
                permissions?.includes(permission),
              );
            }
            return true;
          }),
        }))
        .filter((category) => category.items.length > 0);
    }
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

/** On QA `/dashboard`, keep "Dashboard" nav pointing at `/dashboard` (role switcher context). */
export function getDashboardSidebarNavForPath(
  role: DashboardRole,
  pathname: string,
  options?: {
    recordedCoursesEnabled?: boolean;
    isSuperAdmin?: boolean;
    adminPermissions?: readonly string[];
  },
): SidebarNavCategory[] {
  const base = getDashboardSidebarNav(role, options);
  if (pathname !== "/dashboard") return base;
  return base.map((cat) => ({
    ...cat,
    items: cat.items.map((it) =>
      it.label === "Dashboard" ? { ...it, href: "/dashboard" } : it,
    ),
  }));
}
