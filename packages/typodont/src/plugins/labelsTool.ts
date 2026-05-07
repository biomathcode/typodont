import * as THREE from "three"
import type { TypodontPlugin, TypodontToolDefinition } from "../plugin"
import {
    getNotationLabel,
    type TypodontNotationMode,
    type TypodontToothDetail
} from "../toothMetadata"
import { createTextSprite, type TextSprite } from "../utils/textSprite"
import type { TypodontViewer } from "../viewer"

type LabelScope = "none" | "selected" | "all"

type LabelsToolState = {
    notation: TypodontNotationMode
    scope: LabelScope
}

type LiveLabel = {
    toothId: string
    sprite: TextSprite
}

export type LabelsToolPluginOptions = {
    notation?: TypodontNotationMode
    scope?: LabelScope
    color?: string
    backgroundColor?: string
    formatter?: (tooth: TypodontToothDetail) => string
}

export class LabelsToolPlugin implements TypodontPlugin {
    name = "labelsTool"
    private viewer?: TypodontViewer
    private labels = new Map<string, LiveLabel>()
    private notation: TypodontNotationMode
    private scope: LabelScope
    private color: string
    private backgroundColor: string
    private formatter?: (tooth: TypodontToothDetail) => string

    constructor(options: LabelsToolPluginOptions = {}) {
        this.notation = options.notation ?? "FDI"
        this.scope = options.scope ?? "selected"
        this.color = options.color ?? "#183047"
        this.backgroundColor = options.backgroundColor ?? "rgba(255,255,255,0.94)"
        this.formatter = options.formatter
    }

    install(viewer: TypodontViewer) {
        this.viewer = viewer
    }

    dispose() {
        this.clearLabels()
    }

    getTools(): TypodontToolDefinition[] {
        return [
            {
                id: "labels",
                label: "Labels",
                icon: "labels",
                title: "Show tooth labels and notation",
                renderPanel: (host) => {
                    const scopeButtons = new Map<LabelScope, HTMLButtonElement>()
                    for (const scope of ["none", "selected", "all"] as const) {
                        const button = document.createElement("button")
                        button.type = "button"
                        button.className = `typodont-button${
                            this.scope === scope ? " is-active" : ""
                        }`
                        button.textContent =
                            scope === "none"
                                ? "Off"
                                : scope === "selected"
                                  ? "Selected"
                                  : "All"
                        button.addEventListener("click", () => {
                            this.scope = scope
                            this.renderLabels()
                            for (const [key, element] of scopeButtons) {
                                element.classList.toggle("is-active", key === scope)
                            }
                        })
                        scopeButtons.set(scope, button)
                        host.appendChild(button)
                    }

                    const notationButtons = new Map<TypodontNotationMode, HTMLButtonElement>()
                    for (const notation of ["FDI", "Universal", "Palmer"] as const) {
                        const button = document.createElement("button")
                        button.type = "button"
                        button.className = `typodont-button${
                            this.notation === notation ? " is-active" : ""
                        }`
                        button.textContent = notation
                        button.addEventListener("click", () => {
                            this.notation = notation
                            this.renderLabels()
                            for (const [key, element] of notationButtons) {
                                element.classList.toggle("is-active", key === notation)
                            }
                        })
                        notationButtons.set(notation, button)
                        host.appendChild(button)
                    }
                }
            }
        ]
    }

    onModelLoad() {
        this.renderLabels()
    }

    onModelUnload() {
        this.clearLabels()
    }

    onSelectionChange() {
        if (this.scope === "selected") {
            this.renderLabels()
        }
    }

    getState(): LabelsToolState | undefined {
        return this.scope === "selected" && this.notation === "FDI"
            ? undefined
            : {
                  notation: this.notation,
                  scope: this.scope
              }
    }

    async setState(state: unknown) {
        if (!state || typeof state !== "object") {
            this.clearLabels()
            return
        }
        const item = state as Partial<LabelsToolState>

        if (item.notation) this.notation = item.notation
        if (item.scope) this.scope = item.scope
        this.renderLabels()
    }

    private clearLabels() {
        for (const label of this.labels.values()) {
            label.sprite.sprite.removeFromParent()
            label.sprite.dispose()
        }
        this.labels.clear()
    }

    private renderLabels() {
        const viewer = this.viewer
        if (!viewer) return

        this.clearLabels()

        if (this.scope === "none") return

        const teeth =
            this.scope === "all" ? viewer.teethMeshes : viewer.getSelectedTeeth()

        for (const tooth of teeth) {
            if (!tooth.visible) continue
            const toothId = viewer.getToothId(tooth)
            const detail = viewer.getToothDetail(tooth)
            if (!toothId || !detail) continue

            const labelText = this.formatter
                ? this.formatter(detail)
                : getNotationLabel(detail, this.notation)

            const sprite = createTextSprite(labelText, {
                fontSizePx: 12,
                paddingPx: 7,
                worldScale: 0.01,
                textColor: this.color,
                backgroundColor: this.backgroundColor,
                borderColor: "rgba(24,48,71,0.12)"
            })

            const geometry = tooth.geometry as THREE.BufferGeometry
            geometry.computeBoundingBox()
            const bounds = geometry.boundingBox ?? new THREE.Box3()
            const center = bounds.getCenter(new THREE.Vector3())
            sprite.sprite.position.set(center.x, bounds.max.y + 0.35, center.z)
            tooth.add(sprite.sprite)
            this.labels.set(toothId, {
                toothId,
                sprite
            })
        }
    }
}
