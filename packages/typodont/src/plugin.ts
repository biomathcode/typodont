import type * as THREE from "three"
import type {
    ToothMesh,
    TypodontSelectionChangeDetail,
    TypodontViewer
} from "./viewer"

export type TypodontToothHit = {
    tooth: ToothMesh
    intersection: THREE.Intersection<THREE.Object3D>
    localPoint: THREE.Vector3
}

export type TypodontPreviewHit = {
    tooth: ToothMesh
    intersection: THREE.Intersection<THREE.Object3D>
    localPoint: THREE.Vector3
}

export type TypodontToolDefinition = {
    id: string
    label: string
    icon?: string
    title?: string
    renderPanel?: (
        host: HTMLElement,
        viewer: TypodontViewer
    ) => void | (() => void)
}

export type TypodontActionDefinition = {
    id: string
    label: string
    icon?: string
    title?: string
    onClick: (viewer: TypodontViewer) => void
}

export interface TypodontPlugin {
    name: string

    install?(viewer: TypodontViewer): void
    dispose?(): void

    getTools?(): TypodontToolDefinition[]
    getActions?(): TypodontActionDefinition[]

    onModelLoad?(): void
    onModelUnload?(): void
    onSelectionChange?(detail: TypodontSelectionChangeDetail): void
    onActiveToolChange?(activeTool: string, previousTool?: string): void

    onMainPointerDown?(event: PointerEvent, hit?: TypodontToothHit): boolean | void
    onMainPointerMove?(event: PointerEvent, hit?: TypodontToothHit): boolean | void
    onMainPointerUp?(event: PointerEvent, hit?: TypodontToothHit): boolean | void

    onPreviewPointerDown?(
        event: PointerEvent,
        hit?: TypodontPreviewHit
    ): boolean | void
    onPreviewPointerMove?(
        event: PointerEvent,
        hit?: TypodontPreviewHit
    ): boolean | void
    onPreviewPointerUp?(event: PointerEvent, hit?: TypodontPreviewHit): boolean | void

    onBeforeRender?(): void
    onAfterRender?(): void

    getState?(): unknown
    setState?(state: unknown): void | Promise<void>
}
