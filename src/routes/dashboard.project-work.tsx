import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { useStore, getStudents, getProjects, upsertProject } from "@/lib/storage";
import { ORDINARY_LEVELS, ALL_TERMS, gradeFor, type ClassLevel, type Term } from "@/lib/types";
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
import { Save, Sparkles, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/dashboard/project-work")({
  component: ProjectWorkPage,
});

function ProjectWorkPage() {
  const students = useStore(getStudents);
  const projects = useStore(getProjects);
  const [classLevel, setClassLevel] = useState<ClassLevel>(ORDINARY_LEVELS[0]);
  const [term, setTerm] = useState<Term>("Term 1");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [exportFormat, setExportFormat] = useState<"xlsx" | "csv" | "ods">("xlsx");
  const [importRows, setImportRows] = useState<
    { id: string; name: string; score: string; selected: boolean; errors: string[] }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function isValidProjectScore(value: string) {
    return /^(100(?:\.0)?|[0-9]{1,2}(?:\.[0-9])?)$/.test(value.trim().replace(/,/g, "."));
  }

  function normalizeProjectScore(value: string) {
    return Math.round(parseFloat(value.trim().replace(/,/g, ".")) * 10) / 10;
  }

  useEffect(() => {
    if (!ORDINARY_LEVELS.includes(classLevel)) {
      setClassLevel(ORDINARY_LEVELS[0]);
    }
  }, [classLevel]);

  const filteredStudents = useMemo(
    () => students.filter((s) => s.classLevel === classLevel),
    [students, classLevel],
  );

  const visibleStudents = useMemo(
    () =>
      filteredStudents.filter((s) => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return true;
        return (
          s.name.toLowerCase().includes(query) ||
          s.registrationNumber?.toLowerCase().includes(query)
        );
      }),
    [filteredStudents, searchQuery],
  );

  const filtersApplied =
    searchQuery.trim() !== "" ||
    classLevel !== ORDINARY_LEVELS[0] ||
    term !== "Term 1";

  function valueFor(studentId: string) {
    const k = `${studentId}:${term}`;
    if (drafts[k] !== undefined) return drafts[k];
    const p = projects.find((p) => p.id === k);
    return p ? String(p.marks) : "";
  }

  function saveAll() {
    let count = 0;
    for (const s of filteredStudents) {
      const raw = valueFor(s.id).trim();
      if (raw === "") continue;
      if (!isValidProjectScore(raw))
        return toast.error(`${s.name}: marks must be 0–100 with up to one decimal place.`);
      const n = normalizeProjectScore(raw);
      upsertProject({ id: `${s.id}:${term}`, studentId: s.id, term, marks: n });
      count++;
    }
    setDrafts({});
    toast.success(`Saved ${count} project work record${count === 1 ? "" : "s"}.`);
  }

  const downloadProjectWorkbook = (format: "xlsx" | "csv" | "ods" = "xlsx") => {
    const rows = filteredStudents.map((student) => ({
      Name: student.name,
      "Registration Number": student.registrationNumber ?? "",
      "Score (0-100)": valueFor(student.id),
    }));

    if (!rows.length) {
      toast.error("No students to export.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ProjectWork");

    const baseFilename = `project_work_${classLevel}_${term}`;

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
    toast.success(`Project work exported as ${format.toUpperCase()}.`);
  };

  const validateImportRow = (row: { name: string; score: string }): string[] => {
    const errors: string[] = [];
    if (!row.name.trim()) errors.push("Name is required.");
    if (!row.score.trim()) errors.push("Score is required.");
    if (!isValidProjectScore(row.score || ""))
      errors.push("Score must be 0–100 with up to one decimal place.");
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
        const importRow = {
          id: `row-${index}`,
          name: String(row["Name"] || row["name"] || "").trim(),
          score: String(row["Score (0-100)"] || row["score"] || row["Score"] || "").trim(),
          selected: true,
          errors: [] as string[],
        };
        importRow.errors = validateImportRow(importRow);
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

      const student = students.find((s) => s.name === row.name);
      if (!student) {
        toast.error(`Student "${row.name}" not found.`);
        continue;
      }

      const score = parseFloat(row.score || "0");
      upsertProject({
        id: `${student.id}:${term}`,
        studentId: student.id,
        term,
        marks: score,
      });
      count++;
    }

    setImportRows([]);
    toast.success(`${count} project work record${count === 1 ? "" : "s"} imported successfully.`);
  };

  const toggleImportRow = (id: string) => {
    setImportRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, selected: !row.selected } : row)),
    );
  };

  if (students.length === 0) {
    return (
      <Card className="p-10 text-center text-muted-foreground max-w-xl mx-auto">
        Enroll students first.
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="font-display text-3xl flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-[oklch(0.78_0.14_80)]" /> Project Work
        </h1>
        <p className="text-muted-foreground">
          Enter project work marks (0–100). The grade appears on the report card.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(320px,1fr)_minmax(0,3fr)]">
        <div className="sticky top-4 self-start space-y-4">
          <Card className="p-5 grid sm:grid-cols-3 gap-4">
            <div>
              <Label>Class</Label>
              <Select value={classLevel} onValueChange={(v) => setClassLevel(v as ClassLevel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDINARY_LEVELS.map((level) => (
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
              <Label>Search Students</Label>
              <Input
                type="search"
                placeholder="Search by name or registration number"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
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
              <Button onClick={() => downloadProjectWorkbook(exportFormat)} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" /> Export Project Work
              </Button>
            </div>
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-1" /> Import Project Work
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.ods"
              onChange={handleImportFile}
              className="hidden"
              aria-label="Upload project work spreadsheet"
            />
            <Button onClick={applyImport} variant="outline" size="sm" disabled={!importRows.length}>
              <Upload className="h-4 w-4 mr-1" /> Apply Imported
            </Button>
          </Card>
        </div>

        <div className="space-y-6">
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
                <thead className="bg-secondary text-secondary-foreground sticky top-0 z-20">
                  <tr>
                    <th className="p-3 text-left">Import</th>
                    <th className="p-3 text-left">Name</th>
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

        {!filtersApplied ? (
          <Card className="p-10 text-center text-muted-foreground">
            Use the class, term, or search filters on the left to display project work marks.
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary sticky top-0 z-20">
                  <tr>
                    <th className="text-left p-3">Student</th>
                    <th className="text-left p-3">Class</th>
                    <th className="text-left p-3 w-40">Marks / 100</th>
                    <th className="text-left p-3 w-24">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-muted-foreground">
                        {searchQuery.trim() ? (
                          <span>No students match “{searchQuery}”.</span>
                        ) : (
                          <span>No students enrolled in {classLevel} yet.</span>
                        )}
                      </td>
                    </tr>
                  ) : (
                    visibleStudents.map((s) => {
                      const v = valueFor(s.id);
                      const n = parseFloat(v || "0");
                      const g = !isNaN(n) && v !== "" ? gradeFor(n).grade : "—";
                      return (
                        <tr key={s.id} className="border-t hover:bg-accent/20">
                          <td className="p-3 font-medium">{s.name}</td>
                          <td className="p-3">{s.classLevel}</td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step="0.1"
                              value={v}
                              onChange={(e) =>
                                setDrafts((d) => ({ ...d, [`${s.id}:${term}`]: e.target.value }))
                              }
                            />
                          </td>
                          <td className="p-3 font-bold">{g}</td>
                        </tr>
                      );
                    })
                  )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t flex justify-end">
            <Button onClick={saveAll}>
              <Save className="h-4 w-4 mr-1" /> Save Project Marks
            </Button>
          </div>
        </Card>
        )}
        </div>
      </div>
    </div>
  );
}
