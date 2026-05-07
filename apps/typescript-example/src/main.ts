import "./style.css"

import * as THREE from "three"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"
import {
    AnnotationToolPlugin,
    EnvironmentLightingToolPlugin,
    ExportPlugin,
    LabelsToolPlugin,
    PaintToolPlugin,
    RotateToolPlugin,
    ScaleToolPlugin,
    TypodontViewer,
    VisualizationToolPlugin,
    type TypodontSelectionChangeDetail
} from "typodont"

type DemoContext = {
    viewerHost: HTMLElement
    selectionHost: HTMLElement
    stateHost: HTMLElement
}

type DemoHandle = {
    viewer: TypodontViewer
    cleanup?: () => void
}

type DemoDefinition = {
    id: string
    label: string
    title: string
    description: string
    points: string[]
    theme?: Record<string, string>
    create: (context: DemoContext) => Promise<DemoHandle> | DemoHandle
}

const app = document.getElementById("app")

if (!app) {
    throw new Error("Missing #app container")
}

app.innerHTML = `
  <div class="shell">
    <header class="hero">
      <div>
        <p class="eyebrow">Typodont Library</p>
        <h1>Clinical 3D demos with labels, paint, deformity, and export flows.</h1>
        <p class="lead">
          Each demo mounts the library with a different configuration so we can validate
          tooth selection, issue painting, notation labels, transform presets, and custom lighting.
        </p>
      </div>
    </header>
    <nav class="demo-nav" id="demo-nav" aria-label="Demo selector"></nav>
    <main class="workspace">
      <section class="viewer-card">
        <div class="viewer-stage" id="viewer"></div>
      </section>
      <aside class="info-stack">
        <section class="info-card">
          <p class="eyebrow">Scenario</p>
          <h2 id="demo-title"></h2>
          <p id="demo-description" class="description"></p>
          <ul id="demo-points" class="points"></ul>
        </section>
        <section class="info-card">
          <div class="info-row">
            <h3>Selection payload</h3>
            <button id="snapshot-button" class="plain-button" type="button">Refresh state</button>
          </div>
          <pre id="selection-output" class="code-block"></pre>
        </section>
        <section class="info-card">
          <h3>Serialized state</h3>
          <pre id="state-output" class="code-block"></pre>
        </section>
      </aside>
    </main>
  </div>
`

const viewerHost = document.getElementById("viewer")
const selectionHost = document.getElementById("selection-output")
const stateHost = document.getElementById("state-output")
const navHost = document.getElementById("demo-nav")
const titleHost = document.getElementById("demo-title")
const descriptionHost = document.getElementById("demo-description")
const pointsHost = document.getElementById("demo-points")
const snapshotButton = document.getElementById("snapshot-button")

if (
    !viewerHost ||
    !selectionHost ||
    !stateHost ||
    !navHost ||
    !titleHost ||
    !descriptionHost ||
    !pointsHost ||
    !snapshotButton
) {
    throw new Error("Missing example app elements")
}

let activeHandle: DemoHandle | undefined
let activeDemoId = ""

