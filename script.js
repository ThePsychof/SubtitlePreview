// SubtitlePreview – Canvas-based subtitle preview using libass/WebAssembly

const landingSection = document.getElementById("landing");
const editorSection = document.getElementById("editor");
const startEditingBtn = document.getElementById("startEditingBtn");

const previewFrame = document.getElementById("previewFrame");
const previewImage = document.getElementById("previewImage");
const dropOverlay = document.getElementById("dropOverlay");
const imageUploadInput = document.getElementById("imageUpload");
const resetImageBtn = document.getElementById("resetImageBtn");

const subtitleCanvas = document.getElementById("subtitleCanvas");
const subtitleTextEl = document.getElementById("subtitleText");
const controlsSection = document.getElementById("controlsSection");

const textInput = document.getElementById("textInput");
const fontSelect = document.getElementById("fontSelect");
const subtitleSizeInput = document.getElementById("subtitleSizeInput");
const subtitleShadowInput = document.getElementById("subtitleShadowInput");
const subtitleOutlineInput = document.getElementById("subtitleOutlineInput");
const verticalMarginInput = document.getElementById("verticalMarginInput");
const primaryColorInput = document.getElementById("primaryColor");
const secondaryColorInput = document.getElementById("secondaryColor");
const outlineColorInput = document.getElementById("outlineColor");
const shadowColorInput = document.getElementById("shadowColor");
const opaqueBoxInput = document.getElementById("opaqueBox");

const shareBtn = document.getElementById("shareBtn");
const shareStatus = document.getElementById("shareStatus");
const floatingEditBtn = document.getElementById("floatingEditBtn");

const DEFAULT_IMAGE_SRC = "assets/movie-default.jpg";
const BASE_PREVIEW_HEIGHT = 450;

let subtitleRenderer = null;
let previewResizeObserver = null;

function renderSubtitleToCanvas(state) {
  if (!subtitleCanvas) return;

  const context = subtitleCanvas.getContext("2d");
  if (!context) return;

  const rect = subtitleCanvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width || subtitleCanvas.clientWidth || previewFrame?.clientWidth || 640));
  const height = Math.max(1, Math.round(rect.height || subtitleCanvas.clientHeight || previewFrame?.clientHeight || 360));
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const pixelWidth = Math.round(width * dpr);
  const pixelHeight = Math.round(height * dpr);

  if (subtitleCanvas.width !== pixelWidth || subtitleCanvas.height !== pixelHeight) {
    subtitleCanvas.width = pixelWidth;
    subtitleCanvas.height = pixelHeight;
  }

  subtitleCanvas.style.width = "100%";
  subtitleCanvas.style.height = "100%";

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);

  const text = String(state.text || "").trim();
  if (!text) return;

  const margin = Math.max(12, Number(state.verticalMargin || 24));
  const x = width / 2;
  const y = Math.max(40, height - margin);

  if (window.SubtitleRenderer && typeof window.SubtitleRenderer.drawAssStyleText === "function") {
    window.SubtitleRenderer.drawAssStyleText(context, text, x, y, state);
    return;
  }

  context.save();
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.font = `${Math.max(8, Math.round(state.fontSize || 24))}px ${state.fontFamily || "Arial, sans-serif"}`;
  context.shadowBlur = 0;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;

  const shadowSize = Math.max(0, Number(state.shadowSize || 0));
  const outlineSize = Math.max(0, Number(state.outlineSize || 0));

  if (shadowSize > 0 && !state.opaqueBox) {
    context.fillStyle = state.shadowColor || "#000000";
    context.fillText(text, x + shadowSize, y + shadowSize);
  }

  if (outlineSize > 0 && !state.opaqueBox) {
    context.strokeStyle = state.outlineColor || "#000000";
    context.lineWidth = outlineSize * 2;
    context.strokeText(text, x, y);
  }

  context.fillStyle = state.primaryColor || "#ffffff";
  context.fillText(text, x, y);
  context.restore();
}

