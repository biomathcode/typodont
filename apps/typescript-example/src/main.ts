import "./style.css"

import {
    AnnotationToolPlugin,
    ExportPlugin,
    PaintToolPlugin,
    RotateToolPlugin,
    TypodontViewer,
    VisualizationToolPlugin
} from "typodont"

const container = document.getElementById("viewer")

if (!container) {
    throw new Error("Missing #viewer container")
}

const viewer = new TypodontViewer(container, {
    defaultTool: "view",
    previewPlacement: "top-right"
})

const exporter = new ExportPlugin({
    storageKey: "typodont-clinical-demo"
})

viewer
    .use(new RotateToolPlugin())
    .use(new PaintToolPlugin())
    .use(new AnnotationToolPlugin())
    .use(new VisualizationToolPlugin())
    .use(exporter)

viewer.ready.then(async () => {
    await exporter.loadFromStorage()
})

window.addEventListener("beforeunload", () => {
    exporter.saveToStorage()
})

