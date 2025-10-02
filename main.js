
const TILE_SIZE = 8;
const BYTES_PER_TILE = {
  nes: 16,
  snes2bpp: 16,
  snes: 32,
};

const PALETTE_CONFIG = {
  nes: { paletteCount: 8, colorsPerPalette: 4 },
  snes2bpp: { paletteCount: 16, colorsPerPalette: 4 },
  snes: { paletteCount: 16, colorsPerPalette: 16 },
};

const TILE_LAYOUTS = [
  { id: "single", label: "8×8 tiles", tilesWide: 1, tilesHigh: 1 },
  { id: "vertical", label: "8×16 (stacked)", tilesWide: 1, tilesHigh: 2 },
  { id: "horizontal", label: "16×8 (side-by-side)", tilesWide: 2, tilesHigh: 1 },
  { id: "quad", label: "16×16 (2×2)", tilesWide: 2, tilesHigh: 2 },
];

const DEFAULT_TILE_LAYOUT_ID = TILE_LAYOUTS[0].id;

const TILE_LAYOUT_MAP = TILE_LAYOUTS.reduce((map, layout) => {
  map[layout.id] = { ...layout, tilesPerBlock: layout.tilesWide * layout.tilesHigh };
  return map;
}, {});

const NES_MASTER_PALETTE = [
  "#7C7C7C", "#0000FC", "#0000BC", "#4428BC", "#940084", "#A80020", "#A81000", "#881400",
  "#503000", "#007800", "#006800", "#005800", "#004058", "#000000", "#000000", "#000000",
  "#BCBCBC", "#0078F8", "#0058F8", "#6844FC", "#D800CC", "#E40058", "#F83800", "#E45C10",
  "#AC7C00", "#00B800", "#00A800", "#00A844", "#008888", "#000000", "#000000", "#000000",
  "#F8F8F8", "#3CBCFC", "#6888FC", "#9878F8", "#F878F8", "#F85898", "#F87858", "#FCA044",
  "#F8B800", "#B8F818", "#58D854", "#58F898", "#00E8D8", "#787878", "#000000", "#000000",
  "#FCFCFC", "#A4E4FC", "#B8B8F8", "#D8B8F8", "#F8B8F8", "#F8A4C0", "#F0D0B0", "#FCE0A8",
  "#F8D878", "#D8F878", "#B8F8B8", "#B8F8D8", "#00FCFC", "#F8D8F8", "#000000", "#000000",
];

const NES_HEX_TO_INDEX = new Map(NES_MASTER_PALETTE.map((color, index) => [normalizeHexColor(color), index]));

const defaultSnesPalettes = [
  [
    "#000000", "#1C1E26", "#323A56", "#5368B2",
    "#6BA4FF", "#9BDFF5", "#EEF8FF", "#FFB4CD",
    "#FF6F91", "#D2246B", "#93287C", "#4C2269",
    "#A1FF70", "#00C853", "#00695C", "#FFFFFF",
  ],
  [
    "#0A0000", "#210500", "#3D0F00", "#6A2500",
    "#A43D00", "#FF6F1A", "#FF9640", "#FFD0A3",
    "#FFE5C7", "#FFECCF", "#FFF6E8", "#FFD9C1",
    "#FF8A80", "#E53935", "#B71C1C", "#FFFFFF",
  ],
  [
    "#00111A", "#002639", "#003D59", "#00597D",
    "#007FA8", "#009FC9", "#1BB6E5", "#56CBEF",
    "#9DE4F8", "#E3F7FF", "#BFFFE6", "#81F2C6",
    "#3ED3A5", "#1AA684", "#0F7560", "#FFFFFF",
  ],
  [
    "#050D07", "#122317", "#1E3B21", "#28512E",
    "#306936", "#3F8444", "#56A650", "#76C666",
    "#9EDF8C", "#C7F5BC", "#EEFCE4", "#D4E9BA",
    "#A0CC78", "#7AAA4F", "#557A31", "#FFFFFF",
  ],
  [
    "#06000C", "#12002A", "#270052", "#3E0575",
    "#571092", "#741DB3", "#9E4CD9", "#B57CFF",
    "#D3AFFF", "#E8D7FF", "#F6EEFF", "#DAD1FF",
    "#B498FF", "#8555E6", "#5221A5", "#FFFFFF",
  ],
  [
    "#010F00", "#112600", "#1E3B04", "#2E530C",
    "#3E6B14", "#4F8221", "#5F9730", "#72AC41",
    "#8BC55B", "#A9DE7D", "#C6F49F", "#E2FFD0",
    "#BDE498", "#91C36F", "#6A9F49", "#FFFFFF",
  ],
  [
    "#1A0F00", "#2E1B00", "#463100", "#6A4A06",
    "#8F6512", "#B4811F", "#D89E35", "#F4BC53",
    "#FFD87A", "#FFE9A6", "#FFF7D2", "#FFE6B8",
    "#FFC98C", "#FFAB63", "#E07A2F", "#FFFFFF",
  ],
  [
    "#000812", "#00152A", "#002647", "#003864",
    "#004C83", "#1260A1", "#2F76BC", "#4C8FD4",
    "#6BAAE6", "#8BC3F3", "#ACD9FC", "#CFEbFF",
    "#E9F8FF", "#B9E1FF", "#89C4F8", "#FFFFFF",
  ],
  [
    "#090909", "#171F2A", "#2D3A4D", "#46566D",
    "#5D6F87", "#7588A3", "#8FA4C0", "#A9BFD7",
    "#C4D8E9", "#E0F1F8", "#FFF2F5", "#FFD7E2",
    "#FFB2CA", "#FF8DB2", "#FF5E96", "#FFFFFF",
  ],
  [
    "#020203", "#0D0F29", "#1A1F53", "#242F7A",
    "#2E41A6", "#215BD1", "#1A7AF5", "#15A1FF",
    "#39C6FF", "#67E0FF", "#99F1FF", "#C5FBFF",
    "#F0FFFF", "#B9FFE8", "#7DFFD1", "#04F4B0",
  ],
  [
    "#150A05", "#2C1309", "#432010", "#5C311B",
    "#754226", "#8F5331", "#AA663E", "#C37A4C",
    "#DA915C", "#EBA96F", "#F9C184", "#FFD99D",
    "#FFEBC1", "#EFD3A8", "#D1A37A", "#FFFFFF",
  ],
  [
    "#230011", "#3F0321", "#5B0A34", "#7A174C",
    "#982866", "#B73D82", "#D5579D", "#EB77B8",
    "#FF99D2", "#FFBCD6", "#FFE0E7", "#FFF3F7",
    "#FFD1EB", "#FFA0D6", "#FF6EBF", "#FFFFFF",
  ],
  [
    "#03070D", "#08131F", "#0F2133", "#183249",
    "#214560", "#2B5979", "#366D94", "#4181AF",
    "#4F95C7", "#62A9D8", "#7FBDE3", "#9DD0EC",
    "#C0E3F5", "#E0F3FC", "#A2C6F3", "#6A96D8",
  ],
  [
    "#001400", "#002C02", "#004405", "#005E09",
    "#00780F", "#2B941F", "#54AF30", "#7ACB45",
    "#A2E55D", "#C9FF78", "#E9FF9B", "#FDFFBF",
    "#FFE27F", "#FFC347", "#FF9A1F", "#FF6B00",
  ],
  [
    "#110018", "#1F0530", "#2D1048", "#3B1C60",
    "#492978", "#583891", "#6949AA", "#7B5CC3",
    "#9071DB", "#A888EE", "#C4A2FA", "#E0C1FF",
    "#F3DBFF", "#D9B7FF", "#BE8FFF", "#A166FF",
  ],
  [
    "#030303", "#111111", "#1F1F1F", "#2D2D2D",
    "#3B3B3B", "#494949", "#575757", "#646464",
    "#727272", "#808080", "#9C9C9C", "#B8B8B8",
    "#D4D4D4", "#EAEAEA", "#F6F6F6", "#FFFFFF",
  ],
];

