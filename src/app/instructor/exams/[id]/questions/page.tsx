import type { Metadata } from "next";
import { Suspense } from "react";
import InstructorQuestionsPage from "./InstructorExamQuestionsClient";
import { RoleAreaPageSkeleton } from "@/components/skeletons/DashboardSkeletons";

export const metadata: Metadata = {
  title: "Exam questions",
};

export default function InstructorExamQuestionsRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<RoleAreaPageSkeleton />}>
      <InstructorQuestionsPage params={params} />
    </Suspense>
  );
}
