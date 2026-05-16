import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  useStore,
  getStudents,
  getSubjects,
  getMarks,
  getProjects,
  getSchool,
  setSchool,
  addStudent,
  upsertMark,
  getGradingScale,
  getSubjectPapers,
  getOrdinarySubjects,
  getAdvancedSubjects,
} from "@/lib/storage";
import {
  ALL_TERMS,
  displaySubjectName,
  EXAM_SETS,
  gradeFor,
  isAdvancedLevel,
  subjectsForStudent,
  type ExamSet,
  type Term,
  type Student,
} from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, Download, Share2, FileText, Calendar } from "lucide-react";
import { toast } from "sonner";

function withAlpha(hex: string, alpha: number) {
  if (!hex.startsWith("#")) return hex;
  let cleaned = hex.slice(1);
  if (cleaned.length === 3)
    cleaned = cleaned
      .split("")
      .map((c) => c + c)
      .join("");
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
  if (cleaned.length === 3)
    cleaned = cleaned
      .split("")
      .map((c) => c + c)
      .join("");
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
  const ordinarySubjects = useStore(getOrdinarySubjects);
  const advancedSubjects = useStore(getAdvancedSubjects);
  const marks = useStore(getMarks);
  const projects = useStore(getProjects);
  const school = useStore(getSchool);
  // storage actions for test-data generation (imported statically at top)
  const allSubjects = useMemo(
    () => [...ordinarySubjects, ...advancedSubjects],
    [ordinarySubjects, advancedSubjects],
  );
  const selectedExamSets: ExamSet[] =
    school.selectedExamSets && school.selectedExamSets.length > 0
      ? school.selectedExamSets
      : ["EOT"];
  const examSetLabels: Record<ExamSet, string> = { BOT: "B.O.T", MOT: "M.O.T", EOT: "E.O.T" };

  const [classLevel, setClassLevel] = useState<string>("S.1");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [term, setTerm] = useState<Term>("Term 1");
  const [issueDate, setIssueDate] = useState(school.issueDate);
  const [classTeacherComment, setClassTeacherComment] = useState("");
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
      const firstClass = [...new Set(students.map((s) => s.classLevel))].sort()[0];
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
      const subs = subjectsForStudent(s, allSubjects);
      const sum = subs.reduce((acc, sub) => {
        const papers = getSubjectPapers(sub.name, isAdvancedLevel(s.classLevel) ? "A" : "O");
        const subjectTotal = selectedExamSets.reduce((subjectAcc, examSet) => {
          return (
            subjectAcc +
            Array.from({ length: papers }, (_, idx) => {
              const m = marks.find(
                (x) =>
                  x.studentId === s.id &&
                  x.term === term &&
                  x.subject === sub.name &&
                  (x.examSet ?? "EOT") === examSet &&
                  x.paper === idx + 1,
              );
              if (!m) return 0;
              return m.score !== undefined ? m.score : (m.ca ?? 0) + (m.exam ?? 0);
            }).reduce((a, b) => a + b, 0)
          );
        }, 0);
        return acc + subjectTotal;
      }, 0);
      return { id: s.id, total: sum };
    });
    totals.sort((a, b) => b.total - a.total);
    classmates.forEach((s) => {
      const idx = totals.findIndex((t) => t.id === s.id);
      posMap[s.id] = { rank: idx + 1, of: totals.length };
    });
    return posMap;
  }, [studentsInClass, allSubjects, marks, term, selectedExamSets]);

  function ord(n: number) {
    const s = ["th", "st", "nd", "rd"],
      v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function persistDates() {
    if (feesNext && !/^\d+$/.test(feesNext)) {
      return toast.error("Fees due next term must contain digits only.");
    }
    if (debt && !/^\d+$/.test(debt)) {
      return toast.error("Outstanding debt must contain digits only.");
    }
    setSchool({ ...school, issueDate, bursarFeesNextTerm: feesNext, bursarDebt: debt });
    toast.success("Saved.");
  }

  if (students.length === 0) {
    return (
      <Card className="p-10 text-center text-muted-foreground max-w-xl mx-auto">
        Enroll students first.
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-full mx-auto px-4">
      <div className="flex items-end justify-between flex-wrap gap-4 no-print">
        <div>
          <h1 className="font-display text-3xl flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" /> Report Cards
          </h1>
          <p className="text-muted-foreground">
            Generate, print, save or share student report cards.
          </p>
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
                  await navigator.share({
                    title: `Report Card — ${student.name}`,
                    text: "Student report card",
                    url: window.location.href,
                  });
                } else {
                  await navigator.clipboard.writeText(window.location.href);
                  toast.success("Link copied to clipboard.");
                }
              } catch {
                /* user cancelled */
              }
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
          <Button
            variant="outline"
            disabled={selectedStudents.length === 0}
            onClick={async () => {
              const printReportsBulk = async () => {
                for (let i = 0; i < selectedStudentObjects.length; i++) {
                  // Scroll to the report
                  const reportElement = document.querySelector(`[data-student-id="${selectedStudentObjects[i].id}"]`);
                  if (reportElement) {
                    reportElement.scrollIntoView({ behavior: "smooth" });
                    await new Promise(resolve => setTimeout(resolve, 500));
                  }
                  // Open print dialog
                  window.print();
                  // Wait before moving to the next one
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
              };
              printReportsBulk();
            }}
          >
            <Printer className="h-4 w-4 mr-1" /> Print Bulk (Individual)
          </Button>

          <Button
            variant="outline"
            onClick={async () => {
              // Generate 30 Ordinary + 20 Advanced test students with random marks
              try {
                const ordLevels = ["S.1", "S.2", "S.3", "S.4"] as const;
                const advLevels = ["S.5", "S.6"] as const;
                const examSets = (school.selectedExamSets && school.selectedExamSets.length)
                  ? school.selectedExamSets
                  : ["EOT"];
                const termVal = "Term 1";

                // create ordinary students
                for (let i = 0; i < 30; i++) {
                  const id = crypto.randomUUID();
                  const name = `Test O Student ${i + 1}`;
                  const classLevel = ordLevels[i % ordLevels.length];
                  addStudent({ id, name, classLevel, createdAt: Date.now() });
                  // add marks for ordinary subjects
                  for (const subj of ordinarySubjects) {
                    const papers = getSubjectPapers(subj.name, "O");
                    for (let p = 1; p <= papers; p++) {
                      for (const ex of examSets) {
                        const score = Math.floor(40 + Math.random() * 55);
                        upsertMark({
                          id: `${id}:${termVal}:${subj.name}:${p}:${ex}`,
                          studentId: id,
                          term: termVal as any,
                          subject: subj.name,
                          paper: p,
                          examSet: ex as any,
                          score,
                        });
                      }
                    }
                  }
                }

                // create advanced students
                for (let i = 0; i < 20; i++) {
                  const id = crypto.randomUUID();
                  const name = `Test A Student ${i + 1}`;
                  const classLevel = advLevels[i % advLevels.length];
                  addStudent({ id, name, classLevel, createdAt: Date.now() });
                  for (const subj of advancedSubjects) {
                    const papers = getSubjectPapers(subj.name, "A");
                    for (let p = 1; p <= papers; p++) {
                      for (const ex of examSets) {
                        const score = Math.floor(40 + Math.random() * 55);
                        upsertMark({
                          id: `${id}:${termVal}:${subj.name}:${p}:${ex}`,
                          studentId: id,
                          term: termVal as any,
                          subject: subj.name,
                          paper: p,
                          examSet: ex as any,
                          score,
                        });
                      }
                    }
                  }
                }
                toast.success("Generated 50 test students with marks.");
              } catch (err) {
                // eslint-disable-next-line no-console
                console.error(err);
                toast.error("Failed to generate test data.");
              }
            }}
          >
            Generate 50 test students
          </Button>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[1fr_2fr]">
        <Card className="p-5 space-y-4 no-print min-w-0 w-full">
          <div>
            <h2 className="font-semibold text-lg">Report Settings</h2>
            <p className="text-sm text-muted-foreground">
              Configure the current report output and student selection.
            </p>
          </div>

          <div>
            <Label>Class Level</Label>
            <Select value={classLevel} onValueChange={setClassLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["S.1", "S.2", "S.3", "S.4", "S.5", "S.6"].map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Term</Label>
            <Select value={term} onValueChange={(v) => setTerm(v as Term)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_TERMS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Students ({studentsInClass.length})</Label>
            <div className="flex gap-2 flex-wrap mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStudents(studentsInClass.map((s) => s.id))}
              >
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedStudents([])}>
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
                        setSelectedStudents(selectedStudents.filter((id) => id !== s.id));
                      }
                    }}
                  />
                  <Label htmlFor={s.id} className="text-sm">
                    {s.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Issue Date (DD/MM/YYYY)
            </Label>
            <Input
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              placeholder="DD/MM/YYYY"
            />
          </div>
          <div>
            <Label>Fees due next term</Label>
            <Input
              value={feesNext}
              onChange={(e) => setFeesNext(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 850000"
            />
          </div>
          <div>
            <Label>Outstanding debt</Label>
            <Input
              value={debt}
              onChange={(e) => setDebt(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 0"
            />
          </div>
          <div>
            <Label>Class Teacher Comment</Label>
            <Textarea
              rows={3}
              value={classTeacherComment}
              onChange={(e) => setClassTeacherComment(e.target.value)}
              placeholder="Optional class teacher comment for the printed report."
            />
          </div>
          <div>
            <Label>Head Teacher Comment</Label>
            <Textarea
              rows={4}
              value={headComment}
              onChange={(e) => setHeadComment(e.target.value)}
              placeholder="Optional comment for the printed report."
            />
          </div>
          <Button variant="secondary" className="w-full" onClick={persistDates}>
            Save defaults
          </Button>
        </Card>

        <div className="space-y-4 min-w-0 w-full">
          {selectedStudentObjects.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground w-full">
              Select students to generate report cards.
            </Card>
          ) : (
            <div className="grid gap-6 items-start">
              {selectedStudentObjects.map((student, index) => (
                <div key={student.id} data-student-id={student.id} className={index > 0 ? "page-break-before-always" : ""}>
                  <ReportCard
                    student={student}
                    term={term}
                    issueDate={issueDate}
                    school={school}
                    subjects={subjectsForStudent(student, allSubjects)}
                    marks={marks}
                    projects={projects}
                    selectedExamSets={selectedExamSets}
                    examSetLabels={examSetLabels}
                    position={positions[student.id]}
                    ord={ord}
                    classTeacherComment={classTeacherComment}
                    headComment={headComment}
                    feesNext={feesNext}
                    debt={debt}
                  />
                </div>
              ))}
              {selectedStudentObjects.length > 0 && (
                <>
                  {Array.from({ length: 2 }).map((_, blankIndex) => (
                    <div key={`blank-${blankIndex}`} className="page-break-before-always">
                      <ReportCard
                        student={{
                          id: `blank-${blankIndex}`,
                          name: "________________________",
                          classLevel: isAdvancedLevel(classLevel as any) ? "S.5" : "S.1",
                          photoDataUrl: undefined,
                          enrolledSubjects: [],
                          createdAt: Date.now(),
                        }}
                        term={term}
                        issueDate="__________"
                        school={school}
                        subjects={[]}
                        marks={[]}
                        projects={[]}
                        selectedExamSets={selectedExamSets}
                        examSetLabels={examSetLabels}
                        position={null}
                        ord={ord}
                        classTeacherComment=""
                        headComment=""
                        feesNext=""
                        debt=""
                      />
                    </div>
                  ))}
                </>
              )}
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
  selectedExamSets: ExamSet[];
  examSetLabels: Record<ExamSet, string>;
  position: { rank: number; of: number } | null;
  ord: (n: number) => string;
  classTeacherComment: string;
  headComment: string;
  feesNext: string;
  debt: string;
}) {
  const {
    student,
    term,
    issueDate,
    school,
    subjects,
    marks,
    projects,
    selectedExamSets,
    examSetLabels,
    position,
    ord,
    classTeacherComment,
    headComment,
    feesNext,
    debt,
  } = props;
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
    const papers = getSubjectPapers(s.name, advanced ? "A" : "O");
    const paperRows = Array.from({ length: papers }, (_, paperIndex) => {
      const scores = selectedExamSets.map((examSet) => {
        const m = marks.find(
          (x) =>
            x.studentId === student.id &&
            x.term === term &&
            x.subject === s.name &&
            (x.examSet ?? "EOT") === examSet &&
            x.paper === paperIndex + 1,
        );
        if (!m) return undefined;
        return m.score !== undefined ? m.score : (m.ca ?? 0) + (m.exam ?? 0);
      });
      return {
        label: `Paper ${paperIndex + 1}`,
        scores,
      };
    });

    const totalScore = paperRows.reduce<number>((acc, row) => {
      return acc + row.scores.reduce<number>((inner, score) => inner + (score ?? 0), 0);
    }, 0);

    const average =
      papers > 0 && selectedExamSets.length > 0
        ? totalScore / (papers * selectedExamSets.length)
        : totalScore;

    const scale = getGradingScale(s.name, student.classLevel);
    const g = gradeFor(average, scale, advanced, s.name);
    return {
      subject: s.name,
      paperCount: Math.max(papers, 1),
      paperRows,
      totalScore,
      average,
      ...g,
      hasData: paperRows.some((row) => row.scores.some((score) => score !== undefined)),
    };
  });

  const project = projects.find((p) => p.id === `${student.id}:${term}`);
  const projectScale = getGradingScale("ProjectWork", student.classLevel);
  const projectGrade = project ? gradeFor(project.marks, projectScale, advanced) : null;

  const totalMarks = rows.reduce((a, r) => a + r.totalScore, 0);
  const totalPoints = advanced ? rows.reduce((a, r) => a + (r.points ?? 0), 0) : 0;
  const maxPossible = rows.reduce(
    (acc, r) => acc + r.paperCount * selectedExamSets.length * 100,
    0,
  );
  const avg = rows.length ? rows.reduce((a, r) => a + r.average, 0) / rows.length : 0;

  return (
    <Card
      className={`print-area mx-auto shadow-2xl rounded-none ${advanced ? 'advanced' : ''}`}
      style={
        {
          maxWidth: "210mm",
          boxShadow: "var(--shadow-elegant)",
          backgroundColor: reportPageColor,
          color: reportContentColor,
          border: `1px solid ${reportHeadingColor}`,
          position: "relative",
          padding: "1cm",
          "--report-heading-color": reportHeadingColor,
          "--report-heading-text": headingTextColor,
          "--report-page-soft": pageSoft,
          "--report-row-stripe": stripeColor,
        } as React.CSSProperties
      }
    >
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
            padding: 0.7cm !important;
            max-width: 100% !important;
            width: 100% !important;
            height: auto !important;
            page-break-after: always;
            page-break-inside: avoid !important;
            font-size: 13px !important;
            line-height: 1.25 !important;
          }
          .print-area h2 {
            font-size: 17px !important;
            margin: 0 !important;
            padding: 0 !important;
            line-height: 1 !important;
          }
          .print-area h3 {
            font-size: 14px !important;
            margin: 0 !important;
            padding: 0 !important;
            line-height: 1 !important;
          }
          .print-area p {
            margin: 0 !important;
            padding: 0 !important;
            font-size: 12px !important;
            line-height: 1.2 !important;
          }
          .print-area table {
            font-size: 11px !important;
            margin-top: 4px !important;
            margin-bottom: 4px !important;
            page-break-inside: avoid !important;
          }
          .print-area table th,
          .print-area table td {
            padding: 2px 3px !important;
            border-width: 0.5px !important;
            line-height: 1.2 !important;
          }
          /* Advanced-level overrides */
          .print-area.advanced {
            font-size: 15px !important;
          }
          .print-area.advanced h2 { font-size: 20px !important; }
          .print-area.advanced h3 { font-size: 16px !important; }
          .print-area.advanced table { font-size: 13px !important; }
          .print-area.advanced table th,
          .print-area.advanced table td { padding: 4px 6px !important; }
          .print-area.advanced .header-logo,
          .print-area.advanced .student-photo { width: 10rem !important; height: 10rem !important; }
          .print-area:not(.advanced) .header-logo,
          .print-area:not(.advanced) .student-photo { width: 8rem !important; height: 8rem !important; }
          .print-area.advanced .header-logo img,
          .print-area.advanced .student-photo img { width: 100% !important; height: 100% !important; object-fit: cover !important; }
        }
      `}</style>

      {/* Logo Watermark */}
      {school.logoDataUrl && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
          style={{ position: "absolute", zIndex: 0 }}
        >
          <img
            src={school.logoDataUrl}
            alt="watermark"
            className="w-[34rem] h-[34rem] object-contain"
            style={{
              opacity: 0.15,
              filter:
                school.reportCardWatermarkColored === false
                  ? "grayscale(1) brightness(1.15)"
                  : "brightness(1.15)",
            }}
          />
        </div>
      )}

      {/* Header */}
      <div
        className="border-b-2 pb-1"
        style={{ borderColor: reportHeadingColor, position: "relative", zIndex: 1 }}
      >
        <div className="flex items-center gap-3">
          <div className={`rounded-full flex items-center justify-center shrink-0 overflow-hidden header-logo ${advanced ? 'h-40 w-40' : 'h-32 w-32'}`}>
            {school.logoDataUrl ? (
              <img src={school.logoDataUrl} alt="badge" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[11px] text-muted-foreground tracking-widest text-center">
                {school.name
                  .split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")}
                <br />
                LOGO
              </span>
            )}
          </div>
          <div className="flex-1 text-center">
            <h2
              className="font-display text-2xl font-bold tracking-wide"
              style={{ color: reportHeadingColor }}
            >
              {school.name}
            </h2>
            <p className="text-[11px] mt-0">{school.address}</p>
            <p className="text-[11px]">
              P.O. Box {school.poBox} • Tel: {school.telephones}
            </p>
            <p className="text-[11px]">Email: {school.email}</p>
            <p className="text-[11px] italic mt-0 font-semibold">Motto: "{school.motto}"</p>
          </div>
          <div className={`rounded-full flex items-center justify-center text-[11px] text-muted-foreground text-center overflow-hidden student-photo ${advanced ? 'h-40 w-40' : 'h-32 w-32'}`}>
            {student.photoDataUrl ? (
              <img
                src={student.photoDataUrl}
                alt={student.name}
                className="h-full w-full object-cover"
              />
            ) : (
              "PHOTO"
            )}
          </div>
        </div>
        <div className="text-center mt-1">
          <h3
            className="font-display text-xl tracking-[0.2em]"
            style={{ color: reportHeadingColor }}
          >
            STUDENT REPORT CARD
          </h3>
          <p className="text-[9px] font-semibold text-muted-foreground mt-0">
            {advanced ? "Advanced Level (S.5–S.6)" : "Ordinary Level (S.1–S.4)"}
          </p>
        </div>
      </div>

      {/* Student details */}
      <div
        className={`grid grid-cols-3 gap-2 my-1.5 ${advanced ? 'text-[14px]' : 'text-[12px]'}`}
        style={{ position: "relative", zIndex: 2 }}
      >
        <div>
          <b>Name:</b> {student.name}
        </div>
        <div>
          <b>Class:</b> {student.classLevel}
        </div>
        <div>
          <b>Term:</b> {term}
        </div>
        <div>
          <b>Date:</b> {issueDate}
        </div>
        <div>
          <b>Position:</b> {position ? `${ord(position.rank)}/${position.of}` : "—"}
        </div>
        <div>
          <b>Avg:</b> {avg.toFixed(1)}%
        </div>
      </div>

      {/* Subject Combination (for Advanced Level) */}
      {advanced && student.enrolledSubjects && student.enrolledSubjects.length > 0 && (
        <div
          className="mb-1.5 p-1.5 rounded border text-[11px]"
          style={{ borderColor: reportHeadingColor, backgroundColor: pageSoft }}
        >
          <p className="text-[11px] font-semibold" style={{ color: reportHeadingColor }}>
            Subjects:
          </p>
          <p className="text-[11px]">{student.enrolledSubjects.join(", ")}</p>
        </div>
      )}

      {/* Marks table */}
      <table
        className="w-full text-xs border-collapse"
        style={{ position: "relative", zIndex: 2, borderCollapse: "collapse" }}
      >
        <thead>
          <tr style={{ backgroundColor: reportHeadingColor, color: headingTextColor }}>
            <th className="border p-1 text-left" style={{ borderColor: reportHeadingColor }}>
              SUBJECT
            </th>
            <th
              className="border p-1 text-left"
              style={{ borderColor: reportHeadingColor, width: "80px", whiteSpace: "nowrap" }}
            >
              PAPER
            </th>
            {selectedExamSets.map((set) => (
              <th
                key={set}
                className="border p-1 text-center"
                style={{ borderColor: reportHeadingColor }}
              >
                {examSetLabels[set]}
              </th>
            ))}
            <th className="border p-1 text-center" style={{ borderColor: reportHeadingColor }}>
              TOTAL
            </th>
            <th className="border p-1 text-center" style={{ borderColor: reportHeadingColor }}>
              AVG
            </th>
            <th className="border p-1 text-center" style={{ borderColor: reportHeadingColor }}>
              GRADE
            </th>
            {advanced && (
              <th className="border p-1 text-center" style={{ borderColor: reportHeadingColor }}>
                PTS
              </th>
            )}
            <th className="border p-1 text-left" style={{ borderColor: reportHeadingColor }}>
              COMMENT
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, rowIndex) => {
            const paperRows = r.paperRows;
            return (
              <>
                {paperRows.map((paper, paperIndex) => (
                  <tr
                    key={`${r.subject}-${paper.label}`}
                    style={{
                      backgroundColor: rowIndex % 2 === 1 ? stripeColor : undefined,
                      borderBottom:
                        paperIndex === paperRows.length - 1 && !advanced
                          ? `3px solid ${reportHeadingColor}`
                          : undefined,
                    }}
                  >
                    {paperIndex === 0 ? (
                      <td className="border p-1 font-medium" rowSpan={advanced ? paperRows.length + 1 : paperRows.length}>
                        {displaySubjectName(r.subject)}
                      </td>
                    ) : null}
                    <td
                      className="border p-1"
                      style={{ borderColor: reportHeadingColor, width: "80px", whiteSpace: "nowrap" }}
                    >
                      {paper.label}
                    </td>
                    {paper.scores.map((score, scoreIndex) => (
                      <td
                        key={`${r.subject}-${paper.label}-${scoreIndex}`}
                        className="border p-1 text-center font-mono"
                        style={{ borderColor: reportHeadingColor }}
                      >
                        {score !== undefined ? score.toFixed(1) : "—"}
                      </td>
                    ))}
                    {paperIndex === 0 ? (
                      <>
                        {!advanced && (
                          <td
                            className="border p-1 text-center font-mono font-bold"
                            rowSpan={paperRows.length}
                            style={{ borderColor: reportHeadingColor }}
                          >
                            {r.totalScore.toFixed(1)}
                          </td>
                        )}
                        {advanced ? (
                          <></>
                        ) : (
                          <>
                            <td
                              className="border p-1 text-center font-mono font-bold"
                              rowSpan={paperRows.length}
                              style={{ borderColor: reportHeadingColor }}
                            >
                              {r.hasData ? r.average.toFixed(1) : "—"}
                            </td>
                            <td
                              className="border p-1 text-center font-bold"
                              rowSpan={paperRows.length}
                              style={{ borderColor: reportHeadingColor }}
                            >
                              {r.hasData ? r.grade : "—"}
                            </td>
                            <td
                              className="border p-1"
                              rowSpan={paperRows.length}
                              style={{ borderColor: reportHeadingColor }}
                            >
                              {r.hasData ? r.comment : "—"}
                            </td>
                          </>
                        )}
                      </>
                    ) : null}
                  </tr>
                ))}
                {advanced && (
                  <tr
                    key={`${r.subject}-total`}
                    style={{
                      backgroundColor: rowIndex % 2 === 1 ? stripeColor : undefined,
                      borderBottom: `3px solid ${reportHeadingColor}`,
                    }}
                  >
                    <td className="border p-1 font-medium" style={{ borderColor: reportHeadingColor }}>
                      TOTAL
                    </td>
                    {selectedExamSets.map((_, setIndex) => (
                      <td
                        key={`total-${r.subject}-${setIndex}`}
                        className="border p-1 text-center font-mono"
                        style={{ borderColor: reportHeadingColor, width: "80px", whiteSpace: "nowrap" }}
                      >
                      </td>
                    ))}
                    <td
                      className="border p-1 text-center font-mono font-bold"
                      style={{ borderColor: reportHeadingColor }}
                    >
                      {r.totalScore.toFixed(1)}
                    </td>
                    <td
                      className="border p-1 text-center font-mono font-bold"
                      style={{ borderColor: reportHeadingColor }}
                    >
                      {r.hasData ? r.average.toFixed(1) : "—"}
                    </td>
                    <td
                      className="border p-1 text-center font-bold"
                      style={{ borderColor: reportHeadingColor }}
                    >
                      {r.hasData ? r.grade : "—"}
                    </td>
                    <td
                      className="border p-1 text-center font-bold"
                      style={{ borderColor: reportHeadingColor }}
                    >
                      {r.hasData ? (r.points ?? "—") : "—"}
                    </td>
                    <td
                      className="border p-1"
                      style={{ borderColor: reportHeadingColor }}
                    >
                      {r.hasData ? r.comment : "—"}
                    </td>
                  </tr>
                )}
              </>
            );
          })}
          <tr className="font-bold" style={{ backgroundColor: pageSoft }}>
            <td className="border p-1">TOTAL</td>
            <td className="border p-1" style={{ width: "80px", whiteSpace: "nowrap" }}></td>
            {selectedExamSets.map((set) => (
              <td key={set} className="border p-1"></td>
            ))}
            <td className="border p-1 text-center font-mono">
              {totalMarks.toFixed(1)} / {maxPossible}
            </td>
            <td className="border p-1"></td>
            <td className="border p-1"></td>
            {advanced && <td className="border p-1 text-center font-mono">{totalPoints}</td>}
            <td className="border p-1"></td>
          </tr>
        </tbody>
      </table>

      {/* Project Work - Only for Ordinary Level */}
      {!advanced && (
        <div
          className="mt-1.5 p-1.5 rounded flex items-center justify-between text-[11px]"
          style={{ border: `1px solid ${reportColor}`, backgroundColor: reportColorSoft }}
        >
          <div>
            <p className="text-[10px] text-muted-foreground">PROJECT WORK</p>
            <p className="font-semibold text-[11px]">
              {project ? `${project.marks.toFixed(1)} / 100` : "Not graded"}
            </p>
          </div>
          <div className="text-xl font-display font-bold">
            {projectGrade ? projectGrade.grade : "—"}
          </div>
          <div className="text-[10px]">{projectGrade ? projectGrade.comment : ""}</div>
        </div>
      )}

      {/* Bottom: comment + signature + bursar */}
      <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[10px]">
        <div>
          <p className="font-semibold mb-0.5 text-[10px]">Class Teacher's Comment:</p>
          <div className="min-h-[24px] border-b border-dotted border-foreground/40 px-1 py-0.5 text-[10px]">
            {classTeacherComment}
          </div>
          <p className="mt-1 font-semibold mb-0.5 text-[10px]">Head Teacher's Comment:</p>
          <div className="min-h-[24px] border-b border-dotted border-foreground/40 px-1 py-0.5 text-[10px]">
            {headComment}
          </div>
          <p className="mt-1 font-semibold mb-0.5 text-[10px]">Head Signature:</p>
          <div className="border-b border-foreground/60 h-4" />
        </div>
        <div
          className="rounded border p-1.5"
          style={{ backgroundColor: reportColorSoft, borderColor: reportColor }}
        >
          <p className="font-semibold mb-1 text-[10px]">Bursar</p>
          <div className="text-[10px] space-y-1">
            <div>
              <p className="text-muted-foreground text-[10px]">Next term fees:</p>
              <div className="border-b border-foreground/40 min-h-[16px] px-1 py-0.5 text-[10px]">
                {feesNext}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px]">Outstanding debt:</p>
              <div className="border-b border-foreground/40 min-h-[16px] px-1 py-0.5 text-[10px]">
                {debt}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px]">Signature:</p>
              <div className="border-b border-foreground/60 h-4" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-1 pt-1 border-t text-[10px] text-center text-muted-foreground">
        {school.name} RMS • {issueDate}
      </div>
      <div className="mt-0 text-[9px] text-center text-muted-foreground/60 uppercase tracking-[0.15em]">
        LIGHT TECHNOLOGIES
      </div>
    </Card>
  );
}
