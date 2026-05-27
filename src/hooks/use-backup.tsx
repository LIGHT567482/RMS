/**
 * Hook for managing backups in the app.
 * 
 * Usage:
 * - useBackup() returns backup functions and status
 * - Call backupNow() to manually trigger a backup
 * - Call syncNow() to sync both directions
 * - useEffect(() => { setupAutoBackup() }, []) for periodic backups
 */

import { useState, useCallback, useEffect } from "react";
import {
  backupDataToSupabase,
  restoreDataFromSupabase,
  syncDataWithSupabase,
  getBackupStatus,
} from "@/lib/backup-recovery";

interface UseBackupState {
  isLoading: boolean;
  lastBackupTime?: number;
  lastSyncTime?: number;
  error?: string;
}

export function useBackup() {
  const [state, setState] = useState<UseBackupState>({
    isLoading: false,
  });

  const backupNow = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: undefined }));
    try {
      const result = await backupDataToSupabase();
      if (result.success) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          lastBackupTime: Date.now(),
        }));
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: result.error,
        }));
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Backup failed",
      }));
    }
  }, []);

  const restoreNow = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: undefined }));
    try {
      const result = await restoreDataFromSupabase();
      if (result.success) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          lastSyncTime: Date.now(),
        }));
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: result.error,
        }));
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Restore failed",
      }));
    }
  }, []);

  const syncNow = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: undefined }));
    try {
      const result = await syncDataWithSupabase();
      if (result.success) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          lastSyncTime: Date.now(),
          lastBackupTime: Date.now(),
        }));
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: result.error,
        }));
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Sync failed",
      }));
    }
  }, []);

  const getStatus = useCallback(async () => {
    try {
      const status = await getBackupStatus();
      return status;
    } catch (err) {
      console.error("Failed to get backup status:", err);
      return { keysInBackup: 0, error: "Failed to fetch status" };
    }
  }, []);

  // Setup automatic backup every 5 minutes (optional)
  const setupAutoBackup = useCallback(
    (intervalMinutes: number = 5) => {
      const interval = setInterval(() => {
        backupNow();
      }, intervalMinutes * 60 * 1000);

      return () => clearInterval(interval);
    },
    [backupNow]
  );

  return {
    ...state,
    backupNow,
    restoreNow,
    syncNow,
    getStatus,
    setupAutoBackup,
  };
}
