const STYLE_ID = "typodont-viewer-styles"

const styles = `
.typodont-viewer {
  --typodont-font: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --typodont-text: #183047;
  --typodont-muted: #62748a;
  --typodont-accent: #0f766e;
  --typodont-danger: #b85450;
  --typodont-background: #edf3f7;
  --typodont-surface: rgba(255, 255, 255, 0.92);
  --typodont-border: rgba(24, 48, 71, 0.12);
  --typodont-shadow: 0 10px 28px rgba(24, 48, 71, 0.12);
  --typodont-button: rgba(24, 48, 71, 0.06);
  --typodont-button-hover: rgba(24, 48, 71, 0.1);
  --typodont-button-active: #183047;
  --typodont-radius: 8px;
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--typodont-background);
  color: var(--typodont-text);
  font-family: var(--typodont-font);
}

.typodont-viewer canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}

.typodont-viewer:fullscreen {
  width: 100vw;
  height: 100vh;
}

.typodont-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.typodont-preview-frame {
  position: absolute;
  width: min(280px, 28vw);
  height: min(220px, 24vh);
  border-radius: var(--typodont-radius);
  background: rgba(255, 255, 255, 0.52);
  border: 1px solid var(--typodont-border);
  box-shadow: var(--typodont-shadow);
}

.typodont-preview-frame::after {
  content: "";
  position: absolute;
  inset: 8px;
  border: 1px solid rgba(24, 48, 71, 0.08);
  border-radius: calc(var(--typodont-radius) - 2px);
  pointer-events: none;
}

.typodont-preview-frame.is-hidden {
  display: none;
}

.typodont-preview-frame.is-top-left {
  top: 18px;
  left: 18px;
}

.typodont-preview-frame.is-top-right {
  top: 18px;
  right: 18px;
}

.typodont-preview-frame.is-bottom-left {
  bottom: 100px;
  left: 18px;
}

.typodont-preview-frame.is-bottom-right {
  bottom: 100px;
  right: 18px;
}

.typodont-bottom {
  position: absolute;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  width: min(calc(100% - 24px), 980px);
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  pointer-events: none;
}

.typodont-panel,
.typodont-toolbar,
.typodont-note-popover {
  border: 1px solid var(--typodont-border);
  background: var(--typodont-surface);
  box-shadow: var(--typodont-shadow);
}

.typodont-panel {
  min-height: 44px;
  max-width: 100%;
  padding: 10px 12px;
  border-radius: var(--typodont-radius);
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  pointer-events: auto;
}

.typodont-toolbar {
  width: fit-content;
  max-width: 100%;
  padding: 10px 12px;
  border-radius: calc(var(--typodont-radius) + 4px);
  display: grid;
  grid-template-columns: auto auto;
  gap: 10px;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

.typodont-toolbar-section {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.typodont-toolbar-section.is-center,
.typodont-toolbar-section.is-end {
  flex-wrap: wrap;
}

.typodont-toolbar-section.is-center {
  justify-content: center;
}

.typodont-toolbar-section.is-end {
  justify-content: flex-end;
}

.typodont-status {
  min-width: 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(24, 48, 71, 0.05);
  color: var(--typodont-muted);
  font-size: 12px;
  line-height: 1.35;
}

.typodont-button,
.typodont-swatch,
.typodont-input button,
.typodont-input input {
  appearance: none;
  border: 0;
  font: inherit;
}

.typodont-button {
  min-width: 38px;
  min-height: 38px;
  padding: 9px 12px;
  border-radius: 8px;
  background: var(--typodont-button);
  color: var(--typodont-text);
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease, transform 140ms ease;
}

.typodont-button:hover {
  background: var(--typodont-button-hover);
}

.typodont-button.is-active {
  background: var(--typodont-button-active);
  color: white;
}

.typodont-button.is-accent {
  background: var(--typodont-accent);
  color: white;
}

.typodont-button.is-danger {
  background: var(--typodont-danger);
  color: white;
}

.typodont-button.is-icon {
  width: 38px;
  height: 38px;
  display: inline-grid;
  place-items: center;
  padding: 0;
}

.typodont-icon {
  width: 18px;
  height: 18px;
  display: block;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
  color: currentColor;
  pointer-events: none;
}

.typodont-icon path {
  fill: none;
  stroke: currentColor;
  vector-effect: non-scaling-stroke;
}

.typodont-swatch {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 2px solid var(--typodont-border);
  background: var(--typodont-swatch-color, white);
  cursor: pointer;
}

.typodont-swatch.is-active {
  outline: 2px solid var(--typodont-button-active);
  outline-offset: 2px;
}

.typodont-range,
.typodont-field {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px;
  color: var(--typodont-muted);
  font-size: 12px;
}

.typodont-range input,
.typodont-field input,
.typodont-field select {
  width: 140px;
}

.typodont-field input,
.typodont-field select,
.typodont-input input {
  padding: 9px 11px;
  border-radius: 8px;
  border: 1px solid var(--typodont-border);
  color: var(--typodont-text);
  background: white;
}

.typodont-note-popover {
  position: absolute;
  min-width: 240px;
  max-width: min(360px, calc(100vw - 32px));
  padding: 10px;
  border-radius: var(--typodont-radius);
  pointer-events: auto;
}

.typodont-note-popover.is-hidden {
  display: none;
}

.typodont-input {
  display: grid;
  gap: 8px;
}

.typodont-input-title {
  font-size: 12px;
  color: var(--typodont-muted);
}

.typodont-input-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 900px) {
  .typodont-toolbar {
    grid-template-columns: 1fr;
  }

  .typodont-toolbar-section,
  .typodont-toolbar-section.is-end,
  .typodont-toolbar-section.is-center {
    justify-content: center;
  }

  .typodont-preview-frame {
    width: min(220px, 42vw);
    height: min(180px, 22vh);
  }
}

.typodont-viewer.is-mobile-view .typodont-bottom {
  bottom: 10px;
  width: calc(100% - 16px);
}

.typodont-viewer.is-mobile-view .typodont-toolbar {
  grid-template-columns: minmax(0, 1fr) auto;
  padding: 8px;
}

.typodont-viewer.is-mobile-view .typodont-status {
  display: none;
}

.typodont-viewer.is-mobile-view .typodont-toolbar-section.is-center {
  justify-content: flex-start;
  overflow-x: auto;
  scrollbar-width: none;
}

.typodont-viewer.is-mobile-view .typodont-toolbar-section.is-center::-webkit-scrollbar {
  display: none;
}

.typodont-viewer.is-mobile-view .typodont-panel {
  justify-content: flex-start;
  overflow-x: auto;
  max-width: 100%;
  flex-wrap: nowrap;
}

.typodont-viewer.is-mobile-view .typodont-preview-frame {
  width: min(168px, 46vw);
  height: min(138px, 22vh);
  top: 10px;
  right: 10px;
}
`

export function ensureTypodontStyles() {
    if (document.getElementById(STYLE_ID)) return

    const style = document.createElement("style")
    style.id = STYLE_ID
    style.textContent = styles
    document.head.appendChild(style)
}
