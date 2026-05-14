// Tiny localStorage-backed store. Offline-first as requested.
import {
  ALL_CLASSES, COMPULSORY_SUBJECTS, OPTIONAL_SUBJECTS, ADVANCED_SUBJECTS,
  type AuthInfo, type Mark, type ProjectWork, type SchoolInfo, type Student, type Subject, type GradeScale, type Combination,
  defaultOrdinaryScale, defaultAdvancedScale,
} from "./types";

const NS = "ample_high:";
const K = {
  school: NS + "school",
  auth: NS + "auth",
  students: NS + "students",
  subjects: NS + "subjects",
  combinations: NS + "combinations",
  marks: NS + "marks",
  projects: NS + "projects",
  initialized: NS + "init",
  adminPassword: NS + "adminPassword",
  theme: NS + "theme",
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("ample-storage-change", { detail: { key } }));
}

/** Default subject papers: key is "O:${subject}" for O-level or "A:${subject}" for A-level */
function defaultSubjectPapers(): Record<string, number> {
  const papers: Record<string, number> = {};
  // O-level defaults (typically 1 paper, but some have multiple)
  COMPULSORY_SUBJECTS.forEach((s) => (papers[`O:${s}`] = 1));
  OPTIONAL_SUBJECTS.forEach((s) => (papers[`O:${s}`] = 1));
  
  // A-level defaults
  papers["A:Physics"] = 3;
  papers["A:Chemistry"] = 2;
  papers["A:Mathematics"] = 2;
  papers["A:Biology"] = 2;
  papers["A:Geography"] = 2;
  papers["A:History"] = 2;
  papers["A:CRE"] = 2;
  papers["A:IRE"] = 2;
  papers["A:Entrepreneurship"] = 2;
  papers["A:Luganda"] = 2;
  papers["A:FineArt"] = 4;
  papers["A:TechnicalDrawing"] = 6;
  papers["A:GeneralPaper"] = 1;
  papers["A:SubsidiaryICT"] = 1;
  papers["A:SubsidiaryMath"] = 1;

  return papers;
}

function defaultCombinations(): Combination[] {
  return [
    { id: "PCM", name: "Physics, Chemistry, Mathematics", shortForm: "PCM", subjects: ["Physics", "Chemistry", "Mathematics"] },
    { id: "PCB", name: "Physics, Chemistry, Biology", shortForm: "PCB", subjects: ["Physics", "Chemistry", "Biology"] },
    { id: "PCM/ICT", name: "Physics, Chemistry, Mathematics / Subsidiary ICT", shortForm: "PCM/ICT", subjects: ["Physics", "Chemistry", "Mathematics", "SubsidiaryICT"] },
    { id: "PCB/ICT", name: "Physics, Chemistry, Biology / Subsidiary ICT", shortForm: "PCB/ICT", subjects: ["Physics", "Chemistry", "Biology", "SubsidiaryICT"] },
    { id: "MEG", name: "Mathematics, Economics, Geography", shortForm: "MEG", subjects: ["Mathematics", "Economics", "Geography"] },
    { id: "HEG", name: "History, Economics, Geography", shortForm: "HEG", subjects: ["History", "Economics", "Geography"] },
    { id: "MEG/ICT", name: "Mathematics, Economics, Geography / Subsidiary ICT", shortForm: "MEG/ICT", subjects: ["Mathematics", "Economics", "Geography", "SubsidiaryICT"] },
    { id: "HEG/ICT", name: "History, Economics, Geography / Subsidiary ICT", shortForm: "HEG/ICT", subjects: ["History", "Economics", "Geography", "SubsidiaryICT"] },
  ];
}

export const defaultSchool: SchoolInfo = {
  name: "",
  address: "",
  email: "",
  telephones: "",
  poBox: "",
  motto: "",
  logoDataUrl: undefined,
  signInBackgroundUrl: undefined,
  primaryColor: "#3c64ff",
  secondaryColor: "#eef2ff",
  accentColor: "#f59e0b",
  backgroundColor: "#f8fafc",
  backgroundColorDark: "#0f172a",
  foregroundColor: "#111111",
  foregroundColorDark: "#f8fafc",
  reportCardPageColor: "#ffffff",
  reportCardContentColor: "#111111",
  reportCardHeadingColor: "#3c64ff",
  reportCardPageColorAdvanced: "#f8fafc",
  reportCardContentColorAdvanced: "#111111",
  reportCardHeadingColorAdvanced: "#dc2626",
  reportCardColor: "#3c64ff",
  issueDate: new Date()
    .toLocaleDateString("en-GB")
    .replace(/-/g, "/"),
  gradingScales: {
    "_default_ordinary": defaultOrdinaryScale(),
    "_default_advanced": defaultAdvancedScale(),
  },
  subjectPapers: defaultSubjectPapers(),
};

export function ensureInitialized() {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(K.initialized)) return;

  write<SchoolInfo>(K.school, defaultSchool);
  const subjects: Subject[] = [
    ...COMPULSORY_SUBJECTS.map((n) => ({ id: n, name: n, isOptional: false })),
    ...OPTIONAL_SUBJECTS.map((n) => ({ id: n, name: n, isOptional: true })),
  ];
  write<Subject[]>(K.subjects, subjects);
  write<Student[]>(K.students, []);
  write<Mark[]>(K.marks, []);
  write<ProjectWork[]>(K.projects, []);
  write<Combination[]>(K.combinations, defaultCombinations());
  write<AuthInfo | null>(K.auth, null); // not yet set — first-time setup
  window.localStorage.setItem(K.initialized, "1");
}

// === School ===
export const getSchool = () => read<SchoolInfo>(K.school, defaultSchool);
export const setSchool = (s: SchoolInfo) => write(K.school, s);

