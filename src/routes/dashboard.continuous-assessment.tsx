import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  useStore,
  getStudents,
  getOrdinarySubjects,
  getCATableFor,
  upsertCATable,
  upsertCAValue,
} from "@/lib/storage";
import { ORDINARY_LEVELS, ALL_TERMS, type ClassLevel, type Term } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Download, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/dashboard/continuous-assessment")({
  component: ContinuousAssessmentPage,
});

function ContinuousAssessmentPage() {
  const students = useStore(getStudents);
  const ordinarySubjects = useStore(getOrdinarySubjects);
  const subjects = useMemo(() => ordinarySubjects, [ordinarySubjects]);

  const [classLevel, setClassLevel] = useState<ClassLevel>(ORDINARY_LEVELS[0]);
  const [subject, setSubject] = useState<string>(subjects[0]?.name ?? "");
  const [term, setTerm] = useState<Term>(ALL_TERMS[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [table, setTable] = useState<any | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({}); // studentId -> { colId: value }
  const [newActivityName, setNewActivityName] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!subjects.length) return;
    if (!subject) setSubject(subjects[0].name);
  }, [subjects, subject]);

  useEffect(() => {
    if (!subject || !classLevel || !term) return;
    const t = getCATableFor(subject, classLevel, term);
    setTable(t);
    // build drafts from rows
    const d: Record<string, Record<string, string>> = {};
    (t.rows || []).forEach((r: any) => {
      d[r.studentId] = {};
      for (const col of t.columns || []) {
        d[r.studentId][col.id] = String((r.values || {})[col.id] ?? "");
      }
    });
    setDrafts(d);
  }, [subject, classLevel, term, students]);

  const visibleRows = useMemo(() => {
    if (!table) return [];
    const query = searchQuery.trim().toLowerCase();
    return (table.rows || []).filter((r: any) => {
      if (!query) return true;
      const student = students.find((s) => s.id === r.studentId);
      return (
        student?.name.toLowerCase().includes(query) ||
        student?.registrationNumber?.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, table, students]);

  function ensureTableLoaded() {
    if (!table) return null;
    return table;
  }

  function addColumn(name: string) {
    if (!table) return;
    const id = crypto.randomUUID();
    const newColumns = [...(table.columns || []), { id, name }];
    const newTable = { ...table, columns: newColumns };
    // ensure every row has the column
    newTable.rows = (newTable.rows || []).map((r: any) => ({ ...r, values: { ...(r.values || {}), [id]: "" } }));
    upsertCATable(newTable);
    setTable(newTable);
    toast.success(`Added activity: ${name}`);
  }

  function removeColumn(colId: string) {
    if (!table) return;
    const cols = (table.columns || []).filter((c: any) => c.id !== colId);
    const rows = (table.rows || []).map((r: any) => {
      const v = { ...(r.values || {}) };
      delete v[colId];
      return { ...r, values: v };
    });
    const newTable = { ...table, columns: cols, rows };
    upsertCATable(newTable);
    setTable(newTable);
    // remove from drafts
    setDrafts((d) => {
      const copy = { ...d };
      for (const sid of Object.keys(copy)) delete copy[sid][colId];
      return copy;
    });
    toast.success("Removed activity column.");
  }

  function updateCell(studentId: string, colId: string, value: string) {
    setDrafts((d) => ({ ...d, [studentId]: { ...(d[studentId] || {}), [colId]: value } }));
  }

  function saveAll() {
    if (!table) return;
    let count = 0;
    for (const r of table.rows || []) {
      const studentId = r.studentId;
      const studentDrafts = drafts[studentId] || {};
      for (const col of table.columns || []) {
        const raw = (studentDrafts[col.id] ?? "").toString().trim();
        if (raw === "") continue;
        const num = parseFloat(raw.replace(/,/g, "."));
        if (Number.isNaN(num)) continue;
        upsertCAValue(table.subject, table.classLevel, table.term, studentId, col.id, Math.round(num * 10) / 10);
        count++;
      }
    }
    // refresh table
    const t = getCATableFor(subject, classLevel, term);
    setTable(t);
    toast.success(`Saved ${count} marks.`);
  }

  const exportWorkbook = () => {
    if (!table) return toast.error("Load a subject and class first.");
    const rows = (table.rows || []).map((r: any) => {
      const student = students.find((s) => s.id === r.studentId);
      const out: Record<string, any> = { Name: student?.name ?? "", Registration: student?.registrationNumber ?? "" };
      for (const col of table.columns || []) out[col.name || col.id] = (r.values || {})[col.id] ?? "";
      return out;
    });
    if (!rows.length) return toast.error("No students to export.");
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CA");
    const blob = new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], {
      type: "application/octet-stream",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `continuous_assessment_${table.subject}_${table.classLevel}_${table.term}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success("Exported workbook.");
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !table) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
      if (!rows.length) return toast.error("No rows found in file.");

      // Map headers to columns. If header not present, create new column.
      const headers = Object.keys(rows[0]).filter((h) => h !== "Name" && h !== "Registration");
      const colMap: Record<string, string> = {};
      const updatedTable = { ...table };
      for (const hdr of headers) {
        let col = (updatedTable.columns || []).find((c: any) => c.name === hdr);
        if (!col) {
          const id = crypto.randomUUID();
          col = { id, name: hdr };
          updatedTable.columns = [...(updatedTable.columns || []), col];
        }
        colMap[hdr] = col.id;
      }

      for (const row of rows) {
        const name = row["Name"]?.toString().trim();
        if (!name) continue;
        const student = students.find((s) => s.name === name);
        if (!student) continue;
        const r = (updatedTable.rows || []).find((x: any) => x.studentId === student.id);
        if (!r) continue;
        for (const hdr of headers) {
          const colId = colMap[hdr];
          const raw = row[hdr]?.toString().trim();
          if (!raw) continue;
          const num = parseFloat(raw.replace(/,/g, "."));
          if (Number.isNaN(num)) continue;
          r.values = { ...(r.values || {}), [colId]: Math.round(num * 10) / 10 };
        }
      }

      upsertCATable(updatedTable);
      setTable(updatedTable);
      toast.success("Imported marks from file.");
    } catch (err) {
      toast.error("Could not parse file.");
    } finally {
      e.target.value = "";
    }
  };

  if (!students.length) {
    return (
      <Card className="p-10 text-center text-muted-foreground max-w-xl mx-auto">
        Enroll students first.
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="font-display text-3xl flex items-center gap-2">Continuous Assessment</h1>
        <p className="text-muted-foreground">Manage Activities of Integration and enter marks per student.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(320px,1fr)_minmax(0,3fr)]">
        <div className="sticky top-4 self-start space-y-4">
          <Card className="p-5 space-y-4">
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
              <Label>Subject</Label>
              <select
                className="w-full border rounded px-2 py-1 text-sm"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                title="Subject"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
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
              <Label>Search student</Label>
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name or registration number"
              />
            </div>

            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label htmlFor="new-ca-name">New Activity</Label>
                <Input
                  id="new-ca-name"
                  placeholder="Enter activity name"
                  value={newActivityName}
                  onChange={(e) => setNewActivityName(e.target.value)}
                />
              </div>
              <Button
                type="button"
                onClick={() => {
                  if (!newActivityName.trim()) return toast.error("Enter activity name.");
                  addColumn(newActivityName.trim());
                  setNewActivityName("");
                }}
              >
                Add Activity
              </Button>
            </div>

            <div className="flex gap-2 items-center">
              <Button type="button" onClick={saveAll}>
                <Save className="h-4 w-4 mr-1" /> Save All
              </Button>
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1" /> Import
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImportFile}
                className="hidden"
                aria-label="Import Continuous Assessment marks"
              />
              <Button type="button" variant="outline" onClick={exportWorkbook}>
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {!table ? (
            <Card className="p-6">Select a subject and class to load the assessment table.</Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary sticky top-0 z-20">
                  <tr>
                    <th className="p-3 text-left">Student</th>
                    <th className="p-3 text-left">Registration</th>
                    {(table.columns || []).map((col: any) => (
                      <th key={col.id} className="p-3 text-left">
                        <div className="flex items-center gap-2">
                          <span>{col.name}</span>
                          <button onClick={() => removeColumn(col.id)} title="Remove column"><Trash2 className="h-4 w-4 text-destructive" /></button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(table.rows || []).map((r: any) => {
                    const s = students.find((x) => x.id === r.studentId);
                    return (
                      <tr key={r.studentId} className="border-t hover:bg-accent/10">
                        <td className="p-3 font-medium">{s?.name}</td>
                        <td className="p-3">{s?.registrationNumber}</td>
                        {(table.columns || []).map((col: any) => (
                          <td key={col.id} className="p-2">
                            <Input
                              value={(drafts[r.studentId] && drafts[r.studentId][col.id]) ?? String((r.values || {})[col.id] ?? "")}
                              onChange={(e) => updateCell(r.studentId, col.id, e.target.value)}
                              type="number"
                              step="0.1"
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
