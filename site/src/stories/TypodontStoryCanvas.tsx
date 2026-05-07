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
  type TypodontInteractionKeyOptions,
  VisualizationToolPlugin,
  type TypodontSelectionChangeDetail,
} from "typodont"

export type StoryScenario =
  | "selector"
  | "paint"
  | "deformity"
  | "visualization"
  | "environment"
  | "hidden"

type ScenarioMeta = {
  title: string
  description: string
  theme: Record<string, string>
}

const scenarioMeta: Record<StoryScenario, ScenarioMeta> = {
  selector: {
    title: "Selector + labels",
    description:
      "Use typodont as a tooth selector with FDI labels and whole-tooth clinical coloring.",
    theme: {
      "--typodont-background": "#eef4f8",
      "--typodont-accent": "#0f766e",
    },
  },
  paint: {
    title: "Paint + annotations",
    description:
      "Paint chairside findings inside the inspector preview and pin annotations directly on the mesh.",
    theme: {
      "--typodont-background": "#f5f7fb",
      "--typodont-accent": "#8a5cf6",
    },
  },
  deformity: {
    title: "Initial transform presets",
    description:
      "Seed scale and rotation deformities from initial data, then refine them with the gizmos.",
    theme: {
      "--typodont-background": "#eef7f4",
      "--typodont-accent": "#0b7285",
    },
  },
  visualization: {
    title: "Clinical visualization",
    description:
      "Communicate issues across the arch with universal notation labels and whole-tooth status colors.",
    theme: {
      "--typodont-background": "#fff8ef",
      "--typodont-accent": "#c2410c",
    },
  },
  environment: {
    title: "Environment maps",
    description:
      "Switch environment map presets for studio, city, rural, and warm presentation lighting.",
    theme: {
      "--typodont-background": "#eef7fb",
      "--typodont-accent": "#2563eb",
    },
  },
  hidden: {
    title: "Hidden teeth",
    description:
      "Load a mixed arch where selected teeth are intentionally hidden for eruption, extraction, or treatment planning views.",
    theme: {
      "--typodont-background": "#f4f7f2",
      "--typodont-accent": "#4d7c0f",
    },
  },
}

type TypodontStoryCanvasProps = {
  scenario: StoryScenario
  height?: number
  showDebug?: boolean
  mobileView?: boolean
  panKey?: string
  rotateKey?: string
  lightIntensity?: number
}

function createViewerForScenario(
  scenario: StoryScenario,
  container: HTMLElement,
  interactionKeys?: TypodontInteractionKeyOptions,
  lightIntensity = 1,
): { viewer: TypodontViewer; cleanup?: () => void } {
  switch (scenario) {
    case "paint": {
      const viewer = new TypodontViewer(container, {
        defaultTool: "paint",
        initialSelection: ["teeth-26"],
        interactionKeys,
      })

      viewer
        .use(new RotateToolPlugin())
        .use(new PaintToolPlugin())
        .use(new AnnotationToolPlugin())
        .use(new LabelsToolPlugin({ scope: "selected" }))
        .use(new ExportPlugin({ storageKey: "storybook-paint" }))

      return { viewer }
    }

    case "deformity": {
      const viewer = new TypodontViewer(container, {
        defaultTool: "scale",
        initialSelection: ["teeth-12", "teeth-22"],
        interactionKeys,
        initialTeeth: {
          "teeth-12": {
            rotation: [0.08, 0.24, -0.05],
            scale: [0.92, 1.18, 0.88],
            selected: true,
          },
          "teeth-22": {
            rotation: [-0.06, -0.2, 0.04],
            scale: [1.1, 0.92, 1.08],
            selected: true,
          },
        },
      })

      viewer
        .use(new RotateToolPlugin())
        .use(new ScaleToolPlugin())
        .use(new LabelsToolPlugin({ scope: "selected", notation: "Palmer" }))
        .use(new ExportPlugin({ storageKey: "storybook-deformity" }))

      return { viewer }
    }

    case "visualization": {
      const visualization = new VisualizationToolPlugin()
      const viewer = new TypodontViewer(container, {
        defaultTool: "visualize",
        initialSelection: ["teeth-16", "teeth-21", "teeth-36", "teeth-46"],
        interactionKeys,
      })

      viewer
        .use(new LabelsToolPlugin({ scope: "all", notation: "Universal" }))
        .use(visualization)
        .use(new ExportPlugin({ storageKey: "storybook-visualization" }))

      void viewer.ready.then(() =>
        visualization.setState({
          "teeth-16": "#f4c542",
          "teeth-21": "#d94841",
          "teeth-36": "#3b82f6",
          "teeth-46": "#d94841",
        }),
      )

      return { viewer }
    }

    case "environment": {
      const viewer = new TypodontViewer(container, {
        defaultTool: "lighting",
        initialSelection: ["teeth-11"],
        interactionKeys,
        lighting: {
          background: "#eef7fb",
          previewBackground: "#ffffff",
          environmentIntensity: lightIntensity,
        },
      })

      viewer
        .use(
          new EnvironmentLightingToolPlugin({
            intensity: lightIntensity,
            // mode: 'sunset',
          }),
        )
        .use(new RotateToolPlugin())
        .use(new LabelsToolPlugin())

      return { viewer }
    }

    case "hidden": {
      const viewer = new TypodontViewer(container, {
        defaultTool: "labels",
        initialSelection: ["teeth-13", "teeth-23"],
        interactionKeys,
        initialTeeth: {
          "teeth-18": { hidden: true },
          "teeth-28": { hidden: true },
          "teeth-31": { hidden: true },
          "teeth-41": { hidden: true },
          "teeth-36": {
            color: "#f4c542",
          },
        },
      })

      viewer
        .use(new LabelsToolPlugin({ scope: "all", notation: "FDI" }))
        .use(new VisualizationToolPlugin())
        .use(new EnvironmentLightingToolPlugin())
        .use(new ExportPlugin({ storageKey: "storybook-hidden-teeth" }))

      return { viewer }
    }

    case "selector":
    default: {
      const viewer = new TypodontViewer(container, {
        defaultTool: "labels",
        initialSelection: ["teeth-11", "teeth-21"],
        interactionKeys,
      })

      viewer
        .use(new LabelsToolPlugin({ scope: "all", notation: "FDI" }))
        .use(new VisualizationToolPlugin())
        .use(new ExportPlugin({ storageKey: "storybook-selector" }))

      return { viewer }
    }
  }
}

