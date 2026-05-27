import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  useStore,
  getStudents,
  getSubjects,
  getMarks,
  getSubjectPapers,
  updateStudent,
  upsertMark,
  getOrdinarySubjects,
  getAdvancedSubjects,
  getSchool,
} from "@/lib/storage";
import {
  ADVANCED_LEVELS,
  ALL_TERMS,
  ORDINARY_LEVELS,
  displaySubjectName,
  DEFAULT_EXAM_SETS,
  subjectsForStudent,
  type ClassLevel,
  type ExamSet,
  type Term,
} from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/dashboard/marks")({
  component: MarksPage,
});

interface ImportMarkRow {
  id: string;
  name: string;
  registrationNumber: string;
  score: string;
  examSet?: ExamSet;
  selected: boolean;
  errors: string[];
}

function MarksPage() {
  const students = useStore(getStudents);
  const ordinarySubjects = useStore(getOrdinarySubjects);
  const advancedSubjects = useStore(getAdvancedSubjects);
  const marks = useStore(getMarks);
  const school = useStore(getSchool);
  const ordinaryExamSets =
    school.selectedExamSetsOrdinary && school.selectedExamSetsOrdinary.length > 0
      ? school.selectedExamSetsOrdinary
      : school.selectedExamSets && school.selectedExamSets.length > 0
      ? school.selectedExamSets
      : DEFAULT_EXAM_SETS;
  const advancedExamSets =
    school.selectedExamSetsAdvanced && school.selectedExamSetsAdvanced.length > 0
      ? school.selectedExamSetsAdvanced
      : school.selectedExamSets && school.selectedExamSets.length > 0
      ? school.selectedExamSets
      : DEFAULT_EXAM_SETS;
  const allExamSets = Array.from(new Set([...ordinaryExamSets, ...advancedExamSets]));

  const [levelGroup, setLevelGroup] = useState<"all" | "ordinary" | "advanced">("all");
  const [classLevel, setClassLevel] = useState<ClassLevel | "all">("all");
  const [term, setTerm] = useState<Term | "">("" as any);

  const classSpecificExamSets =
    classLevel === "all"
      ? undefined
      : ADVANCED_LEVELS.includes(classLevel as ClassLevel)
      ? advancedExamSets
      : ordinaryExamSets;
  const examSets =
    levelGroup === "ordinary"
      ? ordinaryExamSets
      : levelGroup === "advanced"
      ? advancedExamSets
      : classSpecificExamSets ?? allExamSets;

  const [subjectName, setSubjectName] = useState<string>("");
  const [paperNumber, setPaperNumber] = useState<number | "all">("all");
  const [examSet, setExamSet] = useState<ExamSet | "all">("all");
  const [stream, setStream] = useState<string | "all">("all");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [importRows, setImportRows] = useState<ImportMarkRow[]>([]);
  const [importExamSets, setImportExamSets] = useState<ExamSet[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [exportFormat, setExportFormat] = useState<"xlsx" | "csv" | "ods">("xlsx");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importContextSet, setImportContextSet] = useState(false);

  function isValidMarkValue(value: string) {
    return /^(100(?:\.0)?|[0-9]{1,2}(?:\.[0-9])?)$/.test(value.trim().replace(/,/g, "."));
  }

  function normalizeMarkValue(value: string) {
    return Math.round(parseFloat(value.trim().replace(/,/g, ".")) * 10) / 10;
  }

  const availableClassLevels =
    levelGroup === "advanced"
      ? ADVANCED_LEVELS
      : levelGroup === "ordinary"
      ? ORDINARY_LEVELS
      : [...ORDINARY_LEVELS, ...ADVANCED_LEVELS];

  const actualClassLevel = classLevel === "all" ? "" : classLevel;

  const subjectPaperCount = useMemo(
    () => (subjectName ? getSubjectPapers(subjectName, levelGroup === "advanced" ? "A" : levelGroup === "ordinary" ? "O" : "O") : 0),
    [subjectName, levelGroup],
  );

  const availableSubjects = useMemo(() => {
    return levelGroup === "ordinary"
      ? ordinarySubjects
      : levelGroup === "advanced"
      ? advancedSubjects
      : [...ordinarySubjects, ...advancedSubjects];
  }, [levelGroup, ordinarySubjects, advancedSubjects]);

  // Combined subjects for student enrollment checks
  const allSubjects = useMemo(
    () => [...ordinarySubjects, ...advancedSubjects],
    [ordinarySubjects, advancedSubjects],
  );


  const filtersApplied =
    subjectName !== "" && paperNumber !== "all";

  const classStreams = classLevel !== "all" ? school.classStreams?.[classLevel as ClassLevel] ?? [] : [];

  useEffect(() => {
    if (classLevel !== "all" && !availableClassLevels.includes(classLevel as ClassLevel)) {
      setClassLevel("all");
    }
  }, [availableClassLevels, classLevel]);

  useEffect(() => {
    if (classLevel === "all") {
      setStream("all");
      return;
    }
    if (stream !== "all" && !classStreams.includes(stream)) {
      setStream("all");
    }
  }, [classLevel, classStreams, stream]);

  useEffect(() => {
    if (subjectName && !availableSubjects.some((s) => s.name === subjectName)) {
      setSubjectName("");
    }
  }, [availableSubjects, subjectName]);

  useEffect(() => {
    if (paperNumber !== "all" && paperNumber > subjectPaperCount) {
      setPaperNumber("all");
    }
    // Changing any selection invalidates previously set import context
    setImportContextSet(false);
  }, [subjectPaperCount, paperNumber]);

  useEffect(() => {
    setImportContextSet(false);
  }, [classLevel, subjectName, term, examSet, stream, importExamSets, levelGroup]);

  const studentsInClass = useMemo(
    () =>
      classLevel === "all"
        ? students
        : students.filter(
            (s) =>
              s.classLevel === (classLevel as ClassLevel) &&
              (stream === "all" || s.stream === stream),
          ),
    [students, classLevel, stream],
  );

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return studentsInClass;
    const q = searchQuery.toLowerCase();
    return studentsInClass.filter(
      (s) => s.name.toLowerCase().includes(q) || s.registrationNumber?.toLowerCase().includes(q),
    );
  }, [studentsInClass, searchQuery]);

  function value(studentId: string): string {
    const key = `${studentId}:${term}:${subjectName}:${paperNumber}:${examSet}`;
    const legacyKey = `${studentId}:${term}:${subjectName}:${paperNumber}`;
    if (draft[key] !== undefined) return draft[key];
    const m = marks.find((m) => m.id === key || (examSet === "EOT" && m.id === legacyKey));
    return m && m.score !== undefined ? String(m.score) : "";
  }

  function setVal(studentId: string, v: string) {
    const key = `${studentId}:${term}:${subjectName}:${paperNumber}:${examSet}`;
    setDraft((d) => ({
      ...d,
      [key]: v,
    }));
  }

  function saveAll() {
    if (!subjectName) return toast.error("Select a subject first.");
    if (!term) return toast.error("Select term first.");
    if (paperNumber === "all") return toast.error("Select a paper first.");
    if (examSet === "all") return toast.error("Select an exam set first.");
    let count = 0;
    for (const student of studentsInClass) {
      const allowed = subjectsForStudent(student, allSubjects).some((s) => s.name === subjectName);
      if (!allowed) continue;
      const raw = value(student.id).trim();
      if (raw === "") continue;
      if (!isValidMarkValue(raw)) {
        return toast.error(
          `${student.name}: Paper ${paperNumber} mark must be 0–100 with up to one decimal place.`,
        );
      }
      const score = normalizeMarkValue(raw);
      upsertMark({
        id: `${student.id}:${term}:${subjectName}:${paperNumber}:${examSet}`,
        studentId: student.id,
        term,
        subject: subjectName,
        paper: paperNumber,
        examSet,
        score,
      });
      count++;
    }

    setDraft({});
    toast.success(`${count} mark${count === 1 ? "" : "s"} saved.`);

    if (!rows.length) {
      toast.error("No eligible students to export.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Marks");

    const baseFilename = `marks_${levelGroup === "advanced" ? "A" : "O"}_${classLevel}_${term}_${subjectName}_Paper${paperNumber}`;

    if (format === "csv") {
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${baseFilename}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } else if (format === "ods") {
      const blob = new Blob([XLSX.write(workbook, { bookType: "ods", type: "array" })], {
        type: "application/vnd.oasis.opendocument.spreadsheet",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${baseFilename}.ods`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } else {
      // Default to XLSX
      const blob = new Blob([XLSX.write(workbook, { bookType: "xlsx", type: "array" })], {
        type: "application/octet-stream",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${baseFilename}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
    toast.success(`Marks exported as ${format.toUpperCase()}.`);
  };

  const validateImportMarkRow = (row: ImportMarkRow): string[] => {
    const errors: string[] = [];
    if (!row.name.trim()) errors.push("Name is required.");
    if (!row.registrationNumber.trim()) errors.push("Registration number is required.");
    if (!row.score.trim()) errors.push("Score is required.");
    if (!isValidMarkValue(row.score || ""))
      errors.push("Score must be 0–100 with up to one decimal place.");
    if (row.examSet === undefined && importExamSets.length === 0)
      errors.push("Select at least one exam set or include an Exam Set column in the file.");
    return errors;
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!importContextSet) {
      toast.error("Set the import context (class, subject, paper, term, exam set) first.");
      event.target.value = "";
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });

      const parsedRows = rows.map((row, index) => {
        const rawExamSet = String(
          row["Exam Set"] || row["examSet"] || row["exam set"] || row["exam"] || "",
        )
          .trim()
          .toUpperCase();
        const examSetValue = examSets.includes(rawExamSet as ExamSet)
          ? (rawExamSet as ExamSet)
          : undefined;

        const importRow: ImportMarkRow = {
          id: `row-${index}`,
          name: String(row["Name"] || row["name"] || "").trim(),
          registrationNumber: String(
            row["Registration Number"] ||
              row["registration number"] ||
              row["registrationNumber"] ||
              "",
          ).trim(),
          score: String(row["Score (0-100)"] || row["score"] || row["Score"] || "").trim(),
          examSet: examSetValue,
          selected: true,
          errors: [],
        };
        importRow.errors = validateImportMarkRow(importRow);
        return importRow;
      });

      setImportRows(parsedRows);
      if (parsedRows.length === 0) {
        toast.error("The imported file did not contain any rows.");
      } else {
        toast.success(
          `Imported ${parsedRows.length} row${parsedRows.length === 1 ? "" : "s"} from file.`,
        );
      }
    } catch (error) {
      toast.error("Could not parse the imported file. Use .xlsx, .csv, or .ods format.");
    } finally {
      event.target.value = "";
    }
  };

  const applyImport = () => {
    if (!importContextSet) {
      toast.error("Set the import context (class, subject, paper, term, exam set) first.");
      return;
    }
    if (importRows.length === 0) {
      toast.error("Select a spreadsheet file first.");
      return;
    }
    const selectedRows = importRows.filter((row) => row.selected);
    if (!selectedRows.length) {
      toast.error("Select at least one row to import.");
      return;
    }

    let count = 0;
    for (const row of selectedRows) {
      if (row.errors.length) continue;

      const student = students.find(
        (s) => s.registrationNumber === row.registrationNumber || s.name === row.name,
      );
      if (!student) {
        toast.error(`Student "${row.name}" not found.`);
        continue;
      }

      const score = normalizeMarkValue(row.score || "0");
      const targetSets = row.examSet ? [row.examSet] : importExamSets;
      if (targetSets.length === 0) {
        toast.error(`No exam set selected for row ${row.name}.`);
        continue;
      }

      for (const targetSet of targetSets) {
        upsertMark({
          id: `${student.id}:${term}:${subjectName}:${paperNumber}:${targetSet}`,
          studentId: student.id,
          term,
          subject: subjectName,
          paper: paperNumber,
          examSet: targetSet,
          score,
        });
        count++;
      }
    }

    setImportRows([]);
    toast.success(`${count} mark${count === 1 ? "" : "s"} imported successfully.`);
  };

  const toggleImportRow = (id: string) => {
    setImportRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, selected: !row.selected } : row)),
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="font-display text-3xl">Enter Marks</h1>
        <p className="text-muted-foreground">
          Enter paper marks per student. Pick the paper number, enter the score, and save. Or
          import/export marks via spreadsheet.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.ods"
        className="hidden"
        onChange={handleImportFile}
        aria-hidden="true"
        aria-label="Import marks file"
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(320px,1fr)_minmax(0,3fr)]">
        <div className="sticky top-4 self-start space-y-5">
          <Card className="p-5 grid grid-cols-1 gap-4">
            <div>
              <Label>Level</Label>
              <Select
                value={levelGroup}
                onValueChange={(v) => setLevelGroup(v as "" | "ordinary" | "advanced")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  <SelectItem value="ordinary">Ordinary Level (S.1–S.4)</SelectItem>
                  <SelectItem value="advanced">Advanced Level (S.5–S.6)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Class</Label>
              <Select value={classLevel} onValueChange={(v) => setClassLevel(v as ClassLevel | "all")}>
                <SelectTrigger>
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classes</SelectItem>
                  {availableClassLevels.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Stream</Label>
              <Select
                value={stream}
                onValueChange={(v) => setStream(v as string | "all")}
                disabled={classLevel === "all" || classStreams.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All streams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All streams</SelectItem>
                  {classStreams.map((branch) => (
                    <SelectItem key={branch} value={branch}>
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {classLevel !== "all" && classStreams.length > 0 ? (
                <p className="text-xs text-muted-foreground mt-2">
                  Pick a stream to filter students to that branch, or leave as All streams to show everyone in the class.
                </p>
              ) : null}
            </div>
            <div>
              <Label>Subject</Label>
              <Select value={subjectName} onValueChange={setSubjectName}>
                <SelectTrigger>
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-subjects">All subjects</SelectItem>
                  {availableSubjects.map((subj) => (
                    <SelectItem key={subj.id} value={subj.name}>
                      {displaySubjectName(subj.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Term</Label>
              <Select value={term || ""} onValueChange={(v) => setTerm(v as Term) }>
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
              <Label>Paper</Label>
              <Select value={String(paperNumber)} onValueChange={(v) => setPaperNumber(v === "all" ? "all" : Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select paper" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All papers</SelectItem>
                  {Array.from({ length: subjectPaperCount }, (_, idx) => idx + 1).map((num) => (
                    <SelectItem key={num} value={String(num)}>
                      Paper {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Exam Set</Label>
              <Select value={examSet} onValueChange={(v) => setExamSet(v as ExamSet | "all") }>
                <SelectTrigger>
                  <SelectValue placeholder="Select exam set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All exam sets</SelectItem>
                  {examSets.map((set) => (
                    <SelectItem key={set} value={set}>
                      {set}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-2">
                <Label className="text-xs">Import To Exam Sets</Label>
                <div className="flex gap-2 mt-2">
                  {examSets.map((s) => {
                    const checked = importExamSets.includes(s);
                    return (
                      <label key={s} className="inline-flex items-center gap-2 rounded border px-2 py-1 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) setImportExamSets((cur) => Array.from(new Set([...cur, s])));
                            else setImportExamSets((cur) => cur.filter((x) => x !== s));
                          }}
                        />
                        <span>{s}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">When selected, imported rows without an Exam Set column will be written to these sets. Rows with an Exam Set column use that value.</p>
              </div>
            </div>
            <div>
              <Label htmlFor="search-marks" className="text-sm">
                Search Students
              </Label>
              <Input
                id="search-marks"
                type="text"
                placeholder="Search by name or registration number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <p className="text-xs text-muted-foreground mt-2">
                  Found {filteredStudents.length} of {studentsInClass.length} student
                  {studentsInClass.length === 1 ? "" : "s"}
                </p>
              )}
            </div>
          </Card>

          <Card className="p-4 flex flex-wrap gap-2 items-center">
            <div className="flex gap-2 items-end flex-wrap flex-1">
              <div>
                <Label className="text-xs block mb-1">Export Format</Label>
                <Select
                  value={exportFormat}
                  onValueChange={(v) => setExportFormat(v as "xlsx" | "csv" | "ods")}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xlsx">.xlsx (Excel)</SelectItem>
                    <SelectItem value="csv">.csv (Spreadsheet)</SelectItem>
                    <SelectItem value="ods">.ods (LibreOffice)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => downloadMarksWorkbook(exportFormat)} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" /> Export Marks
              </Button>
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 items-center">
                <Button
                  variant={importContextSet ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (!classLevel) return toast.error("Select class before setting import context.");
                    if (!subjectName) return toast.error("Select subject before setting import context.");
                    if (paperNumber < 1 || paperNumber > subjectPaperCount)
                      return toast.error("Choose a valid paper number for the selected subject.");
                    if (!term) return toast.error("Select term before setting import context.");
                    if (!examSet) return toast.error("Select exam set before setting import context.");
                    setImportContextSet(true);
                    toast.success(
                      `Import context set: ${classLevel} • ${subjectName} • Paper ${paperNumber} • ${term} • ${examSet}`,
                    );
                  }}
                >
                  {importContextSet ? "Import Context Set" : "Set Import Context"}
                </Button>

                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="sm"
                  disabled={!importContextSet}
                  title={!importContextSet ? "Set import context first" : "Select file to import"}
                >
                  <Upload className="h-4 w-4 mr-1" /> Import Marks
                </Button>
              </div>

              <Button
                onClick={applyImport}
                variant="outline"
                size="sm"
                disabled={!importContextSet || !importRows.length}
                title={!importContextSet ? "Set import context before applying" : "Apply imported rows"}
              >
                <Upload className="h-4 w-4 mr-1" /> Apply Imported
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {importRows.length > 0 && (
            <Card className="overflow-x-auto bg-card text-card-foreground">
              <div className="p-4 border-b flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-semibold">Import preview</p>
                  <p className="text-sm text-muted-foreground">
                    Confirm or uncheck any rows before importing.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setImportRows([])}>
                    Cancel preview
                  </Button>
                  <Button size="sm" onClick={applyImport} disabled={!importRows.length}>
                    Apply selected rows
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto bg-card">
                <table className="w-full text-sm bg-card">
                  <thead className="bg-card text-secondary-foreground">
                    <tr className="bg-card">
                      <th className="p-3 text-left bg-card">Import</th>
                      <th className="p-3 text-left">Name</th>
                      <th className="p-3 text-left">Registration</th>
                      <th className="p-3 text-left">Score</th>
                      <th className="p-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.map((row) => (
                      <tr key={row.id} className="border-t hover:bg-accent/10">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={() => toggleImportRow(row.id)}
                            className="w-4 h-4"
                            aria-label={`Select row for ${row.name}`}
                          />
                        </td>
                        <td className="p-3">{row.name}</td>
                        <td className="p-3">{row.registrationNumber}</td>
                        <td className="p-3">{row.score}</td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {row.errors.length > 0 ? row.errors.join("; ") : "Ready"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {students.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground">
              Enroll students first before entering marks.
            </Card>
          ) : !filtersApplied ? (
            <Card className="p-10 text-center text-muted-foreground">
              Select a subject and paper number to enter marks.
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary text-secondary-foreground">
                    <tr>
                      <th className="text-left p-3">Student</th>
                      <th className="text-left p-3">Class</th>
                      <th className="text-left p-3 w-32">Paper</th>
                      <th className="text-left p-3 w-32">Exam Set</th>
                      <th className="text-left p-3 w-32">Score / 100</th>
                      <th className="text-left p-3 w-24">Latest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-muted-foreground">
                          {searchQuery
                            ? `No students match "${searchQuery}"`
                            : classLevel !== "all"
                            ? `No students enrolled in ${classLevel} yet.`
                            : "Select a class to see students."}
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((student) => {
                        const hasSubject = subjectsForStudent(student, allSubjects).some(
                          (s) => s.name === subjectName,
                        );
                        return (
                          <tr key={student.id} className="border-t hover:bg-accent/20">
                            <td className="p-3 font-medium">{student.name}</td>
                            <td className="p-3">{student.classLevel}</td>
                            <td className="p-3">Paper {paperNumber}</td>
                            <td className="p-3">{examSet}</td>
                            <td className="p-2">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step="0.1"
                                disabled={!hasSubject}
                                value={hasSubject ? value(student.id) : ""}
                                placeholder={hasSubject ? "" : "N/A"}
                                onChange={(e) => setVal(student.id, e.target.value)}
                              />
                            </td>
                            <td className="p-3 font-mono">
                              {hasSubject
                                ? (() => {
                                    const existing = marks
                                      .filter(
                                        (m) =>
                                          m.studentId === student.id &&
                                          m.term === term &&
                                          m.subject === subjectName,
                                      )
                                      .sort((a, b) => a.paper - b.paper);
                                    const last = existing[existing.length - 1];
                                    if (!last) return "—";
                                    return last.score !== undefined
                                      ? last.score.toFixed(1)
                                      : ((last.ca ?? 0) + (last.exam ?? 0)).toFixed(1);
                                  })()
                                : "N/A"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t bg-card flex justify-end">
                <Button onClick={saveAll}>
                  <Save className="h-4 w-4 mr-1" /> Save Marks
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
