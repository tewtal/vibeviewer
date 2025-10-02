export const DELTA_PIXEL = 0;
export const DELTA_LINE = 1;
export const DELTA_PAGE = 2;
export const WHEEL_LINE_HEIGHT = 16;

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function normalizeHexColor(color) {
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

export function toRgb(color) {
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

export function rgbToHex(r, g, b) {
  const toHex = (value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0").toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function parseOffset(value) {
  if (typeof value !== "string") return Number.NaN;
  const trimmed = value.trim();
  if (!trimmed) return Number.NaN;
  if (trimmed.startsWith("0x")) {
    return Number.parseInt(trimmed, 16);
  }
  if (/^\d+$/u.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }
  if (/^[0-9a-fA-F]+$/u.test(trimmed)) {
    return Number.parseInt(trimmed, 16);
  }
  return Number.NaN;
}

export function formatHex(value) {
  const numeric = Number.isFinite(value) ? value : 0;
  const unsigned = numeric >>> 0;
  return `0x${Math.max(0, unsigned).toString(16).toUpperCase()}`;
}

export function downloadBlob(data, filename, mimeType = "application/octet-stream") {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
  const link = document.createElement("a");
  link.download = filename;
  link.href = URL.createObjectURL(blob);
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

export function getWheelDeltaPixels(event) {
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
