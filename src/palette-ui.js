import { elements, setStatus } from "./dom.js";
import { state, ensurePaletteSet, setActivePaletteIndex, markAtlasDirty } from "./state.js";
import { getPaletteConfig, getFormatDisplayName } from "./config.js";
import {
  normalizePaletteSet,
  cloneDefaultPaletteSet,
  hexToNesIndex,
  hexToSnesWord,
  nesIndexToHex,
  snesWordToHex,
} from "./palette-data.js";
import { downloadBlob, normalizeHexColor } from "./utils.js";
import { updateEditorPaletteSwatches } from "./editor.js";
import { requestRender } from "./render.js";

export function highlightActivePaletteStrip(format) {
  const editor = elements.paletteEditor;
  if (!editor) return;
  editor.querySelectorAll(".palette-strip").forEach((strip) => {
    const idx = Number.parseInt(strip.dataset.paletteIndex ?? "-1", 10);
    const isActive = idx === state.activePaletteIndex[format];
    strip.classList.toggle("active", isActive);
    strip.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

export function activatePaletteStrip(format, paletteIndex) {
  const changed = setActivePaletteIndex(format, paletteIndex);
  highlightActivePaletteStrip(format);
  if (!changed) return;
  markAtlasDirty();
  updateEditorPaletteSwatches();
  requestRender();
}

export function updatePaletteEditor() {
  const editor = elements.paletteEditor;
  if (!editor) return;

  const format = state.format;
  const palettes = ensurePaletteSet(format);
  const config = getPaletteConfig(format);
  state.editor.activeColor = Math.min(state.editor.activeColor, Math.max(config.colorsPerPalette - 1, 0));
  const activeIndex = Math.min(state.activePaletteIndex[format] ?? 0, Math.max(config.paletteCount - 1, 0));
  state.activePaletteIndex[format] = activeIndex;

  const paletteInfo = `${config.paletteCount}×${config.colorsPerPalette}`;
  let exportJsonLabel = `Export JSON (${paletteInfo})`;
  let importJsonLabel = `Import JSON (${paletteInfo})`;
  let exportRawLabel = "Export console format";
  let importRawLabel = "Import console format";
  let hintText = `${getFormatDisplayName(format)}: ${config.paletteCount} palettes × ${config.colorsPerPalette} colors. Click a strip to activate it. Color 0 is treated as transparent.`;

  switch (format) {
    case "nes":
      exportRawLabel = "Export NES PPU";
      importRawLabel = "Import NES PPU";
      hintText = "NES: 8 palettes × 4 colors. Click a strip to activate it. Color 0 is treated as transparent.";
      break;
    case "snes2bpp":
      exportRawLabel = "Export SNES CGRAM (2bpp)";
      importRawLabel = "Import SNES CGRAM (2bpp)";
      hintText = "SNES/GB 2bpp: 16 palettes × 4 colors. Click a strip to activate it. Color 0 is treated as transparent.";
      break;
    case "snes":
    default:
      exportRawLabel = "Export SNES CGRAM";
      importRawLabel = "Import SNES CGRAM";
      exportJsonLabel = `Export JSON (${paletteInfo})`;
      importJsonLabel = `Import JSON (${paletteInfo})`;
      hintText = "SNES 4bpp: 16 palettes × 16 colors. Click a strip to activate it. Color 0 is treated as transparent.";
      break;
  }

  if (elements.paletteExportJsonBtn) {
    elements.paletteExportJsonBtn.textContent = exportJsonLabel;
  }
  if (elements.paletteExportRawBtn) {
    elements.paletteExportRawBtn.textContent = exportRawLabel;
  }
  if (elements.paletteImportJsonLabelText) {
    elements.paletteImportJsonLabelText.textContent = importJsonLabel;
  }
  if (elements.paletteImportRawLabelText) {
    elements.paletteImportRawLabelText.textContent = importRawLabel;
  }
  if (elements.paletteHintText) {
    elements.paletteHintText.textContent = hintText;
  }

  const fragment = document.createDocumentFragment();

  palettes.forEach((palette, paletteIndex) => {
    const strip = document.createElement("div");
    strip.className = "palette-strip";
    strip.dataset.paletteIndex = String(paletteIndex);
    strip.tabIndex = 0;
    strip.setAttribute("role", "button");
    strip.setAttribute("aria-label", `Palette ${paletteIndex.toString(16).toUpperCase()}`);
    strip.setAttribute("aria-pressed", paletteIndex === activeIndex ? "true" : "false");

    const colorsContainer = document.createElement("div");
    colorsContainer.className = "palette-strip-colors";

    const label = document.createElement("span");
    label.className = "palette-strip-label";
    label.textContent = paletteIndex.toString(16).toUpperCase();
    label.setAttribute("aria-hidden", "true");

    strip.addEventListener("click", (event) => {
      if (event.target instanceof HTMLInputElement && event.target.type === "color") {
        activatePaletteStrip(format, paletteIndex);
        return;
      }
      activatePaletteStrip(format, paletteIndex);
    });

    strip.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activatePaletteStrip(format, paletteIndex);
      }
    });

    palette.forEach((color, colorIndex) => {
      const normalized = normalizeHexColor(color);
      palette[colorIndex] = normalized;

      const cell = document.createElement("label");
      cell.className = "palette-color-cell";
      cell.dataset.colorIndex = String(colorIndex);

      const input = document.createElement("input");
      input.type = "color";
      input.className = "palette-color-input";
      input.value = normalized;
      input.dataset.paletteIndex = String(paletteIndex);
      input.dataset.colorIndex = String(colorIndex);
      input.addEventListener("input", (event) => {
        const target = event.target;
        const pIndex = Number.parseInt(target.dataset.paletteIndex ?? "0", 10);
        const cIndex = Number.parseInt(target.dataset.colorIndex ?? "0", 10);
        if (Number.isNaN(pIndex) || Number.isNaN(cIndex)) return;
        const value = normalizeHexColor(target.value);
        palettes[pIndex][cIndex] = value;
        target.value = value;
        if (setActivePaletteIndex(format, pIndex)) {
          highlightActivePaletteStrip(format);
          updateEditorPaletteSwatches();
        }
        markAtlasDirty();
        requestRender();
      });

      const indexLabel = document.createElement("span");
      indexLabel.className = "palette-color-index";
      indexLabel.textContent = colorIndex.toString(16).toUpperCase();

      cell.append(input, indexLabel);
      colorsContainer.append(cell);
    });

    strip.append(label, colorsContainer);
    fragment.append(strip);
  });

  editor.replaceChildren(fragment);
  highlightActivePaletteStrip(format);

  const hasPalette = Boolean(state.rom);
  elements.paletteExportJsonBtn.disabled = !hasPalette;
  elements.paletteExportRawBtn.disabled = !hasPalette;

  updateEditorPaletteSwatches();
}

