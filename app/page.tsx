import { TutorShell } from "@/components/tutor-shell";
import { readProgress } from "@/lib/progress";
import { loadCourse } from "@/lib/syllabus";

const DEFAULT_COURSE_ID = "PY101";

export default async function Home() {
  const course = await loadCourse(DEFAULT_COURSE_ID);
  const progress = await readProgress(DEFAULT_COURSE_ID);

  return <TutorShell course={course} initialProgress={progress} />;
}
