"use client";

import { useCallback, useEffect, useState } from "react";
import { StudentRoleShell } from "@/components/role-area/StudentRoleShell";
import {
  PaymentHistoryClient,
  paymentsService,
} from "@/components/payments/PaymentHistoryClient";
import { PayableItemsList } from "@/components/payments/PayableItemsList";
import Modal from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import PageSection from "@/components/PageSection";
import WelcomeSection from "@/components/WelcomeSection";
import {
  duePaymentsService,
  type DuePaymentItem,
} from "@/services/enrollmentRequestsService";
import { MonthlyRenewalWarningBanner } from "@/components/payments/MonthlyRenewalWarningBanner";
import { LuWallet } from "react-icons/lu";

type Tab = "history" | "due";

export default function StudentPaymentsClient() {
  const [tab, setTab] = useState<Tab>("history");
  const [due, setDue] = useState<DuePaymentItem[]>([]);
  const [payable, setPayable] = useState<DuePaymentItem[]>([]);
  const [loadingDue, setLoadingDue] = useState(false);
  const [showMakePayment, setShowMakePayment] = useState(false);

  const loadDue = useCallback(async () => {
    try {
      setLoadingDue(true);
      const res = await duePaymentsService.list();
      const data = await res.json();
      if (res.ok && data.success) {
        setDue(data.data?.due || []);
        setPayable(data.data?.payable || []);
      }
    } finally {
      setLoadingDue(false);
    }
  }, []);

  useEffect(() => {
    loadDue();
  }, [loadDue]);

  return (
    <StudentRoleShell>
      <main className="relative z-10 p-2 sm:p-4">
        <WelcomeSection
          title="My Payments"
          description="Course and batch transactions, monthly renewals, and invoices"
        />

        <MonthlyRenewalWarningBanner />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2 border-b border-gray-200">
            <Button
              variant="ghost"
              onClick={() => setTab("history")}
              className={cn(
                "rounded-none border-b-2 border-transparent px-4 pb-2",
                tab === "history" && "border-blue-600 text-blue-600",
              )}
            >
              Payment list
            </Button>
            <Button
              variant="ghost"
              onClick={() => setTab("due")}
              className={cn(
                "rounded-none border-b-2 border-transparent px-4 pb-2",
                tab === "due" && "border-blue-600 text-blue-600",
              )}
            >
              Due payments
              {due.length > 0 && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  {due.length}
                </span>
              )}
            </Button>
          </div>

          <Button onClick={() => setShowMakePayment(true)}>
            <LuWallet className="mr-2 h-4 w-4" />
            Make Payment
          </Button>
        </div>

        {tab === "history" ? (
          <PaymentHistoryClient
            role="student"
            title="My Payments"
            description="Course and batch transactions, with invoices where available"
            tableMode="student"
            filterVariant="student"
            showCourseBatchFilters
            hideWelcome
            fetchPayments={(query) => paymentsService.listStudentPayments(query)}
          />
        ) : (
          <PageSection
            title="Due payments"
            description="Monthly renewals due soon and pending payments"
          >
            {loadingDue ? (
              <p className="py-6 text-center text-sm text-gray-500">Loading...</p>
            ) : (
              <PayableItemsList
                items={due}
                emptyText="No dues right now. You're all caught up!"
                onCashSubmitted={loadDue}
              />
            )}
          </PageSection>
        )}

        <Modal
          open={showMakePayment}
          onClose={() => setShowMakePayment(false)}
          title="Make a payment"
          description="Pay for pending enrollments or renew a monthly plan"
          size="lg"
          cancelText="Close"
        >
          <div className="px-4">
            {loadingDue ? (
              <p className="py-6 text-center text-sm text-gray-500">Loading...</p>
            ) : (
              <PayableItemsList
                items={payable}
                emptyText="Nothing to pay. You have no pending or due payments."
                onCashSubmitted={() => {
                  loadDue();
                  setShowMakePayment(false);
                }}
              />
            )}
          </div>
        </Modal>
      </main>
    </StudentRoleShell>
  );
}
