import * as THREE from "three"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import {
    resolveTypodontModelSource,
    type TypodontModelSource
} from "./modelSource"

const cachedModels = new Map<string, THREE.Group>()
const loadingPromises = new Map<string, Promise<THREE.Group>>()

function createLoader(source: ReturnType<typeof resolveTypodontModelSource>) {
    const loader = new GLTFLoader()
    const dracoLoader = new DRACOLoader()

    dracoLoader.setDecoderPath(source.dracoDecoderPath)
    loader.setDRACOLoader(dracoLoader)
    loader.setRequestHeader(source.headers)
    loader.setWithCredentials(source.withCredentials)

    return { loader, dracoLoader }
}

function getBasePath(url: string) {
    try {
        const parsed = new URL(url, window.location.href)
        const pathname = parsed.pathname.replace(/[^/]+$/, "")
        return `${parsed.origin}${pathname}`
    } catch {
        return url.slice(0, url.lastIndexOf("/") + 1)
    }
}

async function fetchModelBytes(source: ReturnType<typeof resolveTypodontModelSource>) {
    const response = await fetch(source.url, {
        credentials: source.withCredentials ? "include" : "same-origin",
        headers: source.headers
    })

    if (!response.ok) {
        throw new Error(
            `Typodont model request failed (${response.status} ${response.statusText}) for ${source.url}`
        )
    }

    const contentType = response.headers.get("content-type") ?? ""
    if (contentType.includes("text/html")) {
        throw new Error(
            `Typodont model URL returned HTML instead of a GLB: ${source.url}. Check the CDN path, version, or license configuration.`
        )
    }

    return response.arrayBuffer()
}

export async function loadTypodont(
    source?: string | TypodontModelSource
): Promise<THREE.Group> {
    const resolved = resolveTypodontModelSource(source)

    if (cachedModels.has(resolved.cacheKey)) {
        return cachedModels.get(resolved.cacheKey)!.clone(true)
    }

    if (!loadingPromises.has(resolved.cacheKey)) {
        loadingPromises.set(
            resolved.cacheKey,
            (async () => {
                const bytes = await fetchModelBytes(resolved)
                const { loader, dracoLoader } = createLoader(resolved)

                try {
                    const model = await new Promise<THREE.Group>((resolve, reject) => {
                        loader.parse(
                            bytes,
                            getBasePath(resolved.url),
                            (gltf) => resolve(gltf.scene),
                            reject
                        )
                    })

                    cachedModels.set(resolved.cacheKey, model)
                    return model.clone(true)
                } finally {
                    dracoLoader.dispose()
                }
            })()
        )
    }

    const model = await loadingPromises.get(resolved.cacheKey)!
    return model.clone(true)
}
