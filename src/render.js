import { ctx, elements, setStatus } from "./dom.js";
import { state, markAtlasDirty } from "./state.js";
import { TILE_SIZE, getBytesPerTile } from "./config.js";
import { getCurrentTileLayout, tileIndexToGridPosition } from "./layout.js";
import { drawTilesToCanvas } from "./tiles.js";
import { ensureEditorSelection, renderTileEditor, updateEditorPaletteSwatches } from "./editor.js";
import { renderAtlas } from "./atlas.js";
import { formatHex } from "./utils.js";

let scheduledRender = false;

export function requestRender({ forceAtlas = false } = {}) {
  if (forceAtlas) {
    markAtlasDirty();
  }
  if (scheduledRender) return;
  scheduledRender = true;
  window.requestAnimationFrame(() => {
    scheduledRender = false;
    renderTiles();
  });
}

export function renderTiles() {
  if (!state.rom) {
    ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
    setStatus("Load a ROM to begin.");
    elements.exportBtn.disabled = true;
    elements.saveRomBtn.disabled = true;
    elements.paletteExportJsonBtn.disabled = true;
    elements.paletteExportRawBtn.disabled = true;
    const layout = getCurrentTileLayout();
    state.view.renderedTiles = 0;
    state.view.tilesPerRow = state.tilesPerRow * layout.tilesWide;
    state.view.tileColumns = state.view.tilesPerRow;
    state.view.tileRows = layout.tilesHigh;
    state.view.blockColumns = state.tilesPerRow;
    state.view.blockRows = 1;
    state.view.tilesPerBlock = layout.tilesPerBlock;
    state.view.rowStride = layout.tilesPerBlock;
    state.view.layoutId = layout.id;
    state.editor.selectedTileIndex = null;
    state.editor.tilePixels = null;
    renderAtlas();
    renderTileEditor();
    updateEditorPaletteSwatches();
    return;
  }

  elements.exportBtn.disabled = false;
  elements.saveRomBtn.disabled = false;
  elements.paletteExportJsonBtn.disabled = false;
  elements.paletteExportRawBtn.disabled = false;

  const bytesPerTile = getBytesPerTile(state.format);
  const startByte = state.offset + state.alignment;
  const availableBytes = Math.max(state.rom.byteLength - startByte, 0);

  if (availableBytes < bytesPerTile) {
    drawTilesToCanvas(elements.canvas, {
      startByte,
      tileCount: 0,
      tilesPerRow: state.tilesPerRow,
      zoom: state.zoom,
      layout: getCurrentTileLayout(),
    });
    setStatus("Offset does not contain a full tile. Adjust the offset or alignment.");
    elements.exportBtn.disabled = true;
    elements.paletteExportJsonBtn.disabled = true;
    elements.paletteExportRawBtn.disabled = true;
    const layout = getCurrentTileLayout();
    state.view.renderedTiles = 0;
    state.view.tilesPerRow = state.tilesPerRow * layout.tilesWide;
    state.view.tileColumns = state.view.tilesPerRow;
    state.view.tileRows = layout.tilesHigh;
    state.view.blockColumns = state.tilesPerRow;
    state.view.blockRows = 1;
    state.view.tilesPerBlock = layout.tilesPerBlock;
    state.view.rowStride = layout.tilesPerBlock;
    state.view.layoutId = layout.id;
    renderAtlas();
    renderTileEditor();
    updateEditorPaletteSwatches();
    return;
  }

  const maxTiles = Math.max(1, Math.floor(availableBytes / bytesPerTile));
  const tileCount = clamp(state.tileCount, 1, maxTiles);
  const tilesPerRow = clamp(state.tilesPerRow, 1, Math.max(1, tileCount));
  const layout = getCurrentTileLayout();

  const {
    renderedTiles,
    blockColumns,
    blockRows,
    tileColumns,
    tileRows,
    tilesPerBlock,
    layoutId,
    rowStride,
  } = drawTilesToCanvas(elements.canvas, {
    startByte,
    tileCount,
    tilesPerRow,
    zoom: state.zoom,
    layout,
  });

  state.view.renderedTiles = renderedTiles;
  state.view.tilesPerRow = tileColumns;
  state.view.tileColumns = tileColumns;
  state.view.tileRows = tileRows;
  state.view.blockColumns = blockColumns;
  state.view.blockRows = blockRows;
  state.view.tilesPerBlock = tilesPerBlock;
  state.view.rowStride = Math.max(1, rowStride);
  state.view.layoutId = layoutId;

  const startHex = formatHex(startByte);
  const endByte = startByte + renderedTiles * bytesPerTile;
  setStatus(`Showing ${renderedTiles} tile${renderedTiles !== 1 ? "s" : ""} from ${startHex} to ${formatHex(endByte)}.`);

  ensureEditorSelection();
  drawTileGridOverlay();
  renderTileEditor();
  renderAtlas();
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function drawTileGridOverlay() {
  if (!state.rom || state.view.renderedTiles === 0) return;
  const tileColumns = Math.max(1, state.view.tileColumns ?? state.view.tilesPerRow ?? 1);
  const tileRows = Math.max(1, state.view.tileRows ?? Math.ceil(state.view.renderedTiles / tileColumns));
  const tilePixelSize = TILE_SIZE * state.zoom;
  const width = tileColumns * tilePixelSize;
  const height = tileRows * tilePixelSize;
  const canvasCtx = elements.canvas.getContext("2d");

  canvasCtx.save();
  canvasCtx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  canvasCtx.lineWidth = 1;

  for (let col = 0; col <= tileColumns; col += 1) {
    const x = Math.floor(col * tilePixelSize) + 0.5;
    canvasCtx.beginPath();
    canvasCtx.moveTo(x, 0);
    canvasCtx.lineTo(x, height);
    canvasCtx.stroke();
  }

  for (let row = 0; row <= tileRows; row += 1) {
    const y = Math.floor(row * tilePixelSize) + 0.5;
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, y);
    canvasCtx.lineTo(width, y);
    canvasCtx.stroke();
  }

  if (state.editor.selectedTileIndex != null) {
    const index = state.editor.selectedTileIndex;
    if (index < state.view.renderedTiles) {
      const { col: selCol, row: selRow } = tileIndexToGridPosition(index);
      canvasCtx.strokeStyle = "rgba(111, 176, 255, 0.9)";
      canvasCtx.lineWidth = Math.max(2, Math.floor(tilePixelSize * 0.05));
      canvasCtx.strokeRect(
        selCol * tilePixelSize + canvasCtx.lineWidth / 2,
        selRow * tilePixelSize + canvasCtx.lineWidth / 2,
        tilePixelSize - canvasCtx.lineWidth,
        tilePixelSize - canvasCtx.lineWidth,
      );
    }
  }

  canvasCtx.restore();
}
