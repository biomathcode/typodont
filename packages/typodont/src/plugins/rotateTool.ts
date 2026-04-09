import type { TypodontPlugin, TypodontToolDefinition } from "../plugin"
import type { TypodontViewer } from "../viewer"

export class RotateToolPlugin implements TypodontPlugin {
    name = "rotateTool"
    private viewer?: TypodontViewer

    install(viewer: TypodontViewer) {
        this.viewer = viewer
    }

    getTools(): TypodontToolDefinition[] {
        return [
            {
                id: "rotate",
                label: "Rotate",
                title: "Rotate a selected tooth with a gizmo",
                renderPanel: (host) => {
                    const hint = document.createElement("div")
                    hint.className = "typodont-status"
                    hint.textContent =
                        "Select a tooth, then drag the gizmo rings to rotate it."

                    const resetButton = document.createElement("button")
                    resetButton.type = "button"
                    resetButton.className = "typodont-button"
                    resetButton.textContent = "Reset active"
                    resetButton.addEventListener("click", () => {
                        const active = this.viewer?.activeTooth
                        if (!active) return
                        this.viewer?.resetToothTransform(active.name)
                    })

                    host.append(hint, resetButton)
                }
            }
        ]
    }
}

