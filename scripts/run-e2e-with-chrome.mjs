import { existsSync } from 'fs';
import { spawn } from 'child_process';
import { resolve } from 'path';

const root = resolve('.');
const candidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Chromium/Application/chrome.exe',
];
const chrome = candidates.find((p) => existsSync(p));
if (chrome) {
  console.log('FOUND:' + chrome);
  const child = spawn(process.execPath, [resolve(root, 'scripts', 'e2e-settings.mjs'), ...process.argv.slice(2)], {
    env: { ...process.env, CHROME_PATH: chrome },
    stdio: 'inherit',
  });
  child.on('exit', (code) => process.exit(code));
} else {
  console.log('NOTFOUND: no local Chrome detected');
  const child = spawn(process.execPath, [resolve(root, 'scripts', 'e2e-settings.mjs')], {
    env: process.env,
    stdio: 'inherit',
  });
  child.on('exit', (code) => process.exit(code));
}
