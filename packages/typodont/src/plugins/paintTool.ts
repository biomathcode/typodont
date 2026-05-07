import * as THREE from "three"
import type {
    TypodontPlugin,
    TypodontPreviewHit,
    TypodontToolDefinition
} from "../plugin"
import type { TypodontViewer } from "../viewer"
import {
    decodeColorArray,
    encodeColorArray,
    isAllWhite
} from "../utils/stateEncoding"

type PaintPreset = {
    id: string
    label: string
    color: string
}

export type PaintToolState = Record<string, string>

export class PaintToolPlugin implements TypodontPlugin {
    name = "paintTool"
    private viewer?: TypodontViewer
    private pointerId?: number
    private brushRadius = 0.42
    private activePresetId = "cavity"

    private presets: PaintPreset[] = [
        { id: "cavity", label: "Cavity", color: "#f4c542" },
        { id: "yellowing", label: "Yellowing", color: "#ead46d" },
        { id: "filling", label: "Filling", color: "#3b82f6" },
        { id: "reset", label: "Reset brush", color: "#ffffff" }
    ]

    install(viewer: TypodontViewer) {
        this.viewer = viewer
    }

    getTools(): TypodontToolDefinition[] {
        return [
            {
                id: "paint",
                label: "Paint",
                icon: "paint",
                title: "Paint the active tooth inside the inspector preview",
                renderPanel: (host) => {
                    const buttons = new Map<string, HTMLButtonElement>()
                    for (const preset of this.presets) {
                        const button = document.createElement("button")
                        button.type = "button"
                        button.className = `typodont-swatch${
                            preset.id === this.activePresetId ? " is-active" : ""
                        }`
                        button.title = preset.label
                        button.setAttribute("aria-label", preset.label)
                        button.style.setProperty("--typodont-swatch-color", preset.color)
                        button.addEventListener("click", () => {
                            this.activePresetId = preset.id
                            for (const [id, element] of buttons.entries()) {
                                element.classList.toggle("is-active", id === preset.id)
                            }
                        })
                        buttons.set(preset.id, button)
                        host.appendChild(button)
                    }

                    const rangeWrap = document.createElement("label")
                    rangeWrap.className = "typodont-range"
                    rangeWrap.textContent = "Brush"

                    const range = document.createElement("input")
                    range.type = "range"
                    range.min = "0.08"
                    range.max = "1.2"
                    range.step = "0.01"
                    range.value = String(this.brushRadius)
                    range.addEventListener("input", () => {
                        this.brushRadius = Number(range.value)
                    })
                    rangeWrap.appendChild(range)
                    host.appendChild(rangeWrap)

                    const clearButton = document.createElement("button")
                    clearButton.type = "button"
                    clearButton.className = "typodont-button is-icon"
                    clearButton.title = "Reset active tooth"
                    clearButton.setAttribute("aria-label", "Reset active tooth")
                    clearButton.innerHTML =
                        '<svg class="typodont-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path fill="none" stroke="currentColor" d="M3 12a9 9 0 1 0 3-6.7M3 4v6h6"/></svg>'
                    clearButton.addEventListener("click", () => {
                        const active = this.viewer?.activeTooth
                        const toothId = active ? this.viewer?.getToothId(active) : undefined
                        if (!toothId) return
                        this.clearTooth(toothId)
                    })
                    host.appendChild(clearButton)
                }
            }
        ]
    }

    onPreviewPointerDown(event: PointerEvent, hit?: TypodontPreviewHit) {
        this.pointerId = event.pointerId
        if (hit) {
            this.paintAt(hit)
        }
        return true
    }

    onPreviewPointerMove(event: PointerEvent, hit?: TypodontPreviewHit) {
        if (this.pointerId !== event.pointerId) return true
        if (hit) {
            this.paintAt(hit)
        }
        return true
    }

    onPreviewPointerUp(event: PointerEvent) {
        if (this.pointerId === event.pointerId) {
            this.pointerId = undefined
        }
        return true
    }

    clearTooth(toothName: string) {
        const tooth = this.viewer?.getToothByName(toothName)
        if (!tooth) return
        const geometry = tooth.geometry as THREE.BufferGeometry
        const colors = geometry.getAttribute("color") as THREE.BufferAttribute
        const colorArray = colors.array as Float32Array
        colorArray.fill(1)
        colors.needsUpdate = true
    }

    getState(): PaintToolState | undefined {
        const viewer = this.viewer
        if (!viewer) return undefined

        const state: PaintToolState = {}
        for (const tooth of viewer.teethMeshes) {
            const geometry = tooth.geometry as THREE.BufferGeometry
            const colors = geometry.getAttribute("color") as THREE.BufferAttribute
            const colorArray = colors.array as Float32Array
            const toothId = viewer.getToothId(tooth)

            if (!toothId || isAllWhite(colorArray)) continue
            state[toothId] = encodeColorArray(colorArray)
        }

        return Object.keys(state).length > 0 ? state : undefined
    }

    async setState(state: unknown) {
        const viewer = this.viewer
        if (!viewer) return

        for (const tooth of viewer.teethMeshes) {
            const toothId = viewer.getToothId(tooth)
            if (toothId) this.clearTooth(toothId)
        }

        if (!state || typeof state !== "object") return

        for (const [toothName, encoded] of Object.entries(state as PaintToolState)) {
            if (typeof encoded !== "string") continue
            const tooth = viewer.getToothByName(toothName)
            if (!tooth) continue

            const geometry = tooth.geometry as THREE.BufferGeometry
            const colors = geometry.getAttribute("color") as THREE.BufferAttribute
            const colorArray = colors.array as Float32Array
            const restored = decodeColorArray(encoded)

            if (restored.length !== colorArray.length) continue
            colorArray.set(restored)
            colors.needsUpdate = true
        }
    }

    private paintAt(hit: TypodontPreviewHit) {
        const geometry = hit.tooth.geometry as THREE.BufferGeometry
        const positions = geometry.getAttribute("position") as THREE.BufferAttribute
        const colors = geometry.getAttribute("color") as THREE.BufferAttribute
        const positionArray = positions.array as ArrayLike<number>
        const colorArray = colors.array as Float32Array
        const brushColor = new THREE.Color(
            this.presets.find((preset) => preset.id === this.activePresetId)?.color ??
                "#f4c542"
        )
        const radiusSquared = this.brushRadius * this.brushRadius

        for (let index = 0; index < positions.count; index++) {
            const offset = index * 3
            const dx = positionArray[offset] - hit.localPoint.x
            const dy = positionArray[offset + 1] - hit.localPoint.y
            const dz = positionArray[offset + 2] - hit.localPoint.z

            if (dx * dx + dy * dy + dz * dz > radiusSquared) continue

            colorArray[offset] = brushColor.r
            colorArray[offset + 1] = brushColor.g
            colorArray[offset + 2] = brushColor.b
        }

        colors.needsUpdate = true
    }
}
