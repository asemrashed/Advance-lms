import { CourseDetailSkeleton } from "@/components/skeletons/CourseDetailSkeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-screen-2xl px-8 py-16">
      <CourseDetailSkeleton />
    </div>
  );
}