const defaultSnes2bppPalettes = defaultSnesPalettes.map((palette) => palette.slice(0, 4));
const gbInspiredPalettes = [
  ["#0F380F", "#306230", "#8BAC0F", "#9BBC0F"],
  ["#0B0B0B", "#3D3D3D", "#7B7B7B", "#E3E3E3"],
  ["#071821", "#306850", "#86C06C", "#E0F8CF"],
  ["#0D0221", "#0F084B", "#26408B", "#A6CFD5"],
];
gbInspiredPalettes.forEach((palette, index) => {
  if (defaultSnes2bppPalettes[index]) {
    defaultSnes2bppPalettes[index] = palette;
  }
});

const defaultPaletteSets = {
  nes: [
    ["#7C7C7C", "#0000FC", "#3CBCFC", "#F8F8F8"],
    ["#7C7C7C", "#0058F8", "#6844FC", "#F8F8F8"],
    ["#7C7C7C", "#00B800", "#58D854", "#F8F8F8"],
    ["#7C7C7C", "#F83800", "#F8B800", "#FCE0A8"],
    ["#7C7C7C", "#D800CC", "#F85898", "#F8B8F8"],
    ["#7C7C7C", "#00E8D8", "#58F898", "#B8F8D8"],
    ["#7C7C7C", "#AC7C00", "#FCA044", "#F8D878"],
    ["#7C7C7C", "#9878F8", "#F878F8", "#FCFCFC"],
  ],
  snes2bpp: defaultSnes2bppPalettes.map((palette) => palette.map((color) => normalizeHexColor(color))),
  snes: defaultSnesPalettes.map((palette) => palette.map((color) => normalizeHexColor(color))),
};

const EDITOR_CANVAS_SIZE = 256;

const FORMAT_DISPLAY_NAMES = {
  nes: "NES 2bpp",
  snes2bpp: "SNES/GB 2bpp",
  snes: "SNES 4bpp",
};

function getFormatDisplayName(format) {
  if (typeof format !== "string") return "UNKNOWN";
  return FORMAT_DISPLAY_NAMES[format] ?? format.toUpperCase();
}

function normalizeHexColor(color) {
  if (typeof color !== "string") return "#000000";
  let hex = color.trim();
  if (hex.startsWith("#")) {
    hex = hex.slice(1);
  }
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/u.test(hex)) {
    return "#000000";
  }
  return `#${hex.toUpperCase()}`;
}

