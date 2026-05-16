import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import {
  useStore,
  getStudents,
  getSchool,
  addStudent,
  updateStudent,
  deleteStudent,
  getSubjects,
  getCombinations,
  addOrdinarySubject,
} from "@/lib/storage";
import {
  ALL_CLASSES,
  OPTIONAL_SUBJECTS,
  ORDINARY_LEVELS,
  ADVANCED_LEVELS,
  isAdvancedLevel,
  ADVANCED_SUBJECTS,
  ADVANCED_SUBSIDIARY_SUBJECTS,
  generateAdvancedCombination,
  displaySubjectName,
  type ClassLevel,
  type Gender,
  type Student,
  COMPULSORY_SUBJECTS,
  type Combination,
  type Subject,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Pencil, UserCircle2, Save, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface ImportRow {
  id: string;
  name: string;
  studentIdentificationNumber: string;
  registrationNumber: string;
  gender?: Gender;
  classLevel?: ClassLevel;
  rawSubjects: string;
  subjects: string;
  selected: boolean;
  errors: string[];
}

function parseSubjects(value: string | undefined): string[] {
  return String(value || "")
    .split(/[,;]+/)
    .map((subject) => subject.trim())
    .filter(Boolean);
}

function deriveAdvancedEnrollmentFromSubjects(subjects: string[]) {
  const normalized = subjects.map((s) => s.trim()).filter(Boolean);
  const hasGeneralPaper = normalized.includes("GeneralPaper");
  const subsidiary = normalized.find((s) => ADVANCED_SUBSIDIARY_SUBJECTS.includes(s));
  const mainSubjects = normalized.filter(
    (s) => s !== "GeneralPaper" && !ADVANCED_SUBSIDIARY_SUBJECTS.includes(s),
  );

  if (hasGeneralPaper && subsidiary && mainSubjects.length === 3) {
    return generateAdvancedCombination(mainSubjects);
  }

  return { enrolled: normalized, combo: undefined };
}

function subjectsFromAdvancedComboString(comboText: string): string[] | undefined {
  const match = comboText.trim().toUpperCase().split("/");
  if (match.length !== 2) return undefined;

  const mainCode = match[0].trim();
  const subCode = match[1].trim();
  const letterMap: Record<string, string> = {
    P: "Physics",
    C: "Chemistry",
    M: "Mathematics",
    B: "Biology",
    G: "Geography",
    H: "History",
    R: "CRE",
    I: "IRE",
    E: "Entrepreneurship",
    L: "Luganda",
    F: "FineArt",
    T: "TechnicalDrawing",
  };

  const mainSubjects = mainCode
    .split("")
    .map((letter) => letterMap[letter])
    .filter(Boolean);

  const subsidiary =
    subCode === "ICT"
      ? "SubsidiaryICT"
      : subCode === "SM" || subCode === "M"
        ? "SubsidiaryMath"
        : undefined;
  if (!subsidiary || mainSubjects.length !== mainCode.length) return undefined;

  return [...mainSubjects, "GeneralPaper", subsidiary];
}

function parseAdvancedEnrollmentInput(rawValue: string) {
  const trimmed = rawValue.trim();
  if (!trimmed) return { enrolled: [], combo: undefined };

  if (trimmed.includes("/")) {
    const comboSubjects = subjectsFromAdvancedComboString(trimmed);
    if (comboSubjects) {
      return { enrolled: comboSubjects, combo: trimmed.toUpperCase() };
    }
  }

  return deriveAdvancedEnrollmentFromSubjects(parseSubjects(trimmed));
}

function normalizeClassInput(raw: string | undefined): ClassLevel | undefined {
  if (!raw) return undefined;
  const t = String(raw).trim().toUpperCase();
  // Accept formats like "S4", "S.4", "4", "FORM 4", "FORM4"
  const justDigits = t.replace(/[^0-9]/g, "");
  if (justDigits.length === 1) {
    const n = Number(justDigits);
    if (n >= 1 && n <= 6) return `S.${n}` as ClassLevel;
  }
  const sMatch = t.match(/S\.?([1-6])/);
  if (sMatch) return `S.${sMatch[1]}` as ClassLevel;
  const fMatch = t.match(/FORM\s*([1-6])/);
  if (fMatch) return `S.${fMatch[1]}` as ClassLevel;
  return undefined;
}

function generateStudentIdentificationNumber(prefix: string) {
  const safePrefix = String(prefix || "SIN")
    .trim()
    .replace(/[^A-Za-z0-9]/g, "");
  const tokenChars = "0123456789";
  let token = "";
  for (let i = 0; i < 7; i += 1) {
    token += tokenChars.charAt(Math.floor(Math.random() * tokenChars.length));
  }
  return `${safePrefix || "SIN"}-${token}`;
}

function getStudentCombo(student: Student, combinations: Combination[]) {
  if (!ADVANCED_LEVELS.includes(student.classLevel)) return undefined;
  if (student.enrollmentCombination) return student.enrollmentCombination;

  // Try to match against defined combinations
  const enrolled = student.enrolledSubjects || [];
  const matchingCombo = combinations.find(
    (combo) =>
      combo.subjects.every((subj) => enrolled.includes(subj)) &&
      enrolled.every((subj) => combo.subjects.includes(subj) || subj === "GeneralPaper"),
  );
  if (matchingCombo) return matchingCombo.shortForm;

  return parseAdvancedEnrollmentInput(enrolled.join(", ")).combo;
}

function getStudentOptionalSubjects(student: Student) {
  if (!ORDINARY_LEVELS.includes(student.classLevel)) return [];
  if (student.optionalSubjects?.length) return student.optionalSubjects;
  return student.enrolledSubjects?.filter((subject) => OPTIONAL_SUBJECTS.includes(subject)) ?? [];
}

function formatStudentSubjectsForDisplay(student: Student, combinations: Combination[]) {
  if (ORDINARY_LEVELS.includes(student.classLevel)) {
    const optionals = getStudentOptionalSubjects(student);
    return optionals.length ? optionals.join(", ") : "No optionals";
  }

  return (
    getStudentCombo(student, combinations) ?? student.enrolledSubjects?.join(", ") ?? "Not set"
  );
}

function studentHasSubject(student: Student, subject: string) {
  if (ORDINARY_LEVELS.includes(student.classLevel)) {
    if (COMPULSORY_SUBJECTS.includes(subject)) return true;
    return getStudentOptionalSubjects(student).includes(subject);
  }
  return student.enrolledSubjects?.includes(subject) ?? false;
}

function formatImportedSubjectValue(classLevel: ClassLevel | undefined, rawValue: string) {
  const subjects = parseSubjects(rawValue);
  if (ORDINARY_LEVELS.includes(classLevel as ClassLevel)) {
    return subjects.filter((subject) => OPTIONAL_SUBJECTS.includes(subject)).join(", ");
  }

  if (ADVANCED_LEVELS.includes(classLevel as ClassLevel)) {
    const advanced = parseAdvancedEnrollmentInput(rawValue);
    return advanced.combo || advanced.enrolled.join(", ");
  }

  return subjects.join(", ");
}

export const Route = createFileRoute("/dashboard/students")({
  component: StudentsPage,
});

function StudentsPage() {
  const students = useStore(getStudents);
  const school = useStore(getSchool);
  const subjects = useStore(getSubjects);
  const combinations = useStore(getCombinations);
  const [classFilter, setClassFilter] = useState<"All" | ClassLevel>("All");
  const [levelFilter, setLevelFilter] = useState<"All" | "Ordinary" | "Advanced">("All");
  const [genderFilter, setGenderFilter] = useState<"All" | Gender>("All");
  const [subjectFilter, setSubjectFilter] = useState<string>("All");
  const [combinationFilter, setCombinationFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [editing, setEditing] = useState<Student | null>(null);
  const [open, setOpen] = useState(false);

  const [exportFields, setExportFields] = useState<Record<string, boolean>>({
    name: true,
    studentIdentificationNumber: true,
    registrationNumber: true,
    gender: true,
    classLevel: true,
    subjects: true,
  });
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (classFilter === "All") {
      setLevelFilter("All");
    } else if (ORDINARY_LEVELS.includes(classFilter)) {
      setLevelFilter("Ordinary");
    } else if (ADVANCED_LEVELS.includes(classFilter)) {
      setLevelFilter("Advanced");
    }
  }, [classFilter]);

  useEffect(() => {
    if (levelFilter !== "Advanced") {
      setCombinationFilter("All");
    }
  }, [levelFilter]);

  const allSubjectOptions = useMemo(() => {
    return Array.from(new Set(subjects.map((subject) => subject.name))).sort();
  }, [subjects]);

  const allCombinations = useMemo(() => {
    return combinations.map((combo) => combo.shortForm).sort();
  }, [combinations]);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (classFilter !== "All" && s.classLevel !== classFilter) return false;
      if (levelFilter === "Ordinary" && !ORDINARY_LEVELS.includes(s.classLevel)) return false;
      if (levelFilter === "Advanced" && !ADVANCED_LEVELS.includes(s.classLevel)) return false;
      if (genderFilter !== "All" && s.gender !== genderFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !s.name.toLowerCase().includes(q) &&
          !s.studentIdentificationNumber?.toLowerCase().includes(q) &&
          !s.registrationNumber?.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (subjectFilter !== "All" && !studentHasSubject(s, subjectFilter)) return false;
      if (levelFilter === "Advanced" && combinationFilter !== "All") {
        const studentCombo = getStudentCombo(s, combinations);
        if (studentCombo !== combinationFilter) return false;
      }
      return true;
    });
  }, [
    students,
    classFilter,
    levelFilter,
    genderFilter,
    subjectFilter,
    combinationFilter,
    searchQuery,
    combinations,
  ]);

  const hasAdvancedStudents = filtered.some((s) => ADVANCED_LEVELS.includes(s.classLevel));
  const hasOrdinaryStudents = filtered.some((s) => ORDINARY_LEVELS.includes(s.classLevel));

  const subjectsHeader = hasAdvancedStudents && !hasOrdinaryStudents ? "Combination" : "Subjects";

  const normalizeGender = (value: string | undefined): Gender | undefined => {
    if (!value) return undefined;
    const normalized = String(value).trim().toLowerCase();
    if (normalized === "male" || normalized === "m") return "Male";
    if (normalized === "female" || normalized === "f") return "Female";
    return undefined;
  };

  const buildExportRows = () =>
    filtered.map((student) => {
      const subjectText = ORDINARY_LEVELS.includes(student.classLevel)
        ? getStudentOptionalSubjects(student).join(", ")
        : (getStudentCombo(student, combinations) ?? student.enrolledSubjects?.join(", ")) || "";

      const row: Record<string, string> = {};
      if (exportFields.name) row.Name = student.name;
      if (exportFields.studentIdentificationNumber)
        row["Student Identification Number"] = student.studentIdentificationNumber ?? "";
      if (exportFields.registrationNumber)
        row["Registration Number"] = student.registrationNumber ?? "";
      if (exportFields.gender) row.Gender = student.gender ?? "";
      if (exportFields.classLevel) row.Class = student.classLevel;
      if (exportFields.subjects) row.Subjects = subjectText;
      return row;
    });

  const downloadWorkbook = (bookType: "xlsx" | "csv" | "ods") => {
    const rows = buildExportRows();
    if (!rows.length) {
      toast.error("No students match the selected filters to export.");
      return;
    }
    if (!Object.values(exportFields).some(Boolean)) {
      toast.error("Select at least one field to export.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

    const writeOptions: XLSX.WritingOptions = {
      bookType,
      type: bookType === "csv" ? "string" : "array",
    };
    const data = XLSX.write(workbook, writeOptions);

    const blob = new Blob([bookType === "csv" ? data : new Uint8Array(data as ArrayBuffer)], {
      type: bookType === "csv" ? "text/csv;charset=utf-8;" : "application/octet-stream",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `student-list.${bookType}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const validateImportRow = (row: ImportRow): string[] => {
    const errors: string[] = [];
    if (!row.name.trim()) errors.push("Name is required.");
    if (!row.classLevel) errors.push("Class is required.");
    if (row.gender && !["Male", "Female"].includes(row.gender)) {
      errors.push("Gender must be Male or Female.");
    }
    if (!row.subjects.trim()) errors.push("At least one subject is required.");
    if (row.registrationNumber && !["S.4", "S.6"].includes(row.classLevel ?? "")) {
      errors.push("Only S.4 and S.6 students may have a registration number.");
    }
    return errors;
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
      const parsedRows = rows.map((row, index) => {
        const rowClassRaw = String(row["Class"] || row["class"] || "").trim();
        const normalizedClass = normalizeClassInput(rowClassRaw);
        const rawSubjects = String(
          row["Subjects"] ||
            row["subjects"] ||
            row["Enrolled Subjects"] ||
            row["Optional Subjects"] ||
            "",
        ).trim();
        const gender = normalizeGender(row["Gender"] || row["gender"] || "");
        const importRow: ImportRow = {
          id: `row-${index}`,
          name: String(row["Name"] || row["name"] || "").trim(),
          studentIdentificationNumber: String(
            row["Student Identification Number"] ||
              row["SIN"] ||
              row["studentIdentificationNumber"] ||
              "",
          ).trim(),
          registrationNumber: String(
            row["Registration Number"] ||
              row["registration number"] ||
              row["registrationNumber"] ||
              "",
          )
            .trim()
            .replace(/\D/g, ""),
          gender,
          classLevel: normalizedClass,
          rawSubjects,
          subjects: formatImportedSubjectValue(normalizedClass, rawSubjects),
          selected: true,
          errors: [],
        };
        importRow.errors = validateImportRow(importRow);
        return importRow;
      });

      setImportRows(parsedRows);
      if (parsedRows.length === 0) {
        toast.error("The imported spreadsheet did not contain any rows.");
      }
    } catch (error) {
      toast.error("Could not parse the imported file. Use .xlsx, .csv, or .ods formats.");
    } finally {
      event.target.value = "";
    }
  };

  const applyImport = () => {
    if (importRows.length === 0) {
      toast.error("Select a spreadsheet file first.");
      return;
    }
    const selectedRows = importRows.filter((row) => row.selected);
    if (!selectedRows.length) {
      toast.error("Select at least one row to import.");
      return;
    }

    for (const row of selectedRows) {
      if (row.errors.length) continue;
      const classLevel = row.classLevel || "S.1";
      const importSubjects = parseSubjects(row.rawSubjects);
      const isAdvanced = ADVANCED_LEVELS.includes(classLevel);
      const advancedEnrollment = isAdvanced
        ? parseAdvancedEnrollmentInput(row.rawSubjects)
        : undefined;
      const studentIdentificationNumber =
        row.studentIdentificationNumber.trim() ||
        generateStudentIdentificationNumber(school.studentIdentificationPrefix ?? "SIN");
      const registrationNumberValue = ["S.4", "S.6"].includes(classLevel)
        ? row.registrationNumber.replace(/\D/g, "") || undefined
        : undefined;
      const studentData: Omit<Student, "id" | "createdAt"> = {
        name: row.name,
        studentIdentificationNumber,
        registrationNumber: registrationNumberValue,
        classLevel,
        gender: row.gender,
        optionalSubjects: isAdvanced
          ? undefined
          : importSubjects.filter((subject) => OPTIONAL_SUBJECTS.includes(subject)),
        enrolledSubjects: isAdvanced ? advancedEnrollment?.enrolled : undefined,
        enrollmentCombination: isAdvanced ? advancedEnrollment?.combo : undefined,
      };

      const existing = students.find(
        (student) =>
          (student.studentIdentificationNumber &&
            student.studentIdentificationNumber === studentIdentificationNumber) ||
          (student.registrationNumber && student.registrationNumber === row.registrationNumber) ||
          student.name === row.name,
      );

      if (existing) {
        updateStudent(existing.id, studentData);
      } else {
        addStudent({
          id: crypto.randomUUID(),
          ...studentData,
          createdAt: Date.now(),
        });
      }
    }

    setImportRows([]);
    toast.success(
      `${selectedRows.filter((row) => !row.errors.length).length} student(s) imported.`,
    );
  };

  const toggleImportRow = (id: string) => {
    setImportRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, selected: !row.selected } : row)),
    );
  };

  const updateExportField = (field: string) => {
    setExportFields((current) => ({ ...current, [field]: !current[field] }));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl">Students</h1>
          <p className="text-muted-foreground">
            Enroll, edit, and manage student records. ({filtered.length})
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4 mr-1" /> New Student
            </Button>
          </DialogTrigger>
          <StudentDialog
            student={editing}
            onClose={() => {
              setOpen(false);
              setEditing(null);
            }}
          />
        </Dialog>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.ods"
        className="hidden"
        onChange={handleImportFile}
        aria-hidden="true"
        aria-label="Import students file"
      />

      <Card className="p-4 grid gap-3 sm:grid-cols-[minmax(240px,_1fr)_minmax(240px,_1fr)] items-center">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadWorkbook("xlsx")}>
              <Download className="h-4 w-4 mr-1" /> Export .xlsx
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadWorkbook("csv")}>
              <Download className="h-4 w-4 mr-1" /> Export .csv
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadWorkbook("ods")}>
              <Download className="h-4 w-4 mr-1" /> Export .ods
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(exportFields).map(([key, selected]) => (
              <label key={key} className="inline-flex items-center gap-2 text-sm">
                <Checkbox checked={selected} onCheckedChange={() => updateExportField(key)} />
                {key === "name"
                  ? "Name"
                  : key === "studentIdentificationNumber"
                    ? "Student ID"
                    : key === "registrationNumber"
                      ? "Registration Number"
                      : key === "gender"
                        ? "Gender"
                        : key === "classLevel"
                          ? "Class"
                          : "Subjects"}
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1" /> Import students
            </Button>
            <Button variant="outline" size="sm" onClick={applyImport} disabled={!importRows.length}>
              <Upload className="h-4 w-4 mr-1" /> Apply imported rows
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Use `.xlsx`, `.csv`, or `.ods` files. Required columns: Name, Registration Number,
            Gender, Class, Subjects.
          </p>
        </div>
      </Card>

      <div className="flex gap-2 items-end flex-wrap">
        <div className="min-w-32">
          <Label className="text-xs mb-2 block">Class</Label>
          <Select
            value={classFilter}
            onValueChange={(v) => setClassFilter(v as "All" | ClassLevel)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All classes</SelectItem>
              {ALL_CLASSES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-32">
          <Label className="text-xs mb-2 block">Level</Label>
          <Select
            value={levelFilter}
            onValueChange={(v) => setLevelFilter(v as "All" | "Ordinary" | "Advanced")}
            disabled={classFilter !== "All"}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All levels</SelectItem>
              <SelectItem value="Ordinary">Ordinary Level</SelectItem>
              <SelectItem value="Advanced">Advanced Level</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-32">
          <Label className="text-xs mb-2 block">Gender</Label>
          <Select value={genderFilter} onValueChange={(v) => setGenderFilter(v as "All" | Gender)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-40">
          <Label className="text-xs mb-2 block">Search</Label>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name or registration"
            className="h-8 text-sm"
          />
        </div>
        <div className="min-w-40">
          <Label className="text-xs mb-2 block">Subject Enrolled</Label>
          <Select value={subjectFilter} onValueChange={(v) => setSubjectFilter(v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              {allSubjectOptions.map((sub) => (
                <SelectItem key={sub} value={sub}>
                  {sub}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {levelFilter === "Advanced" && (
          <div className="min-w-32">
            <Label className="text-xs mb-2 block">Combination</Label>
            <Select value={combinationFilter} onValueChange={(v) => setCombinationFilter(v)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                {allCombinations.map((combo) => (
                  <SelectItem key={combo} value={combo}>
                    {combo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label className="text-xs mb-2 block">&nbsp;</Label>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-sm"
            onClick={() => {
              setClassFilter("All");
              setLevelFilter("All");
              setGenderFilter("All");
              setSubjectFilter("All");
              setCombinationFilter("All");
            }}
          >
            Reset filters
          </Button>
        </div>
      </div>

      {importRows.length > 0 && (
        <Card className="overflow-x-auto">
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
              <Button size="sm" onClick={applyImport}>
                Apply selected rows
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-secondary-foreground">
                <tr>
                  <th className="p-3 text-left">Import</th>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Student ID</th>
                  <th className="p-3 text-left">Registration</th>
                  <th className="p-3 text-left">Gender</th>
                  <th className="p-3 text-left">Class</th>
                  <th className="p-3 text-left">Subjects</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {importRows.map((row) => (
                  <tr key={row.id} className="border-t hover:bg-accent/10">
                    <td className="p-3">
                      <Checkbox
                        checked={row.selected}
                        onCheckedChange={() => toggleImportRow(row.id)}
                      />
                    </td>
                    <td className="p-3">{row.name}</td>
                    <td className="p-3">{row.studentIdentificationNumber || "-"}</td>
                    <td className="p-3">{row.registrationNumber || "-"}</td>
                    <td className="p-3">{row.gender ?? "-"}</td>
                    <td className="p-3">{row.classLevel ?? "-"}</td>
                    <td className="p-3">{row.subjects}</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {row.errors.length > 0 ? row.errors.join(" ") : "Ready"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <UserCircle2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No students enrolled yet.</p>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-secondary-foreground">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Class</th>
                <th className="p-3 text-left">Student ID</th>
                <th className="p-3 text-left">Gender</th>
                <th className="p-3 text-left">{subjectsHeader}</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t hover:bg-accent/10">
                  <td className="p-3 font-medium">{s.name}</td>
                  <td className="p-3">{s.classLevel}</td>
                  <td className="p-3">
                    <div>{s.studentIdentificationNumber ?? "-"}</div>
                    {s.registrationNumber ? (
                      <div className="text-muted-foreground text-xs">
                        Reg: {s.registrationNumber}
                      </div>
                    ) : null}
                  </td>
                  <td className="p-3">{s.gender ?? "-"}</td>
                  <td className="p-3">
                    {ORDINARY_LEVELS.includes(s.classLevel)
                      ? getStudentOptionalSubjects(s).join(", ") || "No optionals"
                      : (getStudentCombo(s, combinations) ?? s.enrolledSubjects?.join(", ")) ||
                        "Not set"}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditing(s);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {s.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently removes the student and all their marks and project
                              records.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                deleteStudent(s.id);
                                toast.success("Student deleted.");
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <p className="text-xs text-muted-foreground text-center">
        {Array.from(new Set(subjects.map((subject) => subject.name.toLowerCase()))).length} unique subjects in catalog
      </p>
    </div>
  );
}

function StudentDialog({ student, onClose }: { student: Student | null; onClose: () => void }) {
  const subjects = useStore(getSubjects);
  const school = useStore(getSchool);
  const [name, setName] = useState(student?.name ?? "");
  const [registrationNumber, setRegistrationNumber] = useState(student?.registrationNumber ?? "");
  const initialLevel = student?.classLevel
    ? ORDINARY_LEVELS.includes(student.classLevel)
      ? "Ordinary"
      : "Advanced"
    : "";
  const [level, setLevel] = useState<"Ordinary" | "Advanced" | "">(initialLevel);
  const [classLevel, setClassLevel] = useState<ClassLevel | "">(student?.classLevel ?? "");
  const [gender, setGender] = useState<Gender | "unspecified">(student?.gender ?? "unspecified");
  const [photo, setPhoto] = useState(student?.photoDataUrl);
  const [optionals, setOptionals] = useState<string[]>(student?.optionalSubjects ?? []);
  const [selectedAdvancedSubjects, setSelectedAdvancedSubjects] = useState<string[]>(
    student && ADVANCED_LEVELS.includes(student.classLevel as ClassLevel)
      ? // Extract the 3 main subjects from enrollment (not including G.P or subsidiaries)
        (student.enrolledSubjects?.filter(
          (s) => !["GeneralPaper", "SubsidiaryICT", "SubsidiaryMath"].includes(s),
        ) ?? [])
      : [],
  );

  useEffect(() => {
    setName(student?.name ?? "");
    setRegistrationNumber(student?.registrationNumber ?? "");
    setGender(student?.gender ?? "unspecified");
    setClassLevel(student?.classLevel ?? "");
    setLevel(
      student?.classLevel
        ? ORDINARY_LEVELS.includes(student.classLevel)
          ? "Ordinary"
          : "Advanced"
        : "",
    );
    setPhoto(student?.photoDataUrl);
    setOptionals(student?.optionalSubjects ?? []);
    setSelectedAdvancedSubjects(
      student && ADVANCED_LEVELS.includes(student.classLevel as ClassLevel)
        ? (student.enrolledSubjects?.filter(
            (s) => !["GeneralPaper", "SubsidiaryICT", "SubsidiaryMath"].includes(s),
          ) ?? [])
        : [],
    );
  }, [student]);

  const isOrdinary = classLevel !== "" && ORDINARY_LEVELS.includes(classLevel as ClassLevel);
  const isAdvanced = classLevel !== "" && ADVANCED_LEVELS.includes(classLevel as ClassLevel);
  const canHaveRegistrationNumber = classLevel === "S.4" || classLevel === "S.6";
  const showOptionalSubjects = isOrdinary && classLevel !== "S.1";
  const showAdvancedSubjects = isAdvanced;

  useEffect(() => {
    if (!canHaveRegistrationNumber) {
      setRegistrationNumber("");
    }
  }, [canHaveRegistrationNumber]);

  // Calculate the full enrollment for advanced students
  const advancedEnrollment = useMemo(() => {
    if (!isAdvanced || selectedAdvancedSubjects.length !== 3) return null;
    const { combo, enrolled } = generateAdvancedCombination(selectedAdvancedSubjects);
    return { combo, enrolled };
  }, [isAdvanced, selectedAdvancedSubjects]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(f);
  }

  function toggleOptional(name: string) {
    setOptionals((cur) => {
      if (cur.includes(name)) return cur.filter((n) => n !== name);
      if (cur.length >= 2) {
        toast.error("Pick exactly 2 optional subjects.");
        return cur;
      }
      return [...cur, name];
    });
  }

  function toggleAdvancedSubject(name: string) {
    setSelectedAdvancedSubjects((cur) => {
      if (cur.includes(name)) return cur.filter((n) => n !== name);
      if (cur.length >= 3) {
        toast.error("Select exactly 3 subjects for A-level.");
        return cur;
      }
      return [...cur, name];
    });
  }

  function save() {
    if (!name.trim()) return toast.error("Name is required.");
    if (!level) return toast.error("Choose a level first.");
    if (!classLevel) return toast.error("Choose a class for the selected level.");
    if (showOptionalSubjects && optionals.length !== 2)
      return toast.error("Pick exactly 2 optional subjects for S.2–S.4.");
    if (showAdvancedSubjects && !advancedEnrollment)
      return toast.error("Select exactly 3 subjects for A-level.");

    let enrolledSubjects: string[] | undefined;
    let enrollmentCombination: string | undefined;

    if (isOrdinary) {
      enrolledSubjects = [...COMPULSORY_SUBJECTS];
      if (showOptionalSubjects) {
        enrolledSubjects.push(...optionals);
      }
    } else if (isAdvanced && advancedEnrollment) {
      enrolledSubjects = advancedEnrollment.enrolled;
      enrollmentCombination = advancedEnrollment.combo;
    }

    const genderValue = gender === "unspecified" ? undefined : gender;

    const registrationNumberValue = canHaveRegistrationNumber
      ? registrationNumber.trim() || undefined
      : undefined;

    if (student) {
      updateStudent(student.id, {
        name: name.trim(),
        registrationNumber: registrationNumberValue,
        classLevel,
        gender: genderValue,
        photoDataUrl: photo,
        optionalSubjects: showOptionalSubjects ? optionals : undefined,
        enrolledSubjects,
        enrollmentCombination: showAdvancedSubjects ? enrollmentCombination : undefined,
        studentIdentificationNumber:
          student.studentIdentificationNumber ||
          generateStudentIdentificationNumber(school.studentIdentificationPrefix ?? "SIN"),
      });
      toast.success("Student updated.");
    } else {
      addStudent({
        id: crypto.randomUUID(),
        name: name.trim(),
        studentIdentificationNumber: generateStudentIdentificationNumber(
          school.studentIdentificationPrefix ?? "SIN",
        ),
        registrationNumber: registrationNumberValue,
        classLevel,
        gender: genderValue,
        photoDataUrl: photo,
        optionalSubjects: showOptionalSubjects ? optionals : undefined,
        enrolledSubjects,
        enrollmentCombination: showAdvancedSubjects ? enrollmentCombination : undefined,
        createdAt: Date.now(),
      });
      toast.success("Student added.");
    }

    // Auto-add selected optional subjects to compulsory subjects for ordinary level
    if (isOrdinary && optionals.length > 0) {
      optionals.forEach((subjectName) => {
        addOrdinarySubject({
          id: crypto.randomUUID(),
          name: subjectName,
          isOptional: true,
        });
      });
    }

    onClose();
  }

  return (
    <DialogContent className="max-w-lg max-h-screen overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{student ? "Edit Student" : "New Student"}</DialogTitle>
      </DialogHeader>
      <form
        id="student-form"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="space-y-4"
      >
        <div className="flex items-center gap-4">
          {photo ? (
            <img src={photo} alt="" className="h-20 w-20 rounded-full object-cover border" />
          ) : (
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
              <UserCircle2 className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
          <div>
            <Label className="text-xs">Passport photo</Label>
            <Input type="file" accept="image/*" onChange={handleFile} />
          </div>
        </div>
        <div>
          <Label>Full Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Level</Label>
            <Select
              value={level}
              onValueChange={(v) => {
                const nextLevel = v as "Ordinary" | "Advanced";
                setLevel(nextLevel);
                setClassLevel(nextLevel === "Ordinary" ? "S.1" : "S.5");
                setOptionals([]);
                setSelectedAdvancedSubjects([]);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ordinary">Ordinary Level</SelectItem>
                <SelectItem value="Advanced">Advanced Level</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Class</Label>
            <Select
              value={classLevel}
              onValueChange={(v) => setClassLevel(v as ClassLevel)}
              disabled={!level}
            >
              <SelectTrigger>
                <SelectValue placeholder={level ? "Choose class" : "Choose level first"} />
              </SelectTrigger>
              <SelectContent>
                {(level === "Ordinary" ? ORDINARY_LEVELS : ADVANCED_LEVELS).map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4">
          <Label>Gender</Label>
          <Select value={gender} onValueChange={(v) => setGender(v as Gender | "unspecified")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unspecified">Not specified</SelectItem>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Registration Number</Label>
            <Input
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value.replace(/\D/g, ""))}
              disabled={!canHaveRegistrationNumber}
              placeholder={
                canHaveRegistrationNumber
                  ? "Digits only"
                  : "Only S.4 and S.6 may have a registration number"
              }
            />
          </div>
        </div>

        {showOptionalSubjects && (
          <div>
            <Label>Optional subjects (choose 2)</Label>
            <div className="grid grid-cols-2 gap-2 mt-2 p-3 border rounded-md">
              {OPTIONAL_SUBJECTS.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={optionals.includes(opt)}
                    onCheckedChange={() => toggleOptional(opt)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        )}

        {showAdvancedSubjects && (
          <div className="space-y-3">
            <div>
              <Label>Select 3 main subjects</Label>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                General Paper and a subsidiary (Subsidiary ICT or Math) will be added automatically.
              </p>
              <div className="grid grid-cols-2 gap-2 p-3 border rounded-md max-h-60 overflow-y-auto">
                {ADVANCED_SUBJECTS.map((sub) => (
                  <label key={sub} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={selectedAdvancedSubjects.includes(sub)}
                      onCheckedChange={() => toggleAdvancedSubject(sub)}
                    />
                    {displaySubjectName(sub)}
                  </label>
                ))}
              </div>
            </div>

            {advancedEnrollment && (
              <div className="p-3 bg-muted rounded-md border">
                <p className="text-xs font-semibold mb-2">Enrollment Summary:</p>
                <p className="text-sm mb-2">
                  <span className="font-semibold">Combination: </span>
                  <code className="bg-background px-2 py-1 rounded">
                    {advancedEnrollment.combo}
                  </code>
                </p>
                <p className="text-xs text-muted-foreground">
                  Subjects: {advancedEnrollment.enrolled.map(displaySubjectName).join(", ")}
                </p>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            <Save className="h-4 w-4 mr-1" /> Save
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
