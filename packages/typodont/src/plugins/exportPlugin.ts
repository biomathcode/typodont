import type { TypodontActionDefinition, TypodontPlugin } from "../plugin"
import type { TypodontViewer, TypodontViewerState } from "../viewer"

export type ExportPluginOptions = {
    imageFileName?: string
    stateFileName?: string
    storageKey?: string
}

export class ExportPlugin implements TypodontPlugin {
    name = "exportPlugin"
    private viewer?: TypodontViewer
    private options: Required<ExportPluginOptions>

    constructor(options: ExportPluginOptions = {}) {
        this.options = {
            imageFileName: options.imageFileName ?? "typodont-view.png",
            stateFileName: options.stateFileName ?? "typodont-state.json",
            storageKey: options.storageKey ?? "typodont-state"
        }
    }

    install(viewer: TypodontViewer) {
        this.viewer = viewer
    }

    getActions(): TypodontActionDefinition[] {
        return [
            {
                id: "export-state",
                label: "State",
                icon: "file",
                title: "Download the current viewer state as JSON",
                onClick: () => this.downloadState()
            },
            {
                id: "export-png",
                label: "PNG",
                icon: "download",
                title: "Download the current canvas as PNG",
                onClick: () => this.downloadPNG()
            }
        ]
    }

    exportState() {
        return this.viewer?.serializeState()
    }

    async importState(state: TypodontViewerState) {
        await this.viewer?.loadState(state)
    }

    saveToStorage(key = this.options.storageKey) {
        const state = this.exportState()
        if (!state) return
        localStorage.setItem(key, JSON.stringify(state))
    }

    async loadFromStorage(key = this.options.storageKey) {
        const value = localStorage.getItem(key)
        if (!value) return
        const state = JSON.parse(value) as TypodontViewerState
        await this.importState(state)
    }

    downloadState(fileName = this.options.stateFileName) {
        const state = this.exportState()
        if (!state) return

        const blob = new Blob([JSON.stringify(state, null, 2)], {
            type: "application/json"
        })
        const link = document.createElement("a")
        link.href = URL.createObjectURL(blob)
        link.download = fileName
        link.click()
        URL.revokeObjectURL(link.href)
    }

    downloadPNG(fileName = this.options.imageFileName) {
        this.viewer?.downloadPNG(fileName)
    }
}
