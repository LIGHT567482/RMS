#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import Jimp from 'jimp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');
const distElectronDir = path.join(projectRoot, 'dist-electron');
const DEFAULT_MANUFACTURER = 'LIGHT TECHNOLOGIES';
const validTargets = new Set(['nsis', 'msi', 'portable']);

async function getPngBufferFromDataUrl(dataUrl) {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) return null;

  const mime = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  if (mime === 'image/png') return buffer;

  const image = await Jimp.read(buffer);
  return await image.getBufferAsync(Jimp.MIME_PNG);
}

function buildIcoFromPng(pngBuffer) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  entry.writeUInt8(0, 0); // width 0 = 256
  entry.writeUInt8(0, 1); // height 0 = 256
  entry.writeUInt8(0, 2); // color count
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bit count
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12);

  return Buffer.concat([header, entry, pngBuffer]);
}

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, title) {
  log(`\n[${step}] ${title}`, 'bright');
  log('─'.repeat(60), 'blue');
}

function getPackageManager() {
  const execPath = process.env.npm_execpath || '';
  if (execPath.includes('pnpm')) return 'pnpm';
  if (execPath.includes('yarn')) return 'yarn';
  return 'npm';
}

const packageManager = getPackageManager();

async function cleanPreviousBuilds() {
  logStep(0, 'Cleaning previous build artifacts');

  const cleanPaths = [
    distElectronDir,
    path.join(projectRoot, 'electron-build'),
    path.join(projectRoot, 'dist'),
    path.join(projectRoot, 'public', 'branding-info.json'),
    path.join(projectRoot, 'public', 'icon.png'),
    path.join(projectRoot, 'public', 'icon.ico')
  ];

  for (const targetPath of cleanPaths) {
    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, { recursive: true, force: true });
      log(`Removed ${path.relative(projectRoot, targetPath)}`, 'yellow');
    }
  }
}

async function readBrandingConfig() {
  try {
    const configPath = path.join(projectRoot, 'branded', 'branded.json');
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const branding = JSON.parse(configContent);
    return {
      ...branding,
      manufacturer: DEFAULT_MANUFACTURER
    };
  } catch (error) {
    log('⚠ Using default branding config', 'yellow');
    return {
      productName: 'RMS',
      name: 'RMS',
      primaryColor: '#000000',
      secondaryColor: '#ffffff',
      accentColor: '#000000',
      manufacturer: DEFAULT_MANUFACTURER
    };
  }
}

async function updateElectronBuilderConfig(branding) {
  logStep(1, 'Updating electron-builder configuration');

  const builderConfigPath = path.join(projectRoot, 'electron-builder.json');
  const config = JSON.parse(fs.readFileSync(builderConfigPath, 'utf-8'));

  config.productName = branding.productName || 'RMS';
  config.appId = `com.${String(branding.name || 'rms').toLowerCase().replace(/[^a-z0-9]/g, '')}.rms`;
  config.win = config.win || {};
  config.win.publisherName = DEFAULT_MANUFACTURER;
  config.win.sign = null;

  if (config.nsis) {
    config.nsis.shortcutName = branding.productName || 'RMS';
  }

  fs.writeFileSync(builderConfigPath, JSON.stringify(config, null, 2));
  log(`✓ Updated electron-builder.json with branding and manufacturer`, 'green');
}

