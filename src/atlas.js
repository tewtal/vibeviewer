import { elements, setAtlasStatus } from "./dom.js";
import { state, atlasInteraction } from "./state.js";
import { TILE_SIZE, getBytesPerTile, DEFAULT_TILE_LAYOUT_ID, getTileLayoutConfig } from "./config.js";
import { drawTilesToCanvas } from "./tiles.js";
import { clamp, formatHex, getWheelDeltaPixels } from "./utils.js";
import { setOffset, adjustOffset } from "./viewer.js";

export function rebuildAtlasBase() {
  const totalTiles = getTotalTiles();
  if (!state.rom || totalTiles === 0) {
    state.atlas.baseCanvas = null;
    state.atlas.renderedTiles = 0;
    state.atlas.needsRebuild = false;
    return;
  }

  const offscreen = document.createElement("canvas");
  const { renderedTiles } = drawTilesToCanvas(offscreen, {
    startByte: 0,
    tileCount: totalTiles,
    tilesPerRow: state.atlas.tilesPerRow,
    zoom: 1,
    layout: getTileLayoutConfig(DEFAULT_TILE_LAYOUT_ID),
  });

  const baseWidth = offscreen.width;
  const baseHeight = offscreen.height;
  if (baseWidth > 0 && baseHeight > 0) {
    const maxWidth = 320;
    const maxHeight = 560;
    const scaleCandidate = Math.min(1, maxWidth / baseWidth, maxHeight / baseHeight);
    const minScale = 0.25;
    const safeScale = Number.isFinite(scaleCandidate) && scaleCandidate > 0 ? scaleCandidate : 1;
    state.atlas.scale = Math.max(minScale, safeScale);
  }

  state.atlas.baseCanvas = offscreen;
  state.atlas.renderedTiles = renderedTiles;
  state.atlas.needsRebuild = false;
}

function getTotalTiles() {
  if (!state.rom) return 0;
  const bytesPerTile = getBytesPerTile(state.format);
  return Math.floor(state.rom.byteLength / bytesPerTile);
}

export function paintAtlasBase() {
  const base = state.atlas.baseCanvas;
  const canvas = elements.atlasCanvas;
  const overlay = elements.atlasOverlay;
  const scale = state.atlas.scale;
  const width = base ? Math.max(1, Math.round(base.width * scale)) : 256;
  const height = base ? Math.max(1, Math.round(base.height * scale)) : 256;

  canvas.width = width;
  canvas.height = height;
  overlay.width = width;
  overlay.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  overlay.style.width = `${width}px`;
  overlay.style.height = `${height}px`;

  const atlasCtx = canvas.getContext("2d");
  atlasCtx.imageSmoothingEnabled = false;
  atlasCtx.clearRect(0, 0, width, height);
  if (base) {
    atlasCtx.drawImage(base, 0, 0, width, height);
  }

  const overlayCtx = overlay.getContext("2d");
  overlayCtx.imageSmoothingEnabled = false;
  overlayCtx.clearRect(0, 0, width, height);
}

export function drawAtlasHighlight() {
  const overlay = elements.atlasOverlay;
  if (!overlay.width || !overlay.height) {
    return;
  }

  const overlayCtx = overlay.getContext("2d");
  overlayCtx.imageSmoothingEnabled = false;
  overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

  if (!state.rom || state.atlas.renderedTiles === 0) {
    return;
  }

  const bytesPerTile = getBytesPerTile(state.format);
  const tileSize = Math.max(1, TILE_SIZE * state.atlas.scale);
  const columns = state.atlas.tilesPerRow;
  const startTile = Math.floor((state.offset + state.alignment) / bytesPerTile);
  const viewportTiles = Math.max(1, state.view.renderedTiles);
  const endTileExclusive = Math.min(startTile + viewportTiles, state.atlas.renderedTiles);

  const fillStyle = "rgba(111, 176, 255, 0.22)";
  const strokeStyle = "rgba(111, 176, 255, 0.9)";
  const lineWidth = Math.max(1, Math.round(tileSize / 2));

  overlayCtx.fillStyle = fillStyle;
  overlayCtx.strokeStyle = strokeStyle;
  overlayCtx.lineWidth = lineWidth;

  for (let tile = startTile; tile < endTileExclusive; ) {
    const row = Math.floor(tile / columns);
    const startCol = tile % columns;
    const rowEndTile = Math.min((row + 1) * columns, endTileExclusive);
    const tilesInRow = rowEndTile - tile;
    const x = startCol * tileSize;
    const y = row * tileSize;
    const width = tilesInRow * tileSize;
    const height = tileSize;

    overlayCtx.fillRect(x, y, width, height);
    overlayCtx.strokeRect(
      x + lineWidth / 2,
      y + lineWidth / 2,
      Math.max(width - lineWidth, lineWidth),
      Math.max(height - lineWidth, lineWidth),
    );

    tile = rowEndTile;
  }
}

