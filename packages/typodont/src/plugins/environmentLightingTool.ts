import * as THREE from "three"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"
import type { TypodontPlugin, TypodontToolDefinition } from "../plugin"
import type { TypodontLightingOptions, TypodontViewer } from "../viewer"

export type EnvironmentLightingMode = "studio" | "city" | "rural" | "sunset"

type EnvironmentLightingState = {
    mode: EnvironmentLightingMode
    intensity: number
}

type LightingPreset = {
    mode: EnvironmentLightingMode
    label: string
    color: string
    lighting: TypodontLightingOptions
}

export type EnvironmentLightingToolPluginOptions = {
    intensity?: number
    mode?: EnvironmentLightingMode
}

export class EnvironmentLightingToolPlugin implements TypodontPlugin {
    name = "environmentLightingTool"
    private viewer?: TypodontViewer
    private mode: EnvironmentLightingMode = "studio"
    private intensity: number
    private environmentTextures = new Map<EnvironmentLightingMode, THREE.Texture>()
    private pmremGenerator?: THREE.PMREMGenerator

    private presets: LightingPreset[] = [
        {
            mode: "studio",
            label: "Studio",
            color: "#f8fbff",
            lighting: {
                background: "#f8fbff",
                previewBackground: "#ffffff",
                enableDefaultLights: true
            }
        },
        {
            mode: "city",
            label: "City",
            color: "#dbeafe",
            lighting: {
                background: "#e8f1fb",
                previewBackground: "#ffffff",
                sceneLights: [
                    new THREE.HemisphereLight("#f7fbff", "#9db4d6", 0.75),
                    new THREE.DirectionalLight("#dbeafe", 0.85),
                    new THREE.PointLight("#7dd3fc", 0.45, 35)
                ],
                previewLights: [new THREE.HemisphereLight("#f7fbff", "#9db4d6", 0.9)]
            }
        },
        {
            mode: "rural",
            label: "Rural",
            color: "#dcfce7",
            lighting: {
                background: "#effaf0",
                previewBackground: "#fbfff8",
                sceneLights: [
                    new THREE.HemisphereLight("#f7ffe8", "#9fcd9f", 0.82),
                    new THREE.DirectionalLight("#fff7cf", 0.78)
                ],
                previewLights: [new THREE.HemisphereLight("#f7ffe8", "#9fcd9f", 0.92)]
            }
        },
        {
            mode: "sunset",
            label: "Sunset",
            color: "#fed7aa",
            lighting: {
                background: "#fff1e6",
                previewBackground: "#fffaf4",
                sceneLights: [
                    new THREE.HemisphereLight("#fff7ed", "#f5a667", 0.76),
                    new THREE.DirectionalLight("#ffbd7a", 0.95)
                ],
                previewLights: [new THREE.HemisphereLight("#fff7ed", "#f5a667", 0.88)]
            }
        }
    ]

    constructor(options: EnvironmentLightingToolPluginOptions = {}) {
        this.intensity = options.intensity ?? 0.6
        this.mode = options.mode ?? "studio"
    }

    install(viewer: TypodontViewer) {
        this.viewer = viewer
        this.applyMode(this.mode)
    }

    dispose() {
        for (const texture of this.environmentTextures.values()) {
            texture.dispose()
        }
        this.environmentTextures.clear()
        this.pmremGenerator?.dispose()
    }

    getTools(): TypodontToolDefinition[] {
        return [
            {
                id: "lighting",
                label: "Lighting",
                icon: "lighting",
                title: "Change environment lighting",
                renderPanel: (host) => {
                    const buttons = new Map<EnvironmentLightingMode, HTMLButtonElement>()
                    for (const preset of this.presets) {
                        const button = document.createElement("button")
                        button.type = "button"
                        button.className = `typodont-swatch${this.mode === preset.mode ? " is-active" : ""
                            }`
                        button.title = preset.label
                        button.setAttribute("aria-label", preset.label)
                        button.style.setProperty("--typodont-swatch-color", preset.color)
                        button.addEventListener("click", () => {
                            this.applyMode(preset.mode)
                            for (const [mode, element] of buttons) {
                                element.classList.toggle("is-active", mode === preset.mode)
                            }
                        })
                        buttons.set(preset.mode, button)
                        host.appendChild(button)
                    }

                    const rangeWrap = document.createElement("label")
                    rangeWrap.className = "typodont-range"
                    rangeWrap.textContent = "Intensity"

                    const range = document.createElement("input")
                    range.type = "range"
                    range.min = "0.0001"
                    range.max = "1.0"
                    range.step = "0.02"
                    range.value = String(this.intensity)
                    range.addEventListener("input", () => {
                        this.intensity = Number(range.value)
                        this.applyMode(this.mode)
                    })
                    rangeWrap.appendChild(range)
                    host.appendChild(rangeWrap)
                }
            }
        ]
    }

