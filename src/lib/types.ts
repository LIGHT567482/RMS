export type ClassLevel = "S.1" | "S.2" | "S.3" | "S.4" | "S.5" | "S.6";
export type Term = "Term 1" | "Term 2" | "Term 3";
export type Gender = "Male" | "Female";

export const ORDINARY_LEVELS: ClassLevel[] = ["S.1", "S.2", "S.3", "S.4"];
export const ADVANCED_LEVELS: ClassLevel[] = ["S.5", "S.6"];
export const ALL_CLASSES: ClassLevel[] = [...ORDINARY_LEVELS, ...ADVANCED_LEVELS];
export const ALL_TERMS: Term[] = ["Term 1", "Term 2", "Term 3"];

export function isAdvancedLevel(level: ClassLevel) {
  return ADVANCED_LEVELS.includes(level);
}

export const COMPULSORY_SUBJECTS = [
  "English", "Mathematics", "Physics", "Chemistry", "Geography", "History", "Biology",
];
export const OPTIONAL_SUBJECTS = [
  "Computer", "CRE", "IRE", "FineArt", "Entrepreneurship", "Luganda",
];
export const DEFAULT_SUBJECTS = [...COMPULSORY_SUBJECTS, ...OPTIONAL_SUBJECTS];

// A-Level subjects (excluding English and Computer which become G.P and Sub-ICT)
export const ADVANCED_SUBJECTS = [
  "Physics", "Chemistry", "Mathematics", "Biology", "Geography", "History", 
  "CRE", "IRE", "Entrepreneurship", "Luganda", "FineArt", "TechnicalDrawing",
];
export const ADVANCED_SUBSIDIARY_SUBJECTS = [
  "SubsidiaryICT", "SubsidiaryMath",
];
// General Paper is always included, so we don't list it here

export interface Student {
  id: string;
  name: string;
  classLevel: ClassLevel;
  gender?: Gender;
  photoDataUrl?: string;
  /** For S.2-S.4: subject names selected as their 2 optionals */
  optionalSubjects?: string[];
  /** All subjects the student is enrolled in (based on marks entered) */
  enrolledSubjects?: string[];
  /** For A-level: the combination code (e.g., "PCM\ICT", "MEG\ICT") */
  enrollmentCombination?: string;
  createdAt: number;
}

export interface Subject {
  id: string;
  name: string;
  isOptional: boolean;
}

export interface Mark {
  id: string;            // `${studentId}:${term}:${subject}:${paper}`
  studentId: string;
  term: Term;
  subject: string;
  paper: number;
  score?: number;        // 0-100, paper mark
  ca?: number;           // legacy support for old storage data
  exam?: number;         // legacy support for old storage data
}

export interface ProjectWork {
  id: string;            // `${studentId}:${term}`
  studentId: string;
  term: Term;
  marks: number;         // 0-100
}

export interface SchoolInfo {
  name: string;
  address: string;
  email: string;
  telephones: string;
  poBox: string;
  motto: string;
  logoDataUrl?: string;
  signInBackgroundUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  backgroundColorDark?: string;
  foregroundColor?: string;
  foregroundColorDark?: string;
  reportCardPageColor?: string;
  reportCardContentColor?: string;
  reportCardHeadingColor?: string;
  reportCardPageColorAdvanced?: string;
  reportCardContentColorAdvanced?: string;
  reportCardHeadingColorAdvanced?: string;
  reportCardColor?: string;
  issueDate: string;     // DD/MM/YYYY
  bursarFeesNextTerm?: string;
  bursarDebt?: string;
  /** Grading scales per subject/class: key is "${subject}" or "${subject}:${classLevel}" */
  gradingScales?: Record<string, GradeScale>;
  /** Number of papers per subject for O-level and A-level: key is "O:${subject}" or "A:${subject}" */
  subjectPapers?: Record<string, number>;
}

export interface GradeScale {
  /** For Ordinary Level */
  ordinaA: number;      // >= this is A
  ordinaB: number;      // >= this is B
  ordinaC: number;      // >= this is C
  ordinaD: number;      // >= this is D
  /** For Advanced Level */
  advancedA: number;    // >= this is A
  advancedB: number;    // >= this is B
  advancedC: number;    // >= this is C
  advancedD: number;    // >= this is D
  advancedE: number;    // >= this is E
  advancedO: number;    // >= this is O
  // Anything below advancedO is F
}

