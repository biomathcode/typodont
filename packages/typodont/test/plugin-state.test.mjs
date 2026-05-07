import test from "node:test"
import assert from "node:assert/strict"
import * as THREE from "three"
import {
    AnnotationToolPlugin,
    ExportPlugin,
    PaintToolPlugin,
    VisualizationToolPlugin
} from "../dist/index.mjs"

function createTooth(name) {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(
            new Float32Array([
                0, 0, 0,
                0.25, 0, 0,
                0, 0.25, 0,
                0.15, 0.15, 0.05
            ]),
            3
        )
    )
    geometry.setAttribute(
        "color",
        new THREE.BufferAttribute(new Float32Array(12).fill(1), 3)
    )

    const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true })
    )
    mesh.name = name
    return mesh
}

function installCanvasShim() {
    globalThis.document = {
        createElement(tagName) {
            assert.equal(tagName, "canvas")
            return {
                width: 1,
                height: 1,
                getContext(type) {
                    assert.equal(type, "2d")
                    return {
                        font: "",
                        textBaseline: "top",
                        fillStyle: "",
                        strokeStyle: "",
                        lineWidth: 1,
                        measureText(text) {
                            return { width: text.length * 8 }
                        },
                        beginPath() {},
                        moveTo() {},
                        arcTo() {},
                        closePath() {},
                        clearRect() {},
                        fill() {},
                        stroke() {},
                        fillText() {}
                    }
                }
            }
        }
    }
}

test("PaintToolPlugin restores serialized vertex paint state", async () => {
    const tooth = createTooth("teeth_11")
    tooth.userData.typodontId = "teeth-11"
    const plugin = new PaintToolPlugin()
    const viewer = {
        teethMeshes: [tooth],
        activeTooth: tooth,
        getToothByName(name) {
            return name === tooth.name || name === tooth.userData.typodontId
                ? tooth
                : undefined
        },
        getToothId(target) {
            return target.userData.typodontId
        }
    }

    plugin.install(viewer)

    const colorAttr = tooth.geometry.getAttribute("color")
    const colorArray = colorAttr.array
    colorArray[0] = 0.25
    colorArray[1] = 0.5
    colorArray[2] = 0.75
    colorAttr.needsUpdate = true

    const state = plugin.getState()
    assert.ok(state)
    assert.ok(state["teeth-11"])

    plugin.clearTooth("teeth-11")
    assert.equal(colorArray[0], 1)
    assert.equal(colorArray[1], 1)
    assert.equal(colorArray[2], 1)

    await plugin.setState(state)
    assert.equal(Math.round(colorArray[0] * 255), Math.round(0.25 * 255))
    assert.equal(Math.round(colorArray[1] * 255), Math.round(0.5 * 255))
    assert.equal(Math.round(colorArray[2] * 255), Math.round(0.75 * 255))
})

test("VisualizationToolPlugin tracks and reloads whole-tooth colors", async () => {
    const selectedTooth = { name: "teeth_21", userData: { typodontId: "teeth-21" } }
    const setCalls = []
    const resetCalls = []
    const viewer = {
        getSelectedTeeth() {
            return [selectedTooth]
        },
        getToothId(target) {
            return target.userData.typodontId
        },
        setToothColor(name, color) {
            setCalls.push([name, color])
        },
        resetToothColor(name) {
            resetCalls.push(name)
        }
    }

    const plugin = new VisualizationToolPlugin()
    plugin.install(viewer)

    plugin.applyToSelection("#f4c542")
    assert.deepEqual(plugin.getState(), { "teeth-21": "#f4c542" })

    await plugin.setState({ "teeth-31": "#3b82f6" })
    assert.deepEqual(resetCalls, ["teeth-21"])
    assert.deepEqual(setCalls.at(-1), ["teeth-31", "#3b82f6"])
})

test("AnnotationToolPlugin keeps one editable note per tooth", async () => {
    installCanvasShim()
    const tooth = createTooth("teeth_11")
    tooth.userData.typodontId = "teeth-11"
    const plugin = new AnnotationToolPlugin()
    const viewer = {
        getToothByName(name) {
            return name === tooth.name || name === tooth.userData.typodontId
                ? tooth
                : undefined
        }
    }

    plugin.install(viewer)
    plugin.addAnnotation("teeth-11", "Initial note", new THREE.Vector3(0, 0.1, 0))
    plugin.addAnnotation("teeth-11", "Updated note", new THREE.Vector3(0, 0.2, 0))

    const state = plugin.getState()
    assert.equal(state.length, 1)
    assert.equal(state[0].toothId, "teeth-11")
    assert.equal(state[0].text, "Updated note")
    assert.deepEqual(state[0].point, [0, 0.2, 0])
})

test("ExportPlugin saves and reloads viewer state through local storage", async () => {
    const saved = new Map()
    globalThis.localStorage = {
        setItem(key, value) {
            saved.set(key, value)
        },
        getItem(key) {
            return saved.get(key) ?? null
        }
    }

    const expectedState = {
        version: 1,
        selectedToothNames: ["teeth-11"],
        activeTool: "paint",
        camera: {
            position: [0, 0, 20],
            target: [0, 0, 0]
        },
        teethTransforms: {},
        plugins: {
            paintTool: { "teeth-11": "abc" }
        }
    }

    let loadedState
    const viewer = {
        serializeState() {
            return expectedState
        },
        async loadState(state) {
            loadedState = state
        }
    }

    const plugin = new ExportPlugin({ storageKey: "clinical-state" })
    plugin.install(viewer)

    plugin.saveToStorage()
    assert.equal(saved.has("clinical-state"), true)

    await plugin.loadFromStorage()
    assert.deepEqual(loadedState, expectedState)
})
