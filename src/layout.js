import { state } from "./state.js";
import { DEFAULT_TILE_LAYOUT_ID, getTileLayoutConfig } from "./config.js";
import { clamp } from "./utils.js";

export function getCurrentTileLayout() {
  return getTileLayoutConfig(state.tileLayout);
}

export function getLayoutFromView(viewState = state.view) {
  const layoutId = viewState?.layoutId ?? state.tileLayout ?? DEFAULT_TILE_LAYOUT_ID;
  return getTileLayoutConfig(layoutId);
}

export function tileIndexToGridPosition(tileIndex, viewState = state.view) {
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

export function gridPositionToTileIndex(col, row, viewState = state.view) {
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

export function clampGridPosition(col, row, viewState = state.view) {
  const maxCol = Math.max((viewState?.tileColumns ?? 1) - 1, 0);
  const maxRow = Math.max((viewState?.tileRows ?? 1) - 1, 0);
  return {
    col: clamp(col, 0, maxCol),
    row: clamp(row, 0, maxRow),
  };
}

export function computeRowStride(viewState = state.view) {
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
