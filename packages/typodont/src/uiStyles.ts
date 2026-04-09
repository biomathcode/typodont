const STYLE_ID = "typodont-viewer-styles"

const styles = `
.typodont-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background:
    radial-gradient(1200px 700px at 20% 10%, rgba(188, 222, 255, 0.7) 0%, rgba(232, 240, 247, 0.92) 45%, #dfe8ef 100%);
  color: #102a43;
  font-family: "Avenir Next", "Segoe UI", sans-serif;
}

.typodont-viewer canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}

.typodont-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.typodont-preview-frame {
  position: absolute;
  width: min(300px, 30vw);
  height: min(230px, 24vh);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255,255,255,0.74), rgba(236,244,250,0.58));
  border: 1px solid rgba(16, 42, 67, 0.12);
  box-shadow: 0 18px 48px rgba(16, 42, 67, 0.18);
  backdrop-filter: blur(10px);
}

.typodont-preview-frame::after {
  content: "Mini Preview";
  position: absolute;
  top: 10px;
  left: 12px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(255,255,255,0.9);
  color: #486581;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
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
  bottom: 108px;
  left: 18px;
}

.typodont-preview-frame.is-bottom-right {
  bottom: 108px;
  right: 18px;
}

.typodont-bottom {
  position: absolute;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  width: min(calc(100% - 28px), 920px);
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  pointer-events: none;
}

.typodont-panel {
  min-height: 46px;
  max-width: 100%;
  padding: 10px 14px;
  border-radius: 16px;
  background: rgba(255,255,255,0.78);
  border: 1px solid rgba(16, 42, 67, 0.1);
  box-shadow: 0 18px 44px rgba(16, 42, 67, 0.16);
  backdrop-filter: blur(14px);
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  pointer-events: auto;
}

.typodont-toolbar {
  width: 100%;
  padding: 10px 12px;
  border-radius: 20px;
  background: rgba(255,255,255,0.84);
  border: 1px solid rgba(16, 42, 67, 0.12);
  box-shadow: 0 18px 44px rgba(16, 42, 67, 0.18);
  backdrop-filter: blur(16px);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  pointer-events: auto;
}

.typodont-toolbar-section {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.typodont-toolbar-section.is-center {
  justify-content: center;
  flex-wrap: wrap;
}

.typodont-toolbar-section.is-end {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.typodont-status {
  min-width: 0;
  padding: 9px 12px;
  border-radius: 14px;
  background: rgba(16,42,67,0.05);
  color: #486581;
  font-size: 12px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.typodont-button,
.typodont-swatch,
.typodont-input button {
  appearance: none;
  border: 0;
  font: inherit;
}

.typodont-button {
  padding: 10px 14px;
  border-radius: 14px;
  background: rgba(16,42,67,0.06);
  color: #102a43;
  cursor: pointer;
  transition: background 140ms ease, transform 140ms ease, color 140ms ease;
}

.typodont-button:hover {
  background: rgba(16,42,67,0.11);
}

.typodont-button.is-active {
  background: #102a43;
  color: white;
}

.typodont-button.is-accent {
  background: #0b7285;
  color: white;
}

.typodont-button.is-danger {
  background: #d64545;
  color: white;
}

.typodont-swatch {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 2px solid rgba(16,42,67,0.12);
  cursor: pointer;
}

.typodont-range {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 6px;
  color: #486581;
  font-size: 12px;
}

.typodont-range input {
  width: 140px;
}

.typodont-note-popover {
  position: absolute;
  min-width: 240px;
  max-width: min(360px, calc(100vw - 32px));
  padding: 10px;
  border-radius: 16px;
  background: rgba(255,255,255,0.95);
  border: 1px solid rgba(16, 42, 67, 0.12);
  box-shadow: 0 24px 44px rgba(16, 42, 67, 0.22);
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
  color: #486581;
}

.typodont-input input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(16, 42, 67, 0.14);
  font: inherit;
  color: #102a43;
  background: white;
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
    width: min(220px, 40vw);
    height: min(170px, 20vh);
  }
}
`

export function ensureTypodontStyles() {
    if (typeof document === "undefined") return
    if (document.getElementById(STYLE_ID)) return

    const style = document.createElement("style")
    style.id = STYLE_ID
    style.textContent = styles
    document.head.appendChild(style)
}

