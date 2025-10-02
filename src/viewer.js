import { elements } from "./dom.js";
import { state, viewInteraction } from "./state.js";
import { TILE_SIZE, getBytesPerTile } from "./config.js";
import { clamp, formatHex, getWheelDeltaPixels, parseOffset } from "./utils.js";
import { gridPositionToTileIndex } from "./layout.js";
import { renderTileEditor, updateEditorPaletteSwatches, loadSelectedTilePixels } from "./editor.js";

export function getMaxOffset() {
  if (!state.rom) return 0;
  const bytesPerTile = getBytesPerTile(state.format);
  return Math.max(0, state.rom.byteLength - bytesPerTile - state.alignment);
}

export function setOffset(newOffset) {
  if (!state.rom) {
    const clamped = Math.max(0, newOffset);
    if (clamped === state.offset) return false;
    state.offset = clamped;
    elements.offsetInput.value = formatHex(state.offset);
    return true;
  }
  const maxOffset = getMaxOffset();
  const clampedOffset = clamp(newOffset, 0, maxOffset);
  if (clampedOffset === state.offset) {
    return false;
  }
  state.offset = clampedOffset;
  elements.offsetInput.value = formatHex(state.offset);
  return true;
}

export function adjustOffset(deltaTiles) {
  if (!state.rom || deltaTiles === 0) return false;
  const bytesPerTile = getBytesPerTile(state.format);
  const newOffset = state.offset + deltaTiles * bytesPerTile;
  return setOffset(newOffset);
}

export function clampOffsetWithinBounds() {
  if (!state.rom) return;
  const maxOffset = getMaxOffset();
  const clampedOffset = clamp(state.offset, 0, maxOffset);
  if (clampedOffset !== state.offset) {
    state.offset = clampedOffset;
    elements.offsetInput.value = formatHex(state.offset);
  }
}

export function handleOffsetCommit() {
  const parsed = parseOffset(elements.offsetInput.value);
  if (Number.isNaN(parsed)) {
    elements.offsetInput.value = formatHex(state.offset);
    return false;
  }

  if (!state.rom) {
    const changed = setOffset(Math.max(0, parsed));
    elements.offsetInput.value = formatHex(state.offset);
    return changed;
  }

  const changed = setOffset(parsed);
  elements.offsetInput.value = formatHex(state.offset);
  return changed;
}

export function selectTile(index) {
  if (!state.rom || index == null) return false;
  if (index < 0 || index >= state.view.renderedTiles) return false;
  if (state.editor.selectedTileIndex === index) return false;
  state.editor.selectedTileIndex = index;
  state.editor.tilePixels = null;
  loadSelectedTilePixels();
  renderTileEditor();
  updateEditorPaletteSwatches();
  return true;
}

export function createCanvasWheelHandler({ onOffsetChanged }) {
  return (event) => {
    if (!state.rom) return;
    event.preventDefault();
    event.stopPropagation();

    const deltaPixels = getWheelDeltaPixels(event);
    if (deltaPixels === 0) {
      return;
    }

    const tileSize = Math.max(1, TILE_SIZE * state.zoom);
    const rowsDelta = deltaPixels / tileSize;
    const accumulatedRows = viewInteraction.wheelRowAccumulator + rowsDelta;
    const wholeRows = accumulatedRows > 0 ? Math.floor(accumulatedRows) : Math.ceil(accumulatedRows);
    viewInteraction.wheelRowAccumulator = accumulatedRows - wholeRows;

    if (wholeRows !== 0) {
      const rowStride = Math.max(1, state.view.rowStride ?? state.view.tilesPerRow ?? 1);
      if (adjustOffset(wholeRows * rowStride)) {
        onOffsetChanged();
      }
    }
  };
}

export function createCanvasClickHandler({ onTileSelected }) {
  return (event) => {
    if (!state.rom || state.view.renderedTiles === 0) return;
    const rect = elements.canvas.getBoundingClientRect();
    const scaleX = elements.canvas.width / rect.width;
    const scaleY = elements.canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    const tilePixelSize = TILE_SIZE * state.zoom;
    const col = Math.floor(x / tilePixelSize);
    const row = Math.floor(y / tilePixelSize);
    if (col < 0 || row < 0) return;
    const maxCols = Math.max(1, state.view.tileColumns ?? state.view.tilesPerRow ?? 1);
    const maxRows = Math.max(1, state.view.tileRows ?? 1);
    if (col >= maxCols || row >= maxRows) return;
    const tileIndex = gridPositionToTileIndex(col, row);
    if (tileIndex >= state.view.renderedTiles) return;
    if (selectTile(tileIndex)) {
      onTileSelected();
    }
  };
}