function rgbToHex(r, g, b) {
  const toHex = (value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0").toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getPaletteConfig(format) {
  return PALETTE_CONFIG[format] ?? PALETTE_CONFIG.nes;
}

function normalizePaletteSet(format, palettes) {
  const config = getPaletteConfig(format);
  const defaults = defaultPaletteSets[format] ?? [];
  return Array.from({ length: config.paletteCount }, (_, paletteIndex) => {
    const palette = palettes?.[paletteIndex];
    const fallback = defaults[paletteIndex] ?? defaults[0] ?? [];
    return Array.from({ length: config.colorsPerPalette }, (_, colorIndex) => {
      const color = palette?.[colorIndex] ?? fallback[colorIndex] ?? "#000000";
      return normalizeHexColor(color);
    });
  });
}

function cloneDefaultPaletteSet(format) {
  return normalizePaletteSet(format, defaultPaletteSets[format]);
}

function nesIndexToHex(index) {
  const safeIndex = clamp(index & 0x3f, 0, NES_MASTER_PALETTE.length - 1);
  return normalizeHexColor(NES_MASTER_PALETTE[safeIndex] ?? "#000000");
}

function findClosestNesIndex(hex) {
  const [targetR, targetG, targetB] = toRgb(hex);
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < NES_MASTER_PALETTE.length; i += 1) {
    const [r, g, b] = toRgb(NES_MASTER_PALETTE[i]);
    const distance = (r - targetR) ** 2 + (g - targetG) ** 2 + (b - targetB) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }
  return bestIndex & 0x3f;
}

function hexToNesIndex(hex) {
  const normalized = normalizeHexColor(hex);
  if (NES_HEX_TO_INDEX.has(normalized)) {
    return NES_HEX_TO_INDEX.get(normalized);
  }
  return findClosestNesIndex(normalized);
}

function hexToSnesWord(hex) {
  const [r, g, b] = toRgb(hex);
  const to5Bit = (value) => clamp(Math.round((value / 255) * 31), 0, 31);
  const r5 = to5Bit(r);
  const g5 = to5Bit(g);
  const b5 = to5Bit(b);
  return (b5 << 10) | (g5 << 5) | r5;
}

function snesWordToHex(word) {
  const r5 = word & 0x1f;
  const g5 = (word >> 5) & 0x1f;
  const b5 = (word >> 10) & 0x1f;
  const to8Bit = (value) => clamp(Math.round((value / 31) * 255), 0, 255);
  return rgbToHex(to8Bit(r5), to8Bit(g5), to8Bit(b5));
}