    getState(): EnvironmentLightingState {
        return {
            mode: this.mode,
            intensity: this.intensity
        }
    }

    async setState(state: unknown) {
        if (!state || typeof state !== "object") return
        const next = state as Partial<EnvironmentLightingState>
        if (typeof next.intensity === "number") {
            this.intensity = next.intensity
        }
        if (next.mode && this.presets.some((preset) => preset.mode === next.mode)) {
            this.applyMode(next.mode)
        }
    }

    private applyMode(mode: EnvironmentLightingMode) {
        const viewer = this.viewer
        if (!viewer) return

        this.mode = mode
        const preset = this.presets.find((entry) => entry.mode === mode) ?? this.presets[0]
        const environmentTexture = this.ensureEnvironmentTexture(viewer, preset.mode)

        viewer.setLighting({
            ...this.scaleLighting(preset.lighting),
            environmentIntensity: this.intensity,
            environmentMap: environmentTexture,
            previewEnvironmentMap: environmentTexture
        })
    }

    private scaleLighting(lighting: TypodontLightingOptions): TypodontLightingOptions {
        return {
            ...lighting,
            sceneLights: this.scaleLightList(lighting.sceneLights),
            previewLights: this.scaleLightList(lighting.previewLights)
        }
    }

    private scaleLightList(value?: THREE.Object3D | THREE.Object3D[]) {
        if (!value) return undefined
        const lights = Array.isArray(value) ? value : [value]
        return lights.map((light) => {
            const clone = light.clone(true)
            clone.traverse((child) => {
                if (child instanceof THREE.Light) {
                    child.intensity *= this.intensity
                }
            })
            return clone
        })
    }

    private ensureEnvironmentTexture(
        viewer: TypodontViewer,
        mode: EnvironmentLightingMode
    ) {
        const cached = this.environmentTextures.get(mode)
        if (cached) return cached

        this.pmremGenerator = new THREE.PMREMGenerator(viewer.renderer)
        const scene = this.createEnvironmentScene(mode)
        const texture = this.pmremGenerator.fromScene(scene, 0.04).texture
        this.disposeEnvironmentScene(scene)
        this.environmentTextures.set(mode, texture)
        return texture
    }

    private createEnvironmentScene(mode: EnvironmentLightingMode) {
        if (mode === "studio") return new RoomEnvironment()

        const scene = new THREE.Scene()
        const palette = {
            city: {
                sky: "#dbeafe",
                ground: "#52677f",
                panels: ["#bae6fd", "#93c5fd", "#e0f2fe"]
            },
            rural: {
                sky: "#dcfce7",
                ground: "#65a30d",
                panels: ["#fef9c3", "#bbf7d0", "#fde68a"]
            },
            sunset: {
                sky: "#fed7aa",
                ground: "#7c2d12",
                panels: ["#ffedd5", "#fb923c", "#f97316"]
            }
        }[mode]

        scene.background = new THREE.Color(palette.sky)

        const dome = new THREE.Mesh(
            new THREE.SphereGeometry(30, 32, 16),
            new THREE.MeshBasicMaterial({
                color: palette.sky,
                side: THREE.BackSide
            })
        )
        scene.add(dome)

        const ground = new THREE.Mesh(
            new THREE.CircleGeometry(24, 32),
            new THREE.MeshBasicMaterial({ color: palette.ground })
        )
        ground.rotation.x = -Math.PI / 2
        ground.position.y = -4
        scene.add(ground)

        palette.panels.forEach((color, index) => {
            const panel = new THREE.Mesh(
                new THREE.PlaneGeometry(8, 5),
                new THREE.MeshBasicMaterial({ color })
            )
            panel.position.set((index - 1) * 8, 3 + index * 0.6, -10)
            panel.lookAt(0, 0, 0)
            scene.add(panel)
        })

        return scene
    }

    private disposeEnvironmentScene(scene: THREE.Scene) {
        scene.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return
            object.geometry.dispose()
            const material = object.material
            if (Array.isArray(material)) {
                for (const entry of material) entry.dispose()
            } else {
                material.dispose()
            }
        })
    }
}
