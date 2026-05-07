# Typodont

3D clinical typodont tooling for selection, visualization, annotation, paint-on-tooth analysis, and deformity workflows.

<img src="./assets/typodont.png" alt="Typodont clinical viewer" width="720" />

## Gallery

<p>
  <img src="./assets/typodont-view%20(2).png" alt="Typodont viewer with selected tooth inspector" width="420" />
  <img src="./assets/typodont-view%20(3).png" alt="Typodont environment map workflow" width="420" />
</p>
<p>
  <img src="./assets/typodont-view%20(4).png" alt="Typodont mobile layout" width="320" />
  <img src="./assets/typodont-view%20(5).png" alt="Typodont hidden teeth and clinical tools" width="320" />
</p>

## What it includes

- Same-canvas tooth inspector preview with orbit support
- Bottom-docked icon toolbar with fullscreen and mobile-friendly layouts
- Multi-select tooth picking with normalized tooth IDs like `teeth-11`
- Tooth metadata parity with `react-odontogram` notation payloads
- Paint + one-note-per-tooth annotation plugins for chairside findings
- Rotate + scale gizmo tools for alignment and deformity studies
- Configurable modifier-key navigation for pan and rotate across tools
- Hidden-teeth state for eruption, extraction, or treatment-planning views
- Whole-tooth visualization colors and exportable JSON/PNG state
- Environment map presets for studio, city, rural, and sunset lighting
- TypeScript example app, React example app, and Storybook stories

## Install

```bash
pnpm add typodont three
```

`three` is a peer dependency.

## Quick start

```ts
import {
  ExportPlugin,
  LabelsToolPlugin,
  RotateToolPlugin,
  TypodontViewer,
  VisualizationToolPlugin,
} from "typodont"

const container = document.getElementById("viewer")!

const viewer = new TypodontViewer(container, {
  defaultTool: "labels",
  initialSelection: ["teeth-11", "teeth-21"],
})

viewer
  .use(new LabelsToolPlugin({ scope: "all", notation: "FDI" }))
  .use(new RotateToolPlugin())
  .use(new VisualizationToolPlugin())
  .use(new ExportPlugin())
```

## Loading a licensed CDN model after init

If the viewer is free but the mesh is licensed, initialize the viewer shell first and load the model later:

```ts
const viewer = new TypodontViewer(container, {
  autoloadModel: false,
  model: null,
})

await viewer.loadModel({
  url: "https://cdn.example.com/typodont/clinical.glb",
  version: "2026.05.07",
  license: {
    key: "signed-token",
    mode: "query",
    name: "license",
  },
})
```

This keeps the viewer package public while letting you version and gate the actual model asset separately.

## Selection payload

The viewer dispatches a `selectionchange` event whose `detail.selectedTeeth` mirrors the 2D library’s metadata shape:

```json
[
  {
    "id": "teeth-21",
    "meshName": "teeth_21",
    "notations": {
      "fdi": "21",
      "universal": "9",
      "palmer": "1UL"
    },
    "type": "Central Incisor",
    "quadrant": "upper-left",
    "arch": "upper",
    "side": "left"
  }
]
```

## Clinical workflows

### Labels and selector

```ts
viewer.use(new LabelsToolPlugin({ scope: "all", notation: "FDI" }))
viewer.use(new VisualizationToolPlugin())
```

### Paint + annotation

```ts
viewer
  .use(new PaintToolPlugin())
  .use(new AnnotationToolPlugin())
```

Paint mode turns the inset inspector into the editing surface and disables rotate interactions while brushing.

Each tooth stores a single editable annotation note. Clicking a tooth that already has a note reopens the popover with the existing text so it can be changed instead of duplicated.

### Initial deformity state

```ts
const viewer = new TypodontViewer(container, {
  defaultTool: "scale",
  initialSelection: ["teeth-12", "teeth-22"],
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
```

### Hidden teeth

```ts
const viewer = new TypodontViewer(container, {
  initialTeeth: {
    "teeth-18": { hidden: true },
    "teeth-28": { hidden: true },
  },
})

viewer.setToothVisibility("teeth-31", false)
```

### Environment maps

```ts
viewer.use(new EnvironmentLightingToolPlugin({ mode: "city", intensity: 0.45 }))
```

The lighting tool includes studio, city, rural, and sunset environment presets. Intensity can be changed from the tool panel or by Storybook controls.

### Navigation modifiers

```ts
const viewer = new TypodontViewer(container, {
  interactionKeys: {
    pan: "Shift",
    rotate: "Alt",
  },
})
```

Hold the configured key and left-drag to temporarily pan or rotate across modes like labels, visualize, paint, and annotate.

## Export and persistence

```ts
const exporter = new ExportPlugin({ storageKey: "patient-case-42" })
viewer.use(exporter)

exporter.saveToStorage()
const snapshot = exporter.exportState()

// Later:
await exporter.importState(snapshot!)
```

Use `snapshot` as the JSON payload for your database.

## Framework usage

### React

```tsx
function TypodontCanvas() {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!ref.current) return

    const viewer = new TypodontViewer(ref.current, {
      initialSelection: ["teeth-11"],
    })

    viewer.use(new LabelsToolPlugin())
    return () => viewer.destroy()
  }, [])

  return <div ref={ref} style={{ height: 640 }} />
}
```

### Vue

```ts
import { onMounted, onBeforeUnmount, ref } from "vue"
import { LabelsToolPlugin, TypodontViewer } from "typodont"

const host = ref<HTMLDivElement | null>(null)
let viewer: TypodontViewer | undefined

onMounted(() => {
  if (!host.value) return
  viewer = new TypodontViewer(host.value)
  viewer.use(new LabelsToolPlugin())
})

onBeforeUnmount(() => viewer?.destroy())
```

### Angular

```ts
@ViewChild("host", { static: true }) host!: ElementRef<HTMLDivElement>
private viewer?: TypodontViewer

ngAfterViewInit() {
  this.viewer = new TypodontViewer(this.host.nativeElement)
  this.viewer.use(new LabelsToolPlugin())
}

ngOnDestroy() {
  this.viewer?.destroy()
}
```

## Examples in this repo

- `apps/typescript-example` – multi-scenario gallery for labels, paint, deformity, visualization, and environment maps
- `apps/react-example` – React integration with state syncing
- `site/src/stories` – Storybook clinical workflows

Run them with:

```bash
pnpm --filter typescript-example dev
pnpm --filter react-example dev
pnpm storybook
```

## Styling

The built-in UI is intentionally minimal. Override it with CSS variables on the container:

```css
.my-typodont {
  --typodont-background: #f5f7fb;
  --typodont-surface: rgba(255, 255, 255, 0.9);
  --typodont-accent: #2563eb;
  --typodont-button-active: #111827;
}
```

You can also disable default injected styles entirely with:

```ts
new TypodontViewer(container, { injectDefaultStyles: false })
```

## Storybook and GitHub Pages

Storybook lives under the `site` workspace and is built with `@storybook/react-vite`.

```bash
pnpm build-storybook
```

The repository includes `.github/workflows/deploy-storybook.yml`, which builds `site/storybook-static` and deploys it to GitHub Pages on pushes to `main`. In repository settings, set Pages to deploy from **GitHub Actions**.
