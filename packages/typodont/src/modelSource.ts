import bundledModelUrl from "../assets/typodont.glb"

export const DEFAULT_DRACO_DECODER_PATH =
    "https://www.gstatic.com/draco/versioned/decoders/1.5.7/"

export type TypodontModelLicense = {
    key: string
    mode?: "query" | "header"
    name?: string
}

export type TypodontModelSource = {
    url?: string
    version?: string
    query?: Record<string, string | number | boolean | null | undefined>
    headers?: Record<string, string>
    withCredentials?: boolean
    cacheKey?: string
    dracoDecoderPath?: string
    license?: TypodontModelLicense
}

export type ResolvedTypodontModelSource = {
    url: string
    headers: Record<string, string>
    withCredentials: boolean
    cacheKey: string
    dracoDecoderPath: string
}

function getBundledModelUrl() {
    return new URL(bundledModelUrl, import.meta.url).href
}

export function resolveTypodontModelSource(
    source?: string | TypodontModelSource
): ResolvedTypodontModelSource {
    const config = typeof source === "string" ? { url: source } : source ?? {}
    const query = new URLSearchParams()
    const headers = { ...(config.headers ?? {}) }
    let url = config.url ?? getBundledModelUrl()

    if (config.version) {
        query.set("v", config.version)
    }

    for (const [key, value] of Object.entries(config.query ?? {})) {
        if (value === undefined || value === null) continue
        query.set(key, String(value))
    }

    if (config.license?.key) {
        if (config.license.mode === "header") {
            headers[config.license.name ?? "x-typodont-license"] = config.license.key
        } else {
            query.set(config.license.name ?? "license", config.license.key)
        }
    }

    const search = query.toString()
    if (search) {
        url += `${url.includes("?") ? "&" : "?"}${search}`
    }

    return {
        url,
        headers,
        withCredentials: config.withCredentials ?? false,
        cacheKey: config.cacheKey ?? url,
        dracoDecoderPath: config.dracoDecoderPath ?? DEFAULT_DRACO_DECODER_PATH
    }
}
