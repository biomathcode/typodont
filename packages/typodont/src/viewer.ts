import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js"
import { loadTypodont } from "./loader"
import type { TypodontModelSource } from "./modelSource"
import type {
    TypodontActionDefinition,
    TypodontPlugin,
    TypodontPreviewHit,
    TypodontToolDefinition,
    TypodontToothHit
} from "./plugin"
import {
    getNotationLabel,
    getToothDetail,
    normalizeToothId,
    type TypodontNotationMode,
    type TypodontToothDetail
} from "./toothMetadata"
import { ensureTypodontStyles } from "./uiStyles"

export type ToothMesh = THREE.Mesh

type ToothTransformSnapshot = {
    position: THREE.Vector3
    quaternion: THREE.Quaternion
    scale: THREE.Vector3
    visible: boolean
}

type PreviewBounds = {
    left: number
    top: number
    width: number
    height: number
}

type PopoverOptions = {
    x: number
    y: number
    title?: string
    placeholder?: string
    initialValue?: string
    submitLabel?: string
    onSubmit: (value: string) => void
}

type RegisteredTool = {
    plugin?: TypodontPlugin
    definition: TypodontToolDefinition
}

type RegisteredAction = {
    plugin?: TypodontPlugin
    definition: TypodontActionDefinition
}

type TransformToolMode = "rotate" | "scale"
type NavigationMode = "pan" | "rotate"

const DEFAULT_LIGHTING: Required<
    Pick<
        TypodontLightingOptions,
        | "enableDefaultLights"
        | "background"
        | "previewBackground"
        | "environmentIntensity"
    >
> = {
    enableDefaultLights: true,
    background: "#edf3f7",
    previewBackground: "#f8fafb",
    environmentIntensity: 1
}

const ICON_PATHS: Record<string, string> = {
    view: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
    rotate: "M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6",
    scale: "M15 3h6v6M21 3l-7 7M9 21H3v-6M3 21l7-7",
    paint: "M12 19l7-7 3 3-7 7h-3v-3ZM18 13l-7-7 2-2a2.8 2.8 0 0 1 4 0l3 3a2.8 2.8 0 0 1 0 4l-2 2ZM2 22h8",
    labels: "M4 5h16M4 12h10M4 19h16",
    annotate: "M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z",
    visualize: "M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07",
    lighting: "M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z",
    fullscreen: "M8 3H3v5M3 3l6 6M16 3h5v5M21 3l-6 6M8 21H3v-5M3 21l6-6M16 21h5v-5M21 21l-6-6",
    download: "M12 3v12M7 10l5 5 5-5M5 21h14",
    file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6ZM14 2v6h6",
    reset: "M3 12a9 9 0 1 0 3-6.7M3 4v6h6",
    hide: "M3 3l18 18M10.6 10.6A3 3 0 0 0 14 14M9.9 4.24A10.9 10.9 0 0 1 12 4a10.75 10.75 0 0 1 9.94 7.65 1 1 0 0 1 0 .7 10.8 10.8 0 0 1-2.58 4.14M6.53 6.53a10.9 10.9 0 0 0-4.47 5.12 1 1 0 0 0 0 .7A10.75 10.75 0 0 0 12 20a10.9 10.9 0 0 0 4.08-.79",
    brush: "M3 21c3 0 5-1 5-4a3 3 0 0 0-3-3c-3 0-4 2-4 5v2h2ZM14 3l7 7-9 9-7-7 9-9Z"
}

export type TypodontSelectionChangeDetail = {
    selectedToothNames: string[]
    selectedToothIds: string[]
    selectedTeeth: TypodontToothDetail[]
    activeToothName?: string
    activeToothId?: string
    activeTooth?: TypodontToothDetail
}

export type TypodontViewerState = {
    version: 1
    selectedToothNames: string[]
    hiddenToothNames?: string[]
    activeTool: string
    camera: {
        position: [number, number, number]
        target: [number, number, number]
    }
    teethTransforms: Record<
        string,
        {
            position: [number, number, number]
            quaternion: [number, number, number, number]
            scale: [number, number, number]
        }
    >
    plugins: Record<string, unknown>
}

export type TypodontToothTransform = {
    position?: [number, number, number]
    rotation?: [number, number, number]
    quaternion?: [number, number, number, number]
    scale?: number | [number, number, number]
}

export type TypodontInitialToothState = TypodontToothTransform & {
    color?: THREE.ColorRepresentation
    selected?: boolean
    hidden?: boolean
}

export type TypodontLightingOptions = {
    enableDefaultLights?: boolean
    background?: THREE.ColorRepresentation | THREE.Texture | null
    previewBackground?: THREE.ColorRepresentation | THREE.Texture | null
    environmentMap?: THREE.Texture | null
    previewEnvironmentMap?: THREE.Texture | null
    sceneLights?: THREE.Object3D | THREE.Object3D[]
    previewLights?: THREE.Object3D | THREE.Object3D[]
    environmentIntensity?: number
}

export type TypodontInteractionKeyOptions = {
    pan?: string | null
    rotate?: string | null
}

export type TypodontViewerOptions = {
    defaultTool?: string
    previewPlacement?: "top-left" | "top-right" | "bottom-left" | "bottom-right"
    injectDefaultStyles?: boolean
    autoloadModel?: boolean
    model?: string | TypodontModelSource | null
    initialState?: TypodontViewerState
    initialSelection?: string[]
    initialTeeth?: Record<string, TypodontInitialToothState>
    lighting?: TypodontLightingOptions
    interactionKeys?: TypodontInteractionKeyOptions
}

