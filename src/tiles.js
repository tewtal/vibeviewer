import { state, getActivePalette, getDefaultPalette } from "./state.js";
import { TILE_SIZE, getBytesPerTile, getTileLayoutConfig, getPaletteConfig } from "./config.js";
import { computeRowStride } from "./layout.js";
import { clamp, toRgb } from "./utils.js";

export function decodeNesTile(data, offset) {
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

export function decodeSnes2bppTile(data, offset) {
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

export function decodeSnesTile(data, offset) {
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

export function encodeNesTile(pixels) {
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

export function encodeSnes2bppTile(pixels) {
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

export function encodeSnesTile(pixels) {
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

export function getTileDecoder(format = state.format) {
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

export function getTileEncoder(format = state.format) {
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

export function sanitizeTilePixels(pixels, format = state.format) {
  const config = getPaletteConfig(format);
  const maxIndex = Math.max(0, config.colorsPerPalette - 1);
  const sanitized = new Uint8Array(pixels.length);
  for (let i = 0; i < pixels.length; i += 1) {
    sanitized[i] = clamp(pixels[i] ?? 0, 0, maxIndex);
  }
  return sanitized;
}

export function drawTilesToCanvas(canvas, { startByte, tileCount, tilesPerRow, zoom, layoutId, layout }) {
  const layoutConfig = layout ?? getTileLayoutConfig(layoutId ?? state.tileLayout);
  const tilesPerBlock = layoutConfig.tilesPerBlock;
  const bytesPerTile = getBytesPerTile(state.format);
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
