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

    constructor(container: HTMLElement) {
        this.container = container

        const width = container.clientWidth
        const height = container.clientHeight

        // renderer
        this.renderer.setSize(width, height)
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping
        this.renderer.toneMappingExposure = 1

        container.appendChild(this.renderer.domElement)

        // camera
        this.camera.position.set(0, 10, 20)
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



            this.scene.add(gltf.scene)
        })
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