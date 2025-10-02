import { clamp, normalizeHexColor, rgbToHex, toRgb } from "./utils.js";
import { getPaletteConfig } from "./config.js";

export const NES_MASTER_PALETTE = [
  "#7C7C7C", "#0000FC", "#0000BC", "#4428BC", "#940084", "#A80020", "#A81000", "#881400",
  "#503000", "#007800", "#006800", "#005800", "#004058", "#000000", "#000000", "#000000",
  "#BCBCBC", "#0078F8", "#0058F8", "#6844FC", "#D800CC", "#E40058", "#F83800", "#E45C10",
  "#AC7C00", "#00B800", "#00A800", "#00A844", "#008888", "#000000", "#000000", "#000000",
  "#F8F8F8", "#3CBCFC", "#6888FC", "#9878F8", "#F878F8", "#F85898", "#F87858", "#FCA044",
  "#F8B800", "#B8F818", "#58D854", "#58F898", "#00E8D8", "#787878", "#000000", "#000000",
  "#FCFCFC", "#A4E4FC", "#B8B8F8", "#D8B8F8", "#F8B8F8", "#F8A4C0", "#F0D0B0", "#FCE0A8",
  "#F8D878", "#D8F878", "#B8F8B8", "#B8F8D8", "#00FCFC", "#F8D8F8", "#000000", "#000000",
];

export const NES_HEX_TO_INDEX = new Map(NES_MASTER_PALETTE.map((color, index) => [normalizeHexColor(color), index]));

export const defaultSnesPalettes = [
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

export const defaultSnes2bppPalettes = defaultSnesPalettes.map((palette) => palette.slice(0, 4));

export const gbInspiredPalettes = [
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

export const defaultPaletteSets = {
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

export function normalizePaletteSet(format, palettes) {
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

export function cloneDefaultPaletteSet(format) {
  return normalizePaletteSet(format, defaultPaletteSets[format]);
}

export function nesIndexToHex(index) {
  const safeIndex = clamp(index & 0x3f, 0, NES_MASTER_PALETTE.length - 1);
  return normalizeHexColor(NES_MASTER_PALETTE[safeIndex] ?? "#000000");
}

export function findClosestNesIndex(hex) {
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

export function hexToNesIndex(hex) {
  const normalized = normalizeHexColor(hex);
  if (NES_HEX_TO_INDEX.has(normalized)) {
    return NES_HEX_TO_INDEX.get(normalized);
  }
  return findClosestNesIndex(normalized);
}

export function hexToSnesWord(hex) {
  const [r, g, b] = toRgb(hex);
  const to5Bit = (value) => clamp(Math.round((value / 255) * 31), 0, 31);
  const r5 = to5Bit(r);
  const g5 = to5Bit(g);
  const b5 = to5Bit(b);
  return (b5 << 10) | (g5 << 5) | r5;
}

export function snesWordToHex(word) {
  const r5 = word & 0x1f;
  const g5 = (word >> 5) & 0x1f;
  const b5 = (word >> 10) & 0x1f;
  const to8Bit = (value) => clamp(Math.round((value / 31) * 255), 0, 255);
  return rgbToHex(to8Bit(r5), to8Bit(g5), to8Bit(b5));
}
