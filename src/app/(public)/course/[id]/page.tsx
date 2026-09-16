import type { Metadata } from "next";
import { CourseDetailClient } from "@/app/course/[id]/CourseDetailClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Course`,
    description: `Course details · ${id.slice(-6)}`,
  };
}

export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-screen-2xl px-8 py-16">
      <CourseDetailClient courseId={id} />
    </div>
  );
}
