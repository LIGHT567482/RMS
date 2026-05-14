import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  useStore, getStudents, getSubjects, getMarks, getProjects, getSchool, setSchool, getGradingScale, getSubjectPapers,
} from "@/lib/storage";
import {
  ALL_TERMS, gradeFor, isAdvancedLevel, subjectsForStudent, type Term, type Student,
} from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, Download, Share2, FileText, Calendar } from "lucide-react";
import { toast } from "sonner";

function withAlpha(hex: string, alpha: number) {
  if (!hex.startsWith("#")) return hex;
  let cleaned = hex.slice(1);
  if (cleaned.length === 3) cleaned = cleaned.split("").map((c) => c + c).join("");
  if (cleaned.length !== 6) return hex;
  const num = parseInt(cleaned, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function isLightColor(hex: string) {
  if (!hex.startsWith("#")) return true;
  let cleaned = hex.slice(1);
  if (cleaned.length === 3) cleaned = cleaned.split("").map((c) => c + c).join("");
  if (cleaned.length !== 6) return true;
  const num = parseInt(cleaned, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 180;
}

export const Route = createFileRoute("/dashboard/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const students = useStore(getStudents);
  const subjects = useStore(getSubjects);
  const marks = useStore(getMarks);
  const projects = useStore(getProjects);
  const school = useStore(getSchool);

  const [classLevel, setClassLevel] = useState<string>("S.1");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [term, setTerm] = useState<Term>("Term 1");
  const [issueDate, setIssueDate] = useState(school.issueDate);
  const [headComment, setHeadComment] = useState("");
  const [feesNext, setFeesNext] = useState(school.bursarFeesNextTerm ?? "");
  const [debt, setDebt] = useState(school.bursarDebt ?? "");

  const studentsInClass = useMemo(
    () => students.filter((s) => s.classLevel === classLevel),
    [students, classLevel],
  );

  // Set default classLevel to the first class with students
  useEffect(() => {
    if (students.length > 0 && studentsInClass.length === 0) {
      const firstClass = [...new Set(students.map(s => s.classLevel))].sort()[0];
      if (firstClass) setClassLevel(firstClass);
    }
  }, [students, studentsInClass.length, classLevel]);

  // Sync selection when the class level changes
  useEffect(() => {
    if (studentsInClass.length === 0) {
      setSelectedStudents([]);
      return;
    }

    const hasSelectedInClass = studentsInClass.some((s) => selectedStudents.includes(s.id));
    if (!hasSelectedInClass) {
      setSelectedStudents(studentsInClass.map((s) => s.id));
    }
  }, [studentsInClass, selectedStudents]);

  const selectedStudentObjects = useMemo(
    () => students.filter((s) => selectedStudents.includes(s.id)),
    [students, selectedStudents],
  );

  // Positions for selected students
  const positions = useMemo(() => {
    const posMap: Record<string, { rank: number; of: number }> = {};
    const classmates = studentsInClass;
    const totals = classmates.map((s) => {
      const subs = subjectsForStudent(s, subjects);
      const sum = subs.reduce((acc, sub) => {
        const m = marks.find((x) => x.id === `${s.id}:${term}:${sub.name}`);
        return acc + (m ? m.ca + m.exam : 0);
      }, 0);
      return { id: s.id, total: sum };
    });
    totals.sort((a, b) => b.total - a.total);
    classmates.forEach((s) => {
      const idx = totals.findIndex((t) => t.id === s.id);
      posMap[s.id] = { rank: idx + 1, of: totals.length };
    });
    return posMap;
  }, [studentsInClass, subjects, marks, term]);

  function ord(n: number) {
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function persistDates() {
    setSchool({ ...school, issueDate, bursarFeesNextTerm: feesNext, bursarDebt: debt });
    toast.success("Saved.");
  }

  if (students.length === 0) {
    return <Card className="p-10 text-center text-muted-foreground max-w-xl mx-auto">Enroll students first.</Card>;
  }

  return (
    <div className="space-y-6 max-w-full mx-auto px-4">
      <div className="flex items-end justify-between flex-wrap gap-4 no-print">
        <div>
          <h1 className="font-display text-3xl flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" /> Report Cards
          </h1>
          <p className="text-muted-foreground">Generate, print, save or share student report cards.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Print / Save PDF
          </Button>
          <Button
            variant="outline"
            disabled={selectedStudents.length !== 1}
            onClick={async () => {
              const student = selectedStudentObjects[0];
              if (!student) return;
              try {
                if (navigator.share) {
                  await navigator.share({ title: `Report Card — ${student.name}`, text: "Student report card", url: window.location.href });
                } else {
                  await navigator.clipboard.writeText(window.location.href);
                  toast.success("Link copied to clipboard.");
                }
              } catch { /* user cancelled */ }
            }}
          >
            <Share2 className="h-4 w-4 mr-1" /> Share
          </Button>
          <Button
            variant="outline"
            disabled={selectedStudents.length !== 1}
            onClick={() => window.print()}
          >
            <Download className="h-4 w-4 mr-1" /> Save
          </Button>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[1fr_2fr]">
        <Card className="p-5 space-y-4 no-print min-w-0 w-full">
          <div>
            <h2 className="font-semibold text-lg">Report Settings</h2>
            <p className="text-sm text-muted-foreground">Configure the current report output and student selection.</p>
          </div>

          <div>
            <Label>Class Level</Label>
            <Select value={classLevel} onValueChange={setClassLevel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["S.1", "S.2", "S.3", "S.4", "S.5", "S.6", "A.1", "A.2", "A.3"].map((level) => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
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
            <Label>Students ({studentsInClass.length})</Label>
            <div className="flex gap-2 flex-wrap mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStudents(studentsInClass.map(s => s.id))}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStudents([])}
              >
                Deselect All
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
              {studentsInClass.map((s) => (
                <div key={s.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={s.id}
                    checked={selectedStudents.includes(s.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedStudents([...selectedStudents, s.id]);
                      } else {
                        setSelectedStudents(selectedStudents.filter(id => id !== s.id));
                      }
                    }}
                  />
                  <Label htmlFor={s.id} className="text-sm">{s.name}</Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Issue Date (DD/MM/YYYY)</Label>
            <Input value={issueDate} onChange={(e) => setIssueDate(e.target.value)} placeholder="DD/MM/YYYY" />
          </div>
          <div>
            <Label>Fees due next term</Label>
            <Input value={feesNext} onChange={(e) => setFeesNext(e.target.value)} placeholder="e.g. 850,000 UGX" />
          </div>
          <div>
            <Label>Outstanding debt</Label>
            <Input value={debt} onChange={(e) => setDebt(e.target.value)} placeholder="e.g. 0 UGX" />
          </div>
          <div>
            <Label>Head Teacher Comment</Label>
            <Textarea rows={4} value={headComment} onChange={(e) => setHeadComment(e.target.value)}
              placeholder="Optional comment for the printed report." />
          </div>
          <Button variant="secondary" className="w-full" onClick={persistDates}>Save defaults</Button>
        </Card>

        <div className="space-y-4 min-w-0 w-full">
          {selectedStudentObjects.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground w-full">
              Select students to generate report cards.
            </Card>
          ) : (
            <div className="grid gap-6 items-start">
              {selectedStudentObjects.map((student, index) => (
                <div key={student.id} className={index > 0 ? "page-break-before-always" : ""}>
                  <ReportCard
                    student={student}
                    term={term}
                    issueDate={issueDate}
                    school={school}
                    subjects={subjectsForStudent(student, subjects)}
                    marks={marks}
                    projects={projects}
                    position={positions[student.id]}
                    ord={ord}
                    headComment={headComment}
                    feesNext={feesNext}
                    debt={debt}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportCard(props: {
  student: Student;
  term: Term;
  issueDate: string;
  school: ReturnType<typeof getSchool>;
  subjects: ReturnType<typeof getSubjects>;
  marks: ReturnType<typeof getMarks>;
  projects: ReturnType<typeof getProjects>;
  position: { rank: number; of: number } | null;
  ord: (n: number) => string;
  headComment: string;
  feesNext: string;
  debt: string;
}) {
  const { student, term, issueDate, school, subjects, marks, projects, position, ord, headComment, feesNext, debt } = props;
  const advanced = isAdvancedLevel(student.classLevel);
  const reportPageColor = advanced
    ? school.reportCardPageColorAdvanced || school.reportCardPageColor || "#f8fafc"
    : school.reportCardPageColor || "#ffffff";
  const reportContentColor = advanced
    ? school.reportCardContentColorAdvanced || school.reportCardContentColor || "#111111"
    : school.reportCardContentColor || "#111111";
  const reportHeadingColor = advanced
    ? school.reportCardHeadingColorAdvanced || school.reportCardHeadingColor || "#dc2626"
    : school.reportCardHeadingColor || school.primaryColor || "#3c64ff";
  const pageSoft = withAlpha(reportPageColor, 0.12);
  const headingTextColor = isLightColor(reportHeadingColor) ? "#111" : "#fff";
  const stripeColor = withAlpha(reportContentColor, 0.08);
  const reportColor = reportHeadingColor;
  const reportColorSoft = withAlpha(reportHeadingColor, 0.08);

  const rows = subjects.map((s) => {
    const subjectMarks = marks
      .filter((x) => x.studentId === student.id && x.term === term && x.subject === s.name)
      .sort((a, b) => a.paper - b.paper);
    const totalScore = subjectMarks.reduce((acc, m) => {
      if (m.score !== undefined) return acc + m.score;
      return acc + ((m.ca ?? 0) + (m.exam ?? 0));
    }, 0);
    const papers = getSubjectPapers(s.name, advanced ? "A" : "O");
    const average = papers > 0 ? totalScore / papers : totalScore;
    const scale = getGradingScale(s.name, student.classLevel);
    const g = gradeFor(average, scale, advanced);
    return {
      subject: s.name,
      paperCount: Math.max(papers, 1),
      marks: subjectMarks,
      totalScore,
      average,
      ...g,
      hasData: subjectMarks.length > 0,
    };
  });

  const project = projects.find((p) => p.id === `${student.id}:${term}`);
  const projectGrade = project ? gradeFor(project.marks, undefined, advanced) : null;

  const totalMarks = rows.reduce((a, r) => a + r.totalScore, 0);
  const totalPoints = advanced ? rows.reduce((a, r) => a + (r.points ?? 0), 0) : 0;
  const maxPossible = rows.reduce((acc, r) => acc + r.paperCount * 100, 0);
  const avg = rows.length ? totalMarks / rows.length : 0;

  return (
    <Card className="print-area p-10 mx-auto shadow-2xl"
          style={{
            maxWidth: "210mm",
            boxShadow: "var(--shadow-elegant)",
            backgroundColor: reportPageColor,
            color: reportContentColor,
            border: `1px solid ${reportHeadingColor}`,
            "--report-heading-color": reportHeadingColor,
            "--report-heading-text": headingTextColor,
            "--report-page-soft": pageSoft,
            "--report-row-stripe": stripeColor,
          } as React.CSSProperties}>
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          * {
            margin: 0 !important;
            padding: 0 !important;
          }
          body {
            margin: 0;
            padding: 0;
            overflow: hidden;
          }
          html, body, #root {
            width: 100% !important;
            height: 100% !important;
          }
          .no-print {
            display: none !important;
          }
          .print-area {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            height: auto !important;
            page-break-after: always;
          }
        }
      `}</style>
      {/* Header */}
      <div className="border-b-4 pb-4" style={{ borderColor: reportHeadingColor }}>
        <div className="flex items-center gap-5">
          <div className="h-20 w-20 rounded-full border-2 flex items-center justify-center shrink-0 overflow-hidden"
               style={{ borderColor: reportHeadingColor }}>
            {school.logoDataUrl ? (
              <img src={school.logoDataUrl} alt="badge" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[10px] text-muted-foreground tracking-widest text-center">
                {school.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}<br />LOGO
              </span>
            )}
          </div>
          <div className="flex-1 text-center">
            <h2 className="font-display text-3xl font-bold tracking-wide"
                style={{ color: reportHeadingColor }}>
              {school.name}
            </h2>
            <p className="text-xs mt-1">{school.address}</p>
            <p className="text-xs">P.O. Box {school.poBox} • Tel: {school.telephones}</p>
            <p className="text-xs">Email: {school.email}</p>
            <p className="text-xs italic mt-1 font-semibold">Motto: "{school.motto}"</p>
          </div>
          <div className="h-20 w-20 rounded border-2 border-dashed flex items-center justify-center text-[9px] text-muted-foreground text-center overflow-hidden"
               style={{ borderColor: reportHeadingColor }}>
            {student.photoDataUrl ? (
              <img src={student.photoDataUrl} alt={student.name} className="h-full w-full object-cover" />
            ) : "STUDENT\nPHOTO"}
          </div>
        </div>
        <div className="text-center mt-3">
          <h3 className="font-display text-xl tracking-[0.3em]"
              style={{ color: reportHeadingColor }}>
            STUDENT REPORT CARD
          </h3>
          <p className="text-sm font-semibold text-muted-foreground mt-1">
            {advanced ? "Advanced Level — S.5 / S.6" : "Ordinary Level — S.1 through S.4"}
          </p>
        </div>
      </div>

      {/* Student details */}
      <div className="grid grid-cols-3 gap-4 my-4 text-sm">
        <div><b>Name:</b> {student.name}</div>
        <div><b>Class:</b> {student.classLevel}</div>
        <div><b>Term:</b> {term}</div>
        <div><b>Date Issued:</b> {issueDate}</div>
        <div><b>Position:</b> {position ? `${ord(position.rank)} of ${position.of}` : "—"}</div>
        <div><b>Average:</b> {avg.toFixed(1)}%</div>
      </div>

      {/* Subject Combination (for Advanced Level) */}
      {advanced && student.enrolledSubjects && student.enrolledSubjects.length > 0 && (
        <div className="mb-4 p-3 rounded border" style={{ borderColor: reportHeadingColor, backgroundColor: pageSoft }}>
          <p className="text-sm font-semibold" style={{ color: reportHeadingColor }}>Subject Combination:</p>
          <p className="text-sm">{student.enrolledSubjects.join(", ")}</p>
        </div>
      )}

      {/* Marks table */}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ backgroundColor: reportHeadingColor, color: headingTextColor }}>
            <th className="border p-2 text-left">SUBJECT</th>
            <th className="border p-2 text-left">PAPER</th>
            <th className="border p-2 text-center">SCORE</th>
            <th className="border p-2 text-center">FINAL</th>
            <th className="border p-2 text-center">GRADE</th>
            {advanced && <th className="border p-2 text-center">POINTS</th>}
            <th className="border p-2 text-left">COMMENT</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, rowIndex) => {
            const paperRows = Array.from({ length: r.paperCount }, (_, idx) => {
              const mark = r.marks[idx];
              return {
                label: `Paper ${idx + 1}`,
                score: mark?.score !== undefined ? mark.score : (mark ? ((mark.ca ?? 0) + (mark.exam ?? 0)) : undefined),
              };
            });
            return (
              <>
                {paperRows.map((paper, paperIndex) => (
                  <tr key={`${r.subject}-${paper.label}`} style={{ backgroundColor: rowIndex % 2 === 1 ? stripeColor : undefined }}>
                    {paperIndex === 0 ? (
                      <td className="border p-2 font-medium" rowSpan={paperRows.length}>{r.subject}</td>
                    ) : null}
                    <td className="border p-2">{paper.label}</td>
                    <td className="border p-2 text-center font-mono">{paper.score !== undefined ? paper.score.toFixed(1) : "—"}</td>
                    {paperIndex === 0 ? (
                      <>
                        <td className="border p-2 text-center font-mono font-bold" rowSpan={paperRows.length}>
                          {r.hasData ? r.average.toFixed(1) : "—"}
                        </td>
                        <td className="border p-2 text-center font-bold" rowSpan={paperRows.length}>
                          {r.hasData ? r.grade : "—"}
                        </td>
                        {advanced && (
                          <td className="border p-2 text-center font-bold" rowSpan={paperRows.length}>
                            {r.hasData ? r.points ?? "—" : "—"}
                          </td>
                        )}
                        <td className="border p-2" rowSpan={paperRows.length}>
                          {r.hasData ? r.comment : "—"}
                        </td>
                      </>
                    ) : null}
                  </tr>
                ))}
                <tr style={{ backgroundColor: rowIndex % 2 === 1 ? stripeColor : undefined }}>
                  <td className="border p-2 font-semibold">Subject Total</td>
                  <td className="border p-2 text-center font-mono">{r.hasData ? r.totalScore.toFixed(1) : "—"}</td>
                  <td className="border p-2 text-center" colSpan={advanced ? 5 : 4}></td>
                </tr>
              </>
            );
          })}
          <tr className="font-bold" style={{ backgroundColor: pageSoft }}>
            <td className="border p-2">TOTAL</td>
            <td className="border p-2"></td>
            <td className="border p-2 text-center font-mono">{totalMarks.toFixed(1)} / {maxPossible}</td>
            <td className="border p-2"></td>
            <td className="border p-2"></td>
            {advanced && <td className="border p-2 text-center font-mono">{totalPoints}</td>}
            <td className="border p-2"></td>
          </tr>
        </tbody>
      </table>

      {/* Project Work - Only for Ordinary Level */}
      {!advanced && (
        <div className="mt-5 p-3 rounded flex items-center justify-between"
             style={{ border: `2px solid ${reportColor}`, backgroundColor: reportColorSoft }}>
          <div>
            <p className="text-xs text-muted-foreground">PROJECT WORK</p>
            <p className="font-semibold">
              {project ? `${project.marks.toFixed(1)} / 100` : "Not graded"}
            </p>
          </div>
          <div className="text-3xl font-display font-bold">{projectGrade ? projectGrade.grade : "—"}</div>
          <div className="text-sm">{projectGrade ? projectGrade.comment : ""}</div>
        </div>
      )}

      {/* Bottom: comment + signature + bursar */}
      <div className="mt-6 grid grid-cols-2 gap-6 text-sm">
        <div>
          <p className="font-semibold mb-1">Head Teacher's Comment:</p>
          <div className="min-h-[60px] border-b border-dotted border-foreground/40 px-2 py-1">
            {headComment}
          </div>
          <p className="mt-6 font-semibold mb-1">Head Teacher's Signature:</p>
          <div className="border-b border-foreground/60 h-10" />
        </div>
        <div className="rounded border p-3"
             style={{ backgroundColor: reportColorSoft, borderColor: reportColor }}>
          <p className="font-semibold mb-2">Bursar's Section</p>
          <div className="text-xs space-y-2">
            <div>
              <p className="text-muted-foreground">Fees due next term:</p>
              <div className="border-b border-foreground/40 min-h-[20px] px-1">{feesNext}</div>
            </div>
            <div>
              <p className="text-muted-foreground">Outstanding debt (this term):</p>
              <div className="border-b border-foreground/40 min-h-[20px] px-1">{debt}</div>
            </div>
            <div>
              <p className="text-muted-foreground">Bursar's Signature:</p>
              <div className="border-b border-foreground/40 h-8" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-3 border-t text-[10px] text-center text-muted-foreground">
        Generated by {school.name} Report Card System • {issueDate}
      </div>
    </Card>
  );
}
