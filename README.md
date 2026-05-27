# RMS - Report Management System

A fully offline-first React application for managing student reports, marks, and school data.

## Features

✅ **Offline-First**: Runs 100% locally using browser localStorage  
✅ **No Dependencies**: No need for internet or external servers  
✅ **Optional Cloud Backup**: Safe data recovery if your device fails  
✅ **Modern UI**: Built with React, TailwindCSS, and shadcn/ui  
✅ **Type-Safe**: Full TypeScript support  

## Getting Started

### Prerequisites

- Node.js 18+
- npm or bun

### Installation

```bash
# Clone the repository
git clone <repo>
cd RMS-main

# Install dependencies
npm install
# or
bun install

# Set up environment variables
cp .env.example .env
```

### Development

```bash
# Start development server
npm run dev
```

## LIGHT DISTRIBUTOR

The branding system is separate from the RMS application. Use `light-distributor/index.html` to create school branding packages independently.

To build a branded RMS distribution from an exported branding file, run:

```bash
npm run package:branded -- light-distributor/branding.json
```

# Build for production
npm run build

# Preview production build
npm run preview
```

The app will open at `http://localhost:5173`

## Architecture

### Offline-First Data Storage

All app data is stored in the browser's localStorage:
- Students and marks
- School information
- Admin settings
- Subject configurations
- Report templates

This ensures the app works completely offline without any internet connection.

**File**: `src/lib/storage.ts`

### Optional Cloud Backup (Recovery)

If you want to add a backup mechanism for data recovery:

1. **Install Supabase CLI** (optional):
   ```bash
   npm install -g supabase
   ```

2. **Set up local Supabase** (optional):
   ```bash
   supabase start
   ```

3. **Enable backups in the app**:
   - Go to Settings → Backup & Recovery
   - Click "Backup Now" to save data to Supabase
   - Click "Restore from Backup" to recover if needed

**Files**:
- `src/lib/backup-recovery.ts` - Backup/restore logic
- `src/hooks/use-backup.tsx` - React hook for backups
- `src/components/backup-settings.tsx` - UI component
- `supabase/` - Local database schema and migrations

## Project Structure

```
src/
├── components/        # React components
│   ├── ui/           # shadcn/ui components
│   └── backup-settings.tsx  # Backup UI
├── hooks/            # Custom React hooks
│   └── use-backup.tsx       # Backup hook
├── lib/              # Utilities
│   ├── storage.ts    # localStorage wrapper
│   ├── backup-recovery.ts   # Backup/restore logic
│   └── types.ts      # TypeScript types
├── routes/           # Page components
├── integrations/supabase/   # Supabase integration (optional)
└── styles/           # CSS

supabase/            # Database schema & migrations
├── migrations/       # SQL migration files
├── schemas/         # Table definitions
└── config.toml      # Local Supabase config
```

## Data Models

### Students
- ID, name, identification number
- Class level, stream, gender
- Optional and enrolled subjects
- Photo (base64)

### Marks
- Student ID, subject, term
- CA (continuous assessment), exam, score

### School Info
- Name, address, contact info
- Logo and branding colors
- Motto

### Subjects
- Name, whether optional/compulsory
- Paper configurations

## Environment Variables

```env
# Optional: Only needed if using Supabase backup
SUPABASE_URL="http://127.0.0.1:54321"
VITE_SUPABASE_URL="http://127.0.0.1:54321"
SUPABASE_PUBLISHABLE_KEY="<key>"
VITE_SUPABASE_PUBLISHABLE_KEY="<key>"
SUPABASE_SERVICE_ROLE_KEY="<key>"
```

The app works without these env vars — backups are entirely optional.

## Data Backup & Recovery

### How It Works

1. **Offline Mode** (Default): App runs entirely offline using localStorage
2. **Backup**: Optionally push localStorage to Supabase for safe storage
3. **Recovery**: If device fails, restore your data from the backup

### Manual Backup

```typescript
import { backupDataToSupabase, restoreDataFromSupabase } from '@/lib/backup-recovery';

// Backup all data to Supabase
const result = await backupDataToSupabase();

// Restore from Supabase to localStorage
const restored = await restoreDataFromSupabase();
```

### Using the Hook

```tsx
import { useBackup } from '@/hooks/use-backup';

export function MyComponent() {
  const { backupNow, restoreNow, isLoading, lastBackupTime } = useBackup();

  return (
    <>
      <button onClick={backupNow} disabled={isLoading}>
        Backup Now
      </button>
      <p>Last backup: {lastBackupTime ? new Date(lastBackupTime).toLocaleString() : 'Never'}</p>
    </>
  );
}
```

### Using the UI Component

```tsx
import { BackupSettings } from '@/components/backup-settings';

export function SettingsPage() {
  return (
    <div>
      <BackupSettings />
    </div>
  );
}
```

## Database Schema (Supabase)

If you use the backup feature, here are the core tables:

- **students** - Student records
- **marks** - Assessment scores
- **subjects** - Subject definitions
- **combinations** - Subject groupings (e.g., PCM, PCB)
- **school_info** - School settings
- **app_backups** - Backup records for recovery

See `supabase/migrations/` for full schema.

## Building for Production

```bash
npm run build
npm run preview
```

The app can be deployed as a static site (GitHub Pages, Vercel, Netlify, etc.) since it's purely client-side.

## Notes

- **No Backend Required**: The app is fully client-side
- **No Internet Needed**: Works completely offline
- **Optional Backup**: Supabase integration is only for recovery, not for daily operations
- **Data Privacy**: All data stays on your device (unless you explicitly backup)

## License

MIT
