// SubtitlePreview – ASS-like subtitle preview with a single font size input

const landingSection = document.getElementById("landing");
const editorSection = document.getElementById("editor");
const startEditingBtn = document.getElementById("startEditingBtn");

const previewFrame = document.getElementById("previewFrame");
const previewImage = document.getElementById("previewImage");
const dropOverlay = document.getElementById("dropOverlay");
const imageUploadInput = document.getElementById("imageUpload");
const resetImageBtn = document.getElementById("resetImageBtn");

const subtitleTextEl = document.getElementById("subtitleText");
const controlsSection = document.getElementById("controlsSection");

const textInput = document.getElementById("textInput");
const fontSelect = document.getElementById("fontSelect");
const subtitleSizeInput = document.getElementById("subtitleSizeInput");
const fontColorInput = document.getElementById("fontColorInput");

const shareBtn = document.getElementById("shareBtn");
const shareStatus = document.getElementById("shareStatus");
const floatingEditBtn = document.getElementById("floatingEditBtn");

const DEFAULT_IMAGE_SRC = "assets/movie-default.jpg";

// Navigation
function showEditor() {
  landingSection.classList.add("hidden");
  editorSection.style.display = "block";

  requestAnimationFrame(() => {
    updateSubtitleFontSize();
  });
}

startEditingBtn.addEventListener("click", () => {
  showEditor();
});

// Subtitle text & font
function updateSubtitleText(value) {
  subtitleTextEl.textContent = value || "";
}

function updateSubtitleFontFamily(value) {
  subtitleTextEl.style.fontFamily = value;
}

function updateSubtitleFontColor(value) {
  subtitleTextEl.style.color = value;
}

textInput.addEventListener("input", (e) => {
  updateSubtitleText(e.target.value);
});

fontSelect.addEventListener("change", (e) => {
  updateSubtitleFontFamily(e.target.value);
});

fontColorInput.addEventListener("input", (e) => {
  updateSubtitleFontColor(e.target.value);
});

// =====================================
// REALISTIC FONT SIZE FIX (based on your CSS)
// =====================================
const BASE_PREVIEW_HEIGHT = 450;
const BASE_SUBTITLE_SCALE = 1;

function updateSubtitleFontSize() {
    const size = Number(subtitleSizeInput.value);
    const height = previewFrame.clientHeight;

    const scale = height / BASE_PREVIEW_HEIGHT;
    const cssSize = size * scale;


    subtitleTextEl.style.fontSize = cssSize + "px";
}


subtitleSizeInput.addEventListener("input", updateSubtitleFontSize);
window.addEventListener("resize", updateSubtitleFontSize);

// Image upload & drag & drop
function setPreviewImageFromFile(file) {
  if (!file || !file.type.startsWith("image/")) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    previewImage.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

imageUploadInput.addEventListener("change", (event) => {
  const file = event.target.files && event.target.files[0];
  setPreviewImageFromFile(file);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
  previewFrame.addEventListener(eventName, preventDefaults);
  dropOverlay.addEventListener(eventName, preventDefaults);
});

["dragenter", "dragover"].forEach((eventName) => {
  previewFrame.addEventListener(eventName, () => {
    dropOverlay.style.display = "flex";
  });
});

["dragleave", "drop"].forEach((eventName) => {
  previewFrame.addEventListener(eventName, () => {
    dropOverlay.style.display = "none";
  });
});

dropOverlay.addEventListener("drop", (event) => {
  const dt = event.dataTransfer;
  const file = dt && dt.files && dt.files[0];
  setPreviewImageFromFile(file);
});

resetImageBtn.addEventListener("click", () => {
  previewImage.src = DEFAULT_IMAGE_SRC;
  imageUploadInput.value = "";
});

// Share link
function buildShareUrl() {
  const url = new URL(window.location.href);
  url.search = "";

  url.searchParams.set("text", textInput.value || "");
  url.searchParams.set("font", fontSelect.value || "");
  url.searchParams.set("color", fontColorInput.value || "");
  url.searchParams.set("size", subtitleSizeInput.value || "");
  url.searchParams.set("mode", "preview")

  return url.toString();
}

async function copyShareLink() {
  const shareUrl = buildShareUrl();

  try {
    await navigator.clipboard.writeText(shareUrl);
    shareStatus.textContent = "Share link copied to clipboard.";
  } catch (err) {
    shareStatus.textContent = "Copy failed. URL: " + shareUrl;
  }

  setTimeout(() => {
    shareStatus.textContent = "";
  }, 4000);
}

shareBtn.addEventListener("click", () => {
  copyShareLink();
});

// Restore from URL
function restoreStateFromUrl() {
  const url = new URL(window.location.href);
  const params = url.searchParams;

  const text = params.get("text");
  const font = params.get("font");
  const color = params.get("color");
  const size = params.get("size");
  const mode = params.get("mode");

  if (text !== null) {
    textInput.value = text;
    updateSubtitleText(text);
  }

  if (font !== null) {
    fontSelect.value = font;
    updateSubtitleFontFamily(font);
  }

  if (color !== null) {
    fontColorInput.value = color;
    updateSubtitleFontColor(color);
  }

  if (size !== null) {
    subtitleSizeInput.value = size;
  }

  if (text !== null || font !== null || color !== null || size !== null || mode !== null) {
    showEditor();
  }

  if (mode === "preview") {
    enablePreviewMode();
  } else {
    disablePreviewMode();
  }
}

// Preview mode
function enablePreviewMode() {
  controlsSection.classList.add("hidden");
  floatingEditBtn.style.display = "block";
}

function disablePreviewMode() {
  controlsSection.classList.remove("hidden");
  floatingEditBtn.style.display = "none";
}

floatingEditBtn.addEventListener("click", () => {
  disablePreviewMode();
  const url = new URL(window.location.href);
  url.searchParams.delete("mode");
  window.history.replaceState({}, "", url.toString());
});

// Init
window.addEventListener("load", () => {
    restoreStateFromUrl();
  updateSubtitleText(textInput.value);
  updateSubtitleFontFamily(fontSelect.value);
  updateSubtitleFontColor(fontColorInput.value);
});
