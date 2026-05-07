import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

test("viewer observes container resizes and performs an initial post-mount size sync", async () => {
    const source = await readFile(new URL("../src/viewer.ts", import.meta.url), "utf8")

    assert.match(source, /new ResizeObserver\(\(\) => this\.onResize\(\)\)/)
    assert.match(source, /this\.resizeObserver\.observe\(this\.container\)/)
    assert.match(source, /requestAnimationFrame\(\(\) => this\.onResize\(\)\)/)
})

test("preview rendering restores the main viewport after using a scissor rectangle", async () => {
    const source = await readFile(new URL("../src/viewer.ts", import.meta.url), "utf8")

    assert.match(
        source,
        /this\.renderer\.setScissorTest\(false\)\s+this\.renderer\.setViewport\(\s+0,\s+0,\s+this\.container\.clientWidth,\s+this\.container\.clientHeight\s+\)/
    )
    assert.doesNotMatch(source, /this\.previewBounds\.\w+\s*\*\s*dpr/)
})
