import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useStore, getStudents, getSubjects, getMarks, getSubjectPapers, updateStudent, upsertMark } from "@/lib/storage";
import {
  ADVANCED_LEVELS, ALL_TERMS, ORDINARY_LEVELS, subjectsForStudent, type ClassLevel, type Term,
} from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/marks")({
  component: MarksPage,
});

function MarksPage() {
  const students = useStore(getStudents);
  const subjects = useStore(getSubjects);
  const marks = useStore(getMarks);

  const [levelGroup, setLevelGroup] = useState<"ordinary" | "advanced">("ordinary");
  const [classLevel, setClassLevel] = useState<ClassLevel>(ORDINARY_LEVELS[0]);
  const [term, setTerm] = useState<Term>("Term 1");
  const [subjectName, setSubjectName] = useState<string>(subjects[0]?.name ?? "");
  const [paperNumber, setPaperNumber] = useState(1);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const availableClassLevels = levelGroup === "advanced" ? ADVANCED_LEVELS : ORDINARY_LEVELS;
  useEffect(() => {
    if (!availableClassLevels.includes(classLevel)) {
      setClassLevel(availableClassLevels[0]);
    }
  }, [availableClassLevels, classLevel]);

  useEffect(() => {
    if (subjects.length && !subjects.some((s) => s.name === subjectName)) {
      setSubjectName(subjects[0].name);
    }
  }, [subjects, subjectName]);

  useEffect(() => {
    if (paperNumber > subjectPaperCount) {
      setPaperNumber(1);
    }
  }, [subjectPaperCount, paperNumber]);

  const studentsInClass = useMemo(
    () => students.filter((s) => s.classLevel === classLevel),
    [students, classLevel],
  );

  const subjectPaperCount = useMemo(
    () => getSubjectPapers(subjectName, levelGroup === "advanced" ? "A" : "O"),
    [subjectName, levelGroup],
  );

  function value(studentId: string): string {
    const key = `${studentId}:${term}:${subjectName}:${paperNumber}`;
    if (draft[key] !== undefined) return draft[key];
    const m = marks.find((m) => m.id === `${studentId}:${term}:${subjectName}:${paperNumber}`);
    return m && m.score !== undefined ? String(m.score) : "";
  }

  function setVal(studentId: string, v: string) {
    const key = `${studentId}:${term}:${subjectName}:${paperNumber}`;
    setDraft((d) => ({
      ...d,
      [key]: v,
    }));
  }

  function saveAll() {
    if (!subjectName) return;
    let count = 0;
    for (const student of studentsInClass) {
      const allowed = subjectsForStudent(student, subjects).some((s) => s.name === subjectName);
      if (!allowed) continue;
      const raw = value(student.id);
      if (raw === "") continue;
      const score = parseFloat(raw || "0");
      if (Number.isNaN(score) || score < 0 || score > 100) {
        return toast.error(`${student.name}: Paper ${paperNumber} mark must be 0–100.`);
      }
      upsertMark({
        id: `${student.id}:${term}:${subjectName}:${paperNumber}`,
        studentId: student.id,
        term,
        subject: subjectName,
        paper: paperNumber,
        score,
      });
      count++;
    }
    setDraft({});
    toast.success(`Saved ${count} paper mark${count === 1 ? "" : "s"}.`);
  }

  if (students.length === 0) {
    return (
      <Card className="p-10 text-center text-muted-foreground max-w-xl mx-auto">
        Enroll students first before entering marks.
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="font-display text-3xl">Enter Marks</h1>
        <p className="text-muted-foreground">Enter paper marks per student. Pick the paper number, enter the score, and save.</p>
      </div>

      <Card className="p-5 grid sm:grid-cols-4 gap-4">
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
          <Label>Subject</Label>
          <Select value={subjectName} onValueChange={setSubjectName}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {subjects.map((subj) => <SelectItem key={subj.id} value={subj.name}>{subj.name}</SelectItem>)}
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
        <div>
          <Label>Paper</Label>
          <Select value={String(paperNumber)} onValueChange={(v) => setPaperNumber(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: subjectPaperCount }, (_, idx) => idx + 1).map((num) => (
                <SelectItem key={num} value={String(num)}>Paper {num}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-secondary-foreground">
              <tr>
                <th className="text-left p-3">Student</th>
                <th className="text-left p-3">Class</th>
                <th className="text-left p-3 w-32">Paper</th>
                <th className="text-left p-3 w-32">Score / 100</th>
                <th className="text-left p-3 w-24">Latest</th>
              </tr>
            </thead>
            <tbody>
              {studentsInClass.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    No students enrolled in {classLevel} yet.
                  </td>
                </tr>
              ) : studentsInClass.map((student) => {
                const hasSubject = subjectsForStudent(student, subjects).some((s) => s.name === subjectName);
                return (
                  <tr key={student.id} className="border-t hover:bg-accent/20">
                    <td className="p-3 font-medium">{student.name}</td>
                    <td className="p-3">{student.classLevel}</td>
                    <td className="p-3">Paper {paperNumber}</td>
                    <td className="p-2">
                      <Input type="number" min={0} max={100} step="0.1"
                        disabled={!hasSubject}
                        value={hasSubject ? value(student.id) : ""}
                        placeholder={hasSubject ? "" : "N/A"}
                        onChange={(e) => setVal(student.id, e.target.value)} />
                    </td>
                    <td className="p-3 font-mono">
                      {hasSubject ? (() => {
                        const existing = marks
                          .filter((m) => m.studentId === student.id && m.term === term && m.subject === subjectName)
                          .sort((a, b) => a.paper - b.paper);
                        const last = existing[existing.length - 1];
                        if (!last) return "—";
                        return last.score !== undefined ? last.score.toFixed(1) : ((last.ca ?? 0) + (last.exam ?? 0)).toFixed(1);
                      })() : "N/A"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t bg-card flex justify-end">
          <Button onClick={saveAll}><Save className="h-4 w-4 mr-1" /> Save Marks</Button>
        </div>
      </Card>
    </div>
  );
}
