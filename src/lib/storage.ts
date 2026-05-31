// Tiny localStorage-backed store. Offline-first as requested.
import {
  ALL_CLASSES,
  COMPULSORY_SUBJECTS,
  OPTIONAL_SUBJECTS,
  ADVANCED_SUBJECTS,
  ADVANCED_SPECIAL_SUBJECTS,
  type AuthInfo,
  type ClassLevel,
  type Mark,
  type ProjectWork,
  type SchoolInfo,
  type Student,
  type Subject,
  type GradeScale,
  type Combination,
  defaultOrdinaryScale,
  defaultAdvancedScale,
} from "./types";

const NS = "light_rms:";
const K = {
  school: NS + "school",
  auth: NS + "auth",
  students: NS + "students",
  ordinarySubjects: NS + "ordinarySubjects",
  advancedSubjects: NS + "advancedSubjects",
  combinations: NS + "combinations",
  marks: NS + "marks",
  projects: NS + "projects",
  initialized: NS + "init",
  adminPassword: NS + "adminPassword",
  theme: NS + "theme",
  paperGradingConfig: NS + "paperGradingConfig",
  paperGradingTarget: NS + "paperGradingTarget",
  continuousAssessments: NS + "continuousAssessments",
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
  window.dispatchEvent(new CustomEvent("light-storage-change", { detail: { key } }));
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

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function defaultCombinations(): Combination[] {
  return [
    {
      id: "PCM",
      name: "Physics, Chemistry, Mathematics",
      shortForm: "PCM",
      subjects: ["Physics", "Chemistry", "Mathematics"],
    },
    {
      id: "PCB",
      name: "Physics, Chemistry, Biology",
      shortForm: "PCB",
      subjects: ["Physics", "Chemistry", "Biology"],
    },
    {
      id: "PCM/ICT",
      name: "Physics, Chemistry, Mathematics / Subsidiary ICT",
      shortForm: "PCM/ICT",
      subjects: ["Physics", "Chemistry", "Mathematics", "SubsidiaryICT"],
    },
    {
      id: "PCB/ICT",
      name: "Physics, Chemistry, Biology / Subsidiary ICT",
      shortForm: "PCB/ICT",
      subjects: ["Physics", "Chemistry", "Biology", "SubsidiaryICT"],
    },
    {
      id: "MEG",
      name: "Mathematics, Economics, Geography",
      shortForm: "MEG",
      subjects: ["Mathematics", "Economics", "Geography"],
    },
    {
      id: "HEG",
      name: "History, Economics, Geography",
      shortForm: "HEG",
      subjects: ["History", "Economics", "Geography"],
    },
    {
      id: "MEG/ICT",
      name: "Mathematics, Economics, Geography / Subsidiary ICT",
      shortForm: "MEG/ICT",
      subjects: ["Mathematics", "Economics", "Geography", "SubsidiaryICT"],
    },
    {
      id: "HEG/ICT",
      name: "History, Economics, Geography / Subsidiary ICT",
      shortForm: "HEG/ICT",
      subjects: ["History", "Economics", "Geography", "SubsidiaryICT"],
    },
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
  backgroundImageUrlLight: undefined,
  backgroundImageUrlDark: undefined,
  useBackgroundImageLight: false,
  useBackgroundImageDark: false,
  reportCardPageColor: "#ffffff",
  reportCardContentColor: "#111111",
  reportCardHeadingColor: "#3c64ff",
  reportCardPageColorAdvanced: "#f8fafc",
  reportCardContentColorAdvanced: "#111111",
  reportCardHeadingColorAdvanced: "#dc2626",
  reportCardColor: "#3c64ff",
  reportCardWatermarkColored: true,
  reportCardHeadSignatureDataUrl: undefined,
  reportCardStampDataUrl: undefined,
  selectedExamSets: [],
  selectedExamSetsOrdinary: [],
  selectedExamSetsAdvanced: [],
  reportCardExamSetsOrdinary: [],
  reportCardExamSetsAdvanced: [],
  examSetWeights: {},
  classStreams: {},
  studentIdentificationPrefix: "",
  issueDate: "",
  gradingScales: {
    _default_ordinary: defaultOrdinaryScale(),
    _default_advanced: defaultAdvancedScale(),
  },
  subjectPapers: defaultSubjectPapers(),
};

function buildDefaultOrdinarySubjects(): Subject[] {
  const defaults: Subject[] = [];
  const add = (name: string, isOptional: boolean) => {
    const existing = defaults.find((s) => s.name === name);
    if (!existing) {
      defaults.push({ id: name, name, isOptional });
    }
  };

  COMPULSORY_SUBJECTS.forEach((n) => add(n, false));
  OPTIONAL_SUBJECTS.forEach((n) => add(n, true));

  return defaults;
}

function buildDefaultAdvancedSubjects(): Subject[] {
  const defaults: Subject[] = [];
  const add = (name: string, isOptional: boolean) => {
    const existing = defaults.find((s) => s.name === name);
    if (!existing) {
      defaults.push({ id: name, name, isOptional });
    }
  };

  ADVANCED_SUBJECTS.forEach((n) => add(n, false));
  ADVANCED_SPECIAL_SUBJECTS.forEach((n) => add(n, false)); // A-level: all subjects are compulsory

  return defaults;
}

export function ensureInitialized() {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(K.initialized)) return;

  write<SchoolInfo>(K.school, defaultSchool);
  write<Subject[]>(K.ordinarySubjects, buildDefaultOrdinarySubjects());
  write<Subject[]>(K.advancedSubjects, buildDefaultAdvancedSubjects());
  write<Student[]>(K.students, []);
  write<Mark[]>(K.marks, []);
  write<ProjectWork[]>(K.projects, []);
  write<Combination[]>(K.combinations, defaultCombinations());
  write<AuthInfo | null>(K.auth, { accessCode: "12345" });
  write<Record<string, import("./types").PaperGradingMode>>(K.paperGradingConfig, {});
  write<Record<string, string>>(K.paperGradingTarget, {});
  window.localStorage.setItem(K.initialized, "1");
}

// === School ===
export const getSchool = () => {
  const saved = read<Partial<SchoolInfo>>(K.school, {});
  return { ...defaultSchool, ...saved } as SchoolInfo;
};
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

export function getClassStreams(classLevel: ClassLevel) {
  const school = getSchool();
  return school.classStreams?.[classLevel] ?? [];
}

export function setClassStreams(classLevel: ClassLevel, streams: string[]) {
  const school = getSchool();
  const classStreams = { ...(school.classStreams ?? {}), [classLevel]: streams };
  setSchool({ ...school, classStreams });
}

export function addClassStream(classLevel: ClassLevel, stream: string) {
  const current = getClassStreams(classLevel);
  if (current.includes(stream)) return false;
  setClassStreams(classLevel, [...current, stream]);
  return true;
}

export function deleteClassStream(classLevel: ClassLevel, stream: string) {
  const school = getSchool();
  const classStreams = { ...(school.classStreams ?? {}) };
  classStreams[classLevel] = classStreams[classLevel]?.filter((s) => s !== stream) ?? [];
  setSchool({ ...school, classStreams });
}

// === Subjects (Separate Ordinary and Advanced) ===
// These merge saved subjects with defaults. Defaults are always available;
// admin can delete subjects and they stay deleted (not in the list).
export const getOrdinarySubjects = () => {
  const saved = read<Subject[]>(K.ordinarySubjects, []);
  const defaults = buildDefaultOrdinarySubjects();

  // Merge: start with defaults, then override/add from saved
  const merged = [...defaults];
  for (const subject of saved) {
    const idx = merged.findIndex((s) => s.name === subject.name);
    if (subject.deleted) {
      if (idx >= 0) {
        merged.splice(idx, 1);
      }
      continue;
    }
    if (idx >= 0) {
      merged[idx] = subject; // Override with saved version
    } else {
      merged.push(subject); // Add custom subjects
    }
  }

  return merged;
};

export const setOrdinarySubjects = (v: Subject[]) => write(K.ordinarySubjects, v);

export const getAdvancedSubjects = () => {
  const saved = read<Subject[]>(K.advancedSubjects, []);
  const defaults = buildDefaultAdvancedSubjects();

  // Merge: start with defaults, then override/add from saved
  const merged = [...defaults];
  for (const subject of saved) {
    const idx = merged.findIndex((s) => s.name === subject.name);
    if (subject.deleted) {
      if (idx >= 0) {
        merged.splice(idx, 1);
      }
      continue;
    }
    if (idx >= 0) {
      merged[idx] = subject; // Override with saved version
    } else {
      merged.push(subject); // Add custom subjects
    }
  }

  return merged;
};

export const setAdvancedSubjects = (v: Subject[]) => write(K.advancedSubjects, v);

export function addOrdinarySubject(s: Subject) {
  const all = getOrdinarySubjects();
  if (all.some((x) => x.name.toLowerCase() === s.name.toLowerCase())) return false;
  const saved = read<Subject[]>(K.ordinarySubjects, []);
  write(K.ordinarySubjects, [...saved, s]);
  return true;
}

export function deleteOrdinarySubject(id: string) {
  const saved = read<Subject[]>(K.ordinarySubjects, []);
  const defaults = buildDefaultOrdinarySubjects();
  const subject = saved.find((s) => s.id === id) ?? defaults.find((s) => s.id === id);
  const remaining = saved.filter((s) => s.id !== id);
  if (subject && defaults.some((d) => d.id === subject.id)) {
    remaining.push({ ...subject, deleted: true });
  }
  write(K.ordinarySubjects, remaining);
}

export function addAdvancedSubject(s: Subject) {
  const all = getAdvancedSubjects();
  if (all.some((x) => x.name.toLowerCase() === s.name.toLowerCase())) return false;
  const saved = read<Subject[]>(K.advancedSubjects, []);
  write(K.advancedSubjects, [...saved, s]);
  return true;
}

export function deleteAdvancedSubject(id: string) {
  const saved = read<Subject[]>(K.advancedSubjects, []);
  const defaults = buildDefaultAdvancedSubjects();
  const subject = saved.find((s) => s.id === id) ?? defaults.find((s) => s.id === id);
  const remaining = saved.filter((s) => s.id !== id);
  if (subject && defaults.some((d) => d.id === subject.id)) {
    remaining.push({ ...subject, deleted: true });
  }
  write(K.advancedSubjects, remaining);
}

// Backward compat: getSubjects returns both
export const getSubjects = () => [...getOrdinarySubjects(), ...getAdvancedSubjects()];
export const addSubject = (s: Subject) => false; // deprecated
export const deleteSubject = (id: string) => {}; // deprecated
export const setSubjects = (v: Subject[]) => {}; // deprecated

// === Paper Grading Configuration ===
export function getPaperGradingConfig(subject: string): "individual" | "pairs" | "all" {
  const configs = read<Record<string, "individual" | "pairs" | "all">>(K.paperGradingConfig, {});
  return configs[subject] ?? "individual"; // default: grade each paper separately
}

export function setPaperGradingConfig(subject: string, mode: "individual" | "pairs" | "all") {
  const configs = read<Record<string, "individual" | "pairs" | "all">>(K.paperGradingConfig, {});
  configs[subject] = mode;
  write(K.paperGradingConfig, configs);
}

export function getPaperGradingTarget(subject: string): string | null {
  const targets = read<Record<string, string>>(K.paperGradingTarget, {});
  return targets[subject] ?? null;
}

export function setPaperGradingTarget(subject: string, target: string) {
  const targets = read<Record<string, string>>(K.paperGradingTarget, {});
  targets[subject] = target;
  write(K.paperGradingTarget, targets);
}

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
  const normalizedMark = {
    ...m,
    score: typeof m.score === "number" ? roundToOneDecimal(m.score) : m.score,
  };
  const all = getMarks();
  const exactIndex = all.findIndex((x) => x.id === normalizedMark.id);
  if (exactIndex >= 0) {
    all[exactIndex] = m;
    setMarks([...all]);
    return;
  }

  // Preserve legacy marks by migrating old records into the new examSet-aware format.
  const legacyIndex = all.findIndex(
    (x) =>
      x.studentId === m.studentId &&
      x.term === m.term &&
      x.subject === m.subject &&
      x.paper === m.paper &&
      (x.examSet === undefined || x.examSet === "EOT") &&
      x.id === `${m.studentId}:${m.term}:${m.subject}:${m.paper}`,
  );
  if (legacyIndex >= 0) {
    all[legacyIndex] = m;
    setMarks([...all]);
    return;
  }

  all.push(m);
  setMarks([...all]);
}