export class TypodontViewer {
    container: HTMLElement
    options: Required<
        Pick<
            TypodontViewerOptions,
            "defaultTool" | "previewPlacement" | "injectDefaultStyles" | "autoloadModel"
        >
    > &
        Omit<
            TypodontViewerOptions,
            "defaultTool" | "previewPlacement" | "injectDefaultStyles" | "autoloadModel"
        >

    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200)
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true
    })
    composer: EffectComposer

    controls: OrbitControls
    transformControls: TransformControls

    raycaster = new THREE.Raycaster()
    pointer = new THREE.Vector2()

    teethMeshes: ToothMesh[] = []
    hoveredTooth?: ToothMesh
    activeTooth?: ToothMesh
    selectedTeeth = new Set<ToothMesh>()

    selectionOutlinePass: OutlinePass
    hoverOutlinePass: OutlinePass

    plugins: TypodontPlugin[] = []

    activeTool: string
    ready: Promise<void>

    previewScene = new THREE.Scene()
    previewCamera = new THREE.PerspectiveCamera(35, 1, 0.01, 100)
    previewRoot = new THREE.Group()
    previewTooth?: ToothMesh
    previewSourceTooth?: ToothMesh
    previewBounds: PreviewBounds = { left: 0, top: 0, width: 0, height: 0 }
    previewOrbit = {
        azimuth: Math.PI / 4,
        polar: Math.PI / 2.3,
        distance: 4
    }

    overlay: HTMLDivElement
    previewFrame: HTMLDivElement
    bottomDock: HTMLDivElement
    panelHost: HTMLDivElement
    toolbar: HTMLDivElement
    statusLabel: HTMLDivElement
    toolHost: HTMLDivElement
    actionHost: HTMLDivElement
    popover: HTMLDivElement

    private mainLightRig = new THREE.Group()
    private previewLightRig = new THREE.Group()
    private lighting: TypodontLightingOptions = { ...DEFAULT_LIGHTING }
    private toolRegistry = new Map<string, RegisteredTool>()
    private actionRegistry = new Map<string, RegisteredAction>()
    private transformToolModes = new Map<string, TransformToolMode>()
    private panelCleanup?: () => void
    private previewPointerId?: number
    private previewDragging = false
    private previewDragMode: "orbit" | "tool" | undefined
    private previewDragStart = { x: 0, y: 0 }
    private transformDragging = false
    private modelRoot?: THREE.Object3D
    private modelSource?: string | TypodontModelSource | null
    private originalTransforms = new Map<string, ToothTransformSnapshot>()
    private resizeObserver?: ResizeObserver
    private resolveReady!: () => void
    private rejectReady!: (reason?: unknown) => void
    private readySettled = false
    private pendingState?: TypodontViewerState
    private mainControlsForcedDisabled = false
    private interactionKeys: Required<TypodontInteractionKeyOptions>
    private activeKeys = new Set<string>()
    private activeNavigationMode?: NavigationMode

    constructor(container: HTMLElement, options: TypodontViewerOptions = {}) {
        if (!container) {
            throw new Error("TypodontViewer: container is required")
        }

        this.options = {
            defaultTool: options.defaultTool ?? "view",
            previewPlacement: options.previewPlacement ?? "top-right",
            injectDefaultStyles: options.injectDefaultStyles ?? true,
            autoloadModel: options.autoloadModel ?? true,
            model: options.model,
            initialState: options.initialState,
            initialSelection: options.initialSelection ?? [],
            initialTeeth: options.initialTeeth ?? {},
            lighting: options.lighting ?? {},
            interactionKeys: options.interactionKeys ?? {}
        }
        this.interactionKeys = {
            pan: options.interactionKeys?.pan ?? "Shift",
            rotate: options.interactionKeys?.rotate ?? "Alt"
        }

        if (this.options.injectDefaultStyles) {
            ensureTypodontStyles()
        }

        this.container = container
        this.activeTool = this.options.defaultTool
        this.modelSource = this.options.model
        this.pendingState = this.options.initialState

        this.ready = new Promise<void>((resolve, reject) => {
            this.resolveReady = resolve
            this.rejectReady = reject
        })

        this.container.classList.add("typodont-viewer")
        this.container.replaceChildren()

        this.overlay = document.createElement("div")
        this.overlay.className = "typodont-overlay"

        this.previewFrame = document.createElement("div")
        this.previewFrame.className = `typodont-preview-frame is-${this.options.previewPlacement} is-hidden`
        this.overlay.appendChild(this.previewFrame)

        this.bottomDock = document.createElement("div")
        this.bottomDock.className = "typodont-bottom"

        this.panelHost = document.createElement("div")
        this.panelHost.className = "typodont-panel"
        this.panelHost.hidden = true

        this.toolbar = document.createElement("div")
        this.toolbar.className = "typodont-toolbar"

        this.statusLabel = document.createElement("div")
        this.statusLabel.className = "typodont-status"

        this.toolHost = document.createElement("div")
        this.toolHost.className = "typodont-toolbar-section is-center"

        this.actionHost = document.createElement("div")
        this.actionHost.className = "typodont-toolbar-section is-end"

        this.toolbar.append(this.toolHost, this.actionHost)
        this.bottomDock.append(this.panelHost, this.toolbar)
        this.overlay.appendChild(this.bottomDock)

        this.popover = document.createElement("div")
        this.popover.className = "typodont-note-popover is-hidden"
        this.overlay.appendChild(this.popover)

        const width = container.clientWidth || 1
        const height = container.clientHeight || 1

        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        this.renderer.setSize(width, height)
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping
        this.renderer.toneMappingExposure = 1.05

        this.container.append(this.renderer.domElement, this.overlay)

        this.renderer.domElement.addEventListener("pointermove", this.onPointerMove)
        this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown)
        this.renderer.domElement.addEventListener("pointerup", this.onPointerUp)
        this.renderer.domElement.addEventListener("pointercancel", this.onPointerUp)
        this.renderer.domElement.addEventListener("pointerleave", this.onPointerUp)
        this.renderer.domElement.addEventListener("wheel", this.onWheel, {
            passive: false
        })

        this.controls = new OrbitControls(this.camera, this.renderer.domElement)
        this.controls.enableDamping = true
        this.controls.enablePan = false
        this.controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE
        this.controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY
        this.controls.mouseButtons.RIGHT = THREE.MOUSE.PAN
        this.controls.minDistance = 10
        this.controls.maxDistance = 55

        this.transformControls = new TransformControls(
            this.camera,
            this.renderer.domElement
        )
        this.transformControls.visible = false
        this.transformControls.addEventListener("dragging-changed", (event) => {
            this.transformDragging = Boolean(event.value)
            this.syncMainControlsState()
        })
        this.scene.add(this.transformControls.getHelper())

        this.composer = new EffectComposer(this.renderer)
        this.composer.addPass(new RenderPass(this.scene, this.camera))

        this.selectionOutlinePass = new OutlinePass(
            new THREE.Vector2(width, height),
            this.scene,
            this.camera
        )
        this.selectionOutlinePass.edgeStrength = 12
        this.selectionOutlinePass.edgeGlow = 0
        this.selectionOutlinePass.edgeThickness = 2
        this.selectionOutlinePass.visibleEdgeColor.set(0x0d6e6e)
        this.selectionOutlinePass.hiddenEdgeColor.set(0x2f4858)
        this.composer.addPass(this.selectionOutlinePass)

        this.hoverOutlinePass = new OutlinePass(
            new THREE.Vector2(width, height),
            this.scene,
            this.camera
        )
        this.hoverOutlinePass.edgeStrength = 10
        this.hoverOutlinePass.edgeGlow = 0
        this.hoverOutlinePass.edgeThickness = 1.3
        this.hoverOutlinePass.visibleEdgeColor.set(0xb85450)
        this.hoverOutlinePass.hiddenEdgeColor.set(0x2f4858)
        this.composer.addPass(this.hoverOutlinePass)

        this.scene.add(this.mainLightRig)
        this.previewScene.add(this.previewRoot, this.previewLightRig)

        this.camera.position.set(0, 1, 28)
        this.camera.aspect = width / height
        this.camera.updateProjectionMatrix()

        this.registerCoreViewTool()
        this.renderToolbar()
        this.updateStatus()
        this.setLighting(this.options.lighting)
        if (this.options.autoloadModel && this.modelSource !== null) {
            void this.loadModel(this.modelSource)
        }

        window.addEventListener("resize", this.onResize)
        window.addEventListener("keydown", this.onKeyDown)
        window.addEventListener("keyup", this.onKeyUp)
        window.addEventListener("blur", this.onWindowBlur)
        if (typeof ResizeObserver !== "undefined") {
            this.resizeObserver = new ResizeObserver(() => this.onResize())
            this.resizeObserver.observe(this.container)
        }
        requestAnimationFrame(() => this.onResize())
        this.animate()
    }

    use(plugin: TypodontPlugin) {
        if (this.plugins.some((existing) => existing.name === plugin.name)) {
            throw new Error(`TypodontViewer: plugin '${plugin.name}' already exists`)
        }

        this.plugins.push(plugin)
        plugin.install?.(this)

        for (const tool of plugin.getTools?.() ?? []) {
            if (this.toolRegistry.has(tool.id)) {
                throw new Error(`TypodontViewer: tool '${tool.id}' is already registered`)
            }
            this.toolRegistry.set(tool.id, { plugin, definition: tool })
        }

        for (const action of plugin.getActions?.() ?? []) {
            if (this.actionRegistry.has(action.id)) {
                throw new Error(`TypodontViewer: action '${action.id}' is already registered`)
            }
            this.actionRegistry.set(action.id, { plugin, definition: action })
        }

        this.renderToolbar()
        plugin.onActiveToolChange?.(this.activeTool)

        if (this.teethMeshes.length > 0) {
            plugin.onModelLoad?.()
            plugin.onSelectionChange?.(this.getSelectionDetail())
        }

        return this
    }

    registerTransformTool(toolId: string, mode: TransformToolMode) {
        this.transformToolModes.set(toolId, mode)
        if (toolId === this.activeTool) {
            this.transformControls.setMode(mode)
            this.syncTransformGizmo()
        }
    }

    setTransformMode(mode: TransformToolMode) {
        this.transformControls.setMode(mode)
        this.syncTransformGizmo()
    }

    setInteractionKeys(keys: TypodontInteractionKeyOptions) {
        this.interactionKeys = {
            ...this.interactionKeys,
            ...keys
        }
        this.syncNavigationMode()
    }

    getToothByName(identifier: string) {
        const normalized = normalizeToothId(identifier)

        return this.teethMeshes.find((tooth) => {
            if (tooth.name === identifier) return true
            return normalized !== undefined && this.getToothId(tooth) === normalized
        })
    }

    getToothId(toothOrIdentifier: ToothMesh | string) {
        if (typeof toothOrIdentifier === "string") {
            return (
                normalizeToothId(toothOrIdentifier) ??
                this.getToothByName(toothOrIdentifier)?.userData.typodontId
            )
        }

        return toothOrIdentifier.userData.typodontId as string | undefined
    }

    getToothDetail(toothOrIdentifier: ToothMesh | string) {
        if (typeof toothOrIdentifier === "string") {
            const tooth = this.getToothByName(toothOrIdentifier)
            if (tooth) return this.getToothDetail(tooth)
            const normalized = normalizeToothId(toothOrIdentifier)
            return normalized ? getToothDetail(normalized) : undefined
        }

        const toothId = this.getToothId(toothOrIdentifier)
        if (!toothId) return undefined
        return getToothDetail(toothId, toothOrIdentifier.name)
    }

    getAllToothDetails() {
        return this.teethMeshes
            .map((tooth) => this.getToothDetail(tooth))
            .filter((tooth): tooth is TypodontToothDetail => Boolean(tooth))
    }

    getSelectedTeeth() {
        return [...this.selectedTeeth]
    }

    getSelectedToothNames() {
        return this.getSelectedTeeth()
            .map((tooth) => this.getToothId(tooth))
            .filter((toothId): toothId is string => Boolean(toothId))
    }

    getSelectedToothDetails() {
        return this.getSelectedTeeth()
            .map((tooth) => this.getToothDetail(tooth))
            .filter((tooth): tooth is TypodontToothDetail => Boolean(tooth))
    }

    getSelectionDetail(): TypodontSelectionChangeDetail {
        const activeTooth = this.activeTooth ? this.getToothDetail(this.activeTooth) : undefined
        const selectedToothNames = this.getSelectedToothNames()

        return {
            selectedToothNames,
            selectedToothIds: selectedToothNames,
            selectedTeeth: this.getSelectedToothDetails(),
            activeToothName: activeTooth?.id,
            activeToothId: activeTooth?.id,
            activeTooth
        }
    }

    clearSelection() {
        if (this.selectedTeeth.size === 0) return
        this.selectedTeeth.clear()
        this.activeTooth = undefined
        this.selectionOutlinePass.selectedObjects = []
        this.hoverOutlinePass.selectedObjects = []
        this.hoveredTooth = undefined
        this.syncTransformGizmo()
        this.syncPreviewTooth()
        this.emitSelectionChange()
    }

    setActiveTool(toolId: string) {
        if (!this.toolRegistry.has(toolId)) {
            throw new Error(`TypodontViewer: unknown tool '${toolId}'`)
        }
        if (toolId === this.activeTool) return

        const previousTool = this.activeTool
        this.activeTool = toolId

        const transformMode = this.transformToolModes.get(toolId)
        if (transformMode) {
            this.transformControls.setMode(transformMode)
        }

        this.hidePopover()
        this.renderToolbar()
        this.syncTransformGizmo()
        this.syncMainControlsState()
        this.renderActivePanel()

        for (const plugin of this.plugins) {
            plugin.onActiveToolChange?.(this.activeTool, previousTool)
        }

        this.container.dispatchEvent(
            new CustomEvent("toolchange", {
                detail: {
                    activeTool: toolId,
                    previousTool
                }
            })
        )
    }

    setModelSource(source: string | TypodontModelSource | null) {
        this.modelSource = source
    }

    async loadModel(source: string | TypodontModelSource | null = this.modelSource) {
        if (source !== undefined) {
            this.modelSource = source
        }

        if (this.modelSource === null) {
            this.unloadCurrentModel()
            return
        }

        this.container.dispatchEvent(
            new CustomEvent("modelloadstart", {
                detail: {
                    source: this.modelSource ?? "bundled"
                }
            })
        )

        try {
            await this.loadModelInternal(this.modelSource)
        } catch (error) {
            if (!this.readySettled) {
                this.readySettled = true
                this.rejectReady(error)
            }
            throw error
        }
    }

    clearModel() {
        this.modelSource = null
        this.unloadCurrentModel()
    }

    async toggleFullscreen() {
        if (document.fullscreenElement === this.container) {
            await document.exitFullscreen()
            return
        }

        await this.container.requestFullscreen()
    }

    async loadState(state: TypodontViewerState) {
        if (this.teethMeshes.length === 0) {
            this.pendingState = state
            await this.ready
            return
        }

        this.pendingState = undefined
        this.hidePopover()

        for (const tooth of this.teethMeshes) {
            const original = this.originalTransforms.get(this.getToothId(tooth) ?? tooth.name)
            if (!original) continue
            tooth.position.copy(original.position)
            tooth.quaternion.copy(original.quaternion)
            tooth.scale.copy(original.scale)
            tooth.visible = original.visible
        }

        for (const plugin of this.plugins) {
            await plugin.setState?.(undefined)
        }

        for (const [pluginName, pluginState] of Object.entries(state.plugins ?? {})) {
            const plugin = this.plugins.find((entry) => entry.name === pluginName)
            await plugin?.setState?.(pluginState)
        }

        for (const [toothName, transform] of Object.entries(state.teethTransforms ?? {})) {
            const tooth = this.getToothByName(toothName)
            if (!tooth) continue
            tooth.position.fromArray(transform.position)
            tooth.quaternion.fromArray(transform.quaternion)
            tooth.scale.fromArray(transform.scale)
        }

        for (const toothName of state.hiddenToothNames ?? []) {
            this.setToothVisibility(toothName, false)
        }

        this.controls.target.fromArray(state.camera.target)
        this.camera.position.fromArray(state.camera.position)
        this.camera.updateProjectionMatrix()
        this.controls.update()

        const restoredSelection = (state.selectedToothNames ?? [])
            .map((name) => this.getToothByName(name))
            .filter((tooth): tooth is ToothMesh => Boolean(tooth?.visible))

        this.selectedTeeth.clear()
        for (const tooth of restoredSelection) {
            this.selectedTeeth.add(tooth)
        }
        this.activeTooth = restoredSelection.at(-1)
        this.selectionOutlinePass.selectedObjects = restoredSelection
        this.syncPreviewTooth()
        this.emitSelectionChange()

        if (state.activeTool && this.toolRegistry.has(state.activeTool)) {
            this.setActiveTool(state.activeTool)
        } else {
            this.syncTransformGizmo()
            this.syncMainControlsState()
        }
    }

    serializeState(): TypodontViewerState {
        const teethTransforms: TypodontViewerState["teethTransforms"] = {}
        const hiddenToothNames: string[] = []

        for (const tooth of this.teethMeshes) {
            const toothId = this.getToothId(tooth)
            const original = toothId ? this.originalTransforms.get(toothId) : undefined
            if (!toothId || !original) continue

            if (!tooth.visible) {
                hiddenToothNames.push(toothId)
            }

            const changed =
                !tooth.position.equals(original.position) ||
                !tooth.quaternion.equals(original.quaternion) ||
                !tooth.scale.equals(original.scale)

            if (!changed) continue

            teethTransforms[toothId] = {
                position: tooth.position.toArray() as [number, number, number],
                quaternion: tooth.quaternion.toArray() as [
                    number,
                    number,
                    number,
                    number
                ],
                scale: tooth.scale.toArray() as [number, number, number]
            }
        }

        const plugins: Record<string, unknown> = {}
        for (const plugin of this.plugins) {
            if (!plugin.getState) continue
            const state = plugin.getState()
            if (state !== undefined) {
                plugins[plugin.name] = state
            }
        }

        return {
            version: 1,
            selectedToothNames: this.getSelectedToothNames(),
            hiddenToothNames: hiddenToothNames.length > 0 ? hiddenToothNames : undefined,
            activeTool: this.activeTool,
            camera: {
                position: this.camera.position.toArray() as [number, number, number],
                target: this.controls.target.toArray() as [number, number, number]
            },
            teethTransforms,
            plugins
        }
    }

    downloadPNG(fileName = "typodont-view.png") {
        this.renderFrame()
        const link = document.createElement("a")
        link.href = this.renderer.domElement.toDataURL("image/png")
        link.download = fileName
        link.click()
    }

    openPopoverInput(options: PopoverOptions) {
        this.popover.innerHTML = ""
        this.popover.classList.remove("is-hidden")

        const form = document.createElement("form")
        form.className = "typodont-input"

        if (options.title) {
            const title = document.createElement("div")
            title.className = "typodont-input-title"
            title.textContent = options.title
            form.appendChild(title)
        }

        const input = document.createElement("input")
        input.type = "text"
        input.placeholder = options.placeholder ?? ""
        input.value = options.initialValue ?? ""
        form.appendChild(input)

        const actions = document.createElement("div")
        actions.className = "typodont-input-actions"

        const cancel = document.createElement("button")
        cancel.type = "button"
        cancel.className = "typodont-button"
        cancel.textContent = "Cancel"
        cancel.addEventListener("click", () => this.hidePopover())

        const submit = document.createElement("button")
        submit.type = "submit"
        submit.className = "typodont-button is-accent"
        submit.textContent = options.submitLabel ?? "Add"

        actions.append(cancel, submit)
        form.appendChild(actions)

        form.addEventListener("submit", (event) => {
            event.preventDefault()
            const value = input.value.trim()
            if (!value) return
            options.onSubmit(value)
            this.hidePopover()
        })

        this.popover.appendChild(form)

        const containerRect = this.container.getBoundingClientRect()
        const maxLeft = Math.max(12, containerRect.width - 280)
        const maxTop = Math.max(12, containerRect.height - 120)
        const left = Math.min(Math.max(12, options.x - containerRect.left), maxLeft)
        const top = Math.min(Math.max(12, options.y - containerRect.top), maxTop)
        this.popover.style.left = `${left}px`
        this.popover.style.top = `${top}px`

        input.focus()
        input.select()
    }

    hidePopover() {
        this.popover.classList.add("is-hidden")
        this.popover.innerHTML = ""
    }

    setToothColor(toothName: string, color: THREE.ColorRepresentation) {
        const tooth = this.getToothByName(toothName)
        if (!tooth) return
        const material = tooth.material as THREE.MeshPhysicalMaterial
        material.color.set(color)
    }

    resetToothColor(toothName: string) {
        this.setToothColor(toothName, 0xffffff)
    }

    setToothVisibility(toothName: string, visible: boolean) {
        const tooth = this.getToothByName(toothName)
        if (!tooth) return

        tooth.visible = visible
        if (!visible) {
            this.selectedTeeth.delete(tooth)
            if (this.activeTooth === tooth) {
                this.activeTooth = [...this.selectedTeeth].at(-1)
            }
            this.selectionOutlinePass.selectedObjects = [...this.selectedTeeth]
            if (this.hoveredTooth === tooth) {
                this.hoveredTooth = undefined
                this.hoverOutlinePass.selectedObjects = []
            }
            this.syncPreviewTooth()
            this.emitSelectionChange()
        }
    }

    setToothTransform(toothName: string, transform: TypodontToothTransform) {
        const tooth = this.getToothByName(toothName)
        if (!tooth) return

        if (transform.position) {
            tooth.position.fromArray(transform.position)
        }

        if (transform.quaternion) {
            tooth.quaternion.fromArray(transform.quaternion)
        } else if (transform.rotation) {
            tooth.rotation.set(...transform.rotation)
        }

        if (typeof transform.scale === "number") {
            tooth.scale.setScalar(transform.scale)
        } else if (transform.scale) {
            tooth.scale.fromArray(transform.scale)
        }

        this.syncTransformGizmo()
    }

    resetToothTransform(toothName: string) {
        const toothId = this.getToothId(toothName)
        const tooth = this.getToothByName(toothName)
        const original = toothId ? this.originalTransforms.get(toothId) : undefined
        if (!tooth || !original) return

        tooth.position.copy(original.position)
        tooth.quaternion.copy(original.quaternion)
        tooth.scale.copy(original.scale)
        this.syncTransformGizmo()
    }

    resetAllToothTransforms() {
        for (const tooth of this.teethMeshes) {
            const toothId = this.getToothId(tooth)
            if (!toothId) continue
            this.resetToothTransform(toothId)
        }
    }

    resetAllToothVisibility() {
        for (const tooth of this.teethMeshes) {
            tooth.visible = true
        }
        this.emitSelectionChange()
    }

    setLighting(lighting: TypodontLightingOptions = {}) {
        this.lighting = {
            ...DEFAULT_LIGHTING,
            ...this.lighting,
            ...lighting
        }

        this.mainLightRig.clear()
        this.previewLightRig.clear()

        if (this.lighting.enableDefaultLights !== false) {
            for (const light of this.createDefaultSceneLights()) {
                this.mainLightRig.add(light)
            }

            for (const light of this.createDefaultPreviewLights()) {
                this.previewLightRig.add(light)
            }
        }

        for (const light of this.cloneObjectList(this.lighting.sceneLights)) {
            this.mainLightRig.add(light)
        }

        for (const light of this.cloneObjectList(this.lighting.previewLights)) {
            this.previewLightRig.add(light)
        }

        this.applySceneSurface(this.scene, this.lighting.background)
        this.applySceneSurface(
            this.previewScene,
            this.lighting.previewBackground ?? this.lighting.background
        )

        this.scene.environment = this.lighting.environmentMap ?? null
        this.previewScene.environment =
            this.lighting.previewEnvironmentMap ?? this.lighting.environmentMap ?? null

        this.applyEnvironmentIntensity()
    }

    destroy() {
        window.removeEventListener("resize", this.onResize)
        window.removeEventListener("keydown", this.onKeyDown)
        window.removeEventListener("keyup", this.onKeyUp)
        window.removeEventListener("blur", this.onWindowBlur)
        this.resizeObserver?.disconnect()
        this.renderer.domElement.removeEventListener("pointermove", this.onPointerMove)
        this.renderer.domElement.removeEventListener("pointerdown", this.onPointerDown)
        this.renderer.domElement.removeEventListener("pointerup", this.onPointerUp)
        this.renderer.domElement.removeEventListener("pointercancel", this.onPointerUp)
        this.renderer.domElement.removeEventListener("pointerleave", this.onPointerUp)
        this.renderer.domElement.removeEventListener("wheel", this.onWheel)

        for (const plugin of this.plugins) {
            plugin.dispose?.()
        }
        this.plugins = []

        if (this.previewTooth) {
            const material = this.previewTooth.material
            if (Array.isArray(material)) {
                for (const entry of material) entry.dispose()
            } else {
                material.dispose()
            }
        }

        this.transformControls.dispose()
        this.transformControls.getHelper().removeFromParent()
        this.controls.dispose()
        this.renderer.dispose()
        this.composer.dispose()
        this.panelCleanup?.()
    }

    private registerCoreViewTool() {
        this.toolRegistry.set("view", {
            definition: {
                id: "view",
                label: "View",
                icon: "view",
                title: "Orbit the full typodont"
            }
        })
        this.actionRegistry.set("fullscreen", {
            definition: {
                id: "fullscreen",
                label: "Fullscreen",
                icon: "fullscreen",
                title: "Toggle fullscreen",
                onClick: (viewer) => {
                    void viewer.toggleFullscreen()
                }
            }
        })
    }

    private createDefaultSceneLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 1.55)

        const key = new THREE.DirectionalLight(0xffffff, 1.25)
        key.position.set(6, 10, 14)

        const fill = new THREE.DirectionalLight(0xffffff, 0.85)
        fill.position.set(-8, 6, 7)

        const rim = new THREE.DirectionalLight(0xffffff, 0.55)
        rim.position.set(0, 4, -10)

        return [ambient, key, fill, rim]
    }

    private createDefaultPreviewLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 1.4)
        const key = new THREE.DirectionalLight(0xffffff, 1.25)
        key.position.set(5, 8, 8)
        const fill = new THREE.DirectionalLight(0xffffff, 0.5)
        fill.position.set(-4, 2, 6)
        return [ambient, key, fill]
    }

    private cloneObjectList(value?: THREE.Object3D | THREE.Object3D[]) {
        if (!value) return []
        return (Array.isArray(value) ? value : [value]).map((entry) => entry.clone(true))
    }

    private applySceneSurface(
        scene: THREE.Scene,
        value: THREE.ColorRepresentation | THREE.Texture | null | undefined
    ) {
        if (value === null) {
            scene.background = null
            return
        }

        if (value === undefined) {
            scene.background = new THREE.Color(DEFAULT_LIGHTING.background)
            return
        }

        if (value instanceof THREE.Texture) {
            scene.background = value
            return
        }

        scene.background = new THREE.Color(value)
    }

    private applyEnvironmentIntensity() {
        const intensity = this.lighting.environmentIntensity ?? DEFAULT_LIGHTING.environmentIntensity

        for (const tooth of this.teethMeshes) {
            const material = tooth.material as THREE.MeshPhysicalMaterial
            material.envMapIntensity = intensity
            material.needsUpdate = true
        }

        if (this.previewTooth) {
            const material = this.previewTooth.material as THREE.MeshStandardMaterial
            material.envMapIntensity = intensity
            material.needsUpdate = true
        }
    }

    private centerToothGeometry(tooth: ToothMesh, geometry: THREE.BufferGeometry) {
        geometry.computeBoundingBox()
        const bounds = geometry.boundingBox
        if (!bounds) return

        const center = bounds.getCenter(new THREE.Vector3())
        if (center.lengthSq() <= 1e-10) return

        geometry.translate(-center.x, -center.y, -center.z)
        center.multiply(tooth.scale).applyQuaternion(tooth.quaternion)
        tooth.position.add(center)
        geometry.computeBoundingBox()
        geometry.computeBoundingSphere()
    }

    private async loadModelInternal(source?: string | TypodontModelSource | null) {
        try {
            this.unloadCurrentModel()
            const scene = await loadTypodont(source ?? undefined)
            this.modelRoot = scene

            scene.traverse((child) => {
                if (!(child instanceof THREE.Mesh)) return

                const toothId = normalizeToothId(child.name)
                if (toothId) {
                    child.userData.typodontId = toothId
                    const geometry = (child.geometry as THREE.BufferGeometry).clone()
                    child.geometry = geometry
                    this.centerToothGeometry(child, geometry)
                    const position = geometry.getAttribute("position") as THREE.BufferAttribute

                    if (!geometry.getAttribute("color")) {
                        const colors = new Float32Array(position.count * 3)
                        colors.fill(1)
                        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))
                    }

                    child.material = new THREE.MeshPhysicalMaterial({
                        color: 0xffffff,
                        roughness: 0.18,
                        metalness: 0,
                        clearcoat: 0.12,
                        clearcoatRoughness: 0.38,
                        vertexColors: true,
                        envMapIntensity:
                            this.lighting.environmentIntensity ??
                            DEFAULT_LIGHTING.environmentIntensity
                    })

                    this.teethMeshes.push(child)
                    this.originalTransforms.set(toothId, {
                        position: child.position.clone(),
                        quaternion: child.quaternion.clone(),
                        scale: child.scale.clone(),
                        visible: child.visible
                    })
                    return
                }

                if (child.name.includes("GUM")) {
                    child.material = new THREE.MeshLambertMaterial({
                        color: 0xd95b73
                    })
                }
            })

            this.teethMeshes.sort((left, right) => {
                const leftId = this.getToothId(left) ?? left.name
                const rightId = this.getToothId(right) ?? right.name
                return leftId.localeCompare(rightId)
            })

            const bounds = new THREE.Box3().setFromObject(scene)
            const center = bounds.getCenter(new THREE.Vector3())
            scene.position.sub(center)

            this.controls.target.set(0, 0, 0)
            this.camera.position.set(
                0,
                1.5,
                Math.max(bounds.getSize(new THREE.Vector3()).length() * 1.4, 24)
            )
            this.camera.lookAt(0, 0, 0)
            this.controls.update()

            this.scene.add(scene)
            this.applyInitialToothStates()
            this.renderActivePanel()

            for (const plugin of this.plugins) {
                plugin.onModelLoad?.()
            }

            if (!this.pendingState) {
                this.syncPreviewTooth()
                this.emitSelectionChange()
                this.syncTransformGizmo()
                this.syncMainControlsState()
            }

            this.container.dispatchEvent(
                new CustomEvent("modelload", {
                    detail: {
                        toothCount: this.teethMeshes.length,
                        teeth: this.getAllToothDetails()
                    }
                })
            )

            if (!this.readySettled) {
                this.readySettled = true
                this.resolveReady()
            }

            if (this.pendingState) {
                void this.loadState(this.pendingState)
            }
        } catch (error) {
            throw error
        }
    }

    private applyInitialToothStates() {
        const selected = new Set<string>()

        for (const toothId of this.options.initialSelection) {
            const normalized = normalizeToothId(toothId)
            if (normalized) selected.add(normalized)
        }

        for (const [toothId, state] of Object.entries(this.options.initialTeeth)) {
            const normalized = normalizeToothId(toothId)
            if (!normalized) continue

            if (state.color) {
                this.setToothColor(normalized, state.color)
            }

            this.setToothTransform(normalized, state)

            if (state.hidden) {
                this.setToothVisibility(normalized, false)
            }

            if (state.selected) {
                selected.add(normalized)
            }
        }

        const selectedTeeth = [...selected]
            .map((toothId) => this.getToothByName(toothId))
            .filter((tooth): tooth is ToothMesh => Boolean(tooth?.visible))

        if (selectedTeeth.length === 0) return

        this.selectedTeeth = new Set(selectedTeeth)
        this.activeTooth = selectedTeeth.at(-1)
        this.selectionOutlinePass.selectedObjects = selectedTeeth
    }

    private unloadCurrentModel() {
        if (!this.modelRoot) return

        for (const plugin of this.plugins) {
            plugin.onModelUnload?.()
        }

        this.hidePopover()
        this.transformControls.detach()
        this.transformControls.visible = false
        this.hoverOutlinePass.selectedObjects = []
        this.selectionOutlinePass.selectedObjects = []
        this.hoveredTooth = undefined
        this.activeTooth = undefined
        this.selectedTeeth.clear()
        this.previewFrame.classList.add("is-hidden")
        this.previewRoot.clear()

        if (this.previewTooth) {
            const material = this.previewTooth.material
            if (Array.isArray(material)) {
                for (const entry of material) entry.dispose()
            } else {
                material.dispose()
            }
            this.previewTooth = undefined
        }

        this.scene.remove(this.modelRoot)
        this.modelRoot = undefined
        this.teethMeshes = []
        this.originalTransforms.clear()
        this.updateStatus()
        this.syncMainControlsState()
        this.container.dispatchEvent(new CustomEvent("modelunload"))
    }

    private syncPreviewTooth() {
        if (this.previewTooth) {
            this.previewTooth.removeFromParent()
            const material = this.previewTooth.material
            if (Array.isArray(material)) {
                for (const entry of material) entry.dispose()
            } else {
                material.dispose()
            }
            this.previewTooth = undefined
        }

        this.previewSourceTooth = this.activeTooth

        if (!this.activeTooth) {
            this.previewFrame.classList.add("is-hidden")
            return
        }

        const source = this.activeTooth
        const geometry = source.geometry as THREE.BufferGeometry
        geometry.computeBoundingBox()
        const box = geometry.boundingBox ?? new THREE.Box3()
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        const radius = Math.max(size.length() * 0.5, 1)

        const previewMaterial = new THREE.MeshStandardMaterial({
            color: (source.material as THREE.MeshPhysicalMaterial).color.clone(),
            roughness: 0.26,
            metalness: 0,
            vertexColors: true,
            envMapIntensity:
                this.lighting.environmentIntensity ?? DEFAULT_LIGHTING.environmentIntensity
        })

        const previewTooth = new THREE.Mesh(geometry, previewMaterial)
        previewTooth.position.copy(center).multiplyScalar(-1)
        previewTooth.castShadow = false
        previewTooth.receiveShadow = false
        this.previewRoot.clear()
        this.previewRoot.add(previewTooth)

        this.previewTooth = previewTooth
        this.previewOrbit.distance = Math.max(radius * 2.4, 3)
        this.previewCamera.near = 0.01
        this.previewCamera.far = Math.max(radius * 10, 40)
        this.previewCamera.updateProjectionMatrix()
        this.updatePreviewCamera()
        this.previewFrame.classList.remove("is-hidden")
    }

    private syncTransformGizmo() {
        const mode = this.transformToolModes.get(this.activeTool)
        const enabled = Boolean(mode && this.activeTooth)

        if (!enabled || !this.activeTooth || !mode) {
            this.transformControls.detach()
            this.transformControls.visible = false
            return
        }

        this.transformControls.setMode(mode)
        this.transformControls.attach(this.activeTooth)
        this.transformControls.visible = true
    }

    private updatePreviewCamera() {
        const { azimuth, polar, distance } = this.previewOrbit
        const sinPolar = Math.sin(polar)
        this.previewCamera.position.set(
            distance * sinPolar * Math.cos(azimuth),
            distance * Math.cos(polar),
            distance * sinPolar * Math.sin(azimuth)
        )
        this.previewCamera.lookAt(0, 0, 0)
    }

    private getStatusName(tooth?: ToothMesh) {
        if (!tooth) return "No tooth selected"
        const detail = this.getToothDetail(tooth)
        if (!detail) return tooth.name
        return `FDI ${detail.notations.fdi} · ${detail.type}`
    }

    private updateStatus() {
        const count = this.selectedTeeth.size
        const toolLabel =
            this.toolRegistry.get(this.activeTool)?.definition.label ?? this.activeTool
        const activeName = this.getStatusName(this.activeTooth)

        this.statusLabel.textContent =
            count > 1
                ? `${toolLabel} · ${count} teeth selected · ${activeName}`
                : `${toolLabel} · ${activeName}`
    }

    private renderToolbar() {
        this.toolHost.replaceChildren()
        this.actionHost.replaceChildren()

        for (const [toolId, entry] of this.toolRegistry.entries()) {
            const button = this.createIconButton(entry.definition)
            if (toolId === this.activeTool) button.classList.add("is-active")
            button.addEventListener("click", () => this.setActiveTool(toolId))
            this.toolHost.appendChild(button)
        }

        for (const [, entry] of this.actionRegistry.entries()) {
            const button = this.createIconButton(entry.definition)
            button.addEventListener("click", () => entry.definition.onClick(this))
            this.actionHost.appendChild(button)
        }

        this.updateStatus()
        this.renderActivePanel()
    }

    private renderActivePanel() {
        this.panelCleanup?.()
        this.panelCleanup = undefined
        this.panelHost.replaceChildren()

        const tool = this.toolRegistry.get(this.activeTool)
        const panelResult = tool?.definition.renderPanel?.(this.panelHost, this)
        if (typeof panelResult === "function") {
            this.panelCleanup = panelResult
        }

        this.panelHost.hidden = this.panelHost.childElementCount === 0
    }

    private createIconButton(definition: {
        id: string
        label: string
        icon?: string
        title?: string
    }) {
        const button = document.createElement("button")
        button.type = "button"
        button.className = "typodont-button is-icon"
        button.title = definition.title ?? definition.label
        button.setAttribute("aria-label", definition.label)
        button.append(this.createIcon(definition.icon ?? definition.id))
        return button
    }

    private createIcon(name: string) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
        svg.setAttribute("viewBox", "0 0 24 24")
        svg.setAttribute("aria-hidden", "true")
        svg.setAttribute("fill", "none")
        svg.setAttribute("stroke", "currentColor")
        svg.setAttribute("stroke-width", "1.9")
        svg.setAttribute("stroke-linecap", "round")
        svg.setAttribute("stroke-linejoin", "round")
        svg.classList.add("typodont-icon")

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
        path.setAttribute("d", ICON_PATHS[name] ?? ICON_PATHS.view)
        path.setAttribute("fill", "none")
        path.setAttribute("stroke", "currentColor")
        svg.appendChild(path)
        return svg
    }

    private syncMainControlsState() {
        const shouldEnableOrbit =
            Boolean(this.activeNavigationMode) ||
            !this.mainControlsForcedDisabled &&
            !this.previewDragging &&
            !this.transformDragging &&
            this.activeTool !== "paint"

        this.controls.enabled = shouldEnableOrbit
        this.controls.enablePan = this.activeNavigationMode === "pan"
        this.controls.mouseButtons.LEFT =
            this.activeNavigationMode === "pan" ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE
    }

    private isKeyActive(key: string | null | undefined) {
        return Boolean(key && this.activeKeys.has(key))
    }

    private syncNavigationMode() {
        const nextMode: NavigationMode | undefined = this.isKeyActive(
            this.interactionKeys.pan
        )
            ? "pan"
            : this.isKeyActive(this.interactionKeys.rotate)
              ? "rotate"
              : undefined

        if (nextMode === this.activeNavigationMode) return
        this.activeNavigationMode = nextMode
        this.syncMainControlsState()
    }

    private onKeyDown = (event: KeyboardEvent) => {
        this.activeKeys.add(event.key)
        this.syncNavigationMode()
    }

    private onKeyUp = (event: KeyboardEvent) => {
        this.activeKeys.delete(event.key)
        this.syncNavigationMode()
    }

    private onWindowBlur = () => {
        this.activeKeys.clear()
        this.syncNavigationMode()
    }

    private emitSelectionChange() {
        const detail = this.getSelectionDetail()
        this.updateStatus()
        this.syncTransformGizmo()
        this.syncMainControlsState()

        for (const plugin of this.plugins) {
            plugin.onSelectionChange?.(detail)
        }

        this.container.dispatchEvent(new CustomEvent("selectionchange", { detail }))
    }

    private setSelection(
        tooth: ToothMesh,
        additive: boolean,
        removeIfAlreadySelected: boolean
    ) {
        const isSelected = this.selectedTeeth.has(tooth)

        if (!additive) {
            this.selectedTeeth.clear()
        }

        if (isSelected && removeIfAlreadySelected) {
            this.selectedTeeth.delete(tooth)
        } else {
            this.selectedTeeth.add(tooth)
            this.activeTooth = tooth
        }

        if (this.selectedTeeth.size === 0) {
            this.activeTooth = undefined
        } else if (!this.activeTooth || !this.selectedTeeth.has(this.activeTooth)) {
            this.activeTooth = [...this.selectedTeeth].at(-1)
        }

        this.selectionOutlinePass.selectedObjects = [...this.selectedTeeth]
        this.syncPreviewTooth()
        this.emitSelectionChange()
    }

    private updatePointer(event: PointerEvent) {
        const rect = this.renderer.domElement.getBoundingClientRect()
        this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
        this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    }

    private getMainHit(event: PointerEvent): TypodontToothHit | undefined {
        this.updatePointer(event)
        this.raycaster.setFromCamera(this.pointer, this.camera)
        const hit = this.raycaster.intersectObjects(
            this.teethMeshes.filter((tooth) => tooth.visible),
            false
        )[0]
        if (!hit) return undefined

        const tooth = hit.object as ToothMesh
        return {
            tooth,
            intersection: hit,
            localPoint: tooth.worldToLocal(hit.point.clone())
        }
    }

    private getPreviewHit(event: PointerEvent): TypodontPreviewHit | undefined {
        if (!this.previewTooth || !this.previewSourceTooth) return undefined

        const rect = this.renderer.domElement.getBoundingClientRect()
        const localX = event.clientX - rect.left
        const localY = event.clientY - rect.top
        const bounds = this.previewBounds

        const normalizedX = ((localX - bounds.left) / Math.max(bounds.width, 1)) * 2 - 1
        const normalizedY = -((localY - bounds.top) / Math.max(bounds.height, 1)) * 2 + 1

        this.pointer.set(normalizedX, normalizedY)
        this.raycaster.setFromCamera(this.pointer, this.previewCamera)
        const hit = this.raycaster.intersectObject(this.previewTooth, false)[0]
        if (!hit) return undefined

        return {
            tooth: this.previewSourceTooth,
            intersection: hit,
            localPoint: this.previewTooth.worldToLocal(hit.point.clone())
        }
    }

    private isPointInsidePreview(event: PointerEvent | WheelEvent) {
        if (this.previewFrame.classList.contains("is-hidden")) return false
        if (this.previewBounds.width <= 0 || this.previewBounds.height <= 0) return false

        const rect = this.renderer.domElement.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top
        const bounds = this.previewBounds
        return (
            x >= bounds.left &&
            x <= bounds.left + bounds.width &&
            y >= bounds.top &&
            y <= bounds.top + bounds.height
        )
    }

    private getActiveToolPlugin() {
        return this.toolRegistry.get(this.activeTool)?.plugin
    }

    private onPointerMove = (event: PointerEvent) => {
        if (this.isPointInsidePreview(event)) {
            const hit = this.getPreviewHit(event)
            const toolPlugin = this.getActiveToolPlugin()
            const handled = toolPlugin?.onPreviewPointerMove?.(event, hit)

            if (handled) return
            if (this.previewDragging && this.previewDragMode === "orbit") {
                const dx = event.clientX - this.previewDragStart.x
                const dy = event.clientY - this.previewDragStart.y
                this.previewOrbit.azimuth -= dx * 0.01
                this.previewOrbit.polar = THREE.MathUtils.clamp(
                    this.previewOrbit.polar + dy * 0.01,
                    0.35,
                    Math.PI - 0.35
                )
                this.previewDragStart.x = event.clientX
                this.previewDragStart.y = event.clientY
                this.updatePreviewCamera()
            }
            return
        }

        const hit = this.getMainHit(event)
        const toolPlugin = this.getActiveToolPlugin()
        const handled = toolPlugin?.onMainPointerMove?.(event, hit)
        if (handled) return

        if (!hit) {
            this.hoveredTooth = undefined
            this.hoverOutlinePass.selectedObjects = []
            return
        }

        this.hoveredTooth = hit.tooth
        this.hoverOutlinePass.selectedObjects = [hit.tooth]
    }

    private onPointerDown = (event: PointerEvent) => {
        this.hidePopover()

        if (event.button !== 0) return
        if (this.activeNavigationMode) return

        if (this.isPointInsidePreview(event)) {
            this.previewPointerId = event.pointerId
            this.previewDragging = true
            this.mainControlsForcedDisabled = true
            this.syncMainControlsState()

            const hit = this.getPreviewHit(event)
            const toolPlugin = this.getActiveToolPlugin()
            const handled = toolPlugin?.onPreviewPointerDown?.(event, hit)

            if (handled) {
                this.previewDragMode = "tool"
                return
            }

            this.previewDragMode = "orbit"
            this.previewDragStart.x = event.clientX
            this.previewDragStart.y = event.clientY
            return
        }

        if (this.transformToolModes.has(this.activeTool) && this.transformControls.axis) {
            return
        }

        const hit = this.getMainHit(event)
        const toolPlugin = this.getActiveToolPlugin()
        const handled = toolPlugin?.onMainPointerDown?.(event, hit)

        if (hit) {
            const additive = event.shiftKey || event.ctrlKey || event.metaKey
            this.setSelection(hit.tooth, additive, additive)
        } else if (!handled) {
            this.clearSelection()
        }
    }

    private onPointerUp = (event: PointerEvent) => {
        if (this.previewDragging && this.previewPointerId === event.pointerId) {
            const hit = this.getPreviewHit(event)
            const toolPlugin = this.getActiveToolPlugin()
            toolPlugin?.onPreviewPointerUp?.(event, hit)
            this.previewDragging = false
            this.previewPointerId = undefined
            this.previewDragMode = undefined
            this.mainControlsForcedDisabled = false
            this.syncMainControlsState()
            return
        }

        const hit = this.getMainHit(event)
        const toolPlugin = this.getActiveToolPlugin()
        toolPlugin?.onMainPointerUp?.(event, hit)
    }

    private onWheel = (event: WheelEvent) => {
        if (!this.isPointInsidePreview(event)) return

        event.preventDefault()
        event.stopPropagation()

        this.previewOrbit.distance = THREE.MathUtils.clamp(
            this.previewOrbit.distance * (event.deltaY > 0 ? 1.08 : 0.92),
            1.8,
            14
        )
        this.updatePreviewCamera()
    }

    private onResize = () => {
        const width = this.container.clientWidth
        const height = this.container.clientHeight

        if (width <= 0 || height <= 0) {
            return
        }

        this.container.classList.toggle("is-mobile-view", width <= 560)

        this.camera.aspect = width / height
        this.camera.updateProjectionMatrix()

        this.renderer.setSize(width, height)
        this.composer.setSize(width, height)
        this.selectionOutlinePass.setSize(width, height)
        this.hoverOutlinePass.setSize(width, height)

        this.updatePreviewBounds()
    }

    private updatePreviewBounds() {
        const frameRect = this.previewFrame.getBoundingClientRect()
        const containerRect = this.renderer.domElement.getBoundingClientRect()
        this.previewBounds = {
            left: frameRect.left - containerRect.left,
            top: frameRect.top - containerRect.top,
            width: frameRect.width,
            height: frameRect.height
        }
        this.previewCamera.aspect = Math.max(
            this.previewBounds.width / Math.max(this.previewBounds.height, 1),
            0.1
        )
        this.previewCamera.updateProjectionMatrix()
    }

    private renderFrame() {
        this.updatePreviewBounds()

        for (const plugin of this.plugins) {
            plugin.onBeforeRender?.()
        }

        if (this.previewSourceTooth && this.previewTooth) {
            this.previewRoot.quaternion.copy(this.previewSourceTooth.quaternion)
            this.previewRoot.scale.copy(this.previewSourceTooth.scale)
            const previewMaterial = this.previewTooth.material as THREE.MeshStandardMaterial
            previewMaterial.color.copy(
                (this.previewSourceTooth.material as THREE.MeshPhysicalMaterial).color
            )
        }

        this.composer.render()

        if (this.previewTooth && !this.previewFrame.classList.contains("is-hidden")) {
            const viewportX = Math.floor(this.previewBounds.left)
            const viewportY = Math.floor(
                (this.container.clientHeight -
                    this.previewBounds.top -
                    this.previewBounds.height)
            )
            const viewportWidth = Math.floor(this.previewBounds.width)
            const viewportHeight = Math.floor(this.previewBounds.height)

            this.renderer.setScissorTest(true)
            this.renderer.setViewport(viewportX, viewportY, viewportWidth, viewportHeight)
            this.renderer.setScissor(viewportX, viewportY, viewportWidth, viewportHeight)

            const originalAutoClear = this.renderer.autoClear
            this.renderer.autoClear = true
            this.renderer.render(this.previewScene, this.previewCamera)
            this.renderer.autoClear = originalAutoClear
            this.renderer.setScissorTest(false)
            this.renderer.setViewport(
                0,
                0,
                this.container.clientWidth,
                this.container.clientHeight
            )
            this.renderer.setScissor(
                0,
                0,
                this.container.clientWidth,
                this.container.clientHeight
            )
        }

        for (const plugin of this.plugins) {
            plugin.onAfterRender?.()
        }
    }

    private animate = () => {
        requestAnimationFrame(this.animate)
        this.controls.update()
        this.renderFrame()
    }
}

export function getToothNotation(
    tooth: TypodontToothDetail,
    notation: TypodontNotationMode
) {
    return getNotationLabel(tooth, notation)
}
