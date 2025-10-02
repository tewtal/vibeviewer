import { editorCtx, elements } from "./dom.js";
import { state, getActivePalette, getDefaultPalette, markAtlasDirty } from "./state.js";
import { TILE_SIZE, EDITOR_CANVAS_SIZE, getBytesPerTile } from "./config.js";
import { clamp, formatHex, toRgb } from "./utils.js";
import { getTileDecoder, getTileEncoder, sanitizeTilePixels } from "./tiles.js";

export function ensureEditorSelection() {
  if (!state.rom || state.view.renderedTiles === 0) {
    state.editor.selectedTileIndex = null;
    state.editor.tilePixels = null;
    elements.fillTileBtn.disabled = true;
    elements.clearTileBtn.disabled = true;
    elements.copyTileBtn.disabled = true;
    elements.pasteTileBtn.disabled = state.editor.clipboard == null;
    elements.editorSummaryMeta.textContent = "No tile selected";
    return;
  }

  if (state.editor.selectedTileIndex == null || state.editor.selectedTileIndex >= state.view.renderedTiles) {
    state.editor.selectedTileIndex = 0;
    state.editor.tilePixels = null;
  }

  elements.fillTileBtn.disabled = false;
  elements.clearTileBtn.disabled = false;
  elements.copyTileBtn.disabled = false;
  elements.pasteTileBtn.disabled = state.editor.clipboard == null;
}

export function getSelectedTileByteOffset() {
  if (state.editor.selectedTileIndex == null) return null;
  const bytesPerTile = getBytesPerTile(state.format);
  const startByte = state.offset + state.alignment;
  const offset = startByte + state.editor.selectedTileIndex * bytesPerTile;
  if (offset + bytesPerTile > (state.rom?.byteLength ?? 0)) return null;
  return offset;
}

export function loadSelectedTilePixels() {
  const tileOffset = getSelectedTileByteOffset();
  if (tileOffset == null || !state.rom) {
    state.editor.tilePixels = null;
    return;
  }
  const decoder = getTileDecoder(state.format);
  state.editor.tilePixels = decoder(state.rom, tileOffset);
}

export function writeTilePixelsToRom(pixels) {
  const tileOffset = getSelectedTileByteOffset();
  if (tileOffset == null || !state.rom) return false;
  const sanitized = sanitizeTilePixels(pixels, state.format);
  const encoder = getTileEncoder(state.format);
  const encoded = encoder(sanitized);
  state.rom.set(encoded, tileOffset);
  markAtlasDirty();
  state.editor.tilePixels = sanitized;
  return true;
}

