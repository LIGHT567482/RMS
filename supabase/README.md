# Local Supabase Setup

This repository is configured to use a local Supabase development environment and store schema/migration files locally.

## Local config

- `supabase/config.toml` enables local Supabase CLI configuration
- `supabase/schemas/schema.sql` is the local schema definition
- `supabase/migrations/000001_init.sql` contains the full offline schema
- `supabase/migrations/000002_populate_defaults.sql` seeds application defaults locally
- `supabase/seed.sql` contains local seed data for quick initialization
- `.env.example` contains local environment variable placeholders

## Usage

1. Install the Supabase CLI: https://supabase.com/docs/guides/cli
2. From the repo root, start the local Supabase stack:

   ```bash
   supabase start
   ```

3. Set local environment variables in `.env`:

   ```bash
   SUPABASE_URL="http://127.0.0.1:54321"
   VITE_SUPABASE_URL="http://127.0.0.1:54321"
   SUPABASE_PUBLISHABLE_KEY="<local anon key>"
   VITE_SUPABASE_PUBLISHABLE_KEY="<local anon key>"
   SUPABASE_SERVICE_ROLE_KEY="<local service role key>"
   ```

4. Apply schema and seeds locally:

   ```bash
   supabase db reset
   ```

5. When adding or changing tables, keep schema files in `supabase/schemas/` and migrations in `supabase/migrations/`.

## Backup and Recovery (Optional)

The app includes optional backup/recovery functionality:

- `supabase/migrations/000003_backup_recovery.sql` - Backup table for storing encrypted app data
- `src/lib/backup-recovery.ts` - Backup and restore logic
- `src/hooks/use-backup.tsx` - React hook for easy integration
- `src/components/backup-settings.tsx` - UI for manual backups

### When to Use Backups

- **Machine crashes or hard drive failure**: Restore your data from Supabase
- **Accidental data deletion**: Recover from last backup
- **Multi-device sync** (future): Keep data in sync across devices

### How to Enable Backups

1. Set up Supabase (local or cloud)
2. Run migrations: `supabase db reset`
3. In the app settings, go to "Backup & Recovery"
4. Click "Backup Now" to save data
5. Click "Restore from Backup" to recover

### API Example

```typescript
import { backupDataToSupabase, restoreDataFromSupabase } from '@/lib/backup-recovery';

// Manual backup
const result = await backupDataToSupabase();

// Manual restore
const restored = await restoreDataFromSupabase();
```

## Offline Independence

This app is designed to run 100% offline using localStorage:

- ✅ No internet required
- ✅ No external API calls
- ✅ No authentication required
- ✅ All data stored locally in browser

**Optional**: Supabase backups provide recovery only if desired, but are not required for daily operation.
