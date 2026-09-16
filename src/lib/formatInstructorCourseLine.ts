/** Home mentor card subtitle: one course or "Course A + N courses". */
export function formatInstructorCourseLine(courseTitles: string[]): string {
  const titles = courseTitles.map((t) => t.trim()).filter(Boolean);
  if (titles.length === 0) return "Instructor";
  if (titles.length === 1) return `Instructor : ${titles[0]}`;
  const extra = titles.length - 1;
  return `Instructor : ${titles[0]} + ${extra} ${extra === 1 ? "course" : "courses"}`;
}
