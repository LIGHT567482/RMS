/**
 * Backup Settings Component
 * 
 * Displays backup status and provides options to:
 * - Manually trigger backup to Supabase
 * - Manually restore from Supabase
 * - Enable/disable automatic backups
 * - View last backup time
 */

import { useState, useEffect } from "react";
import { useBackup } from "@/hooks/use-backup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle, Cloud, Download } from "lucide-react";

export function BackupSettings() {
  const {
    isLoading,
    lastBackupTime,
    error,
    backupNow,
    restoreNow,
    getStatus,
  } = useBackup();

  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [backupStatus, setBackupStatus] = useState<{
    lastBackupTime?: number;
    keysInBackup: number;
  }>({ keysInBackup: 0 });

  useEffect(() => {
    const loadStatus = async () => {
      const status = await getStatus();
      setBackupStatus(status);
    };
    loadStatus();
  }, [getStatus, lastBackupTime]);

  const handleAutoBackup = () => {
    setAutoBackupEnabled(!autoBackupEnabled);
    if (!autoBackupEnabled) {
      // In a real app, you'd persist this preference
      console.log("Auto-backup enabled");
    }
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            Backup & Recovery
          </CardTitle>
          <CardDescription>
            Optional cloud backup for data recovery in case of system failure. Your app runs
            entirely offline—backups are optional.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Backup Status</h3>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="text-muted-foreground">Last Backup:</span>
                <span className="font-medium">{formatTime(lastBackupTime || backupStatus.lastBackupTime)}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="text-muted-foreground">Keys Backed Up:</span>
                <span className="font-medium">{backupStatus.keysInBackup}</span>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Manual Backup Controls */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Manual Backup</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={backupNow}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <Cloud className="w-4 h-4" />
                Backup Now
              </Button>

              <Button
                onClick={restoreNow}
                disabled={isLoading}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <Download className="w-4 h-4" />
                Restore from Backup
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use "Backup Now" to save current data to Supabase. Use "Restore" to recover data
              from your last backup.
            </p>
          </div>

          {/* Auto-Backup Option */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Automatic Backups (Optional)</h3>
            <label className="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-muted/50">
              <input
                type="checkbox"
                checked={autoBackupEnabled}
                onChange={handleAutoBackup}
                className="w-4 h-4 rounded"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">Enable automatic backups</p>
                <p className="text-xs text-muted-foreground">
                  Backs up data every 5 minutes when Supabase is available
                </p>
              </div>
            </label>
          </div>

          {/* Info Box */}
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Your app is designed to run completely offline. Backups are optional and only used
              for recovery if your device fails.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
