import type { TypodontPlugin, TypodontToolDefinition } from "../plugin"
import type { TypodontViewer } from "../viewer"

type VisualizationState = Record<string, string>

type ColorPreset = {
    label: string
    value: string
}

export class VisualizationToolPlugin implements TypodontPlugin {
    name = "visualizationTool"
    private viewer?: TypodontViewer
    private colors = new Map<string, string>()

    private presets: ColorPreset[] = [
        { label: "Issue", value: "#d94841" },
        { label: "Cavity", value: "#f4c542" },
        { label: "Filling", value: "#3b82f6" }
    ]

    install(viewer: TypodontViewer) {
        this.viewer = viewer
    }

    getTools(): TypodontToolDefinition[] {
        return [
            {
                id: "visualize",
                label: "Visualize",
                title: "Color-code selected teeth",
                renderPanel: (host) => {
                    const hint = document.createElement("div")
                    hint.className = "typodont-status"
                    hint.textContent =
                        "Select teeth in the main view, then apply a whole-tooth clinical color."
                    host.appendChild(hint)

                    for (const preset of this.presets) {
                        const button = document.createElement("button")
                        button.type = "button"
                        button.className = "typodont-button"
                        button.textContent = preset.label
                        button.addEventListener("click", () => {
                            this.applyToSelection(preset.value)
                        })
                        host.appendChild(button)
                    }

                    const clearButton = document.createElement("button")
                    clearButton.type = "button"
                    clearButton.className = "typodont-button"
                    clearButton.textContent = "Clear selected"
                    clearButton.addEventListener("click", () => {
                        const viewer = this.viewer
                        if (!viewer) return
                        for (const tooth of viewer.getSelectedTeeth()) {
                            this.clearTooth(tooth.name)
                        }
                    })
                    host.appendChild(clearButton)
                }
            }
        ]
    }

    applyToSelection(color: string) {
        const viewer = this.viewer
        if (!viewer) return

        for (const tooth of viewer.getSelectedTeeth()) {
            viewer.setToothColor(tooth.name, color)
            this.colors.set(tooth.name, color)
        }
    }

    clearTooth(toothName: string) {
        this.viewer?.resetToothColor(toothName)
        this.colors.delete(toothName)
    }

    getState(): VisualizationState | undefined {
        const state = Object.fromEntries(this.colors)
        return Object.keys(state).length > 0 ? state : undefined
    }

    async setState(state: unknown) {
        for (const toothName of [...this.colors.keys()]) {
            this.clearTooth(toothName)
        }

        if (!state || typeof state !== "object") return

        for (const [toothName, color] of Object.entries(state as VisualizationState)) {
            if (typeof color !== "string") continue
            this.viewer?.setToothColor(toothName, color)
            this.colors.set(toothName, color)
        }
    }
}