export function renderTileEditor() {
  editorCtx.clearRect(0, 0, elements.tileEditor.width, elements.tileEditor.height);
  const palette = getActivePalette();
  const fallbackPalette = getDefaultPalette(state.format);
  const paletteRgb = (palette.length > 0 ? palette : fallbackPalette).map(toRgb);
  if (!state.rom || state.editor.selectedTileIndex == null) {
    editorCtx.fillStyle = "rgba(255, 255, 255, 0.08)";
    editorCtx.font = "16px sans-serif";
    editorCtx.textAlign = "center";
    editorCtx.textBaseline = "middle";
    editorCtx.fillText("Select a tile", EDITOR_CANVAS_SIZE / 2, EDITOR_CANVAS_SIZE / 2);
    elements.fillTileBtn.disabled = true;
    elements.clearTileBtn.disabled = true;
    elements.copyTileBtn.disabled = true;
    elements.pasteTileBtn.disabled = state.editor.clipboard == null;
    elements.editorSummaryMeta.textContent = "No tile selected";
    return;
  }

  if (!state.editor.tilePixels) {
    loadSelectedTilePixels();
  }
  if (!state.editor.tilePixels) return;

  const pixelSize = Math.floor(EDITOR_CANVAS_SIZE / TILE_SIZE);

  for (let y = 0; y < TILE_SIZE; y += 1) {
    for (let x = 0; x < TILE_SIZE; x += 1) {
      const index = y * TILE_SIZE + x;
      const paletteIndex = state.editor.tilePixels[index];
      const [r, g, b] = paletteRgb[paletteIndex] ?? [0, 0, 0];
      if (paletteIndex === 0) {
        editorCtx.clearRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      } else {
        editorCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        editorCtx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }
  }

  editorCtx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  editorCtx.lineWidth = 1;
  for (let i = 0; i <= TILE_SIZE; i += 1) {
    const pos = i * pixelSize + 0.5;
    editorCtx.beginPath();
    editorCtx.moveTo(pos, 0);
    editorCtx.lineTo(pos, TILE_SIZE * pixelSize);
    editorCtx.stroke();
    editorCtx.beginPath();
    editorCtx.moveTo(0, pos);
    editorCtx.lineTo(TILE_SIZE * pixelSize, pos);
    editorCtx.stroke();
  }

  editorCtx.strokeStyle = "rgba(111, 176, 255, 0.9)";
  editorCtx.lineWidth = 2;
  editorCtx.strokeRect(1, 1, TILE_SIZE * pixelSize - 2, TILE_SIZE * pixelSize - 2);

  updateEditorPaletteSwatches();
}

export function updateEditorPaletteSwatches() {
  const paletteContainer = elements.editorPalette;
  if (!paletteContainer) return;
  paletteContainer.replaceChildren();

  if (!state.rom) {
    elements.fillTileBtn.disabled = true;
    elements.clearTileBtn.disabled = true;
    elements.copyTileBtn.disabled = true;
    elements.pasteTileBtn.disabled = state.editor.clipboard == null;
    elements.editorSummaryMeta.textContent = "No tile selected";
    return;
  }

  const palette = getActivePalette();
  const maxIndex = palette.length - 1;
  state.editor.activeColor = clamp(state.editor.activeColor, 0, Math.max(maxIndex, 0));

  palette.forEach((color, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.style.background = color;
    button.dataset.index = index.toString(10);
    button.className = index === state.editor.activeColor ? "active" : "";
    button.title = `Palette index ${index}`;
    button.textContent = "";
    button.addEventListener("click", () => {
      if (state.editor.activeColor === index) return;
      state.editor.activeColor = index;
      updateEditorPaletteSwatches();
    });
    paletteContainer.append(button);
  });

  const hasSelection = state.editor.selectedTileIndex != null;
  elements.fillTileBtn.disabled = !hasSelection;
  elements.clearTileBtn.disabled = !hasSelection;
  elements.copyTileBtn.disabled = !hasSelection;
  elements.pasteTileBtn.disabled = state.editor.clipboard == null || !hasSelection;

  if (hasSelection) {
    const byteOffset = getSelectedTileByteOffset();
    elements.editorSummaryMeta.textContent = byteOffset != null ? `Tile ${state.editor.selectedTileIndex} – ${formatHex(byteOffset)}` : "Tile out of range";
  } else {
    elements.editorSummaryMeta.textContent = "No tile selected";
  }
}

export function paintPixel(x, y, paletteIndex) {
  if (!state.editor.tilePixels) {
    loadSelectedTilePixels();
  }
  if (!state.editor.tilePixels) return false;
  const idx = y * TILE_SIZE + x;
  if (state.editor.tilePixels[idx] === paletteIndex) return false;
  state.editor.tilePixels[idx] = paletteIndex;
  return writeTilePixelsToRom(state.editor.tilePixels);
}

export function fillTileWithColor(paletteIndex) {
  if (!state.editor.tilePixels) {
    loadSelectedTilePixels();
  }
  if (!state.editor.tilePixels) return false;
  state.editor.tilePixels.fill(paletteIndex);
  return writeTilePixelsToRom(state.editor.tilePixels);
}

export function clearTile() {
  return fillTileWithColor(0);
}

export function copyTile() {
  if (!state.editor.tilePixels) {
    loadSelectedTilePixels();
  }
  if (!state.editor.tilePixels) return false;
  state.editor.clipboard = new Uint8Array(state.editor.tilePixels);
  elements.pasteTileBtn.disabled = false;
  return true;
}

export function pasteTile() {
  if (!state.editor.clipboard || state.editor.selectedTileIndex == null) return false;
  const pixels = new Uint8Array(state.editor.clipboard);
  return writeTilePixelsToRom(pixels);
}

export function setupEditorEvents({ onTileChange }) {
  const editorCanvas = elements.tileEditor;

  const applyPaintAtEvent = (event) => {
    if (!state.rom || state.editor.selectedTileIndex == null) return;
    const rect = editorCanvas.getBoundingClientRect();
    const scaleX = editorCanvas.width / rect.width;
    const scaleY = editorCanvas.height / rect.height;
    const canvasX = (event.clientX - rect.left) * scaleX;
    const canvasY = (event.clientY - rect.top) * scaleY;
    const pixelSize = Math.floor(EDITOR_CANVAS_SIZE / TILE_SIZE);
    const x = clamp(Math.floor(canvasX / pixelSize), 0, TILE_SIZE - 1);
    const y = clamp(Math.floor(canvasY / pixelSize), 0, TILE_SIZE - 1);
    if (paintPixel(x, y, state.editor.activeColor)) {
      renderTileEditor();
      onTileChange();
    }
  };

  editorCanvas.addEventListener("pointerdown", (event) => {
    if (!state.rom || state.editor.selectedTileIndex == null) return;
    editorCanvas.setPointerCapture(event.pointerId);
    state.editor.isPainting = true;
    applyPaintAtEvent(event);
  });

  editorCanvas.addEventListener("pointermove", (event) => {
    if (!state.editor.isPainting) return;
    applyPaintAtEvent(event);
  });

  const finishPaint = (event) => {
    if (state.editor.isPainting) {
      state.editor.isPainting = false;
      editorCanvas.releasePointerCapture(event.pointerId);
    }
  };

  editorCanvas.addEventListener("pointerup", finishPaint);
  editorCanvas.addEventListener("pointerleave", () => {
    state.editor.isPainting = false;
  });

  elements.fillTileBtn.addEventListener("click", () => {
    if (state.editor.selectedTileIndex == null) return;
    if (fillTileWithColor(state.editor.activeColor)) {
      renderTileEditor();
      onTileChange();
    }
  });

  elements.clearTileBtn.addEventListener("click", () => {
    if (state.editor.selectedTileIndex == null) return;
    if (clearTile()) {
      renderTileEditor();
      onTileChange();
    }
  });

  elements.copyTileBtn.addEventListener("click", () => {
    if (state.editor.selectedTileIndex == null) return;
    copyTile();
  });

  elements.pasteTileBtn.addEventListener("click", () => {
    if (state.editor.selectedTileIndex == null) return;
    if (pasteTile()) {
      renderTileEditor();
      onTileChange();
    }
  });
}