const demos: DemoDefinition[] = [
    {
        id: "labels",
        label: "Labels",
        title: "Tooth selector + FDI labels",
        description:
            "Shows the library as a tooth selector with in-scene labels and a clean clinical toolbar.",
        points: [
            "FDI labels are visible for every tooth.",
            "Selection payload mirrors the 2D odontogram metadata shape.",
            "Whole-tooth color coding can be applied from the bottom toolbar."
        ],
        theme: {
            "--typodont-background": "#eef4f8",
            "--typodont-accent": "#0f766e"
        },
        create: ({ viewerHost }) => {
            const exporter = new ExportPlugin({
                storageKey: "typodont-example-labels"
            })

            const viewer = new TypodontViewer(viewerHost, {
                defaultTool: "labels",
                initialSelection: ["teeth-11", "teeth-21"],
                injectDefaultStyles: true
            })

            viewer
                .use(new LabelsToolPlugin({ scope: "all", notation: "FDI" }))
                .use(new VisualizationToolPlugin())
                .use(exporter)

            return { viewer }
        }
    },
    {
        id: "paint",
        label: "Paint",
        title: "Chairside painting + annotations",
        description:
            "Uses the main canvas inspector preview to paint clinical findings and pin notes exactly where the dentist clicks.",
        points: [
            "Paint mode disables rotate interactions and turns the preview into a paint surface.",
            "Annotations open as a popover directly on click.",
            "The export action captures both paint state and note placement."
        ],
        theme: {
            "--typodont-background": "#f5f7fb",
            "--typodont-accent": "#8a5cf6"
        },
        create: ({ viewerHost }) => {
            const exporter = new ExportPlugin({
                storageKey: "typodont-example-paint"
            })

            const viewer = new TypodontViewer(viewerHost, {
                defaultTool: "paint",
                initialSelection: ["teeth-26"]
            })

            viewer
                .use(new RotateToolPlugin())
                .use(new PaintToolPlugin())
                .use(new AnnotationToolPlugin())
                .use(new LabelsToolPlugin({ scope: "selected", notation: "FDI" }))
                .use(exporter)

            return { viewer }
        }
    },
    {
        id: "deformity",
        label: "Deformity",
        title: "Preset rotation + scale states",
        description:
            "Seeds the viewer with deformity-style scale and rotation changes directly through initial tooth data.",
        points: [
            "The library accepts initial transforms during construction.",
            "Scale and rotate gizmos can refine the seeded state afterward.",
            "Serialized output can be stored and reapplied from a database."
        ],
        theme: {
            "--typodont-background": "#eef7f4",
            "--typodont-accent": "#0b7285"
        },
        create: ({ viewerHost }) => {
            const exporter = new ExportPlugin({
                storageKey: "typodont-example-deformity"
            })

            const viewer = new TypodontViewer(viewerHost, {
                defaultTool: "scale",
                initialSelection: ["teeth-12", "teeth-22"],
                initialTeeth: {
                    "teeth-12": {
                        rotation: [0.08, 0.24, -0.05],
                        scale: [0.92, 1.18, 0.88],
                        selected: true
                    },
                    "teeth-22": {
                        rotation: [-0.06, -0.2, 0.04],
                        scale: [1.1, 0.92, 1.08],
                        selected: true
                    },
                    "teeth-31": {
                        rotation: [0, 0.1, 0.12]
                    },
                    "teeth-18": {
                        hidden: true
                    }
                }
            })

            viewer
                .use(new RotateToolPlugin())
                .use(new ScaleToolPlugin())
                .use(new LabelsToolPlugin({ scope: "selected", notation: "Palmer" }))
                .use(exporter)

            return { viewer }
        }
    },
    {
        id: "visualization",
        label: "Visualization",
        title: "Cavity visualization workflow",
        description:
            "Applies whole-tooth colors and notation labels to communicate clinical status across the arch.",
        points: [
            "Ideal for treatment planning, case presentation, and cavity mapping.",
            "Whole-tooth colors and surface paint can coexist in saved state.",
            "Universal labels can be shown for communication with broader teams."
        ],
        theme: {
            "--typodont-background": "#fff8ef",
            "--typodont-accent": "#c2410c"
        },
        create: ({ viewerHost }) => {
            const visualization = new VisualizationToolPlugin()
            const viewer = new TypodontViewer(viewerHost, {
                defaultTool: "visualize",
                initialSelection: ["teeth-16", "teeth-21", "teeth-36", "teeth-46"]
            })

            viewer
                .use(new LabelsToolPlugin({ scope: "all", notation: "Universal" }))
                .use(visualization)
                .use(new ExportPlugin({ storageKey: "typodont-example-visualization" }))

            const applySeed = async () => {
                await viewer.ready
                await visualization.setState({
                    "teeth-16": "#f4c542",
                    "teeth-21": "#d94841",
                    "teeth-36": "#3b82f6",
                    "teeth-46": "#d94841"
                })
            }

            void applySeed()
            return { viewer }
        }
    },
    {
        id: "lighting",
        label: "Lighting",
        title: "Custom scene lighting + environment map",
        description:
            "Shows how library consumers can bring their own lights and environment reflections without replacing the built-in UI.",
        points: [
            "A custom key/fill rig is provided through viewer options.",
            "An environment texture is generated after init and applied through setLighting.",
            "This keeps the API flexible for React, Vue, Angular, or raw TypeScript integrations."
        ],
        theme: {
            "--typodont-background": "#eef7fb",
            "--typodont-accent": "#2563eb"
        },
        create: ({ viewerHost }) => {
            const viewer = new TypodontViewer(viewerHost, {
                defaultTool: "lighting",
                initialSelection: ["teeth-11"],
                lighting: {
                    background: "#eef7fb",
                    previewBackground: "#ffffff",
                    sceneLights: [
                        new THREE.HemisphereLight("#ffffff", "#bcd4ff", 0.7),
                        new THREE.PointLight("#8ec5ff", 0.8, 35)
                    ],
                    previewLights: [
                        new THREE.HemisphereLight("#ffffff", "#bcd4ff", 0.8)
                    ]
                }
            })

            viewer
                .use(new EnvironmentLightingToolPlugin())
                .use(new RotateToolPlugin())
                .use(new LabelsToolPlugin())

            let environmentTexture: THREE.Texture | undefined
            let pmremGenerator: THREE.PMREMGenerator | undefined

            const applyEnvironment = async () => {
                await viewer.ready
                pmremGenerator = new THREE.PMREMGenerator(viewer.renderer)
                environmentTexture = pmremGenerator.fromScene(
                    new RoomEnvironment(),
                    0.04
                ).texture
                viewer.setLighting({
                    environmentMap: environmentTexture,
                    previewEnvironmentMap: environmentTexture
                })
            }

            void applyEnvironment()

            return {
                viewer,
                cleanup: () => {
                    environmentTexture?.dispose()
                    pmremGenerator?.dispose()
                }
            }
        }
    }
]

