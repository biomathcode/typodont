import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js"
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js"
import type {
    TypodontActionDefinition,
    TypodontPlugin,
    TypodontPreviewHit,
    TypodontToolDefinition,
    TypodontToothHit
} from "./plugin"
import { ensureTypodontStyles } from "./uiStyles"

const modelUrl = new URL("../assets/typodont.glb", import.meta.url).href

export type ToothMesh = THREE.Mesh

type ToothTransformSnapshot = {
    position: THREE.Vector3
    quaternion: THREE.Quaternion
    scale: THREE.Vector3
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

export type TypodontSelectionChangeDetail = {
    selectedToothNames: string[]
    activeToothName?: string
}

export type TypodontViewerState = {
    version: 1
    selectedToothNames: string[]
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

export type TypodontViewerOptions = {
    defaultTool?: string
    previewPlacement?: "top-left" | "top-right" | "bottom-left" | "bottom-right"
}

export class TypodontViewer {
    container: HTMLElement
    options: Required<TypodontViewerOptions>

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
    previewLight = new THREE.DirectionalLight(0xffffff, 1.5)
    previewAmbient = new THREE.AmbientLight(0xffffff, 1.3)
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

    private toolRegistry = new Map<string, RegisteredTool>()
    private actionRegistry = new Map<string, RegisteredAction>()
    private panelCleanup?: () => void
    private previewPointerId?: number
    private previewDragging = false
    private previewDragMode: "orbit" | "tool" | undefined
    private previewDragStart = { x: 0, y: 0 }
    private transformDragging = false
    private modelRoot?: THREE.Object3D
    private originalTransforms = new Map<string, ToothTransformSnapshot>()
    private resolveReady!: () => void
    private rejectReady!: (reason?: unknown) => void
    private pendingState?: TypodontViewerState
    private mainControlsForcedDisabled = false

    constructor(container: HTMLElement, options: TypodontViewerOptions = {}) {
        if (!container) {
            throw new Error("TypodontViewer: container is required")
        }

        ensureTypodontStyles()

        this.container = container
        this.options = {
            defaultTool: options.defaultTool ?? "view",
            previewPlacement: options.previewPlacement ?? "top-right"
        }
        this.activeTool = this.options.defaultTool

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

        const statusSection = document.createElement("div")
        statusSection.className = "typodont-toolbar-section"
        this.statusLabel = document.createElement("div")
        this.statusLabel.className = "typodont-status"
        statusSection.appendChild(this.statusLabel)

        this.toolHost = document.createElement("div")
        this.toolHost.className = "typodont-toolbar-section is-center"

        this.actionHost = document.createElement("div")
        this.actionHost.className = "typodont-toolbar-section is-end"

        this.toolbar.append(statusSection, this.toolHost, this.actionHost)
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
        this.controls.minDistance = 10
        this.controls.maxDistance = 55

        this.transformControls = new TransformControls(
            this.camera,
            this.renderer.domElement
        )
        this.transformControls.setMode("rotate")
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
        this.selectionOutlinePass.edgeThickness = 2.5
        this.selectionOutlinePass.visibleEdgeColor.set(0x0b7285)
        this.selectionOutlinePass.hiddenEdgeColor.set(0x2f4858)
        this.composer.addPass(this.selectionOutlinePass)

        this.hoverOutlinePass = new OutlinePass(
            new THREE.Vector2(width, height),
            this.scene,
            this.camera
        )
        this.hoverOutlinePass.edgeStrength = 14
        this.hoverOutlinePass.edgeGlow = 0
        this.hoverOutlinePass.edgeThickness = 1.5
        this.hoverOutlinePass.visibleEdgeColor.set(0xd94841)
        this.hoverOutlinePass.hiddenEdgeColor.set(0x2f4858)
        this.composer.addPass(this.hoverOutlinePass)

        this.scene.background = new THREE.Color(0xe4edf4)
        this.camera.position.set(0, 1, 28)
        this.camera.aspect = width / height
        this.camera.updateProjectionMatrix()

        this.setupLights()
        this.setupPreviewScene()
        this.registerCoreViewTool()
        this.renderToolbar()
        this.updateStatus()
        this.loadModel()

        window.addEventListener("resize", this.onResize)
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

    getToothByName(name: string) {
        return this.teethMeshes.find((tooth) => tooth.name === name)
    }

    getSelectedTeeth() {
        return [...this.selectedTeeth]
    }

    getSelectedToothNames() {
        return this.getSelectedTeeth().map((tooth) => tooth.name)
    }

    getSelectionDetail(): TypodontSelectionChangeDetail {
        return {
            selectedToothNames: this.getSelectedToothNames(),
            activeToothName: this.activeTooth?.name
        }
    }

    clearSelection() {
        if (this.selectedTeeth.size === 0) return
        this.selectedTeeth.clear()
        this.activeTooth = undefined
        this.selectionOutlinePass.selectedObjects = []
        this.hoverOutlinePass.selectedObjects = []
        this.hoveredTooth = undefined
        this.syncRotateGizmo()
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
        this.hidePopover()
        this.renderToolbar()
        this.syncRotateGizmo()
        this.syncMainControlsState()
        this.renderActivePanel()

        for (const plugin of this.plugins) {
            plugin.onActiveToolChange?.(this.activeTool, previousTool)
        }
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
            const original = this.originalTransforms.get(tooth.name)
            if (!original) continue
            tooth.position.copy(original.position)
            tooth.quaternion.copy(original.quaternion)
            tooth.scale.copy(original.scale)
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

        this.controls.target.fromArray(state.camera.target)
        this.camera.position.fromArray(state.camera.position)
        this.camera.updateProjectionMatrix()
        this.controls.update()

        const restoredSelection = (state.selectedToothNames ?? [])
            .map((name) => this.getToothByName(name))
            .filter((tooth): tooth is ToothMesh => Boolean(tooth))

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
            this.syncRotateGizmo()
            this.syncMainControlsState()
        }
    }

    serializeState(): TypodontViewerState {
        const teethTransforms: TypodontViewerState["teethTransforms"] = {}

        for (const tooth of this.teethMeshes) {
            const original = this.originalTransforms.get(tooth.name)
            if (!original) continue

            const changed =
                !tooth.position.equals(original.position) ||
                !tooth.quaternion.equals(original.quaternion) ||
                !tooth.scale.equals(original.scale)

            if (!changed) continue

            teethTransforms[tooth.name] = {
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
        const left = Math.min(
            Math.max(12, options.x - containerRect.left),
            maxLeft
        )
        const top = Math.min(
            Math.max(12, options.y - containerRect.top),
            maxTop
        )
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

    resetToothTransform(toothName: string) {
        const tooth = this.getToothByName(toothName)
        const original = this.originalTransforms.get(toothName)
        if (!tooth || !original) return

        tooth.position.copy(original.position)
        tooth.quaternion.copy(original.quaternion)
        tooth.scale.copy(original.scale)
        this.syncRotateGizmo()
    }

    resetAllToothTransforms() {
        for (const tooth of this.teethMeshes) {
            this.resetToothTransform(tooth.name)
        }
    }

    syncPreviewTooth() {
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
            roughness: 0.3,
            metalness: 0,
            vertexColors: true
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

    setRotateGizmoEnabled(enabled: boolean) {
        this.transformControls.enabled = enabled
        this.syncRotateGizmo()
    }

    syncRotateGizmo() {
        const enabled = this.activeTool === "rotate" && Boolean(this.activeTooth)
        if (!enabled || !this.activeTooth) {
            this.transformControls.detach()
            this.transformControls.visible = false
            return
        }

        this.transformControls.attach(this.activeTooth)
        this.transformControls.visible = true
    }

    destroy() {
        window.removeEventListener("resize", this.onResize)
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
                title: "Orbit the full typodont"
            }
        })
    }

    private setupLights() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 1.8))

        const key = new THREE.DirectionalLight(0xffffff, 1.2)
        key.position.set(6, 10, 14)
        this.scene.add(key)

        const fill = new THREE.DirectionalLight(0xffffff, 0.8)
        fill.position.set(-8, 6, 7)
        this.scene.add(fill)

        const rim = new THREE.DirectionalLight(0xffffff, 0.7)
        rim.position.set(0, 4, -10)
        this.scene.add(rim)
    }

    private setupPreviewScene() {
        this.previewScene.background = new THREE.Color(0xf0f5f8)
        this.previewLight.position.set(5, 8, 8)
        this.previewScene.add(this.previewAmbient, this.previewLight, this.previewRoot)
    }

    private async loadModel() {
        try {
            const loader = new GLTFLoader()
            const draco = new DRACOLoader()
            draco.setDecoderPath(
                "https://www.gstatic.com/draco/versioned/decoders/1.5.7/"
            )
            loader.setDRACOLoader(draco)

            loader.load(
                modelUrl,
                (gltf) => {
                    this.modelRoot = gltf.scene

                    gltf.scene.traverse((child) => {
                        if (!(child instanceof THREE.Mesh)) return

                        if (child.name.includes("teeth")) {
                            const geometry = child.geometry as THREE.BufferGeometry
                            const position = geometry.getAttribute(
                                "position"
                            ) as THREE.BufferAttribute

                            if (!geometry.getAttribute("color")) {
                                const colors = new Float32Array(position.count * 3)
                                colors.fill(1)
                                geometry.setAttribute(
                                    "color",
                                    new THREE.BufferAttribute(colors, 3)
                                )
                            }

                            child.material = new THREE.MeshPhysicalMaterial({
                                color: 0xffffff,
                                roughness: 0.18,
                                metalness: 0,
                                clearcoat: 0.15,
                                clearcoatRoughness: 0.4,
                                vertexColors: true
                            })

                            this.teethMeshes.push(child)
                            this.originalTransforms.set(child.name, {
                                position: child.position.clone(),
                                quaternion: child.quaternion.clone(),
                                scale: child.scale.clone()
                            })
                        } else if (child.name.includes("GUM")) {
                            child.material = new THREE.MeshLambertMaterial({
                                color: 0xd9485f
                            })
                        }
                    })

                    const bounds = new THREE.Box3().setFromObject(gltf.scene)
                    const center = bounds.getCenter(new THREE.Vector3())
                    gltf.scene.position.sub(center)
                    this.controls.target.set(0, 0, 0)
                    this.camera.position.set(0, 1.5, Math.max(bounds.getSize(new THREE.Vector3()).length() * 1.4, 24))
                    this.camera.lookAt(0, 0, 0)
                    this.controls.update()

                    this.scene.add(gltf.scene)
                    this.renderActivePanel()

                    for (const plugin of this.plugins) {
                        plugin.onModelLoad?.()
                    }

                    this.container.dispatchEvent(
                        new CustomEvent("modelload", {
                            detail: { toothCount: this.teethMeshes.length }
                        })
                    )

                    this.resolveReady()

                    if (this.pendingState) {
                        void this.loadState(this.pendingState)
                    }
                },
                undefined,
                (error) => {
                    this.rejectReady(error)
                }
            )
        } catch (error) {
            this.rejectReady(error)
        }
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

    private updateStatus() {
        const activeName = this.activeTooth?.name ?? "No tooth selected"
        const count = this.selectedTeeth.size
        const toolLabel =
            this.toolRegistry.get(this.activeTool)?.definition.label ?? this.activeTool
        this.statusLabel.textContent =
            count > 1
                ? `${toolLabel} | ${count} teeth selected | Active: ${activeName}`
                : `${toolLabel} | ${activeName}`
    }

    private renderToolbar() {
        this.toolHost.replaceChildren()
        this.actionHost.replaceChildren()

        for (const [toolId, entry] of this.toolRegistry.entries()) {
            const button = document.createElement("button")
            button.type = "button"
            button.className = `typodont-button${
                toolId === this.activeTool ? " is-active" : ""
            }`
            button.title = entry.definition.title ?? entry.definition.label
            button.textContent = entry.definition.label
            button.addEventListener("click", () => this.setActiveTool(toolId))
            this.toolHost.appendChild(button)
        }

        for (const [, entry] of this.actionRegistry.entries()) {
            const button = document.createElement("button")
            button.type = "button"
            button.className = "typodont-button"
            button.title = entry.definition.title ?? entry.definition.label
            button.textContent = entry.definition.label
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

    private syncMainControlsState() {
        const shouldEnableOrbit =
            !this.mainControlsForcedDisabled &&
            !this.previewDragging &&
            !this.transformDragging &&
            this.activeTool !== "paint"

        this.controls.enabled = shouldEnableOrbit
    }

    private emitSelectionChange() {
        const detail = this.getSelectionDetail()
        this.updateStatus()
        this.syncRotateGizmo()
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
        const hit = this.raycaster.intersectObjects(this.teethMeshes, false)[0]
        if (!hit) return

        const tooth = hit.object as ToothMesh
        return {
            tooth,
            intersection: hit,
            localPoint: tooth.worldToLocal(hit.point.clone())
        }
    }

    private getPreviewHit(event: PointerEvent): TypodontPreviewHit | undefined {
        if (!this.previewTooth || !this.previewSourceTooth) return
        const rect = this.renderer.domElement.getBoundingClientRect()
        const localX = event.clientX - rect.left
        const localY = event.clientY - rect.top
        const bounds = this.previewBounds

        const normalizedX = ((localX - bounds.left) / bounds.width) * 2 - 1
        const normalizedY = -((localY - bounds.top) / bounds.height) * 2 + 1

        this.pointer.set(normalizedX, normalizedY)
        this.raycaster.setFromCamera(this.pointer, this.previewCamera)
        const hit = this.raycaster.intersectObject(this.previewTooth, false)[0]
        if (!hit) return

        return {
            tooth: this.previewSourceTooth,
            intersection: hit,
            localPoint: this.previewTooth.worldToLocal(hit.point.clone())
        }
    }

    private isPointInsidePreview(event: PointerEvent | WheelEvent) {
        if (this.previewFrame.classList.contains("is-hidden")) return false
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

        if (this.activeTool === "rotate" && this.transformControls.axis) {
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
        const width = this.container.clientWidth || 1
        const height = this.container.clientHeight || 1

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
            const dpr = this.renderer.getPixelRatio()
            const viewportX = Math.floor(this.previewBounds.left * dpr)
            const viewportY = Math.floor(
                (this.container.clientHeight -
                    this.previewBounds.top -
                    this.previewBounds.height) *
                    dpr
            )
            const viewportWidth = Math.floor(this.previewBounds.width * dpr)
            const viewportHeight = Math.floor(this.previewBounds.height * dpr)

            this.renderer.setScissorTest(true)
            this.renderer.setViewport(
                viewportX,
                viewportY,
                viewportWidth,
                viewportHeight
            )
            this.renderer.setScissor(
                viewportX,
                viewportY,
                viewportWidth,
                viewportHeight
            )

            const originalAutoClear = this.renderer.autoClear
            this.renderer.autoClear = true
            this.renderer.render(this.previewScene, this.previewCamera)
            this.renderer.autoClear = originalAutoClear
            this.renderer.setScissorTest(false)
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
