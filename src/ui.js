import { elements, setPaneVisibility } from "./dom.js";
import { state } from "./state.js";

export function syncPaneVisibility() {
  setPaneVisibility(elements.palettePane, state.panes.paletteVisible);
  setPaneVisibility(elements.editorPane, state.panes.editorVisible);
  if (elements.togglePalettePane) {
    elements.togglePalettePane.checked = state.panes.paletteVisible;
  }
  if (elements.toggleEditorPane) {
    elements.toggleEditorPane.checked = state.panes.editorVisible;
  }
}
