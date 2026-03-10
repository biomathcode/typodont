import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js"

import modelUrl from "../assets/typodont.glb"

let cachedModel: THREE.Group | null = null
let loadingPromise: Promise<THREE.Group> | null = null

const loader = new GLTFLoader()

// Draco decoder setup
const dracoLoader = new DRACOLoader()

// Use CDN decoder (simplest for libraries)
dracoLoader.setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.5.7/"
)

loader.setDRACOLoader(dracoLoader)

export async function loadTypodont(): Promise<THREE.Group> {
    if (cachedModel) {
        return cachedModel.clone(true)
    }

    if (!loadingPromise) {
        loadingPromise = new Promise((resolve, reject) => {
            loader.load(
                modelUrl,
                (gltf) => {
                    cachedModel = gltf.scene
                    resolve(cachedModel.clone(true))
                },
                undefined,
                reject
            )
        })
    }

    const model = await loadingPromise
    return model.clone(true)
}