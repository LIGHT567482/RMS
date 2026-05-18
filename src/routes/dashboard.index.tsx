import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import {
  useStore,
  getSubjects,
  getMarks,
  getProjects,
  getSchool,
} from "@/lib/storage";
import { BookOpen, ClipboardList, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/dashboard/")({
  component: Overview,
});

function Stat({
  icon: Icon,
  label,
  value,
  to,
  variant = "primary",
}: {
  icon: any;
  label: string;
  value: number | string;
  to: string;
  variant?: "primary" | "secondary";
}) {
  const iconClasses =
    variant === "secondary" ? "bg-secondary/15 text-secondary" : "bg-primary/15 text-primary";

  return (
    <Link to={to}>
      <Card className={`p-5 hover:shadow-lg transition-all group cursor-pointer h-full bg-muted`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-display font-bold mt-1">{value}</p>
          </div>
          <div className={`h-10 w-10 rounded-lg ${iconClasses} flex items-center justify-center`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 text-xs text-primary inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          Open <ArrowRight className="h-3 w-3" />
        </div>
      </Card>
    </Link>
  );
}

function Overview() {
  const subjects = useStore(getSubjects);
  const marks = useStore(getMarks);
  const projects = useStore(getProjects);
  const school = useStore(getSchool);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="font-display text-4xl">Welcome back</h1>
        <p className="text-muted-foreground mt-1">
          {school.name} • {school.motto}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Stat
          variant="secondary"
          icon={BookOpen}
          label="Subjects"
          value={subjects.length}
          to="/dashboard/subjects"
        />
        <Stat
          variant="primary"
          icon={ClipboardList}
          label="Mark Entries"
          value={marks.length}
          to="/dashboard/marks"
        />
        <Stat
          variant="secondary"
          icon={Sparkles}
          label="Project Records"
          value={projects.length}
          to="/dashboard/project-work"
        />
      </div>

      <Card className="p-6 bg-muted">
        <h2 className="font-display text-xl mb-3">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Link
            to="/dashboard/marks"
            className="p-4 rounded-lg border bg-muted hover:border-primary hover:bg-accent/30 transition"
          >
            <ClipboardList className="h-5 w-5 text-primary mb-2" />
            <p className="font-medium">Enter term marks</p>
            <p className="text-xs text-muted-foreground">CA (out of 20) + Exam (out of 80)</p>
          </Link>
        </div>
      </Card>
    </div>
  );
}
