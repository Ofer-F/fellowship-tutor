import { TutorShell } from "@/components/tutor-shell";
import { readProgress } from "@/lib/progress";
import { listCourseSummaries, loadCourse } from "@/lib/syllabus";

const DEFAULT_COURSE_ID = "PY101";

type HomeProps = {
  searchParams?: Promise<{
    courseId?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const courses = await listCourseSummaries();
  const params = await searchParams;
  const requestedCourseId = params?.courseId;
  const courseId =
    requestedCourseId && courses.some((course) => course.id === requestedCourseId)
      ? requestedCourseId
      : DEFAULT_COURSE_ID;
  const course = await loadCourse(courseId);
  const progress = await readProgress(course.id);

  return (
    <TutorShell
      availableCourses={courses}
      course={course}
      initialProgress={progress}
    />
  );
}
