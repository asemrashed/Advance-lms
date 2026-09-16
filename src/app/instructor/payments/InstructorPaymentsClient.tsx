"use client";
import { useCallback, useEffect, useState } from "react";
import { LuFileSpreadsheet, LuFileText, LuHistory } from "react-icons/lu";
import InstructorPageWrapper from "@/components/InstructorPageWrapper";
import { InstructorRoleShell } from "@/components/role-area/InstructorRoleShell";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { formatBdt } from "@/lib/currency";
import { paymentsService } from "@/services/paymentsService";
import { exportRowsToExcel, exportRowsToPdf } from "@/lib/exportTable";
import type { PaymentFilters, PaymentRecord, PaymentStats } from "@/types/payment";
import {
  InstructorCard,
  InstructorPage,
  InstructorStatusBadge,
  InstructorTopbar,
} from "@/components/instructor-panel/InstructorPanelPrimitives";
import { PaymentOverviewStats } from "@/components/payments/PaymentOverviewStats";
import { PaymentDataTable } from "@/components/payments/PaymentDataTable";
import { PaymentHistoryFilters } from "@/components/payments/PaymentHistoryFilters";
import {
  StaffChipTabs,
  StaffFilterGrid,
  StaffMobileRecordCard,
  StaffRecordField,
  StaffRecordFields,
} from "@/components/staff/StaffResponsive";

const emptyStats: PaymentStats = {
  total: 0,
  successful: 0,
  pending: 0,
  failed: 0,
  totalRevenue: 0,
  successRate: 0,
  cashRevenue: 0,
  onlineRevenue: 0,
  cashCount: 0,
  onlineCount: 0,
};
const emptyPages = { page: 1, limit: 10, total: 0, pages: 0, hasNext: false, hasPrev: false };
type View = "students" | "own";

function badge(status: PaymentRecord["status"]) {
  return (
    <InstructorStatusBadge
      status={status === "success" ? "success" : status === "failed" ? "error" : "warning"}
      label={status === "success" ? "Successful" : status === "failed" ? "Failed" : "Processing"}
    />
  );
}

function paymentRowsToExport(rows: PaymentRecord[]) {
  const headers = ["Student", "Course/Batch", "Type", "Method", "Amount", "Status", "Transaction", "Date"];
  const data = rows.map((r) => [
    r.payer ? r.payer.name : "",
    r.item?.title || "",
    r.item?.typeLabel || "",
    r.methodLabel || (r.gateway === "cash" ? "Offline" : "Online"),
    r.amount,
    r.status,
    r.transactionId,
    new Date(r.createdAt).toLocaleDateString(),
  ]);
  return { headers, data };
}

