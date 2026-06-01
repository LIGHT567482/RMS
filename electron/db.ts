import { createRequire } from 'module';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

// better-sqlite3 is a native module — it must be loaded via require() and
// accessed from the unpacked asar directory in production.
const require = createRequire(import.meta.url);

let Database: typeof import('better-sqlite3');
if (app.isPackaged) {
  // In production, electron-builder unpacks native modules beside the asar
  const unpackedPath = path.join(
    process.resourcesPath,
    'app.asar.unpacked',
    'node_modules',
    'better-sqlite3'
  );
  Database = require(unpackedPath);
} else {
  Database = require('better-sqlite3');
}


const userDataPath = app.getPath('userData');
const dbDirectory = path.join(userDataPath, 'rms-data');
if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true });
}

const dbPath = path.join(dbDirectory, 'storage.sqlite');
const db = new Database(dbPath);

db.prepare(
  `CREATE TABLE IF NOT EXISTS storage (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updatedAt INTEGER NOT NULL
  )`,
).run();

export function getStorageValue(key: string): string | null {
  const row = db.prepare('SELECT value FROM storage WHERE key = ?').get(key) as { value: string } | undefined;
  return row ? row.value : null;
}

export function setStorageValue(key: string, value: string) {
  const now = Date.now();
  db.prepare(
    `INSERT INTO storage (key, value, updatedAt)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt`,
  ).run(key, value, now);
}

export function removeStorageValue(key: string) {
  db.prepare('DELETE FROM storage WHERE key = ?').run(key);
}

export function getStorageKeys(): string[] {
  return (db.prepare('SELECT key FROM storage').all() as { key: string }[]).map(row => row.key);
}

export function getStorageAll(): Array<{ key: string; value: string; updatedAt: number }> {
  return db.prepare('SELECT key, value, updatedAt FROM storage').all() as Array<{ key: string; value: string; updatedAt: number }>;
}
