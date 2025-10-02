const TILE_SIZE = 8;
const BYTES_PER_TILE = {
  nes: 16,
  snes: 32,
};

const defaultPalettes = {
  nes: ["#000000", "#5465ff", "#9a48d0", "#f1f6f9"],
  snes: [
    "#000000", "#1c1e26", "#323a56", "#5368b2",
    "#6ba4ff", "#9bdff5", "#eef8ff", "#ffb4cd",
    "#ff6f91", "#d2246b", "#93287c", "#4c2269",
    "#a1ff70", "#00c853", "#00695c", "#ffffff",
  ],
};

const PALETTE_SET_COUNT = 3;

function createPaletteSets(basePalette) {
  return Array.from({ length: PALETTE_SET_COUNT }, () => [...basePalette]);
}

const state = {
  rom: null,
  format: "nes",
  offset: 0,
  alignment: 0,
  tileCount: 512,
  tilesPerRow: 16,
  zoom: 4,
  paletteSets: {
    nes: createPaletteSets(defaultPalettes.nes),
    snes: createPaletteSets(defaultPalettes.snes),
  },
  activePaletteIndex: {
    nes: 0,
    snes: 0,
  },
  filename: "",
  atlas: {
    tilesPerRow: 64,
    scale: 0.5,
    baseCanvas: null,
    renderedTiles: 0,
    needsRebuild: true,
  },
  view: {
    renderedTiles: 0,
    tilesPerRow: 16,
  },
};

const elements = {
  romInput: document.querySelector("#rom-input"),
  fileLoader: document.querySelector("#file-loader"),
  fileStatus: document.querySelector("#file-status"),
  offsetInput: document.querySelector("#offset-input"),
  tileCountInput: document.querySelector("#tile-count-input"),
  tilesPerRowInput: document.querySelector("#tiles-per-row-input"),
  zoomInput: document.querySelector("#zoom-input"),
  zoomValue: document.querySelector("#zoom-value"),
  alignmentInput: document.querySelector("#alignment-input"),
  alignmentValue: document.querySelector("#alignment-value"),
  formatRadios: document.querySelectorAll('input[name="format"]'),
  paletteSetSwitch: document.querySelector("#palette-set-switch"),
  paletteEditor: document.querySelector("#palette-editor"),
  canvas: document.querySelector("#tile-canvas"),
  status: document.querySelector("#tile-status"),
  exportBtn: document.querySelector("#export-png-btn"),
  atlasCanvas: document.querySelector("#atlas-canvas"),
  atlasOverlay: document.querySelector("#atlas-overlay"),
  atlasWrapper: document.querySelector(".atlas-wrapper"),
  atlasStatus: document.querySelector("#atlas-status"),
};

elements.exportBtn.disabled = true;

const ctx = elements.canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const atlasInteraction = {
  suppressScroll: false,
  isUserScroll: false,
  scrollTimeoutId: null,
  pendingFrame: false,
  wheelRowAccumulator: 0,
};

const viewInteraction = {
  wheelRowAccumulator: 0,
};

const DELTA_PIXEL = 0;
const DELTA_LINE = 1;
const DELTA_PAGE = 2;
const WHEEL_LINE_HEIGHT = 16;

function parseOffset(value) {
  if (typeof value !== "string") return NaN;
  const trimmed = value.trim();
  if (!trimmed) return NaN;
  if (trimmed.startsWith("0x")) {
    return Number.parseInt(trimmed, 16);
  }
  if (/^\d+$/u.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }
  if (/^[0-9a-fA-F]+$/u.test(trimmed)) {
    return Number.parseInt(trimmed, 16);
  }
  return NaN;
}

function formatHex(value) {
  return `0x${Math.max(0, value >>> 0).toString(16).toUpperCase()}`;
}

