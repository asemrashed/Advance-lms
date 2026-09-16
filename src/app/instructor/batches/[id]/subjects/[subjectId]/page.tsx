import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function InstructorBatchSubjectRedirectPage({
  params,
}: PageProps) {
  const { id } = await params;
  redirect(`/instructor/materials?batchId=${id}`);
}
