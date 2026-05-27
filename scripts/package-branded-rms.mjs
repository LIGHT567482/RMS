import { access, cp, mkdir, readdir, readFile, rm, writeFile } from "fs/promises";
import { createInterface } from "readline";
import { spawn } from "child_process";
import { dirname, join, resolve, extname } from "path";
import { fileURLToPath } from "url";
import Jimp from "jimp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");
const configArg = process.argv[2] ?? "branded/branding.json";
const destinationArg = process.argv[3] || "";
const configPath = resolve(rootDir, configArg);
const distClientDir = resolve(rootDir, "dist", "client");
const brandedDir = resolve(rootDir, "dist-branded");

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32", // Use shell on Windows for npm.cmd resolution
      ...options,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function copyNativeBundleToDestination(destinationPath = "") {
  const bundleDir = resolve(rootDir, "src-tauri", "target", "release", "bundle");
  try {
    await access(bundleDir);
  } catch {
    throw new Error(`Native bundle output not found at ${bundleDir}`);
  }

  const destination = destinationPath || await prompt(
    "Enter the destination folder path where you want the built native bundle copied: ",
  );
  if (!destination) {
    throw new Error("No destination provided. Build completed, but the bundle was not copied.");
  }

  const destinationDir = resolve(rootDir, destination);
  await mkdir(destinationDir, { recursive: true });

  const items = await readdir(bundleDir, { withFileTypes: true });
  if (items.length === 0) {
    throw new Error(`No files found in bundle directory: ${bundleDir}`);
  }

  for (const item of items) {
    const srcPath = join(bundleDir, item.name);
    const destPath = join(destinationDir, item.name);
    await cp(srcPath, destPath, { recursive: true, force: true });
  }

  console.log(`✓ Copied native bundle files to ${destinationDir}`);
  console.log("You can now open or install the generated app from that folder.");
}

/**
 * Extract base64 data URI and save as a file
 */
function mimeToExtension(mime) {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return null;
}

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

async function saveDataUrlAsFile(dataUrl, filePath) {
  if (!dataUrl || !dataUrl.startsWith('data:')) return false;

  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) return false;

  const mime = matches[1];
  const data = Buffer.from(matches[2], 'base64');
  const ext = extname(filePath).slice(1).toLowerCase();

  if (ext === 'png') {
    const pngBuffer = await getPngBufferFromDataUrl(dataUrl);
    if (!pngBuffer) return false;
    await writeFile(filePath, pngBuffer);
    return true;
  }

  if (ext === 'ico') {
    const pngBuffer = await getPngBufferFromDataUrl(dataUrl);
    if (!pngBuffer) return false;
    const icoBuffer = buildIcoFromPng(pngBuffer);
    await writeFile(filePath, icoBuffer);
    return true;
  }

  await writeFile(filePath, data);
  return true;
}

async function writeBrandedTauriConfig(config) {
  const tauriConfigPath = resolve(rootDir, "src-tauri", "tauri.conf.json");
  const brandedTauriConfigPath = resolve(rootDir, "src-tauri", "tauri.conf.branded.json");

  const tauriConfigRaw = await readFile(tauriConfigPath, "utf-8");
  const tauriConfig = JSON.parse(tauriConfigRaw);
  const brandedAppName = config.productName || config.name || tauriConfig.productName;
  const brandedIdentifier = config.identifier || config.appIdentifier || tauriConfig.identifier;

  const brandedConfig = {
    ...tauriConfig,
    productName: brandedAppName,
    identifier: brandedIdentifier || tauriConfig.identifier,
  };

  await writeFile(brandedTauriConfigPath, JSON.stringify(brandedConfig, null, 2), "utf-8");
  console.log(`Wrote branded Tauri config to: ${brandedTauriConfigPath}`);
  return brandedTauriConfigPath;
}

