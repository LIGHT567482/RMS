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
import { Progress } from "@/components/ui/progress";
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

  const [classLevel, setClassLevel] = useState<string>("all");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [term, setTerm] = useState<Term | "">("" as any);
  const [issueDate, setIssueDate] = useState(school.issueDate);
  const [classTeacherComment, setClassTeacherComment] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfBatchSize, setPdfBatchSize] = useState(10);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfProgressText, setPdfProgressText] = useState("");
  const [headComment, setHeadComment] = useState("");
  const [feesNext, setFeesNext] = useState(school.bursarFeesNextTerm ?? "");
  const [debt, setDebt] = useState(school.bursarDebt ?? "");

  const studentsInClass = useMemo(
    () =>
      classLevel === "all" ? students : students.filter((s) => s.classLevel === classLevel),
    [students, classLevel],
  );

  useEffect(() => {
    const classIds = new Set(studentsInClass.map((s) => s.id));
    const nextSelection = selectedStudents.filter((id) => classIds.has(id));
    if (nextSelection.length !== selectedStudents.length) {
      setSelectedStudents(nextSelection);
    }
  }, [studentsInClass, selectedStudents]);

  const selectedStudentObjects = useMemo(
    () => students.filter((s) => selectedStudents.includes(s.id)),
    [students, selectedStudents],
  );

  async function generateReportsPdf() {
    if (selectedStudentObjects.length === 0) {
      toast.error("Select at least one student to generate a PDF.");
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const html2canvasModule = await import("html2canvas");
      const html2canvas = html2canvasModule.default ?? html2canvasModule;
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.jsPDF ?? jsPDFModule.default ?? jsPDFModule;

      if (typeof html2canvas !== "function" || typeof jsPDF !== "function") {
        throw new Error("PDF libraries could not be loaded.");
      }

      const cardElements = Array.from(
        document.querySelectorAll<HTMLDivElement>(".report-card-pdf"),
      );
      if (cardElements.length === 0) {
        toast.error(
          `No report cards available to export (${selectedStudents.length} selected).`,
        );
        setIsGeneratingPdf(false);
        return;
      }

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = 210;
      const pdfHeight = 297;
      const renderScale = Math.max(window.devicePixelRatio || 1, 2);
      const pageCssWidth = `${pdfWidth}mm`;
      const pageCssHeight = `${pdfHeight}mm`;
      setPdfProgress(0);
      setPdfProgressText(`Preparing ${cardElements.length} report cards for export`);

      const parseCssColor = (() => {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext("2d");
        return (value: string) => {
          if (!ctx) return null;
          try {
            ctx.clearRect(0, 0, 1, 1);
            ctx.fillStyle = value;
            ctx.fillRect(0, 0, 1, 1);
            const data = ctx.getImageData(0, 0, 1, 1).data;
            return `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${data[3] / 255})`;
          } catch {
            return null;
          }
        };
      })();

      const normalizeColorValue = (value: string) => {
        const colorFnRegex = /(oklch|oklab|lab|lch|color|device-cmyk)\([^)]*\)/gi;
        return value.replace(colorFnRegex, (match) => {
          const parsed = parseCssColor(match);
          return parsed || match;
        });
      };

      const copyComputedStyles = (source: HTMLElement, target: HTMLElement) => {
        const computed = window.getComputedStyle(source);

        for (let j = 0; j < computed.length; j += 1) {
          const property = computed[j];
          let value = computed.getPropertyValue(property);
          if (!value) continue;
          if (/(oklch|lab|lch|color|device-cmyk)\(/i.test(value)) {
            value = normalizeColorValue(value);
          }
          try {
            target.style.setProperty(property, value);
          } catch {
            // ignore unsupported style properties
          }
        }

        for (let j = 0; j < source.style.length; j += 1) {
          const property = source.style.item(j);
          if (property?.startsWith("--")) {
            let value = source.style.getPropertyValue(property);
            if (/(oklch|lab|lch|color|device-cmyk)\(/i.test(value)) {
              value = normalizeColorValue(value);
            }
            target.style.setProperty(property, value);
          }
        }
      };

      const createSafeClone = (original: HTMLElement) => {
        const clone = original.cloneNode(true) as HTMLElement;
        clone.style.width = pageCssWidth;
        clone.style.minHeight = pageCssHeight;
        clone.style.boxSizing = "border-box";
        clone.style.position = "relative";

        const wrapper = document.createElement("div");
        wrapper.style.position = "absolute";
        wrapper.style.left = "-100000px";
        wrapper.style.top = "0";
        wrapper.style.width = pageCssWidth;
        wrapper.style.height = "auto";
        wrapper.style.overflow = "visible";
        wrapper.style.pointerEvents = "none";
        wrapper.style.visibility = "hidden";
        wrapper.appendChild(clone);
        document.body.appendChild(wrapper);

        const originals = [original, ...Array.from(original.querySelectorAll<HTMLElement>("*"))];
        const clones = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("*"))];
        originals.forEach((origEl, index) => {
          const cloneEl = clones[index];
          if (!cloneEl) return;
          copyComputedStyles(origEl, cloneEl as HTMLElement);
        });

        return { wrapper, clone };
      };

      for (let i = 0; i < cardElements.length; i += 1) {
        if (i > 0) pdf.addPage();
        const element = cardElements[i] as HTMLElement;
        const { wrapper, clone } = createSafeClone(element);
        const canvas = await html2canvas(clone, {
          scale: renderScale,
          useCORS: true,
          backgroundColor: null, // let css background show through
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: clone.scrollWidth,
          windowHeight: clone.scrollHeight,
          allowTaint: true,
        });
        document.body.removeChild(wrapper);

        const imgData = canvas.toDataURL("image/png");
        const fitScale = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
        const imgWidth = canvas.width * fitScale * 2;
        const imgHeight = canvas.height * fitScale * 2;
        const xOffset = (pdfWidth - imgWidth) / 2;
        const yOffset = (pdfHeight - imgHeight) / 2;
        pdf.addImage(imgData, "PNG", xOffset, yOffset, imgWidth, imgHeight);

        const completed = i + 1;
        const percent = Math.round((completed / cardElements.length) * 100);
        setPdfProgress(percent);
        setPdfProgressText(`Rendered ${completed} of ${cardElements.length} report cards`);

        if (completed % pdfBatchSize === 0 || completed === cardElements.length) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
      }

      pdf.save(`report-cards-${Date.now()}.pdf`);
      setPdfProgress(100);
      setPdfProgressText(`Completed ${cardElements.length} report cards`);
      toast.success("PDF generated successfully.");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("PDF generation error:", error);
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
          ? error
          : "Unknown error";
      toast.error(`Failed to generate PDF: ${message}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  }

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
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
          <Button
            variant="outline"
            disabled={selectedStudents.length === 0 || isGeneratingPdf}
            onClick={generateReportsPdf}
          >
            <Download className="h-4 w-4 mr-1" />
            {isGeneratingPdf ? "Generating PDF…" : "Download PDF"}
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

        <div className="w-full max-w-xl mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
            <div>
              <Label htmlFor="pdf-batch-size">Batch size</Label>
              <Input
                id="pdf-batch-size"
                type="number"
                min={1}
                max={50}
                value={pdfBatchSize}
                onChange={(event) =>
                  setPdfBatchSize(Math.max(1, Math.min(50, Number(event.target.value) || 1)))
                }
                className="mt-2 w-full max-w-[120px]"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Use smaller batches for very large exports to keep progress updates responsive.
            </p>
          </div>

          {(isGeneratingPdf || pdfProgress > 0) && (
            <div className="space-y-2 rounded-lg border border-border bg-background p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">PDF export progress</span>
                <span>{pdfProgress}%</span>
              </div>
              <Progress value={pdfProgress} />
              <p className="text-sm text-muted-foreground">{pdfProgressText || "Preparing export..."}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[1fr_2fr]">
        <Card className="p-5 space-y-4 no-print min-w-0 w-full bg-muted">
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
                <SelectValue placeholder="All classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {["S.1", "S.2", "S.3", "S.4", "S.5", "S.6", "A.1", "A.2", "A.3"].map((level) => (
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
                <SelectValue placeholder="Select term" />
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
          <Button
            variant="secondary"
            className="w-full bg-primary/15 text-primary hover:bg-primary/20"
            onClick={persistDates}
          >
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
                <div
                  key={student.id}
                  className="report-card-pdf"
                  data-report-card-index={index}
                >
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportCard(props: {
  student: Student;
  term: Term | "";
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
          boxShadow: "none",
          backgroundColor: reportPageColor,
          color: reportContentColor,
          border: "none",
          position: "relative",
          padding: "1.5cm",
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
          /* avoid resetting all elements here; global print rules live in src/styles.css */
          body {
            margin: 0;
            padding: 0;
            overflow: hidden;
          }
          html, body, #root {
            width: 100% !important;
            height: 100% !important;
            display: grid !important;
            place-items: center !important;
          }
          .no-print {
            display: none !important;
          }
          .print-area {
            box-shadow: none !important;
            border: none !important;
            margin: 15mm auto !important;
            padding: 15mm !important;
            max-width: calc(210mm - 30mm) !important;
            width: calc(100% - 30mm) !important;
            min-height: calc(297mm - 30mm) !important;
            page-break-after: always;
            page-break-inside: avoid !important;
            break-after: page !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            font-size: 13px !important;
            line-height: 1.35 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
            line-height: 1.3 !important;
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
            line-height: 1.3 !important;
            border: 0.5px solid var(--report-heading-color) !important;
            border-collapse: collapse !important;
          }

          /* Slightly thicker separator between subjects */
          .print-area .subject-separator td,
          .print-area .subject-separator th {
            border-bottom: 2px solid var(--report-heading-color) !important;
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
          .print-area .header-logo,
          .print-area .student-photo { width: 8rem !important; height: 8rem !important; }
          .print-area.advanced .header-logo,
          .print-area.advanced .student-photo { width: 12rem !important; height: 12rem !important; }
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
          <div className={`rounded-full flex items-center justify-center shrink-0 overflow-hidden header-logo ${advanced ? 'h-48 w-48' : 'h-32 w-32'}`}>
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
          <div className={`rounded-full flex items-center justify-center text-[11px] text-muted-foreground text-center overflow-hidden student-photo ${advanced ? 'h-48 w-48' : 'h-32 w-32'}`}>
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
                    className={paperIndex === paperRows.length - 1 && !advanced ? 'subject-separator' : undefined}
                    style={{
                      backgroundColor: rowIndex % 2 === 1 ? stripeColor : undefined,
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
                    className="subject-separator"
                    style={{
                      backgroundColor: rowIndex % 2 === 1 ? stripeColor : undefined,
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

      <div className="mt-1 pt-1 text-[10px] text-center text-muted-foreground report-footer">
        {school.name} RMS • {issueDate}
      </div>
      <div className="mt-0 text-[9px] text-center text-muted-foreground/60 uppercase tracking-[0.15em]">
        LIGHT TECHNOLOGIES
      </div>
    </Card>
  );
}
