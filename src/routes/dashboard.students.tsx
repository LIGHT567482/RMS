import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  useStore, getStudents, addStudent, updateStudent, deleteStudent, getSubjects,
} from "@/lib/storage";
import { 
  ALL_CLASSES, OPTIONAL_SUBJECTS, ORDINARY_LEVELS, ADVANCED_LEVELS, isAdvancedLevel, 
  ADVANCED_SUBJECTS, generateAdvancedCombination, displaySubjectName, 
  type ClassLevel, type Gender, type Student, COMPULSORY_SUBJECTS,
} from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Pencil, UserCircle2, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/students")({
  component: StudentsPage,
});

function StudentsPage() {
  const students = useStore(getStudents);
  const subjects = useStore(getSubjects);
  const [classFilter, setClassFilter] = useState<"All" | ClassLevel>("All");
  const [levelFilter, setLevelFilter] = useState<"All" | "Ordinary" | "Advanced">("All");
  const [genderFilter, setGenderFilter] = useState<"All" | Gender>("All");
  const [subjectFilter, setSubjectFilter] = useState<string>("All");
  const [combinationFilter, setCombinationFilter] = useState<string>("All");
  const [editing, setEditing] = useState<Student | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (classFilter === "All") {
      setLevelFilter("All");
    } else if (ORDINARY_LEVELS.includes(classFilter)) {
      setLevelFilter("Ordinary");
    } else if (ADVANCED_LEVELS.includes(classFilter)) {
      setLevelFilter("Advanced");
    }
  }, [classFilter]);

  // Get all unique subjects from enrolled subjects
  const allEnrolledSubjects = useMemo(() => {
    const subs = new Set<string>();
    students.forEach((s) => {
      s.enrolledSubjects?.forEach((sub) => subs.add(sub));
    });
    return Array.from(subs).sort();
  }, [students]);

  // Get all unique combinations
  const allCombinations = useMemo(() => {
    const combos = new Set<string>();
    students.forEach((s) => {
      let combo: string;
      if (ORDINARY_LEVELS.includes(s.classLevel)) {
        combo = s.optionalSubjects?.sort().join(', ') || 'No optionals';
      } else {
        combo = s.enrolledSubjects?.sort().join(', ') || 'Not set';
      }
      combos.add(combo);
    });
    return Array.from(combos).sort();
  }, [students]);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (classFilter !== "All" && s.classLevel !== classFilter) return false;
      if (levelFilter === "Ordinary" && !ORDINARY_LEVELS.includes(s.classLevel)) return false;
      if (levelFilter === "Advanced" && !ADVANCED_LEVELS.includes(s.classLevel)) return false;
      if (genderFilter !== "All" && s.gender !== genderFilter) return false;
      if (subjectFilter !== "All" && !s.enrolledSubjects?.includes(subjectFilter)) return false;
      if (combinationFilter !== "All") {
        const studentCombo = ORDINARY_LEVELS.includes(s.classLevel)
          ? (s.optionalSubjects?.sort().join(', ') || 'No optionals')
          : (s.enrolledSubjects?.sort().join(', ') || 'Not set');
        if (studentCombo !== combinationFilter) return false;
      }
      return true;
    });
  }, [students, classFilter, levelFilter, genderFilter, subjectFilter, combinationFilter]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl">Students</h1>
          <p className="text-muted-foreground">Enroll, edit, and manage student records. ({filtered.length})</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4 mr-1" /> New Student
            </Button>
          </DialogTrigger>
          <StudentDialog
            student={editing}
            onClose={() => { setOpen(false); setEditing(null); }}
          />
        </Dialog>
      </div>

      <div className="flex gap-2 items-end flex-wrap">
        <div className="min-w-32">
          <Label className="text-xs mb-2 block">Class</Label>
          <Select value={classFilter} onValueChange={(v) => setClassFilter(v as any)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All classes</SelectItem>
              {ALL_CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-32">
          <Label className="text-xs mb-2 block">Level</Label>
          <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as any)} disabled={classFilter !== "All"}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All levels</SelectItem>
              <SelectItem value="Ordinary">Ordinary Level</SelectItem>
              <SelectItem value="Advanced">Advanced Level</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-32">
          <Label className="text-xs mb-2 block">Gender</Label>
          <Select value={genderFilter} onValueChange={(v) => setGenderFilter(v as any)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-40">
          <Label className="text-xs mb-2 block">Subject Enrolled</Label>
          <Select value={subjectFilter} onValueChange={(v) => setSubjectFilter(v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              {allEnrolledSubjects.map((sub) => <SelectItem key={sub} value={sub}>{sub}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-32">
          <Label className="text-xs mb-2 block">Combination</Label>
          <Select value={combinationFilter} onValueChange={(v) => setCombinationFilter(v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              {allCombinations.map((combo) => <SelectItem key={combo} value={combo}>{combo}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
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

      {filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <UserCircle2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No students enrolled yet.</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <Card key={s.id} className="p-4 flex gap-3 items-start">
              {s.photoDataUrl ? (
                <img src={s.photoDataUrl} alt={s.name} className="h-14 w-14 rounded-full object-cover border" />
              ) : (
                <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                  <UserCircle2 className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.classLevel}</p>
                {s.optionalSubjects && s.optionalSubjects.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">Optionals: {s.optionalSubjects.join(", ")}</p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setEditing(s); setOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {s.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently removes the student and all their marks and project records.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => { deleteStudent(s.id); toast.success("Student deleted."); }}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground text-center">
        {subjects.length} subjects in catalog
      </p>
    </div>
  );
}

function StudentDialog({ student, onClose }: { student: Student | null; onClose: () => void }) {
  const subjects = useStore(getSubjects);
  const [name, setName] = useState(student?.name ?? "");
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
          (s) => !["GeneralPaper", "SubsidiaryICT", "SubsidiaryMath"].includes(s)
        ) ?? [])
      : []
  );

  useEffect(() => {
    setName(student?.name ?? "");
    setGender(student?.gender ?? "unspecified");
    setClassLevel(student?.classLevel ?? "");
    setLevel(student?.classLevel
      ? ORDINARY_LEVELS.includes(student.classLevel)
        ? "Ordinary"
        : "Advanced"
      : "");
    setPhoto(student?.photoDataUrl);
    setOptionals(student?.optionalSubjects ?? []);
    setSelectedAdvancedSubjects(
      student && ADVANCED_LEVELS.includes(student.classLevel as ClassLevel)
        ? (student.enrolledSubjects?.filter(
            (s) => !["GeneralPaper", "SubsidiaryICT", "SubsidiaryMath"].includes(s)
          ) ?? [])
        : []
    );
  }, [student]);

  const isOrdinary = classLevel !== "" && ORDINARY_LEVELS.includes(classLevel as ClassLevel);
  const isAdvanced = classLevel !== "" && ADVANCED_LEVELS.includes(classLevel as ClassLevel);
  const showOptionalSubjects = isOrdinary && classLevel !== "S.1";
  const showAdvancedSubjects = isAdvanced;

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
    if (showOptionalSubjects && optionals.length !== 2) return toast.error("Pick exactly 2 optional subjects for S.2–S.4.");
    if (showAdvancedSubjects && !advancedEnrollment) return toast.error("Select exactly 3 subjects for A-level.");

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

    if (student) {
      updateStudent(student.id, {
        name: name.trim(),
        classLevel,
        gender: genderValue,
        photoDataUrl: photo,
        optionalSubjects: showOptionalSubjects ? optionals : undefined,
        enrolledSubjects,
        enrollmentCombination: showAdvancedSubjects ? enrollmentCombination : undefined,
      });
      toast.success("Student updated.");
    } else {
      addStudent({
        id: crypto.randomUUID(),
        name: name.trim(),
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
    onClose();
  }

  return (
    <DialogContent className="max-w-lg max-h-screen overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{student ? "Edit Student" : "New Student"}</DialogTitle>
      </DialogHeader>
      <form id="student-form" onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
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
              <SelectTrigger><SelectValue placeholder="Choose level" /></SelectTrigger>
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
              <SelectTrigger><SelectValue placeholder={level ? "Choose class" : "Choose level first"} /></SelectTrigger>
              <SelectContent>
                {(level === "Ordinary" ? ORDINARY_LEVELS : ADVANCED_LEVELS).map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4">
          <Label>Gender</Label>
          <Select value={gender} onValueChange={(v) => setGender(v as Gender | "unspecified")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unspecified">Not specified</SelectItem>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showOptionalSubjects && (
          <div>
            <Label>Optional subjects (choose 2)</Label>
            <div className="grid grid-cols-2 gap-2 mt-2 p-3 border rounded-md">
              {OPTIONAL_SUBJECTS.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={optionals.includes(opt)} onCheckedChange={() => toggleOptional(opt)} />
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
                  <code className="bg-background px-2 py-1 rounded">{advancedEnrollment.combo}</code>
                </p>
                <p className="text-xs text-muted-foreground">
                  Subjects: {advancedEnrollment.enrolled.map(displaySubjectName).join(", ")}
                </p>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit"><Save className="h-4 w-4 mr-1" /> Save</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
