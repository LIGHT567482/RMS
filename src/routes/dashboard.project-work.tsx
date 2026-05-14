import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useStore, getStudents, getProjects, upsertProject } from "@/lib/storage";
import {
  ADVANCED_LEVELS, ALL_TERMS, ORDINARY_LEVELS, gradeFor, type ClassLevel, type Term,
} from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Save, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/project-work")({
  component: ProjectWorkPage,
});

function ProjectWorkPage() {
  const students = useStore(getStudents);
  const projects = useStore(getProjects);
  const [levelGroup, setLevelGroup] = useState<"ordinary" | "advanced">("ordinary");
  const [classLevel, setClassLevel] = useState<ClassLevel>(ORDINARY_LEVELS[0]);
  const [term, setTerm] = useState<Term>("Term 1");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const availableClassLevels = levelGroup === "advanced" ? ADVANCED_LEVELS : ORDINARY_LEVELS;
  useEffect(() => {
    if (!availableClassLevels.includes(classLevel)) {
      setClassLevel(availableClassLevels[0]);
    }
  }, [availableClassLevels, classLevel]);

  const filteredStudents = useMemo(
    () => students.filter((s) => s.classLevel === classLevel),
    [students, classLevel],
  );

  function valueFor(studentId: string) {
    const k = `${studentId}:${term}`;
    if (drafts[k] !== undefined) return drafts[k];
    const p = projects.find((p) => p.id === k);
    return p ? String(p.marks) : "";
  }

  function saveAll() {
    let count = 0;
    for (const s of filteredStudents) {
      const v = valueFor(s.id);
      if (v === "") continue;
      const n = parseFloat(v);
      if (Number.isNaN(n) || n < 0 || n > 100) return toast.error(`${s.name}: marks must be 0–100`);
      upsertProject({ id: `${s.id}:${term}`, studentId: s.id, term, marks: n });
      count++;
    }
    setDrafts({});
    toast.success(`Saved ${count} project work record${count === 1 ? "" : "s"}.`);
  }

  if (students.length === 0) {
    return <Card className="p-10 text-center text-muted-foreground max-w-xl mx-auto">Enroll students first.</Card>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="font-display text-3xl flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-[oklch(0.78_0.14_80)]" /> Project Work
        </h1>
        <p className="text-muted-foreground">Enter project work marks (0–100). The grade appears on the report card.</p>
      </div>

      <Card className="p-5 grid sm:grid-cols-3 gap-4">
        <div>
          <Label>Level</Label>
          <Select value={levelGroup} onValueChange={(v) => setLevelGroup(v as "ordinary" | "advanced")}> 
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ordinary">Ordinary Level (S.1–S.4)</SelectItem>
              <SelectItem value="advanced">Advanced Level (S.5–S.6)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Class</Label>
          <Select value={classLevel} onValueChange={(v) => setClassLevel(v as ClassLevel)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {availableClassLevels.map((level) => <SelectItem key={level} value={level}>{level}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Term</Label>
          <Select value={term} onValueChange={(v) => setTerm(v as Term)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALL_TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary"><tr>
              <th className="text-left p-3">Student</th>
              <th className="text-left p-3">Class</th>
              <th className="text-left p-3 w-40">Marks / 100</th>
              <th className="text-left p-3 w-24">Grade</th>
            </tr></thead>
            <tbody>
              {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  No students enrolled in {classLevel} yet.
                </td>
              </tr>
            ) : filteredStudents.map((s) => {
              const v = valueFor(s.id);
              const n = parseFloat(v || "0");
              const g = !isNaN(n) && v !== "" ? gradeFor(n).grade : "—";
              return (
                <tr key={s.id} className="border-t hover:bg-accent/20">
                  <td className="p-3 font-medium">{s.name}</td>
                  <td className="p-3">{s.classLevel}</td>
                  <td className="p-2">
                    <Input type="number" min={0} max={100} step="0.1"
                      value={v}
                      onChange={(e) => setDrafts((d) => ({ ...d, [`${s.id}:${term}`]: e.target.value }))} />
                  </td>
                  <td className="p-3 font-bold">{g}</td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t flex justify-end">
          <Button onClick={saveAll}><Save className="h-4 w-4 mr-1" /> Save Project Marks</Button>
        </div>
      </Card>
    </div>
  );
}