function Content() {
  const [view, setView] = useState<View>("students");
  const [searchDraft, setSearchDraft] = useState("");
  const [filters, setFilters] = useState<PaymentFilters>({
    page: 1,
    limit: 10,
    status: "all",
  });
  const [rows, setRows] = useState<PaymentRecord[]>([]);
  const [stats, setStats] = useState(emptyStats);
  const [pages, setPages] = useState(emptyPages);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [courses, setCourses] = useState<Array<{ _id: string; title: string }>>([]);
  const [batches, setBatches] = useState<Array<{ _id: string; name: string }>>([]);

  const [historyStudent, setHistoryStudent] = useState<{ id: string; name: string } | null>(null);
  const [historyRows, setHistoryRows] = useState<PaymentRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const p = new URLSearchParams({
        view,
        page: String(filters.page),
        limit: String(filters.limit),
      });
      if (filters.status && filters.status !== "all") p.set("status", filters.status);
      if (filters.search) p.set("search", filters.search);
      if (view === "students") {
        if (filters.courseType) p.set("courseType", filters.courseType);
        if (filters.method && filters.method !== "all") p.set("method", filters.method);
        if (filters.courseId) p.set("courseId", filters.courseId);
        if (filters.batchId) p.set("batchId", filters.batchId);
        if (filters.grade) p.set("grade", filters.grade);
        if (filters.year) p.set("year", filters.year);
      } else if (filters.subject) {
        p.set("subject", filters.subject);
      }
      const response = await paymentsService.listInstructorPayments(p.toString());
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed to load payments");
      setRows(json.data?.payments || []);
      setStats(json.data?.stats || emptyStats);
      setPages(json.data?.pagination || emptyPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load payments");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [view, filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const [c, b] = await Promise.all([
          fetch("/api/courses?limit=500&page=1"),
          fetch("/api/batches?limit=500&page=1"),
        ]);
        const cj = await c.json();
        const bj = await b.json();
        if (c.ok) setCourses(cj.data?.courses || cj.courses || []);
        if (b.ok) setBatches(bj.data?.batches || bj.batches || []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const openHistory = async (student: { id: string; name: string }) => {
    setHistoryStudent(student);
    setHistoryLoading(true);
    setHistoryRows([]);
    try {
      const p = new URLSearchParams({ view: "students", studentId: student.id, limit: "200" });
      const res = await paymentsService.listInstructorPayments(p.toString());
      const json = await res.json();
      if (res.ok) setHistoryRows(json.data?.payments || []);
    } finally {
      setHistoryLoading(false);
    }
  };

  const exportCurrent = (kind: "excel" | "pdf") => {
    const { headers, data } = paymentRowsToExport(rows);
    if (kind === "excel") exportRowsToExcel("payments", headers, data);
    else exportRowsToPdf("payments", "Payment history", headers, data);
  };

  const exportHistory = (kind: "excel" | "pdf") => {
    if (!historyStudent) return;
    const { headers, data } = paymentRowsToExport(historyRows);
    const name = `payments-${historyStudent.name.replace(/\s+/g, "_")}`;
    if (kind === "excel") exportRowsToExcel(name, headers, data);
    else exportRowsToPdf(name, `Payments — ${historyStudent.name}`, headers, data);
  };

  return (
    <>
      <InstructorCard title="Overview">
        <PaymentOverviewStats stats={stats} loading={loading && !rows.length} />
      </InstructorCard>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      <InstructorCard title="Transaction Ledger">
        <div className="mb-4 min-w-0 space-y-3">
          <StaffFilterGrid className="sm:grid-cols-2 xl:grid-cols-2">
            <Button size="sm" variant="outline" disabled={!rows.length} onClick={() => exportCurrent("excel")}>
              <LuFileSpreadsheet className="mr-1" />
              Excel
            </Button>
            <Button size="sm" variant="outline" disabled={!rows.length} onClick={() => exportCurrent("pdf")}>
              <LuFileText className="mr-1" />
              PDF
            </Button>
          </StaffFilterGrid>
          <StaffChipTabs
            tabs={[
              { id: "students", label: "Course payments" },
              { id: "own", label: "My purchases" },
            ]}
            value={view}
            onChange={(v) => {
              setView(v as View);
              setFilters({ page: 1, limit: 10, status: "all" });
              setSearchDraft("");
            }}
          />
          <PaymentHistoryFilters
            variant={view === "students" ? "instructor_students" : "instructor_own"}
            filters={filters}
            searchDraft={searchDraft}
            onSearchDraftChange={setSearchDraft}
            onApplySearch={() =>
              setFilters((prev) => ({ ...prev, search: searchDraft.trim() || undefined, page: 1 }))
            }
            onClearSearch={() => {
              setSearchDraft("");
              setFilters((prev) => ({ ...prev, search: undefined, page: 1 }));
            }}
            onFilterChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
            courses={courses}
            batches={batches}
          />
        </div>
        <PaymentDataTable
          payments={rows}
          loading={loading}
          mode={view === "students" ? "instructor_students" : "instructor_own"}
          pagination={pages}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
          onPayerClick={
            view === "students"
              ? (payment) => {
                  if (payment.payer) openHistory({ id: payment.payer._id, name: payment.payer.name });
                }
              : undefined
          }
          extraActions={
            view === "students"
              ? [
                  {
                    key: "history",
                    label: "Payment history",
                    icon: <LuHistory className="h-4 w-4" />,
                    onClick: (payment) => {
                      if (payment.payer) openHistory({ id: payment.payer._id, name: payment.payer.name });
                    },
                    variant: "secondary",
                  },
                ]
              : []
          }
        />
      </InstructorCard>

      <Modal
        open={Boolean(historyStudent)}
        onClose={() => setHistoryStudent(null)}
        title={historyStudent ? `Payments — ${historyStudent.name}` : "Payments"}
        size="xl"
        cancelText="Close"
        footer={
          <StaffFilterGrid className="w-full sm:grid-cols-2 xl:grid-cols-2">
            <Button variant="outline" disabled={!historyRows.length} onClick={() => exportHistory("excel")}>
              <LuFileSpreadsheet className="mr-1" />
              Excel
            </Button>
            <Button variant="outline" disabled={!historyRows.length} onClick={() => exportHistory("pdf")}>
              <LuFileText className="mr-1" />
              PDF
            </Button>
          </StaffFilterGrid>
        }
      >
        <div className="px-2">
          {historyLoading ? (
            <p className="py-6 text-center text-sm text-gray-500">Loading...</p>
          ) : !historyRows.length ? (
            <p className="py-6 text-center text-sm text-gray-500">No payments found.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {historyRows.map((r) => (
                <StaffMobileRecordCard key={r._id}>
                  <StaffRecordFields>
                    <StaffRecordField label="Course / Batch" fullWidth>
                      {r.item?.title || "Payment"}
                    </StaffRecordField>
                    <StaffRecordField label="Amount">{formatBdt(r.amount)}</StaffRecordField>
                    <StaffRecordField label="Status">{badge(r.status)}</StaffRecordField>
                    <StaffRecordField label="Transaction">{r.transactionId}</StaffRecordField>
                    <StaffRecordField label="Date">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </StaffRecordField>
                  </StaffRecordFields>
                </StaffMobileRecordCard>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

export default function InstructorPaymentsClient() {
  return (
    <InstructorPageWrapper>
      <InstructorRoleShell>
        <InstructorPage>
          <InstructorTopbar title="Payment History" subtitle="Your earnings from course enrollments" />
          <Content />
        </InstructorPage>
      </InstructorRoleShell>
    </InstructorPageWrapper>
  );
}