export function syncAtlasScrollToHighlight() {
  if (!state.rom || state.atlas.renderedTiles === 0) {
    return;
  }

  const wrapper = elements.atlasWrapper;
  if (!wrapper) {
    return;
  }

  const tileSize = Math.max(1, TILE_SIZE * state.atlas.scale);
  const columns = state.atlas.tilesPerRow;
  const bytesPerTile = getBytesPerTile(state.format);
  const startTile = Math.floor((state.offset + state.alignment) / bytesPerTile);
  const viewportTiles = Math.max(1, state.view.renderedTiles);
  const endTileExclusive = Math.min(startTile + viewportTiles, state.atlas.renderedTiles);
  const startY = Math.floor(startTile / columns) * tileSize;
  const endY = Math.ceil(endTileExclusive / columns) * tileSize;
  const padding = Math.max(tileSize * 2, 32);
  const top = wrapper.scrollTop;
  const bottom = top + wrapper.clientHeight;
  const maxScrollTop = Math.max(0, wrapper.scrollHeight - wrapper.clientHeight);

  if (maxScrollTop <= 0 && top === 0) {
    return;
  }

  const needsScrollDown = endY > bottom - padding;
  const needsScrollUp = startY < top + padding;
  const highlightOutsideView = endY <= top || startY >= bottom;

  if (atlasInteraction.isUserScroll && !needsScrollDown && !needsScrollUp && !highlightOutsideView) {
    return;
  }

  let desiredScrollTop = top;
  if (needsScrollDown) {
    desiredScrollTop = clamp(endY - wrapper.clientHeight + padding, 0, maxScrollTop);
  } else if (needsScrollUp) {
    desiredScrollTop = clamp(startY - padding, 0, maxScrollTop);
  }

  if (desiredScrollTop !== top) {
    atlasInteraction.suppressScroll = true;
    wrapper.scrollTop = desiredScrollTop;
    window.requestAnimationFrame(() => {
      atlasInteraction.suppressScroll = false;
    });
  }
}

export function updateAtlasStatus() {
  if (!state.rom || state.atlas.renderedTiles === 0) {
    setAtlasStatus("Load a ROM to enable atlas navigation.");
    return;
  }

  const bytesPerTile = getBytesPerTile(state.format);
  const totalTiles = state.atlas.renderedTiles;
  const startTile = Math.floor((state.offset + state.alignment) / bytesPerTile);
  const viewportTiles = Math.max(1, state.view.renderedTiles);
  const endTile = Math.min(startTile + viewportTiles - 1, totalTiles - 1);
  const startHex = formatHex(startTile * bytesPerTile);
  const endHex = formatHex((endTile + 1) * bytesPerTile);
  const totalHex = formatHex(totalTiles * bytesPerTile);

  setAtlasStatus(
    `Viewport tiles 0x${startTile.toString(16).toUpperCase()}–0x${endTile
      .toString(16)
      .toUpperCase()} (${startHex}-${endHex}) of 0x${(totalTiles - 1)
      .toString(16)
      .toUpperCase()} (${totalHex}). Scroll the atlas or click to jump.`,
  );
}

export function renderAtlas({ forceRebuild = false } = {}) {
  if (!state.rom) {
    state.atlas.baseCanvas = null;
    state.atlas.renderedTiles = 0;
    state.atlas.needsRebuild = true;
    paintAtlasBase();
    drawAtlasHighlight();
    if (elements.atlasWrapper) {
      elements.atlasWrapper.scrollTop = 0;
    }
    updateAtlasStatus();
    return;
  }

  if (forceRebuild || state.atlas.needsRebuild || !state.atlas.baseCanvas) {
    rebuildAtlasBase();
    paintAtlasBase();
  }

  drawAtlasHighlight();
  updateAtlasStatus();
  syncAtlasScrollToHighlight();
}