const renderSelection = (detail: TypodontSelectionChangeDetail) => {
    selectionHost.textContent = JSON.stringify(detail.selectedTeeth, null, 2)
}

const renderState = (viewer: TypodontViewer) => {
    stateHost.textContent = JSON.stringify(viewer.serializeState(), null, 2)
}

const bindViewerOutputs = (viewer: TypodontViewer) => {
    const handleSelection = (event: Event) => {
        renderSelection((event as CustomEvent<TypodontSelectionChangeDetail>).detail)
    }

    viewer.container.addEventListener("selectionchange", handleSelection)
    viewer.ready.then(() => {
        renderSelection(viewer.getSelectionDetail())
        renderState(viewer)
    })

    return () => {
        viewer.container.removeEventListener("selectionchange", handleSelection)
    }
}

const applyTheme = (theme?: Record<string, string>) => {
    viewerHost.removeAttribute("style")
    for (const [key, value] of Object.entries(theme ?? {})) {
        viewerHost.style.setProperty(key, value)
    }
}

const openDemo = async (demo: DemoDefinition) => {
    if (activeDemoId === demo.id) return

    activeHandle?.cleanup?.()
    activeHandle?.viewer.destroy()
    activeHandle = undefined
    activeDemoId = demo.id

    viewerHost.replaceChildren()
    selectionHost.textContent = ""
    stateHost.textContent = ""
    titleHost.textContent = demo.title
    descriptionHost.textContent = demo.description
    pointsHost.innerHTML = demo.points.map((point) => `<li>${point}</li>`).join("")
    applyTheme(demo.theme)

    const outputCleanupList: Array<() => void> = []
    const handle = await demo.create({
        viewerHost,
        selectionHost,
        stateHost
    })

    outputCleanupList.push(bindViewerOutputs(handle.viewer))

    activeHandle = {
        ...handle,
        cleanup: () => {
            for (const cleanup of outputCleanupList) cleanup()
            handle.cleanup?.()
        }
    }

    renderState(handle.viewer)

    for (const button of navHost.querySelectorAll<HTMLButtonElement>("button")) {
        button.classList.toggle("is-active", button.dataset.demoId === demo.id)
    }
}

for (const demo of demos) {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "demo-tab"
    button.dataset.demoId = demo.id
    button.textContent = demo.label
    button.addEventListener("click", () => {
        void openDemo(demo)
    })
    navHost.appendChild(button)
}

snapshotButton.addEventListener("click", () => {
    if (!activeHandle) return
    renderState(activeHandle.viewer)
})

void openDemo(demos[0])
