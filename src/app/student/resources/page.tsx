import Link from "next/link";
import {
  LuBookOpen,
  LuCheck as LuCheckCircle,
  LuFileText,
  LuNewspaper,
  LuArrowRight,
} from "react-icons/lu";

export default function StudentResourcesIndexPage() {
  const resources = [
    {
      href: "/student/resources/notes",
      title: "Notes",
      description: "Concise, exam-focused notes organised by subject and topic.",
      icon: LuBookOpen,
      tone: "bg-amber-50 text-amber-700",
    },
    {
      href: "/student/resources/worksheets",
      title: "Worksheets",
      description: "Topical practice files with public and enrolled-course access.",
      icon: LuFileText,
      tone: "bg-sky-50 text-sky-700",
    },
    {
      href: "/student/resources/test-yourself",
      title: "Test Yourself",
      description: "Quick topic-by-topic tests with saved progress and results.",
      icon: LuCheckCircle,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      href: "/student/resources/past-papers",
      title: "Past Papers",
      description: "Question papers, mark schemes and worked solutions.",
      icon: LuNewspaper,
      tone: "bg-violet-50 text-violet-700",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-950">Resources</h1>
        <p className="mt-1 text-sm text-slate-500">
          Notes, worksheets, tests, and past papers for your courses.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {resources.map((resource) => (
          <Link
            key={resource.href}
            href={resource.href}
            className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${resource.tone}`}>
              <resource.icon className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-950">{resource.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{resource.description}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-700">
              Browse resources
              <LuArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
