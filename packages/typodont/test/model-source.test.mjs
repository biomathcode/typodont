import test from "node:test"
import assert from "node:assert/strict"
import {
    DEFAULT_DRACO_DECODER_PATH,
    resolveTypodontModelSource
} from "../dist/index.mjs"

test("resolveTypodontModelSource resolves bundled asset relative to the library module", () => {
    const resolved = resolveTypodontModelSource()

    assert.match(resolved.url, /typodont-.*\.glb$/)
    assert.ok(
        resolved.url.startsWith("file:") ||
            resolved.url.startsWith("http://") ||
            resolved.url.startsWith("https://")
    )
})

test("resolveTypodontModelSource appends version and license query params for CDN delivery", () => {
    const resolved = resolveTypodontModelSource({
        url: "https://cdn.example.com/models/typodont.glb",
        version: "2026.05.07",
        query: {
            variant: "adult"
        },
        license: {
            key: "licensed-user-token"
        }
    })

    assert.equal(
        resolved.url,
        "https://cdn.example.com/models/typodont.glb?v=2026.05.07&variant=adult&license=licensed-user-token"
    )
    assert.equal(resolved.cacheKey, resolved.url)
    assert.equal(resolved.dracoDecoderPath, DEFAULT_DRACO_DECODER_PATH)
})

test("resolveTypodontModelSource supports header-based licensing", () => {
    const resolved = resolveTypodontModelSource({
        url: "https://cdn.example.com/models/typodont.glb",
        license: {
            key: "header-token",
            mode: "header",
            name: "x-model-license"
        }
    })

    assert.equal(resolved.headers["x-model-license"], "header-token")
    assert.equal(
        resolved.url,
        "https://cdn.example.com/models/typodont.glb"
    )
})
