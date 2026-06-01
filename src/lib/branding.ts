import type { SchoolInfo } from './types';
import { getSchool, setSchool } from './storage';

const SCHOOL_BRANDING_KEYS: Array<keyof SchoolInfo> = [
  'name',
  'address',
  'email',
  'telephones',
  'poBox',
  'motto',
  'logoDataUrl',
  'signInBackgroundUrl',
  'primaryColor',
  'secondaryColor',
  'accentColor',
  'backgroundColor',
  'backgroundColorDark',
  'foregroundColor',
  'foregroundColorDark',
  'reportCardPageColor',
  'reportCardContentColor',
  'reportCardHeadingColor',
  'reportCardPageColorAdvanced',
  'reportCardContentColorAdvanced',
  'reportCardHeadingColorAdvanced',
  'reportCardColor',
  'reportCardWatermarkColored'
  ,'primaryForeground'
  ,'secondaryForeground'
  ,'mutedForeground'
  ,'accentForeground'
  ,'cardForeground'
  ,'popoverForeground'
  ,'sidebarForeground'
];

type BrandingSource = Record<string, unknown>;

function pickSchoolBranding(branding: BrandingSource): Partial<SchoolInfo> {
  const picked: Partial<SchoolInfo> = {};

  for (const key of SCHOOL_BRANDING_KEYS) {
    const value = branding[key];
    if (value !== undefined) {
      (picked as any)[key] = value;
    }
  }

  return picked;
}

async function loadBrandingFromElectron(): Promise<BrandingSource | null> {
  if (typeof window === 'undefined') return null;
  const electronAPI = (window as any).electronAPI;
  if (!electronAPI?.getAppInfo) return null;

  try {
    const branding = await electronAPI.getAppInfo();
    return branding ?? null;
  } catch {
    return null;
  }
}

async function loadBrandingFromPublicFile(): Promise<BrandingSource | null> {
  if (typeof window === 'undefined') return null;

  const candidates = ['branding-info.json', 'branded/branded.json'];

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { cache: 'no-store' });
      if (!response.ok) continue;
      const branding = await response.json();
      if (branding) return branding;
    } catch {
      continue;
    }
  }

  return null;
}

export async function loadBrandingIntoStorage() {
  if (typeof window === 'undefined') return;

  const branding = (await loadBrandingFromElectron()) ?? (await loadBrandingFromPublicFile());
  if (!branding) return;

  const schoolBranding = pickSchoolBranding(branding);
  if (Object.keys(schoolBranding).length === 0) return;

  const existingSchool = getSchool();
  setSchool({ ...existingSchool, ...schoolBranding });
}