async function main() {
  try {
    await access(configPath);
  } catch {
    throw new Error(`Branding config not found: ${configPath}`);
  }

  const configRaw = await readFile(configPath, "utf-8");
  const config = JSON.parse(configRaw);

  console.log("Building RMS application...");
  await runCommand("npm", ["run", "build"], { cwd: rootDir });

  // Verify the dist/client directory exists
  try {
    await access(distClientDir);
    console.log(`✓ Found dist/client at: ${distClientDir}`);
  } catch {
    throw new Error(`Build output not found at: ${distClientDir}`);
  }

  await rm(brandedDir, { force: true, recursive: true });
  await mkdir(brandedDir, { recursive: true });
  console.log(`✓ Created dist-branded directory`);
  
  // Copy client build output contents to branded directory
  try {
    const files = await readdir(distClientDir, { withFileTypes: true });
    console.log(`✓ Found ${files.length} items in dist/client to copy`);
    for (const file of files) {
      const srcPath = join(distClientDir, file.name);
      const dstPath = join(brandedDir, file.name);
      await cp(srcPath, dstPath, { recursive: true, force: true });
      console.log(`  • Copied ${file.name}`);
    }
    console.log(`✓ All files copied successfully`);
  } catch (error) {
    throw new Error(`Failed to copy files from ${distClientDir} to ${brandedDir}: ${error.message}`);
  }

  // Extract school logo from branding config and save to light-distributor assets
  let pngPath = null;
  let icoPath = null;

  if (config.logoDataUrl) {
    const assetsDir = resolve(rootDir, "light-distributor", "assets", "icons");
    await mkdir(assetsDir, { recursive: true });
    
    // Save as PNG (universal format that can be used on all platforms)
    pngPath = join(assetsDir, "icon.png");
    const saved = await saveDataUrlAsFile(config.logoDataUrl, pngPath);
    if (saved) {
      console.log(`School logo extracted and saved to: ${pngPath}`);
      
      // Always generate a Windows icon file as well for native bundling.
      icoPath = join(assetsDir, "icon.ico");
      const icoSaved = await saveDataUrlAsFile(config.logoDataUrl, icoPath);
      if (icoSaved) {
        console.log(`School logo saved as icon.ico for Windows: ${icoPath}`);
      } else {
        icoPath = null;
      }
    }
  }

  // Also copy extracted icons into `src-tauri/icons` so Tauri can use them when building
  try {
    const tauriIconsDir = resolve(rootDir, "src-tauri", "icons");
    await mkdir(tauriIconsDir, { recursive: true });
    if (pngPath) {
      await cp(pngPath, join(tauriIconsDir, "icon.png"), { force: true });
    }
    if (icoPath) {
      await cp(icoPath, join(tauriIconsDir, "icon.ico"), { force: true });
    }
    if (pngPath || icoPath) {
      console.log(`Copied branding icons to src-tauri/icons`);
    }
  } catch (e) {
    console.warn("Failed to copy branding icons to src-tauri/icons", e?.message || e);
  }

  const bootScript = `(() => {
  const config = ${JSON.stringify(config, null, 2)};
  localStorage.setItem("light_rms:school", JSON.stringify(config));
  localStorage.setItem("light_rms:init", "1");
})();
`;

  await writeFile(join(brandedDir, "branding.json"), JSON.stringify(config, null, 2), "utf-8");
  await writeFile(join(brandedDir, "branding-boot.js"), bootScript, "utf-8");
  // Write branding into `src-tauri` so it can be embedded into the native bundle
  try {
    const tauriBrandingPath = resolve(rootDir, "src-tauri", "branding.json");
    await writeFile(tauriBrandingPath, JSON.stringify(config, null, 2), "utf-8");
    console.log(`Wrote branding.json to src-tauri/branding.json for native bundling`);
  } catch (e) {
    console.warn("Failed to write src-tauri/branding.json", e?.message || e);
  }
  // Generate a Rust source file with branding constants so selected values
  // are compiled into the native binary at build time.
  try {
    const tauriSrcDir = resolve(rootDir, "src-tauri", "src");
    await mkdir(tauriSrcDir, { recursive: true });

    // Pick a small set of fields to hard-code. Add more if needed.
    const schoolName = (config.name || "").replace(/"/g, '\\"');
    const schoolId = (config.id || "").replace(/"/g, '\\"');
    const productName = (config.productName || config.name || "RMS").replace(/"/g, '\\"');

    const brandingJsonString = JSON.stringify(config, null, 2).replace(/`/g, "\\`");

    const rustContent = `// Auto-generated from light-distributor branding.json
pub const SCHOOL_NAME: &str = "${schoolName}";
pub const SCHOOL_ID: &str = "${schoolId}";
pub const PRODUCT_NAME: &str = "${productName}";

// Full branding JSON embedded for runtime use if required.
pub const BRANDING_JSON: &str = r####"${brandingJsonString}"####;
`;

    const rustPath = join(tauriSrcDir, "branding.rs");
    await writeFile(rustPath, rustContent, "utf-8");
    console.log(`Wrote Rust branding source to: ${rustPath}`);
  } catch (e) {
    console.warn("Failed to generate Rust branding source:", e?.message || e);
  }

  await writeBrandedTauriConfig(config);

  // Build the native desktop bundle with Tauri
  console.log("Building native RMS desktop bundle with Tauri...");
  await runCommand("npx", [
    "@tauri-apps/cli",
    "build",
    "--config",
    "src-tauri/tauri.conf.branded.json",
    "--release",
  ], { cwd: rootDir });
  console.log("✓ Native build completed.");
  await copyNativeBundleToDestination(destinationArg);

  const indexPath = join(brandedDir, "index.html");
  
  try {
    let indexHtml = await readFile(indexPath, "utf-8");
    if (!indexHtml.includes("branding-boot.js")) {
      indexHtml = indexHtml.replace(
        /<\/head>/i,
        `  <script src="branding-boot.js"></script>\n</head>`,
      );
      await writeFile(indexPath, indexHtml, "utf-8");
    }
    console.log(`✓ Patched ${indexPath} with branding boot script`);
  } catch (error) {
    throw new Error(`Failed to patch ${indexPath}: ${error.message}`);
  }

  await writeFile(
    join(brandedDir, "README.txt"),
    `This folder contains a branded RMS distribution built from Light Distributor.\n\n` +
      `- Branding config: branding.json\n` +
      `- Bootstrap loader: branding-boot.js\n` +
      `\nOpen index.html in a static server or supported browser to launch the RMS app with the configured school branding.\n` +
      `\nFor the native Tauri desktop app:\n` +
      `- School logo is automatically extracted and set as the app icon.\n` +
      `- Application name is set from branding.json using the productName field.\n` +
      `- The generated installer is fully bundled and contains all runtime dependencies.\n` +
      `- App database and files are stored on the device, but are managed inside the app.\n` +
      `- Run: npm run package:branded:tauri to build the branded native bundle.\n` +
      `- After build, you will be prompted to choose where to save the built executable/installer.\n` +
      `- The installed app launches as a normal application with no exposed source code.\n`,
    "utf-8",
  );

  console.log(`Branded RMS output created at: ${brandedDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
