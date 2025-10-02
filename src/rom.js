import { elements, setStatus } from "./dom.js";
import { state, atlasInteraction, viewInteraction } from "./state.js";
import { formatHex } from "./utils.js";
import { updatePaletteEditor } from "./palette-ui.js";
import { renderTiles } from "./render.js";

export function loadRom(file) {
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
    updatePaletteEditor();
    renderTiles();
  };
  reader.onerror = () => {
    console.error("Failed to read file", reader.error);
    setStatus("Failed to read file. Check console for details.");
  };
  reader.readAsArrayBuffer(file);
}

export function saveEditedRom() {
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
