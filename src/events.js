import { elements, initializeUiDefaults, setPaneVisibility } from "./dom.js";
import { state } from "./state.js";
import { loadRom, saveEditedRom } from "./rom.js";
import {
  exportPaletteJson,
  exportPaletteRaw,
  importPaletteJson,
  importPaletteRaw,
  updatePaletteEditor,
} from "./palette-ui.js";
import {
  setupEditorEvents,
  renderTileEditor,
  copyTile,
  pasteTile,
} from "./editor.js";
import { requestRender } from "./render.js";
import {
  adjustOffset,
  clampOffsetWithinBounds,
  handleOffsetCommit,
  createCanvasWheelHandler,
  createCanvasClickHandler,
} from "./viewer.js";
import {
  renderAtlas,
  createAtlasClickHandler,
  createAtlasScrollHandler,
  createAtlasWheelHandler,
} from "./atlas.js";
import { markAtlasDirty } from "./state.js";
import { TILE_LAYOUT_MAP } from "./config.js";

export function setupEventListeners() {
  initializeUiDefaults();

  elements.romInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    loadRom(file);
  });

  setupDragAndDrop();

  setupEditorEvents({
    onTileChange: () => requestRender({ forceAtlas: true }),
  });

  elements.offsetInput.addEventListener("blur", () => {
    if (handleOffsetCommit()) {
      requestRender();
    }
  });
  elements.offsetInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      if (handleOffsetCommit()) {
        requestRender();
      }
    }
  });

  elements.paletteExportJsonBtn.addEventListener("click", exportPaletteJson);
  elements.paletteExportRawBtn.addEventListener("click", exportPaletteRaw);

  elements.paletteImportJsonInput.addEventListener("change", () => {
    const file = elements.paletteImportJsonInput.files?.[0];
    if (file) {
      importPaletteJson(file);
      elements.paletteImportJsonInput.value = "";
    }
  });

  elements.paletteImportRawInput.addEventListener("change", () => {
    const file = elements.paletteImportRawInput.files?.[0];
    if (file) {
      importPaletteRaw(file);
      elements.paletteImportRawInput.value = "";
    }
  });

  elements.tileCountInput.addEventListener("change", () => {
    const value = Number.parseInt(elements.tileCountInput.value, 10);
    if (!Number.isNaN(value) && value > 0) {
      state.tileCount = value;
      requestRender();
    } else {
      elements.tileCountInput.value = String(state.tileCount);
    }
  });

  elements.tilesPerRowInput.addEventListener("change", () => {
    const value = Number.parseInt(elements.tilesPerRowInput.value, 10);
    if (!Number.isNaN(value) && value > 0) {
      state.tilesPerRow = value;
      requestRender();
    } else {
      elements.tilesPerRowInput.value = String(state.tilesPerRow);
    }
  });

  if (elements.tileLayoutSelect) {
    elements.tileLayoutSelect.addEventListener("change", () => {
      const layoutId = elements.tileLayoutSelect.value;
      if (!Object.prototype.hasOwnProperty.call(TILE_LAYOUT_MAP, layoutId)) {
        elements.tileLayoutSelect.value = state.tileLayout;
        return;
      }
      if (state.tileLayout !== layoutId) {
        state.tileLayout = layoutId;
        requestRender();
      }
    });
  }

  if (elements.togglePalettePane) {
    elements.togglePalettePane.addEventListener("change", () => {
      state.panes.paletteVisible = Boolean(elements.togglePalettePane.checked);
      setPaneVisibility(elements.palettePane, state.panes.paletteVisible);
    });
  }

  if (elements.toggleEditorPane) {
    elements.toggleEditorPane.addEventListener("change", () => {
      state.panes.editorVisible = Boolean(elements.toggleEditorPane.checked);
      setPaneVisibility(elements.editorPane, state.panes.editorVisible);
    });
  }

  elements.zoomInput.addEventListener("input", () => {
    const value = Number.parseInt(elements.zoomInput.value, 10);
    state.zoom = Number.isNaN(value) ? 1 : clamp(value, 1, 16);
    elements.zoomValue.textContent = `${state.zoom}x`;
    requestRender();
  });

  elements.alignmentInput.addEventListener("input", () => {
    const value = Number.parseInt(elements.alignmentInput.value, 10);
    state.alignment = Number.isNaN(value) ? 0 : clamp(value, 0, 15);
    elements.alignmentValue.textContent = String(state.alignment);
    if (state.rom) {
      clampOffsetWithinBounds();
      requestRender();
    }
  });

  elements.formatRadios.forEach((radio) => {
    radio.addEventListener("change", (event) => {
      if (!event.target.checked) return;
      state.format = event.target.value;
      markAtlasDirty();
      updatePaletteEditor();
      clampOffsetWithinBounds();
      requestRender({ forceAtlas: true });
    });
  });

  window.addEventListener("keydown", (event) => {
    if (!state.rom) return;
    const active = document.activeElement;
    if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
      return;
    }
    if (event.key === "ArrowRight") {
      if (adjustOffset(1)) {
        requestRender();
      }
      event.preventDefault();
    } else if (event.key === "ArrowLeft") {
      if (adjustOffset(-1)) {
        requestRender();
      }
      event.preventDefault();
    } else if (event.key === "ArrowDown") {
      const rowStride = Math.max(1, state.view.rowStride ?? state.view.tilesPerRow ?? 1);
      if (adjustOffset(rowStride)) {
        requestRender();
      }
      event.preventDefault();
    } else if (event.key === "ArrowUp") {
      const rowStride = Math.max(1, state.view.rowStride ?? state.view.tilesPerRow ?? 1);
      if (adjustOffset(-rowStride)) {
        requestRender();
      }
      event.preventDefault();
    } else if (event.key === "c" && (event.ctrlKey || event.metaKey)) {
      if (state.editor.selectedTileIndex != null) {
        copyTile();
        event.preventDefault();
      }
    } else if (event.key === "v" && (event.ctrlKey || event.metaKey)) {
      if (state.editor.clipboard && state.editor.selectedTileIndex != null) {
        if (pasteTile()) {
          renderTileEditor();
          requestRender({ forceAtlas: true });
        }
        event.preventDefault();
      }
    }
  });

  elements.exportBtn.addEventListener("click", async () => {
    if (!state.rom || elements.exportBtn.disabled) return;
    const blob = await new Promise((resolve) => elements.canvas.toBlob(resolve, "image/png"));
    if (!blob) {
      console.warn("Failed to export canvas to PNG");
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const baseName = state.filename ? state.filename.replace(/\.[^/.]+$/u, "") : "tiles";
    link.download = `${baseName}-${state.format}-0x${state.offset.toString(16)}.png`;
    link.href = url;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  elements.saveRomBtn.addEventListener("click", saveEditedRom);

  const atlasClickHandler = createAtlasClickHandler({
    onOffsetChanged: () => requestRender(),
  });
  const atlasScrollHandler = createAtlasScrollHandler({
    onOffsetChanged: () => requestRender(),
    onHighlightUpdated: () => renderAtlas(),
  });
  const atlasWheelHandler = createAtlasWheelHandler({
    onOffsetChanged: () => requestRender(),
  });

  elements.atlasWrapper.addEventListener("scroll", atlasScrollHandler);
  elements.atlasWrapper.addEventListener("wheel", atlasWheelHandler, { passive: false });
  elements.atlasCanvas.addEventListener("click", atlasClickHandler);

  const canvasWheelHandler = createCanvasWheelHandler({
    onOffsetChanged: () => requestRender(),
  });
  const canvasClickHandler = createCanvasClickHandler({
    onTileSelected: () => requestRender(),
  });

  elements.canvas.addEventListener("wheel", canvasWheelHandler, { passive: false });
  elements.canvas.addEventListener("click", canvasClickHandler);
}

function setupDragAndDrop() {
  const loader = elements.fileLoader;

  const onDragOver = (event) => {
    event.preventDefault();
    loader.classList.add("drag-active");
  };

  const onDragLeave = (event) => {
    if (event.target === loader) {
      loader.classList.remove("drag-active");
    }
  };

  const onDrop = (event) => {
    event.preventDefault();
    loader.classList.remove("drag-active");
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      loadRom(file);
    }
  };

  ["dragenter", "dragover"].forEach((type) => loader.addEventListener(type, onDragOver));
  loader.addEventListener("dragleave", onDragLeave);
  loader.addEventListener("drop", onDrop);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
