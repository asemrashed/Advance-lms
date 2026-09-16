import { redirect } from "next/navigation";

export default async function StudentBatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(
    `/student/courses?tab=live&batchId=${encodeURIComponent(id)}`,
  );
}
