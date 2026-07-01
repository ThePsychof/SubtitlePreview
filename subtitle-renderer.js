(function (global) {
  const DEFAULT_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/libass-wasm@4.1.0/dist/js/subtitles-octopus.js";
  const DEFAULT_WORKER_URL = "https://cdn.jsdelivr.net/npm/libass-wasm@4.1.0/dist/js/subtitles-octopus-worker.js";
  const DEFAULT_LEGACY_WORKER_URL = "https://cdn.jsdelivr.net/npm/libass-wasm@4.1.0/dist/js/subtitles-octopus-worker-legacy.js";
  const BASE_PREVIEW_HEIGHT = 450;

  function parseFontName(fontFamily) {
    if (!fontFamily) return "Arial";

    return String(fontFamily)
      .split(",")[0]
      .replace(/^['"]/g, "")
      .replace(/['"]$/g, "")
      .trim() || "Arial";
  }

  function normalizeColor(value) {
    const input = String(value || "#ffffff").trim();
    if (!input) return "#ffffff";

    if (input.startsWith("#")) {
      const hex = input.slice(1);
      if (/^[0-9a-fA-F]{3}$/.test(hex)) {
        return `#${hex.split("").map((part) => part + part).join("")}`;
      }
      if (/^[0-9a-fA-F]{6}$/.test(hex)) {
        return `#${hex.toLowerCase()}`;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d");
    context.fillStyle = input;
    context.fillRect(0, 0, 1, 1);
    const pixel = context.getImageData(0, 0, 1, 1).data;
    const [red, green, blue] = pixel.slice(0, 3);
    return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
  }

  function toAssColor(hexColor) {
    const normalized = normalizeColor(hexColor);
    const value = normalized.startsWith("#") ? normalized.slice(1) : normalized;
    const expanded = value.length === 3
      ? value.split("").map((part) => part + part).join("")
      : value;

    if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
      return "FFFFFF";
    }

    const red = expanded.slice(0, 2);
    const green = expanded.slice(2, 4);
    const blue = expanded.slice(4, 6);

    return `${blue}${green}${red}`.toUpperCase();
  }

  function toAssColorTag(hexColor) {
    return `&H00${toAssColor(hexColor)}&`;
  }

  function drawAssStyleText(context, text, x, y, config) {
    if (!context || !text) return;

    const fontFamily = parseFontName(config.fontFamily);
    const fontSize = Math.max(8, Math.round(config.fontSize || 24));
    const outlineSize = Math.max(0, Number(config.outlineSize || 0));
    const shadowSize = Math.max(0, Number(config.shadowSize || 0));
    const primaryColor = normalizeColor(config.primaryColor || "#ffffff");
    const outlineColor = normalizeColor(config.outlineColor || "#000000");
    const shadowColor = normalizeColor(config.shadowColor || "#000000");
    const opaqueBox = Boolean(config.opaqueBox);

    context.save();
    context.textAlign = config.textAlign || "center";
    context.textBaseline = config.textBaseline || "middle";
    context.lineJoin = "round";
    context.font = `${fontSize}px ${fontFamily}`;
    context.shadowBlur = 0;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;

    if (opaqueBox) {
      const metrics = context.measureText(text);
      const paddingX = Math.max(4, outlineSize * 2 + 4);
      const paddingY = Math.max(4, outlineSize + 4);
      const boxWidth = metrics.width + paddingX * 2;
      const boxHeight = fontSize * 1.2 + paddingY * 2;
      context.fillStyle = shadowColor;
      context.fillRect(x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight);
    } else if (shadowSize > 0) {
      context.fillStyle = shadowColor;
      context.fillText(text, x + shadowSize, y + shadowSize);
    }

    if (outlineSize > 0 && !opaqueBox) {
      context.strokeStyle = outlineColor;
      context.lineWidth = outlineSize * 2;
      context.strokeText(text, x, y);
    }

    context.fillStyle = primaryColor;
    context.fillText(text, x, y);
    context.restore();
  }

  function escapeAssText(text) {
    return String(text || "")
      .replace(/\\/g, "\\\\")
      .replace(/\{/g, "\\{")
      .replace(/\}/g, "\\}")
      .replace(/\r?\n/g, "\\N");
  }

  function resolveAssetUrl(url) {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    return new URL(String(url), window.location.href).toString();
  }

  function buildAssDocument(config) {
    const width = Math.max(1, config.width || 1280);
    const height = Math.max(1, config.height || 720);
    const centerX = Math.round(width / 2);
    const bottomY = Math.max(24, Math.round(height - (config.verticalMargin || 24)));
    const fontName = parseFontName(config.fontFamily);
    const fontSize = Math.max(8, Math.round(config.fontSize || 24));
    const primaryColor = toAssColorTag(config.primaryColor);
    const secondaryColor = toAssColorTag(config.secondaryColor);
    const outlineColor = toAssColorTag(config.outlineColor);
    const backColor = toAssColorTag(config.shadowColor);
    const borderSize = Math.max(0, Number(config.outlineSize || 0));
    const shadowSize = Math.max(0, Number(config.shadowSize || 0));
    const opaqueBox = Boolean(config.opaqueBox);
    const borderStyle = opaqueBox ? 3 : 1;
    const effectiveShadowSize = opaqueBox ? 0 : shadowSize;
    const safeText = escapeAssText(config.text || "");

    const style = [
      "[Script Info]",
      "Title: SubtitlePreview",
      "ScriptType: v4.00+",
      "WrapStyle: 2",
      `PlayResX: ${width}`,
      `PlayResY: ${height}`,
      "ScaledBorderAndShadow: yes",
      "",
      "[V4+ Styles]",
      "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
      `Style: Default,${fontName},${fontSize},${primaryColor},${secondaryColor},${outlineColor},${backColor},0,0,0,0,100,100,0,0,${borderStyle},${borderSize},${effectiveShadowSize},2,10,10,10,1`,
      "",
      "[Events]",
      "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
      `Dialogue: 0,0:00:00.00,0:00:05.00,Default,,0,0,0,,{\\an2\\pos(${centerX},${bottomY})\\fs${fontSize}\\fn${fontName}\\bord${borderSize}\\shad${effectiveShadowSize}\\1c${primaryColor}\\2c${secondaryColor}\\3c${outlineColor}\\4c${backColor}}${safeText}`
    ].join("\n");

    return style;
  }

  function createRenderer(canvas, options) {
    const canvasElement = canvas;
    const settings = options || {};
    const rendererState = {
      instance: null,
      ready: false,
      pendingConfig: null,
      currentConfig: null,
      lastSize: null,
      destroyed: false,
      fallbackMode: false
    };

    function drawFallbackSubtitle(config) {
      if (!canvasElement) return;

      const size = syncCanvasSize();
      const context = canvasElement.getContext("2d");
      if (!context) return;

      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, size.width, size.height);

      const text = String(config.text || "").trim();
      if (!text) return;

      const x = size.width / 2;
      const y = Math.max(40, size.height - (Number(config.verticalMargin || 24)));
      drawAssStyleText(context, text, x, y, config);
    }

    function syncCanvasSize() {
      if (!canvasElement) return { width: 0, height: 0, pixelWidth: 0, pixelHeight: 0, dpr: 1 };

      const container = canvasElement.parentElement || canvasElement;
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width || container.clientWidth || canvasElement.clientWidth || 1280));
      const height = Math.max(1, Math.round(rect.height || container.clientHeight || canvasElement.clientHeight || 720));
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const pixelWidth = Math.round(width * dpr);
      const pixelHeight = Math.round(height * dpr);

      if (canvasElement.width !== pixelWidth || canvasElement.height !== pixelHeight) {
        canvasElement.width = pixelWidth;
        canvasElement.height = pixelHeight;
      }
      canvasElement.style.width = "100%";
      canvasElement.style.height = "100%";

      return { width, height, pixelWidth, pixelHeight, dpr };
    }

    function applyConfig(config) {
      const resolvedConfig = config || rendererState.currentConfig || {};
      rendererState.currentConfig = resolvedConfig;

      const canUseLibass = Boolean(rendererState.instance && rendererState.ready && rendererState.instance.worker && rendererState.instance.worker.readyState !== 2);
      if (!canUseLibass) {
        drawFallbackSubtitle(resolvedConfig);
        rendererState.pendingConfig = resolvedConfig;
        return;
      }

      const size = syncCanvasSize();
      const context = canvasElement && canvasElement.getContext("2d");
      if (context) {
        const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.clearRect(0, 0, size.width, size.height);
      }
      if (rendererState.lastSize && rendererState.lastSize.width === size.width && rendererState.lastSize.height === size.height) {
        // no-op; the next draw will use the latest content
      }
      rendererState.lastSize = size;

      if (typeof rendererState.instance.resize === "function") {
        rendererState.instance.resize(size.width, size.height);
      }

      const assDocument = buildAssDocument({
        ...resolvedConfig,
        width: size.pixelWidth || size.width,
        height: size.pixelHeight || size.height
      });

      if (typeof rendererState.instance.setTrack === "function") {
        rendererState.instance.setTrack(assDocument);
        if (typeof rendererState.instance.setCurrentTime === "function") {
          rendererState.instance.setCurrentTime(0);
        }
      }
    }

    function ensureLibraryLoaded() {
      if (rendererState.destroyed) return Promise.reject(new Error("Subtitle renderer has been destroyed."));
      if (global.SubtitlesOctopus) return Promise.resolve();

      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = resolveAssetUrl(settings.scriptUrl || DEFAULT_SCRIPT_URL);
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Unable to load libass WebAssembly renderer."));
        document.head.appendChild(script);
      });
    }

    function init(config) {
      rendererState.currentConfig = config || {};
      syncCanvasSize();
      drawFallbackSubtitle(rendererState.currentConfig);

      requestAnimationFrame(() => {
        syncCanvasSize();
        drawFallbackSubtitle(rendererState.currentConfig);
      });

      return ensureLibraryLoaded()
        .then(() => {
          if (rendererState.destroyed || !canvasElement || !global.SubtitlesOctopus) {
            drawFallbackSubtitle(config || rendererState.currentConfig || {});
            return;
          }

          if (rendererState.instance) {
            applyConfig(config);
            return;
          }

          const size = syncCanvasSize();
          const assDocument = buildAssDocument({
            ...config,
            width: size.pixelWidth || size.width || 1280,
            height: size.pixelHeight || size.height || 720
          });

          const workerUrl = resolveAssetUrl(settings.workerUrl || DEFAULT_WORKER_URL);
          const legacyWorkerUrl = resolveAssetUrl(settings.legacyWorkerUrl || DEFAULT_LEGACY_WORKER_URL);
          const fallbackFontUrl = resolveAssetUrl(settings.fallbackFont || "assets/libass/fonts/Roboto-Regular.woff2");

          rendererState.instance = new global.SubtitlesOctopus({
            canvas: canvasElement,
            subContent: assDocument,
            workerUrl,
            legacyWorkerUrl,
            fallbackFont: fallbackFontUrl,
            renderMode: settings.renderMode || "wasm-blend",
            onReady: () => {
              rendererState.ready = true;
              if (rendererState.pendingConfig) {
                applyConfig(rendererState.pendingConfig);
              } else {
                applyConfig(config);
              }
              requestAnimationFrame(() => {
                if (rendererState.instance && typeof rendererState.instance.setCurrentTime === "function") {
                  rendererState.instance.setCurrentTime(0);
                }
              });
            },
            onError: (error) => {
              rendererState.fallbackMode = true;
              drawFallbackSubtitle(config || rendererState.currentConfig || {});
              console.error("Subtitle renderer failed to initialize.", error);
              if (error && error.message) {
                console.error("Subtitle renderer error message:", error.message);
              }
              if (error && error.error) {
                console.error("Subtitle renderer underlying error:", error.error);
              }
            }
          });
        })
        .catch((error) => {
          console.error("Subtitle renderer could not be initialized.", error);
        });
    }

    function update(config) {
      const nextConfig = config || rendererState.currentConfig || {};
      rendererState.currentConfig = nextConfig;
      applyConfig(nextConfig);
    }

    function resize() {
      const size = syncCanvasSize();
      rendererState.lastSize = size;
      if (rendererState.instance && rendererState.ready && typeof rendererState.instance.resize === "function") {
        rendererState.instance.resize(size.width, size.height);
      }
      applyConfig(rendererState.currentConfig);
    }

    function destroy() {
      rendererState.destroyed = true;
      if (rendererState.instance && typeof rendererState.instance.freeTrack === "function") {
        rendererState.instance.freeTrack();
      }
    }

    return {
      init,
      update,
      resize,
      destroy,
      get ready() {
        return rendererState.ready;
      },
      get fallbackMode() {
        return rendererState.fallbackMode;
      }
    };
  }

  global.SubtitleRenderer = {
    create: createRenderer,
    drawAssStyleText
  };
})(window);