function toRgb(color) {
  const hex = color.replace(/^#/u, "");
  if (hex.length === 3) {
    const r = Number.parseInt(hex[0] + hex[0], 16);
    const g = Number.parseInt(hex[1] + hex[1], 16);
    const b = Number.parseInt(hex[2] + hex[2], 16);
    return [r, g, b];
  }
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return [r, g, b];
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getActivePalette(format = state.format) {
  const sets = state.paletteSets[format] ?? [];
  const index = clamp(state.activePaletteIndex[format] ?? 0, 0, Math.max(sets.length - 1, 0));
  state.activePaletteIndex[format] = index;
  return sets[index] ?? [];
}

function markAtlasDirty() {
  state.atlas.needsRebuild = true;
}

function getBytesPerTile() {
  return BYTES_PER_TILE[state.format];
}

function getTotalTiles() {
  if (!state.rom) return 0;
  const bytesPerTile = getBytesPerTile();
  return Math.floor(state.rom.byteLength / bytesPerTile);
}

function setStatus(message) {
  elements.status.textContent = message;
}

function setAtlasStatus(message) {
  elements.atlasStatus.textContent = message;
}

function updatePaletteEditor() {
  const switchContainer = elements.paletteSetSwitch;
  const editor = elements.paletteEditor;
  if (!switchContainer || !editor) return;

  const format = state.format;
  const sets = state.paletteSets[format] ?? [];
  const activeIndex = clamp(state.activePaletteIndex[format] ?? 0, 0, Math.max(sets.length - 1, 0));
  state.activePaletteIndex[format] = activeIndex;

  switchContainer.replaceChildren();
  sets.forEach((_, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `palette-set-btn${index === activeIndex ? " active" : ""}`;
    button.dataset.index = String(index);
    button.textContent = `Set ${index + 1}`;
    button.addEventListener("click", () => {
      if (state.activePaletteIndex[format] === index) return;
      state.activePaletteIndex[format] = index;
      markAtlasDirty();
      updatePaletteEditor();
      renderTiles();
    });
    switchContainer.append(button);
  });

  const palette = sets[activeIndex] ?? [];
  const paletteFragment = document.createDocumentFragment();

  palette.forEach((color, index) => {
    const row = document.createElement("div");
    row.className = "palette-row";

    const indexLabel = document.createElement("span");
    indexLabel.textContent = index.toString(16).toUpperCase();

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = color;
    colorInput.dataset.index = String(index);
    colorInput.addEventListener("input", (event) => {
      const target = event.target;
      const idx = Number.parseInt(target.dataset.index ?? "0", 10);
      if (Number.isNaN(idx)) return;
      palette[idx] = target.value;
      markAtlasDirty();
      renderTiles();
    });

    row.append(indexLabel, colorInput);
    paletteFragment.append(row);
  });

  editor.replaceChildren(paletteFragment);
}

function decodeNesTile(data, offset) {
  const pixels = new Uint8Array(TILE_SIZE * TILE_SIZE);
  for (let row = 0; row < TILE_SIZE; row += 1) {
    const plane0 = data[offset + row];
    const plane1 = data[offset + row + 8];
    for (let col = 0; col < TILE_SIZE; col += 1) {
      const shift = 7 - col;
      const bit0 = (plane0 >> shift) & 1;
      const bit1 = (plane1 >> shift) & 1;
      pixels[row * TILE_SIZE + col] = (bit1 << 1) | bit0;
    }
  }
  return pixels;
}

function decodeSnesTile(data, offset) {
  const pixels = new Uint8Array(TILE_SIZE * TILE_SIZE);
  for (let row = 0; row < TILE_SIZE; row += 1) {
    const base = offset + row * 2;
    const plane0 = data[base];
    const plane1 = data[base + 1];
    const plane2 = data[offset + 16 + row * 2];
    const plane3 = data[offset + 16 + row * 2 + 1];
    for (let col = 0; col < TILE_SIZE; col += 1) {
      const shift = 7 - col;
      const bit0 = (plane0 >> shift) & 1;
      const bit1 = (plane1 >> shift) & 1;
      const bit2 = (plane2 >> shift) & 1;
      const bit3 = (plane3 >> shift) & 1;
      pixels[row * TILE_SIZE + col] = (bit3 << 3) | (bit2 << 2) | (bit1 << 1) | bit0;
    }
  }
  return pixels;
}

function drawTilesToCanvas(canvas, { startByte, tileCount, tilesPerRow, zoom }) {
  const bytesPerTile = getBytesPerTile();
  const availableBytes = Math.max(state.rom ? state.rom.byteLength - startByte : 0, 0);
  const maxTiles = availableBytes > 0 ? Math.floor(availableBytes / bytesPerTile) : 0;
  const renderCount = Math.max(0, Math.min(tileCount, maxTiles));
  const columns = renderCount > 0 ? Math.min(tilesPerRow, renderCount) : 1;
  const rows = renderCount > 0 ? Math.ceil(renderCount / tilesPerRow) : 1;
  const baseWidth = Math.max(columns * TILE_SIZE, TILE_SIZE);
  const baseHeight = Math.max(rows * TILE_SIZE, TILE_SIZE);
  const scale = Math.max(1, zoom);
  const outputWidth = baseWidth * scale;
  const outputHeight = baseHeight * scale;

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, outputWidth, outputHeight);

  if (renderCount === 0) {
    return {
      renderedTiles: 0,
      rows,
      columns,
      scale,
    };
  }

  const offscreen = document.createElement("canvas");
  offscreen.width = baseWidth;
  offscreen.height = baseHeight;
  const offCtx = offscreen.getContext("2d", { willReadFrequently: true });
  offCtx.imageSmoothingEnabled = false;

  const imageData = offCtx.createImageData(TILE_SIZE, TILE_SIZE);
  const decoder = state.format === "nes" ? decodeNesTile : decodeSnesTile;
  const paletteSource = getActivePalette();
  const palette = (paletteSource.length > 0 ? paletteSource : defaultPalettes[state.format]).map(toRgb);

  for (let tileIndex = 0; tileIndex < renderCount; tileIndex += 1) {
    const tileOffset = startByte + tileIndex * bytesPerTile;
    const pixels = decoder(state.rom, tileOffset);
    const data = imageData.data;

    for (let i = 0; i < pixels.length; i += 1) {
      const paletteIndex = pixels[i];
      const [r, g, b] = palette[paletteIndex] ?? [0, 0, 0];
      const pixelIndex = i * 4;
      data[pixelIndex] = r;
      data[pixelIndex + 1] = g;
      data[pixelIndex + 2] = b;
      data[pixelIndex + 3] = paletteIndex === 0 ? 0 : 255;
    }

    const x = (tileIndex % tilesPerRow) * TILE_SIZE;
    const y = Math.floor(tileIndex / tilesPerRow) * TILE_SIZE;
    offCtx.putImageData(imageData, x, y);
  }

  context.drawImage(offscreen, 0, 0, outputWidth, outputHeight);

  return {
    renderedTiles: renderCount,
    rows,
    columns,
    scale,
  };
}

function rebuildAtlasBase() {
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

function paintAtlasBase() {
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

function drawAtlasHighlight() {
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

  const bytesPerTile = getBytesPerTile();
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

function getWheelDeltaPixels(event) {
  let delta = event.deltaY;
  switch (event.deltaMode) {
    case DELTA_LINE:
      delta *= WHEEL_LINE_HEIGHT;
      break;
    case DELTA_PAGE:
      delta *= event.currentTarget?.clientHeight ?? window.innerHeight;
      break;
    default:
      break;
  }
  return delta;
}

function syncAtlasScrollToHighlight() {
  if (!state.rom || state.atlas.renderedTiles === 0) {
    return;
  }
  const wrapper = elements.atlasWrapper;
  const tileSize = Math.max(1, TILE_SIZE * state.atlas.scale);
  const columns = state.atlas.tilesPerRow;
  const bytesPerTile = getBytesPerTile();
  const startTile = Math.floor((state.offset + state.alignment) / bytesPerTile);
  const viewportTiles = Math.max(1, state.view.renderedTiles);
  const endTileExclusive = Math.min(startTile + viewportTiles, state.atlas.renderedTiles);
  const startY = Math.floor(startTile / columns) * tileSize;
  const endY = Math.ceil(endTileExclusive / columns) * tileSize;
  const padding = Math.max(tileSize * 2, 32);
  const top = wrapper.scrollTop;
  const bottom = top + wrapper.clientHeight;

  let desiredScrollTop = top;
  if (startY < top + padding) {
    desiredScrollTop = Math.max(0, startY - padding);
  } else if (endY > bottom - padding) {
    desiredScrollTop = Math.max(0, endY - wrapper.clientHeight + padding);
  }

  if (desiredScrollTop !== top) {
    atlasInteraction.suppressScroll = true;
    wrapper.scrollTop = desiredScrollTop;
    window.requestAnimationFrame(() => {
      atlasInteraction.suppressScroll = false;
    });
  }
}

function updateAtlasStatus() {
  if (!state.rom || state.atlas.renderedTiles === 0) {
    setAtlasStatus("Load a ROM to enable atlas navigation.");
    return;
  }

  const bytesPerTile = getBytesPerTile();
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

function renderAtlas({ forceRebuild = false } = {}) {
  if (!state.rom) {
    state.atlas.baseCanvas = null;
    state.atlas.renderedTiles = 0;
    state.atlas.needsRebuild = true;
    paintAtlasBase();
    drawAtlasHighlight();
    elements.atlasWrapper.scrollTop = 0;
    updateAtlasStatus();
    return;
  }

  if (forceRebuild || state.atlas.needsRebuild || !state.atlas.baseCanvas) {
    rebuildAtlasBase();
    paintAtlasBase();
  }

  drawAtlasHighlight();
  updateAtlasStatus();

  if (!atlasInteraction.isUserScroll) {
    syncAtlasScrollToHighlight();
  }
}

function renderTiles() {
  if (!state.rom) {
    ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
    setStatus("Load a ROM to begin.");
    elements.exportBtn.disabled = true;
    state.view.renderedTiles = 0;
    state.view.tilesPerRow = state.tilesPerRow;
    renderAtlas();
    return;
  }

  const bytesPerTile = getBytesPerTile();
  const startByte = state.offset + state.alignment;
  const availableBytes = Math.max(state.rom.byteLength - startByte, 0);

  if (availableBytes < bytesPerTile) {
    drawTilesToCanvas(elements.canvas, {
      startByte,
      tileCount: 0,
      tilesPerRow: state.tilesPerRow,
      zoom: state.zoom,
    });
    setStatus("Offset does not contain a full tile. Adjust the offset or alignment.");
    elements.exportBtn.disabled = true;
    state.view.renderedTiles = 0;
    state.view.tilesPerRow = state.tilesPerRow;
    renderAtlas();
    return;
  }

  const maxTiles = Math.max(1, Math.floor(availableBytes / bytesPerTile));
  const tileCount = clamp(state.tileCount, 1, maxTiles);
  const tilesPerRow = clamp(state.tilesPerRow, 1, Math.max(1, tileCount));

  const { renderedTiles } = drawTilesToCanvas(elements.canvas, {
    startByte,
    tileCount,
    tilesPerRow,
    zoom: state.zoom,
  });

  state.view.renderedTiles = renderedTiles;
  state.view.tilesPerRow = tilesPerRow;

  const startHex = formatHex(startByte);
  const endByte = startByte + renderedTiles * bytesPerTile;
  setStatus(`Showing ${renderedTiles} tile${renderedTiles !== 1 ? "s" : ""} from ${startHex} to ${formatHex(endByte)}.`);
  elements.exportBtn.disabled = renderedTiles === 0;

  renderAtlas();
}

function getMaxOffset() {
  if (!state.rom) return 0;
  const bytesPerTile = getBytesPerTile();
  return Math.max(0, state.rom.byteLength - bytesPerTile - state.alignment);
}

function clampOffsetWithinBounds() {
  if (!state.rom) return;
  const maxOffset = getMaxOffset();
  const clampedOffset = clamp(state.offset, 0, maxOffset);
  if (clampedOffset !== state.offset) {
    state.offset = clampedOffset;
    elements.offsetInput.value = formatHex(state.offset);
  }
}

function adjustOffset(deltaTiles) {
  if (!state.rom || deltaTiles === 0) return;
  const bytesPerTile = getBytesPerTile();
  const maxOffset = getMaxOffset();
  const newOffset = clamp(state.offset + deltaTiles * bytesPerTile, 0, maxOffset);
  if (newOffset === state.offset) {
    return;
  }
  state.offset = newOffset;
  elements.offsetInput.value = formatHex(state.offset);
  renderTiles();
}

function handleOffsetCommit() {
  const parsed = parseOffset(elements.offsetInput.value);
  if (Number.isNaN(parsed)) {
    elements.offsetInput.value = formatHex(state.offset);
    return;
  }

  if (!state.rom) {
    state.offset = Math.max(0, parsed);
    elements.offsetInput.value = formatHex(state.offset);
    return;
  }

  const clamped = clamp(parsed, 0, getMaxOffset());
  state.offset = clamped;
  elements.offsetInput.value = formatHex(state.offset);
  renderTiles();
}

function loadRom(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.rom = new Uint8Array(reader.result);
    state.offset = 0;
    state.alignment = 0;
    state.filename = file.name;
    state.atlas.needsRebuild = true;
    atlasInteraction.wheelRowAccumulator = 0;
    viewInteraction.wheelRowAccumulator = 0;
    elements.offsetInput.value = formatHex(0);
    elements.alignmentInput.value = "0";
    elements.alignmentValue.textContent = "0";
    elements.fileStatus.textContent = `${file.name} - ${(state.rom.byteLength / 1024).toFixed(1)} KiB loaded`;
    elements.exportBtn.disabled = false;
    renderTiles();
  };
  reader.onerror = () => {
    console.error("Failed to read file", reader.error);
    setStatus("Failed to read file. Check console for details.");
  };
  reader.readAsArrayBuffer(file);
}

function setupDragAndDrop() {
  const loader = elements.fileLoader;

  const onDragOver = (event) => {
    event.preventDefault();
    loader.classList.add("drag-active");
  };

  const onDragLeave = (event) => {
    if (event.target === loader) {
      loader.classList.remove("drag-active");
    }
  };

  const onDrop = (event) => {
    event.preventDefault();
    loader.classList.remove("drag-active");
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      loadRom(file);
    }
  };

  ["dragenter", "dragover"].forEach((type) => loader.addEventListener(type, onDragOver));
  loader.addEventListener("dragleave", onDragLeave);
  loader.addEventListener("drop", onDrop);
}

function handleAtlasClick(event) {
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
  const bytesPerTile = getBytesPerTile();
  const targetOffset = clamp(tileIndex * bytesPerTile, 0, getMaxOffset());
  if (targetOffset === state.offset) return;
  state.offset = targetOffset;
  elements.offsetInput.value = formatHex(state.offset);
  renderTiles();
}

function handleAtlasScroll() {
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
    const bytesPerTile = getBytesPerTile();
    const newOffset = clamp(targetTileIndex * bytesPerTile, 0, getMaxOffset());
    if (Math.abs(newOffset - state.offset) >= bytesPerTile) {
      state.offset = newOffset;
      elements.offsetInput.value = formatHex(state.offset);
      renderTiles();
    } else {
      drawAtlasHighlight();
      updateAtlasStatus();
    }
  });
}

function handleAtlasWheel(event) {
  if (!state.rom) return;
  event.preventDefault();
  event.stopPropagation();

  const wrapper = elements.atlasWrapper;
  const deltaPixels = getWheelDeltaPixels(event);
  if (deltaPixels === 0) {
    return;
  }

  const tileSize = Math.max(1, TILE_SIZE * state.atlas.scale);
  const rowsDelta = deltaPixels / tileSize;
  const accumulatedRows = atlasInteraction.wheelRowAccumulator + rowsDelta;
  const wholeRows = accumulatedRows > 0 ? Math.floor(accumulatedRows) : Math.ceil(accumulatedRows);
  atlasInteraction.wheelRowAccumulator = accumulatedRows - wholeRows;

  if (wrapper.scrollHeight > wrapper.clientHeight) {
    const maxScroll = Math.max(0, wrapper.scrollHeight - wrapper.clientHeight);
    const target = clamp(wrapper.scrollTop + deltaPixels, 0, maxScroll);
    if (target !== wrapper.scrollTop) {
      wrapper.scrollTop = target;
    }
  }

  if (wholeRows !== 0) {
    const deltaTiles = wholeRows * state.atlas.tilesPerRow;
    adjustOffset(deltaTiles);
  }
}

function handleCanvasWheel(event) {
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
    const deltaTiles = wholeRows * state.tilesPerRow;
    adjustOffset(deltaTiles);
  }
}

