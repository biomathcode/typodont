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
    private customColor = "#d94841"

    private presets: ColorPreset[] = [
        { label: "Issue", value: "#d94841" },
        { label: "Cavity", value: "#f4c542" },
        { label: "Filling", value: "#3b82f6" }
    ]

    install(viewer: TypodontViewer) {
        this.viewer = viewer
    }

    onModelUnload() {
        this.colors.clear()
    }

    getTools(): TypodontToolDefinition[] {
        return [
            {
                id: "visualize",
                label: "Visualize",
                icon: "visualize",
                title: "Color-code selected teeth",
                renderPanel: (host) => {
                    for (const preset of this.presets) {
                        const button = document.createElement("button")
                        button.type = "button"
                        button.className = "typodont-swatch"
                        button.title = preset.label
                        button.setAttribute("aria-label", preset.label)
                        button.style.setProperty("--typodont-swatch-color", preset.value)
                        button.addEventListener("click", () => {
                            this.applyToSelection(preset.value)
                        })
                        host.appendChild(button)
                    }

                    const colorField = document.createElement("label")
                    colorField.className = "typodont-field"
                    colorField.textContent = "Custom"

                    const colorInput = document.createElement("input")
                    colorInput.type = "color"
                    colorInput.value = this.customColor
                    colorInput.addEventListener("input", () => {
                        this.customColor = colorInput.value
                    })
                    colorField.appendChild(colorInput)
                    host.appendChild(colorField)

                    const customButton = document.createElement("button")
                    customButton.type = "button"
                    customButton.className = "typodont-button"
                    customButton.textContent = "Apply"
                    customButton.addEventListener("click", () => {
                        this.applyToSelection(this.customColor)
                    })
                    host.appendChild(customButton)

                    const clearButton = document.createElement("button")
                    clearButton.type = "button"
                    clearButton.className = "typodont-button is-icon"
                    clearButton.title = "Clear selected tooth colors"
                    clearButton.setAttribute("aria-label", "Clear selected tooth colors")
                    clearButton.innerHTML =
                        '<svg class="typodont-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path fill="none" stroke="currentColor" d="M3 12a9 9 0 1 0 3-6.7M3 4v6h6"/></svg>'
                    clearButton.addEventListener("click", () => {
                        const viewer = this.viewer
                        if (!viewer) return
                        for (const tooth of viewer.getSelectedTeeth()) {
                            const toothId = viewer.getToothId(tooth)
                            if (toothId) this.clearTooth(toothId)
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
            const toothId = viewer.getToothId(tooth)
            if (!toothId) continue
            viewer.setToothColor(toothId, color)
            this.colors.set(toothId, color)
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
