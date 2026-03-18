import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js"
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js"
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js"

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


    composer!: EffectComposer
    outlinePass!: OutlinePass
    hoveredTooth?: THREE.Mesh

    originalColors = new Map<THREE.Mesh, THREE.Color>()

    previewCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)

    previewScene = new THREE.Scene()
    previewLight!: THREE.DirectionalLight
    previewAmbient!: THREE.AmbientLight
    previewTooth?: THREE.Object3D

    constructor(container: HTMLElement) {
        this.container = container

        const width = container.clientWidth
        const height = container.clientHeight

        // renderer
        this.renderer.setSize(width, height)
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping
        this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown)
        this.renderer.domElement.addEventListener("pointermove", this.onPointerMove)


        container.appendChild(this.renderer.domElement)

        this.composer = new EffectComposer(this.renderer)

        const renderPass = new RenderPass(this.scene, this.camera)
        this.composer.addPass(renderPass)

        this.outlinePass = new OutlinePass(
            new THREE.Vector2(width, height),
            this.scene,
            this.camera
        )

        this.outlinePass.edgeStrength = 20
        this.outlinePass.edgeGlow = 0
        this.outlinePass.edgeThickness = 4
        this.outlinePass.visibleEdgeColor.set(0xff00ff)
        this.outlinePass.hiddenEdgeColor.set(0x000000)

        this.composer.addPass(this.outlinePass)

        // camera
        this.camera.position.set(0, 0, 30)
        this.camera.aspect = width / height
        this.camera.updateProjectionMatrix()

        // controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement)
        this.controls.enableDamping = true


        this.scene.background = new THREE.Color(0xf5f5f5)



        this.previewAmbient = new THREE.AmbientLight(0xffffff, 1.5)
        this.previewScene.add(this.previewAmbient)

        this.previewLight = new THREE.DirectionalLight(0xffffff, 1.5)
        this.previewLight.position.set(5, 5, 5)
        this.previewScene.add(this.previewLight)





        this.setupLights()

        this.loadModel()




        window.addEventListener("resize", this.onResize)

        this.animate();
    }

    setupLights() {
        // Ambient (very low, just fill)
        const ambient = new THREE.AmbientLight(0xffffff, 2)
        this.scene.add(ambient)

        // Key light (main)
        const key = new THREE.DirectionalLight(0xffffff, .001)
        key.position.set(5, 10, 10)
        key.castShadow = false
        this.scene.add(key)

        // Fill light (soft shadow reduction)
        const fill = new THREE.DirectionalLight(0xffffff, 0.5)
        fill.position.set(-5, 5, 5)
        this.scene.add(fill)

        // Rim light (IMPORTANT for edges)
        const rim = new THREE.DirectionalLight(0xffffff, 1.2)
        rim.position.set(0, 5, -10)
        this.scene.add(rim)

        // Top highlight (teeth shine)
        const top = new THREE.DirectionalLight(0xffffff, 0.8)
        top.position.set(0, 15, 0)
        this.scene.add(top)
    }



    createToonGradient() {
        const size = 4
        const data = new Uint8Array([
            0, 0, 0,        // dark
            85, 85, 85,     // mid-dark
            170, 170, 170,  // mid
            255, 255, 255   // light
        ])

        const texture = new THREE.DataTexture(data, size, 1, THREE.RGBFormat)
        texture.needsUpdate = true
        texture.minFilter = THREE.NearestFilter
        texture.magFilter = THREE.NearestFilter

        return texture
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
                    });

                    this.teethMeshes.push(child)

                    child.material = shinyMaterial;
                }

                if (child instanceof THREE.Mesh && child.name.includes("GUM")) {

                    const material = new THREE.MeshLambertMaterial({
                        color: 0xff0000,

                    })

                    child.material = material;
                }


            });

            this.scene.add(gltf.scene);
        })
    }

    onPointerMove = (event: PointerEvent) => {
        const rect = this.renderer.domElement.getBoundingClientRect()

        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

        this.raycaster.setFromCamera(this.mouse, this.camera)

        const intersects = this.raycaster.intersectObjects(this.teethMeshes)

        if (intersects.length > 0) {
            const mesh = intersects[0].object as THREE.Mesh

            if (this.hoveredTooth !== mesh) {
                this.hoveredTooth = mesh
                this.outlinePass.selectedObjects = [mesh]
            }
        } else {
            this.hoveredTooth = undefined
            this.outlinePass.selectedObjects = []
        }
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

        const clickcallback = new CustomEvent("toothclick", {
            detail: {
                toothName: mesh.name,
            }
        })

        console.log(`Clicked on tooth: ${mesh.name} (index: ${this.teethMeshes.indexOf(mesh)})`)

        this.container.dispatchEvent(clickcallback)
    }

    toggleTooth(mesh: THREE.Mesh) {
        if (this.selectedTooth === mesh) {
            this.resetTooth(mesh)
            this.selectedTooth = undefined
            return
        }

        if (this.selectedTooth) {
            this.resetTooth(this.selectedTooth)
        }

        this.updatePreviewCamera(mesh)
        this.updatePreview(mesh)
        this.selectedTooth = mesh
        this.highlightTooth(mesh)
    }
    updatePreviewCamera(obj: THREE.Object3D) {
        const box = new THREE.Box3().setFromObject(obj)
        const size = new THREE.Vector3()
        box.getSize(size)

        const maxDim = Math.max(size.x, size.y, size.z)
        const distance = maxDim * 2

        // since object is centered at origin
        this.previewCamera.position.set(0, 0, distance)
        this.previewCamera.lookAt(0, 0, 0)
    }
    updatePreview(mesh: THREE.Mesh) {
        if (this.previewTooth) {
            this.previewScene.remove(this.previewTooth)
        }

        const clone = mesh.clone()

        // clone material
        if (Array.isArray(clone.material)) {
            clone.material = clone.material.map(m => m.clone())
        } else {
            clone.material = clone.material.clone()
        }

        // 🔥 IMPORTANT: center geometry
        const box = new THREE.Box3().setFromObject(clone)
        const center = new THREE.Vector3()
        box.getCenter(center)

        clone.position.sub(center) // move to origin

        this.previewScene.add(clone)
        this.previewTooth = clone

        this.updatePreviewCamera(clone)
    }

    highlightTooth(mesh: THREE.Mesh) {
        const material = mesh.material as THREE.MeshPhysicalMaterial

        if (!this.originalColors.has(mesh)) {
            this.originalColors.set(mesh, material.color.clone())
        }

        material.color.set(0xffee00)
    }

    resetTooth(mesh: THREE.Mesh) {
        const material = mesh.material as THREE.MeshPhysicalMaterial

        const original = this.originalColors.get(mesh)
        if (original) {
            material.color.copy(original)
        }
    }

    addOutline(mesh: THREE.Mesh) {


        mesh.material.color.set(0xff0000);


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

        const width = this.container.clientWidth
        const height = this.container.clientHeight

        // ---- MAIN RENDER ----
        this.renderer.setViewport(0, 0, width, height)
        this.renderer.setScissorTest(false)
        this.composer.render()

        // ---- MINI PREVIEW ----
        if (this.previewTooth) {
            const size = 400
            const padding = 10

            const x = padding
            const y = padding

            this.renderer.setViewport(x, y, size, size)
            this.renderer.setScissor(x, y, size, size)
            this.renderer.setScissorTest(true)

            this.previewCamera.aspect = 1
            this.previewCamera.updateProjectionMatrix()

            this.renderer.setClearColor(0xffffff, 1)
            this.renderer.clearDepth()

            this.renderer.render(this.previewScene, this.previewCamera)

            this.renderer.setScissorTest(false)
        }
    }

    destroy() {
        window.removeEventListener("resize", this.onResize)
        this.renderer.dispose()
    }
}