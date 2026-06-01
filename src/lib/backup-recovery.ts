/**
 * Backup and recovery module for syncing localStorage to Supabase.
 * 
 * This enables optional data recovery if the machine crashes.
 * - backupDataToSupabase(): Pushes all localStorage data to Supabase
 * - restoreDataFromSupabase(): Pulls data from Supabase to localStorage
 * 
 * The app runs offline-first using localStorage. Backup is optional.
 */

import { supabase } from "@/integrations/supabase/client";
import { storageGet, storageSet, storageKeys } from "./storage";

interface BackupRecord {
  id: string;
  key: string;
  value: string; // JSON stringified
  timestamp: number; // Unix timestamp
  version: number; // Backup version for conflict resolution
}

const BACKUP_TABLE = "app_backups";
const BACKUP_VERSION = 1;

/**
 * Get all localStorage keys that belong to the app (light_rms: namespace)
 */
function getAppStorageKeys(): string[] {
  if (typeof window === "undefined") return [];
  return storageKeys().filter((key) => key.startsWith("light_rms:"));
}

/**
 * Backup all localStorage data to Supabase
 * Overwrites previous backups for the same keys (timestamp-based upsert)
 */
export async function backupDataToSupabase(): Promise<{
  success: boolean;
  backedUpKeys: string[];
  error?: string;
}> {
  try {
    const keys = getAppStorageKeys();
    if (keys.length === 0) {
      return { success: true, backedUpKeys: [] };
    }

    const backupRecords: BackupRecord[] = keys.map((key) => {
      const value = storageGet(key) || "";
      return {
        id: `backup_${key}_${Date.now()}`,
        key,
        value,
        timestamp: Date.now(),
        version: BACKUP_VERSION,
      };
    });

    // Upsert: try to insert, on conflict update the record
    const { error } = await supabase
      .from(BACKUP_TABLE)
      .upsert(backupRecords, { onConflict: "key" });

    if (error) {
      console.error("Backup failed:", error);
      return { success: false, backedUpKeys: [], error: error.message };
    }

    console.log(`Backed up ${keys.length} localStorage keys to Supabase`);
    return { success: true, backedUpKeys: keys };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Backup error:", message);
    return { success: false, backedUpKeys: [], error: message };
  }
}

/**
 * Restore data from Supabase to localStorage
 * Only restores if Supabase data is newer than local data
 */
export async function restoreDataFromSupabase(): Promise<{
  success: boolean;
  restoredKeys: string[];
  error?: string;
}> {
  try {
    // Fetch all backup records from Supabase
    const { data, error } = await supabase.from(BACKUP_TABLE).select("*");

    if (error) {
      console.error("Restore failed:", error);
      return { success: false, restoredKeys: [], error: error.message };
    }

    if (!data || data.length === 0) {
      console.log("No backup data found in Supabase");
      return { success: true, restoredKeys: [] };
    }

    const restoredKeys: string[] = [];

    // Restore each record to localStorage if Supabase version is newer
    for (const record of data as BackupRecord[]) {
      try {
        const localValue = storageGet(record.key);
        const localTimestamp = localValue
          ? parseInt(storageGet(`${record.key}_timestamp`) || "0")
          : 0;

        // Restore if Supabase data is newer
        if (record.timestamp > localTimestamp) {
          storageSet(record.key, record.value);
          storageSet(`${record.key}_timestamp`, String(record.timestamp));
          restoredKeys.push(record.key);
        }
      } catch (err) {
        console.warn(`Failed to restore key ${record.key}:`, err);
      }
    }

    console.log(`Restored ${restoredKeys.length} keys from Supabase backup`);

    // Dispatch event so UI can react to data changes
    window.dispatchEvent(
      new CustomEvent("light-storage-restore", {
        detail: { restoredKeys },
      })
    );

    return { success: true, restoredKeys };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Restore error:", message);
    return { success: false, restoredKeys: [], error: message };
  }
}

/**
 * Bidirectional sync: backup local changes, then restore Supabase updates
 * Use this for periodic sync to keep data in sync across devices/sessions
 */
export async function syncDataWithSupabase(): Promise<{
  success: boolean;
  backedUp: string[];
  restored: string[];
  error?: string;
}> {
  try {
    // First, push local changes to Supabase
    const backupResult = await backupDataToSupabase();
    if (!backupResult.success) {
      return {
        success: false,
        backedUp: [],
        restored: [],
        error: backupResult.error || "Backup failed",
      };
    }

    // Then, pull any newer Supabase data
    const restoreResult = await restoreDataFromSupabase();
    if (!restoreResult.success) {
      return {
        success: false,
        backedUp: backupResult.backedUpKeys,
        restored: [],
        error: restoreResult.error || "Restore failed",
      };
    }

    return {
      success: true,
      backedUp: backupResult.backedUpKeys,
      restored: restoreResult.restoredKeys,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      success: false,
      backedUp: [],
      restored: [],
      error: message,
    };
  }
}

/**
 * Get backup status — shows if local data is in sync with Supabase
 */
export async function getBackupStatus(): Promise<{
  lastBackupTime?: number;
  lastRestoreTime?: number;
  keysInBackup: number;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from(BACKUP_TABLE)
      .select("timestamp")
      .order("timestamp", { ascending: false })
      .limit(1);

    if (error) {
      return { keysInBackup: 0, error: error.message };
    }

    const lastBackup = data && data.length > 0 ? data[0].timestamp : undefined;
    const { count } = await supabase.from(BACKUP_TABLE).select("*", { count: "exact" });

    return {
      lastBackupTime: lastBackup,
      keysInBackup: count || 0,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { keysInBackup: 0, error: message };
  }
}

/**
 * Clear all backup records from Supabase
 * Use with caution — this deletes recovery data
 */
export async function clearBackupData(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase.from(BACKUP_TABLE).delete().neq("id", "");

    if (error) {
      return { success: false, error: error.message };
    }

    console.log("Backup data cleared from Supabase");
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}