async function generateBrandedAssets(branding) {
  logStep(2, 'Generating branded assets');

  const publicDir = path.join(projectRoot, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const assetInfoPath = path.join(publicDir, 'branding-info.json');
  fs.writeFileSync(assetInfoPath, JSON.stringify({
    ...branding,
    manufacturer: DEFAULT_MANUFACTURER,
    generatedAt: new Date().toISOString()
  }, null, 2));

  let extractedBrandedIcon = false;
  if (branding.logoDataUrl) {
    try {
      log('  - Extracting logo from branded.json...', 'blue');
      const pngPath = path.join(publicDir, 'icon.png');
      const icoPath = path.join(publicDir, 'icon.ico');

      const pngBuffer = await getPngBufferFromDataUrl(branding.logoDataUrl);
      if (pngBuffer) {
        fs.writeFileSync(pngPath, pngBuffer);
        log(`  ✓ Extracted and saved public/icon.png`, 'green');

        const icoBuffer = buildIcoFromPng(pngBuffer);
        fs.writeFileSync(icoPath, icoBuffer);
        log(`  ✓ Generated and saved public/icon.ico`, 'green');
        extractedBrandedIcon = true;
      }
    } catch (err) {
      log(`⚠ Error generating icons from branded.json: ${err.message}`, 'yellow');
    }
  }

  if (!extractedBrandedIcon) {
    log('⚠ Branding logoDataUrl missing or extraction failed. Falling back to copy from src-tauri/icons if available.', 'yellow');
    const sourceIconDir = path.join(projectRoot, 'src-tauri', 'icons');
    const iconSources = [
      { src: 'icon.png', dest: 'icon.png' },
      { src: 'icon.ico', dest: 'icon.ico' }
    ];

    for (const icon of iconSources) {
      const sourcePath = path.join(sourceIconDir, icon.src);
      const destPath = path.join(publicDir, icon.dest);

      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
        log(`  - Copied ${icon.src} to public/${icon.dest}`, 'green');
      } else {
        log(
          `⚠ Missing client logo file: ${sourcePath}. Add the new client's icon.png and icon.ico to src-tauri/icons before running this build.`,
          'red'
        );
      }
    }
  }

  log(`✓ Generated branding assets`, 'green');
  log(`  - Branding info saved to public/branding-info.json`, 'green');
}

