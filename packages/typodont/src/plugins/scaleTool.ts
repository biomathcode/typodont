import type { TypodontPlugin, TypodontToolDefinition } from "../plugin"
import type { TypodontViewer } from "../viewer"

export class ScaleToolPlugin implements TypodontPlugin {
    name = "scaleTool"
    private viewer?: TypodontViewer

    install(viewer: TypodontViewer) {
        this.viewer = viewer
        viewer.registerTransformTool("scale", "scale")
    }

    getTools(): TypodontToolDefinition[] {
        return [
            {
                id: "scale",
                label: "Scale",
                icon: "scale",
                title: "Scale a selected tooth with a gizmo",
                renderPanel: (host) => {
                    const resetButton = document.createElement("button")
                    resetButton.type = "button"
                    resetButton.className = "typodont-button is-icon"
                    resetButton.title = "Reset active tooth"
                    resetButton.setAttribute("aria-label", "Reset active tooth")
                    resetButton.innerHTML =
                        '<svg class="typodont-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path fill="none" stroke="currentColor" d="M3 12a9 9 0 1 0 3-6.7M3 4v6h6"/></svg>'
                    resetButton.addEventListener("click", () => {
                        const active = this.viewer?.activeTooth
                        if (!active) return
                        const toothId = this.viewer?.getToothId(active)
                        if (!toothId) return
                        this.viewer?.resetToothTransform(toothId)
                    })

                    host.append(resetButton)
                }
            }
        ]
    }
}
