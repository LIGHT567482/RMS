const STORAGE_KEY = "light_distributor:branding";
const DEFAULT_CONFIG = {
  productName: "",
  name: "",
  motto: "",
  address: "",
  email: "",
  telephones: "",
  poBox: "",
  primaryColor: "#3c64ff",
  secondaryColor: "#eef2ff",
  accentColor: "#f59e0b",
  logoDataUrl: "",
  signInBackgroundUrl: "",
};

const controls = {
  productName: document.getElementById("productName"),
  schoolName: document.getElementById("schoolName"),
  schoolMotto: document.getElementById("schoolMotto"),
  schoolAddress: document.getElementById("schoolAddress"),
  schoolEmail: document.getElementById("schoolEmail"),
  schoolPhones: document.getElementById("schoolPhones"),
  schoolBox: document.getElementById("schoolBox"),
  primaryColor: document.getElementById("primaryColor"),
  secondaryColor: document.getElementById("secondaryColor"),
  accentColor: document.getElementById("accentColor"),
  logoUpload: document.getElementById("logoUpload"),
  signInBackgroundUpload: document.getElementById("signInBackgroundUpload"),
};

const buttons = {
  save: document.getElementById("saveButton"),
  downloadJson: document.getElementById("downloadJsonButton"),
  downloadPackage: document.getElementById("downloadPackageButton"),
};

const preview = {
  card: document.getElementById("previewCard"),
  logo: document.getElementById("previewLogo"),
  name: document.getElementById("previewName"),
  motto: document.getElementById("previewMotto"),
  sample: document.getElementById("previewSample"),
  status: document.getElementById("statusMessage"),
};

function getSavedConfig() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

function setSavedConfig(config) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function collectConfig() {
  return {
    ...DEFAULT_CONFIG,
    productName: controls.productName.value.trim(),
    name: controls.schoolName.value.trim(),
    motto: controls.schoolMotto.value.trim(),
    address: controls.schoolAddress.value.trim(),
    email: controls.schoolEmail.value.trim(),
    telephones: controls.schoolPhones.value.trim(),
    poBox: controls.schoolBox.value.trim(),
    primaryColor: controls.primaryColor.value,
    secondaryColor: controls.secondaryColor.value,
    accentColor: controls.accentColor.value,
    logoDataUrl: controls.logoUpload.dataset.image || "",
    signInBackgroundUrl: controls.signInBackgroundUpload.dataset.image || "",
  };
}

function populateForm(config) {
  controls.productName.value = config.productName || config.name || "";
  controls.schoolName.value = config.name;
  controls.schoolMotto.value = config.motto;
  controls.schoolAddress.value = config.address;
  controls.schoolEmail.value = config.email;
  controls.schoolPhones.value = config.telephones;
  controls.schoolBox.value = config.poBox;
  controls.primaryColor.value = config.primaryColor || DEFAULT_CONFIG.primaryColor;
  controls.secondaryColor.value = config.secondaryColor || DEFAULT_CONFIG.secondaryColor;
  controls.accentColor.value = config.accentColor || DEFAULT_CONFIG.accentColor;
  if (config.logoDataUrl) {
    controls.logoUpload.dataset.image = config.logoDataUrl;
  }
  if (config.signInBackgroundUrl) {
    controls.signInBackgroundUpload.dataset.image = config.signInBackgroundUrl;
  }
  updatePreview(config);
}

function toRgba(hex, alpha = 0.18) {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized.length === 3 ? normalized.replace(/./g, '$&$&') : normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function updatePreview(config) {
  const previewConfig = { ...DEFAULT_CONFIG, ...config };
  preview.card.style.background = `linear-gradient(180deg, ${previewConfig.secondaryColor} 0%, ${toRgba(previewConfig.primaryColor, 0.08)} 100%)`;
  preview.card.style.borderColor = previewConfig.accentColor;
  preview.card.style.boxShadow = `0 24px 60px -24px ${toRgba(previewConfig.primaryColor, 0.4)}`;
  preview.preview = previewConfig;
  if (previewConfig.logoDataUrl) {
    preview.logo.style.backgroundImage = `url(${previewConfig.logoDataUrl})`;
    preview.logo.classList.add("has-logo");
  } else {
    preview.logo.style.backgroundImage = "none";
    preview.logo.classList.remove("has-logo");
  }
  preview.name.textContent = previewConfig.name || "Your School";
  preview.motto.textContent = previewConfig.motto || "Branding configured through Light Distributor.";
  if (previewConfig.signInBackgroundUrl) {
    preview.sample.style.backgroundImage = `url(${previewConfig.signInBackgroundUrl})`;
    preview.sample.classList.add("has-background");
  } else {
    preview.sample.style.backgroundImage = "none";
    preview.sample.classList.remove("has-background");
  }
}

function downloadBlob(data, filename, type) {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function downloadJson(config) {
  downloadBlob(JSON.stringify(config, null, 2), "light-distributor-branding.json", "application/json");
}

async function downloadZipPackage(config) {
  if (typeof JSZip === "undefined") {
    updateStatus("JSZip is not available. Downloading JSON instead.");
    return downloadJson(config);
  }

  const zip = new JSZip();
  zip.file("branding.json", JSON.stringify(config, null, 2));
  zip.file(
    "README.txt",
    `This package contains the Light Distributor branding configuration for RMS.\n\n` +
      `The branding file includes an optional productName field for the desktop application name.\n` +
      `To generate a branded RMS app, save branding.json in the repository and run:\n` +
      `npm run package:branded -- light-distributor/branding.json\n\n` +
      `The resulting branded RMS distribution will be created inside dist-branded/.\n` +
      `The native installer is fully bundled and includes all runtime dependencies.\n` +
      `The installed app stores its database locally on the device, but all file management happens inside the system.`,
  );

  const content = await zip.generateAsync({ type: "blob" });
  downloadBlob(content, "light-distributor-package.zip", "application/zip");
}

function updateStatus(message) {
  preview.status.textContent = message;
}

controls.logoUpload.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    controls.logoUpload.dataset.image = reader.result;
    const config = collectConfig();
    updatePreview(config);
  };
  reader.readAsDataURL(file);
});

controls.signInBackgroundUpload.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    controls.signInBackgroundUpload.dataset.image = reader.result;
    const config = collectConfig();
    updatePreview(config);
  };
  reader.readAsDataURL(file);
});

buttons.save.addEventListener("click", () => {
  const config = collectConfig();
  setSavedConfig(config);
  updateStatus("Branding saved locally in this browser.");
});

buttons.downloadJson.addEventListener("click", () => {
  const config = collectConfig();
  downloadJson(config);
  updateStatus("Branding JSON downloaded.");
});

buttons.downloadPackage.addEventListener("click", async () => {
  const config = collectConfig();
  await downloadZipPackage(config);
  updateStatus("Package download started.");
});

window.addEventListener("DOMContentLoaded", () => {
  const saved = getSavedConfig();
  populateForm(saved);
});
