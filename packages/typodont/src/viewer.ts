import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"


const modelUrl = new URL("../assets/typodont.glb", import.meta.url).href

export class TypodontViewer {
    container: HTMLElement

    scene = new THREE.Scene()

    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
    renderer = new THREE.WebGLRenderer({ antialias: true })
    controls!: OrbitControls

    raycaster = new THREE.Raycaster()
    mouse = new THREE.Vector2()

    teethMeshes: THREE.Mesh[] = []
    selectedTooth?: THREE.Mesh
    outline?: THREE.LineSegments

    constructor(container: HTMLElement) {
        this.container = container

        const width = container.clientWidth
        const height = container.clientHeight

        // renderer
        this.renderer.setSize(width, height)
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping
        this.renderer.toneMappingExposure = 1
        this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown)


        container.appendChild(this.renderer.domElement)

        // camera
        this.camera.position.set(0, 0, 30)
        this.camera.aspect = width / height
        this.camera.updateProjectionMatrix()

        // controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement)
        this.controls.enableDamping = true


        this.scene.background = new THREE.Color(0xf5f5f5)

        this.setupLights()
        this.loadModel()




        window.addEventListener("resize", this.onResize)

        this.animate()
    }

    setupLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.6)
        this.scene.add(ambient)

        const key = new THREE.DirectionalLight(0xffffff, 1.2)
        key.position.set(5, 10, 5)
        this.scene.add(key)

        const fill = new THREE.DirectionalLight(0xffffff, 0.4)
        fill.position.set(-5, 5, -5)
        this.scene.add(fill)
    }

    loadModel() {
        const loader = new GLTFLoader()

        const draco = new DRACOLoader()
        draco.setDecoderPath(
            "https://www.gstatic.com/draco/versioned/decoders/1.5.7/"
        )

        loader.setDRACOLoader(draco)

        loader.load(modelUrl, (gltf) => {

            console.log('Model loaded:', gltf.scene)

            gltf.scene.traverse((child) => {
                if (child instanceof THREE.Mesh && child.name.includes("teeth")) {

                    const shinyMaterial = new THREE.MeshPhysicalMaterial({
                        color: 0xffffff,
                        roughness: 0.15,   // lower = shinier
                        metalness: 0.0,    // teeth are not metal
                        clearcoat: 1.0,    // glossy layer
                        clearcoatRoughness: 0.05,
                    });

                    this.teethMeshes.push(child)

                    child.material = shinyMaterial;
                }
            });

            this.scene.add(gltf.scene);
        })
    }


    onPointerDown = (event: PointerEvent) => {

        const rect = this.renderer.domElement.getBoundingClientRect()

        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

        this.raycaster.setFromCamera(this.mouse, this.camera)

        const intersects = this.raycaster.intersectObjects(this.teethMeshes)

        if (intersects.length === 0) return

        const mesh = intersects[0].object as THREE.Mesh

        this.toggleTooth(mesh)
    }

    toggleTooth(mesh: THREE.Mesh) {

        // clicking the same tooth again → deselect
        if (this.selectedTooth === mesh) {
            this.removeOutline()
            this.selectedTooth = undefined
            return
        }

        // remove previous
        this.removeOutline()

        this.selectedTooth = mesh
        this.addOutline(mesh)
    }

    addOutline(mesh: THREE.Mesh) {

        const edges = new THREE.EdgesGeometry(mesh.geometry)

        const material = new THREE.LineBasicMaterial({
            color: 0x2196f3
        })

        const outline = new THREE.LineSegments(edges, material)

        outline.renderOrder = 1
        mesh.add(outline)

        this.outline = outline
    }

    removeOutline() {
        if (!this.outline) return

        this.outline.removeFromParent()
        this.outline.geometry.dispose()

        if (Array.isArray(this.outline.material)) {
            this.outline.material.forEach(m => m.dispose())
        } else {
            this.outline.material.dispose()
        }

        this.outline = undefined
    }

    selectTooth(mesh: THREE.Mesh) {

        if (this.outline) {
            this.scene.remove(this.outline)
        }

        this.selectedTooth = mesh

        const edges = new THREE.EdgesGeometry(mesh.geometry)

        const outlineMaterial = new THREE.LineBasicMaterial({
            color: 0x2196f3,
            linewidth: 2
        })

        const outline = new THREE.LineSegments(edges, outlineMaterial)

        outline.position.copy(mesh.position)
        outline.rotation.copy(mesh.rotation)
        outline.scale.copy(mesh.scale)

        mesh.add(outline)

        this.outline = outline
    }

    onResize = () => {
        const width = this.container.clientWidth
        const height = this.container.clientHeight

        this.camera.aspect = width / height
        this.camera.updateProjectionMatrix()

        this.renderer.setSize(width, height)
    }

    animate = () => {
        requestAnimationFrame(this.animate)

        this.controls.update()

        this.renderer.render(this.scene, this.camera)
    }

    destroy() {
        window.removeEventListener("resize", this.onResize)
        this.renderer.dispose()
    }
}