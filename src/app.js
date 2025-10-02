import { elements, setStatus } from "./dom.js";
import { state } from "./state.js";
import { EDITOR_CANVAS_SIZE } from "./config.js";
import { syncPaneVisibility } from "./ui.js";
import { updatePaletteEditor } from "./palette-ui.js";
import { renderTileEditor } from "./editor.js";
import { renderAtlas } from "./atlas.js";
import { setupEventListeners } from "./events.js";

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
