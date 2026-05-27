#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Colors for console output
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

async function readBrandingConfig() {
  try {
    const configPath = path.join(projectRoot, 'branded', 'branded.json');
    const configContent = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(configContent);
  } catch (error) {
    log('⚠ Using default branding config', 'yellow');
    return {
      productName: 'RMS',
      name: 'Record Management System',
      primaryColor: '#000000',
      secondaryColor: '#ffffff'
    };
  }
}

async function updateElectronBuilderConfig(branding) {
  logStep(1, 'Updating electron-builder configuration');

  const builderConfigPath = path.join(projectRoot, 'electron-builder.json');
  const config = JSON.parse(fs.readFileSync(builderConfigPath, 'utf-8'));

  // Update with branding
  config.productName = branding.productName || 'RMS';
  config.appId = `com.${branding.name?.toLowerCase().replace(/\s+/g, '')}.rms` || 'com.rms.app';
  
  // Update NSIS installer
  if (config.nsis) {
    config.nsis.shortcutName = branding.productName || 'RMS';
  }

  fs.writeFileSync(builderConfigPath, JSON.stringify(config, null, 2));
  log(`✓ Updated electron-builder.json with branding`, 'green');
}

async function generateBrandedAssets(branding) {
  logStep(2, 'Generating branded assets');

  const publicDir = path.join(projectRoot, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Create a simple branded icon info file for reference
  const assetInfoPath = path.join(publicDir, 'branding-info.json');
  fs.writeFileSync(assetInfoPath, JSON.stringify({
    productName: branding.productName,
    organization: branding.name,
    colors: {
      primary: branding.primaryColor,
      secondary: branding.secondaryColor,
      accent: branding.accentColor
    },
    generatedAt: new Date().toISOString()
  }, null, 2));

  log(`✓ Generated branding assets`, 'green');
  log(`  - Branding info saved to public/branding-info.json`, 'green');
}

async function buildFrontend() {
  logStep(3, 'Building frontend');

  try {
    log('Running: npm run build', 'blue');
    execSync('npm run build', {
      cwd: projectRoot,
      stdio: 'inherit'
    });
    log(`✓ Frontend built successfully`, 'green');
  } catch (error) {
    log(`✗ Frontend build failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function buildElectronApp() {
  logStep(4, 'Building Electron application');

  try {
    // Set environment variables to disable code signing
    process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
    process.env.WIN_CSC_LINK = '';
    process.env.WIN_CSC_KEY_PASSWORD = '';
    
    log('Running: electron-builder --win (unsigned)', 'blue');
    
    execSync('electron-builder --win --publish never', {
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
}

async function displayResults(branding) {
  logStep(5, 'Build Complete');

  const outputDir = path.join(projectRoot, 'dist-electron');
  const files = fs.readdirSync(outputDir).filter(f => 
    f.endsWith('.exe') || f.endsWith('.msi') || f.endsWith('-Setup.exe')
  );

  log(`\n✓ Installers created for: ${branding.productName}`, 'green');
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
  log(`  2. Sign the installers (if needed)`, 'blue');
  log(`  3. Distribute to users`, 'blue');
  log('─'.repeat(60), 'blue');
}

async function main() {
  try {
    log('\n╔════════════════════════════════════════════════════════════╗', 'bright');
    log('║       Electron Installer Builder with Branding             ║', 'bright');
    log('╚════════════════════════════════════════════════════════════╝', 'bright');

    const branding = await readBrandingConfig();
    log(`\nBranding: ${branding.productName}`, 'blue');
    log(`Organization: ${branding.name}`, 'blue');

    await updateElectronBuilderConfig(branding);
    await generateBrandedAssets(branding);
    await buildFrontend();
    await buildElectronApp();
    await displayResults(branding);

    log(`\n✓ Build completed successfully!\n`, 'green');
  } catch (error) {
    log(`\n✗ Build failed: ${error.message}\n`, 'red');
    process.exit(1);
  }
}

main();