export function exportPaletteJson() {
  if (!state.rom) return;
  const format = state.format;
  const config = getPaletteConfig(format);
  const palettes = ensurePaletteSet(format).map((palette) => palette.map((color) => normalizeHexColor(color)));
  const payload = {
    source: "VibeViewer",
    format,
    paletteCount: config.paletteCount,
    colorsPerPalette: config.colorsPerPalette,
    activePaletteIndex: Math.min(state.activePaletteIndex[format] ?? 0, Math.max(config.paletteCount - 1, 0)),
    palettes,
    timestamp: new Date().toISOString(),
  };
  const baseName = state.filename ? state.filename.replace(/\.[^/.]+$/u, "") : "palette";
  downloadBlob(JSON.stringify(payload, null, 2), `${baseName}-${format}-palettes.json`, "application/json");
}

export function exportPaletteRaw() {
  if (!state.rom) return;
  const format = state.format;
  const palettes = ensurePaletteSet(format);
  const baseName = state.filename ? state.filename.replace(/\.[^/.]+$/u, "") : "palette";

  if (format === "nes") {
    const config = getPaletteConfig("nes");
    const bytes = new Uint8Array(config.paletteCount * config.colorsPerPalette);
    let offset = 0;
    palettes.forEach((palette) => {
      palette.forEach((color) => {
        bytes[offset] = hexToNesIndex(color) & 0x3f;
        offset += 1;
      });
    });
    downloadBlob(bytes, `${baseName}-nes-palettes.pal`);
    return;
  }

  if (format === "snes" || format === "snes2bpp") {
    const config = getPaletteConfig(format);
    const buffer = new ArrayBuffer(config.paletteCount * config.colorsPerPalette * 2);
    const view = new DataView(buffer);
    let offset = 0;
    palettes.forEach((palette) => {
      palette.forEach((color) => {
        view.setUint16(offset, hexToSnesWord(color), true);
        offset += 2;
      });
    });
    const suffix = format === "snes2bpp" ? "snes2bpp" : "snes";
    downloadBlob(buffer, `${baseName}-${suffix}-cgram.bin`);
    return;
  }

  console.warn(`Unsupported palette export for format: ${format}`);
}

