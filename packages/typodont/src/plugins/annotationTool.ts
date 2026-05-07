import * as THREE from "three"
import type { TypodontPlugin, TypodontToolDefinition } from "../plugin"
import type { TypodontViewer } from "../viewer"
import { createTextSprite, type TextSprite } from "../utils/textSprite"

type AnnotationRecord = {
    id: string
    toothId: string
    text: string
    point: [number, number, number]
}

type LiveAnnotation = AnnotationRecord & {
    sprite: TextSprite
}

export class AnnotationToolPlugin implements TypodontPlugin {
    name = "annotationTool"
    private viewer?: TypodontViewer
    private annotations = new Map<string, LiveAnnotation>()

    install(viewer: TypodontViewer) {
        this.viewer = viewer
    }

    dispose() {
        this.clear()
    }

    onModelUnload() {
        this.clear()
    }

    getTools(): TypodontToolDefinition[] {
        return [
            {
                id: "annotate",
                label: "Annotate",
                icon: "annotate",
                title: "Click a tooth to place a clinical note",
                renderPanel: (host) => {
                    const count = document.createElement("div")
                    count.className = "typodont-status"
                    count.textContent = `${this.annotations.size} annotation${
                        this.annotations.size === 1 ? "" : "s"
                    }`
                    host.appendChild(count)

                    const clearButton = document.createElement("button")
                    clearButton.type = "button"
                    clearButton.className = "typodont-button is-icon"
                    clearButton.title = "Clear notes"
                    clearButton.setAttribute("aria-label", "Clear notes")
                    clearButton.innerHTML =
                        '<svg class="typodont-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path fill="none" stroke="currentColor" d="M3 12a9 9 0 1 0 3-6.7M3 4v6h6"/></svg>'
                    clearButton.addEventListener("click", () => this.clear())
                    host.appendChild(clearButton)
                }
            }
        ]
    }

    onMainPointerDown(
        event: PointerEvent,
        hit?: {
            tooth: THREE.Mesh
            localPoint: THREE.Vector3
            intersection: THREE.Intersection<THREE.Object3D>
        }
    ) {
        if (!hit || !this.viewer) return

        const toothId = this.viewer.getToothId(hit.tooth)
        if (!toothId) return

        const faceNormal =
            hit.intersection.face?.normal?.clone().normalize().multiplyScalar(0.2) ??
            new THREE.Vector3(0, 0.2, 0)
        const anchor = hit.localPoint.clone().add(faceNormal)
        const tooth = this.viewer.getToothDetail(hit.tooth)
        const existing = this.annotations.get(toothId)

        this.viewer.openPopoverInput({
            x: event.clientX,
            y: event.clientY,
            title: tooth ? `Note for ${tooth.notations.fdi}` : `Note for ${toothId}`,
            placeholder: "Clinical note",
            initialValue: existing?.text,
            submitLabel: existing ? "Update note" : "Add note",
            onSubmit: (value) => {
                this.addAnnotation(toothId, value, anchor)
            }
        })

        return false
    }

    addAnnotation(toothId: string, text: string, point: THREE.Vector3, id?: string) {
        const viewer = this.viewer
        if (!viewer) return

        const tooth = viewer.getToothByName(toothId)
        if (!tooth) return

        const existing = this.annotations.get(toothId)
        existing?.sprite.sprite.removeFromParent()
        existing?.sprite.dispose()

        const annotationId = id ?? existing?.id ?? toothId

        const sprite = createTextSprite(text, {
            backgroundColor: "rgba(255,255,255,0.95)",
            borderColor: "rgba(24,48,71,0.18)",
            fontSizePx: 13,
            worldScale: 0.012
        })
        sprite.sprite.position.copy(point)
        tooth.add(sprite.sprite)

        this.annotations.set(toothId, {
            id: annotationId,
            toothId,
            text,
            point: point.toArray() as [number, number, number],
            sprite
        })
    }

    clear() {
        for (const annotation of this.annotations.values()) {
            annotation.sprite.sprite.removeFromParent()
            annotation.sprite.dispose()
        }
        this.annotations.clear()
    }

    getState() {
        const entries = [...this.annotations.values()].map((annotation) => ({
            id: annotation.id,
            toothId: annotation.toothId,
            text: annotation.text,
            point: annotation.point
        }))

        return entries.length > 0 ? entries : undefined
    }

    async setState(state: unknown) {
        this.clear()
        if (!Array.isArray(state)) return

        for (const entry of state) {
            const item = entry as Partial<AnnotationRecord> & {
                toothName?: string
            }

            const toothId = item.toothId ?? item.toothName
            if (
                !item ||
                typeof toothId !== "string" ||
                typeof item.text !== "string" ||
                !Array.isArray(item.point)
            ) {
                continue
            }

            this.addAnnotation(
                toothId,
                item.text,
                new THREE.Vector3().fromArray(item.point as [number, number, number]),
                typeof item.id === "string" ? item.id : toothId
            )
        }
    }
}
