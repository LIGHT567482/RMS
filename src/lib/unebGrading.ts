export type PaperGrade = 'D' | 'C' | 'P' | 'F';
export type FinalGrade = 'A'|'B'|'C'|'D'|'E'|'O'|'F';

export interface UNEBResult {
  finalGrade: FinalGrade;
  descriptor: string;
  logicRoute: string;
  evaluationLog: string;
}

function mapToPaperGrade(mark: number): PaperGrade {
  if (mark >= 75) return 'D';
  if (mark >= 50) return 'C';
  if (mark >= 35) return 'P';
  return 'F';
}

function descriptorForFinal(g: FinalGrade): string {
  switch (g) {
    case 'A': return 'Exceptional';
    case 'B': return 'Outstanding';
    case 'C': return 'Satisfactory';
    case 'D': return 'Basic';
    case 'E': return 'Elementary';
    case 'O': return 'Subsidiary Pass';
    default: return 'Fail';
  }
}

// Determine principal grade from array of paper grades (none are 'F')
function principalFromGrades(papers: PaperGrade[]): FinalGrade | null {
  // Count distinctions and credits/passes
  const counts = {
    D: papers.filter(p=>p==='D').length,
    C: papers.filter(p=>p==='C').length,
    P: papers.filter(p=>p==='P').length,
  };

  // For subjects with two papers (common A-level): use strict combos
  // A: at worst one C
  if (papers.length >= 2) {
    // If any P present, cannot be A/B/C depending on severity
    if (counts.P === 0) {
      // A: at most one C
      if (counts.C <= 1 && counts.D >= (papers.length - counts.C)) return 'A';
      // B: at most two Cs
      if (counts.C <= 2) return 'B';
      // C: allow up to three Cs
      if (counts.C <= 3) return 'C';
    }
    // D: at worst a C6 in one paper with higher in others -> interpret as some P allowed
    if (counts.P <= 1) return 'D';
    // E: at worst a P in one paper with credits or better in remaining
    if (counts.P === 1 && counts.C + counts.D >= (papers.length - 1)) return 'E';
  }

  return null;
}

export function unebGrade(paperMarks: number[], dos_override?: string | null): UNEBResult {
  // STEP 1: D.O.S. override
  if (dos_override && typeof dos_override === 'string' && dos_override.trim().length > 0) {
    const g = dos_override.trim().toUpperCase();
    const allowed: FinalGrade[] = ['A','B','C','D','E','O','F'];
    if ((allowed as string[]).includes(g)) {
      return {
        finalGrade: g as FinalGrade,
        descriptor: descriptorForFinal(g as FinalGrade),
        logicRoute: 'D.O.S. Administrative Override',
        evaluationLog: `D.O.S. provided explicit grade ${g}; override applied.`
      };
    }
  }

  // STEP 2: Map raw marks to paper grades
  const paperGrades = paperMarks.map(m=>mapToPaperGrade(m));

  // STEP 3: Check for any fails (F)
  if (paperGrades.includes('F')) {
    // Paper balance broken
    const nonFails = paperGrades.filter(p=>p!=='F');
    let final: FinalGrade = 'F';
    if (nonFails.length > 0) {
      // If remaining paper is C or D -> Subsidiary O
      if (nonFails.some(p=>p==='C' || p==='D')) final = 'O';
      else final = 'F';
    }
    return {
      finalGrade: final,
      descriptor: descriptorForFinal(final),
      logicRoute: 'UNEB Balanced Paper Logic',
      evaluationLog: `One or more papers graded F9; paper balance broken. Remaining papers: ${nonFails.join(', ')} => awarded ${final}.`
    };
  }

  // STEP 4: Principal grade combinations
  const principal = principalFromGrades(paperGrades);
  if (principal) {
    return {
      finalGrade: principal,
      descriptor: descriptorForFinal(principal),
      logicRoute: 'UNEB Balanced Paper Logic',
      evaluationLog: `No F9s and papers graded ${paperGrades.join(', ')}; principal combination yields ${principal}.`
    };
  }

  // Fallback: if no principal matches, decide based on best effort
  const pCount = paperGrades.filter(p=>p==='P').length;
  const cCount = paperGrades.filter(p=>p==='C').length;
  let fallback: FinalGrade = 'F';
  if (pCount === 0 && cCount >= 1) fallback = 'D';
  else if (pCount === 1 && cCount >= (paperGrades.length - 1)) fallback = 'E';

  return {
    finalGrade: fallback,
    descriptor: descriptorForFinal(fallback),
    logicRoute: 'UNEB Balanced Paper Logic',
    evaluationLog: `No F9s and papers graded ${paperGrades.join(', ')}; applied fallback rule => ${fallback}.`
  };
}

export const A_LEVEL_SCALE = [
  { band: '80-100', grade: 'D1' },
  { band: '75-79', grade: 'D2' },
  { band: '70-74', grade: 'C3' },
  { band: '65-69', grade: 'C4' },
  { band: '60-64', grade: 'C5' },
  { band: '55-59', grade: 'C6' },
  { band: '50-54', grade: 'P7' },
  { band: '35-49', grade: 'P8' },
  { band: '0-34', grade: 'F9' },
];

export const O_LEVEL_SCALE = [
  { band: '80-100', grade: 'Distinction' },
  { band: '60-79', grade: 'Credit' },
  { band: '40-59', grade: 'Pass' },
  { band: '0-39', grade: 'Fail' },
];
