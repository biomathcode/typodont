import "./App.css"
import { TypodontStoryCanvas } from "./stories/TypodontStoryCanvas"

const snippets = {
  vanilla: `import { LabelsToolPlugin, TypodontViewer } from "typodont"

const viewer = new TypodontViewer(container, {
  initialSelection: ["teeth-11"],
})

viewer.use(new LabelsToolPlugin({ scope: "all", notation: "FDI" }))`,
  react: `useEffect(() => {
  const viewer = new TypodontViewer(ref.current!)
  viewer.use(new LabelsToolPlugin())
  return () => viewer.destroy()
}, [])`,
  vue: `onMounted(() => {
  viewer = new TypodontViewer(host.value!)
  viewer.use(new LabelsToolPlugin())
})

onBeforeUnmount(() => viewer?.destroy())`,
  angular: `ngAfterViewInit() {
  this.viewer = new TypodontViewer(this.host.nativeElement)
  this.viewer.use(new LabelsToolPlugin())
}

ngOnDestroy() {
  this.viewer?.destroy()
}`,
  licensed: `const viewer = new TypodontViewer(container, {
  autoloadModel: false,
  model: null,
})

await viewer.loadModel({
  url: "https://cdn.example.com/typodont/clinical.glb",
  version: "2026.05.07",
  license: { key: "signed-token" },
})`,
}

function App() {
  return (
    <div className="docs-shell">
      <header className="docs-hero">
        <div className="docs-copy">
          <p className="docs-eyebrow">Typodont</p>
          <h1>3D dental analysis workflows for clinical teams.</h1>
          <p className="docs-lead">
            Typodont brings selection, notation labels, clinical paint, annotations,
            deformity transforms, export state, and custom lighting to a single 3D
            typodont viewer.
          </p>
          <div className="docs-actions">
            <code>pnpm add typodont three</code>
            <code>pnpm storybook</code>
          </div>
        </div>
      </header>

      <section className="docs-preview">
        <TypodontStoryCanvas scenario="selector" height={520} showDebug={false} />
      </section>

      <section className="docs-grid">
        <article className="docs-card">
          <h2>Clinical features</h2>
          <ul>
            <li>Multi-select tooth picking with normalized IDs like `teeth-11`</li>
            <li>Labels in FDI, Universal, and Palmer notation</li>
            <li>Chairside paint + note workflows in the same canvas</li>
            <li>Rotate and scale gizmos for deformity or alignment analysis</li>
            <li>Whole-tooth visualization colors plus JSON/PNG export</li>
          </ul>
        </article>

        <article className="docs-card">
          <h2>Storybook workflows</h2>
          <ul>
            <li>Selector + labels</li>
            <li>Paint + annotate</li>
            <li>Initial deformity presets</li>
            <li>Clinical visualization</li>
            <li>Custom scene lighting</li>
          </ul>
          <p>
            Stories live in <code>site/src/stories</code> and build with{" "}
            <code>pnpm build-storybook</code>.
          </p>
        </article>

        <article className="docs-card">
          <h2>Licensed model delivery</h2>
          <p>
            The viewer can initialize without a bundled mesh, then load a versioned
            model from your CDN once licensing is resolved.
          </p>
          <pre>{snippets.licensed}</pre>
        </article>
      </section>

      <section className="docs-frameworks">
        <div className="docs-section-heading">
          <p className="docs-eyebrow">Frameworks</p>
          <h2>Use the library from vanilla JS, React, Vue, or Angular.</h2>
        </div>
        <div className="framework-grid">
          <article className="docs-card">
            <h3>Vanilla / TypeScript</h3>
            <pre>{snippets.vanilla}</pre>
          </article>
          <article className="docs-card">
            <h3>React</h3>
            <pre>{snippets.react}</pre>
          </article>
          <article className="docs-card">
            <h3>Vue</h3>
            <pre>{snippets.vue}</pre>
          </article>
          <article className="docs-card">
            <h3>Angular</h3>
            <pre>{snippets.angular}</pre>
          </article>
        </div>
      </section>
    </div>
  )
}

export default App