function showEditor() {
  landingSection.classList.add("hidden");
  editorSection.style.display = "block";

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      initSubtitleRenderer();
      updateSubtitlePreview();
      requestAnimationFrame(() => {
        updateSubtitlePreview();
      });
    });
  });
}

startEditingBtn.addEventListener("click", () => {
  showEditor();
});

function getControlState() {
  return {
    text: textInput.value || "",
    fontFamily: fontSelect.value || "Arial, sans-serif",
    fontSize: Number(subtitleSizeInput.value) || 22,
    primaryColor: primaryColorInput.value || "#ffffff",
    secondaryColor: secondaryColorInput.value || "#000000",
    outlineColor: outlineColorInput.value || "#000000",
    shadowColor: shadowColorInput.value || "#000000",
    outlineSize: Number(subtitleOutlineInput.value) || 0,
    shadowSize: Number(subtitleShadowInput.value) || 0,
    verticalMargin: Number(verticalMarginInput.value) || 24,
    opaqueBox: Boolean(opaqueBoxInput && opaqueBoxInput.checked)
  };
}

function getEffectiveScale() {
  const height = previewFrame?.clientHeight || BASE_PREVIEW_HEIGHT;
  return height / BASE_PREVIEW_HEIGHT;
}

function getScaledSubtitleState(state) {
  const scale = getEffectiveScale();
  return {
    ...state,
    fontSize: (Number(state.fontSize) || 22) * scale,
    outlineSize: (Number(state.outlineSize) || 0) * scale,
    shadowSize: (Number(state.shadowSize) || 0) * scale
  };
}

function updateSubtitleText(value, state = {}, useFallback = false) {
  if (!subtitleTextEl) return;

  const nextText = String(value || "").trim();
  subtitleTextEl.textContent = nextText;
  subtitleTextEl.hidden = true;
  subtitleTextEl.classList.toggle("is-fallback", Boolean(useFallback && nextText));

  if (!nextText) {
    subtitleTextEl.style.display = "none";
    subtitleTextEl.style.visibility = "hidden";
    subtitleTextEl.style.opacity = "0";
    return;
  }

  subtitleTextEl.style.display = "none";
  subtitleTextEl.style.visibility = "hidden";
  subtitleTextEl.style.opacity = "0";
}

function updateSubtitlePreview() {
  const state = getControlState();
  const nextState = getScaledSubtitleState(state);

  updateSubtitleText(state.text, nextState, Boolean(subtitleRenderer && subtitleRenderer.fallbackMode));
  if (!subtitleRenderer) {
    initSubtitleRenderer();
  }

  const useLibass = Boolean(subtitleRenderer && subtitleRenderer.ready && !subtitleRenderer.fallbackMode);
  if (!useLibass) {
    renderSubtitleToCanvas(nextState);
  }

  if (subtitleRenderer && typeof subtitleRenderer.update === "function") {
    subtitleRenderer.update(nextState);
  }

  requestAnimationFrame(() => {
    const activeLibass = Boolean(subtitleRenderer && subtitleRenderer.ready && !subtitleRenderer.fallbackMode);
    if (!activeLibass) {
      renderSubtitleToCanvas(nextState);
    }
    if (subtitleRenderer && typeof subtitleRenderer.update === "function") {
      subtitleRenderer.update(nextState);
    }
    updateSubtitleText(state.text, nextState, Boolean(subtitleRenderer && subtitleRenderer.fallbackMode));
  });
}

function initSubtitleRenderer() {
  if (!subtitleCanvas) return;

  if (!subtitleRenderer) {
    subtitleRenderer = window.SubtitleRenderer.create(subtitleCanvas, {
      scriptUrl: "assets/libass/subtitles-octopus.js",
      workerUrl: "assets/libass/subtitles-octopus-worker.js",
      legacyWorkerUrl: "assets/libass/subtitles-octopus-worker-legacy.js",
      fallbackFont: "assets/libass/fonts/Roboto-Regular.woff2"
    });
    window.subtitleRenderer = subtitleRenderer;
  }

  subtitleRenderer.init(getScaledSubtitleState(getControlState()));
}

