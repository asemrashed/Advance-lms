import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminBatchSubjectRedirectPage({
  params,
}: PageProps) {
  const { id } = await params;
  redirect(`/admin/materials?batchId=${id}`);
}