export interface AuthInfo {
  accessCode: string;          // 5-10 digits
  recoveryEmail?: string;
  recoveryPassword?: string;   // for verification
  securityQuestion?: string;
  securityAnswer?: string;
}

export interface GradeInfo {
  grade: "A" | "B" | "C" | "D" | "E" | "O" | "F";
  comment: string;
  points?: number; // For Advanced Level point system
}

/** Get default grading scale for Ordinary Level (S.1-S.4) */
export function defaultOrdinaryScale(): GradeScale {
  return {
    ordinaA: 84, ordinaB: 70, ordinaC: 50, ordinaD: 36,
    advancedA: 0, advancedB: 0, advancedC: 0, advancedD: 0, advancedE: 0, advancedO: 0, // unused
  };
}

/** Get default grading scale for Advanced Level (S.5-S.6) */
export function defaultAdvancedScale(): GradeScale {
  return {
    ordinaA: 0, ordinaB: 0, ordinaC: 0, ordinaD: 0, // unused
    advancedA: 80, advancedB: 70, advancedC: 60, advancedD: 45, advancedE: 35, advancedO: 25,
  };
}

export function gradeFor(total: number, scale?: GradeScale, isAdvanced?: boolean): GradeInfo {
  const s = scale || (isAdvanced ? defaultAdvancedScale() : defaultOrdinaryScale());
  
  if (isAdvanced) {
    if (total >= s.advancedA) return { grade: "A", comment: "Exceptional", points: 6 };
    if (total >= s.advancedB) return { grade: "B", comment: "Outstanding", points: 5 };
    if (total >= s.advancedC) return { grade: "C", comment: "Satisfactory", points: 4 };
    if (total >= s.advancedD) return { grade: "D", comment: "Basic", points: 3 };
    if (total >= s.advancedE) return { grade: "E", comment: "Elementary", points: 2 };
    if (total >= s.advancedO) return { grade: "O", comment: "Ordinary", points: 1 };
    return { grade: "F", comment: "Fail", points: 0 };
  } else {
    if (total >= s.ordinaA) return { grade: "A", comment: "Exceptional" };
    if (total >= s.ordinaB) return { grade: "B", comment: "Outstanding" };
    if (total >= s.ordinaC) return { grade: "C", comment: "Satisfactory" };
    if (total >= s.ordinaD) return { grade: "D", comment: "Basic" };
    return { grade: "E", comment: "Elementary" };
  }
}

export function subjectsForStudent(student: Student, allSubjects: Subject[]): Subject[] {
  if (student.classLevel === "S.1") return allSubjects;
  if (ORDINARY_LEVELS.includes(student.classLevel)) {
    const compulsory = allSubjects.filter((s) => !s.isOptional);
    const chosen = (student.optionalSubjects ?? []).slice(0, 2);
    const opts = allSubjects.filter((s) => s.isOptional && chosen.includes(s.name));
    return [...compulsory, ...opts];
  }
  if (ADVANCED_LEVELS.includes(student.classLevel)) {
    const enrolled = new Set(student.enrolledSubjects ?? []);
    return allSubjects.filter((s) => enrolled.has(s.name));
  }
  return [];
}

/** Generate A-level enrollment combination from selected subjects */
export function generateAdvancedCombination(mainSubjects: string[]): { combo: string; enrolled: string[] } {
  // mainSubjects should be exactly 3 main subjects
  if (mainSubjects.length !== 3) {
    return { combo: "", enrolled: [] };
  }

  const hasmath = mainSubjects.some((s) => s.toLowerCase() === "mathematics");
  const subsidiary = hasmath ? "SubsidiaryICT" : "SubsidiaryMath";
  const enrolled = [...mainSubjects, "GeneralPaper", subsidiary];

  // Generate combo code: first letters of main subjects + \subsidiary abbreviation
  const mainLetters = mainSubjects
    .map((s) => s.charAt(0).toUpperCase())
    .join("");
  const subAbbr = hasmath ? "ICT" : "S.M";
  const combo = `${mainLetters}\\${subAbbr}`;

  return { combo, enrolled };
}

/** Map internal subject names to display names */
export function displaySubjectName(name: string): string {
  const map: Record<string, string> = {
    SubsidiaryICT: "Subsidiary ICT",
    SubsidiaryMath: "Subsidiary Math",
    GeneralPaper: "General Paper",
    TechnicalDrawing: "Technical Drawing",
    FineArt: "Fine Art",
  };
  return map[name] || name;
}
