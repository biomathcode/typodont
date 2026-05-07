import test from "node:test"
import assert from "node:assert/strict"
import {
    getToothDetail,
    normalizeToothId,
    toMeshName
} from "../dist/index.mjs"

test("normalizeToothId accepts legacy mesh names and public ids", () => {
    assert.equal(normalizeToothId("teeth_11"), "teeth-11")
    assert.equal(normalizeToothId("teeth-21"), "teeth-21")
    assert.equal(normalizeToothId("21"), "teeth-21")
    assert.equal(toMeshName("teeth-21"), "teeth_21")
})

test("getToothDetail returns notation metadata compatible with odontogram use cases", () => {
    const detail = getToothDetail("teeth_21")

    assert.deepEqual(detail, {
        id: "teeth-21",
        meshName: "teeth_21",
        notations: {
            fdi: "21",
            universal: "9",
            palmer: "1UL"
        },
        type: "Central Incisor",
        quadrant: "upper-left",
        arch: "upper",
        side: "left"
    })
})
