export const elements = {
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

export const ctx = elements.canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

export const editorCtx = elements.tileEditor.getContext("2d");
editorCtx.imageSmoothingEnabled = false;

export function initializeUiDefaults() {
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
}

export function setStatus(message) {
  elements.status.textContent = message;
}

export function setAtlasStatus(message) {
  elements.atlasStatus.textContent = message;
}

export function setPaneVisibility(paneElement, visible) {
  if (!paneElement) return;
  if (visible) {
    paneElement.removeAttribute("hidden");
  } else {
    paneElement.setAttribute("hidden", "");
  }
}
