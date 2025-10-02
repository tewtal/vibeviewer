import { clamp } from "./utils.js";

export const TILE_SIZE = 8;

export const BYTES_PER_TILE = {
  nes: 16,
  snes2bpp: 16,
  snes: 32,
};

export const PALETTE_CONFIG = {
  nes: { paletteCount: 8, colorsPerPalette: 4 },
  snes2bpp: { paletteCount: 16, colorsPerPalette: 4 },
  snes: { paletteCount: 16, colorsPerPalette: 16 },
};

export const TILE_LAYOUTS = [
  { id: "single", label: "8×8 tiles", tilesWide: 1, tilesHigh: 1 },
  { id: "vertical", label: "8×16 (stacked)", tilesWide: 1, tilesHigh: 2 },
  { id: "horizontal", label: "16×8 (side-by-side)", tilesWide: 2, tilesHigh: 1 },
  { id: "quad", label: "16×16 (2×2)", tilesWide: 2, tilesHigh: 2 },
];

export const DEFAULT_TILE_LAYOUT_ID = TILE_LAYOUTS[0].id;

export const TILE_LAYOUT_MAP = TILE_LAYOUTS.reduce((map, layout) => {
  map[layout.id] = { ...layout, tilesPerBlock: layout.tilesWide * layout.tilesHigh };
  return map;
}, {});

export const EDITOR_CANVAS_SIZE = 256;

export const FORMAT_DISPLAY_NAMES = {
  nes: "NES 2bpp",
  snes2bpp: "SNES/GB 2bpp",
  snes: "SNES 4bpp",
};

export function getFormatDisplayName(format) {
  if (typeof format !== "string") return "UNKNOWN";
  return FORMAT_DISPLAY_NAMES[format] ?? format.toUpperCase();
}

export function getTileLayoutConfig(layoutId = DEFAULT_TILE_LAYOUT_ID) {
  return TILE_LAYOUT_MAP[layoutId] ?? TILE_LAYOUT_MAP[DEFAULT_TILE_LAYOUT_ID];
}

export function getBytesPerTile(format = "nes") {
  return BYTES_PER_TILE[format] ?? BYTES_PER_TILE.nes;
}

export function getPaletteConfig(format = "nes") {
  return PALETTE_CONFIG[format] ?? PALETTE_CONFIG.nes;
}

export function clampPaletteIndex(format, index) {
  const config = getPaletteConfig(format);
  return clamp(index, 0, Math.max(config.paletteCount - 1, 0));
}

export function clampColorIndex(format, index) {
  const config = getPaletteConfig(format);
  return clamp(index, 0, Math.max(config.colorsPerPalette - 1, 0));
}
