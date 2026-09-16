"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import AdvancedApexCharts from "@/components/dashboard/lp/AdvancedApexCharts";
import RecentActivities from "@/components/dashboard/lp/RecentActivities";
import PageSection from "@/components/dashboard/lp/PageSection";
import PageGrid from "@/components/dashboard/lp/PageGrid";
import WelcomeSection from "@/components/dashboard/lp/WelcomeSection";
import { AdminCourseTypeMetrics } from "@/components/dashboard/AdminCourseTypeMetrics";
import { AdminCoursesListingSection } from "@/components/dashboard/AdminCoursesListingSection";
import {
  LuRefreshCw as RefreshCw,
  LuBookOpen as BookOpen,
  LuUsers as Users,
  LuCalendar as Calendar,
  LuGraduationCap as GraduationCap,
  LuMegaphone as Megaphone,
  LuStar as Star,
  LuSettings as Settings,
} from "react-icons/lu";
import type { AdminDashboardApiPayload } from "@/types/dashboard";
import type { IconType } from "react-icons";
import { AdminDashboardSkeleton } from "@/components/skeletons/DashboardSkeletons";

export interface AdminDashboardParityProps {
  dashboardData: AdminDashboardApiPayload | null;
  loading: boolean;
  onRefresh: () => void | Promise<void>;
}

const emptyMetrics = {
  totalCourses: 0,
  totalBatches: 0,
  totalStudents: 0,
  totalInstructors: 0,
  totalRevenue: 0,
};

type QuickAction = {
  href: string;
  label: string;
  icon: IconType;
  border: string;
  text: string;
  hoverBg: string;
  hoverText: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    href: "/admin/courses",
    label: "Manage Courses",
    icon: BookOpen,
    border: "border-blue-300",
    text: "text-blue-700",
    hoverBg: "hover:bg-blue-500",
    hoverText: "hover:text-white hover:border-blue-500",
  },
  {
    href: "/admin/students",
    label: "Manage Students",
    icon: Users,
    border: "border-emerald-300",
    text: "text-emerald-700",
    hoverBg: "hover:bg-emerald-500",
    hoverText: "hover:text-white hover:border-emerald-500",
  },
  {
    href: "/admin/courses?courseType=live",
    label: "Manage Batches",
    icon: Calendar,
    border: "border-sky-300",
    text: "text-sky-700",
    hoverBg: "hover:bg-sky-500",
    hoverText: "hover:text-white hover:border-sky-500",
  },
  {
    href: "/admin/teachers",
    label: "Manage Teachers",
    icon: GraduationCap,
    border: "border-violet-300",
    text: "text-violet-700",
    hoverBg: "hover:bg-violet-500",
    hoverText: "hover:text-white hover:border-violet-500",
  },
  {
    href: "/admin/notices",
    label: "Notice Board",
    icon: Megaphone,
    border: "border-amber-300",
    text: "text-amber-700",
    hoverBg: "hover:bg-amber-500",
    hoverText: "hover:text-white hover:border-amber-500",
  },
  {
    href: "/admin/reviews",
    label: "Manage Reviews",
    icon: Star,
    border: "border-orange-300",
    text: "text-orange-700",
    hoverBg: "hover:bg-orange-500",
    hoverText: "hover:text-white hover:border-orange-500",
  },
  {
    href: "/admin/settings",
    label: "System Settings",
    icon: Settings,
    border: "border-rose-300",
    text: "text-rose-700",
    hoverBg: "hover:bg-rose-500",
    hoverText: "hover:text-white hover:border-rose-500",
  },
];

export function AdminDashboardParity({
  dashboardData,
  loading,
  onRefresh,
}: AdminDashboardParityProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (dashboardData) setLastUpdated(new Date());
  }, [dashboardData]);

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      await onRefreshRef.current();
      setLastUpdated(new Date());
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      void (async () => {
        try {
          setRefreshing(true);
          await onRefreshRef.current();
          setLastUpdated(new Date());
        } finally {
          setRefreshing(false);
        }
      })();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const chartData = useMemo(() => {
    if (!dashboardData) return undefined;
    const courseStats =
      dashboardData.chartCourseStats?.length > 0
        ? dashboardData.chartCourseStats.map((c) => ({
            id: c.id,
            title: c.title,
            enrollmentCount: c.enrollmentCount,
            completionRate: c.completionRate,
          }))
        : dashboardData.courseStats.map((c) => ({
            id: c.id,
            title: c.title,
            enrollmentCount: c.enrollmentCount,
            completionRate: c.completionRate,
          }));
    return {
      trends: dashboardData.trends,
      courseStats,
      paymentStats: dashboardData.paymentStats,
    };
  }, [dashboardData]);

  if (loading && !dashboardData) {
    return <AdminDashboardSkeleton />;
  }

  return (
    <main className="relative z-10 p-2 sm:p-4">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <WelcomeSection
            title="Admin Dashboard"
            description="Comprehensive analytics and management overview"
          />
          <p className="mt-2 text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        <div className="mt-4 flex items-center space-x-3 sm:mt-0">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              autoRefresh
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <div
              className={`h-2 w-2 rounded-full ${autoRefresh ? "animate-pulse bg-green-500" : "bg-gray-400"}`}
            />
            <span>Auto-refresh</span>
          </button>

          <button
            onClick={() => void fetchDashboardData(true)}
            disabled={refreshing}
            className="flex items-center space-x-2 rounded-lg bg-primary px-4 py-2 text-white shadow-md transition-all duration-200 hover:bg-primary/90 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      <PageSection
        title="Key Metrics"
        description="Live and recorded course performance overview"
        className="mb-6"
      >
        <AdminCourseTypeMetrics
          live={dashboardData?.courseTypeMetrics?.live ?? emptyMetrics}
          recorded={dashboardData?.courseTypeMetrics?.recorded ?? emptyMetrics}
          loading={loading}
        />
      </PageSection>

      <PageSection
        title="Quick Actions"
        description="Common administrative tasks"
        className="mb-6"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href + action.label}
                href={action.href}
                className={`group flex flex-col items-center justify-center gap-2 rounded-xl border-2 bg-white px-3 py-4 text-center transition-all duration-200 ${action.border} ${action.text} ${action.hoverBg} ${action.hoverText}`}
              >
                <Icon className="h-6 w-6 transition-transform duration-200 group-hover:scale-110" />
                <span className="text-xs font-semibold leading-tight sm:text-sm">
                  {action.label}
                </span>
              </Link>
            );
          })}
        </div>
      </PageSection>

      <AdminCoursesListingSection
        coursesHref="/admin/courses"
        builderHref={(id) => `/admin/materials?courseId=${id}`}
      />

      <PageGrid columns={3} gap="md" className="mb-6">
        <div className="xl:col-span-2 min-h-0">
          <PageSection title="Analytics Dashboard">
            <AdvancedApexCharts data={chartData} loading={loading} />
          </PageSection>
        </div>
        <div className="min-h-0">
          <PageSection title="Recent Activities">
            <RecentActivities
              recentEnrollments={dashboardData?.recentEnrollments || []}
              loading={loading}
            />
          </PageSection>
        </div>
      </PageGrid>
    </main>
  );
}
