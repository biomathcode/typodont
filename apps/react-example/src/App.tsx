import { useEffect, useMemo, useRef, useState } from "react"
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
  type TypodontSelectionChangeDetail,
} from "typodont"

type Preset = "selector" | "paint" | "deformity"

type PresetConfig = {
  title: string
  description: string
  build: (container: HTMLElement) => TypodontViewer
}

const presetOrder: Preset[] = ["selector", "paint", "deformity"]

function App() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [preset, setPreset] = useState<Preset>("selector")
  const [selection, setSelection] = useState<string>("[]")
  const [snapshot, setSnapshot] = useState<string>("{}")

  const presets = useMemo<Record<Preset, PresetConfig>>(
    () => ({
      selector: {
        title: "React tooth selector",
        description:
          "Mount the vanilla typodont viewer inside React while keeping selection data in React state.",
        build: (container) => {
          const viewer = new TypodontViewer(container, {
            defaultTool: "labels",
            initialSelection: ["teeth-11", "teeth-21"],
          })

          viewer
            .use(new LabelsToolPlugin({ scope: "all", notation: "FDI" }))
            .use(new VisualizationToolPlugin())
            .use(new ExportPlugin({ storageKey: "react-example-selector" }))

          return viewer
        },
      },
      paint: {
        title: "React paint + annotation flow",
        description:
          "Keep the UI declarative in React while the library manages the main canvas, inspector preview, and toolbar.",
        build: (container) => {
          const viewer = new TypodontViewer(container, {
            defaultTool: "paint",
            initialSelection: ["teeth-26"],
          })

          viewer
            .use(new RotateToolPlugin())
            .use(new PaintToolPlugin())
            .use(new AnnotationToolPlugin())
            .use(new LabelsToolPlugin({ scope: "selected" }))
            .use(new ExportPlugin({ storageKey: "react-example-paint" }))

          return viewer
        },
      },
      deformity: {
        title: "React deformity preset",
        description:
          "Feed initial tooth transforms from React props or remote data to model spacing, rotation, and scale issues.",
        build: (container) => {
          const viewer = new TypodontViewer(container, {
            defaultTool: "scale",
            initialSelection: ["teeth-12", "teeth-22"],
            initialTeeth: {
              "teeth-12": {
                rotation: [0.06, 0.22, -0.04],
                scale: [0.94, 1.16, 0.9],
                selected: true,
              },
              "teeth-22": {
                rotation: [-0.04, -0.18, 0.03],
                scale: [1.08, 0.94, 1.04],
                selected: true,
              },
              "teeth-18": {
                hidden: true,
              },
            },
          })

          viewer
            .use(new EnvironmentLightingToolPlugin())
            .use(new RotateToolPlugin())
            .use(new ScaleToolPlugin())
            .use(new LabelsToolPlugin({ scope: "selected", notation: "Palmer" }))
            .use(new ExportPlugin({ storageKey: "react-example-deformity" }))

          return viewer
        },
      },
    }),
    [],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const viewer = presets[preset].build(container)

    const handleSelection = (event: Event) => {
      const detail = (event as CustomEvent<TypodontSelectionChangeDetail>).detail
      setSelection(JSON.stringify(detail.selectedTeeth, null, 2))
      setSnapshot(JSON.stringify(viewer.serializeState(), null, 2))
    }

    viewer.container.addEventListener("selectionchange", handleSelection)
    viewer.ready.then(() => {
      setSelection(JSON.stringify(viewer.getSelectionDetail().selectedTeeth, null, 2))
      setSnapshot(JSON.stringify(viewer.serializeState(), null, 2))
    })

    return () => {
      viewer.container.removeEventListener("selectionchange", handleSelection)
      viewer.destroy()
    }
  }, [preset, presets])

  return (
    <div className="react-shell">
      <header className="react-hero">
        <p className="react-eyebrow">React Example</p>
        <h1>{presets[preset].title}</h1>
        <p>{presets[preset].description}</p>
        <div className="react-tabs" aria-label="Preset selector">
          {presetOrder.map((entry) => (
            <button
              key={entry}
              type="button"
              className={entry === preset ? "is-active" : undefined}
              onClick={() => setPreset(entry)}
            >
              {entry}
            </button>
          ))}
        </div>
      </header>

      <main className="react-workspace">
        <section className="react-viewer-card">
          <div ref={containerRef} className="react-viewer" />
        </section>

        <aside className="react-sidebar">
          <section className="react-info-card">
            <h2>Selection data</h2>
            <pre>{selection}</pre>
          </section>
          <section className="react-info-card">
            <h2>Serialized state</h2>
            <pre>{snapshot}</pre>
          </section>
        </aside>
      </main>
    </div>
  )
}

export default App