export function decodeNesPaletteSet(buffer) {
  const config = getPaletteConfig("nes");
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const expectedLength = config.paletteCount * config.colorsPerPalette;
  if (bytes.length !== expectedLength) {
    throw new Error(`Expected ${expectedLength} bytes for NES palette set, received ${bytes.length}`);
  }
  const palettes = [];
  for (let paletteIndex = 0; paletteIndex < config.paletteCount; paletteIndex += 1) {
    const palette = [];
    const baseOffset = paletteIndex * config.colorsPerPalette;
    for (let colorIndex = 0; colorIndex < config.colorsPerPalette; colorIndex += 1) {
      const value = bytes[baseOffset + colorIndex] & 0x3f;
      palette.push(nesIndexToHex(value));
    }
    palettes.push(palette);
  }
  return palettes;
}

export function decodeSnesPaletteSet(buffer, format = "snes") {
  const config = getPaletteConfig(format);
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const expectedLength = config.paletteCount * config.colorsPerPalette * 2;
  if (bytes.length !== expectedLength) {
    throw new Error(`Expected ${expectedLength} bytes for SNES CGRAM dump, received ${bytes.length}`);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const palettes = [];
  let offset = 0;
  for (let paletteIndex = 0; paletteIndex < config.paletteCount; paletteIndex += 1) {
    const palette = [];
    for (let colorIndex = 0; colorIndex < config.colorsPerPalette; colorIndex += 1) {
      const word = view.getUint16(offset, true);
      offset += 2;
      palette.push(snesWordToHex(word));
    }
    palettes.push(palette);
  }
  return palettes;
}

export function importPaletteJson(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      if (!payload || !Array.isArray(payload.palettes)) {
        throw new Error("Invalid palette payload");
      }
      const payloadFormat = typeof payload.format === "string" && getPaletteConfig(payload.format) ? payload.format : state.format;
      const normalized = normalizePaletteSet(payloadFormat, payload.palettes);
      state.paletteSets[payloadFormat] = normalized;
      const config = getPaletteConfig(payloadFormat);
      const incomingIndex = typeof payload.activePaletteIndex === "number" ? payload.activePaletteIndex : state.activePaletteIndex[payloadFormat];
      state.activePaletteIndex[payloadFormat] = Math.min(incomingIndex ?? 0, Math.max(config.paletteCount - 1, 0));
      if (payloadFormat === state.format) {
        markAtlasDirty();
        updatePaletteEditor();
        requestRender();
      }
      setStatus(`${getFormatDisplayName(payloadFormat)} palette JSON imported.`);
    } catch (error) {
      console.error("Failed to import palette JSON", error);
      setStatus("Palette JSON import failed. Check console for details.");
    }
  };
  reader.onerror = () => {
    console.error("Failed to read palette JSON", reader.error);
    setStatus("Palette JSON import failed. Check console for details.");
  };
  reader.readAsText(file, "utf-8");
}

export function importPaletteRaw(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const format = state.format;
      const buffer = new Uint8Array(reader.result);
      let palettes;
      if (format === "nes") {
        palettes = decodeNesPaletteSet(buffer);
      } else if (format === "snes" || format === "snes2bpp") {
        palettes = decodeSnesPaletteSet(buffer, format);
      } else {
        throw new Error(`Unsupported palette import format: ${format}`);
      }
      state.paletteSets[format] = normalizePaletteSet(format, palettes);
      const config = getPaletteConfig(format);
      state.activePaletteIndex[format] = Math.min(state.activePaletteIndex[format] ?? 0, Math.max(config.paletteCount - 1, 0));
      markAtlasDirty();
      updatePaletteEditor();
      requestRender();
      setStatus(`${getFormatDisplayName(format)} console palette imported.`);
    } catch (error) {
      console.error("Failed to import console palette", error);
      setStatus("Palette console import failed. Check console for details.");
    }
  };
  reader.onerror = () => {
    console.error("Failed to read palette data", reader.error);
    setStatus("Palette console import failed. Check console for details.");
  };
  reader.readAsArrayBuffer(file);
}

export function resetPalettes() {
  state.paletteSets.nes = cloneDefaultPaletteSet("nes");
  state.paletteSets.snes2bpp = cloneDefaultPaletteSet("snes2bpp");
  state.paletteSets.snes = cloneDefaultPaletteSet("snes");
}