async function buildFrontend() {
  logStep(3, 'Building frontend');

  try {
    log(`Running: ${packageManager} run build:electron-frontend`, 'blue');
    execSync(`${packageManager} run build:electron-frontend`, {
      cwd: projectRoot,
      stdio: 'inherit'
    });
    log(`✓ Frontend built successfully`, 'green');
  } catch (error) {
    log(`✗ Frontend build failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function buildElectronMain() {
  logStep(4, 'Compiling Electron main process');

  try {
    log(`Running: ${packageManager} run build:electron-main`, 'blue');
    execSync(`${packageManager} run build:electron-main`, {
      cwd: projectRoot,
      stdio: 'inherit'
    });
    log(`✓ Electron main process compiled`, 'green');
  } catch (error) {
    log(`✗ Electron main compilation failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

function getBuildTarget() {
  const arg = process.argv[2]?.toLowerCase();
  if (!arg || arg === 'all') {
    return null;
  }
  if (!validTargets.has(arg)) {
    log(`⚠ Unknown build target '${arg}', defaulting to all targets.`, 'yellow');
    return null;
  }
  return arg;
}

async function withTemporaryPackageConfig(callback) {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const originalPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const temporaryPackageJson = {
    ...originalPackageJson,
    main: 'electron-build/main.js',
    author: DEFAULT_MANUFACTURER
  };

  fs.writeFileSync(packageJsonPath, JSON.stringify(temporaryPackageJson, null, 2));

  try {
    await callback();
  } finally {
    fs.writeFileSync(packageJsonPath, JSON.stringify(originalPackageJson, null, 2));
  }
}

async function buildElectronApp(target) {
  logStep(5, 'Building Electron application');

  await withTemporaryPackageConfig(async () => {
    try {
      process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
      process.env.WIN_CSC_LINK = '';
      process.env.WIN_CSC_KEY_PASSWORD = '';

      const targetFlag = target ? `--win ${target}` : '--win';
      log(`Running: electron-builder ${targetFlag} --publish never`, 'blue');

      execSync(`electron-builder ${targetFlag} --publish never`, {
        cwd: projectRoot,
        stdio: 'inherit',
        env: {
          ...process.env,
          CSC_IDENTITY_AUTO_DISCOVERY: 'false',
          WIN_CSC_LINK: '',
          WIN_CSC_KEY_PASSWORD: '',
          CSC_FOR_PULL_REQUEST: 'true'
        }
      });

      log(`✓ Electron app built successfully`, 'green');
    } catch (error) {
      log(`✗ Electron build failed: ${error.message}`, 'red');
      process.exit(1);
    }
  });
}

async function displayResults(branding) {
  logStep(6, 'Build Complete');

  const outputDir = distElectronDir;
  const files = fs.existsSync(outputDir)
    ? fs.readdirSync(outputDir).filter(f => f.endsWith('.exe') || f.endsWith('.msi') || f.endsWith('-Setup.exe'))
    : [];

  log(`\n✓ Installers created for: ${branding.productName}`, 'green');
  log(`Manufacturer: ${branding.manufacturer}`, 'green');
  log(`\nOutput directory: ${outputDir}`, 'blue');

  if (files.length > 0) {
    log('\nGenerated installers:', 'bright');
    files.forEach(file => {
      const filePath = path.join(outputDir, file);
      const stats = fs.statSync(filePath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      log(`  • ${file} (${sizeMB} MB)`, 'green');
    });
  }

  log('\n' + '─'.repeat(60), 'blue');
  log('Next steps:', 'bright');
  log('  1. Test the installers', 'blue');
  log('  2. Sign the installers (if needed)', 'blue');
  log('  3. Distribute to users', 'blue');
  log('─'.repeat(60), 'blue');
}

async function launchSmokeTest() {
  logStep(7, 'Launching built application for smoke test');

  const outputDir = distElectronDir;
  const unpackedExe = path.join(outputDir, 'win-unpacked', `${getProductNameFromConfig()}.exe`);
  const installerFiles = fs.existsSync(outputDir)
    ? fs.readdirSync(outputDir).filter(f => f.match(/\.(msi|exe)$/i))
    : [];

  let launchPath = null;
  if (fs.existsSync(unpackedExe)) {
    launchPath = unpackedExe;
  } else if (installerFiles.length > 0) {
    const candidate = installerFiles.find(f => f.toLowerCase().endsWith('.msi')) || installerFiles[0];
    launchPath = path.join(outputDir, candidate);
  }

  if (!launchPath) {
    log('⚠ No built app or installer found to launch for smoke test.', 'yellow');
    return;
  }

  try {
    const safePath = launchPath.replace(/"/g, '\\"');
    execSync(`cmd.exe /c start "" "${safePath}"`, {
      cwd: projectRoot,
      stdio: 'ignore',
      shell: true
    });
    log(`✓ Launched smoke test target: ${launchPath}`, 'green');
  } catch (error) {
    log(`⚠ Failed to launch smoke test target: ${error.message}`, 'yellow');
  }
}

function getProductNameFromConfig() {
  const builderConfigPath = path.join(projectRoot, 'electron-builder.json');
  try {
    const config = JSON.parse(fs.readFileSync(builderConfigPath, 'utf-8'));
    return String(config.productName || 'RMS');
  } catch {
    return 'RMS';
  }
}

async function main() {
  try {
    log('\n╔════════════════════════════════════════════════════════════════════╗', 'bright');
    log('║       Electron Installer Builder with Branding             ║', 'bright');
    log('╚════════════════════════════════════════════════════════════════════╝', 'bright');

    const branding = await readBrandingConfig();
    log(`\nBranding: ${branding.productName}`, 'blue');
    log(`Organization: ${branding.name}`, 'blue');
    log(`Manufacturer: ${branding.manufacturer}`, 'blue');

    await cleanPreviousBuilds();
    await updateElectronBuilderConfig(branding);
    await generateBrandedAssets(branding);
    await buildFrontend();
    await buildElectronMain();
    const target = getBuildTarget();
    await buildElectronApp(target);
    await displayResults(branding);
    await launchSmokeTest();

    log(`\n✓ Build completed successfully!\n`, 'green');
  } catch (error) {
    log(`\n✗ Build failed: ${error.message}\n`, 'red');
    process.exit(1);
  }
}

main();