function downloadBlob(data, filename, mimeType = "application/octet-stream") {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
  const link = document.createElement("a");
  link.download = filename;
  link.href = URL.createObjectURL(blob);
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

const state = {
  rom: null,
  format: "nes",
  offset: 0,
  alignment: 0,
  tileCount: 512,
  tilesPerRow: 16,
  tileLayout: DEFAULT_TILE_LAYOUT_ID,
  zoom: 4,
  paletteSets: {
    nes: cloneDefaultPaletteSet("nes"),
    snes2bpp: cloneDefaultPaletteSet("snes2bpp"),
    snes: cloneDefaultPaletteSet("snes"),
  },
  activePaletteIndex: {
    nes: 0,
    snes2bpp: 0,
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
    tileColumns: 16,
    tileRows: 1,
    blockColumns: 16,
    blockRows: 1,
    tilesPerBlock: getTileLayoutConfig().tilesPerBlock,
    rowStride: getTileLayoutConfig().tilesPerBlock,
    layoutId: DEFAULT_TILE_LAYOUT_ID,
  },
  panes: {
    paletteVisible: true,
    editorVisible: true,
  },
  editor: {
    selectedTileIndex: null,
    tilePixels: null,
    activeColor: 1,
    isPainting: false,
    clipboard: null,
  },
};

const elements = {
  romInput: document.querySelector("#rom-input"),
  fileLoader: document.querySelector("#file-loader"),
  fileStatus: document.querySelector("#file-status"),
  offsetInput: document.querySelector("#offset-input"),
  tileCountInput: document.querySelector("#tile-count-input"),
  tilesPerRowInput: document.querySelector("#tiles-per-row-input"),
  tileLayoutSelect: document.querySelector("#tile-layout-select"),
  zoomInput: document.querySelector("#zoom-input"),
  zoomValue: document.querySelector("#zoom-value"),
  alignmentInput: document.querySelector("#alignment-input"),
  alignmentValue: document.querySelector("#alignment-value"),
  formatRadios: document.querySelectorAll('input[name="format"]'),
  paletteEditor: document.querySelector("#palette-editor"),
  palettePane: document.querySelector("#palette-pane"),
  paletteExportJsonBtn: document.querySelector("#export-palette-json-btn"),
  paletteExportRawBtn: document.querySelector("#export-palette-raw-btn"),
  paletteImportJsonInput: document.querySelector("#import-palette-json-input"),
  paletteImportRawInput: document.querySelector("#import-palette-raw-input"),
  paletteImportJsonLabelText: document.querySelector("#import-palette-json-label-text"),
  paletteImportRawLabelText: document.querySelector("#import-palette-raw-label-text"),
  paletteHintText: document.querySelector("#palette-hint-text"),
  editorPalette: document.querySelector("#editor-palette"),
  editorPane: document.querySelector("#editor-pane"),
  fillTileBtn: document.querySelector("#fill-tile-btn"),
  clearTileBtn: document.querySelector("#clear-tile-btn"),
  copyTileBtn: document.querySelector("#copy-tile-btn"),
  pasteTileBtn: document.querySelector("#paste-tile-btn"),
  editorSummaryMeta: document.querySelector("#editor-summary-meta"),
  canvas: document.querySelector("#tile-canvas"),
  tileEditor: document.querySelector("#tile-editor"),
  status: document.querySelector("#tile-status"),
  exportBtn: document.querySelector("#export-png-btn"),
  saveRomBtn: document.querySelector("#save-rom-btn"),
  atlasCanvas: document.querySelector("#atlas-canvas"),
  atlasOverlay: document.querySelector("#atlas-overlay"),
  atlasWrapper: document.querySelector(".atlas-wrapper"),
  atlasStatus: document.querySelector("#atlas-status"),
  togglePalettePane: document.querySelector("#toggle-palette-pane"),
  toggleEditorPane: document.querySelector("#toggle-editor-pane"),
};

elements.exportBtn.disabled = true;
elements.saveRomBtn.disabled = true;

elements.fillTileBtn.disabled = true;
elements.clearTileBtn.disabled = true;
elements.copyTileBtn.disabled = true;
elements.pasteTileBtn.disabled = true;
elements.paletteExportJsonBtn.disabled = true;
elements.paletteExportRawBtn.disabled = true;

elements.paletteImportJsonInput.value = "";
elements.paletteImportRawInput.value = "";

const ctx = elements.canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
const editorCtx = elements.tileEditor.getContext("2d");
editorCtx.imageSmoothingEnabled = false;

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

let scheduledRender = false;

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
  const numeric = Number.isFinite(value) ? value : 0;
  const unsigned = numeric >>> 0;
  return `0x${Math.max(0, unsigned).toString(16).toUpperCase()}`;
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

function getTileLayoutConfig(layoutId = DEFAULT_TILE_LAYOUT_ID) {
  return TILE_LAYOUT_MAP[layoutId] ?? TILE_LAYOUT_MAP[DEFAULT_TILE_LAYOUT_ID];
}

function getCurrentTileLayout() {
  return getTileLayoutConfig(state.tileLayout);
}

function getLayoutFromView(viewState = state.view) {
  const layoutId = viewState?.layoutId ?? state.tileLayout ?? DEFAULT_TILE_LAYOUT_ID;
  return getTileLayoutConfig(layoutId);
}

function tileIndexToGridPosition(tileIndex, viewState = state.view) {
  const layout = getLayoutFromView(viewState);
  const tilesPerBlock = layout.tilesPerBlock;
  const blockColumns = Math.max(1, viewState?.blockColumns ?? 1);
  const blockIndex = Math.floor(tileIndex / tilesPerBlock);
  const indexWithinBlock = tileIndex % tilesPerBlock;
  const blockCol = blockIndex % blockColumns;
  const blockRow = Math.floor(blockIndex / blockColumns);
  const localRow = Math.floor(indexWithinBlock / layout.tilesWide);
  const localCol = indexWithinBlock % layout.tilesWide;
  return {
    col: blockCol * layout.tilesWide + localCol,
    row: blockRow * layout.tilesHigh + localRow,
  };
}

function gridPositionToTileIndex(col, row, viewState = state.view) {
  const layout = getLayoutFromView(viewState);
  const tilesPerBlock = layout.tilesPerBlock;
  const blockColumns = Math.max(1, viewState?.blockColumns ?? 1);
  const blockCol = Math.floor(col / layout.tilesWide);
  const blockRow = Math.floor(row / layout.tilesHigh);
  const localCol = ((col % layout.tilesWide) + layout.tilesWide) % layout.tilesWide;
  const localRow = ((row % layout.tilesHigh) + layout.tilesHigh) % layout.tilesHigh;
  const blockIndex = blockRow * blockColumns + blockCol;
  const indexWithinBlock = localRow * layout.tilesWide + localCol;
  return blockIndex * tilesPerBlock + indexWithinBlock;
}

function clampGridPosition(col, row, viewState = state.view) {
  const maxCol = Math.max((viewState?.tileColumns ?? 1) - 1, 0);
  const maxRow = Math.max((viewState?.tileRows ?? 1) - 1, 0);
  return {
    col: clamp(col, 0, maxCol),
    row: clamp(row, 0, maxRow),
  };
}

function computeRowStride(viewState = state.view) {
  const layout = getLayoutFromView(viewState);
  const tilesPerBlock = layout.tilesPerBlock;
  const tileRows = Math.max(1, viewState?.tileRows ?? 1);
  if (tileRows <= 1) {
    return tilesPerBlock;
  }
  const firstRowIndex = gridPositionToTileIndex(0, 0, viewState);
  const secondRowIndex = gridPositionToTileIndex(0, 1, viewState);
  const stride = Math.max(1, secondRowIndex - firstRowIndex);
  return stride;
}

function setPaneVisibility(paneElement, visible) {
  if (!paneElement) return;
  if (visible) {
    paneElement.removeAttribute("hidden");
  } else {
    paneElement.setAttribute("hidden", "");
  }
}

function syncPaneVisibility() {
  setPaneVisibility(elements.palettePane, state.panes.paletteVisible);
  setPaneVisibility(elements.editorPane, state.panes.editorVisible);
  if (elements.togglePalettePane) {
    elements.togglePalettePane.checked = state.panes.paletteVisible;
  }
  if (elements.toggleEditorPane) {
    elements.toggleEditorPane.checked = state.panes.editorVisible;
  }
}

function ensurePaletteSet(format = state.format) {
  const normalized = normalizePaletteSet(format, state.paletteSets[format]);
  state.paletteSets[format] = normalized;
  return normalized;
}

function getDefaultPalette(format = state.format) {
  const defaults = defaultPaletteSets[format] ?? [];
  return defaults[0] ? defaults[0].map((color) => normalizeHexColor(color)) : [];
}

function getActivePalette(format = state.format) {
  const sets = ensurePaletteSet(format);
  const config = getPaletteConfig(format);
  const maxIndex = Math.max(config.paletteCount - 1, 0);
  const index = clamp(state.activePaletteIndex[format] ?? 0, 0, maxIndex);
  state.activePaletteIndex[format] = index;
  return sets[index] ?? [];
}

function setActivePaletteIndex(format, paletteIndex) {
  const config = getPaletteConfig(format);
  const clampedIndex = clamp(paletteIndex, 0, Math.max(config.paletteCount - 1, 0));
  if (state.activePaletteIndex[format] === clampedIndex) {
    return false;
  }
  state.activePaletteIndex[format] = clampedIndex;
  state.editor.activeColor = clamp(state.editor.activeColor, 0, Math.max(config.colorsPerPalette - 1, 0));
  return true;
}

function highlightActivePaletteStrip(format) {
  const editor = elements.paletteEditor;
  if (!editor) return;
  editor.querySelectorAll(".palette-strip").forEach((strip) => {
    const idx = Number.parseInt(strip.dataset.paletteIndex ?? "-1", 10);
    const isActive = idx === state.activePaletteIndex[format];
    strip.classList.toggle("active", isActive);
    strip.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function activatePaletteStrip(format, paletteIndex) {
  const changed = setActivePaletteIndex(format, paletteIndex);
  highlightActivePaletteStrip(format);
  if (!changed) return;
  markAtlasDirty();
  updateEditorPaletteSwatches();
  requestRender();
}

function markAtlasDirty() {
  state.atlas.needsRebuild = true;
}

function getBytesPerTile(format = state.format) {
  return BYTES_PER_TILE[format] ?? BYTES_PER_TILE.nes;
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
  const editor = elements.paletteEditor;
  if (!editor) return;

  const format = state.format;
  const palettes = ensurePaletteSet(format);
  const config = getPaletteConfig(format);
  state.editor.activeColor = clamp(state.editor.activeColor, 0, Math.max(config.colorsPerPalette - 1, 0));
  const activeIndex = clamp(state.activePaletteIndex[format] ?? 0, 0, Math.max(config.paletteCount - 1, 0));
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
      hintText = "SNES 4bpp: 16 palettes × 16 colors. Click a strip to activate it. Color 0 is treated as transparent.";
      exportJsonLabel = `Export JSON (${paletteInfo})`;
      importJsonLabel = `Import JSON (${paletteInfo})`;
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

function updateEditorPaletteSwatches() {
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

function decodeSnes2bppTile(data, offset) {
  const pixels = new Uint8Array(TILE_SIZE * TILE_SIZE);
  for (let row = 0; row < TILE_SIZE; row += 1) {
    const base = offset + row * 2;
    const plane0 = data[base];
    const plane1 = data[base + 1];
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

function encodeNesTile(pixels) {
  const buffer = new Uint8Array(16);
  for (let row = 0; row < TILE_SIZE; row += 1) {
    let plane0 = 0;
    let plane1 = 0;
    for (let col = 0; col < TILE_SIZE; col += 1) {
      const value = pixels[row * TILE_SIZE + col] & 0x03;
      const bit = 7 - col;
      plane0 |= (value & 0x01) << bit;
      plane1 |= ((value >> 1) & 0x01) << bit;
    }
    buffer[row] = plane0;
    buffer[row + 8] = plane1;
  }
  return buffer;
}

function encodeSnes2bppTile(pixels) {
  const buffer = new Uint8Array(16);
  for (let row = 0; row < TILE_SIZE; row += 1) {
    let plane0 = 0;
    let plane1 = 0;
    for (let col = 0; col < TILE_SIZE; col += 1) {
      const value = pixels[row * TILE_SIZE + col] & 0x03;
      const bit = 7 - col;
      plane0 |= (value & 0x01) << bit;
      plane1 |= ((value >> 1) & 0x01) << bit;
    }
    const base = row * 2;
    buffer[base] = plane0;
    buffer[base + 1] = plane1;
  }
  return buffer;
}

function encodeSnesTile(pixels) {
  const buffer = new Uint8Array(32);
  for (let row = 0; row < TILE_SIZE; row += 1) {
    let plane0 = 0;
    let plane1 = 0;
    let plane2 = 0;
    let plane3 = 0;
    for (let col = 0; col < TILE_SIZE; col += 1) {
      const value = pixels[row * TILE_SIZE + col] & 0x0f;
      const bit = 7 - col;
      plane0 |= (value & 0x01) << bit;
      plane1 |= ((value >> 1) & 0x01) << bit;
      plane2 |= ((value >> 2) & 0x01) << bit;
      plane3 |= ((value >> 3) & 0x01) << bit;
    }
    const rowOffset = row * 2;
    buffer[rowOffset] = plane0;
    buffer[rowOffset + 1] = plane1;
    buffer[16 + rowOffset] = plane2;
    buffer[16 + rowOffset + 1] = plane3;
  }
  return buffer;
}

function sanitizeTilePixels(pixels, format = state.format) {
  const config = getPaletteConfig(format);
  const maxIndex = Math.max(0, config.colorsPerPalette - 1);
  const sanitized = new Uint8Array(pixels.length);
  for (let i = 0; i < pixels.length; i += 1) {
    sanitized[i] = clamp(pixels[i] ?? 0, 0, maxIndex);
  }
  return sanitized;
}

function getTileDecoder(format = state.format) {
  switch (format) {
    case "nes":
      return decodeNesTile;
    case "snes2bpp":
      return decodeSnes2bppTile;
    case "snes":
      return decodeSnesTile;
    default:
      return decodeNesTile;
  }
}

function getTileEncoder(format = state.format) {
  switch (format) {
    case "nes":
      return encodeNesTile;
    case "snes2bpp":
      return encodeSnes2bppTile;
    case "snes":
      return encodeSnesTile;
    default:
      return encodeNesTile;
  }
}

function exportPaletteJson() {
  if (!state.rom) return;
  const format = state.format;
  const config = getPaletteConfig(format);
  const palettes = ensurePaletteSet(format).map((palette) => palette.map((color) => normalizeHexColor(color)));
  const payload = {
    source: "VibeViewer",
    format,
    paletteCount: config.paletteCount,
    colorsPerPalette: config.colorsPerPalette,
    activePaletteIndex: clamp(state.activePaletteIndex[format] ?? 0, 0, Math.max(config.paletteCount - 1, 0)),
    palettes,
    timestamp: new Date().toISOString(),
  };
  const baseName = state.filename ? state.filename.replace(/\.[^/.]+$/u, "") : "palette";
  downloadBlob(JSON.stringify(payload, null, 2), `${baseName}-${format}-palettes.json`, "application/json");
}

function exportPaletteRaw() {
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

function importPaletteJson(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      if (!payload || !Array.isArray(payload.palettes)) {
        throw new Error("Invalid palette payload");
      }
      const payloadFormat = typeof payload.format === "string" && PALETTE_CONFIG[payload.format] ? payload.format : state.format;
      const normalized = normalizePaletteSet(payloadFormat, payload.palettes);
      state.paletteSets[payloadFormat] = normalized;
      const config = getPaletteConfig(payloadFormat);
      const incomingIndex = typeof payload.activePaletteIndex === "number" ? payload.activePaletteIndex : state.activePaletteIndex[payloadFormat];
      state.activePaletteIndex[payloadFormat] = clamp(incomingIndex ?? 0, 0, Math.max(config.paletteCount - 1, 0));
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

function decodeNesPaletteSet(buffer) {
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

function decodeSnesPaletteSet(buffer, format = "snes") {
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

function importPaletteRaw(file) {
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
      state.activePaletteIndex[format] = clamp(state.activePaletteIndex[format] ?? 0, 0, Math.max(config.paletteCount - 1, 0));
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
function drawTilesToCanvas(canvas, { startByte, tileCount, tilesPerRow, zoom, layoutId, layout }) {
  const layoutConfig = layout ?? getTileLayoutConfig(layoutId ?? state.tileLayout);
  const tilesPerBlock = layoutConfig.tilesPerBlock;
  const bytesPerTile = getBytesPerTile();
  const availableBytes = Math.max(state.rom ? state.rom.byteLength - startByte : 0, 0);
  const maxTiles = availableBytes > 0 ? Math.floor(availableBytes / bytesPerTile) : 0;
  const renderCount = Math.max(0, Math.min(tileCount, maxTiles));
  const requestedColumns = Math.max(1, tilesPerRow);
  const totalBlocks = renderCount > 0 ? Math.ceil(renderCount / tilesPerBlock) : 0;
  const blockColumns = totalBlocks > 0 ? Math.min(requestedColumns, totalBlocks) : requestedColumns;
  const safeBlockColumns = Math.max(1, blockColumns);
  const blockRows = totalBlocks > 0 ? Math.ceil(totalBlocks / safeBlockColumns) : 1;
  const tileColumns = Math.max(safeBlockColumns * layoutConfig.tilesWide, layoutConfig.tilesWide);
  const tileRows = Math.max(blockRows * layoutConfig.tilesHigh, layoutConfig.tilesHigh);
  const baseWidth = Math.max(tileColumns * TILE_SIZE, TILE_SIZE);
  const baseHeight = Math.max(tileRows * TILE_SIZE, TILE_SIZE);
  const scale = Math.max(1, zoom);
  const outputWidth = baseWidth * scale;
  const outputHeight = baseHeight * scale;

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, outputWidth, outputHeight);

  if (renderCount === 0 || !state.rom) {
    return {
      renderedTiles: 0,
      blockRows,
      blockColumns: safeBlockColumns,
      tileColumns,
      tileRows,
      tilesPerBlock,
      layoutId: layoutConfig.id,
      rowStride: tilesPerBlock,
      scale,
    };
  }

  const offscreen = document.createElement("canvas");
  offscreen.width = baseWidth;
  offscreen.height = baseHeight;
  const offCtx = offscreen.getContext("2d", { willReadFrequently: true });
  offCtx.imageSmoothingEnabled = false;

  const imageData = offCtx.createImageData(TILE_SIZE, TILE_SIZE);
  const decoder = getTileDecoder(state.format);
  const paletteSource = getActivePalette();
  const fallbackPalette = getDefaultPalette(state.format);
  const palette = (paletteSource.length > 0 ? paletteSource : fallbackPalette).map(toRgb);
  const blockWidthPx = layoutConfig.tilesWide * TILE_SIZE;
  const blockHeightPx = layoutConfig.tilesHigh * TILE_SIZE;

  for (let tileIndex = 0; tileIndex < renderCount; tileIndex += 1) {
    const tileOffset = startByte + tileIndex * bytesPerTile;
    if (tileOffset + bytesPerTile > state.rom.byteLength) break;
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

    const blockIndex = Math.floor(tileIndex / tilesPerBlock);
    const indexWithinBlock = tileIndex % tilesPerBlock;
    const tileXInBlock = indexWithinBlock % layoutConfig.tilesWide;
    const tileYInBlock = Math.floor(indexWithinBlock / layoutConfig.tilesWide);
    const drawX = (blockIndex % safeBlockColumns) * blockWidthPx + tileXInBlock * TILE_SIZE;
    const drawY = Math.floor(blockIndex / safeBlockColumns) * blockHeightPx + tileYInBlock * TILE_SIZE;
    offCtx.putImageData(imageData, drawX, drawY);
  }

  context.drawImage(offscreen, 0, 0, outputWidth, outputHeight);

  const viewMetadata = {
    blockColumns: safeBlockColumns,
    blockRows,
    tileColumns,
    tileRows,
    tilesPerBlock,
    layoutId: layoutConfig.id,
  };

  const rowStride = tileRows > 1 ? computeRowStride(viewMetadata) : tilesPerBlock;

  return {
    renderedTiles: renderCount,
    blockRows,
    blockColumns: safeBlockColumns,
    tileColumns,
    tileRows,
    tilesPerBlock,
    layoutId: layoutConfig.id,
    rowStride,
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
  if (!wrapper) {
    return;
  }

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

function requestRender({ forceAtlas = false } = {}) {
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

function renderTiles() {
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

  const bytesPerTile = getBytesPerTile();
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

function ensureEditorSelection() {
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

function getSelectedTileByteOffset() {
  if (state.editor.selectedTileIndex == null) return null;
  const bytesPerTile = getBytesPerTile();
  const startByte = state.offset + state.alignment;
  const offset = startByte + state.editor.selectedTileIndex * bytesPerTile;
  if (offset + bytesPerTile > (state.rom?.byteLength ?? 0)) return null;
  return offset;
}

function loadSelectedTilePixels() {
  const tileOffset = getSelectedTileByteOffset();
  if (tileOffset == null || !state.rom) {
    state.editor.tilePixels = null;
    return;
  }
  const decoder = getTileDecoder(state.format);
  state.editor.tilePixels = decoder(state.rom, tileOffset);
}

function writeTilePixelsToRom(pixels) {
  const tileOffset = getSelectedTileByteOffset();
  if (tileOffset == null || !state.rom) return;
  const sanitized = sanitizeTilePixels(pixels, state.format);
  const encoder = getTileEncoder(state.format);
  const encoded = encoder(sanitized);
  state.rom.set(encoded, tileOffset);
  markAtlasDirty();
  state.editor.tilePixels = sanitized;
  renderTileEditor();
  requestRender();
}

function renderTileEditor() {
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

  state.offset = clamp(parsed, 0, getMaxOffset());
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
    state.editor.selectedTileIndex = null;
    state.editor.tilePixels = null;
    state.editor.clipboard = null;
    elements.offsetInput.value = formatHex(0);
    elements.alignmentInput.value = "0";
    elements.alignmentValue.textContent = "0";
    elements.fileStatus.textContent = `${file.name} - ${(state.rom.byteLength / 1024).toFixed(1)} KiB loaded`;
    elements.exportBtn.disabled = false;
    elements.saveRomBtn.disabled = false;
    elements.paletteExportJsonBtn.disabled = false;
    elements.paletteExportRawBtn.disabled = false;
    elements.pasteTileBtn.disabled = true;
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
    adjustOffset(wholeRows * state.atlas.tilesPerRow);
    offsetChanged = state.offset !== previousOffset;
    if (offsetChanged) {
      accumulator -= wholeRows;
    } else {
      accumulator = previousAccumulator;
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
    const rowStride = Math.max(1, state.view.rowStride ?? state.view.tilesPerRow ?? 1);
    const deltaTiles = wholeRows * rowStride;
    adjustOffset(deltaTiles);
  }
}

function handleCanvasClick(event) {
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
  selectTile(tileIndex);
}

function selectTile(index) {
  if (!state.rom || index == null) return;
  if (index < 0 || index >= state.view.renderedTiles) return;
  state.editor.selectedTileIndex = index;
  loadSelectedTilePixels();
  updateEditorPaletteSwatches();
  renderTiles();
}

function applyPaintAtEvent(event) {
  if (!state.rom || state.editor.selectedTileIndex == null) return;
  const rect = elements.tileEditor.getBoundingClientRect();
  const scaleX = elements.tileEditor.width / rect.width;
  const scaleY = elements.tileEditor.height / rect.height;
  const canvasX = (event.clientX - rect.left) * scaleX;
  const canvasY = (event.clientY - rect.top) * scaleY;
  const pixelSize = Math.floor(EDITOR_CANVAS_SIZE / TILE_SIZE);
  const x = clamp(Math.floor(canvasX / pixelSize), 0, TILE_SIZE - 1);
  const y = clamp(Math.floor(canvasY / pixelSize), 0, TILE_SIZE - 1);
  paintPixel(x, y, state.editor.activeColor);
}

function paintPixel(x, y, paletteIndex) {
  if (!state.editor.tilePixels) {
    loadSelectedTilePixels();
  }
  if (!state.editor.tilePixels) return;
  const idx = y * TILE_SIZE + x;
  if (state.editor.tilePixels[idx] === paletteIndex) return;
  state.editor.tilePixels[idx] = paletteIndex;
  writeTilePixelsToRom(state.editor.tilePixels);
}

function fillTileWithColor(paletteIndex) {
  if (!state.editor.tilePixels) {
    loadSelectedTilePixels();
  }
  if (!state.editor.tilePixels) return;
  state.editor.tilePixels.fill(paletteIndex);
  writeTilePixelsToRom(state.editor.tilePixels);
}

function clearTile() {
  fillTileWithColor(0);
}

function copyTile() {
  if (!state.editor.tilePixels) {
    loadSelectedTilePixels();
  }
  if (!state.editor.tilePixels) return;
  state.editor.clipboard = new Uint8Array(state.editor.tilePixels);
  elements.pasteTileBtn.disabled = false;
}

function pasteTile() {
  if (!state.editor.clipboard || state.editor.selectedTileIndex == null) return;
  const pixels = new Uint8Array(state.editor.clipboard);
  writeTilePixelsToRom(pixels);
}

function saveEditedRom() {
  if (!state.rom) return;
  const blob = new Blob([state.rom], { type: "application/octet-stream" });
  const link = document.createElement("a");
  const baseName = state.filename ? state.filename.replace(/\.[^/.]+$/u, "") : "rom";
  link.download = `${baseName}-edited.bin`;
  link.href = URL.createObjectURL(blob);
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function setupEditorEvents() {
  const editorCanvas = elements.tileEditor;
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
    fillTileWithColor(state.editor.activeColor);
  });

  elements.clearTileBtn.addEventListener("click", () => {
    if (state.editor.selectedTileIndex == null) return;
    clearTile();
  });

  elements.copyTileBtn.addEventListener("click", () => {
    if (state.editor.selectedTileIndex == null) return;
    copyTile();
  });

  elements.pasteTileBtn.addEventListener("click", () => {
    if (state.editor.selectedTileIndex == null) return;
    pasteTile();
  });
}
function setupEventListeners() {
  elements.romInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    loadRom(file);
  });

  setupDragAndDrop();
  setupEditorEvents();

  elements.offsetInput.addEventListener("blur", handleOffsetCommit);
  elements.offsetInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      handleOffsetCommit();
    }
  });

  elements.paletteExportJsonBtn.addEventListener("click", exportPaletteJson);
  elements.paletteExportRawBtn.addEventListener("click", exportPaletteRaw);

  elements.paletteImportJsonInput.addEventListener("change", () => {
    const file = elements.paletteImportJsonInput.files?.[0];
    if (file) {
      importPaletteJson(file);
      elements.paletteImportJsonInput.value = "";
    }
  });

  elements.paletteImportRawInput.addEventListener("change", () => {
    const file = elements.paletteImportRawInput.files?.[0];
    if (file) {
      importPaletteRaw(file);
      elements.paletteImportRawInput.value = "";
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

  if (elements.tileLayoutSelect) {
    elements.tileLayoutSelect.addEventListener("change", () => {
      const layoutId = elements.tileLayoutSelect.value;
      if (!Object.prototype.hasOwnProperty.call(TILE_LAYOUT_MAP, layoutId)) {
        elements.tileLayoutSelect.value = state.tileLayout;
        return;
      }
      if (state.tileLayout !== layoutId) {
        state.tileLayout = layoutId;
        renderTiles();
      }
    });
  }

  if (elements.togglePalettePane) {
    elements.togglePalettePane.addEventListener("change", () => {
      state.panes.paletteVisible = Boolean(elements.togglePalettePane.checked);
      setPaneVisibility(elements.palettePane, state.panes.paletteVisible);
    });
  }

  if (elements.toggleEditorPane) {
    elements.toggleEditorPane.addEventListener("change", () => {
      state.panes.editorVisible = Boolean(elements.toggleEditorPane.checked);
      setPaneVisibility(elements.editorPane, state.panes.editorVisible);
    });
  }

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
      const rowStride = Math.max(1, state.view.rowStride ?? state.view.tilesPerRow ?? 1);
      adjustOffset(rowStride);
      event.preventDefault();
    } else if (event.key === "ArrowUp") {
      const rowStride = Math.max(1, state.view.rowStride ?? state.view.tilesPerRow ?? 1);
      adjustOffset(-rowStride);
      event.preventDefault();
    } else if (event.key === "c" && (event.ctrlKey || event.metaKey)) {
      if (state.editor.selectedTileIndex != null) {
        copyTile();
        event.preventDefault();
      }
    } else if (event.key === "v" && (event.ctrlKey || event.metaKey)) {
      if (state.editor.clipboard && state.editor.selectedTileIndex != null) {
        pasteTile();
        event.preventDefault();
      }
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

  elements.saveRomBtn.addEventListener("click", saveEditedRom);

  elements.atlasWrapper.addEventListener("scroll", handleAtlasScroll);
  elements.atlasWrapper.addEventListener("wheel", handleAtlasWheel, { passive: false });
  elements.atlasCanvas.addEventListener("click", handleAtlasClick);
  elements.canvas.addEventListener("wheel", handleCanvasWheel, { passive: false });
  elements.canvas.addEventListener("click", handleCanvasClick);
}

function init() {
  elements.tileCountInput.value = String(state.tileCount);
  elements.zoomInput.value = String(state.zoom);
  elements.zoomValue.textContent = `${state.zoom}x`;
  elements.alignmentInput.value = String(state.alignment);
  elements.alignmentValue.textContent = String(state.alignment);
  if (elements.tileLayoutSelect) {
    elements.tileLayoutSelect.value = state.tileLayout;
  }
  elements.tileEditor.width = EDITOR_CANVAS_SIZE;
  elements.tileEditor.height = EDITOR_CANVAS_SIZE;
  syncPaneVisibility();
  updatePaletteEditor();
  setupEventListeners();
  setStatus("Load a ROM to begin.");
  renderAtlas();
  renderTileEditor();
}

init();