function setupEventListeners() {
  elements.romInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    loadRom(file);
  });

  setupDragAndDrop();

  elements.offsetInput.addEventListener("blur", handleOffsetCommit);
  elements.offsetInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      handleOffsetCommit();
    }
  });

  elements.tileCountInput.addEventListener("change", () => {
    const value = Number.parseInt(elements.tileCountInput.value, 10);
    if (!Number.isNaN(value) && value > 0) {
      state.tileCount = value;
      renderTiles();
    } else {
      elements.tileCountInput.value = String(state.tileCount);
    }
  });

  elements.tilesPerRowInput.addEventListener("change", () => {
    const value = Number.parseInt(elements.tilesPerRowInput.value, 10);
    if (!Number.isNaN(value) && value > 0) {
      state.tilesPerRow = value;
      renderTiles();
    } else {
      elements.tilesPerRowInput.value = String(state.tilesPerRow);
    }
  });

  elements.zoomInput.addEventListener("input", () => {
    const value = Number.parseInt(elements.zoomInput.value, 10);
    state.zoom = Number.isNaN(value) ? 1 : clamp(value, 1, 16);
    elements.zoomValue.textContent = `${state.zoom}x`;
    renderTiles();
  });

  elements.alignmentInput.addEventListener("input", () => {
    const value = Number.parseInt(elements.alignmentInput.value, 10);
    state.alignment = Number.isNaN(value) ? 0 : clamp(value, 0, 15);
    elements.alignmentValue.textContent = String(state.alignment);
    if (state.rom) {
      clampOffsetWithinBounds();
      renderTiles();
    }
  });

  elements.formatRadios.forEach((radio) => {
    radio.addEventListener("change", (event) => {
      if (!event.target.checked) return;
      state.format = event.target.value;
      markAtlasDirty();
      updatePaletteEditor();
      clampOffsetWithinBounds();
      renderTiles();
    });
  });

  window.addEventListener("keydown", (event) => {
    if (!state.rom) return;
    const active = document.activeElement;
    if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
      return;
    }
    if (event.key === "ArrowRight") {
      adjustOffset(1);
      event.preventDefault();
    } else if (event.key === "ArrowLeft") {
      adjustOffset(-1);
      event.preventDefault();
    } else if (event.key === "ArrowDown") {
      adjustOffset(state.tilesPerRow);
      event.preventDefault();
    } else if (event.key === "ArrowUp") {
      adjustOffset(-state.tilesPerRow);
      event.preventDefault();
    }
  });

  elements.exportBtn.addEventListener("click", async () => {
    if (!state.rom || elements.exportBtn.disabled) return;
    const blob = await new Promise((resolve) => elements.canvas.toBlob(resolve, "image/png"));
    if (!blob) {
      console.warn("Failed to export canvas to PNG");
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const baseName = state.filename ? state.filename.replace(/\.[^/.]+$/u, "") : "tiles";
    link.download = `${baseName}-${state.format}-0x${state.offset.toString(16)}.png`;
    link.href = url;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  elements.atlasWrapper.addEventListener("scroll", handleAtlasScroll);
  elements.atlasWrapper.addEventListener("wheel", handleAtlasWheel, { passive: false });
  elements.atlasCanvas.addEventListener("click", handleAtlasClick);
  elements.canvas.addEventListener("wheel", handleCanvasWheel, { passive: false });
}

function init() {
  elements.tileCountInput.value = String(state.tileCount);
  elements.zoomInput.value = String(state.zoom);
  elements.zoomValue.textContent = `${state.zoom}x`;
  elements.alignmentInput.value = String(state.alignment);
  elements.alignmentValue.textContent = String(state.alignment);
  updatePaletteEditor();
  setupEventListeners();
  setStatus("Load a ROM to begin.");
  renderAtlas();
}

init();
