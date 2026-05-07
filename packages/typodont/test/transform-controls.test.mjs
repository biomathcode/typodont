import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import * as THREE from "three"
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js"

test("three transform controls expose a helper scene object", () => {
    const camera = new THREE.PerspectiveCamera()
    const controls = new TransformControls(camera, null)
    const helper = controls.getHelper()

    assert.equal(controls instanceof THREE.Object3D, false)
    assert.equal(helper instanceof THREE.Object3D, true)
})

test("viewer adds the transform controls helper instead of the controls instance", async () => {
    const source = await readFile(new URL("../src/viewer.ts", import.meta.url), "utf8")

    assert.match(source, /scene\.add\(this\.transformControls\.getHelper\(\)\)/)
    assert.doesNotMatch(source, /scene\.add\(this\.transformControls\)/)
})