// === Project Work ===
export const getProjects = () => read<ProjectWork[]>(K.projects, []);
export const setProjects = (v: ProjectWork[]) => write(K.projects, v);
export function upsertProject(p: ProjectWork) {
  const all = getProjects();
  const normalizedProject = {
    ...p,
    marks: roundToOneDecimal(p.marks),
  };
  const i = all.findIndex((x) => x.id === normalizedProject.id);
  if (i >= 0) all[i] = normalizedProject;
  else all.push(normalizedProject);
  setProjects([...all]);
}

// === Continuous Assessments (CA) ===
export const getCATables = () => read<any[]>(K.continuousAssessments, []);
export const setCATables = (v: any[]) => write(K.continuousAssessments, v);
export function upsertCATable(table: any) {
  const all = getCATables();
  const i = all.findIndex((x) => x.id === table.id);
  if (i >= 0) all[i] = table;
  else all.push(table);
  setCATables([...all]);
}

export function getCATableFor(subject: string, classLevel: string, term: string) {
  const all = getCATables();
  const found =
    all.find((t) => t.subject === subject && t.classLevel === classLevel && t.term === term) ||
    all.find((t) => t.subject === subject && t.classLevel === classLevel && !t.term);
  if (found) {
    if (!found.term) {
      found.term = term;
      upsertCATable(found);
    }
    return found;
  }

  // Create default table structure with students for the class and term
  const students = getStudents().filter((s) => s.classLevel === classLevel);
  const table = {
    id: `CA:${subject}:${classLevel}:${term}`,
    subject,
    classLevel,
    term,
    columns: [], // { id, name }
    rows: students.map((s) => ({ studentId: s.id, values: {} })),
    createdAt: Date.now(),
  };
  upsertCATable(table);
  return table;
}

