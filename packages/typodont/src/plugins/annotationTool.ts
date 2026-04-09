import * as THREE from "three"
import type { TypodontPlugin, TypodontToolDefinition } from "../plugin"
import type { TypodontViewer } from "../viewer"
import { createTextSprite, type TextSprite } from "../utils/textSprite"

type AnnotationRecord = {
    id: string
    toothName: string
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

    getTools(): TypodontToolDefinition[] {
        return [
            {
                id: "annotate",
                label: "Annotate",
                title: "Click a tooth to place a clinical note",
                renderPanel: (host) => {
                    const hint = document.createElement("div")
                    hint.className = "typodont-status"
                    hint.textContent =
                        "Click any tooth to place a note exactly where you want it."
                    host.appendChild(hint)

                    const clearButton = document.createElement("button")
                    clearButton.type = "button"
                    clearButton.className = "typodont-button"
                    clearButton.textContent = "Clear notes"
                    clearButton.addEventListener("click", () => this.clear())
                    host.appendChild(clearButton)
                }
            }
        ]
    }

    onMainPointerDown(event: PointerEvent, hit?: { tooth: THREE.Mesh; localPoint: THREE.Vector3; intersection: THREE.Intersection<THREE.Object3D> }) {
        if (event.button !== 0 || !hit || !this.viewer) return

        const faceNormal = hit.intersection.face?.normal
            ?.clone()
            .normalize()
            .multiplyScalar(0.2) ?? new THREE.Vector3(0, 0.2, 0)
        const anchor = hit.localPoint.clone().add(faceNormal)

        this.viewer.openPopoverInput({
            x: event.clientX,
            y: event.clientY,
            title: `Note for ${hit.tooth.name}`,
            placeholder: "Clinical note",
            submitLabel: "Add note",
            onSubmit: (value) => {
                this.addAnnotation(hit.tooth.name, value, anchor)
            }
        })

        return false
    }

    addAnnotation(toothName: string, text: string, point: THREE.Vector3, id?: string) {
        const viewer = this.viewer
        if (!viewer) return

        const tooth = viewer.getToothByName(toothName)
        if (!tooth) return

        const annotationId =
            id ??
            (typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : `note_${Math.random().toString(16).slice(2)}`)

        const sprite = createTextSprite(text, {
            backgroundColor: "rgba(255,255,255,0.95)",
            borderColor: "rgba(16,42,67,0.18)",
            fontSizePx: 13,
            worldScale: 0.012
        })
        sprite.sprite.position.copy(point)
        tooth.add(sprite.sprite)

        this.annotations.set(annotationId, {
            id: annotationId,
            toothName,
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
            toothName: annotation.toothName,
            text: annotation.text,
            point: annotation.point
        }))

        return entries.length > 0 ? entries : undefined
    }

    async setState(state: unknown) {
        this.clear()
        if (!Array.isArray(state)) return

        for (const entry of state) {
            const item = entry as Partial<AnnotationRecord>
            if (
                !item ||
                typeof item.id !== "string" ||
                typeof item.toothName !== "string" ||
                typeof item.text !== "string" ||
                !Array.isArray(item.point)
            ) {
                continue
            }

            this.addAnnotation(
                item.toothName,
                item.text,
                new THREE.Vector3().fromArray(item.point as [number, number, number]),
                item.id
            )
        }
    }
}