function observePreviewResize() {
  if (previewResizeObserver || typeof ResizeObserver === "undefined") {
    return;
  }

  previewResizeObserver = new ResizeObserver(() => {
    requestAnimationFrame(() => {
      if (subtitleRenderer) {
        subtitleRenderer.resize();
      }
      updateSubtitlePreview();
    });
  });

  previewResizeObserver.observe(previewFrame);
}

function bindControlEvents() {
  [textInput, fontSelect, subtitleSizeInput, subtitleOutlineInput, subtitleShadowInput, verticalMarginInput, primaryColorInput, secondaryColorInput, outlineColorInput, shadowColorInput, opaqueBoxInput]
    .filter(Boolean)
    .forEach((element) => {
      element.addEventListener("input", updateSubtitlePreview);
      element.addEventListener("change", updateSubtitlePreview);
    });
}

bindControlEvents();
window.addEventListener("resize", () => {
  if (subtitleRenderer) {
    subtitleRenderer.resize();
  }
  updateSubtitlePreview();
});

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
  url.searchParams.set("primary", primaryColorInput.value || "");
  url.searchParams.set("secondary", secondaryColorInput.value || "");
  url.searchParams.set("outlineColor", outlineColorInput.value || "");
  url.searchParams.set("shadowColor", shadowColorInput.value || "");
  url.searchParams.set("size", subtitleSizeInput.value || "");
  url.searchParams.set("outline", subtitleOutlineInput.value || "");
  url.searchParams.set("shadow", subtitleShadowInput.value || "");
  url.searchParams.set("verticalMargin", verticalMarginInput.value || "");
  url.searchParams.set("opaqueBox", opaqueBoxInput.checked ? "1" : "0");
  url.searchParams.set("mode", "preview");

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
  const primary = params.get("primary");
  const secondary = params.get("secondary");
  const outlineColor = params.get("outlineColor");
  const shadowColor = params.get("shadowColor");
  const size = params.get("size");
  const outline = params.get("outline");
  const shadow = params.get("shadow");
  const verticalMargin = params.get("verticalMargin");
  const opaqueBox = params.get("opaqueBox");
  const mode = params.get("mode");

  if (text !== null) {
    textInput.value = text;
  }

  if (font !== null) {
    fontSelect.value = font;
  }

  if (primary !== null) {
    primaryColorInput.value = primary;
  }

  if (secondary !== null) {
    secondaryColorInput.value = secondary;
  }

  if (outlineColor !== null) {
    outlineColorInput.value = outlineColor;
  }

  if (shadowColor !== null) {
    shadowColorInput.value = shadowColor;
  }

  if (size !== null) {
    subtitleSizeInput.value = size;
  }

  if (outline !== null) {
    subtitleOutlineInput.value = outline;
  }

  if (shadow !== null) {
    subtitleShadowInput.value = shadow;
  }

  if (verticalMargin !== null) {
    verticalMarginInput.value = verticalMargin;
  }

  if (opaqueBox !== null) {
    opaqueBoxInput.checked = opaqueBox === "1";
  }

  if (text !== null || font !== null || primary !== null || secondary !== null || outlineColor !== null || shadowColor !== null || size !== null || outline !== null || shadow !== null || verticalMargin !== null || opaqueBox !== null || mode !== null) {
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
window.renderSubtitleToCanvas = renderSubtitleToCanvas;
window.updateSubtitlePreview = updateSubtitlePreview;
window.initSubtitleRenderer = initSubtitleRenderer;
window.getControlState = getControlState;

window.addEventListener("load", () => {
  restoreStateFromUrl();
  observePreviewResize();
  updateSubtitleText(textInput.value, getControlState());
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      updateSubtitlePreview();
    });
  });
});