export function upsertCAValue(subject: string, classLevel: string, term: string, studentId: string, columnId: string, value: number | string) {
  const table = getCATableFor(subject, classLevel, term);
  const rows = table.rows || [];
  const r = rows.find((x: any) => x.studentId === studentId);
  if (r) {
    r.values = { ...(r.values || {}), [columnId]: value };
  } else {
    rows.push({ studentId, values: { [columnId]: value } });
  }
  table.rows = rows;
  upsertCATable(table);
}

// === Admin Password ===
export const getAdminPassword = () => read<string | null>(K.adminPassword, null);
export const setAdminPassword = (v: string) => write(K.adminPassword, v);

// === Reset everything ===
export function factoryReset() {
  if (typeof window === "undefined") return;
  // Remove all known keys
  Object.values(K).forEach((k) => window.localStorage.removeItem(k));
  // Also remove any keys in localStorage that use our namespace prefix to ensure no leftover data
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(NS)) {
        window.localStorage.removeItem(key);
        i -= 1; // adjust index because length changed
      }
    }
  } catch {
    // ignore any errors iterating localStorage
  }

  // Clear caches (if any were created by the app)
  if (typeof caches !== "undefined" && caches && typeof caches.keys === "function") {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).catch(() => {});
  }

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
    window.addEventListener("light-storage-change", handler);
    window.addEventListener("storage", handler);
    handler();
    return () => {
      window.removeEventListener("light-storage-change", handler);
      window.removeEventListener("storage", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return v;
}

export const ALL_CLASSES_EXPORT = ALL_CLASSES;