export function TypodontStoryCanvas({
  scenario,
  height = 640,
  showDebug = true,
  mobileView = false,
  panKey = "Shift",
  rotateKey = "Alt",
  lightIntensity = 0.6,
}: TypodontStoryCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [selection, setSelection] = useState("[]")
  const [snapshot, setSnapshot] = useState("{}")

  const meta = useMemo(() => scenarioMeta[scenario], [scenario])

  useEffect(() => {
    if (!hostRef.current) return

    const interactionKeys = {
      pan: panKey || null,
      rotate: rotateKey || null,
    }
    const handle = createViewerForScenario(
      scenario,
      hostRef.current,
      interactionKeys,
      lightIntensity,
    )

    const updateSelection = (event: Event) => {
      const detail = (event as CustomEvent<TypodontSelectionChangeDetail>).detail
      setSelection(JSON.stringify(detail.selectedTeeth, null, 2))
      setSnapshot(JSON.stringify(handle.viewer.serializeState(), null, 2))
    }

    handle.viewer.container.addEventListener("selectionchange", updateSelection)
    void handle.viewer.ready.then(() => {
      setSelection(
        JSON.stringify(handle.viewer.getSelectionDetail().selectedTeeth, null, 2),
      )
      setSnapshot(JSON.stringify(handle.viewer.serializeState(), null, 2))
    })

    return () => {
      handle.viewer.container.removeEventListener("selectionchange", updateSelection)
      handle.cleanup?.()
      handle.viewer.destroy()
    }
  }, [scenario, panKey, rotateKey, lightIntensity])

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        padding: 20,
        background: "#edf3f7",
        justifyItems: mobileView ? "center" : "stretch",
      }}
    >
      {/* <section
        style={{
          borderRadius: 24,
          border: "1px solid rgba(24,48,71,0.08)",
          background: "rgba(255,255,255,0.84)",
          boxShadow: "0 18px 50px rgba(24,48,71,0.08)",
          padding: 18,
          display: "grid",
          gap: 8,
        }}
      >
        <p style={{ margin: 0, color: "#0f766e", fontSize: 12, fontWeight: 700 }}>
          Typodont story
        </p>
        <h1 style={{ margin: 0, fontSize: 28 }}>{meta.title}</h1>
        <p style={{ margin: 0, color: "#5b7087", maxWidth: 780 }}>
          {meta.description}
        </p>
      </section> */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            showDebug && !mobileView
              ? "minmax(0, 1.6fr) minmax(280px, 0.8fr)"
              : "1fr",
          gap: 16,
          width: mobileView ? 390 : "100%",
          maxWidth: mobileView ? "100%" : undefined,
        }}
      >
        <div
          style={{
            borderRadius: 24,
            border: "1px solid rgba(24,48,71,0.08)",
            background: "rgba(255,255,255,0.84)",
            boxShadow: "0 18px 50px rgba(24,48,71,0.08)",
            padding: 14,
          }}
        >
          <div
            ref={hostRef}
            style={{
              height: mobileView ? 720 : height,
              minHeight: mobileView ? 620 : 480,
              borderRadius: 18,
              overflow: "hidden",
              ...meta.theme,
            }}
          />
        </div>

        {showDebug ? (
          <div style={{ display: "grid", gap: 16 }}>
            <section
              style={{
                borderRadius: 24,
                border: "1px solid rgba(24,48,71,0.08)",
                background: "rgba(255,255,255,0.84)",
                boxShadow: "0 18px 50px rgba(24,48,71,0.08)",
                padding: 18,
                display: "grid",
                gap: 10,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 18 }}>Selection payload</h2>
              <pre
                style={{
                  margin: 0,
                  minHeight: 180,
                  padding: 14,
                  borderRadius: 16,
                  background: "#0f172a",
                  color: "#d7e4ff",
                  overflow: "auto",
                  fontSize: 13,
                  lineHeight: 1.55,
                }}
              >
                {selection}
              </pre>
            </section>
            <section
              style={{
                borderRadius: 24,
                border: "1px solid rgba(24,48,71,0.08)",
                background: "rgba(255,255,255,0.84)",
                boxShadow: "0 18px 50px rgba(24,48,71,0.08)",
                padding: 18,
                display: "grid",
                gap: 10,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 18 }}>Serialized state</h2>
              <pre
                style={{
                  margin: 0,
                  minHeight: 220,
                  padding: 14,
                  borderRadius: 16,
                  background: "#0f172a",
                  color: "#d7e4ff",
                  overflow: "auto",
                  fontSize: 13,
                  lineHeight: 1.55,
                }}
              >
                {snapshot}
              </pre>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  )
}