export function createAtlasClickHandler({ onOffsetChanged }) {
  return (event) => {
    if (!state.rom || state.atlas.renderedTiles === 0) return;
    const rect = elements.atlasCanvas.getBoundingClientRect();
    const scaleX = elements.atlasCanvas.width / rect.width;
    const scaleY = elements.atlasCanvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    const tileSize = Math.max(1, TILE_SIZE * state.atlas.scale);
    const col = Math.floor(x / tileSize);
    const row = Math.floor(y / tileSize);
    if (col < 0 || row < 0) return;
    const tilesPerRow = state.atlas.tilesPerRow;
    const tileIndex = row * tilesPerRow + col;
    if (tileIndex >= state.atlas.renderedTiles) return;
    const bytesPerTile = getBytesPerTile(state.format);
    const targetOffset = clamp(tileIndex * bytesPerTile, 0, getMaxOffset());
    if (setOffset(targetOffset)) {
      onOffsetChanged();
    }
  };
}

export function createAtlasScrollHandler({ onOffsetChanged, onHighlightUpdated }) {
  return () => {
    if (atlasInteraction.suppressScroll || !state.rom || state.atlas.renderedTiles === 0) {
      return;
    }

    atlasInteraction.isUserScroll = true;
    window.clearTimeout(atlasInteraction.scrollTimeoutId);
    atlasInteraction.scrollTimeoutId = window.setTimeout(() => {
      atlasInteraction.isUserScroll = false;
    }, 150);

    atlasInteraction.wheelRowAccumulator = 0;

    if (atlasInteraction.pendingFrame) {
      return;
    }

    atlasInteraction.pendingFrame = true;
    window.requestAnimationFrame(() => {
      atlasInteraction.pendingFrame = false;
      if (!state.rom || state.atlas.renderedTiles === 0) {
        return;
      }
      const wrapper = elements.atlasWrapper;
      const tileSize = Math.max(1, TILE_SIZE * state.atlas.scale);
      if (tileSize <= 0) {
        return;
      }
      const tilesPerRow = state.atlas.tilesPerRow;
      const scrollCenter = wrapper.scrollTop + wrapper.clientHeight / 2;
      const centerRow = scrollCenter / tileSize;
      const targetTileIndex = Math.floor(centerRow) * tilesPerRow;
      const bytesPerTile = getBytesPerTile(state.format);
      const newOffset = clamp(targetTileIndex * bytesPerTile, 0, getMaxOffset());
      if (setOffset(newOffset)) {
        onOffsetChanged();
      } else {
        drawAtlasHighlight();
        updateAtlasStatus();
        if (onHighlightUpdated) {
          onHighlightUpdated();
        }
      }
    });
  };
}

export function createAtlasWheelHandler({ onOffsetChanged }) {
  return (event) => {
    if (!state.rom) return;

    const deltaPixels = getWheelDeltaPixels(event);
    if (deltaPixels === 0) {
      return;
    }

    const wrapper = elements.atlasWrapper;
    const tileSize = Math.max(1, TILE_SIZE * state.atlas.scale);
    if (tileSize <= 0) {
      return;
    }

    const previousScrollTop = wrapper.scrollTop;
    let scrollChanged = false;
    if (wrapper.scrollHeight > wrapper.clientHeight) {
      const maxScroll = Math.max(0, wrapper.scrollHeight - wrapper.clientHeight);
      const target = clamp(previousScrollTop + deltaPixels, 0, maxScroll);
      if (target !== previousScrollTop) {
        wrapper.scrollTop = target;
        scrollChanged = true;
      }
    }

    const previousAccumulator = atlasInteraction.wheelRowAccumulator;
    let accumulator = previousAccumulator + deltaPixels / tileSize;
    const wholeRows = accumulator > 0 ? Math.floor(accumulator) : Math.ceil(accumulator);

    let offsetChanged = false;
    if (wholeRows !== 0) {
      const previousOffset = state.offset;
      if (adjustOffset(wholeRows * state.atlas.tilesPerRow)) {
        offsetChanged = state.offset !== previousOffset;
        if (offsetChanged) {
          accumulator -= wholeRows;
          onOffsetChanged();
        } else {
          accumulator = previousAccumulator;
        }
      }
    }

    const consumed = scrollChanged || offsetChanged;

    if (consumed) {
      atlasInteraction.wheelRowAccumulator = accumulator;
      event.preventDefault();
      event.stopPropagation();
    } else if (wholeRows === 0) {
      atlasInteraction.wheelRowAccumulator = accumulator;
    } else {
      atlasInteraction.wheelRowAccumulator = 0;
    }
  };
}

function getMaxOffset() {
  if (!state.rom) return 0;
  const bytesPerTile = getBytesPerTile(state.format);
  return Math.max(0, state.rom.byteLength - bytesPerTile - state.alignment);
}