// === Auth ===
export const getAuth = () => read<AuthInfo | null>(K.auth, null);
export const setAuth = (a: AuthInfo | null) => write(K.auth, a);

// === Theme ===
export const getTheme = () => read<"light" | "dark" | null>(K.theme, null);
export const setTheme = (value: "light" | "dark") => write(K.theme, value);

// === Students ===
export const getStudents = () => read<Student[]>(K.students, []);
export const setStudents = (v: Student[]) => write(K.students, v);
export function addStudent(s: Student) {
  const all = getStudents();
  setStudents([...all, s]);
}
export function updateStudent(id: string, patch: Partial<Student>) {
  setStudents(getStudents().map((s) => (s.id === id ? { ...s, ...patch } : s)));
}
export function deleteStudent(id: string) {
  setStudents(getStudents().filter((s) => s.id !== id));
  setMarks(getMarks().filter((m) => m.studentId !== id));
  setProjects(getProjects().filter((p) => p.studentId !== id));
}

// === Subjects ===
export const getSubjects = () => read<Subject[]>(K.subjects, []);
export const setSubjects = (v: Subject[]) => write(K.subjects, v);
export function addSubject(s: Subject) {
  const all = getSubjects();
  if (all.some((x) => x.name.toLowerCase() === s.name.toLowerCase())) return false;
  setSubjects([...all, s]);
  return true;
}
export function deleteSubject(id: string) {
  setSubjects(getSubjects().filter((s) => s.id !== id));
}

// === Combinations ===
export const getCombinations = () => read<Combination[]>(K.combinations, []);
export const setCombinations = (v: Combination[]) => write(K.combinations, v);
export function addCombination(c: Combination) {
  const all = getCombinations();
  if (all.some((x) => x.shortForm.toLowerCase() === c.shortForm.toLowerCase())) return false;
  setCombinations([...all, c]);
  return true;
}
export function deleteCombination(id: string) {
  setCombinations(getCombinations().filter((c) => c.id !== id));
}

// === Marks ===
export const getMarks = () => read<Mark[]>(K.marks, []);
export const setMarks = (v: Mark[]) => write(K.marks, v);
export function upsertMark(m: Mark) {
  const all = getMarks();
  const i = all.findIndex((x) => x.id === m.id);
  if (i >= 0) all[i] = m;
  else all.push(m);
  setMarks([...all]);
}

// === Project Work ===
export const getProjects = () => read<ProjectWork[]>(K.projects, []);
export const setProjects = (v: ProjectWork[]) => write(K.projects, v);
export function upsertProject(p: ProjectWork) {
  const all = getProjects();
  const i = all.findIndex((x) => x.id === p.id);
  if (i >= 0) all[i] = p;
  else all.push(p);
  setProjects([...all]);
}

// === Admin Password ===
export const getAdminPassword = () => read<string | null>(K.adminPassword, null);
export const setAdminPassword = (v: string) => write(K.adminPassword, v);

// === Reset everything ===
export function factoryReset() {
  if (typeof window === "undefined") return;
  Object.values(K).forEach((k) => window.localStorage.removeItem(k));
  ensureInitialized();
}

// === Grading Scales ===
export function getGradingScale(subject: string, classLevel?: string): GradeScale {
  const school = getSchool();
  const scales = school.gradingScales || {};
  
  // Try specific subject:class combination first
  if (classLevel) {
    const key = `${subject}:${classLevel}`;
    if (scales[key]) return scales[key];
  }
  
  // Fall back to subject-only scale
  if (scales[subject]) return scales[subject];
  
  // Fall back to default based on class level
  const isAdvanced = classLevel && (classLevel === "S.5" || classLevel === "S.6");
  return isAdvanced ? defaultAdvancedScale() : defaultOrdinaryScale();
}

export function setGradingScale(subject: string, scale: GradeScale, classLevel?: string) {
  const school = getSchool();
  const scales = school.gradingScales || {};
  const key = classLevel ? `${subject}:${classLevel}` : subject;
  scales[key] = scale;
  setSchool({ ...school, gradingScales: scales });
}

export function bulkUpdateGradingScales(updates: Record<string, GradeScale>) {
  const school = getSchool();
  const scales = school.gradingScales || {};
  Object.assign(scales, updates);
  setSchool({ ...school, gradingScales: scales });
}

// === Subject Papers ===
export function getSubjectPapers(subject: string, level: "O" | "A"): number {
  const school = getSchool();
  const papers = school.subjectPapers || defaultSubjectPapers();
  const key = `${level}:${subject}`;
  return papers[key] ?? 1; // Default to 1 if not found
}

export function setSubjectPapers(subject: string, level: "O" | "A", paperCount: number) {
  const school = getSchool();
  const papers = school.subjectPapers || defaultSubjectPapers();
  const key = `${level}:${subject}`;
  papers[key] = paperCount;
  setSchool({ ...school, subjectPapers: papers });
}

export function getAllSubjectPapers(): Record<string, number> {
  const school = getSchool();
  return school.subjectPapers || defaultSubjectPapers();
}

export function setAllSubjectPapers(papers: Record<string, number>) {
  const school = getSchool();
  setSchool({ ...school, subjectPapers: papers });
}

// === Reactive hook ===
import { useEffect, useState } from "react";
export function useStore<T>(getter: () => T): T {
  const [v, setV] = useState<T>(getter);
  useEffect(() => {
    const handler = () => setV(getter());
    window.addEventListener("ample-storage-change", handler);
    window.addEventListener("storage", handler);
    handler();
    return () => {
      window.removeEventListener("ample-storage-change", handler);
      window.removeEventListener("storage", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return v;
}

export const ALL_CLASSES_EXPORT = ALL_CLASSES;
