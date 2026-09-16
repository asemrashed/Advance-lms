/** Internal topic value for course-level tests (no lesson/topic selection). */
export const TEST_YOURSELF_COURSE_TOPIC = "Course";

export function formatTestYourselfName(topic: string, subject: string): string {
  const t = topic.trim();
  const s = subject.trim();
  if (!t || t === TEST_YOURSELF_COURSE_TOPIC) return s || "Untitled test";
  if (!s) return t;
  return `${t}-${s}`;
}

export function formatCourseTestName(subject: string): string {
  return subject.trim() || "Untitled test";
}

export function isCourseLevelTestTopic(topic: string): boolean {
  const t = topic.trim();
  return !t || t === TEST_YOURSELF_COURSE_TOPIC;
}

export function testYourselfSessionKey(subject: string, topic: string): string {
  if (isCourseLevelTestTopic(topic)) {
    return subject.trim().toLowerCase();
  }
  return `${subject.trim().toLowerCase()}|${topic.trim().toLowerCase()}`;
}
