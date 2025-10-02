import { DEFAULT_TILE_LAYOUT_ID, getTileLayoutConfig, getBytesPerTile, getPaletteConfig, clampPaletteIndex, clampColorIndex } from "./config.js";
import { clamp, normalizeHexColor } from "./utils.js";
import { cloneDefaultPaletteSet, defaultPaletteSets, normalizePaletteSet } from "./palette-data.js";

export const state = {
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

export const atlasInteraction = {
  suppressScroll: false,
  isUserScroll: false,
  scrollTimeoutId: null,
  pendingFrame: false,
  wheelRowAccumulator: 0,
};

export const viewInteraction = {
  wheelRowAccumulator: 0,
};

export function ensurePaletteSet(format = state.format) {
  const normalized = normalizePaletteSet(format, state.paletteSets[format]);
  state.paletteSets[format] = normalized;
  return normalized;
}

export function getDefaultPalette(format = state.format) {
  const defaults = defaultPaletteSets[format] ?? [];
  return defaults[0] ? defaults[0].map((color) => normalizeHexColor(color)) : [];
}

export function getActivePalette(format = state.format) {
  const sets = ensurePaletteSet(format);
  const index = clampPaletteIndex(format, state.activePaletteIndex[format] ?? 0);
  state.activePaletteIndex[format] = index;
  const palette = sets[index] ?? [];
  return palette;
}

export function setActivePaletteIndex(format, paletteIndex) {
  const config = getPaletteConfig(format);
  const clampedIndex = clamp(paletteIndex, 0, Math.max(config.paletteCount - 1, 0));
  if (state.activePaletteIndex[format] === clampedIndex) {
    return false;
  }
  state.activePaletteIndex[format] = clampedIndex;
  state.editor.activeColor = clamp(state.editor.activeColor, 0, Math.max(config.colorsPerPalette - 1, 0));
  return true;
}

export function markAtlasDirty() {
  state.atlas.needsRebuild = true;
}

export function getTotalTiles() {
  if (!state.rom) return 0;
  const bytesPerTile = getBytesPerTile(state.format);
  return Math.floor(state.rom.byteLength / bytesPerTile);
}

export function sanitizeEditorColor(format = state.format, colorIndex = state.editor.activeColor) {
  return clampColorIndex(format, colorIndex);
}
