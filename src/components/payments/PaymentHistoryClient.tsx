"use client";

import { useCallback, useEffect, useState } from "react";
import PageSection from "@/components/PageSection";
import WelcomeSection from "@/components/WelcomeSection";
import { PaymentOverviewStats } from "@/components/payments/PaymentOverviewStats";
import { PaymentDataTable, type PaymentTableMode } from "@/components/payments/PaymentDataTable";
import {
  PaymentHistoryFilters,
  type PaymentFilterVariant,
} from "@/components/payments/PaymentHistoryFilters";
import { paymentsService } from "@/services/paymentsService";
import type { PaymentFilters, PaymentRecord, PaymentStats } from "@/types/payment";
import { StaffChipTabs } from "@/components/staff/StaffResponsive";

type TabConfig = { id: string; label: string };

interface PaymentHistoryClientProps {
  role: "student" | "instructor" | "admin";
  title: string;
  description: string;
  tableMode: PaymentTableMode;
  filterVariant: PaymentFilterVariant;
  fetchPayments: (query: string) => Promise<Response>;
  tabs?: TabConfig[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  showCourseBatchFilters?: boolean;
  hideWelcome?: boolean;
  showMethodBreakdown?: boolean;
  hideRevenue?: boolean;
}

const defaultPagination = {
  page: 1,
  limit: 10,
  total: 0,
  pages: 0,
  hasNext: false,
  hasPrev: false,
};

export function PaymentHistoryClient({
  role,
  title,
  description,
  tableMode,
  filterVariant,
  fetchPayments,
  tabs,
  activeTab,
  onTabChange,
  showCourseBatchFilters = false,
  hideWelcome = false,
  showMethodBreakdown = false,
  hideRevenue = false,
}: PaymentHistoryClientProps) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState(defaultPagination);
  const [searchDraft, setSearchDraft] = useState("");
  const [filters, setFilters] = useState<PaymentFilters>({
    page: 1,
    limit: 10,
    status: "all",
  });
  const [courses, setCourses] = useState<Array<{ _id: string; title: string }>>([]);
  const [batches, setBatches] = useState<Array<{ _id: string; name: string }>>([]);
  const [instructors, setInstructors] = useState<Array<{ _id: string; name: string }>>([]);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(filters.page),
        limit: String(filters.limit),
      });
      if (filters.search) params.set("search", filters.search);
      if (filters.status && filters.status !== "all") params.set("status", filters.status);
      if (filters.courseId) params.set("courseId", filters.courseId);
      if (filters.batchId) params.set("batchId", filters.batchId);
      if (filters.studentId) params.set("studentId", filters.studentId);
      if (filters.instructorId) params.set("instructorId", filters.instructorId);
      if (filters.courseType) params.set("courseType", filters.courseType);
      if (filters.grade) params.set("grade", filters.grade);
      if (filters.year) params.set("year", filters.year);
      if (filters.subject) params.set("subject", filters.subject);
      if (filters.method && filters.method !== "all") params.set("method", filters.method);

      const response = await fetchPayments(params.toString());
      const data = await response.json();

      if (response.ok) {
        setPayments(data.data?.payments || []);
        setPagination(data.data?.pagination || defaultPagination);
        setStats(data.data?.stats || null);
      } else {
        setError(data.error || "Failed to load payments");
        setPayments([]);
        setStats(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payments");
      setPayments([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [fetchPayments, filters]);

  useEffect(() => {
    setFilters({ page: 1, limit: 10, status: "all" });
    setSearchDraft("");
  }, [activeTab]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments, activeTab]);

  useEffect(() => {
    if (!showCourseBatchFilters && role !== "admin") return;

    const loadOptions = async () => {
      try {
        const fetches: Promise<Response>[] = [
          fetch("/api/courses?limit=500&page=1"),
          fetch("/api/batches?limit=500&page=1"),
        ];
        if (role === "admin") {
          fetches.push(fetch("/api/teachers?limit=500&page=1"));
        }
        const [coursesRes, batchesRes, teachersRes] = await Promise.all(fetches);
        const coursesData = await coursesRes.json();
        const batchesData = await batchesRes.json();
        if (coursesRes.ok) {
          setCourses(coursesData.data?.courses || coursesData.courses || []);
        }
        if (batchesRes.ok) {
          setBatches(batchesData.data?.batches || batchesData.batches || []);
        }
        if (teachersRes?.ok) {
          const teachersData = await teachersRes.json();
          const list =
            teachersData.data?.teachers ||
            teachersData.data?.instructors ||
            teachersData.teachers ||
            [];
          setInstructors(
            (list as Array<Record<string, unknown>>).map((t) => ({
              _id: String(t._id),
              name: String(t.name || "").trim() || "Instructor",
            })),
          );
        }
      } catch {
        /* ignore */
      }
    };
    loadOptions();
  }, [showCourseBatchFilters, role]);

  const applySearch = () => {
    setFilters((prev) => ({ ...prev, search: searchDraft.trim(), page: 1 }));
  };

  const clearSearch = () => {
    setSearchDraft("");
    setFilters((prev) => ({ ...prev, search: undefined, page: 1 }));
  };

  const body = (
    <>
      {!hideWelcome ? <WelcomeSection title={title} description={description} /> : null}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {tabs && tabs.length > 1 && (
        <StaffChipTabs
          className="mb-4"
          tabs={tabs}
          value={activeTab || tabs[0].id}
          onChange={(id) => onTabChange?.(id)}
        />
      )}

      <PageSection title="Overview" className="mb-4">
        <PaymentOverviewStats
          stats={stats}
          loading={loading}
          variant={role === "student" ? "student" : "staff"}
          showMethodBreakdown={showMethodBreakdown}
          hideRevenue={hideRevenue}
        />
      </PageSection>

      <PageSection
        title="Payment History"
        description={
          role === "student"
            ? "Your course and batch payment records"
            : "Browse and filter payment transactions"
        }
        className="mb-4 overflow-hidden"
      >
        <div className="mb-4 min-w-0 space-y-3">
          {showCourseBatchFilters || role === "admin" ? (
            <StaffChipTabs
              tabs={[
                { id: "all", label: "All payments" },
                { id: "online", label: "Online" },
                { id: "offline", label: "Offline / cash" },
              ]}
              value={filters.method || "all"}
              onChange={(id) =>
                setFilters((prev) => ({
                  ...prev,
                  method: id === "all" ? undefined : (id as PaymentFilters["method"]),
                  page: 1,
                }))
              }
            />
          ) : null}
          <PaymentHistoryFilters
            variant={filterVariant}
            filters={filters}
            searchDraft={searchDraft}
            onSearchDraftChange={setSearchDraft}
            onApplySearch={applySearch}
            onClearSearch={clearSearch}
            onFilterChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
            courses={courses}
            batches={batches}
            instructors={instructors}
          />
        </div>
        <PaymentDataTable
          payments={payments}
          loading={loading}
          mode={tableMode}
          pagination={pagination}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
        />
      </PageSection>
    </>
  );

  if (hideWelcome) {
    return body;
  }

  return <main className="relative z-10 p-2 sm:p-4">{body}</main>;
}

export { paymentsService };
